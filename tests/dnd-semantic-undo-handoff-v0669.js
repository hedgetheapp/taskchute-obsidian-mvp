const assert = require("assert");
const Module = require("module");

const originalLoad = Module._load;
class Dummy {}
class TFile {
  constructor(path) { this.path = path; }
}
const notices = [];
const obsidianStub = new Proxy({
  Plugin: class {},
  ItemView: Dummy,
  Modal: Dummy,
  PluginSettingTab: Dummy,
  TFile,
  Notice: class { constructor(message) { notices.push(String(message || "")); } },
  Platform: {},
  getIconIds: () => []
}, {
  get(target, key) { return key in target ? target[key] : Dummy; }
});
Module._load = function load(request) {
  if (request === "obsidian") return obsidianStub;
  return originalLoad.apply(this, arguments);
};

global.window = {
  setTimeout: () => 1,
  clearTimeout: () => {},
  requestAnimationFrame: callback => callback()
};
global.Node = { TEXT_NODE: 3 };
global.HTMLElement = class {};
global.document = {
  activeElement: null,
  body: {},
  documentElement: {}
};

const TaskchutePlugin = require("../main.js");
Module._load = originalLoad;

const DATE = "2026-08-16";
const BOARD = `Taskchute/${DATE} Taskchute.md`;

function row(taskId, entryId, title, section, sectionId) {
  return `- [ ] [[${taskId}_${title}|${title}]] <!-- tc:task_id=${taskId} entry_id=${entryId} section=${section} section_id=${sectionId} -->`;
}

function createMarkdown(options = {}) {
  const sourceEntryId = options.sourceEntryId || "E-MOVE";
  const sourceTaskId = options.sourceTaskId || "T-0691";
  const sameSection = options.sameSection === true;
  if (sameSection) {
    return [
      "## Tasks",
      "### 午前",
      row("T-0692", "E-A", "A", "午前", "morning"),
      row(sourceTaskId, sourceEntryId, "Move", "午前", "morning"),
      row("T-0693", "E-B", "B", "午前", "morning"),
      "### 午後",
      "",
      "## Log"
    ].join("\n");
  }
  return [
    "## Tasks",
    "### 午前",
    row("T-0692", "E-A", "A", "午前", "morning"),
    "### 午後",
    row(sourceTaskId, sourceEntryId, "Move", "午後", "afternoon"),
    row("T-0694", "E-Z", "Z", "午後", "afternoon"),
    "",
    "## Log"
  ].join("\n");
}

function createPlugin(options = {}) {
  const files = new Map([[BOARD, createMarkdown(options)]]);
  const adapter = {
    exists: async path => files.has(path),
    read: async path => files.get(path) || "",
    write: async (path, text) => { files.set(path, String(text)); },
    mkdir: async () => {},
    list: async () => ({ files: [], folders: [] }),
    stat: async path => files.has(path) ? { size: files.get(path).length, mtime: Date.now() } : null
  };
  const plugin = Object.create(TaskchutePlugin.prototype);
  plugin.settings = {
    taskchuteFolder: "Taskchute",
    tasksFolder: "Taskchute/Tasks",
    calendarsFolder: "Taskchute/Calendars",
    sections: [
      { id: "morning", name: "午前", order: 10 },
      { id: "afternoon", name: "午後", order: 20 }
    ],
    bridgeTaskDragMoveDiagnostics: [],
    taskchuteUndoRoutingDiagnostics: [],
    bridgeLastTaskMovedEventId: "",
    boardHistoryEnabled: false,
    timeSortEnabled: false
  };
  plugin.runtime = { selectedTaskId: "", multiSelectedTaskIds: [], running: null, paused: [] };
  plugin.undoStack = [];
  plugin.redoStack = [];
  plugin.undoStackLimit = 20;
  plugin.pendingTaskchuteUndoBatch = null;
  plugin.pendingTaskchuteUndoTimer = null;
  plugin.taskMovedUndoCaptureInProgress = false;
  plugin.activeTaskMovedUndoOperation = null;
  plugin.lastCommittedTaskMovedUndoGuard = null;
  plugin.isRestoringTaskchuteUndo = false;
  plugin.app = {
    vault: {
      adapter,
      getAbstractFileByPath: () => null,
      create: async (path, text) => { files.set(path, String(text)); }
    },
    workspace: { getLeavesOfType: () => [] }
  };
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
  plugin.applyLoadedData = data => {
    plugin.settings = data;
    if (data && data.runtime) plugin.runtime = data.runtime;
  };
  plugin.updatePluginDataStatBaseline = async () => true;
  plugin.isTaskchuteWriteAborted = value => value === false;
  plugin.getTaskchutePath = () => BOARD;
  plugin.getActiveViewDate = () => DATE;
  plugin.getTaskFromViewByKey = key => {
    const taskId = key === (options.sourceEntryId || "E-MOVE") ? (options.sourceTaskId || "T-0691") : (key === "E-A" ? "T-0692" : "T-0693");
    return { taskId, entryId: key, taskKey: key, file: `${taskId}_fixture`, title: taskId, checked: false };
  };
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
  plugin.enqueued = [];
  plugin.enqueueBridgeTaskMoved = async (task, movement) => {
    plugin.settings.bridgeLastTaskMovedEventId = `EVENT-${plugin.enqueued.length + 1}`;
    plugin.enqueued.push({ task: JSON.parse(JSON.stringify(task || {})), movement: JSON.parse(JSON.stringify(movement || {})) });
    return true;
  };
  plugin.files = files;
  return plugin;
}

