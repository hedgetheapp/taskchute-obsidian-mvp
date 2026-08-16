const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const source = fs.readFileSync("main.js", "utf8");

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, `missing function: ${name}`);
  const signatureEnd = source.indexOf(") {", start);
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
vm.runInContext([
  extractFunction("buildTaskMovedUndoBridgeSemantic"),
  extractFunction("fingerprintTaskMovedUndoBridgeSemantic"),
  extractFunction("validateTaskMovedUndoSemanticForOperation"),
  extractFunction("decideTaskMovedUndoSemanticAttachment"),
  extractFunction("decideTaskMovedUndoBatchCommit"),
  extractFunction("getTaskMovedUndoBridgeRestorePlan"),
  extractFunction("buildTaskMovedUndoBridgeMovement"),
  "this.buildSemantic = buildTaskMovedUndoBridgeSemantic;",
  "this.fingerprint = fingerprintTaskMovedUndoBridgeSemantic;",
  "this.validate = validateTaskMovedUndoSemanticForOperation;",
  "this.decideAttach = decideTaskMovedUndoSemanticAttachment;",
  "this.decideCommit = decideTaskMovedUndoBatchCommit;",
  "this.getPlan = getTaskMovedUndoBridgeRestorePlan;",
  "this.buildMovement = buildTaskMovedUndoBridgeMovement;"
].join("\n"), context);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createOperation(overrides = {}) {
  return Object.assign({
    operation_id: "OP-1",
    batch_id: "BATCH-1",
    task_id: "T-MOVE",
    entry_id: "E-MOVE",
    scope: "single-task-same-date-dnd",
    state: "capturing",
    semantic_fingerprint: ""
  }, overrides);
}

function createBatch(overrides = {}) {
  return Object.assign({
    taskMovedUndoSemanticRequired: true,
    taskMovedUndoOperationId: "OP-1",
    taskMovedUndoBatchId: "BATCH-1",
    taskMovedUndoTaskId: "T-MOVE",
    taskMovedUndoEntryId: "E-MOVE",
    taskMovedUndoLifecycleState: "capturing",
    taskMovedUndoSemanticFingerprint: "",
    bridgeTaskMovedSemantic: null
  }, overrides);
}

function buildCrossSectionSemantic() {
  const result = context.buildSemantic({
    task_id: "T-MOVE",
    entry_id: "E-MOVE",
    date: "2026-08-16",
    before: {
      section_id: "afternoon",
      section_label: "午後",
      entry_order_ids: ["E-A", "E-MOVE"],
      task_order_ids: ["T-A", "T-MOVE"]
    },
    after: {
      section_id: "morning",
      section_label: "午前",
      entry_order_ids: ["E-MOVE", "E-B"],
      task_order_ids: ["T-MOVE", "T-B"]
    }
  });
  assert.strictEqual(result.ok, true);
  return result.semantic;
}

const semantic = buildCrossSectionSemantic();
assert.strictEqual(context.decideCommit({ taskMovedUndoSemanticRequired: false }, null, {}).ok, true, "normal rename/edit batches must retain generic commit behavior");

// v0.6.66 reproducer: any generic commit while the D&D await chain was active
// could commit the pending file snapshot before semantic attachment.
for (const phase of ["before-build", "during-build", "immediately-before-attach"]) {
  const decision = context.decideCommit(createBatch(), createOperation(), {});
  assert.strictEqual(decision.ok, false, `${phase}: semanticless commit must be blocked`);
  assert.strictEqual(decision.defer, true);
  assert.strictEqual(decision.reason, "taskmoved_semantic_pending");
}

const operation = createOperation();
const batch = createBatch();
const attach = context.decideAttach(batch, operation, operation.operation_id, semantic);
assert.strictEqual(attach.ok, true);
batch.bridgeTaskMovedSemantic = clone(semantic);
batch.taskMovedUndoSemanticFingerprint = attach.fingerprint;
batch.taskMovedUndoLifecycleState = "semantic-attached";
operation.semantic_fingerprint = attach.fingerprint;
operation.state = "semantic-attached";

