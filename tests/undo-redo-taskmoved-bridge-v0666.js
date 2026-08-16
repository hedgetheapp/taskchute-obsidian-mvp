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
vm.runInContext([
  extractFunction("buildTaskMovedUndoBridgeSemantic"),
  extractFunction("getTaskMovedUndoBridgeRestorePlan"),
  extractFunction("buildTaskMovedUndoBridgeMovement"),
  extractFunction("isExactPendingTaskMovedInverse"),
  extractFunction("mergeCurrentBridgeStateIntoTaskchuteUndoSnapshot"),
  extractFunction("restoreTaskMovedUndoRedoStacksAfterRollback"),
  "this.buildSemantic = buildTaskMovedUndoBridgeSemantic;",
  "this.getPlan = getTaskMovedUndoBridgeRestorePlan;",
  "this.buildMovement = buildTaskMovedUndoBridgeMovement;",
  "this.isExactInverse = isExactPendingTaskMovedInverse;",
  "this.mergeBridgeState = mergeCurrentBridgeStateIntoTaskchuteUndoSnapshot;",
  "this.restoreStacks = restoreTaskMovedUndoRedoStacksAfterRollback;"
].join("\n"), context);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const crossInput = {
  task_id: "T-0647",
  entry_id: "E-20260816-0024",
  date: "2026-08-16",
  before: {
    section_id: "afternoon",
    section_label: "Afternoon",
    entry_order_ids: ["E-A", "E-20260816-0024", "E-B"],
    task_order_ids: ["T-A", "T-0647", "T-B"]
  },
  after: {
    section_id: "night",
    section_label: "Night",
    entry_order_ids: ["E-N", "E-20260816-0024"],
    task_order_ids: ["T-N", "T-0647"]
  },
  original_event_id: "FORWARD-1",
  original_payload_source: "confirmed-markdown-v2"
};
const crossBefore = JSON.stringify(crossInput);
const cross = context.buildSemantic(crossInput);
assert.strictEqual(cross.ok, true);
assert.strictEqual(JSON.stringify(crossInput), crossBefore, "semantic builder must not mutate input");

const undoPlan = context.getPlan(cross.semantic, "before");
const undoMovement = context.buildMovement(undoPlan, "undo");
assert.strictEqual(undoMovement.ok, true);
assert.strictEqual(undoMovement.movement.from.section, "night");
assert.strictEqual(undoMovement.movement.to.section, "afternoon");
assert.strictEqual(undoMovement.movement.from.entry_id, "E-20260816-0024");
assert.strictEqual(undoMovement.movement.to.entry_id, "E-20260816-0024");
assert.strictEqual(undoMovement.movement.payloadSource, "task-undo-confirmed-markdown-v4");
assert.strictEqual(undoMovement.movement.moveType, "section-change");
assert.strictEqual("sourceOrderEntryIds" in undoMovement.movement, false);

const redoSemantic = clone(cross.semantic);
redoSemantic.restore_state = "after";
const redoPlan = context.getPlan(redoSemantic, redoSemantic.restore_state);
const redoMovement = context.buildMovement(redoPlan, "redo");
assert.strictEqual(redoMovement.ok, true);
assert.strictEqual(redoMovement.movement.from.section, "afternoon");
assert.strictEqual(redoMovement.movement.to.section, "night");
assert.strictEqual(redoMovement.movement.payloadSource, "task-redo-confirmed-markdown-v4");

const reorder = context.buildSemantic({
  task_id: "T-C",
  entry_id: "E-C",
  date: "2026-08-16",
  before: {
    section_id: "morning",
    section_label: "Morning",
    entry_order_ids: ["E-A", "E-B", "E-C"],
    task_order_ids: ["T-A", "T-B", "T-C"]
  },
  after: {
    section_id: "morning",
    section_label: "Morning",
    entry_order_ids: ["E-C", "E-A", "E-B"],
    task_order_ids: ["T-C", "T-A", "T-B"]
  }
});
assert.strictEqual(reorder.ok, true);
const reorderUndo = context.buildMovement(context.getPlan(reorder.semantic, "before"), "undo");
assert.deepStrictEqual(Array.from(reorderUndo.movement.sourceOrderEntryIds), ["E-C", "E-A", "E-B"]);
assert.deepStrictEqual(Array.from(reorderUndo.movement.afterSaveOrder), ["T-A", "T-B", "T-C"]);
const reorderRedo = context.buildMovement(context.getPlan(Object.assign({}, reorder.semantic, { restore_state: "after" }), "after"), "redo");
assert.deepStrictEqual(Array.from(reorderRedo.movement.sourceOrderEntryIds), ["E-A", "E-B", "E-C"]);

