const assert = require("assert");
const Module = require("module");

const originalLoad = Module._load;
class Dummy {}
class TFile { constructor(path) { this.path = path; } }
const obsidianStub = new Proxy({
  Plugin: class {}, ItemView: Dummy, Modal: Dummy, PluginSettingTab: Dummy, TFile,
  Notice: class {}, Platform: {}, getIconIds: () => []
}, { get(target, key) { return key in target ? target[key] : Dummy; } });
Module._load = function load(request) {
  if (request === "obsidian") return obsidianStub;
  return originalLoad.apply(this, arguments);
};
global.window = { setTimeout: () => 1, clearTimeout: () => {}, requestAnimationFrame: callback => callback() };
global.Node = { TEXT_NODE: 3 };
global.HTMLElement = class {};
global.document = { activeElement: null, body: {}, documentElement: {} };

const TaskchutePlugin = require("../main.js");
const TaskchuteView = TaskchutePlugin.TaskchuteView;
Module._load = originalLoad;

const DATE = "2026-08-16";
const BOARD = `Taskchute/${DATE} Taskchute.md`;
const SOURCE_ENTRY = "E-20260816-0028";
const SOURCE_TASK = "T-0701";

function row(taskId, entryId, title, section, sectionId) {
  return `- [ ] [[${taskId}_${title}|${title}]] <!-- tc:task_id=${taskId} entry_id=${entryId} section=${section} section_id=${sectionId} -->`;
}

function markdown() {
  return [
    "## Tasks",
    "### 午前",
    row("T-0702", "E-TARGET", "Target", "午前", "morning"),
    "### 午後",
    row(SOURCE_TASK, SOURCE_ENTRY, "Move", "午後", "afternoon"),
    "",
    "## Log"
  ].join("\n");
}

