import { useState } from "react";

// Shown below an AI chat message when the model suggests a store mutation
// (e.g. "Create task X" or "Mark Y as Done").
// The user must click Confirm before anything is written to the store.
//
// Props:
//   action    — { type, payload } parsed from the AI's <action> block
//   store     — the global store object (needed to call importDraftTasks / updateTask)
//   onConfirm — optional callback fired after the action is applied
//   onDismiss — callback fired when the user clicks Dismiss (parent hides the card)
export default function ActionConfirmCard({ action, store, onConfirm, onDismiss }) {
  // Once confirmed, flip `done` to true to show a "Done" badge instead of buttons.
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Nothing to render if there's no action.
  if (!action) return null;

  const handleConfirm = async () => {
    if (saving) return;
    setSaving(true);
    setError("");

    try {
      if (action.type === "CREATE_TASK") {
        const { title, priority, effort, description, projectId } = action.payload;
        await store.importDraftTasks(
          [{ title, priority: priority || "Medium", effort: effort || 3, description: description || "" }],
          projectId || store.scopedProjects[0]?.id || ""
        );
      } else if (action.type === "UPDATE_TASK_STATUS") {
        const { taskId, newStatus } = action.payload;
        await store.updateTask(taskId, { status: newStatus });
      }

      setDone(true);
      onConfirm?.();
    } catch (e) {
      setError(e.message || "Failed to apply action.");
    } finally {
      setSaving(false);
    }
  };

  // Human-readable summary of what will happen when the user confirms.
  const label =
    action.type === "CREATE_TASK"
      ? `Create task: "${action.payload?.title}"`
      : action.type === "UPDATE_TASK_STATUS"
      ? `Update "${action.payload?.title}" status → ${action.payload?.newStatus}`
      : "Apply action";

  return (
    <div className="action-card">
      <span className="action-card-label">{label}</span>

      {done ? (
        // After confirmation, replace buttons with a static "Done" badge.
        <span className="action-card-done">Done</span>
      ) : (
        <div className="action-card-buttons">
          <button className="primary-btn action-btn" onClick={handleConfirm} disabled={saving}>
            {saving ? "Applying..." : "Confirm"}
          </button>
          {/* Dismiss removes the card without touching the store. */}
          <button className="secondary-btn action-btn" onClick={onDismiss} disabled={saving}>
            Dismiss
          </button>
        </div>
      )}
      {error ? <p className="text-sm text-red-600 mt-2">{error}</p> : null}
    </div>
  );
}
