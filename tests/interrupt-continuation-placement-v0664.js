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

function extractUntilFunction(name, nextName) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf(`function ${nextName}(`, start);
  assert(start >= 0 && end > start, `missing function range: ${name}`);
  return source.slice(start, end).trim();
}

const context = {
  TC_NO_SECTION_ID: "__no_section__",
  TC_NO_SECTION_NAME: "No Section",
  todayDate: () => "2026-08-16",
  makeEntryId: () => "E-FALLBACK",
  normalizeSections: sections => Array.isArray(sections) ? sections.slice() : [],
  isTaskLine: line => /^\s*-\s+\[[ xX]\]\s+\[\[[^\]]+\]\]/.test(String(line || "")),
  entryIdFromTaskLine: line => {
    const match = String(line || "").match(/\bentry_id=([^\s>]+)/);
    return match ? match[1] : "";
  },
  taskIdFromTaskLine: line => {
    const match = String(line || "").match(/\[\[(T-[^_\]|]+)(?:_[^\]|]*)?(?:\|[^\]]*)?\]\]/);
    return match ? match[1] : "";
  }
};
vm.createContext(context);
vm.runInContext([
  extractFunction("isNoSectionValue"),
  extractFunction("getNoSectionDefinition"),
  extractFunction("getBoardSections"),
  extractFunction("findBoardSection"),
  extractUntilFunction("tcMetaFromTaskLine", "tcMetaHas"),
  extractUntilFunction("serializeTcMeta", "setTaskLineTcMeta"),
  extractUntilFunction("setTaskLineTcMeta", "resolveTaskLineSectionIdentityForPhysicalHeading"),
  extractFunction("resolveTaskLineSectionIdentityForPhysicalHeading"),
  extractFunction("collectTaskBoardPhysicalOccurrences"),
  extractFunction("taskLine"),
  extractFunction("inspectInterruptContinuationPlacement"),
  extractFunction("buildInterruptContinuationPlacement"),
  "this.inspectPlacement = inspectInterruptContinuationPlacement;",
  "this.buildPlacement = buildInterruptContinuationPlacement;",
  "this.parseMeta = tcMetaFromTaskLine;"
].join("\n"), context);

const settings = {
  sections: [
    { id: "morning", name: "Morning", order: 10 },
    { id: "afternoon", name: "Afternoon", order: 20 }
  ]
};

function row(taskId, entryId, title, section) {
  return `- [ ] [[${taskId}_${title}|${title}]] <!-- tc:entry_id=${entryId} section=${section.name} section_id=${section.id} -->`;
}

function board(sectionId, interruptSectionId = sectionId) {
  const morning = { id: "morning", name: "Morning" };
  const afternoon = { id: "afternoon", name: "Afternoon" };
  const interruptSection = interruptSectionId === "morning" ? morning : afternoon;
  return [
    "## Tasks",
    "### Morning",
    row("T-ORIGINAL", "E-ORIGINAL", "original", morning),
    ...(interruptSection.id === "morning" ? [row("T-INTERRUPT", "E-INTERRUPT", "interrupt", morning)] : []),
    "### Afternoon",
    ...(interruptSection.id === "afternoon" ? [row("T-INTERRUPT", "E-INTERRUPT", "interrupt", afternoon)] : []),
    "",
    "## Log"
  ].join("\n");
}

const stable = context.buildPlacement(board("afternoon"), settings, {
  interruptEntryId: "E-INTERRUPT",
  continuationEntryId: "E-CONTINUATION",
  interruptTaskId: "T-INTERRUPT",
  taskId: "T-ORIGINAL",
  file: "T-ORIGINAL_original",
  title: "original"
});
assert.strictEqual(stable.ok, true);
assert.strictEqual(stable.physical_section_id, "afternoon");
assert.strictEqual(stable.adjacent_after_interrupt, true);

const moved = context.buildPlacement(board("morning", "morning"), settings, {
  interruptEntryId: "E-INTERRUPT",
  continuationEntryId: "E-CONTINUATION",
  interruptTaskId: "T-INTERRUPT",
  taskId: "T-ORIGINAL",
  file: "T-ORIGINAL_original",
  title: "original"
});
assert.strictEqual(moved.ok, true);
assert.strictEqual(moved.physical_section_id, "morning");
assert.strictEqual(moved.adjacent_after_interrupt, true);
assert.strictEqual(moved.markdown.includes("### Afternoon\n- [ ] [[T-ORIGINAL_original|original]]"), false, "old section must not retain continuation");
const movedMeta = context.parseMeta(moved.continuation_line);
assert.strictEqual(movedMeta.section, "Morning");
assert.strictEqual(movedMeta.section_id, "morning");

const occurrences = context.collectTaskBoardPhysicalOccurrences
  ? context.collectTaskBoardPhysicalOccurrences(moved.markdown).occurrences
  : [];
const original = occurrences.find(item => item.entry_id === "E-ORIGINAL");
const continuation = occurrences.find(item => item.entry_id === "E-CONTINUATION");
assert(original && continuation);
assert.strictEqual(original.task_id, continuation.task_id);
assert.notStrictEqual(original.entry_id, continuation.entry_id);

