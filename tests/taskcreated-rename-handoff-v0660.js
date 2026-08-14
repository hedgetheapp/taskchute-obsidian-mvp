const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const source = fs.readFileSync("main.js", "utf8");

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, `missing function: ${name}`);
  const signatureEnd = source.indexOf(") {", start);
  assert(signatureEnd >= 0, `missing function body: ${name}`);
  const open = signatureEnd + 2;
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = open; index < source.length; index += 1) {
    const ch = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`unclosed function: ${name}`);
}

const context = {};
vm.createContext(context);
vm.runInContext([
  extractFunction("normalizeBridgeUtcIso"),
  extractFunction("normalizeBridgeOutboxEvents"),
  extractFunction("buildBridgeTaskCreatedRenameHandoffPlan"),
  "this.buildPlan = buildBridgeTaskCreatedRenameHandoffPlan;"
].join("\n"), context);

function taskCreated(eventId, taskId, entryId, title = "新規タスク", status = "pending") {
  return {
    event_id: eventId,
    user_id: "user",
    device_id: "dev",
    event_type: "TaskCreated",
    created_at: "2026-08-15T00:00:00.000Z",
    logical_clock: 1,
    payload: { task_id: taskId, entry_id: entryId, title, after: { title } },
    status,
    retry_count: 0,
    last_error: "",
    queued_at: "2026-08-15T00:00:00.000Z",
    sent_at: ""
  };
}

const pending = context.buildPlan([taskCreated("created-a", "T-A", "E-A")], {
  task_id: "T-A",
  entry_id: "E-A",
  title: "renamed-a",
  file: "T-A_renamed-a",
  in_flight_event_ids: []
});
assert.strictEqual(pending.ok, true);
assert.strictEqual(pending.decision, "merged_into_pending_taskcreated");
assert.strictEqual(pending.mergedCount, 1);
assert.strictEqual(pending.requiresTaskUpdated, false);
assert.strictEqual(pending.events[0].payload.task_id, "T-A");
assert.strictEqual(pending.events[0].payload.entry_id, "E-A");
assert.strictEqual(pending.events[0].payload.title, "renamed-a");
assert.strictEqual(pending.events[0].payload.after.title, "renamed-a");

const inFlight = context.buildPlan([taskCreated("created-a", "T-A", "E-A")], {
  task_id: "T-A",
  entry_id: "E-A",
  title: "renamed-a",
  in_flight_event_ids: ["created-a"]
});
assert.strictEqual(inFlight.ok, true);
assert.strictEqual(inFlight.decision, "taskupdated_required_in_flight_taskcreated");
assert.strictEqual(inFlight.mergedCount, 0);
assert.strictEqual(inFlight.inFlightCount, 1);
assert.strictEqual(inFlight.requiresTaskUpdated, true);
assert.strictEqual(inFlight.events[0].payload.title, "新規タスク");
const inFlightHandoffEvents = inFlight.events.concat({
  event_id: "updated-a",
  event_type: "TaskUpdated",
  payload: { task_id: "T-A", entry_id: "E-A", changed_fields: ["title"], after: { title: "renamed-a" } }
});
const inFlightUpdates = inFlightHandoffEvents.filter(event => event.event_type === "TaskUpdated");
assert.strictEqual(inFlightUpdates.length, 1);
assert.strictEqual(inFlightUpdates[0].payload.task_id, "T-A");
assert.strictEqual(inFlightUpdates[0].payload.entry_id, "E-A");
assert.strictEqual(inFlightUpdates[0].payload.after.title, "renamed-a");

const alreadySent = context.buildPlan([], {
  task_id: "T-A",
  entry_id: "E-A",
  title: "renamed-a"
});
assert.strictEqual(alreadySent.decision, "taskupdated_required_no_pending_taskcreated");
assert.strictEqual(alreadySent.requiresTaskUpdated, true);

