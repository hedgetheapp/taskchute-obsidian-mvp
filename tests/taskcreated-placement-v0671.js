"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "..", "main.js"), "utf8");

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert(start >= 0, `missing function ${name}`);
  const bodyMarker = source.indexOf(") {", start);
  assert(bodyMarker >= 0, `missing function body ${name}`);
  const brace = bodyMarker + 2;
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let i = brace; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { quote = ch; continue; }
    if (ch === "{") depth++;
    if (ch === "}" && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`unterminated function ${name}`);
}

const helperNames = [
  "normalizeBridgeTaskCreatedPlacementContract",
  "buildBridgeTaskCreatedPlacementFromSavedMarkdown",
  "inspectBridgeTaskCreatedPlacement",
  "inspectBridgeTaskCreatedPlacementTargetBeforeInsert",
  "insertTaskRelativeToEntryId"
];

const harness = new Function(`
  const isTaskLine = line => /^- \\[[ xX]\\]/.test(String(line || ""));
  const entryIdFromTaskLine = line => ((String(line || "").match(/entry_id=([^\\s>]+)/) || [])[1] || "");
  const taskIdFromTaskLine = line => ((String(line || "").match(/\\[\\[(T-[^_|\\]]+)_/) || [])[1] || "");
  const tcMetaFromTaskLine = line => {
    const body = ((String(line || "").match(/<!--\\s*tc:([^>]*)-->/) || [])[1] || "");
    const out = {};
    for (const match of body.matchAll(/([A-Za-z0-9_:-]+)=([^\\s]*)/g)) out[match[1]] = match[2];
    return out;
  };
  const sections = [{ id: "afternoon", name: "Afternoon" }, { id: "morning", name: "Morning" }];
  const findBoardSection = (_settings, value) => sections.find(item => item.id === value || item.name === value) || null;
  const resolveTaskLineSectionIdentityForPhysicalHeading = (line, settings, physical) => {
    const meta = tcMetaFromTaskLine(line);
    const section = findBoardSection(settings, physical);
    const row = findBoardSection(settings, meta.section_id || meta.section);
    const ok = !!section && !!row && section.id === row.id;
    return { ok, physical_section_id: section && section.id || "", parsed_row_section_id: row && row.id || "", reason_code: ok ? "row_section_identity_confirmed" : "row_section_id_conflict", reason: ok ? "" : "section mismatch" };
  };
  ${extractFunction("collectTaskBoardPhysicalOccurrences")}
  ${helperNames.map(extractFunction).join("\n")}
  return { ${helperNames.join(", ")} };
`);

const helpers = harness();

function row(taskId, entryId, section = "Afternoon", sectionId = "afternoon") {
  return `- [ ] [[${taskId}_${entryId}|${entryId}]] <!-- tc:entry_id=${entryId} section=${section} section_id=${sectionId} -->`;
}

function markdown(entries, section = "Afternoon") {
  return ["# Test", "", "## Tasks", "", `### ${section}`, ...entries.map(item => row(item.taskId, item.entryId, section, section.toLowerCase())), "", "## Log", ""].join("\n");
}

function order(md) {
  return Array.from(md.matchAll(/entry_id=([^\s>]+)/g), match => match[1]);
}

const existing = [
  { taskId: "T-0665", entryId: "E-0014" },
  { taskId: "T-0661", entryId: "E-0009" },
  { taskId: "T-0659", entryId: "E-0007" },
  { taskId: "T-0660", entryId: "E-0008" }
];
const created = { taskId: "T-0667", entryId: "E-0015" };
const senderTop = markdown([created, ...existing]);
const topContract = helpers.buildBridgeTaskCreatedPlacementFromSavedMarkdown(senderTop, {}, created);
assert.strictEqual(topContract.ok, true);
assert.strictEqual(topContract.taskcreated_placement_version, 1);
assert.strictEqual(topContract.placement_mode, "before-entry");
assert.strictEqual(topContract.placement_anchor_entry_id, "E-0014");
const topInsert = helpers.insertTaskRelativeToEntryId(markdown(existing), topContract.placement_anchor_entry_id, row(created.taskId, created.entryId), topContract.placement_mode);
assert.strictEqual(topInsert.ok, true);
assert.deepStrictEqual(order(topInsert.markdown), ["E-0015", "E-0014", "E-0009", "E-0007", "E-0008"]);
assert.strictEqual(helpers.inspectBridgeTaskCreatedPlacement(topInsert.markdown, {}, { ...created, sectionId: "afternoon", contract: topContract }).ok, true);
console.log("TASKCREATED-PLACEMENT-01 section-top real fixture: PASS");

