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
  "decideTaskchuteIdleResumeRefresh",
  "decideTaskchuteDelayedRefresh",
  "normalizeTaskchuteInvalidationSource",
  "decideTaskchuteExternalInvalidation",
  "buildTaskchuteContentFingerprint",
  "decideTaskchuteOpenBoardStatChange",
  "createTaskchuteUiRefreshSessionState",
  "markTaskchuteUiRefreshSessionDirty",
  "decideTaskchuteUiRefreshSessionFinalization"
];
const helpers = new Function(`
  const nowIso = () => "2026-08-18T00:00:00.000Z";
  ${names.map(extractFunction).join("\n")}
  return { ${names.join(",")} };
`)();

assert.deepStrictEqual(
  helpers.decideTaskchuteIdleResumeRefresh({ reason: "window-focus", idleDurationMs: 5 * 60 * 1000, relevantInvalidationDetected: false }),
  { refresh: false, reason: "window_focus_no_invalidation" }
);
console.log("WINDOW-FOCUS-01 five-minute no-change return: PASS");

assert.strictEqual(helpers.decideTaskchuteIdleResumeRefresh({ reason: "window-focus", idleDurationMs: 100, relevantInvalidationDetected: false }).refresh, false);
console.log("WINDOW-FOCUS-02 short focus roundtrip: PASS");

for (let i = 0; i < 5; i++) {
  assert.strictEqual(helpers.decideTaskchuteIdleResumeRefresh({ reason: "window-focus", relevantInvalidationDetected: false }).refresh, false);
}
console.log("WINDOW-FOCUS-03 repeated app switching: PASS");

assert.deepStrictEqual(
  helpers.decideTaskchuteIdleResumeRefresh({ reason: "visibility-return", relevantInvalidationDetected: false }),
  { refresh: false, reason: "visibility_return_no_invalidation" }
);
console.log("WINDOW-FOCUS-04 visibility return no change: PASS");

const before = helpers.buildTaskchuteContentFingerprint("### Morning\n- [ ] A");
const after = helpers.buildTaskchuteContentFingerprint("### Morning\n- [ ] B");
assert.strictEqual(helpers.decideTaskchuteOpenBoardStatChange({ previousStat: "1:10", nextStat: "2:10", previousContent: before, nextContent: after }).invalidate, true);
assert.strictEqual(helpers.decideTaskchuteIdleResumeRefresh({ reason: "window-focus", relevantInvalidationDetected: true }).refresh, true);
console.log("WINDOW-FOCUS-05 relevant external Markdown refreshes once: PASS");

const watcherBody = source.slice(source.indexOf("  handleVaultExternalChange("), source.indexOf("  isRoutineHistoryPath("));
assert(watcherBody.includes("if (!relevantPath) return"));
console.log("WINDOW-FOCUS-06 irrelevant note change ignored: PASS");

const queueBody = source.slice(source.indexOf("  queueExternalRefresh("), source.indexOf("  collectOpenTaskchuteBoardPaths("));
assert.deepStrictEqual(helpers.decideTaskchuteExternalInvalidation("plugin-data"), {
  markDirty: false,
  compareVisiblePluginData: true,
  source: "plugin_data_requires_comparison"
});
assert(!/^\s*this\.markTaskchuteDataInvalidated\(reason\);/m.test(queueBody));
console.log("WINDOW-FOCUS-07 nonvisual plugin-data write ignored: PASS");

assert.deepStrictEqual(helpers.decideTaskchuteDelayedRefresh({ dataGeneration: 7, renderedGeneration: 7 }), { refresh: false, reason: "stale_timer_no_invalidation" });
console.log("WINDOW-FOCUS-08 stale delayed timer no-op: PASS");

const session = helpers.createTaskchuteUiRefreshSessionState({ id: "focus-bridge", reason: "window-focus" });
helpers.markTaskchuteUiRefreshSessionDirty(session, { visibleMutationCount: 2 });
assert.strictEqual(helpers.decideTaskchuteUiRefreshSessionFinalization(session, { viewOpen: true, hidden: false }).execute, true);
console.log("WINDOW-FOCUS-09 Bridge visible mutations retain one final refresh: PASS");

const focusWatcherBody = source.slice(source.indexOf("  setupWakeSyncGuardWatchers("), source.indexOf("  isTaskchuteMobileEnvironment("));
assert(!focusWatcherBody.includes("setViewState"));
assert(focusWatcherBody.includes('viewInstanceAction: "reused"'));
assert(source.includes('view_instance_action: "reused"'));
console.log("WINDOW-FOCUS-10 existing view instance reused: PASS");

assert(source.includes('reason: "manual-command", force: true'));
assert(source.includes('"reloadTaskchuteSyncDataFromDisk->patchTaskchuteViewsFromExternalSync"'));
console.log("WINDOW-FOCUS-11 explicit manual reload retained: PASS");

assert.deepStrictEqual(
  helpers.decideTaskchuteOpenBoardStatChange({ previousStat: "1:10", nextStat: "2:10", previousContent: before, nextContent: before }),
  { invalidate: false, reason: "view_already_current" }
);
assert(source.includes("await this.updateTaskchutePathExternalBaseline(path)"));
assert(source.includes("await this.plugin.updateOpenTaskchuteBoardStatBaseline()"));
assert(watcherBody.includes("queueTaskchuteRelevantExternalRefresh"));
assert(source.includes("taskchute_vault_event_content_unchanged"));
console.log("WINDOW-FOCUS-12 stale stat baseline cannot masquerade as content change: PASS");

console.log("TaskChute window focus no-op refresh v0.6.74: PASS");
