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
  normalizeSections: sections => Array.isArray(sections) ? sections.slice() : []
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
  extractFunction("buildBridgeTaskMovedV4ReorderDraft"),
  "this.resolveIdentity = resolveTaskLineSectionIdentityForPhysicalHeading;",
  "this.parseMeta = tcMetaFromTaskLine;",
  "this.buildDraft = buildBridgeTaskMovedV4ReorderDraft;"
].join("\n"), context);

const settings = {
  sections: [
    { id: "morning", name: "Morning", order: 10 },
    { id: "evening", name: "Evening", order: 20 }
  ]
};

function taskLine(taskId, entryId, title, extraMeta = "") {
  return `- [ ] [[${taskId}_${title}|${title}]] <!-- tc:entry_id=${entryId}${extraMeta ? ` ${extraMeta}` : ""} -->`;
}

const missing = taskLine("T-C", "E-C", "C");
const normalized = context.resolveIdentity(missing, settings, "Morning", { normalizeMissing: true });
assert.strictEqual(normalized.ok, true);
assert.strictEqual(normalized.raw_row_section_id, "");
assert.strictEqual(normalized.raw_row_section_label, "");
assert.strictEqual(normalized.physical_section_id, "morning");
assert.strictEqual(normalized.resolved_section_id, "morning");
assert.strictEqual(normalized.normalization_performed, true);
assert.strictEqual(normalized.section_identity_source, "physical_heading_normalized_missing_row_metadata");
assert.deepStrictEqual(
  { section: context.parseMeta(normalized.normalized_line).section, section_id: context.parseMeta(normalized.normalized_line).section_id },
  { section: "Morning", section_id: "morning" }
);

const savedIdentity = context.resolveIdentity(normalized.normalized_line, settings, "Morning", { normalizeMissing: false });
assert.strictEqual(savedIdentity.ok, true);
assert.strictEqual(savedIdentity.normalization_performed, false);
assert.strictEqual(savedIdentity.final_guard_result, "allow");

const explicitNoSection = context.resolveIdentity(
  taskLine("T-C", "E-C", "C", "section=No%20Section section_id=__no_section__"),
  settings,
  "Morning",
  { normalizeMissing: true }
);
assert.strictEqual(explicitNoSection.ok, false);
assert.strictEqual(explicitNoSection.reason_code, "row_section_id_conflict");
assert.strictEqual(explicitNoSection.normalization_performed, false);

const genuineMismatch = context.resolveIdentity(
  taskLine("T-C", "E-C", "C", "section=Evening section_id=evening"),
  settings,
  "Morning",
  { normalizeMissing: true }
);
assert.strictEqual(genuineMismatch.ok, false);
assert.strictEqual(genuineMismatch.final_guard_result, "blocked");

const staleLabel = context.resolveIdentity(
  taskLine("T-C", "E-C", "C", "section=Old%20Morning section_id=morning"),
  settings,
  "Morning",
  { normalizeMissing: true }
);
assert.strictEqual(staleLabel.ok, true);
assert.strictEqual(staleLabel.normalization_performed, true);
assert.strictEqual(staleLabel.section_identity_source, "physical_heading_normalized_row_label");
assert.strictEqual(context.parseMeta(staleLabel.normalized_line).section, "Morning");

const draft = context.buildDraft({
  task_id: "T-C",
  entry_id: "E-C",
  date: "2026-08-15",
  section_id: savedIdentity.resolved_section_id,
  section_label: "Morning",
  source_order_entry_ids: ["E-A", "E-B", "E-C"],
  target_order_entry_ids: ["E-C", "E-A", "E-B"],
  source_order_task_ids: ["T-A", "T-B", "T-C"],
  target_order_task_ids: ["T-C", "T-A", "T-B"],
  taskmoved_payload_source: "task-drag-reorder-confirmed-markdown-v4"
});
assert.strictEqual(draft.ok, true);
assert.strictEqual(draft.changed, true);
assert.strictEqual(draft.payload.entry_id, "E-C");
assert.strictEqual(draft.payload.to.section_id, "morning");
assert.deepStrictEqual(Array.from(draft.payload.target_order_entry_ids), ["E-C", "E-A", "E-B"]);