const timerAfterAttach = context.decideCommit(batch, operation, {});
assert.strictEqual(timerAfterAttach.ok, false, "timer may not commit even immediately after attachment");
assert.strictEqual(timerAfterAttach.reason, "taskmoved_explicit_commit_required");
const exactCommit = context.decideCommit(batch, operation, {
  taskMovedUndoOperationId: "OP-1",
  forceTaskMovedSemanticCommit: true
});
assert.strictEqual(exactCommit.ok, true, "only the exact D&D path may commit");
const lifecycleHistory = [{ id: "older-rename" }];
lifecycleHistory.push({ type: "taskchute-snapshot", bridgeTaskMovedSemantic: clone(batch.bridgeTaskMovedSemantic) });
assert.strictEqual(lifecycleHistory.length, 2, "one D&D operation adds exactly one history action");
assert.strictEqual(lifecycleHistory[1].bridgeTaskMovedSemantic.kind, "task-moved-v4");
const undoMovement = context.buildMovement(context.getPlan(lifecycleHistory[1].bridgeTaskMovedSemantic, "before"), "undo");
assert.strictEqual(undoMovement.ok, true);
assert.strictEqual(undoMovement.movement.payloadSource, "task-undo-confirmed-markdown-v4");
const redoSemantic = clone(lifecycleHistory[1].bridgeTaskMovedSemantic);
redoSemantic.restore_state = "after";
const redoMovement = context.buildMovement(context.getPlan(redoSemantic, "after"), "redo");
assert.strictEqual(redoMovement.ok, true);
assert.strictEqual(redoMovement.movement.payloadSource, "task-redo-confirmed-markdown-v4");
assert.strictEqual(lifecycleHistory[0].id, "older-rename", "D&D lifecycle must not reorder existing history");

assert.strictEqual(context.decideAttach(null, operation, "OP-1", semantic).reason, "no_pending_batch");
assert.strictEqual(context.decideAttach(createBatch({ taskMovedUndoBatchId: "WRONG" }), operation, "OP-1", semantic).reason, "wrong_pending_batch");
assert.strictEqual(context.decideAttach(createBatch({ taskMovedUndoLifecycleState: "committed" }), createOperation({ state: "committed" }), "OP-1", semantic).reason, "batch_already_closed");
const invalidKind = clone(semantic);
invalidKind.kind = "task-updated";
assert.strictEqual(context.decideAttach(createBatch(), createOperation(), "OP-1", invalidKind).reason, "invalid_semantic_kind");
const wrongTask = clone(semantic);
wrongTask.task_id = "T-OTHER";
assert.strictEqual(context.decideAttach(createBatch(), createOperation(), "OP-1", wrongTask).reason, "task_identity_mismatch");
const wrongEntry = clone(semantic);
wrongEntry.entry_id = "E-OTHER";
assert.strictEqual(context.decideAttach(createBatch(), createOperation(), "OP-1", wrongEntry).reason, "entry_identity_mismatch");
assert.strictEqual(context.decideCommit(batch, operation, {
  taskMovedUndoOperationId: "OP-WRONG",
  forceTaskMovedSemanticCommit: true
}).reason, "taskmoved_operation_mismatch");

const tampered = clone(batch);
tampered.taskMovedUndoSemanticFingerprint = "tampered";
assert.strictEqual(context.decideCommit(tampered, operation, {
  taskMovedUndoOperationId: "OP-1",
  forceTaskMovedSemanticCommit: true
}).reason, "taskmoved_semantic_fingerprint_mismatch");

const history = [{ id: "rename-older" }, { id: "snapshot-older" }];
const beforeHistory = clone(history);
const failedBatch = createBatch();
const failedAttach = context.decideAttach(failedBatch, createOperation({ batch_id: "OTHER" }), "OP-1", semantic);
assert.strictEqual(failedAttach.ok, false);
assert.deepStrictEqual(history, beforeHistory, "attachment failure must preserve unrelated history");

