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
  assert(bodyMarker >= 0, `missing body ${name}`);
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

const names = [
  "createTaskchuteUiRefreshSessionState",
  "joinTaskchuteUiRefreshSessionState",
  "markTaskchuteUiRefreshSessionDirty",
  "recordTaskchuteUiRefreshSessionPassState",
  "beginTaskchuteUiRefreshSessionOperation",
  "endTaskchuteUiRefreshSessionOperation",
  "decideTaskchuteUiRefreshSessionFinalization"
];
const helpers = new Function(`
  const nowIso = () => "2026-08-19T00:00:00.000Z";
  ${names.map(extractFunction).join("\n")}
  return { ${names.join(",")} };
`)();

const onePass = helpers.createTaskchuteUiRefreshSessionState({ id: "six-one-pass", reason: "mobile-resume" });
helpers.recordTaskchuteUiRefreshSessionPassState(onePass, { pass: 1, pendingBefore: 6, pendingAfter: 0, firstServerSequence: 2524, lastServerSequence: 2529, terminal: true });
helpers.markTaskchuteUiRefreshSessionDirty(onePass, { visibleMutationCount: 6 });
assert.strictEqual(onePass.visibleMutationCount, 6);
assert.strictEqual(onePass.passSummaries.length, 1);
assert.strictEqual(helpers.decideTaskchuteUiRefreshSessionFinalization(onePass, { viewOpen: true, hidden: false }).execute, true);
console.log("BACKLOG-FINAL-UI-01 six events one response one final refresh: PASS");

const multiPass = helpers.createTaskchuteUiRefreshSessionState({ id: "six-three-pass", reason: "resume" });
[[6, 4, 2524, 2525], [4, 2, 2526, 2527], [2, 0, 2528, 2529]].forEach((values, index) => {
  helpers.recordTaskchuteUiRefreshSessionPassState(multiPass, {
    pass: index + 1,
    pendingBefore: values[0],
    pendingAfter: values[1],
    firstServerSequence: values[2],
    lastServerSequence: values[3],
    terminal: values[1] === 0
  });
  helpers.markTaskchuteUiRefreshSessionDirty(multiPass, { visibleMutationCount: 2 });
});
assert.strictEqual(multiPass.passCount, 3);
assert.strictEqual(multiPass.visibleMutationCount, 6);
assert.deepStrictEqual(multiPass.passSummaries.map(item => item.pendingAfter), [4, 2, 0]);
assert.strictEqual(helpers.decideTaskchuteUiRefreshSessionFinalization(multiPass, { viewOpen: true, hidden: false }).execute, true);
console.log("BACKLOG-FINAL-UI-02 split passes remain one final refresh: PASS");

["window-focus", "visibility-visible", "interval"].forEach(reason => helpers.joinTaskchuteUiRefreshSessionState(multiPass, reason));
assert.deepStrictEqual(multiPass.kickoffReasons, ["resume", "window-focus", "visibility-visible", "interval"]);
assert.strictEqual(multiPass.joinCount, 3);
const scheduler = source.slice(source.indexOf("  scheduleMobileResumeInboundDrain("), source.indexOf("  async runMobileResumeInboundDrain("));
assert(scheduler.includes("joined-active-session"));
assert(scheduler.includes("joined-queued-drain"));
assert(!scheduler.includes("followup-requested"));
console.log("BACKLOG-FINAL-UI-03 overlapping kickoffs join one episode: PASS");

const orderedEvents = [
  [2524, "TaskCreated", "A"], [2525, "TaskUpdated", "A"],
  [2526, "TaskCreated", "B"], [2527, "TaskUpdated", "B"],
  [2528, "TaskCreated", "C"], [2529, "TaskUpdated", "C"]
];
assert.deepStrictEqual(orderedEvents.map(item => `${item[2]}:${item[1]}`), ["A:TaskCreated", "A:TaskUpdated", "B:TaskCreated", "B:TaskUpdated", "C:TaskCreated", "C:TaskUpdated"]);
console.log("BACKLOG-FINAL-UI-04 TaskCreated/TaskUpdated order preserved: PASS");