const multiEntry = context.buildSemantic({
  task_id: "T-SAME",
  entry_id: "E-2",
  date: "2026-08-16",
  before: {
    section_id: "afternoon",
    entry_order_ids: ["E-1", "E-2", "E-X"],
    task_order_ids: ["T-SAME", "T-SAME", "T-X"]
  },
  after: {
    section_id: "afternoon",
    entry_order_ids: ["E-2", "E-1", "E-X"],
    task_order_ids: ["T-SAME", "T-SAME", "T-X"]
  }
});
assert.strictEqual(multiEntry.ok, true);
assert.deepStrictEqual(Array.from(multiEntry.semantic.before.entry_order_ids), ["E-1", "E-2", "E-X"]);
assert.deepStrictEqual(Array.from(multiEntry.semantic.after.entry_order_ids), ["E-2", "E-1", "E-X"]);
assert.strictEqual(multiEntry.semantic.before.index, 1);
assert.strictEqual(multiEntry.semantic.after.index, 0);

const noOp = context.buildSemantic({
  task_id: "T-A",
  entry_id: "E-A",
  date: "2026-08-16",
  before: { section_id: "morning", entry_order_ids: ["E-A"], task_order_ids: ["T-A"] },
  after: { section_id: "morning", entry_order_ids: ["E-A"], task_order_ids: ["T-A"] }
});
assert.strictEqual(noOp.ok, false);
assert.strictEqual(noOp.reason, "no_order_change");
const duplicateEntry = context.buildSemantic({
  task_id: "T-A",
  entry_id: "E-A",
  date: "2026-08-16",
  before: { section_id: "morning", entry_order_ids: ["E-A", "E-A"], task_order_ids: ["T-A", "T-A"] },
  after: { section_id: "morning", entry_order_ids: ["E-A"], task_order_ids: ["T-A"] }
});
assert.strictEqual(duplicateEntry.ok, false);
assert.strictEqual(duplicateEntry.reason, "physical_order_invalid");
const dateMove = clone(crossInput);
dateMove.after.date = "2026-08-17";
assert.strictEqual(context.buildSemantic(dateMove).reason, "date_move_not_supported");

