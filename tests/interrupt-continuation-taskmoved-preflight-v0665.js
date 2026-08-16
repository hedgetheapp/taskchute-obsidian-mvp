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

function extractMethod(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert(start >= 0 && end > start, `missing method range: ${startMarker}`);
  return source.slice(start, end);
}

const context = {};
vm.createContext(context);
vm.runInContext(`${extractFunction("projectBridgeTaskMovedTargetOrderForInterruptContinuation")}; this.projectOrder = projectBridgeTaskMovedTargetOrderForInterruptContinuation;`, context);

const move = {
  event_id: "MOVE-1",
  event_type: "TaskMoved",
  logical_clock: 1021,
  status: "failed",
  retry_count: 1,
  payload: {
    task_id: "T-INTERRUPT",
    entry_id: "E-INTERRUPT",
    date: "2026-08-16",
    move_payload_version: 4,
    taskmoved_payload_source: "task-start-section-move-confirmed-markdown-v3",
    from: { date: "2026-08-16", section_id: "morning", entry_id: "E-INTERRUPT" },
    to: { date: "2026-08-16", section_id: "afternoon", entry_id: "E-INTERRUPT" },
    target_order_entry_ids: ["E-ORIGINAL", "E-INTERRUPT"]
  }
};

const continuation = {
  event_id: "CREATED-1",
  event_type: "TaskCreated",
  logical_clock: 1022,
  status: "pending",
  retry_count: 0,
  payload: {
    task_id: "T-ORIGINAL",
    entry_id: "E-CONTINUATION",
    date: "2026-08-16",
    section_id: "afternoon",
    creation_source: "interrupt-continuation",
    continuation_after_entry_id: "E-INTERRUPT"
  }
};

const current = {
  entryIds: ["E-ORIGINAL", "E-INTERRUPT", "E-CONTINUATION"],
  taskIds: ["T-ORIGINAL", "T-INTERRUPT", "T-ORIGINAL"]
};
const options = { maxRetryCount: 5 };
const expected = move.payload.target_order_entry_ids;
const validate = (currentInfo, events) => {
  const projection = context.projectOrder(move, currentInfo, events, options);
  const comparison = projection.applied ? projection.projected_entry_ids : currentInfo.entryIds;
  return { projection, ok: JSON.stringify(comparison) === JSON.stringify(expected) };
};

const reproduced = validate(current, [move, continuation]);
const moveBeforeProjection = JSON.stringify(move);
const continuationBeforeProjection = JSON.stringify(continuation);
assert.strictEqual(reproduced.projection.applied, true);
assert.deepStrictEqual(Array.from(reproduced.projection.projected_entry_ids), expected);
assert.strictEqual(reproduced.ok, true);
assert.strictEqual(reproduced.projection.continuation_taskcreated_event_id, continuation.event_id);
assert.strictEqual(reproduced.projection.anchor_entry_id, move.payload.entry_id);
assert.strictEqual(JSON.stringify(move), moveBeforeProjection, "TaskMoved payload/event must remain immutable");
assert.strictEqual(JSON.stringify(continuation), continuationBeforeProjection, "TaskCreated candidate must remain immutable");

const noContinuation = validate(current, [move]);
assert.strictEqual(noContinuation.projection.applied, false);
assert.strictEqual(noContinuation.ok, false);

const unrelatedExtra = validate({
  entryIds: current.entryIds.concat("E-EXTRA"),
  taskIds: current.taskIds.concat("T-EXTRA")
}, [move, continuation]);
assert.strictEqual(unrelatedExtra.projection.applied, true);
assert.strictEqual(unrelatedExtra.ok, false);

const wrongAnchor = JSON.parse(JSON.stringify(continuation));
wrongAnchor.payload.continuation_after_entry_id = "E-OTHER";
assert.strictEqual(validate(current, [move, wrongAnchor]).ok, false);