const a = { taskId: "T-A", entryId: "E-A" };
const b = { taskId: "T-B", entryId: "E-B" };
const c = { taskId: "T-C", entryId: "E-C" };
const senderBelow = markdown([a, b, c]);
const belowContract = helpers.buildBridgeTaskCreatedPlacementFromSavedMarkdown(senderBelow, {}, b);
assert.strictEqual(belowContract.placement_mode, "after-entry");
assert.strictEqual(belowContract.placement_anchor_entry_id, "E-A");
const belowInsert = helpers.insertTaskRelativeToEntryId(markdown([a, c]), "E-A", row("T-B", "E-B"), "after-entry");
assert.deepStrictEqual(order(belowInsert.markdown), ["E-A", "E-B", "E-C"]);
assert.strictEqual(helpers.inspectBridgeTaskCreatedPlacement(belowInsert.markdown, {}, { ...b, sectionId: "afternoon", contract: belowContract }).ok, true);
console.log("TASKCREATED-PLACEMENT-02 explicit insert-below: PASS");

let sender = markdown([a]);
let receiver = markdown([a]);
for (const next of [b, c, { taskId: "T-D", entryId: "E-D" }]) {
  const senderInsert = helpers.insertTaskRelativeToEntryId(sender, order(sender).slice(-1)[0], row(next.taskId, next.entryId), "after-entry");
  sender = senderInsert.markdown;
  const contract = helpers.buildBridgeTaskCreatedPlacementFromSavedMarkdown(sender, {}, next);
  const receiverInsert = helpers.insertTaskRelativeToEntryId(receiver, contract.placement_anchor_entry_id, row(next.taskId, next.entryId), contract.placement_mode);
  receiver = receiverInsert.markdown;
  assert.strictEqual(helpers.inspectBridgeTaskCreatedPlacement(receiver, {}, { ...next, sectionId: "afternoon", contract }).ok, true);
}
assert.deepStrictEqual(order(receiver), order(sender));
assert.strictEqual(new Set(order(receiver)).size, order(receiver).length);
console.log("TASKCREATED-PLACEMENT-03 three sequential creates: PASS");

const onlyEntry = { taskId: "T-ONLY", entryId: "E-ONLY" };
const onlyContract = helpers.buildBridgeTaskCreatedPlacementFromSavedMarkdown(markdown([onlyEntry]), {}, onlyEntry);
assert.strictEqual(onlyContract.placement_mode, "only-in-section");
assert.strictEqual(helpers.inspectBridgeTaskCreatedPlacementTargetBeforeInsert(markdown([]), {}, "afternoon", onlyContract).ok, true);
assert.strictEqual(helpers.inspectBridgeTaskCreatedPlacementTargetBeforeInsert(markdown([a]), {}, "afternoon", onlyContract).ok, false);
assert.strictEqual(helpers.inspectBridgeTaskCreatedPlacement(markdown([onlyEntry]), {}, { ...onlyEntry, sectionId: "afternoon", contract: onlyContract }).ok, true);
console.log("TASKCREATED-PLACEMENT-04 only-in-section strictness: PASS");

assert.strictEqual(helpers.normalizeBridgeTaskCreatedPlacementContract({}).legacy, true);
assert.strictEqual(helpers.normalizeBridgeTaskCreatedPlacementContract({ taskcreated_placement_version: 2, placement_mode: "before-entry", placement_anchor_entry_id: "E-A" }).ok, false);
assert.strictEqual(helpers.buildBridgeTaskCreatedPlacementFromSavedMarkdown(markdown([a, a, b]), {}, { taskId: "T-B", entryId: "E-B" }).ok, false);
assert.strictEqual(helpers.inspectBridgeTaskCreatedPlacementTargetBeforeInsert(markdown([a]), {}, "afternoon", { taskcreated_placement_version: 1, placement_mode: "after-entry", placement_anchor_entry_id: "E-MISSING" }).ok, false);
const duplicateAnchor = markdown([a, { taskId: "T-X", entryId: "E-A" }]);
assert.strictEqual(helpers.inspectBridgeTaskCreatedPlacementTargetBeforeInsert(duplicateAnchor, {}, "afternoon", { taskcreated_placement_version: 1, placement_mode: "after-entry", placement_anchor_entry_id: "E-A" }).ok, false);
const wrongSection = `${markdown([a])}\n### Morning\n${row("T-M", "E-M", "Morning", "morning")}\n`;
assert.strictEqual(helpers.inspectBridgeTaskCreatedPlacementTargetBeforeInsert(wrongSection, {}, "afternoon", { taskcreated_placement_version: 1, placement_mode: "after-entry", placement_anchor_entry_id: "E-M" }).ok, false);
console.log("TASKCREATED-PLACEMENT-05 legacy/unknown/missing/duplicate/wrong-section guards: PASS");

const correctReplay = helpers.inspectBridgeTaskCreatedPlacement(senderBelow, {}, { ...b, sectionId: "afternoon", contract: belowContract });
const wrongReplay = helpers.inspectBridgeTaskCreatedPlacement(markdown([b, a, c]), {}, { ...b, sectionId: "afternoon", contract: belowContract });
assert.strictEqual(correctReplay.ok, true);
assert.strictEqual(wrongReplay.ok, false);
console.log("TASKCREATED-PLACEMENT-06 idempotent replay relation verification: PASS");