const syncMethod = extractMethod("  async syncRestoredTaskMovedUndoRedo(", "\n  async undoLastTaskchuteAction(");
assert.strictEqual((syncMethod.match(/this\.enqueueBridgeTaskMoved\(/g) || []).length, 1, "one restore operation must enqueue at most one TaskMoved");
for (const guard of [
  "entry_identity_ambiguous",
  "entry_identity_missing",
  "task_identity_mismatch",
  "section_identity_mismatch",
  "target_order_verification_failed",
  "enqueue_returned_false"
]) assert(syncMethod.includes(guard), `missing guard: ${guard}`);
assert(syncMethod.includes("resolveTaskLineSectionIdentityForPhysicalHeading"));
assert(syncMethod.includes("parseTasks(markdown).filter"));
const inspectMethod = extractMethod("  async inspectTaskMovedUndoRedoPhysicalState(", "\n  async syncRestoredTaskMovedUndoRedo(");
assert(inspectMethod.includes("physical_order_mismatch"));
assert(inspectMethod.includes("entry_identity_ambiguous"));
const undoMethod = extractMethod("  async undoLastTaskchuteAction(", "\n  async redoLastTaskchuteAction(");
assert(undoMethod.indexOf("inspectTaskMovedUndoRedoPhysicalState") < undoMethod.indexOf("restoreTaskchuteActionSnapshot"), "undo source state must be verified before restore");
const redoMethod = extractMethod("  async redoLastTaskchuteAction(", "\n  getDeleteFallbackFocusKey(");
assert(redoMethod.indexOf("inspectTaskMovedUndoRedoPhysicalState") < redoMethod.indexOf("restoreTaskchuteActionSnapshot"), "redo source state must be verified before restore");

const dragMethod = extractMethod("  async moveTaskByDrag(", "\n  async moveSelectedTaskGroupToSectionByDrag(");
assert(dragMethod.includes("attachBridgeTaskMovedSemanticToPendingUndoBatch"));
assert(dragMethod.indexOf("if (!bridgeEnqueued)") < dragMethod.indexOf("attachBridgeTaskMovedSemanticToPendingUndoBatch"), "history semantic must be attached only after forward enqueue succeeds");

const appendMethod = extractMethod("  async appendBridgeTaskMovedCoalescedEvent(", "\n  async coalescePendingBridgeTaskMovedOutboxBeforeDrain(");
assert(appendMethod.includes("hasActiveSameKey"));
assert(appendMethod.includes("bridgeOutboxFlushTargetEventIds.has"), "active flush snapshot events must not be superseded");
assert(appendMethod.includes("bridgeOutboxFlushTargetTaskMovedKeys.has(key)"), "active key must remain protected even after its event leaves the mutable outbox");
assert(appendMethod.includes("isUndoRedoEvent"));
assert(appendMethod.includes("Math.max(0, Number(item.retry_count || 0)) === 0"), "retry/ambiguous forward must not be net-zero coalesced");
assert(appendMethod.includes("isExactPendingTaskMovedInverse(candidates[0], event)"), "exact unsent inverse must use the net-zero path");
assert(appendMethod.includes("const coalesceCandidates = isUndoRedoEvent ? [] : candidates"), "non-exact Undo/Redo must preserve existing same-key events");
const coalesceEligible = (event, activeIds) => event.status === "pending"
  && Number(event.retry_count || 0) === 0
  && !event.last_error
  && !event.sent_at
  && !activeIds.has(event.event_id);
assert.strictEqual(coalesceEligible({ event_id: "F-PENDING", status: "pending", retry_count: 0 }, new Set()), true, "definitely unsent pending forward may coalesce");
assert.strictEqual(coalesceEligible({ event_id: "F-ACTIVE", status: "pending", retry_count: 0 }, new Set(["F-ACTIVE"])), false, "active flush forward must be retained");
assert.strictEqual(coalesceEligible({ event_id: "F-SENT", status: "sent", sent_at: "2026-08-16T00:00:00Z" }, new Set()), false, "sent forward must be retained outside coalesce candidates");
assert.strictEqual(coalesceEligible({ event_id: "F-FAILED", status: "failed", retry_count: 1, last_error: "network" }, new Set()), false, "ambiguous failed forward must be retained");
assert.strictEqual(coalesceEligible({ event_id: "F-RETRY", status: "pending", retry_count: 1 }, new Set()), false, "retry-marked pending forward must be retained");
const flushMethod = extractMethod("  async testBridgeOutboxFlush(", "\n  beginTaskchuteSyncState(");
assert(flushMethod.includes("const flushTargetTaskMovedKeys = new Set(targets"));
assert(flushMethod.includes("this.bridgeOutboxFlushTargetTaskMovedKeys = flushTargetTaskMovedKeys"));
assert(flushMethod.includes("this.bridgeOutboxFlushTargetTaskMovedKeys === flushTargetTaskMovedKeys"));

const forwardEvent = {
  event_type: "TaskMoved",
  payload: {
    task_id: "T-MOVE",
    entry_id: "E-MOVE",
    move_payload_version: 4,
    from: { date: "2026-08-16", section_id: "afternoon", entry_id: "E-MOVE" },
    to: { date: "2026-08-16", section_id: "night", entry_id: "E-MOVE" },
    source_order_entry_ids: ["E-A"],
    target_order_entry_ids: ["E-N", "E-MOVE"],
    source_order_task_ids: ["T-A"],
    target_order_task_ids: ["T-N", "T-MOVE"]
  }
};
const inverseEvent = {
  event_type: "TaskMoved",
  payload: {
    task_id: "T-MOVE",
    entry_id: "E-MOVE",
    move_payload_version: 4,
    from: { date: "2026-08-16", section_id: "night", entry_id: "E-MOVE" },
    to: { date: "2026-08-16", section_id: "afternoon", entry_id: "E-MOVE" },
    source_order_entry_ids: ["E-N"],
    target_order_entry_ids: ["E-MOVE", "E-A"],
    source_order_task_ids: ["T-N"],
    target_order_task_ids: ["T-MOVE", "T-A"]
  }
};
assert.strictEqual(context.isExactInverse(forwardEvent, inverseEvent), true, "exact pending reverse must be net-zero eligible");
const sameSectionForward = {
  event_type: "TaskMoved",
  payload: {
    task_id: "T-B",
    entry_id: "E-B",
    move_payload_version: 4,
    from: { date: "2026-08-16", section_id: "morning", entry_id: "E-B" },
    to: { date: "2026-08-16", section_id: "morning", entry_id: "E-B" },
    source_order_entry_ids: ["E-A", "E-B", "E-C"],
    target_order_entry_ids: ["E-B", "E-A", "E-C"],
    source_order_task_ids: ["T-A", "T-B", "T-C"],
    target_order_task_ids: ["T-B", "T-A", "T-C"]
  }
};
const sameSectionInverse = {
  event_type: "TaskMoved",
  payload: {
    task_id: "T-B",
    entry_id: "E-B",
    move_payload_version: 4,
    from: { date: "2026-08-16", section_id: "morning", entry_id: "E-B" },
    to: { date: "2026-08-16", section_id: "morning", entry_id: "E-B" },
    source_order_entry_ids: ["E-B", "E-A", "E-C"],
    target_order_entry_ids: ["E-A", "E-B", "E-C"],
    source_order_task_ids: ["T-B", "T-A", "T-C"],
    target_order_task_ids: ["T-A", "T-B", "T-C"]
  }
};
assert.strictEqual(context.isExactInverse(sameSectionForward, sameSectionInverse), true, "same-section exact reverse must remain net-zero eligible");
const unrelatedInverse = clone(inverseEvent);
unrelatedInverse.payload.target_order_entry_ids.push("E-EXTRA");
unrelatedInverse.payload.target_order_task_ids.push("T-EXTRA");
assert.strictEqual(context.isExactInverse(forwardEvent, unrelatedInverse), false, "unrelated order differences must not be hidden as net-zero");
const invalidCrossSource = clone(inverseEvent);
invalidCrossSource.payload.source_order_entry_ids.push("E-MOVE");
invalidCrossSource.payload.source_order_task_ids.push("T-MOVE");
assert.strictEqual(context.isExactInverse(forwardEvent, invalidCrossSource), false, "cross-section source-after order must not retain the moved entry");
const wrongEntryInverse = clone(inverseEvent);
wrongEntryInverse.payload.to.entry_id = "E-OTHER";
assert.strictEqual(context.isExactInverse(forwardEvent, wrongEntryInverse), false, "different entry identity must not be net-zero");
const wrongTaskInverse = clone(inverseEvent);
wrongTaskInverse.payload.task_id = "T-OTHER";
assert.strictEqual(context.isExactInverse(forwardEvent, wrongTaskInverse), false, "different task identity must not be net-zero");
const incompleteOrderInverse = clone(inverseEvent);
delete incompleteOrderInverse.payload.source_order_task_ids;
assert.strictEqual(context.isExactInverse(forwardEvent, incompleteOrderInverse), false, "missing v4 order authority must not be net-zero");

const oldSnapshot = {
  rowHeight: 40,
  bridgeLogicalClock: 7,
  bridgeCursorByDeviceId: { dev: { last_applied_server_sequence: 10 } },
  bridgeOutboxEvents: [{ event_id: "OLD", status: "pending" }],
  taskMovedOrderDiagnostics: [{ phase: "old" }]
};
const currentState = {
  rowHeight: 52,
  bridgeLogicalClock: 12,
  bridgeCursorByDeviceId: { dev: { last_applied_server_sequence: 14 } },
  bridgeOutboxEvents: [{ event_id: "CURRENT", status: "sent" }],
  bridgeAutoFlushEnabled: true,
  taskMovedOrderDiagnostics: [{ phase: "current" }]
};
const merged = context.mergeBridgeState(oldSnapshot, currentState);
assert.strictEqual(merged.rowHeight, 40, "normal user state must still restore from the snapshot");
assert.strictEqual(merged.bridgeLogicalClock, 12, "logical clock must not move backward");
assert.strictEqual(merged.bridgeCursorByDeviceId.dev.last_applied_server_sequence, 14, "cursor must not move backward");
assert.strictEqual(merged.bridgeOutboxEvents[0].event_id, "CURRENT", "old snapshot must not resurrect stale outbox events");
assert.strictEqual(merged.bridgeAutoFlushEnabled, true, "Bridge configuration must remain current");
assert.strictEqual(merged.taskMovedOrderDiagnostics[0].phase, "current", "current TaskMoved diagnostics must remain current");
currentState.bridgeOutboxEvents[0].event_id = "MUTATED";
assert.strictEqual(merged.bridgeOutboxEvents[0].event_id, "CURRENT", "preserved Bridge state must be cloned");
const clockOwner = { settings: { bridgeLogicalClock: merged.bridgeLogicalClock } };
const nextClockBody = extractMethod("  nextBridgeLogicalClock()", "\n  runBridgeOutboxMutation(")
  .replace(/^  nextBridgeLogicalClock\(\)/, "function nextBridgeLogicalClock()");
const clockContext = {};
vm.createContext(clockContext);
vm.runInContext(`${nextClockBody}\nthis.nextClock = nextBridgeLogicalClock;`, clockContext);
const undoClock = clockContext.nextClock.call(clockOwner);
const redoClock = clockContext.nextClock.call(clockOwner);
assert.strictEqual(undoClock, 13, "Undo inverse must use a later logical clock than the forward/current state");
assert.strictEqual(redoClock, 14, "Redo must use a later logical clock than Undo");

const undoAction = { id: "undo-action" };
const redoCounterpart = { id: "redo-counterpart" };
const undoStack = [];
const redoStack = [redoCounterpart];
assert.strictEqual(context.restoreStacks(undoStack, redoStack, undoAction, redoCounterpart, "undo"), true);
assert.deepStrictEqual(undoStack, [undoAction], "rollback must restore the popped Undo action");
assert.deepStrictEqual(redoStack, [], "rollback must remove the provisional Redo counterpart");
const redoAction = { id: "redo-action" };
const undoCounterpart = { id: "undo-counterpart" };
const redoUndoStack = [undoCounterpart];
const redoRedoStack = [];
assert.strictEqual(context.restoreStacks(redoUndoStack, redoRedoStack, redoAction, undoCounterpart, "redo"), true);
assert.deepStrictEqual(redoUndoStack, [], "rollback must remove the provisional Undo counterpart");
assert.deepStrictEqual(redoRedoStack, [redoAction], "rollback must restore the popped Redo action");

const restoreMethod = extractMethod("  async restoreTaskchuteActionSnapshot(", "\n  async syncRestoredTaskMovedUndoRedo(");
assert(restoreMethod.includes("mergeCurrentBridgeStateIntoTaskchuteUndoSnapshot"), "undo snapshot restore must preserve current Bridge/outbox state through the explicit merge contract");
assert(restoreMethod.includes("Promise.resolve(this.pluginDataSaveQueue).then(persist, persist)"), "snapshot persistence must serialize with current plugin-data saves");
assert(restoreMethod.includes("isTaskchuteWriteAborted(await this.writeFileText"), "snapshot write failure must stop semantic handoff");
assert(undoMethod.includes("this.undoStack.push(action)"), "failed undo restore must return the action to its stack");
assert(redoMethod.includes("this.redoStack.push(action)"), "failed redo restore must return the action to its stack");
assert(undoMethod.includes("rollbackTaskMovedUndoRedoAfterBridgeFailure(action, redoAction, \"undo\")"), "failed Undo Bridge handoff must roll local state and stack back");
assert(redoMethod.includes("rollbackTaskMovedUndoRedoAfterBridgeFailure(action, undoAction, \"redo\")"), "failed Redo Bridge handoff must roll local state and stack back");
const rollbackMethod = extractMethod("  async rollbackTaskMovedUndoRedoAfterBridgeFailure(", "\n  async inspectTaskMovedUndoRedoPhysicalState(");
assert(rollbackMethod.includes("this.restoreTaskchuteActionSnapshot(counterpartAction)"));
assert(rollbackMethod.includes("restoreTaskMovedUndoRedoStacksAfterRollback"));
assert(undoMethod.includes("try { restored = await this.restoreTaskchuteActionSnapshot(action); }"), "Undo restore exceptions must enter rollback handling");
assert(redoMethod.includes("try { restored = await this.restoreTaskchuteActionSnapshot(action); }"), "Redo restore exceptions must enter rollback handling");
const inboundMoved = extractMethod("  async applyBridgeInboundTaskMovedEvent(", "\n  async applyBridgeInboundTaskDeletedEvent(");
assert(inboundMoved.includes("skipTaskchuteUndo: true"), "inbound TaskMoved must not enter local undo history");
const keyboard = extractMethod("  setupKeyboardHandlers()", "\n  activateKeyboardScope(");
assert(keyboard.includes("evt.shiftKey && keyName === \"z\""), "Ctrl+Shift+Z must invoke redo");
assert(dragMethod.includes("this.discardPendingTaskchuteUndoBatch({"), "semantic capture failure must invalidate the exact D&D Undo entry");
assert(dragMethod.includes("taskMovedUndoOperationId"), "D&D Undo invalidation must be operation-scoped");

console.log("UNDO-BRIDGE-CROSS-SECTION-01: PASS");
console.log("REDO-BRIDGE-CROSS-SECTION-01: PASS");
console.log("UNDO-BRIDGE-SAME-SECTION-01: PASS");
console.log("REDO-BRIDGE-SAME-SECTION-01: PASS");
console.log("UNDO-BRIDGE-MULTI-ENTRY-01: PASS");
console.log("AUTO-FLUSH-RACE pending/active/sent: PASS");
console.log("SNAPSHOT-BRIDGE-STATE and rollback safety: PASS");
console.log("UNDO/REDO negative guards and inbound bounce prevention: PASS");