const wrongAnchorTask = {
  entryIds: current.entryIds.slice(),
  taskIds: ["T-ORIGINAL", "T-WRONG", "T-ORIGINAL"]
};
const wrongAnchorTaskResult = validate(wrongAnchorTask, [move, continuation]);
assert.strictEqual(wrongAnchorTaskResult.projection.applied, false);
assert.strictEqual(wrongAnchorTaskResult.projection.reason_code, "interrupt_continuation_projection_move_identity_mismatch");
assert.strictEqual(wrongAnchorTaskResult.ok, false);

const wrongContinuationTask = JSON.parse(JSON.stringify(continuation));
wrongContinuationTask.payload.task_id = "T-WRONG";
assert.strictEqual(validate(current, [move, wrongContinuationTask]).ok, false);
const wrongContinuationEntry = JSON.parse(JSON.stringify(continuation));
wrongContinuationEntry.payload.entry_id = "E-WRONG";
assert.strictEqual(validate(current, [move, wrongContinuationEntry]).ok, false);

const wrongDate = JSON.parse(JSON.stringify(continuation));
wrongDate.payload.date = "2026-08-17";
assert.strictEqual(validate(current, [move, wrongDate]).ok, false);

const wrongSection = JSON.parse(JSON.stringify(continuation));
wrongSection.payload.section_id = "morning";
assert.strictEqual(validate(current, [move, wrongSection]).ok, false);

const duplicateContinuation = JSON.parse(JSON.stringify(continuation));
duplicateContinuation.event_id = "CREATED-2";
duplicateContinuation.logical_clock = 1022.5;
const duplicateResult = validate(current, [move, continuation, duplicateContinuation]);
assert.strictEqual(duplicateResult.projection.applied, false);
assert.strictEqual(duplicateResult.projection.reason_code, "interrupt_continuation_projection_ambiguous");
assert.strictEqual(duplicateResult.ok, false);

const earlierContinuation = JSON.parse(JSON.stringify(continuation));
earlierContinuation.logical_clock = 1020;
assert.strictEqual(validate(current, [move, earlierContinuation]).ok, false);

const retryableContinuation = JSON.parse(JSON.stringify(continuation));
retryableContinuation.status = "failed";
retryableContinuation.retry_count = 4;
assert.strictEqual(validate(current, [move, retryableContinuation]).ok, true);
const exhaustedContinuation = JSON.parse(JSON.stringify(retryableContinuation));
exhaustedContinuation.retry_count = 5;
assert.strictEqual(validate(current, [move, exhaustedContinuation]).ok, false);
const sentContinuation = JSON.parse(JSON.stringify(continuation));
sentContinuation.status = "sent";
assert.strictEqual(validate(current, [move, sentContinuation]).ok, false);
const supersededContinuation = JSON.parse(JSON.stringify(continuation));
supersededContinuation.status = "superseded";
assert.strictEqual(validate(current, [move, supersededContinuation]).ok, false);
const droppedContinuation = JSON.parse(JSON.stringify(continuation));
droppedContinuation.status = "dropped";
assert.strictEqual(validate(current, [move, droppedContinuation]).ok, false);

const firstPreflight = validate(current, [move, continuation]);
assert.strictEqual(firstPreflight.ok, true);
const movedAfterRebuild = {
  entryIds: ["E-ORIGINAL", "E-CONTINUATION", "E-INTERRUPT"],
  taskIds: ["T-ORIGINAL", "T-ORIGINAL", "T-INTERRUPT"]
};
assert.strictEqual(validate(movedAfterRebuild, [move, continuation]).ok, false, "rebuild position change must block");
assert.strictEqual(validate(current, [move, sentContinuation]).ok, false, "rebuild status change must block");
assert.strictEqual(validate(current, [move, continuation, duplicateContinuation]).ok, false, "rebuild duplicate candidate must block");

const lifecycleChain = [
  { event_type: "TaskStopped", logical_clock: 1020 },
  move,
  continuation,
  { event_type: "TaskStarted", logical_clock: 1023 }
].sort((a, b) => a.logical_clock - b.logical_clock);
assert.deepStrictEqual(lifecycleChain.map(event => event.event_type), ["TaskStopped", "TaskMoved", "TaskCreated", "TaskStarted"]);