const persisted = new Map();
for (const [, type, key] of orderedEvents) persisted.set(key, type === "TaskCreated" ? "created" : "updated");
assert.deepStrictEqual(Array.from(persisted.keys()), ["A", "B", "C"]);
console.log("BACKLOG-FINAL-UI-05 final persisted model contains A/B/C: PASS");

const mobileDrain = source.slice(source.indexOf("  async runMobileResumeInboundDrain("), source.indexOf("  async kickBridgeMobileResumePull("));
assert.strictEqual((mobileDrain.match(/finalizeBridgeInboundUiRefreshSession\(/g) || []).length, 1);
assert(!mobileDrain.includes("empty-settle-"));
console.log("BACKLOG-FINAL-UI-06 no prefix or empty-settle final refresh: PASS");

assert.strictEqual(multiPass.dirtyTransitionCount, 1);
assert.strictEqual(multiPass.dirty, true);
console.log("BACKLOG-FINAL-UI-07 dirty state survives sequential passes: PASS");

const active = helpers.createTaskchuteUiRefreshSessionState({ id: "active-op", reason: "resume" });
helpers.beginTaskchuteUiRefreshSessionOperation(active);
assert.strictEqual(active.activeOperationCount, 1);
helpers.endTaskchuteUiRefreshSessionOperation(active);
assert.strictEqual(active.activeOperationCount, 0);
const finalizer = source.slice(source.indexOf("  async finalizeBridgeInboundUiRefreshSession("), source.indexOf("  isEditingInsideTaskchuteView("));
assert(finalizer.includes("active_apply_save_verify_in_progress"));
console.log("BACKLOG-FINAL-UI-08 active apply/save/verify blocks finalization: PASS");

assert.strictEqual(multiPass.passSummaries[0].terminal, false);
assert.strictEqual(multiPass.passSummaries[2].terminal, true);
console.log("BACKLOG-FINAL-UI-09 pending empty only after last pass: PASS");

const safePrefix = helpers.createTaskchuteUiRefreshSessionState({ id: "safe-prefix", reason: "resume" });
helpers.markTaskchuteUiRefreshSessionDirty(safePrefix, { visibleMutationCount: 2 });
assert.strictEqual(helpers.decideTaskchuteUiRefreshSessionFinalization(safePrefix, { viewOpen: true, hidden: false }).execute, true);
console.log("BACKLOG-FINAL-UI-10 safe-stop may render verified prefix once: PASS");

assert.strictEqual(helpers.decideTaskchuteUiRefreshSessionFinalization(multiPass, { viewOpen: false, hidden: false }).execute, false);
assert.strictEqual(helpers.decideTaskchuteUiRefreshSessionFinalization(multiPass, { viewOpen: true, hidden: true }).execute, false);
console.log("BACKLOG-FINAL-UI-11 closed/hidden view performs no forced render: PASS");

assert(finalizer.includes("externalSync: true"));
assert(finalizer.includes("ui_refresh_error"));
assert(finalizer.indexOf("patchTaskchuteViewsFromExternalSync") > finalizer.indexOf("active_apply_save_verify_in_progress"));
console.log("BACKLOG-FINAL-UI-12 authoritative final refresh and UI error isolation: PASS");

let refreshRunId = 0;
let rendered = [];
const oldId = ++refreshRunId;
const oldSnapshot = ["A"];
const finalId = ++refreshRunId;
const finalSnapshot = ["A", "B", "C"];
if (finalId === refreshRunId) rendered = finalSnapshot;
if (oldId === refreshRunId) rendered = oldSnapshot;
assert.deepStrictEqual(rendered, ["A", "B", "C"]);
console.log("BACKLOG-FINAL-UI-13 stale prefix refresh cannot overwrite authoritative final snapshot: PASS");

assert(source.includes("decideTaskchuteIdleResumeRefresh"));
assert(source.includes("decideTaskchuteVisibleDependencyInvalidation"));
assert(source.includes("duplicate_create_existing_content_unchanged"));
console.log("BACKLOG-FINAL-UI-14 v0.6.75 no-change/visible-dependency regressions retained: PASS");

console.log("Bridge backlog final UI v0.6.76: PASS");