const duplicateTaskDifferentEntries = markdown([{ taskId: "T-SAME", entryId: "E-OLD" }, { taskId: "T-SAME", entryId: "E-NEW" }, c]);
const duplicateTaskContract = helpers.buildBridgeTaskCreatedPlacementFromSavedMarkdown(duplicateTaskDifferentEntries, {}, { taskId: "T-SAME", entryId: "E-NEW" });
assert.strictEqual(duplicateTaskContract.placement_anchor_entry_id, "E-OLD");
assert.strictEqual(helpers.inspectBridgeTaskCreatedPlacement(duplicateTaskDifferentEntries, {}, { taskId: "T-SAME", entryId: "E-NEW", sectionId: "afternoon", contract: duplicateTaskContract }).ok, true);
console.log("TASKCREATED-PLACEMENT-07 duplicate task_id uses exact entry_id: PASS");

const protectedPhysicalResult = markdown([{ taskId: "T-DONE", entryId: "E-DONE" }, created, ...existing]);
const protectedContract = helpers.buildBridgeTaskCreatedPlacementFromSavedMarkdown(protectedPhysicalResult, {}, created);
assert.strictEqual(protectedContract.placement_mode, "after-entry");
assert.strictEqual(protectedContract.placement_anchor_entry_id, "E-DONE");
console.log("TASKCREATED-PLACEMENT-08 protected local result captured, not reimplemented: PASS");

const enqueueMethod = source.slice(source.indexOf("  async enqueueBridgeTaskCreatedFromSavedMarkdown("), source.indexOf("  async enqueueBridgeTaskCreated(", source.indexOf("  async enqueueBridgeTaskCreatedFromSavedMarkdown(")));
assert(enqueueMethod.includes("buildBridgeTaskCreatedPlacementFromSavedMarkdown"));
for (const marker of ['creationSource: interrupt ? "interrupt-task-add" : "task-add"', 'creationSource: "task-copy"', 'creationSource: "task-insert-section-top"', 'creationSource: "task-insert-below"']) {
  const markerIndex = source.indexOf(marker);
  const callStart = source.lastIndexOf("enqueueBridgeTaskCreatedFromSavedMarkdown", markerIndex);
  assert(callStart >= 0 && markerIndex - callStart < 200, `ordinary route must capture placement: ${marker}`);
}
const continuationIndex = source.indexOf('creationSource: "interrupt-continuation"');
assert(continuationIndex > 0);
assert(source.lastIndexOf("enqueueBridgeTaskCreated(Object.assign({}, continuationTask", continuationIndex) > 0, "continuation specialized enqueue must remain unchanged");
const inboundMethod = source.slice(source.indexOf("  async applyBridgeInboundTaskCreatedEvent("), source.indexOf("  async ackBridgeInboundEvent("));
assert(inboundMethod.includes("inspectBridgeTaskCreatedPlacementTargetBeforeInsert"));
assert(inboundMethod.includes("insertTaskRelativeToEntryId"));
assert(inboundMethod.includes("inbound_taskcreated_existing_placement_mismatch"));
assert(inboundMethod.includes("legacy_taskcreated_placement_fallback"));
assert(!inboundMethod.includes('creation_source || "task-insert-section-top"'));
console.log("TASKCREATED-PLACEMENT-09 outbound/inbound call-path contract: PASS");

const normalizeOutbox = events => JSON.parse(JSON.stringify(events));
const renameHarness = new Function("normalizeBridgeOutboxEvents", `${extractFunction("buildBridgeTaskCreatedRenameHandoffPlan")}; return buildBridgeTaskCreatedRenameHandoffPlan;`)(normalizeOutbox);
const placementPayload = { task_id: "T-B", entry_id: "E-B", title: "old", taskcreated_placement_version: 1, placement_mode: "after-entry", placement_anchor_entry_id: "E-A" };
const renamed = renameHarness([{ event_id: "create", event_type: "TaskCreated", status: "pending", payload: placementPayload }], { task_id: "T-B", entry_id: "E-B", title: "new", file: "T-B_new" });
assert.strictEqual(renamed.events[0].payload.placement_mode, "after-entry");
assert.strictEqual(renamed.events[0].payload.placement_anchor_entry_id, "E-A");
const refreshMethod = source.slice(source.indexOf("  async refreshBridgeTaskCreatedPayloadFromVault("), source.indexOf("  async testBridgeManualSend("));
assert(refreshMethod.includes("Object.assign({}, payload"), "refresh must preserve optional placement fields");
assert(!refreshMethod.includes("buildBridgeTaskCreatedPlacementFromSavedMarkdown"), "refresh must not recalculate placement");
assert(!enqueueMethod.includes("enqueueBridgeTaskMoved"));
console.log("TASKCREATED-PLACEMENT-10 rename/refresh immutability and no TaskMoved repair: PASS");

console.log("TASKCREATED-PLACEMENT v0.6.71 focused regression: PASS");
