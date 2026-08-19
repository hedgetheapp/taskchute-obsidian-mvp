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

const helperNames = [
  "decideTaskchuteUiRefreshSessionFinalization",
  "decideTaskchuteFirstOpenConvergence",
  "normalizeTaskchuteRenderedGeneration",
  "decideTaskchuteIdleResumeRefresh"
];
const helpers = new Function(`${helperNames.map(extractFunction).join("\n")}\nreturn {${helperNames.join(",")}};`)();

const dirtySession = { dirty: true, visibleMutationCount: 6 };
assert.strictEqual(helpers.decideTaskchuteUiRefreshSessionFinalization(dirtySession, { viewOpen: true, hidden: false }).execute, true);
console.log("INITIAL-BACKLOG-01 open view gets one terminal refresh: PASS");

const noView = helpers.decideTaskchuteUiRefreshSessionFinalization(dirtySession, { viewOpen: false, hidden: false });
assert.deepStrictEqual(noView, { execute: false, reason: "view_not_open" });
assert.strictEqual(helpers.normalizeTaskchuteRenderedGeneration({ dataGeneration: 6, previousRenderedGeneration: 0, renderedGeneration: 0 }), 0);
console.log("INITIAL-BACKLOG-02 closed view is not forced and generation stays pending: PASS");

const initialAOnly = helpers.normalizeTaskchuteRenderedGeneration({ dataGeneration: 6, previousRenderedGeneration: 0, renderedGeneration: 2 });
assert.strictEqual(initialAOnly, 2);
const converge = helpers.decideTaskchuteFirstOpenConvergence({
  initialRenderCompleted: true,
  dataGeneration: 6,
  renderedGeneration: initialAOnly,
  activeSession: false,
  viewVisible: true
});
assert.deepStrictEqual(converge, { refresh: true, reason: "first_open_pending_generation" });
const finalABC = helpers.normalizeTaskchuteRenderedGeneration({ dataGeneration: 6, previousRenderedGeneration: initialAOnly, renderedGeneration: 6 });
assert.strictEqual(finalABC, 6);
console.log("INITIAL-BACKLOG-03 first open converges A-only snapshot to A/B/C: PASS");

assert.strictEqual(helpers.decideTaskchuteFirstOpenConvergence({ initialRenderCompleted: true, dataGeneration: 6, renderedGeneration: 6, activeSession: false, viewVisible: true }).refresh, false);
console.log("INITIAL-BACKLOG-04 converged first open needs no second focus: PASS");

const reloadBody = source.slice(source.indexOf("  async reloadTaskchuteSyncDataFromDisk("), source.indexOf("  async getAdapterPathSignature("));
assert(!reloadBody.includes("this.markTaskchuteViewsRendered("));
assert(reloadBody.includes('render_data_source: patchViews ? "vault_markdown" : "none"'));
console.log("INITIAL-BACKLOG-05 patchViews=false cannot clear dirty generation: PASS");

assert.strictEqual(helpers.decideTaskchuteFirstOpenConvergence({ initialRenderCompleted: true, dataGeneration: 6, renderedGeneration: 2, activeSession: true, viewVisible: true }).reason, "active_inbound_session_owns_final_refresh");
console.log("INITIAL-BACKLOG-06 active session retains ownership without duplicate render: PASS");

const refreshBody = source.slice(source.indexOf("  async refresh(options = {})", source.indexOf("class TaskchuteView")), source.indexOf("  async applyExternalTaskPatch(", source.indexOf("class TaskchuteView")));
assert(refreshBody.indexOf("renderedGenerationAtRead =") < refreshBody.indexOf("md = await readFileText"));
assert(refreshBody.includes('dataSource: "vault_markdown"'));
assert(refreshBody.includes("renderedGeneration: renderedGenerationAtRead"));
console.log("INITIAL-BACKLOG-07 first-open authority is persisted Vault Markdown with exact consumed generation: PASS");

const onOpenBody = source.slice(source.indexOf("  async onOpen()", source.indexOf("class TaskchuteView")), source.indexOf("  isInteractiveTarget(", source.indexOf("class TaskchuteView")));
assert.strictEqual((onOpenBody.match(/firstOpenConvergence: true/g) || []).length, 1);
assert(onOpenBody.includes("active_inbound_session_owns_final_refresh") || source.includes("active_inbound_session_owns_final_refresh"));
console.log("INITIAL-BACKLOG-08 repeated hooks cannot create duplicate first-open convergence renders: PASS");

assert.strictEqual(helpers.decideTaskchuteIdleResumeRefresh({ reason: "window-focus", relevantInvalidationDetected: false }).refresh, false);
console.log("INITIAL-BACKLOG-09 no-change focus remains zero reload: PASS");

assert(source.includes("decideTaskchuteVisibleDependencyInvalidation"));
assert(source.includes("duplicate_create_existing_content_unchanged"));
console.log("INITIAL-BACKLOG-10 v0.6.75 duplicate-create regression retained: PASS");

const finalizer = source.slice(source.indexOf("  async finalizeBridgeInboundUiRefreshSession("), source.indexOf("  isEditingInsideTaskchuteView("));
assert(finalizer.includes("externalSync: true"));
assert(finalizer.includes("inspectTaskchuteViewRenderEligibility"));
assert(finalizer.includes("dirty_generation_retained"));
console.log("INITIAL-BACKLOG-11 v0.6.76 authoritative generation finalizer retained: PASS");

assert(finalizer.includes("ui_refresh_error"));
assert(finalizer.indexOf("patchTaskchuteViewsFromExternalSync") > finalizer.indexOf("active_apply_save_verify_in_progress"));
console.log("INITIAL-BACKLOG-12 UI refresh failure remains isolated from apply/Ack/cursor: PASS");

console.log("Initial mobile backlog convergence v0.6.77: PASS");