const outbox = [];
if (savedIdentity.ok && draft.ok && draft.changed) {
  outbox.push({ event_type: "TaskMoved", payload: draft.payload });
}
assert.strictEqual(outbox.length, 1, "one valid D&D must enqueue exactly one TaskMoved");

const noOp = context.buildDraft({
  task_id: "T-C",
  entry_id: "E-C",
  date: "2026-08-15",
  section_id: "morning",
  source_order_entry_ids: ["E-A", "E-B", "E-C"],
  target_order_entry_ids: ["E-A", "E-B", "E-C"],
  source_order_task_ids: ["T-A", "T-B", "T-C"],
  target_order_task_ids: ["T-A", "T-B", "T-C"]
});
assert.strictEqual(noOp.ok, true);
assert.strictEqual(noOp.changed, false);

const dragStart = source.indexOf("  async moveTaskByDrag(");
const dragEnd = source.indexOf("\n  async moveSelectedTaskGroupToSectionByDrag(", dragStart);
assert(dragStart >= 0 && dragEnd > dragStart, "moveTaskByDrag missing");
const dragMethod = source.slice(dragStart, dragEnd);
assert(dragMethod.includes("resolveTaskLineSectionIdentityForPhysicalHeading"));
assert(dragMethod.includes("{ normalizeMissing: true }"));
assert(dragMethod.includes("parseTasks(finalMarkdownAfterDragUi)"));
assert(dragMethod.includes('"drag_drop_section_identity_verify_failed"'));
assert.strictEqual((dragMethod.match(/enqueueBridgeTaskMoved\(bridgeTask/g) || []).length, 1);

const inspectStart = source.indexOf("  async inspectBridgeTaskMovedVaultState(");
const inspectEnd = source.indexOf("\n  async inspectBridgeTaskMovedDateChangeVaultState(", inspectStart);
const inspectMethod = source.slice(inspectStart, inspectEnd);
assert(inspectMethod.includes('reason_code = "markdown_section_mismatch"'));
assert(inspectMethod.includes("!rowIdentity.ok"), "general mismatch guard must remain strict");
assert(inspectMethod.includes("raw_row_section_id"));
assert(inspectMethod.includes("final_guard_result"));

const diagnosticStart = source.indexOf("  async recordBridgeTaskDragMoveDiagnostic(");
const diagnosticEnd = source.indexOf("\n  async checkBridgeMobileResumeKickExecution(", diagnosticStart);
assert(diagnosticStart >= 0 && diagnosticEnd > diagnosticStart, "drag diagnostic method missing");
const diagnosticMethod = source.slice(diagnosticStart, diagnosticEnd);
for (const field of [
  "physical_section_id",
  "raw_row_section_id",
  "raw_row_section_label",
  "parsed_row_section_id",
  "parsed_row_section_label_id",
  "resolved_section_id",
  "section_identity_source",
  "normalization_performed",
  "final_guard_result"
]) {
  assert(diagnosticMethod.includes(field), `missing diagnostic field: ${field}`);
}

const belowStart = source.indexOf("  async insertTaskBelowCurrent(");
const belowEnd = source.indexOf("\n  async moveSelectedTask(", belowStart);
const belowMethod = source.slice(belowStart, belowEnd);
assert(belowMethod.includes("section: section.name"));
assert(belowMethod.includes('section_id: section.id || ""'));

console.log("TMV4-SECTION-HANDOFF-01 missing metadata normalized from physical heading: PASS");
console.log("TMV4-SECTION-HANDOFF-02 saved entry identity and one v4 event: PASS");
console.log("TMV4-SECTION-HANDOFF-03 explicit no_section / genuine mismatch blocked: PASS");
console.log("TMV4-SECTION-HANDOFF-04 no-op emits no event: PASS");
console.log("TMV4-SECTION-HANDOFF-05 general guard and diagnostics retained: PASS");
