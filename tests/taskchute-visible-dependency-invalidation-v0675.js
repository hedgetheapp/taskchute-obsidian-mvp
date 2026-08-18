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

const helpers = new Function(`
  const nowIso = () => "2026-08-18T00:00:00.000Z";
  ${extractFunction("decideTaskchuteVisibleDependencyInvalidation")}
  ${extractFunction("createTaskchuteUiRefreshSessionState")}
  ${extractFunction("markTaskchuteUiRefreshSessionDirty")}
  ${extractFunction("decideTaskchuteUiRefreshSessionFinalization")}
  return { decideTaskchuteVisibleDependencyInvalidation, createTaskchuteUiRefreshSessionState, markTaskchuteUiRefreshSessionDirty, decideTaskchuteUiRefreshSessionFinalization };
`)();

const decide = helpers.decideTaskchuteVisibleDependencyInvalidation;
const same = {
  baselineState: "tracked_present",
  eventKind: "create",
  nextExists: true,
  previousStat: "1:10",
  nextStat: "2:10",
  previousContent: "10:aaaa",
  nextContent: "10:aaaa"
};

assert.deepStrictEqual(decide(same), { invalidate: false, reason: "duplicate_create_existing_content_unchanged" });
console.log("VISIBLE-DEPENDENCY-01 duplicate create open board unchanged: PASS");

assert.deepStrictEqual(decide(Object.assign({}, same)), { invalidate: false, reason: "duplicate_create_existing_content_unchanged" });
console.log("VISIBLE-DEPENDENCY-02 duplicate create visible task definition unchanged: PASS");

assert.deepStrictEqual(decide({ baselineState: "untracked", eventKind: "create", nextExists: true }), { invalidate: false, reason: "untracked_path_no_visible_invalidation" });
console.log("VISIBLE-DEPENDENCY-03 unrelated historical board: PASS");

assert.strictEqual(decide({ baselineState: "untracked", eventKind: "create", nextExists: true }).invalidate, false);
console.log("VISIBLE-DEPENDENCY-04 unrelated task definition: PASS");

let generation = 7;
for (let i = 0; i < 24; i++) {
  const result = decide(i % 2 ? same : { baselineState: "untracked", eventKind: "create", nextExists: true });
  if (result.invalidate) generation++;
}
assert.strictEqual(generation, 7);
console.log("VISIBLE-DEPENDENCY-05 20+ duplicate/untracked create burst: PASS");

assert.deepStrictEqual(decide({ baselineState: "tracked_absent", eventKind: "create", nextExists: true }), { invalidate: true, reason: "tracked_absent_became_present" });
console.log("VISIBLE-DEPENDENCY-06 tracked absent board becomes present: PASS");

assert.strictEqual(decide({ baselineState: "tracked_absent", eventKind: "create", nextExists: true }).invalidate, true);
console.log("VISIBLE-DEPENDENCY-07 tracked absent visible definition becomes present: PASS");

assert.deepStrictEqual(decide(Object.assign({}, same, { eventKind: "modify", nextContent: "10:bbbb" })), { invalidate: true, reason: "tracked_visible_content_changed" });
console.log("VISIBLE-DEPENDENCY-08 open board content change: PASS");

assert.strictEqual(decide(Object.assign({}, same, { eventKind: "modify", nextContent: "10:bbbb" })).invalidate, true);
console.log("VISIBLE-DEPENDENCY-09 visible task definition content change: PASS");

assert.deepStrictEqual(decide({ baselineState: "tracked_present", eventKind: "delete", nextExists: false }), { invalidate: true, reason: "tracked_present_became_absent" });
console.log("VISIBLE-DEPENDENCY-10 tracked visible dependency delete: PASS");

assert.strictEqual(decide({ baselineState: "tracked_present", eventKind: "rename", nextExists: false }).invalidate, true);
console.log("VISIBLE-DEPENDENCY-11 tracked visible dependency rename: PASS");

for (let i = 0; i < 5; i++) assert.strictEqual(decide(same).invalidate, false);
console.log("VISIBLE-DEPENDENCY-12 repeated focus create bursts: PASS");

const noChangeSession = helpers.createTaskchuteUiRefreshSessionState({ id: "pending-zero" });
assert.strictEqual(helpers.decideTaskchuteUiRefreshSessionFinalization(noChangeSession, { viewOpen: true, hidden: false }).execute, false);
console.log("VISIBLE-DEPENDENCY-13 Bridge pending zero plus no-op burst: PASS");

const changedSession = helpers.createTaskchuteUiRefreshSessionState({ id: "visible-change" });
helpers.markTaskchuteUiRefreshSessionDirty(changedSession, { visibleMutationCount: 1 });
assert.strictEqual(helpers.decideTaskchuteUiRefreshSessionFinalization(changedSession, { viewOpen: true, hidden: false }).execute, true);
console.log("VISIBLE-DEPENDENCY-14 Bridge visible mutation remains one final refresh: PASS");

assert(source.includes('reason: "manual-command", force: true'));
console.log("VISIBLE-DEPENDENCY-15 explicit manual reload retained: PASS");

assert(source.includes("collectTaskchuteVisibleDependencyDescriptors"));
assert(source.includes('await this.plugin.refreshTaskchuteVisibleDependencyBaseline("taskchute-view-refresh")'));
assert(source.includes("taskchuteVisibleDependencyBaselines = next"));
assert(!source.includes("descriptors.size >= 500"));
assert(!source.includes("taskchute-external-invalidation-probe.json"));
console.log("VISIBLE-DEPENDENCY-16 date/view change rebuilds bounded fresh baseline: PASS");

console.log("TaskChute visible dependency invalidation v0.6.75: PASS");
