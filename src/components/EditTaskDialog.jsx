import { useEffect, useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { useConfirmDialog } from "../context/ConfirmDialogContext";

const buildForm = (task) => ({
  title: task?.title || "",
  description: task?.description || "",
  status: task?.status || "Todo",
  priority: task?.priority || "Medium",
  assigneeId: task?.assigneeId || "",
  dueDate: task?.dueDate || "",
  effort: task?.effort || 2,
  projectId: task?.projectId || "",
});

export default function EditTaskDialog({ task, isOpen, onClose, store }) {
  const { confirm } = useConfirmDialog();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(buildForm(task));

  useEffect(() => {
    setFormData(buildForm(task));
  }, [task]);

  if (!isOpen || !task) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.title.trim()) return;

    const accepted = await confirm({
      title: "Save task changes?",
      message: `Update "${formData.title}" with the changes you made?`,
      confirmLabel: "Save changes",
    });
    if (!accepted) return;

    setIsSubmitting(true);
    try {
      await store.updateTask(task.id, {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        assigneeId: formData.assigneeId,
        dueDate: formData.dueDate,
        effort: formData.effort,
        projectId: formData.projectId,
      });
      toast.success("Task updated successfully");
      onClose();
    } catch (error) {
      toast.error(error.message || "Failed to update task");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-4">
          <h2 className="m-0 text-xl font-bold text-slate-900">Edit Task</h2>
          <p className="m-0 mt-1 text-sm text-slate-500">
            Update the task details, assignment, and due date.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-1">
            <label className="text-sm font-medium text-slate-700">Title</label>
            <input
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Task title"
              required
            />
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the task"
              className="min-h-24"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <div className="grid gap-1">
              <label className="text-sm font-medium text-slate-700">Project</label>
              <select
                value={formData.projectId}
                onChange={(e) => setFormData((prev) => ({ ...prev, projectId: e.target.value }))}
              >
                {store.scopedProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-1">
              <label className="text-sm font-medium text-slate-700">Assignee</label>
              <select
                value={formData.assigneeId}
                onChange={(e) => setFormData((prev) => ({ ...prev, assigneeId: e.target.value }))}
              >
                <option value="">Unassigned</option>
                {store.scopedMembers.map((member) => (
                  <option key={member.userId || member.id} value={member.userId || member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <div className="grid gap-1">
              <label className="text-sm font-medium text-slate-700">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="Todo">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
              </select>
            </div>

            <div className="grid gap-1">
              <label className="text-sm font-medium text-slate-700">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value }))}
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <div className="grid gap-1">
              <label className="text-sm font-medium text-slate-700">Due Date</label>
              <div className="flex items-center gap-2">
                <CalendarIcon className="size-5 text-slate-400" />
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full"
                />
              </div>
              {formData.dueDate ? (
                <p className="m-0 text-xs text-slate-500">{format(new Date(formData.dueDate), "PPP")}</p>
              ) : null}
            </div>

            <div className="grid gap-1">
              <label className="text-sm font-medium text-slate-700">Effort (hours)</label>
              <input
                type="number"
                min="1"
                max="8"
                value={formData.effort}
                onChange={(e) => setFormData((prev) => ({ ...prev, effort: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700 transition hover:bg-slate-50"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