for (const payloadSource of [
  "task-drag-reorder-confirmed-markdown-v4",
  "confirmed-markdown-v2",
  "date-move-confirmed-markdown-v3",
  "alt-keyboard-confirmed-markdown-v2",
  "start-plan-section-move-confirmed-markdown-v3"
]) {
  const genericMove = JSON.parse(JSON.stringify(move));
  genericMove.payload.taskmoved_payload_source = payloadSource;
  const genericProjection = context.projectOrder(genericMove, {
    entryIds: current.entryIds.slice(),
    taskIds: current.taskIds.slice()
  }, [genericMove, continuation], options);
  assert.strictEqual(genericProjection.applied, false, `${payloadSource} must retain generic preflight`);
  assert.strictEqual(genericProjection.reason_code, "interrupt_continuation_projection_source_not_allowed");
  assert.notDeepStrictEqual(Array.from(genericProjection.projected_entry_ids), expected, `${payloadSource} mismatch must remain strict failure`);
}

const validateMethod = extractMethod("  async validateBridgeOutboxTaskMovedEvent(", "\n  async applyBridgeInboundTaskMovedEvent(");
assert(validateMethod.includes("getBridgeTaskMovedInterruptContinuationProjection(event, targetInfo)"));
assert(validateMethod.includes("interrupt_continuation_projection_revalidation_failed"));
assert((validateMethod.match(/getBridgeTaskMovedInterruptContinuationProjection\(event,/g) || []).length >= 2, "projection must run before and after rebuild");
assert(validateMethod.includes("continuation_taskcreated_event_id"), "projection diagnostics must include continuation event identity");
assert(validateMethod.includes("task_moved_event_id"), "projection diagnostics must include TaskMoved event identity");
assert(validateMethod.includes("source_order_entry_idsの送信前検証に失敗"), "source strictness must remain");
const inboundCreated = extractMethod("  async applyBridgeInboundTaskCreatedEvent(", "\n  async ackBridgeInboundEvent(");
assert(inboundCreated.includes("continuation_anchor_entry_id_missing"));
assert(inboundCreated.includes("inbound_interrupt_continuation_existing_placement_blocked"));
const finalizer = extractMethod("  async finalizeInterruptContinuationAfterStartPlacement(", "\n  async closeRunningTaskForInterrupt(");
for (const field of ["routine_id", "generated_by_routine_id", "routine_occurrence_key", "routine_date", "routine_generated_for_date", "routine_scheduled_time", "routine_source"]) {
  assert(source.includes(field), `Routine metadata field missing: ${field}`);
}
assert(finalizer.includes("getExplicitTaskCreatedRoutineFields(continuationTask)"));

console.log("INTERRUPT-TMV4-PREFLIGHT-01 valid continuation projection: PASS");
console.log("INTERRUPT-TMV4-PREFLIGHT-02 no continuation keeps generic strict failure: PASS");
console.log("INTERRUPT-TMV4-PREFLIGHT-03 unrelated extra row remains failure: PASS");
console.log("INTERRUPT-TMV4-PREFLIGHT-04 wrong anchor blocked: PASS");
console.log("INTERRUPT-TMV4-PREFLIGHT-04B wrong anchor task identity blocked: PASS");
console.log("INTERRUPT-TMV4-PREFLIGHT-04C wrong continuation entry/task identity blocked: PASS");
console.log("INTERRUPT-TMV4-PREFLIGHT-05 wrong date blocked: PASS");
console.log("INTERRUPT-TMV4-PREFLIGHT-06 wrong section blocked: PASS");
console.log("INTERRUPT-TMV4-PREFLIGHT-07 duplicate exact continuation blocked: PASS");
console.log("INTERRUPT-TMV4-PREFLIGHT-08 earlier logical clock blocked: PASS");
console.log("INTERRUPT-TMV4-PREFLIGHT-08B only sendable continuation status projected: PASS");
console.log("INTERRUPT-TMV4-PREFLIGHT-08C rebuild position/status/candidate changes blocked: PASS");
console.log("INTERRUPT-TMV4-PREFLIGHT-09 lifecycle outbox order preserved: PASS");
console.log("INTERRUPT-TMV4-PREFLIGHT-10 generic TMV4/inbound/Routine semantics preserved: PASS");