function createPlugin(options = {}) {
  const files = new Map([[BOARD, markdown()]]);
  const adapter = {
    exists: async path => files.has(path),
    read: async path => files.get(path) || "",
    write: async (path, text) => { files.set(path, String(text)); },
    mkdir: async () => {}, list: async () => ({ files: [], folders: [] }),
    stat: async path => files.has(path) ? { size: files.get(path).length, mtime: Date.now() } : null
  };
  const plugin = Object.create(TaskchutePlugin.prototype);
  plugin.settings = {
    taskchuteFolder: "Taskchute", tasksFolder: "Taskchute/Tasks", calendarsFolder: "Taskchute/Calendars",
    sections: [{ id: "morning", name: "午前", order: 10 }, { id: "afternoon", name: "午後", order: 20 }],
    bridgeTaskDragMoveDiagnostics: [], taskchuteUndoRoutingDiagnostics: [], bridgeLastTaskMovedEventId: "",
    boardHistoryEnabled: false, timeSortEnabled: false
  };
  plugin.runtime = { selectedTaskId: SOURCE_ENTRY, multiSelectedTaskIds: [], running: null, paused: [] };
  plugin.undoStack = [];
  plugin.redoStack = [];
  plugin.undoStackLimit = 20;
  plugin.pendingTaskchuteUndoBatch = null;
  plugin.pendingTaskchuteUndoTimer = null;
  plugin.taskMovedUndoCaptureInProgress = false;
  plugin.activeTaskMovedUndoOperation = null;
  plugin.lastCommittedTaskMovedUndoGuard = null;
  plugin.isRestoringTaskchuteUndo = false;
  plugin.app = { vault: { adapter, getAbstractFileByPath: () => null, create: async (path, text) => files.set(path, String(text)) }, workspace: { getLeavesOfType: () => [] } };
  plugin.blockIfTaskchuteSyncBusy = () => false;
  plugin.ensureDeviceWriteGuard = async () => true;
  plugin.saveDeviceWriterMeta = async () => true;
  plugin.savePluginData = async () => true;
  plugin.saveData = async () => true;
  plugin.pluginDataSaveQueue = Promise.resolve();
  plugin.normalizeTaskchuteDeviceSyncMeta = value => value;
  plugin.getOrCreateTaskchuteDeviceId = () => "dev";
  plugin.getTaskchuteDeviceLabel = () => "dev";
  plugin.clearWakeSyncGuard = () => {};
  plugin.applyLoadedData = data => { plugin.settings = data; if (data && data.runtime) plugin.runtime = data.runtime; };
  plugin.updatePluginDataStatBaseline = async () => true;
  plugin.isTaskchuteWriteAborted = value => value === false;
  plugin.getTaskchutePath = () => BOARD;
  plugin.getActiveViewDate = () => DATE;
  plugin.getTaskFromViewByKey = key => key === SOURCE_ENTRY
    ? { taskId: SOURCE_TASK, entryId: SOURCE_ENTRY, taskKey: SOURCE_ENTRY, file: `${SOURCE_TASK}_Move`, title: "Move", section: "午後", sectionId: "afternoon", checked: false }
    : { taskId: "T-0702", entryId: "E-TARGET", taskKey: "E-TARGET", file: "T-0702_Target", title: "Target", section: "午前", sectionId: "morning", checked: false };
  plugin.ensureSectionExpandedForIncomingTask = () => {};
  plugin.updateTaskSectionMetadata = async () => true;
  plugin.patchTaskchuteViewsFromExternalSync = async () => true;
  plugin.updateSelectionInViews = () => {};
  plugin.isTimeSortEnabled = () => false;
  plugin.sessionMatchesKey = () => false;
  plugin.refreshViews = async () => true;
  plugin.releaseBoardFocus = () => {};
  plugin.selectTask = key => { plugin.runtime.selectedTaskId = key || ""; };
  plugin.getActiveTaskchuteView = () => ({ containerEl: { contains: () => true }, getViewType: () => "taskchute-board-view" });
  plugin.debugKeyLog = () => {};
  plugin.moveTaskRowToSectionInViews = async () => true;
  plugin.enqueued = [];
  plugin.enqueueBridgeTaskMoved = async (task, movement) => {
    plugin.settings.bridgeLastTaskMovedEventId = `EVENT-${plugin.enqueued.length + 1}`;
    plugin.enqueued.push({ task: JSON.parse(JSON.stringify(task || {})), movement: JSON.parse(JSON.stringify(movement || {})) });
    return true;
  };
  if (options.commitFailure) plugin.commitPendingTaskchuteUndoBatch = () => false;
  plugin.files = files;
  return plugin;
}

function createView(plugin, resolved) {
  const view = Object.create(TaskchuteView.prototype);
  view.plugin = plugin;
  view.selectedDate = DATE;
  view.draggingTaskKey = SOURCE_ENTRY;
  view.containerEl = { querySelector: () => null };
  view.stopTaskDragAutoScroll = () => {};
  view.clearTaskDropClasses = () => {};
  view.clearSectionDropClasses = () => {};
  view.resolveTaskBoardDropTarget = () => resolved;
  view.getDraggedTaskKey = () => SOURCE_ENTRY;
  view.getMovingTaskKeysForDrag = () => new Set([SOURCE_ENTRY]);
  return view;
}

function dropEvent() {
  return { preventDefault: () => {}, stopPropagation: () => {}, dataTransfer: { getData: () => SOURCE_ENTRY } };
}

