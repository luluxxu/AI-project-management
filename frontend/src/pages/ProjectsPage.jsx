import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import SimpleTable from "../components/SimpleTable";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import EditTaskDialog from "../components/EditTaskDialog";
import { PlusIcon, XIcon, ArchiveIcon, ArchiveRestoreIcon, Trash2Icon, PencilIcon, ChevronDownIcon } from "lucide-react";

const emptyProject = {
  name: "",
  description: "",
  status: "Planning",
  priority: "Medium",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
};

const emptyTask = {
  projectId: "",
  title: "",
  description: "",
  status: "Todo",
  priority: "Medium",
  assigneeId: "",
  dueDate: new Date().toISOString().slice(0, 10),
  effort: 2,
};

const priorityBadge = {
  High: "bg-rose-50 text-rose-700 border-rose-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Low: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function ProjectsPage({ store }) {
  const { confirm } = useConfirmDialog();
  const teamName = store.activeWorkspace?.name || "Current team";
  const [projectForm, setProjectForm] = useState(emptyProject);
  const [taskForm, setTaskForm] = useState({ ...emptyTask, projectId: store.scopedProjects[0]?.id || "" });
  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const [editingTask, setEditingTask] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showForm, setShowForm] = useState(null); // null | "project" | "task"

  const filteredTasks = useMemo(() => {
    const source = showArchived ? store.scopedArchivedTasks : store.scopedTasks;
    if (selectedProjectId === "all") return source;
    return source.filter((task) => task.projectId === selectedProjectId);
  }, [selectedProjectId, showArchived, store.scopedArchivedTasks, store.scopedTasks]);

  const handleCreateProject = async () => {
    if (!projectForm.name.trim()) return;
    const accepted = await confirm({
      title: "Create project?",
      message: `This will create "${projectForm.name}" in ${teamName}.`,
      confirmLabel: "Create project",
    });
    if (!accepted) return;
    try {
      await store.addProject(projectForm);
      setProjectForm(emptyProject);
      setShowForm(null);
      toast.success("Project created");
    } catch (error) {
      toast.error(error.message || "Failed to create project");
    }
  };

  const handleCreateTask = async () => {
    if (!taskForm.projectId || !taskForm.title.trim()) return;
    const accepted = await confirm({
      title: "Create task?",
      message: `This will create "${taskForm.title}" in ${teamName}.`,
      confirmLabel: "Create task",
    });
    if (!accepted) return;
    try {
      await store.addTask(taskForm);
      setTaskForm({ ...emptyTask, projectId: taskForm.projectId });
      setShowForm(null);
      toast.success("Task created");
    } catch (error) {
      toast.error(error.message || "Failed to create task");
    }
  };

  const handleProjectStatusChange = async (row, status) => {
    if (row.status === status) return;
    try {
      await store.updateProject(row.id, { status });
      toast.success("Status updated");
    } catch (error) {
      toast.error(error.message || "Failed to update");
    }
  };

  const handleDeleteProject = async (row) => {
    const accepted = await confirm({ title: "Delete project?", message: `Delete "${row.name}"? Tasks will also be removed.`, confirmLabel: "Delete", tone: "danger" });
    if (!accepted) return;
    try { await store.deleteProject(row.id); toast.success("Deleted"); } catch (error) { toast.error(error.message || "Failed"); }
  };

  const handleArchiveProject = async (row) => {
    const accepted = await confirm({ title: "Archive project?", message: `Archive "${row.name}"?`, confirmLabel: "Archive" });
    if (!accepted) return;
    try { await store.archiveProject(row.id); toast.success("Archived"); } catch (error) { toast.error(error.message || "Failed"); }
  };

  const handleRestoreProject = async (row) => {
    try { await store.restoreProject(row.id); toast.success("Restored"); } catch (error) { toast.error(error.message || "Failed"); }
  };

  const handleTaskStatusChange = async (row, status) => {
    if (row.status === status) return;
    try { await store.updateTask(row.id, { status }); toast.success("Status updated"); } catch (error) { toast.error(error.message || "Failed"); }
  };

  const handleDeleteTask = async (row) => {
    const accepted = await confirm({ title: "Delete task?", message: `Delete "${row.title}"?`, confirmLabel: "Delete", tone: "danger" });
    if (!accepted) return;
    try { await store.deleteTask(row.id); toast.success("Deleted"); } catch (error) { toast.error(error.message || "Failed"); }
  };

  const handleArchiveTask = async (row) => {
    const accepted = await confirm({ title: "Archive task?", message: `Archive "${row.title}"?`, confirmLabel: "Archive" });
    if (!accepted) return;
    try { await store.archiveTask(row.id); toast.success("Archived"); } catch (error) { toast.error(error.message || "Failed"); }
  };

  const handleRestoreTask = async (row) => {
    try { await store.restoreTask(row.id); toast.success("Restored"); } catch (error) { toast.error(error.message || "Failed"); }
  };

  const inputClass = "w-full rounded-lg border border-[#ddd5be] bg-white px-3 py-2 text-sm text-[#1B0C0C] placeholder:text-[#b5a882] outline-none transition focus:border-[#4C5C2D] focus:ring-1 focus:ring-[#4C5C2D]/20";

  return (
    <div className="grid gap-3">
      <EditTaskDialog task={editingTask} isOpen={!!editingTask} onClose={() => setEditingTask(null)} store={store} />

      {/* Action bar */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowForm(showForm === "project" ? null : "project")}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition ${showForm === "project" ? "bg-[#4C5C2D] text-[#fff8dd]" : "border border-[#ddd5be] bg-white text-[#4C5C2D] hover:bg-[#faf5e4]"}`}
        >
          {showForm === "project" ? <XIcon className="size-3.5" /> : <PlusIcon className="size-3.5" />}
          New Project
        </button>
        <button
          onClick={() => setShowForm(showForm === "task" ? null : "task")}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition ${showForm === "task" ? "bg-[#4C5C2D] text-[#fff8dd]" : "border border-[#ddd5be] bg-white text-[#4C5C2D] hover:bg-[#faf5e4]"}`}
        >
          {showForm === "task" ? <XIcon className="size-3.5" /> : <PlusIcon className="size-3.5" />}
          New Task
        </button>
        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-[#6c6346] cursor-pointer select-none">
            <input className="accent-[#4C5C2D] size-3.5" type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Archived
          </label>
        </div>
      </div>

      {/* Inline create form */}
      {showForm === "project" && (
        <div className="rounded-2xl border border-[#e6d79e] bg-[#fffcf0] p-4 animate-in slide-in-from-top-2">
          <div className="grid gap-2.5">
            <div className="grid grid-cols-[1fr_1fr] gap-2.5 max-md:grid-cols-1">
              <input className={inputClass} placeholder="Project name" value={projectForm.name} onChange={(e) => setProjectForm((prev) => ({ ...prev, name: e.target.value }))} autoFocus />
              <input className={inputClass} placeholder="Description (optional)" value={projectForm.description} onChange={(e) => setProjectForm((prev) => ({ ...prev, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-4 gap-2.5 max-md:grid-cols-2">
              <select className={inputClass} value={projectForm.status} onChange={(e) => setProjectForm((prev) => ({ ...prev, status: e.target.value }))}>
                <option>Planning</option><option>Active</option><option>Completed</option><option>On Hold</option><option>Cancelled</option>
              </select>
              <select className={inputClass} value={projectForm.priority} onChange={(e) => setProjectForm((prev) => ({ ...prev, priority: e.target.value }))}>
                <option>High</option><option>Medium</option><option>Low</option>
              </select>
              <input className={inputClass} type="date" value={projectForm.startDate} onChange={(e) => setProjectForm((prev) => ({ ...prev, startDate: e.target.value }))} />
              <input className={inputClass} type="date" value={projectForm.endDate} onChange={(e) => setProjectForm((prev) => ({ ...prev, endDate: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowForm(null)} className="rounded-lg px-3 py-1.5 text-sm text-[#6c6346] hover:bg-[#f0e7c3] transition">Cancel</button>
              <button onClick={handleCreateProject} className="inline-flex items-center gap-1.5 rounded-lg bg-[#4C5C2D] px-4 py-1.5 text-sm font-medium text-[#fff8dd] transition hover:bg-[#3a4822]">
                <PlusIcon className="size-3.5" />Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm === "task" && (
        <div className="rounded-2xl border border-[#e6d79e] bg-[#fffcf0] p-4 animate-in slide-in-from-top-2">
          <div className="grid gap-2.5">
            <div className="grid grid-cols-[1fr_1fr_1fr] gap-2.5 max-md:grid-cols-1">
              <select className={inputClass} value={taskForm.projectId} onChange={(e) => setTaskForm((prev) => ({ ...prev, projectId: e.target.value }))}>
                <option value="">Choose project</option>
                {store.scopedProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input className={inputClass} placeholder="Task title" value={taskForm.title} onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))} autoFocus />
              <input className={inputClass} placeholder="Description (optional)" value={taskForm.description} onChange={(e) => setTaskForm((prev) => ({ ...prev, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-5 gap-2.5 max-md:grid-cols-2">
              <select className={inputClass} value={taskForm.status} onChange={(e) => setTaskForm((prev) => ({ ...prev, status: e.target.value }))}>
                <option>Todo</option><option>In Progress</option><option>Done</option>
              </select>
              <select className={inputClass} value={taskForm.priority} onChange={(e) => setTaskForm((prev) => ({ ...prev, priority: e.target.value }))}>
                <option>High</option><option>Medium</option><option>Low</option>
              </select>
              <select className={inputClass} value={taskForm.assigneeId} onChange={(e) => setTaskForm((prev) => ({ ...prev, assigneeId: e.target.value }))}>
                <option value="">Unassigned</option>
                {store.scopedMembers.map((m) => <option key={m.userId || m.id} value={m.userId || m.id}>{m.name}</option>)}
              </select>
              <input className={inputClass} type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm((prev) => ({ ...prev, dueDate: e.target.value }))} />
              <input className={inputClass} type="number" min="1" max="8" placeholder="Effort (hrs)" value={taskForm.effort} onChange={(e) => setTaskForm((prev) => ({ ...prev, effort: Number(e.target.value) }))} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowForm(null)} className="rounded-lg px-3 py-1.5 text-sm text-[#6c6346] hover:bg-[#f0e7c3] transition">Cancel</button>
              <button onClick={handleCreateTask} className="inline-flex items-center gap-1.5 rounded-lg bg-[#4C5C2D] px-4 py-1.5 text-sm font-medium text-[#fff8dd] transition hover:bg-[#3a4822]">
                <PlusIcon className="size-3.5" />Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Projects table */}
      <section className="rounded-2xl border border-white/70 bg-white/82 p-4 shadow-[0_8px_24px_rgba(148,163,184,0.1)] backdrop-blur-md">
        <h2 className="mb-3 text-base font-semibold text-slate-900">
          Projects
          <span className="ml-2 text-sm font-normal text-slate-400">
            {(showArchived ? store.scopedArchivedProjects : store.scopedProjects).length}
          </span>
        </h2>
        <SimpleTable
          sortable
          columns={[
            { key: "name", label: "Name" },
            {
              key: "status", label: "Status",
              sortValue: (row) => ({ "Planning": 0, "Active": 1, "On Hold": 2, "Completed": 3, "Cancelled": 4 }[row.status] ?? 5),
              render: (row) => (
                <select value={row.status} onChange={(e) => handleProjectStatusChange(row, e.target.value)} className="rounded-md border-0 bg-transparent py-0 text-sm outline-none cursor-pointer hover:bg-[#faf5e4] transition">
                  <option>Planning</option><option>Active</option><option>Completed</option><option>On Hold</option><option>Cancelled</option>
                </select>
              ),
            },
            {
              key: "priority", label: "Priority",
              sortValue: (row) => ({ "High": 0, "Medium": 1, "Low": 2 }[row.priority] ?? 3),
              render: (row) => <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${priorityBadge[row.priority] || ""}`}>{row.priority}</span>,
            },
            { key: "endDate", label: "Deadline" },
            {
              key: "actions", label: "",
              render: (row) => showArchived ? (
                <button className="inline-flex items-center gap-1 rounded-lg border border-[#4C5C2D]/20 px-2.5 py-1 text-xs text-[#4C5C2D] hover:bg-[#f0eddf] transition" onClick={() => handleRestoreProject(row)}>
                  <ArchiveRestoreIcon className="size-3.5" />Restore
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <button className="rounded-md p-1 text-[#8a7d5e] hover:bg-[#fff1a6] hover:text-[#4C5C2D] transition" title="Archive" onClick={() => handleArchiveProject(row)}><ArchiveIcon className="size-3.5" /></button>
                  <button className="rounded-md p-1 text-[#c4956a] hover:bg-rose-50 hover:text-rose-600 transition" title="Delete" onClick={() => handleDeleteProject(row)}><Trash2Icon className="size-3.5" /></button>
                </div>
              ),
            },
          ]}
          rows={showArchived ? store.scopedArchivedProjects : store.scopedProjects}
        />
      </section>

      {/* Tasks table */}
      <section className="rounded-2xl border border-white/70 bg-white/82 p-4 shadow-[0_8px_24px_rgba(148,163,184,0.1)] backdrop-blur-md">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">
            Tasks
            <span className="ml-2 text-sm font-normal text-slate-400">{filteredTasks.length}</span>
          </h2>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="rounded-lg border border-[#ddd5be] bg-white px-2.5 py-1.5 text-xs text-[#6c6346] outline-none cursor-pointer hover:bg-[#faf5e4] transition"
          >
            <option value="all">All projects</option>
            {(showArchived ? store.scopedArchivedProjects : store.scopedProjects).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <SimpleTable
          sortable
          columns={[
            { key: "title", label: "Task" },
            {
              key: "status", label: "Status",
              sortValue: (row) => ({ "Todo": 0, "In Progress": 1, "Done": 2 }[row.status] ?? 3),
              render: (row) => (
                <select value={row.status} onChange={(e) => handleTaskStatusChange(row, e.target.value)} className="rounded-md border-0 bg-transparent py-0 text-sm outline-none cursor-pointer hover:bg-[#faf5e4] transition">
                  <option>Todo</option><option>In Progress</option><option>Done</option>
                </select>
              ),
            },
            {
              key: "priority", label: "Priority",
              sortValue: (row) => ({ "High": 0, "Medium": 1, "Low": 2 }[row.priority] ?? 3),
              render: (row) => <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${priorityBadge[row.priority] || ""}`}>{row.priority}</span>,
            },
            { key: "dueDate", label: "Due" },
            {
              key: "assigneeId", label: "Assignee",
              sortValue: (row) => store.scopedMembers.find((m) => (m.userId || m.id) === row.assigneeId)?.name || "\uffff",
              render: (row) => {
                const name = store.scopedMembers.find((m) => (m.userId || m.id) === row.assigneeId)?.name;
                return name ? <span className="text-sm">{name}</span> : <span className="text-xs text-[#b5a882]">--</span>;
              },
            },
            {
              key: "actions", label: "",
              render: (row) => (
                <div className="flex items-center gap-1">
                  {showArchived ? (
                    <button className="inline-flex items-center gap-1 rounded-lg border border-[#4C5C2D]/20 px-2.5 py-1 text-xs text-[#4C5C2D] hover:bg-[#f0eddf] transition" onClick={() => handleRestoreTask(row)}>
                      <ArchiveRestoreIcon className="size-3.5" />Restore
                    </button>
                  ) : (
                    <>
                      <button className="rounded-md p-1 text-[#8a7d5e] hover:bg-[#faf5e4] hover:text-[#4C5C2D] transition" title="Edit" onClick={() => setEditingTask(row)}><PencilIcon className="size-3.5" /></button>
                      <button className="rounded-md p-1 text-[#8a7d5e] hover:bg-[#fff1a6] hover:text-[#4C5C2D] transition" title="Archive" onClick={() => handleArchiveTask(row)}><ArchiveIcon className="size-3.5" /></button>
                      <button className="rounded-md p-1 text-[#c4956a] hover:bg-rose-50 hover:text-rose-600 transition" title="Delete" onClick={() => handleDeleteTask(row)}><Trash2Icon className="size-3.5" /></button>
                    </>
                  )}
                </div>
              ),
            },
          ]}
          rows={filteredTasks}
        />
      </section>
    </div>
  );
}
