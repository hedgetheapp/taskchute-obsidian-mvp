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
  "decideTaskchuteUiRefreshSessionFinalization",
  "decideTaskchuteIdleResumeRefresh"
];
const helpers = new Function(`
  const nowIso = () => "2026-08-18T00:00:00.000Z";
  ${names.map(extractFunction).join("\n")}
  return { ${names.join(",")} };
`)();

for (const idleMs of [3 * 60 * 1000, 10 * 60 * 1000, 31 * 60 * 1000]) {
  const decision = helpers.decideTaskchuteIdleResumeRefresh({ reason: "taskboard-interaction", idleDurationMs: idleMs, relevantInvalidationDetected: false });
  assert.deepStrictEqual(decision, { refresh: false, reason: "idle_interaction_no_invalidation" });
}
console.log("UI-REFRESH-01 idle first interaction no change: PASS");

for (let index = 0; index < 4; index++) {
  assert.strictEqual(helpers.decideTaskchuteIdleResumeRefresh({ reason: "window-focus", relevantInvalidationDetected: false }).refresh, false);
}
console.log("UI-REFRESH-02 repeated idle/focus no-op cycles: PASS");

const onePass = helpers.createTaskchuteUiRefreshSessionState({ id: "one-pass", reason: "startup" });
helpers.markTaskchuteUiRefreshSessionDirty(onePass, { visibleMutationCount: 5 });
assert.deepStrictEqual(helpers.decideTaskchuteUiRefreshSessionFinalization(onePass, { viewOpen: true, hidden: false }), { execute: true, reason: "bridge_inbound_session_final" });
assert.strictEqual(onePass.visibleMutationCount, 5);
console.log("UI-REFRESH-03 multiple inbound events one final refresh: PASS");

const multiPass = helpers.createTaskchuteUiRefreshSessionState({ id: "multi-pass", reason: "mobile-resume" });
multiPass.passCount = 3;
helpers.markTaskchuteUiRefreshSessionDirty(multiPass, { visibleMutationCount: 2 });
helpers.markTaskchuteUiRefreshSessionDirty(multiPass, { visibleMutationCount: 3 });
assert.strictEqual(helpers.decideTaskchuteUiRefreshSessionFinalization(multiPass, { viewOpen: true, hidden: false }).execute, true);
assert.strictEqual(multiPass.visibleMutationCount, 5);
console.log("UI-REFRESH-04 multiple drain passes coalesce: PASS");

const empty = helpers.createTaskchuteUiRefreshSessionState({ id: "empty", reason: "interval" });
assert.deepStrictEqual(helpers.decideTaskchuteUiRefreshSessionFinalization(empty, { viewOpen: true, hidden: false }), { execute: false, reason: "pending_zero_no_data_change" });
console.log("UI-REFRESH-05 empty drain zero refresh: PASS");

const safePrefix = helpers.createTaskchuteUiRefreshSessionState({ id: "safe-prefix", reason: "resume" });
helpers.markTaskchuteUiRefreshSessionDirty(safePrefix, { visibleMutationCount: 2 });
assert.strictEqual(helpers.decideTaskchuteUiRefreshSessionFinalization(safePrefix, { viewOpen: true, hidden: false }).execute, true);
const safeBefore = helpers.createTaskchuteUiRefreshSessionState({ id: "safe-before", reason: "resume" });
assert.strictEqual(helpers.decideTaskchuteUiRefreshSessionFinalization(safeBefore, { viewOpen: true, hidden: false }).execute, false);
console.log("UI-REFRESH-06 safe-stop prefix/no-mutation decisions: PASS");

const overlap = helpers.createTaskchuteUiRefreshSessionState({ id: "overlap", reason: "startup" });
helpers.joinTaskchuteUiRefreshSessionState(overlap, "focus");
helpers.joinTaskchuteUiRefreshSessionState(overlap, "resume");
helpers.joinTaskchuteUiRefreshSessionState(overlap, "focus");
assert.deepStrictEqual(overlap.kickoffReasons, ["startup", "focus", "resume"]);
console.log("UI-REFRESH-07 overlapping kickoff single session: PASS");

const closed = helpers.createTaskchuteUiRefreshSessionState({ id: "closed", reason: "startup" });
helpers.markTaskchuteUiRefreshSessionDirty(closed, { visibleMutationCount: 1 });
assert.deepStrictEqual(helpers.decideTaskchuteUiRefreshSessionFinalization(closed, { viewOpen: false, hidden: false }), { execute: false, reason: "view_not_open" });
assert.deepStrictEqual(helpers.decideTaskchuteUiRefreshSessionFinalization(closed, { viewOpen: true, hidden: true }), { execute: false, reason: "mobile_hidden_no_render" });
console.log("UI-REFRESH-08 closed/hidden view zero forced render: PASS");

