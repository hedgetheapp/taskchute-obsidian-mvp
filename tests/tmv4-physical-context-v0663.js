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
  extractFunction("resolveTaskDragPhysicalContext"),
  extractFunction("buildBridgeTaskMovedV4ReorderDraft"),
  "this.parseMeta = tcMetaFromTaskLine;",
  "this.resolveRowIdentity = resolveTaskLineSectionIdentityForPhysicalHeading;",
  "this.resolvePhysicalContext = resolveTaskDragPhysicalContext;",
  "this.buildDraft = buildBridgeTaskMovedV4ReorderDraft;"
].join("\n"), context);

const settings = {
  sections: [
    { id: "morning", name: "Morning", order: 10 },
    { id: "evening", name: "Evening", order: 20 }
  ]
};

function row(taskId, entryId, title, meta = "") {
  return `- [ ] [[${taskId}_${title}|${title}]] <!-- tc:entry_id=${entryId}${meta ? ` ${meta}` : ""} -->`;
}

const markdown = [
  "## Tasks",
  "### Morning",
  row("T-C", "E-C", "C", "section=Morning section_id=morning"),
  row("T-A", "E-A", "A", "section=Morning section_id=morning"),
  row("T-B", "E-B", "B"),
  "",
  "## Log"
].join("\n");

const runtimeTask = { taskId: "T-B", entryId: "E-B", section: "", sectionId: "" };
assert.strictEqual(runtimeTask.section, "");
assert.strictEqual(runtimeTask.sectionId, "");

const physical = context.resolvePhysicalContext(markdown, settings, "E-B", "E-C");
assert.strictEqual(physical.ok, true);
assert.strictEqual(physical.source_physical_section_label, "Morning");
assert.strictEqual(physical.destination_physical_section_label, "Morning");
assert.strictEqual(physical.source_section_id, "morning");
assert.strictEqual(physical.destination_section_id, "morning");
assert.strictEqual(physical.same_physical_section, true);
assert.strictEqual(physical.section_identity_source, "exact_entry_id_physical_heading");

const crossSectionMarkdown = [
  "## Tasks",
  "### Morning",
  row("T-B", "E-B", "B", "section=Morning section_id=morning"),
  "### Evening",
  row("T-D", "E-D", "D", "section=Evening section_id=evening"),
  "",
  "## Log"
].join("\n");
const crossPhysical = context.resolvePhysicalContext(crossSectionMarkdown, settings, "E-B", "E-D");
assert.strictEqual(crossPhysical.ok, true);
assert.strictEqual(crossPhysical.same_physical_section, false);
assert.strictEqual(crossPhysical.source_section_id, "morning");
assert.strictEqual(crossPhysical.destination_section_id, "evening");

const ambiguousMarkdown = markdown.replace(
  "## Log",
  `${row("T-X", "E-B", "duplicate", "section=Morning section_id=morning")}\n\n## Log`
);
const ambiguousPhysical = context.resolvePhysicalContext(ambiguousMarkdown, settings, "E-B", "E-C");
assert.strictEqual(ambiguousPhysical.ok, false);
assert.strictEqual(ambiguousPhysical.reason_code, "drag_entry_identity_not_unique");

const normalized = context.resolveRowIdentity(
  physical.source_occurrence.line,
  settings,
  physical.destination_physical_section_label,
  { normalizeMissing: true }
);
assert.strictEqual(normalized.ok, true);
assert.strictEqual(normalized.normalization_performed, true);
assert.strictEqual(context.parseMeta(normalized.normalized_line).section, "Morning");
assert.strictEqual(context.parseMeta(normalized.normalized_line).section_id, "morning");

const draft = context.buildDraft({
  task_id: "T-B",
  entry_id: "E-B",
  date: "2026-08-15",
  section_id: physical.destination_section_id,
  section_label: physical.destination_physical_section_label,
  source_order_entry_ids: ["E-C", "E-A", "E-B"],
  target_order_entry_ids: ["E-B", "E-C", "E-A"],
  source_order_task_ids: ["T-C", "T-A", "T-B"],
  target_order_task_ids: ["T-B", "T-C", "T-A"],
  taskmoved_payload_source: "task-drag-reorder-confirmed-markdown-v4"
});
assert.strictEqual(draft.ok, true);
assert.strictEqual(draft.changed, true);
assert.strictEqual(draft.payload.entry_id, "E-B");
assert.deepStrictEqual(Array.from(draft.payload.target_order_entry_ids), ["E-B", "E-C", "E-A"]);
const outbox = [];
if (physical.ok && normalized.ok && draft.ok && draft.changed) outbox.push(draft.payload);
assert.strictEqual(outbox.length, 1);

const wrongIdentity = context.resolveRowIdentity(
  row("T-B", "E-B", "B", "section=Evening section_id=evening"),
  settings,
  physical.destination_physical_section_label,
  { normalizeMissing: true }
);
assert.strictEqual(wrongIdentity.ok, false);
assert.strictEqual(wrongIdentity.reason_code, "row_section_id_conflict");

const noOp = context.buildDraft({
  task_id: "T-B",
  entry_id: "E-B",
  date: "2026-08-15",
  section_id: "morning",
  source_order_entry_ids: ["E-C", "E-A", "E-B"],
  target_order_entry_ids: ["E-C", "E-A", "E-B"],
  source_order_task_ids: ["T-C", "T-A", "T-B"],
  target_order_task_ids: ["T-C", "T-A", "T-B"]
});
assert.strictEqual(noOp.ok, true);
assert.strictEqual(noOp.changed, false);

const dragStart = source.indexOf("  async moveTaskByDrag(");
const dragEnd = source.indexOf("\n  async moveSelectedTaskGroupToSectionByDrag(", dragStart);
assert(dragStart >= 0 && dragEnd > dragStart, "moveTaskByDrag missing");
const dragMethod = source.slice(dragStart, dragEnd);
assert(dragMethod.includes("resolveTaskDragPhysicalContext(md, this.settings, sourceBridgeEntryId, targetKey)"));
assert(dragMethod.includes("entryId: String(entryIdFromTaskLine(srcLines[i])"));
assert(dragMethod.includes("sourceCandidates.length === 1"));
assert(dragMethod.includes("targetCandidates.length === 1"));
assert(dragMethod.includes("physicalContext.same_physical_section"));
assert(dragMethod.includes("parseTasks(finalMarkdownAfterDragUi)"));
assert.strictEqual((dragMethod.match(/enqueueBridgeTaskMoved\(bridgeTask/g) || []).length, 1);

const addTaskStart = source.indexOf("  async addTask(");
const addTaskEnd = source.indexOf("\n  async enrichTasks(", addTaskStart);
assert(addTaskStart >= 0 && addTaskEnd > addTaskStart, "addTask missing");
const addTaskMethod = source.slice(addTaskStart, addTaskEnd);
assert(addTaskMethod.includes("section: sec.name"));
assert(addTaskMethod.includes('section_id: sec.id || ""'));

console.log("TMV4-PHYSICAL-CONTEXT-01 reload runtime empty resolves exact physical headings: PASS");
console.log("TMV4-PHYSICAL-CONTEXT-02 missing row metadata normalized and one v4 event: PASS");
console.log("TMV4-PHYSICAL-CONTEXT-03 explicit wrong section ID blocked: PASS");
console.log("TMV4-PHYSICAL-CONTEXT-04 no-op emits no event: PASS");
console.log("TMV4-PHYSICAL-CONTEXT-05 cross-section context and duplicate identity guard: PASS");
console.log("TASK-ADD-SECTION-META-01 generic addTask persists section metadata: PASS");