const wrongContinuationLine = moved.continuation_line.replace(
  "section=Morning section_id=morning -->",
  "section=Afternoon section_id=afternoon -->"
);
const wrongRow = moved.markdown.replace(moved.continuation_line, wrongContinuationLine);
const wrongVerified = context.inspectPlacement(wrongRow, settings, {
  interruptEntryId: "E-INTERRUPT",
  continuationEntryId: "E-CONTINUATION",
  interruptTaskId: "T-INTERRUPT",
  taskId: "T-ORIGINAL"
});
assert.strictEqual(wrongVerified.ok, false);
assert.strictEqual(wrongVerified.reason_code, "row_section_id_conflict");

const missingAnchor = context.buildPlacement(board("morning", "morning"), settings, {
  interruptEntryId: "E-MISSING",
  continuationEntryId: "E-CONTINUATION-MISSING",
  interruptTaskId: "T-INTERRUPT",
  taskId: "T-ORIGINAL",
  file: "T-ORIGINAL_original",
  title: "original"
});
assert.strictEqual(missingAnchor.ok, false);
assert.strictEqual(missingAnchor.reason_code, "interrupt_entry_identity_not_unique");

const duplicateAnchorMarkdown = board("morning", "morning").replace(
  "\n## Log",
  `\n${row("T-OTHER", "E-INTERRUPT", "duplicate-anchor", { id: "afternoon", name: "Afternoon" })}\n## Log`
);
const ambiguousAnchor = context.buildPlacement(duplicateAnchorMarkdown, settings, {
  interruptEntryId: "E-INTERRUPT",
  continuationEntryId: "E-CONTINUATION-AMBIGUOUS",
  interruptTaskId: "T-INTERRUPT",
  taskId: "T-ORIGINAL",
  file: "T-ORIGINAL_original",
  title: "original"
});
assert.strictEqual(ambiguousAnchor.ok, false);
assert.strictEqual(ambiguousAnchor.reason_code, "interrupt_entry_identity_not_unique");

const wrongAnchorTask = context.inspectPlacement(moved.markdown, settings, {
  interruptEntryId: "E-INTERRUPT",
  continuationEntryId: "E-CONTINUATION",
  interruptTaskId: "T-WRONG",
  taskId: "T-ORIGINAL"
});
assert.strictEqual(wrongAnchorTask.ok, false);
assert.strictEqual(wrongAnchorTask.reason_code, "interrupt_task_identity_mismatch");

const notAdjacentMarkdown = moved.markdown.replace(
  moved.continuation_line,
  `${row("T-OTHER", "E-OTHER", "other", { id: "morning", name: "Morning" })}\n${moved.continuation_line}`
);
const notAdjacent = context.inspectPlacement(notAdjacentMarkdown, settings, {
  interruptEntryId: "E-INTERRUPT",
  continuationEntryId: "E-CONTINUATION",
  interruptTaskId: "T-INTERRUPT",
  taskId: "T-ORIGINAL"
});
assert.strictEqual(notAdjacent.ok, false);
assert.strictEqual(notAdjacent.reason_code, "interrupt_continuation_not_adjacent");

const duplicateContinuation = context.buildPlacement(moved.markdown, settings, {
  interruptEntryId: "E-INTERRUPT",
  continuationEntryId: "E-CONTINUATION",
  interruptTaskId: "T-INTERRUPT",
  taskId: "T-ORIGINAL",
  file: "T-ORIGINAL_original",
  title: "original"
});
assert.strictEqual(duplicateContinuation.ok, false);
assert.strictEqual(duplicateContinuation.reason_code, "interrupt_continuation_entry_already_exists");

const routineFields = {
  is_routine: "true",
  routine_id: "T-ROUTINE",
  generated_by_routine_id: "T-ROUTINE",
  routine_occurrence_key: "routine:T-ROUTINE:2026-08-16",
  routine_date: "2026-08-16",
  routine_generated_for_date: "2026-08-16",
  routine_scheduled_time: "09:00",
  routine_source: "T-ROUTINE_routine"
};
const routineContinuation = context.buildPlacement(board("morning", "morning"), settings, {
  interruptEntryId: "E-INTERRUPT",
  continuationEntryId: "E-ROUTINE-CONTINUATION",
  interruptTaskId: "T-INTERRUPT",
  taskId: "T-ORIGINAL",
  file: "T-ORIGINAL_original",
  title: "original",
  meta: routineFields
});
assert.strictEqual(routineContinuation.ok, true);
const routineSavedMeta = context.parseMeta(routineContinuation.continuation_line);
Object.entries(routineFields).forEach(([key, value]) => assert.strictEqual(routineSavedMeta[key], value, `routine field lost: ${key}`));

function extractMethod(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert(start >= 0 && end > start, `missing method range: ${startMarker}`);
  return source.slice(start, end);
}