async function runCrossSectionLifecycle() {
  const plugin = createPlugin();
  const before = plugin.files.get(BOARD);
  const moved = await plugin.moveTaskByDrag("E-MOVE", "E-A", "before", { selectedDate: DATE });
  assert.strictEqual(moved, true, "actual cross-section moveTaskByDrag must succeed");
  assert.strictEqual(plugin.activeTaskMovedUndoOperation, null);
  assert.strictEqual(plugin.pendingTaskchuteUndoBatch, null);
  const action = plugin.undoStack[plugin.undoStack.length - 1];
  assert(action && action.bridgeTaskMovedSemantic, "D&D top action must carry semantic");
  assert.strictEqual(action.bridgeTaskMovedSemantic.kind, "task-moved-v4");
  assert.strictEqual(action.bridgeTaskMovedSemantic.task_id, "T-0691");
  assert.strictEqual(action.bridgeTaskMovedSemantic.entry_id, "E-MOVE");
  assert.strictEqual(action.bridgeTaskMovedSemantic.before.section_id, "afternoon");
  assert.strictEqual(action.bridgeTaskMovedSemantic.after.section_id, "morning");
  assert.deepStrictEqual(
    plugin.settings.bridgeTaskDragMoveDiagnostics.filter(item => item.phase && item.phase.startsWith("taskmoved_undo_")).map(item => item.phase),
    [
      "taskmoved_undo_batch_created",
      "taskmoved_undo_file_capture_started",
      "taskmoved_undo_file_captured",
      "taskmoved_undo_semantic_built",
      "taskmoved_undo_semantic_attached",
      "taskmoved_undo_batch_committed_with_semantic"
    ]
  );
  assert.strictEqual(plugin.enqueued.length, 1, "forward TaskMoved exactly once");

  let prevented = 0;
  const undoEvent = { key: "z", ctrlKey: true, metaKey: false, altKey: false, shiftKey: false, target: null, preventDefault: () => { prevented += 1; }, stopPropagation: () => {} };
  const undoRoute = await plugin.handleTaskchuteUndoRedoShortcut(undoEvent);
  assert.strictEqual(undoRoute.handled, true);
  assert.strictEqual(undoRoute.result, true);
  assert.strictEqual(prevented, 1, "gateway owns Ctrl+Z exactly once");
  assert.strictEqual(plugin.enqueued.length, 2, "inverse TaskMoved exactly once");
  assert.strictEqual(plugin.enqueued[1].movement.payloadSource, "task-undo-confirmed-markdown-v4");
  assert.strictEqual(plugin.enqueued[1].movement.from.section, "morning");
  assert.strictEqual(plugin.enqueued[1].movement.to.section, "afternoon");
  assert.strictEqual(plugin.files.get(BOARD), before, "Undo restores exact pre-D&D Markdown");
  assert(
    plugin.settings.bridgeTaskDragMoveDiagnostics.some(item => item.phase === "taskmoved_undo_batch_committed_with_semantic"),
    "TaskMoved Undo lifecycle diagnostics must survive plugin-data snapshot restore"
  );

  const redoEvent = { key: "y", ctrlKey: true, metaKey: false, altKey: false, shiftKey: false, target: null, preventDefault: () => {}, stopPropagation: () => {} };
  const redoRoute = await plugin.handleTaskchuteUndoRedoShortcut(redoEvent);
  assert.strictEqual(redoRoute.handled, true);
  assert.strictEqual(redoRoute.result, true);
  assert.strictEqual(plugin.enqueued.length, 3, "Redo TaskMoved exactly once");
  assert.strictEqual(plugin.enqueued[2].movement.payloadSource, "task-redo-confirmed-markdown-v4");
  assert.strictEqual(plugin.enqueued[2].movement.from.section, "afternoon");
  assert.strictEqual(plugin.enqueued[2].movement.to.section, "morning");

  const duplicate = { type: "taskchute-snapshot", files: [{ path: BOARD, existed: true, content: before }] };
  assert.strictEqual(plugin.pushTaskchuteUndoAction(duplicate), false, "same pre-move generic duplicate must be rejected");
  return plugin;
}

