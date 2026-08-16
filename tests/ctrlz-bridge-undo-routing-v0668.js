const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const source = fs.readFileSync("main.js", "utf8");

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, `missing function: ${name}`);
  const signatureEnd = source.indexOf(") {", start);
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

function extractMethod(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert(start >= 0 && end > start, `missing method range: ${startMarker}`);
  return source.slice(start, end);
}

const context = { console };
vm.createContext(context);
vm.runInContext([
  extractFunction("normalizeTaskchuteUndoRedoShortcut"),
  extractFunction("decideTaskchuteUndoRedoShortcutRoute"),
  extractFunction("routeTaskchuteUndoRedoShortcut"),
  "this.normalizeShortcut = normalizeTaskchuteUndoRedoShortcut;",
  "this.decideRoute = decideTaskchuteUndoRedoShortcutRoute;",
  "this.routeShortcut = routeTaskchuteUndoRedoShortcut;"
].join("\n"), context);

function eventFor(key, options = {}) {
  const calls = { preventDefault: 0, stopPropagation: 0, stopImmediatePropagation: 0 };
  return Object.assign({
    key,
    ctrlKey: true,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    preventDefault() { calls.preventDefault += 1; },
    stopPropagation() { calls.stopPropagation += 1; },
    stopImmediatePropagation() { calls.stopImmediatePropagation += 1; },
    calls
  }, options);
}

function boardContext(overrides = {}) {
  return Object.assign({
    hasTaskchuteView: true,
    targetInTaskchute: true,
    activeElementInTaskchute: true,
    targetNeutral: false,
    textEditing: false,
    externalOverlay: false,
    lifecycleActive: false,
    topActionSemantic: true
  }, overrides);
}