const startTask = extractMethod("  async startTask(task) {", "\n  async finalizeInterruptContinuationAfterStartPlacement(");
const finalize = extractMethod("  async finalizeInterruptContinuationAfterStartPlacement(", "\n  async closeRunningTaskForInterrupt(");
const close = extractMethod("  async closeRunningTaskForInterrupt(", "\n  async pauseRunningTask(");
const inboundCreated = extractMethod("  async applyBridgeInboundTaskCreatedEvent(", "\n  async ackBridgeInboundEvent(");
assert(close.includes('enqueueBridgeLifecycleEvent("TaskStopped"'));
assert(!close.includes("enqueueBridgeTaskCreated"), "stop phase must not publish provisional TaskCreated");
assert(finalize.includes("buildInterruptContinuationPlacement"));
assert(finalize.includes("inspectInterruptContinuationPlacement"));
assert(finalize.includes("enqueueBridgeTaskCreated"));
assert(finalize.includes("continuationAfterEntryId: interruptEntryId"));
assert(finalize.includes('category: "interrupt-continuation"'));
assert(finalize.includes('interrupt_continuation_creation_suppressed'), "unconfirmed placement must suppress continuation creation");
assert(finalize.indexOf('if (options.enqueueBridge === false)') < finalize.indexOf('buildInterruptContinuationPlacement('), "suppression guard must run before continuation Markdown is built");
assert.strictEqual((finalize.match(/enqueueBridgeTaskCreated/g) || []).length, 1, "continuation TaskCreated enqueue must occur once");
assert.strictEqual((close.match(/enqueueBridgeTaskCreated/g) || []).length, 0, "stop phase must never enqueue TaskCreated");
assert(inboundCreated.includes('insertPlacement: "explicit-below"'));
assert(inboundCreated.includes('continuation_anchor_entry_id_missing'), "explicit continuation without anchor entry_id must be blocked");
assert(inboundCreated.includes("collectTaskBoardPhysicalOccurrences(md)"));
assert(inboundCreated.includes("inbound_interrupt_continuation_anchor_blocked"));
assert(inboundCreated.includes("inspectInterruptContinuationPlacement(savedMarkdown"));
assert(inboundCreated.includes("item.entry_id === insertAfterEntryId"), "inbound anchor must resolve exact entry_id");
assert(inboundCreated.includes("insertAfterOccurrences.length !== 1"), "missing or ambiguous inbound anchor must block");
assert(inboundCreated.includes("continuation_anchor_task_mismatch"), "wrong anchor task_id must block before save");
assert(inboundCreated.includes("inbound_interrupt_continuation_existing_placement_blocked"), "existing continuation must be placement-verified before idempotent Ack");
assert(inboundCreated.indexOf("inspectInterruptContinuationPlacement(md, this.settings") < inboundCreated.indexOf("this.markBridgeTaskCreatedKnown(taskId, requestedEntryId)"), "existing continuation placement verification must precede idempotent Ack bookkeeping");
const confirmedFinalizeIndex = startTask.lastIndexOf("finalizeInterruptedContinuation({");
assert(startTask.indexOf("closeRunningTaskForInterrupt(task)") < startTask.indexOf("enqueueBridgeTaskStartedSectionMoveFromConfirmedMarkdown"));
assert(startTask.indexOf("enqueueBridgeTaskStartedSectionMoveFromConfirmedMarkdown") < confirmedFinalizeIndex);
assert(confirmedFinalizeIndex < startTask.indexOf('enqueueBridgeLifecycleEvent("TaskStarted"'));
assert.strictEqual((startTask.match(/enqueueBridgeTaskStartedSectionMoveFromConfirmedMarkdown/g) || []).length, 1, "interrupt TaskMoved enqueue must occur once");
assert(startTask.includes("if (!interruptedInfo)"), "failed TaskStopped phase must abort start");
assert(close.includes("isTaskchuteWriteAborted(interruptedWriteOk)"), "terminal save failure must stop before continuation");
assert(close.includes("if (taskStoppedEnqueued === false)"), "TaskStopped enqueue failure must stop before continuation");
assert(close.includes("interruptedByTaskId"));
assert(close.includes("interruptedByEntryId"));
assert(close.includes("continuationSourceTaskId"));

console.log("INTERRUPT-CONTINUATION-01 stable section final placement: PASS");
console.log("INTERRUPT-CONTINUATION-02 task-start section move final placement: PASS");
console.log("INTERRUPT-CONTINUATION-03 same task_id distinct entry_id: PASS");
console.log("INTERRUPT-CONTINUATION-04 row/physical mismatch blocked with diagnostics path: PASS");
console.log("INTERRUPT-CONTINUATION-05 lifecycle identity/order structure preserved: PASS");
console.log("INTERRUPT-CONTINUATION-06 missing/ambiguous anchor blocked: PASS");
console.log("INTERRUPT-CONTINUATION-07 post-save adjacency failure blocked: PASS");
console.log("INTERRUPT-CONTINUATION-08 duplicate continuation/TaskCreated prevented: PASS");
console.log("INTERRUPT-CONTINUATION-09 Routine continuation metadata preserved: PASS");
console.log("INTERRUPT-CONTINUATION-10 terminal save/enqueue failure stops new start: PASS");
