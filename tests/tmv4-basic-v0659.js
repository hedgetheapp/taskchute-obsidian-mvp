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
vm.runInContext(`${extractFunction("buildBridgeTaskMovedV4ReorderDraft")}; this.buildDraft = buildBridgeTaskMovedV4ReorderDraft;`, context);

const base = {
  task_id: "T-C",
  entry_id: "E-C",
  date: "2026-08-15",
  section_id: "night",
  section_label: "night",
  source_order_entry_ids: ["E-A", "E-B", "E-C"],
  source_order_task_ids: ["T-A", "T-B", "T-C"],
  target_order_entry_ids: ["E-C", "E-A", "E-B"],
  target_order_task_ids: ["T-C", "T-A", "T-B"]
};

const moved = context.buildDraft(base);
assert.strictEqual(moved.ok, true);
assert.strictEqual(moved.changed, true);
assert.strictEqual(moved.payload.move_payload_version, 4);
assert.strictEqual(moved.payload.taskmoved_payload_source, "task-drag-reorder-confirmed-markdown-v4");
assert.strictEqual(moved.payload.entry_id, "E-C");
assert.strictEqual(moved.payload.from.index, 2);
assert.strictEqual(moved.payload.to.index, 0);
assert.deepStrictEqual(Array.from(moved.payload.source_order_entry_ids), ["E-A", "E-B", "E-C"]);
assert.deepStrictEqual(Array.from(moved.payload.target_order_entry_ids), ["E-C", "E-A", "E-B"]);
assert.deepStrictEqual(Array.from(moved.payload.source_order_task_ids), ["T-A", "T-B", "T-C"]);
assert.deepStrictEqual(Array.from(moved.payload.target_order_task_ids), ["T-C", "T-A", "T-B"]);
assert.strictEqual(new Set(moved.payload.target_order_entry_ids).size, moved.payload.target_order_entry_ids.length);

const noOp = context.buildDraft(Object.assign({}, base, {
  target_order_entry_ids: base.source_order_entry_ids,
  target_order_task_ids: base.source_order_task_ids
}));
assert.strictEqual(noOp.ok, true);
assert.strictEqual(noOp.changed, false);

const methodStart = source.indexOf("  async moveTaskByDrag(");
const methodEnd = source.indexOf("\n  async moveSelectedTaskGroupToSectionByDrag(", methodStart);
assert(methodStart >= 0 && methodEnd > methodStart, "moveTaskByDrag method not found");
const method = source.slice(methodStart, methodEnd);
const dedicatedEnqueueCount = (method.match(/this\.enqueueBridgeTaskMoved\(bridgeTask,/g) || []).length;
assert.strictEqual(dedicatedEnqueueCount, 1, "D&D reorder must have one dedicated enqueue site");
assert(method.includes("!reorderDraft.ok || !reorderDraft.changed"), "no-op guard missing");
assert(method.includes("destinationAfterSaveInfo.entryIds"), "post-save entry order verification missing");
assert(method.includes("sourceOrderEntryIds: finalDraft.payload.source_order_entry_ids"), "source entry order handoff missing");

const finalizeStart = source.indexOf("  async finalizeBridgeTaskMovedCoalescedPayload(");
const finalizeEnd = source.indexOf("\n  async ", finalizeStart + 10);
assert(finalizeStart >= 0 && finalizeEnd > finalizeStart, "TaskMoved coalesce finalizer not found");
const finalizer = source.slice(finalizeStart, finalizeEnd);
assert(finalizer.includes("firstSourceEntryIds"), "coalesce must preserve the oldest source entry order");
assert(!finalizer.includes("delete payload.source_order_entry_ids"), "same-section v4 must not discard source entry order");

console.log("TMV4-BASIC-01 synthetic: PASS");
console.log("TMV4 no-op: PASS");
console.log("TMV4 duplicate prevention: PASS");