assert.strictEqual(helpers.decideTaskchuteIdleResumeRefresh({ reason: "visibility-return", relevantInvalidationDetected: true }).refresh, true);
assert.strictEqual(helpers.decideTaskchuteIdleResumeRefresh({ reason: "visibility-return", relevantInvalidationDetected: false }).refresh, false);
console.log("UI-REFRESH-09 relevant external change only: PASS");

const watcher = source.slice(source.indexOf("  setupWakeSyncGuardWatchers()"), source.indexOf("  isTaskchuteMobileEnvironment()"));
assert(!watcher.includes('queueTaskchuteDisplayDataReload("visibility-return"'));
assert(!watcher.includes('queueTaskchuteDisplayDataReload("window-focus"'));
assert(watcher.includes("handleTaskchuteIdleResumeFreshnessCheck"));
const keyboard = source.slice(source.indexOf("  activateKeyboardScope("), source.indexOf("  getActiveTaskchuteView("));
assert(!keyboard.includes("long-inactive-board-interaction"));
assert(keyboard.includes("handleTaskchuteIdleResumeFreshnessCheck"));
const viewRefresh = source.slice(source.indexOf("  async refresh(options = {})", source.indexOf("class TaskchuteView")), source.indexOf("  renderSyncStatus(root)", source.indexOf("class TaskchuteView")));
assert(!viewRefresh.includes("taskboard-refresh-after-inactive"));
console.log("UI-REFRESH-10 idle thresholds no longer reload authority: PASS");

const runAuto = source.slice(source.indexOf("  async runBridgeInboundAutoApplyOnce("), source.indexOf("  getBridgeInboundAppliedTaskDeletedEventIds("));
assert(runAuto.includes("beginBridgeInboundUiRefreshSession"));
assert(runAuto.includes("requestBridgeInboundUiRefresh"));
assert(runAuto.includes("finalizeBridgeInboundUiRefreshSession"));
assert(!runAuto.includes("await this.refreshViews({ preserveScroll: true })"));
const mobileDrain = source.slice(source.indexOf("  async runMobileResumeInboundDrain("), source.indexOf("  async kickBridgeMobileResumePull("));
assert(mobileDrain.includes("uiRefreshSession: uiRefreshHandle.session"));
assert(mobileDrain.includes("finalizeBridgeInboundUiRefreshSession"));
console.log("UI-REFRESH-11 inbound/mobile call-path coalescing: PASS");

const patchMethod = source.slice(source.indexOf("  async patchTaskchuteViewsFromExternalSync("), source.indexOf("  async toggleSummaryPanel("));
assert(patchMethod.includes("bridgeInboundFinalRefresh"));
assert(patchMethod.includes("bridgeInboundRefreshBypass"));
assert(patchMethod.includes("intermediate_view_patch_request"));
const finalizer = source.slice(source.indexOf("  async finalizeBridgeInboundUiRefreshSession("), source.indexOf("  isEditingInsideTaskchuteView("));
assert(finalizer.includes("ui_refresh_error"));
assert(finalizer.includes("bridgeInboundFinalRefresh: true"));
console.log("UI-REFRESH-12 intermediate suppression and UI failure isolation: PASS");

const externalFlush = source.slice(source.indexOf("  async flushExternalRefresh("), source.indexOf("  debugKeyLog("));
assert.strictEqual((externalFlush.match(/await this\.patchTaskchuteViewsFromExternalSync/g) || []).length, 1);
assert(!externalFlush.includes("markTaskchuteViewsRendered"));
assert(source.includes("renderedGeneration: renderedGenerationAtRead"));
assert(externalFlush.includes("!mobileHidden"));
console.log("UI-REFRESH-13 external catch-up one final render: PASS");

assert(source.includes("async reloadTaskchuteSyncDataFromDisk(options = {})"));
assert(source.includes("const force = !!(options && options.force)"));
assert(source.includes("bridgeInboundRefreshBypass: force"));
assert(source.includes('patchViews: false, showStatus: false'));
assert(source.includes('renderReason: "taskboard-open-initial"'));
console.log("UI-REFRESH-14 local/open/manual paths retained: PASS");

console.log("Bridge inbound / idle resume UI refresh coalescing v0.6.72: PASS");