(async () => {
  const undoEvent = eventFor("z");
  let undoCalls = 0;
  let semanticSyncCalls = 0;
  let inverseEnqueueCalls = 0;
  const undoDiagnostics = [];
  const undoResult = await context.routeShortcut(undoEvent, boardContext(), {
    invoke: async operation => {
      assert.strictEqual(operation, "undo");
      undoCalls += 1;
      semanticSyncCalls += 1;
      inverseEnqueueCalls += 1;
      return true;
    },
    diagnostic: entry => undoDiagnostics.push(entry)
  });
  assert.strictEqual(undoResult.handled, true);
  assert.strictEqual(undoResult.invoked, true);
  assert.strictEqual(undoCalls, 1, "TaskChute Ctrl+Z must invoke Undo exactly once");
  assert.strictEqual(semanticSyncCalls, 1, "semantic restore sync must be reached exactly once");
  assert.strictEqual(inverseEnqueueCalls, 1, "one owned Undo must enqueue one inverse TMV4 in the semantic path");
  assert.deepStrictEqual(undoEvent.calls, { preventDefault: 1, stopPropagation: 1, stopImmediatePropagation: 1 });
  assert(undoDiagnostics.some(item => item.routing_decision === "taskchute-owned"));
  assert(undoDiagnostics.some(item => item.inverse_enqueue_attempted === true && item.inverse_enqueue_succeeded === true));

  const duplicateResult = await context.routeShortcut(undoEvent, boardContext(), {
    invoke: async () => { undoCalls += 1; return true; }
  });
  assert.strictEqual(duplicateResult.handled, true);
  assert.strictEqual(duplicateResult.invoked, false);
  assert.strictEqual(undoCalls, 1, "one keyboard event must not execute Undo twice");

  for (const sample of [
    { event: eventFor("y"), expected: "redo" },
    { event: eventFor("z", { shiftKey: true }), expected: "redo" }
  ]) {
    let redoCalls = 0;
    const result = await context.routeShortcut(sample.event, boardContext(), {
      invoke: async operation => { assert.strictEqual(operation, sample.expected); redoCalls += 1; return true; }
    });
    assert.strictEqual(result.handled, true);
    assert.strictEqual(redoCalls, 1);
  }

  for (const textContext of [
    boardContext({ textEditing: true }),
    boardContext({ targetInTaskchute: false, activeElementInTaskchute: false, externalOverlay: true }),
    boardContext({ hasTaskchuteView: false, targetInTaskchute: false, activeElementInTaskchute: false })
  ]) {
    const evt = eventFor("z");
    let calls = 0;
    const result = await context.routeShortcut(evt, textContext, {
      invoke: async () => { calls += 1; return true; }
    });
    assert.strictEqual(result.handled, false);
    assert.strictEqual(calls, 0);
    assert.deepStrictEqual(evt.calls, { preventDefault: 0, stopPropagation: 0, stopImmediatePropagation: 0 });
  }

  const buttonEvent = eventFor("z");
  let buttonUndoCalls = 0;
  const buttonResult = await context.routeShortcut(buttonEvent, boardContext(), {
    invoke: async () => { buttonUndoCalls += 1; return true; }
  });
  assert.strictEqual(buttonResult.handled, true, "non-text TaskBoard controls must remain TaskChute-owned");
  assert.strictEqual(buttonUndoCalls, 1);

  const lifecycleEvent = eventFor("z");
  let lifecycleCalls = 0;
  const lifecycleDiagnostics = [];
  const lifecycleResult = await context.routeShortcut(lifecycleEvent, boardContext({ lifecycleActive: true }), {
    invoke: async () => { lifecycleCalls += 1; return true; },
    diagnostic: entry => lifecycleDiagnostics.push(entry)
  });
  assert.strictEqual(lifecycleResult.handled, true);
  assert.strictEqual(lifecycleResult.invoked, false);
  assert.strictEqual(lifecycleCalls, 0);
  assert.strictEqual(lifecycleEvent.calls.preventDefault, 1, "blocked lifecycle must not fall through to native Undo");
  assert(lifecycleDiagnostics.some(item => item.routing_decision === "blocked-lifecycle"));

  const setupMethod = extractMethod("  setupKeyboardHandlers()", "\n  activateKeyboardScope(");
  assert(setupMethod.includes("handleTaskchuteUndoRedoShortcut(evt)"));
  assert(setupMethod.includes("if (undoRedoShortcut)"), "non-Undo keyboard paths must not await the routing gateway");
  assert(setupMethod.indexOf("handleTaskchuteUndoRedoShortcut(evt)") < setupMethod.indexOf("this.isEditableEventTarget(evt.target)"), "Undo routing must run before the generic editable/button filter");
  assert.strictEqual((setupMethod.match(/undoLastTaskchuteAction\(/g) || []).length, 0, "keyboard handler must use one routing gateway");
  assert.strictEqual((setupMethod.match(/redoLastTaskchuteAction\(/g) || []).length, 0, "keyboard handler must use one routing gateway");
  assert(setupMethod.includes("{ capture: true }"), "keyboard ownership must be decided in capture phase");

  const commandBlock = extractMethod("      this.addCommand({ id: \"open-task-board\"", "\n      this.setupKeyboardHandlers();");
  assert(commandBlock.includes('id: "undo-last-taskchute-action"'));
  assert(commandBlock.includes('id: "redo-last-taskchute-action"'));
  assert(commandBlock.includes('invokeTaskchuteUndoRedo("undo", { source: "command" })'));
  assert(commandBlock.includes('invokeTaskchuteUndoRedo("redo", { source: "command" })'));

  const undoMethod = extractMethod("  async undoLastTaskchuteAction(", "\n  async redoLastTaskchuteAction(");
  assert(undoMethod.includes('syncRestoredTaskMovedUndoRedo(action, "undo")'));
  assert(undoMethod.includes("rollbackTaskMovedUndoRedoAfterBridgeFailure"));

  console.log("UNDO-ROUTING-01 TaskChute Ctrl+Z ownership/exactly-once: PASS");
  console.log("UNDO-ROUTING-02 Ctrl+Y/Ctrl+Shift+Z Redo routing: PASS");
  console.log("UNDO-ROUTING-03 editor/input/modal passthrough: PASS");
  console.log("UNDO-ROUTING-04 lifecycle block consumes shortcut: PASS");
  console.log("UNDO-ROUTING-05 command gateway and semantic inverse path: PASS");
})().catch(error => {
  console.error(error);
  process.exit(1);
});