async function runSameSectionAndMultiEntry() {
  const plugin = createPlugin({ sameSection: true, sourceTaskId: "T-0695", sourceEntryId: "E-2" });
  const moved = await plugin.moveTaskByDrag("E-2", "E-A", "before", { selectedDate: DATE });
  assert.strictEqual(moved, true);
  const action = plugin.undoStack[plugin.undoStack.length - 1];
  assert.strictEqual(action.bridgeTaskMovedSemantic.task_id, "T-0695");
  assert.strictEqual(action.bridgeTaskMovedSemantic.entry_id, "E-2");
  assert.strictEqual(action.bridgeTaskMovedSemantic.before.section_id, "morning");
  assert.strictEqual(action.bridgeTaskMovedSemantic.after.section_id, "morning");
  assert.deepStrictEqual(Array.from(action.bridgeTaskMovedSemantic.after.entry_order_ids), ["E-2", "E-A", "E-B"]);
}

async function runFailureSafety(mode) {
  const plugin = createPlugin();
  const before = plugin.files.get(BOARD);
  plugin.undoStack.push({ type: "taskchute-snapshot", label: "直前の操作", files: [{ path: BOARD, existed: true, content: before }] });
  if (mode === "capture") plugin.captureTaskchuteUndoFileBefore = async () => {};
  if (mode === "attach") plugin.attachBridgeTaskMovedSemanticToPendingUndoBatch = () => ({ ok: false, reason: "forced_attach_failure" });
  if (mode === "fingerprint") {
    const attach = plugin.attachBridgeTaskMovedSemanticToPendingUndoBatch.bind(plugin);
    plugin.attachBridgeTaskMovedSemanticToPendingUndoBatch = (semantic, operationId) => {
      const result = attach(semantic, operationId);
      plugin.pendingTaskchuteUndoBatch.taskMovedUndoSemanticFingerprint = "forced-fingerprint-mismatch";
      return result;
    };
  }
  if (mode === "commit") plugin.commitPendingTaskchuteUndoBatch = () => false;
  const result = await plugin.moveTaskByDrag("E-MOVE", "E-A", "before", { selectedDate: DATE });
  assert.strictEqual(result, false, `${mode} failure must not report normal Undoable success`);
  assert.strictEqual(plugin.enqueued.length, 1, "forward move remains exactly one synchronized event");
  assert.strictEqual(
    plugin.undoStack.some(action => action.type === "taskchute-snapshot" && !action.bridgeTaskMovedSemantic && action.files.some(file => file.content === before)),
    true,
    "history that predates the D&D operation must remain preserved below the barrier"
  );
  const barrier = plugin.undoStack[plugin.undoStack.length - 1];
  assert.strictEqual(barrier.type, "task-moved-undo-blocked");
  const boardAfterFailure = plugin.files.get(BOARD);
  assert.strictEqual(await plugin.undoLastTaskchuteAction(), false, "barrier must block local-only Undo");
  assert.strictEqual(plugin.files.get(BOARD), boardAfterFailure, "barrier must not restore old Markdown");
}

(async () => {
  await runCrossSectionLifecycle();
  await runSameSectionAndMultiEntry();
  await runFailureSafety("capture");
  await runFailureSafety("attach");
  await runFailureSafety("fingerprint");
  await runFailureSafety("commit");
  console.log("DND-SEMANTIC-HANDOFF-01 actual cross-section history lifecycle: PASS");
  console.log("DND-SEMANTIC-HANDOFF-02 real gateway Undo/Redo inverse events: PASS");
  console.log("DND-SEMANTIC-HANDOFF-03 same-section exact entry identity: PASS");
  console.log("DND-SEMANTIC-HANDOFF-04 capture/attach/fingerprint/commit failure barrier: PASS");
  console.log("DND-SEMANTIC-HANDOFF-05 generic duplicate rejection: PASS");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