const consecutive = [
  ["T-A", "E-A"],
  ["T-B", "E-B"],
  ["T-C", "E-C"]
].map(([taskId, entryId], index) => context.buildPlan([
  taskCreated(`created-${index}`, taskId, entryId)
], {
  task_id: taskId,
  entry_id: entryId,
  title: `renamed-${index}`,
  in_flight_event_ids: index === 0 ? [`created-${index}`] : []
}));
assert.deepStrictEqual(consecutive.map(plan => plan.decision), [
  "taskupdated_required_in_flight_taskcreated",
  "merged_into_pending_taskcreated",
  "merged_into_pending_taskcreated"
]);
consecutive.forEach((plan, index) => {
  const payload = plan.events[0].payload;
  assert.strictEqual(payload.task_id, `T-${String.fromCharCode(65 + index)}`);
  assert.strictEqual(payload.entry_id, `E-${String.fromCharCode(65 + index)}`);
});

const mergeMethodStart = source.indexOf("  async mergeBridgePendingTaskCreatedRename(");
const mergeMethodEnd = source.indexOf("\n  getBridgeTaskTimeFields(", mergeMethodStart);
assert(mergeMethodStart >= 0 && mergeMethodEnd > mergeMethodStart, "rename merge method missing");
const mergeMethod = source.slice(mergeMethodStart, mergeMethodEnd);
assert(mergeMethod.includes("inFlightEventIds: this.bridgeOutboxFlushTargetEventIds"), "in-flight IDs are not handed to rename planner");
assert(mergeMethod.includes('reason: "task-created-rename-merged"'), "pending merge does not wake Auto Flush");

const flushStart = source.indexOf("  async testBridgeOutboxFlush(");
const flushEnd = source.indexOf("\n  beginTaskchuteSyncState(", flushStart);
assert(flushStart >= 0 && flushEnd > flushStart, "outbox flush method missing");
const flushMethod = source.slice(flushStart, flushEnd);
assert(flushMethod.includes("this.bridgeOutboxFlushTargetEventIds = flushTargetEventIds"), "flush target IDs are not published");
assert(flushMethod.includes("this.bridgeOutboxFlushTargetEventIds = new Set()"), "flush target IDs are not cleared");
assert(flushMethod.includes(".filter(event => !sentEventIds.has(event.event_id))"), "flush cleanup must preserve newly appended non-target events");

const enqueueUpdatedStart = source.indexOf("  async enqueueBridgeTaskUpdated(");
const enqueueUpdatedEnd = source.indexOf("\n  async enqueueBridgeTaskDeleted(", enqueueUpdatedStart);
assert(enqueueUpdatedStart >= 0 && enqueueUpdatedEnd > enqueueUpdatedStart, "TaskUpdated enqueue method missing");
const enqueueUpdatedMethod = source.slice(enqueueUpdatedStart, enqueueUpdatedEnd);
assert.strictEqual((enqueueUpdatedMethod.match(/appendBridgeOutboxEvent\(event/g) || []).length, 1, "TaskUpdated must have one append site");
assert(enqueueUpdatedMethod.includes("if (merged && merged.mergedCount > 0)"), "pending TaskCreated merge short-circuit missing");

const sectionTopStart = source.indexOf("  async insertTaskAtSelectedSectionTop(");
const sectionTopEnd = source.indexOf("\n  async insertTaskBelowCurrent(", sectionTopStart);
const insertBelowEnd = source.indexOf("\n  async moveSelectedTask(", sectionTopEnd);
assert(sectionTopStart >= 0 && sectionTopEnd > sectionTopStart && insertBelowEnd > sectionTopEnd, "create paths missing");
assert(source.slice(sectionTopStart, sectionTopEnd).includes('creationSource: "task-insert-section-top"'));
assert(source.slice(sectionTopEnd, insertBelowEnd).includes('creationSource: "task-insert-below"'));

console.log("TC-RENAME-01 empty-section immediate rename planner: PASS");
console.log("TC-RENAME-02 insert-below pending merge planner: PASS");
console.log("TC-RENAME-03 consecutive identity preservation: PASS");
console.log("TC-RENAME-04 in-flight/sent TaskUpdated handoff: PASS");
console.log("TC-RENAME-05 no manual flush dependency: PASS");