function assertSemanticResult(plugin, expectedAfterSection) {
  assert.strictEqual(plugin.enqueued.length, 1, "one UI drop must enqueue exactly one forward TaskMoved");
  assert.strictEqual(plugin.activeTaskMovedUndoOperation, null);
  assert.strictEqual(plugin.pendingTaskchuteUndoBatch, null);
  const action = plugin.undoStack[plugin.undoStack.length - 1];
  assert(action && action.bridgeTaskMovedSemantic, "actual UI route must commit semantic Undo history");
  assert.strictEqual(action.bridgeTaskMovedSemantic.task_id, SOURCE_TASK);
  assert.strictEqual(action.bridgeTaskMovedSemantic.entry_id, SOURCE_ENTRY);
  assert.strictEqual(action.bridgeTaskMovedSemantic.before.section_id, "afternoon");
  assert.strictEqual(action.bridgeTaskMovedSemantic.after.section_id, expectedAfterSection);
  assert(action.taskMovedUndoOperationId);
  assert(action.taskMovedUndoBatchId);
  assert(action.taskMovedUndoSemanticFingerprint);
  assert(plugin.lastCommittedTaskMovedUndoGuard && plugin.lastCommittedTaskMovedUndoGuard.semantic_fingerprint);
  const phases = plugin.settings.bridgeTaskDragMoveDiagnostics.map(item => item.phase);
  assert(phases.includes("taskboard_drop_observed"));
  assert(phases.includes("taskboard_drop_route_resolved"));
  assert(phases.includes("taskboard_drop_lifecycle_dispatch_started"));
  assert(phases.includes("taskboard_drop_lifecycle_dispatch_completed"));
  const completed = plugin.settings.bridgeTaskDragMoveDiagnostics.filter(item => item.phase === "taskboard_drop_lifecycle_dispatch_completed").pop();
  assert.strictEqual(completed.selected_task_id, SOURCE_ENTRY);
  assert.strictEqual(completed.multi_selected_count, 0);
  assert.strictEqual(completed.operation_lifecycle_attempted, true);
  assert.strictEqual(completed.final_route_result, true);
}

async function runSectionTargetRoute() {
  const plugin = createPlugin();
  const view = createView(plugin, { type: "section", sectionIdOrName: "morning", placement: "bottom" });
  const result = await view.dropTaskBoardDrag(dropEvent());
  assert.strictEqual(result, true);
  assertSemanticResult(plugin, "morning");
  const completed = plugin.settings.bridgeTaskDragMoveDiagnostics.filter(item => item.phase === "taskboard_drop_lifecycle_dispatch_completed").pop();
  assert.strictEqual(completed.route_name, "board-resolver-section");
  assert.strictEqual(completed.dispatched_method_name, "moveTaskToSectionByDrag");
}

async function runRowTargetRoute() {
  const plugin = createPlugin();
  const view = createView(plugin, { type: "row", key: "E-TARGET", position: "before" });
  const result = await view.dropTaskBoardDrag(dropEvent());
  assert.strictEqual(result, true);
  assertSemanticResult(plugin, "morning");
  const completed = plugin.settings.bridgeTaskDragMoveDiagnostics.filter(item => item.phase === "taskboard_drop_lifecycle_dispatch_completed").pop();
  assert.strictEqual(completed.route_name, "board-resolver-row");
  assert.strictEqual(completed.dispatched_method_name, "moveTaskByDrag");
}

async function runFailureBarrier() {
  const plugin = createPlugin({ commitFailure: true });
  const oldAction = { type: "taskchute-snapshot", label: "older", files: [{ path: BOARD, existed: true, content: markdown() }] };
  plugin.undoStack.push(oldAction);
  const view = createView(plugin, { type: "section", sectionIdOrName: "morning", placement: "bottom" });
  const result = await view.dropTaskBoardDrag(dropEvent());
  assert.strictEqual(result, false, "semantic commit failure must propagate through actual UI callback");
  assert.strictEqual(plugin.enqueued.length, 1, "forward TaskMoved remains single even when Undo handoff fails");
  assert.strictEqual(plugin.undoStack[0], oldAction, "older history must survive");
  assert.strictEqual(plugin.undoStack[plugin.undoStack.length - 1].type, "task-moved-undo-blocked");
  assert.strictEqual(await plugin.undoLastTaskchuteAction(), false, "barrier blocks unsafe local-only Undo");
}

(async () => {
  await runSectionTargetRoute();
  await runRowTargetRoute();
  await runFailureBarrier();
  console.log("TASKBOARD-DND-ROUTE-01 actual section callback semantic lifecycle: PASS");
  console.log("TASKBOARD-DND-ROUTE-02 actual row callback semantic lifecycle: PASS");
  console.log("TASKBOARD-DND-ROUTE-03 exact entry selection and single enqueue: PASS");
  console.log("TASKBOARD-DND-ROUTE-04 failure barrier through UI callback: PASS");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
