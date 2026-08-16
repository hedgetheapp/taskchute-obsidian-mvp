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

function taskLine(key, title, checked = false) {
  return `- [${checked ? "x" : " "}] [[T-${key}_${title}|${title}]] <!-- tc:entry_id=${key} -->`;
}

function taskKeyFromTaskLine(line) {
  const match = String(line || "").match(/entry_id=([^\s>]+)/);
  return match ? match[1] : "";
}

const statusByKey = new Map();
const context = {
  ensureTasksSkeleton: markdown => String(markdown || ""),
  insertTaskIntoSection: () => { throw new Error("unexpected fallback insert"); },
  isTaskLine: line => /^\s*-\s+\[[ xX]\]\s+\[\[/.test(String(line || "")),
  taskKeyFromTaskLine,
  taskMatchesLine: (line, key) => taskKeyFromTaskLine(line) === String(key || ""),
  latestStatusFromLog: (_markdown, key) => statusByKey.get(key) || "",
  normalizeStatusLabel: value => String(value || "")
};
vm.createContext(context);
vm.runInContext([
  extractFunction("isTaskLineCompletedForDefaultOrder"),
  extractFunction("normalizeProtectedInsertKeys"),
  extractFunction("isTaskLineProtectedForTopInsert"),
  extractFunction("findActiveTaskInsertIndexAfterCompletedTop"),
  extractFunction("findTaskSectionBoundsByLineIndex"),
  extractFunction("insertTaskAfterKey"),
  "this.insertAfter = insertTaskAfterKey;"
].join("\n"), context);

const settings = {};
const explicitBelow = { insertPlacement: "explicit-below", protectedKeys: [] };
const initial = ["## Tasks", "### Morning", taskLine("E-A", "A"), "", "## Log", ""].join("\n");
const afterB = context.insertAfter(initial, settings, "E-A", taskLine("E-B", "B"), "Morning", explicitBelow);
const afterC = context.insertAfter(afterB, settings, "E-B", taskLine("E-C", "C"), "Morning", explicitBelow);

function physicalOrder(markdown) {
  return String(markdown || "").split(/\r?\n/).filter(context.isTaskLine).map(taskKeyFromTaskLine);
}

assert.deepStrictEqual(physicalOrder(afterB), ["E-A", "E-B"]);
assert.deepStrictEqual(physicalOrder(afterC), ["E-A", "E-B", "E-C"]);

const visualOrder = ["E-A"];
visualOrder.splice(visualOrder.indexOf("E-A") + 1, 0, "E-B");
visualOrder.splice(visualOrder.indexOf("E-B") + 1, 0, "E-C");
assert.deepStrictEqual(physicalOrder(afterC), visualOrder);
assert.deepStrictEqual(physicalOrder(String(afterC)), visualOrder, "refresh/reload must preserve physical order");

const renamed = afterC
  .replaceAll("|A]]", "|renamed-A]]")
  .replaceAll("|B]]", "|renamed-B]]")
  .replaceAll("|C]]", "|renamed-C]]");
assert.deepStrictEqual(physicalOrder(renamed), ["E-A", "E-B", "E-C"]);
assert(renamed.includes("|renamed-A]]") && renamed.includes("|renamed-B]]") && renamed.includes("|renamed-C]]"));

const legacyAfterC = context.insertAfter(afterB, settings, "E-B", taskLine("E-C", "C"), "Morning", {});
assert.deepStrictEqual(physicalOrder(legacyAfterC), ["E-C", "E-A", "E-B"], "legacy target protection reproduces the latent bug");

const protectedBase = [
  "## Tasks",
  "### Morning",
  taskLine("E-A", "A"),
  taskLine("E-B", "B", true),
  "",
  "## Log",
  ""
].join("\n");
const completedProtected = context.insertAfter(protectedBase, settings, "E-B", taskLine("E-C", "C"), "Morning", explicitBelow);
assert.deepStrictEqual(physicalOrder(completedProtected), ["E-C", "E-A", "E-B"]);

const runtimeProtected = context.insertAfter(
  protectedBase.replace("[x]", "[ ]"),
  settings,
  "E-B",
  taskLine("E-C", "C"),
  "Morning",
  { insertPlacement: "explicit-below", protectedKeys: ["E-B"] }
);
assert.deepStrictEqual(physicalOrder(runtimeProtected), ["E-C", "E-A", "E-B"], "running/paused runtime protection must remain active");

for (const status of ["実行中", "中断中"]) {
  statusByKey.set("E-B", status);
  const statusProtected = context.insertAfter(
    protectedBase.replace("[x]", "[ ]"),
    settings,
    "E-B",
    taskLine("E-C", "C"),
    "Morning",
    explicitBelow
  );
  assert.deepStrictEqual(physicalOrder(statusProtected), ["E-C", "E-A", "E-B"], `${status} protection must remain active`);
}
statusByKey.clear();

function extractMethod(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert(start >= 0 && end > start, `missing method range: ${startMarker}`);
  return source.slice(start, end);
}

const copyMethod = extractMethod("  async copyCurrentTaskBelow(", "\n  async insertTaskAtSelectedSectionTop(");
const belowMethod = extractMethod("  async insertTaskBelowCurrent(", "\n  async moveSelectedTask(");
assert(copyMethod.includes('insertPlacement: "explicit-below"'), "task-copy must use explicit-below placement");
assert(belowMethod.includes('insertPlacement: "explicit-below"'), "task-insert-below must use explicit-below placement");
assert(!copyMethod.includes("enqueueBridgeTaskMoved"));
assert(!belowMethod.includes("enqueueBridgeTaskMoved"));
assert.strictEqual((belowMethod.match(/insertTaskRowBelowInViews/g) || []).length, 1, "visual insertion must occur once");
const belowBuildIndex = belowMethod.indexOf('insertPlacement: "explicit-below"');
const belowValidateIndex = belowMethod.indexOf("validateAndRecordTaskCreatedOrder");
const belowSaveIndex = belowMethod.indexOf("writeFileText(notePath, md)");
const belowBridgeIndex = belowMethod.indexOf("enqueueBridgeTaskCreated");
const belowVisualIndex = belowMethod.indexOf("insertTaskRowBelowInViews");
assert(belowBuildIndex >= 0 && belowBuildIndex < belowValidateIndex);
assert(belowValidateIndex < belowSaveIndex && belowSaveIndex < belowBridgeIndex);
assert(belowBridgeIndex < belowVisualIndex, "visual insertion must follow physical save and Bridge create handoff");

const inboundCreated = extractMethod("  async applyBridgeInboundTaskCreatedEvent(", "\n  async applyBridgeInboundTaskUpdatedEvent(");
assert(inboundCreated.includes('insertPlacement: "explicit-below"'), "explicit inbound continuation must preserve final anchor adjacency");

console.log("INSERT-BELOW-ORDER-01 physical A/B/C: PASS");
console.log("INSERT-BELOW-ORDER-02 refresh and renamed order: PASS");
console.log("INSERT-BELOW-ORDER-03 physical/visual parity: PASS");
console.log("INSERT-BELOW-ORDER-04 completed/runtime protection: PASS");
console.log("INSERT-BELOW-ORDER-05 task-copy scope and no TaskMoved: PASS");
