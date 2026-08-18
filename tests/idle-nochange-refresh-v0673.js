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
  "markTaskchuteUiRefreshSessionDirty",
  "decideTaskchuteUiRefreshSessionFinalization",
  "decideTaskchuteIdleResumeRefresh",
  "normalizeTaskchuteInvalidationSource",
  "decideTaskchuteExternalInvalidation",
  "decideTaskchuteDelayedRefresh"
];
const helpers = new Function(`
  const nowIso = () => "2026-08-18T00:00:00.000Z";
  ${names.map(extractFunction).join("\n")}
  return { ${names.join(",")} };
`)();

for (const idleDurationMs of [5 * 60 * 1000, 31 * 60 * 1000]) {
  assert.deepStrictEqual(
    helpers.decideTaskchuteIdleResumeRefresh({ reason: "taskboard-interaction", idleDurationMs, relevantInvalidationDetected: false }),
    { refresh: false, reason: "idle_interaction_no_invalidation" }
  );
}
console.log("IDLE-NOCHANGE-01 first interaction after 5/30+ minutes: PASS");

for (let cycle = 0; cycle < 5; cycle++) {
  assert.strictEqual(helpers.decideTaskchuteIdleResumeRefresh({ reason: "window-focus", relevantInvalidationDetected: false }).refresh, false);
  assert.strictEqual(helpers.decideTaskchuteIdleResumeRefresh({ reason: "visibility-return", relevantInvalidationDetected: false }).refresh, false);
}
console.log("IDLE-NOCHANGE-02 repeated focus/visibility cycles: PASS");

for (const reason of ["plugin-data", "modify:plugin-data", "deferred-external-change"]) {
  const decision = helpers.decideTaskchuteExternalInvalidation(reason);
  assert.strictEqual(decision.markDirty, false, reason);
}
assert.strictEqual(helpers.decideTaskchuteExternalInvalidation("plugin-data").compareVisiblePluginData, true);
console.log("IDLE-NOCHANGE-03 internal/nonvisual data writes do not dirty generation: PASS");

const bootstrapGeneration = 4;
const bootstrapRenderedGeneration = 4;
assert.deepStrictEqual(
  helpers.decideTaskchuteDelayedRefresh({ dataGeneration: bootstrapGeneration, renderedGeneration: bootstrapRenderedGeneration }),
  { refresh: false, reason: "stale_timer_no_invalidation" }
);
console.log("IDLE-NOCHANGE-04 bootstrap/current generation and stale timer no-op: PASS");

const external = helpers.decideTaskchuteExternalInvalidation("modify:Taskchute/2026-08-18 Taskchute.md");
assert.deepStrictEqual(external, {
  markDirty: true,
  compareVisiblePluginData: false,
  source: "external_taskchute_markdown_change"
});
assert.strictEqual(helpers.decideTaskchuteDelayedRefresh({ dataGeneration: 5, renderedGeneration: 4 }).refresh, true);
console.log("IDLE-NOCHANGE-05 genuine external Markdown invalidation refreshes: PASS");

const vaultChangeBody = source.slice(source.indexOf("  handleVaultExternalChange("), source.indexOf("  isRoutineHistoryPath("));
assert(vaultChangeBody.includes("const relevantPath = paths.find(p => this.isTaskchuteRelatedPath(p))"));
assert(vaultChangeBody.includes("if (!relevantPath) return"));
console.log("IDLE-NOCHANGE-05B irrelevant Vault note change is ignored: PASS");

const bridgeSession = helpers.createTaskchuteUiRefreshSessionState({ id: "bridge", reason: "resume" });
helpers.markTaskchuteUiRefreshSessionDirty(bridgeSession, { visibleMutationCount: 3 });
assert.strictEqual(bridgeSession.visibleMutationCount, 3);
assert.strictEqual(helpers.decideTaskchuteUiRefreshSessionFinalization(bridgeSession, { viewOpen: true, hidden: false }).execute, true);
console.log("IDLE-NOCHANGE-06 Bridge mutations remain one final refresh: PASS");

const queueBody = source.slice(source.indexOf("  queueExternalRefresh("), source.indexOf("  collectOpenTaskchuteBoardPaths("));
assert(queueBody.includes("decideTaskchuteExternalInvalidation"));
assert(!/^\s*this\.markTaskchuteDataInvalidated\(reason\);/m.test(queueBody));
const flushBody = source.slice(source.indexOf("  async flushExternalRefresh("), source.indexOf("  debugKeyLog("));
assert(flushBody.includes("visiblePluginDataBefore"));
assert(flushBody.includes("pluginDataVisibleChanged"));
assert(flushBody.includes("refreshDecision.refresh"));
assert(flushBody.includes("internal_nonvisual_write_ignored"));
console.log("IDLE-NOCHANGE-07 plugin-data comparison and execution-time recheck: PASS");

const reloadBody = source.slice(source.indexOf("  async reloadTaskchuteSyncDataFromDisk("), source.indexOf("  async getAdapterPathSignature("));
assert(reloadBody.includes("taskchute_delayed_refresh_noop"));
assert(reloadBody.includes("stale_timer_no_invalidation") || reloadBody.includes("decideTaskchuteDelayedRefresh"));
assert(reloadBody.includes("bridgeInboundRefreshBypass: force"));
console.log("IDLE-NOCHANGE-08 stale timer no-op and explicit manual reload retained: PASS");

const onOpenBody = source.slice(source.indexOf("  async onOpen()", source.indexOf("class TaskchuteView")), source.indexOf("  isInteractiveTarget(", source.indexOf("class TaskchuteView")));
assert(onOpenBody.includes('markTaskchuteViewsRendered("bootstrap_render_mark_current")'));
assert(source.includes("lastRenderedTaskchuteVisiblePluginDataSignature"));
console.log("IDLE-NOCHANGE-09 successful open marks rendered generation current: PASS");

for (const field of [
  "data_generation",
  "rendered_generation",
  "generation_after_render",
  "last_invalidation_source",
  "pending_external_refresh",
  "bridge_dirty",
  "refresh_decision"
]) assert(source.includes(field), `missing diagnostic ${field}`);
console.log("IDLE-NOCHANGE-10 bounded generation/source diagnostics: PASS");

assert(source.includes('markTaskchuteDataInvalidated(visibleMutationCount > 0 ? "bridge_visible_mutation"'));
assert(source.includes("external_taskchute_markdown_change"));
assert(source.includes("external_definition_change"));
console.log("IDLE-NOCHANGE-11 explicit mutation sources and local behavior retained: PASS");

console.log("First idle no-change reload v0.6.73 focused regression: PASS");
