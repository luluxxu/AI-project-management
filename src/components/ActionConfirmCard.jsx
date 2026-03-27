import { useState } from "react";

export default function ActionConfirmCard({ action, store, onConfirm, onDismiss }) {
  const [done, setDone] = useState(false);

  if (!action) return null;

  const handleConfirm = () => {
    if (action.type === "CREATE_TASK") {
      const { title, priority, effort, description, projectId } = action.payload;
      store.importDraftTasks(
        [{ title, priority: priority || "Medium", effort: effort || 3, description: description || "" }],
        projectId || store.scopedProjects[0]?.id || ""
      );
    } else if (action.type === "UPDATE_TASK_STATUS") {
      const { taskId, newStatus } = action.payload;
      store.updateTask(taskId, { status: newStatus });
    }
    setDone(true);
    onConfirm?.();
  };

  const label =
    action.type === "CREATE_TASK"
      ? `创建任务：「${action.payload?.title}」`
      : action.type === "UPDATE_TASK_STATUS"
      ? `更新「${action.payload?.title}」状态 → ${action.payload?.newStatus}`
      : "执行操作";

  return (
    <div className="action-card">
      <span className="action-card-label">{label}</span>
      {done ? (
        <span className="action-card-done">已完成</span>
      ) : (
        <div className="action-card-buttons">
          <button className="primary-btn action-btn" onClick={handleConfirm}>
            确认
          </button>
          <button className="secondary-btn action-btn" onClick={onDismiss}>
            忽略
          </button>
        </div>
      )}
    </div>
  );
}