const sameSection = context.buildSemantic({
  task_id: "T-SAME",
  entry_id: "E-2",
  date: "2026-08-16",
  before: {
    section_id: "morning",
    entry_order_ids: ["E-1", "E-2", "E-3"],
    task_order_ids: ["T-SAME", "T-SAME", "T-X"]
  },
  after: {
    section_id: "morning",
    entry_order_ids: ["E-2", "E-1", "E-3"],
    task_order_ids: ["T-SAME", "T-SAME", "T-X"]
  }
});
assert.strictEqual(sameSection.ok, true);
const multiOperation = createOperation({ task_id: "T-SAME", entry_id: "E-2" });
assert.strictEqual(context.validate(sameSection.semantic, multiOperation).ok, true, "duplicate task IDs must bind by exact entry ID");
const wrongMultiOperation = createOperation({ task_id: "T-SAME", entry_id: "E-1" });
assert.strictEqual(context.validate(sameSection.semantic, wrongMultiOperation).reason, "entry_identity_mismatch");

const dragMethod = extractMethod("  async moveTaskByDrag(", "\n  async moveSelectedTaskGroupToSectionByDrag(");
assert(/beginTaskMovedUndoOperation\(sourceBridgeTaskId,\s*sourceBridgeEntryId,\s*\{/.test(dragMethod));
assert(dragMethod.includes("taskMovedUndoOperationId"));
assert(dragMethod.includes("forceTaskMovedSemanticCommit: true"));
assert(dragMethod.includes("operation_finally_without_semantic_commit"));
assert(dragMethod.indexOf("beginTaskMovedUndoOperation") < dragMethod.indexOf("writeFileText(notePath, movedMarkdown"), "operation identity must exist before the first D&D write");
assert(dragMethod.indexOf("if (!bridgeEnqueued)") < dragMethod.indexOf("attachBridgeTaskMovedSemanticToPendingUndoBatch"), "semantic is attached only after forward enqueue");
assert.strictEqual((dragMethod.match(/attachBridgeTaskMovedSemanticToPendingUndoBatch\(/g) || []).length, 1);
assert.strictEqual((dragMethod.match(/forceTaskMovedSemanticCommit: true/g) || []).length, 1);

const scheduleMethod = extractMethod("  scheduleCommitTaskchuteUndoBatch()", "\n  discardPendingTaskchuteUndoBatch(");
assert(scheduleMethod.includes("batch.taskMovedUndoSemanticRequired"));
assert(scheduleMethod.includes("explicit_commit_required"));
const commitMethod = extractMethod("  commitPendingTaskchuteUndoBatch(options = {})", "\n  attachBridgeTaskMovedSemanticToPendingUndoBatch(");
assert(commitMethod.includes("decideTaskMovedUndoBatchCommit"));
assert(commitMethod.indexOf("decideTaskMovedUndoBatchCommit") < commitMethod.indexOf("this.pendingTaskchuteUndoBatch = null"), "commit guard must run before clearing the batch");
const captureMethod = extractMethod("  async captureTaskchuteUndoFileBefore(", "\n  captureTaskchuteUndoPluginDataBefore(");
assert(captureMethod.includes("options || {}"));
const writeMethod = extractMethod("  async writeFileText(", "\n  async ensureTaskchuteNote(");
assert(writeMethod.includes("captureTaskchuteUndoFileBefore(path"));
assert(writeMethod.includes("options || {}"));

const undoMethod = extractMethod("  async undoLastTaskchuteAction(", "\n  async redoLastTaskchuteAction(");
const redoMethod = extractMethod("  async redoLastTaskchuteAction(", "\n  getDeleteFallbackFocusKey(");
for (const method of [undoMethod, redoMethod]) {
  assert(method.includes("activeTaskMovedUndoOperation"));
  assert(method.indexOf("activeTaskMovedUndoOperation") < method.indexOf("commitPendingTaskchuteUndoBatch()"));
}

const inboundMethod = extractMethod("  async applyBridgeInboundTaskMovedEvent(", "\n  async applyBridgeInboundTaskDeletedEvent(");
assert(inboundMethod.includes("skipTaskchuteUndo: true"), "inbound writes must remain outside local Undo history");

console.log("UNDO-SEMANTIC-LIFECYCLE-01 cross-section async/timer race: PASS");
console.log("UNDO-SEMANTIC-LIFECYCLE-02 semantic attach failures/history preservation: PASS");
console.log("UNDO-SEMANTIC-LIFECYCLE-03 same-section duplicate task identity: PASS");
console.log("UNDO-SEMANTIC-LIFECYCLE-04 inbound bounce prevention: PASS");
