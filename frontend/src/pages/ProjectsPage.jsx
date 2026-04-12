import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import SectionCard from "../components/SectionCard";
import SimpleTable from "../components/SimpleTable";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import EditTaskDialog from "../components/EditTaskDialog";
import { PlusIcon, FolderPlusIcon, ClipboardListIcon, ArchiveIcon, ArchiveRestoreIcon, Trash2Icon, PencilIcon } from "lucide-react";

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
  High: "bg-rose-100 text-rose-700 border-rose-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Low: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const statusBadge = {
  Planning: "bg-slate-100 text-slate-600",
  Active: "bg-sky-100 text-sky-700",
  "On Hold": "bg-amber-100 text-amber-700",
  Completed: "bg-emerald-100 text-emerald-700",
  Cancelled: "bg-rose-100 text-rose-600",
  Todo: "bg-slate-100 text-slate-600",
  "In Progress": "bg-sky-100 text-sky-700",
  Done: "bg-emerald-100 text-emerald-700",
};

export default function ProjectsPage({ store }) {
  const { confirm } = useConfirmDialog();
  const teamName = store.activeWorkspace?.name || "Current team";
  const [projectForm, setProjectForm] = useState(emptyProject);
  const [taskForm, setTaskForm] = useState({ ...emptyTask, projectId: store.scopedProjects[0]?.id || "" });
  const [selectedProjectId, setSelectedProjectId] = useState(store.scopedProjects[0]?.id || "all");
  const [editingTask, setEditingTask] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [activeForm, setActiveForm] = useState("project");

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
      toast.success("Project created successfully");
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
      toast.success("Task created successfully");
    } catch (error) {
      toast.error(error.message || "Failed to create task");
    }
  };

  const handleProjectStatusChange = async (row, status) => {
    if (row.status === status) return;
    const accepted = await confirm({
      title: "Update project status?",
      message: `Change "${row.name}" from ${row.status} to ${status}?`,
      confirmLabel: "Update status",
    });
    if (!accepted) return;

    try {
      await store.updateProject(row.id, { status });
      toast.success("Project updated");
    } catch (error) {
      toast.error(error.message || "Failed to update project");
    }
  };

  const handleDeleteProject = async (row) => {
    const accepted = await confirm({
      title: "Delete project?",
      message: `Delete "${row.name}"? Related tasks will also be removed.`,
      confirmLabel: "Delete project",
      tone: "danger",
    });
    if (!accepted) return;

    try {
      await store.deleteProject(row.id);
      toast.success("Project deleted");
    } catch (error) {
      toast.error(error.message || "Failed to delete project");
    }
  };

  const handleArchiveProject = async (row) => {
    const accepted = await confirm({
      title: "Archive project?",
      message: `Archive "${row.name}"? Its tasks will be hidden but can be restored later.`,
      confirmLabel: "Archive project",
    });
    if (!accepted) return;

    try {
      await store.archiveProject(row.id);
      toast.success("Project archived");
    } catch (error) {
      toast.error(error.message || "Failed to archive project");
    }
  };

  const handleRestoreProject = async (row) => {
    try {
      await store.restoreProject(row.id);
      toast.success("Project restored");
    } catch (error) {
      toast.error(error.message || "Failed to restore project");
    }
  };

  const handleTaskStatusChange = async (row, status) => {
    if (row.status === status) return;
    const accepted = await confirm({
      title: "Update task status?",
      message: `Change "${row.title}" from ${row.status} to ${status}?`,
      confirmLabel: "Update status",
    });
    if (!accepted) return;

    try {
      await store.updateTask(row.id, { status });
      toast.success("Task updated");
    } catch (error) {
      toast.error(error.message || "Failed to update task");
    }
  };

  const handleDeleteTask = async (row) => {
    const accepted = await confirm({
      title: "Delete task?",
      message: `Delete "${row.title}" from this project?`,
      confirmLabel: "Delete task",
      tone: "danger",
    });
    if (!accepted) return;

    try {
      await store.deleteTask(row.id);
      toast.success("Task deleted");
    } catch (error) {
      toast.error(error.message || "Failed to delete task");
    }
  };

  const handleArchiveTask = async (row) => {
    const accepted = await confirm({
      title: "Archive task?",
      message: `Archive "${row.title}"? It will be hidden but can be restored later.`,
      confirmLabel: "Archive task",
    });
    if (!accepted) return;

    try {
      await store.archiveTask(row.id);
      toast.success("Task archived");
    } catch (error) {
      toast.error(error.message || "Failed to archive task");
    }
  };

  const handleRestoreTask = async (row) => {
    try {
      await store.restoreTask(row.id);
      toast.success("Task restored");
    } catch (error) {
      toast.error(error.message || "Failed to restore task");
    }
  };

  const inputClass = "w-full rounded-xl border border-[#e0d5b8] bg-white/90 px-3.5 py-2.5 text-sm text-[#1B0C0C] placeholder:text-[#b5a882] outline-none transition focus:border-[#4C5C2D] focus:ring-2 focus:ring-[#4C5C2D]/15";
  const selectClass = `${inputClass} appearance-none cursor-pointer`;

  return (
    <div className="page-grid">
      <EditTaskDialog
        task={editingTask}
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        store={store}
      />

      {/* Form toggle + create section */}
      <SectionCard
        title={activeForm === "project" ? "New Project" : "New Task"}
        subtitle={activeForm === "project" ? `Add a project to ${teamName}` : `Add a task to ${teamName}`}
        action={
          <div className="flex gap-1 rounded-xl border border-[#e0d5b8] bg-[#faf5e4] p-1">
            <button
              onClick={() => setActiveForm("project")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide transition ${activeForm === "project" ? "bg-[#4C5C2D] text-[#fff8dd] shadow-sm" : "text-[#6c6346] hover:text-[#4C5C2D]"}`}
            >
              <FolderPlusIcon className="size-3.5" />
              Project
            </button>
            <button
              onClick={() => setActiveForm("task")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide transition ${activeForm === "task" ? "bg-[#4C5C2D] text-[#fff8dd] shadow-sm" : "text-[#6c6346] hover:text-[#4C5C2D]"}`}
            >
              <ClipboardListIcon className="size-3.5" />
              Task
            </button>
          </div>
        }
      >
        {activeForm === "project" ? (
          <div className="grid gap-4">
            <div className="rounded-2xl border border-[#ebe2c8] bg-gradient-to-br from-[#fffcf0] to-[#faf5e4] p-5">
              <div className="grid gap-3">
                <input className={inputClass} placeholder="Project name" value={projectForm.name} onChange={(e) => setProjectForm((prev) => ({ ...prev, name: e.target.value }))} />
                <input className={inputClass} placeholder="Description (optional)" value={projectForm.description} onChange={(e) => setProjectForm((prev) => ({ ...prev, description: e.target.value }))} />
                <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#8a7d5e]">Status</label>
                    <select className={selectClass} value={projectForm.status} onChange={(e) => setProjectForm((prev) => ({ ...prev, status: e.target.value }))}>
                      <option>Planning</option>
                      <option>Active</option>
                      <option>Completed</option>
                      <option>On Hold</option>
                      <option>Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#8a7d5e]">Priority</label>
                    <select className={selectClass} value={projectForm.priority} onChange={(e) => setProjectForm((prev) => ({ ...prev, priority: e.target.value }))}>
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#8a7d5e]">Start date</label>
                    <input className={inputClass} type="date" value={projectForm.startDate} onChange={(e) => setProjectForm((prev) => ({ ...prev, startDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#8a7d5e]">End date</label>
                    <input className={inputClass} type="date" value={projectForm.endDate} onChange={(e) => setProjectForm((prev) => ({ ...prev, endDate: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#4C5C2D] px-5 py-3 text-sm font-semibold text-[#fff8dd] shadow-[0_8px_24px_rgba(76,92,45,0.25)] transition hover:-translate-y-0.5 hover:bg-[#3a4822] hover:shadow-[0_12px_32px_rgba(76,92,45,0.3)] active:translate-y-0"
              onClick={handleCreateProject}
            >
              <PlusIcon className="size-4" />
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="rounded-2xl border border-[#ebe2c8] bg-gradient-to-br from-[#fffcf0] to-[#faf5e4] p-5">
              <div className="grid gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#8a7d5e]">Project</label>
                  <select className={selectClass} value={taskForm.projectId} onChange={(e) => setTaskForm((prev) => ({ ...prev, projectId: e.target.value }))}>
                    <option value="">Choose project</option>
                    {store.scopedProjects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
                <input className={inputClass} placeholder="Task title" value={taskForm.title} onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))} />
                <input className={inputClass} placeholder="Description (optional)" value={taskForm.description} onChange={(e) => setTaskForm((prev) => ({ ...prev, description: e.target.value }))} />
                <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#8a7d5e]">Status</label>
                    <select className={selectClass} value={taskForm.status} onChange={(e) => setTaskForm((prev) => ({ ...prev, status: e.target.value }))}>
                      <option>Todo</option>
                      <option>In Progress</option>
                      <option>Done</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#8a7d5e]">Priority</label>
                    <select className={selectClass} value={taskForm.priority} onChange={(e) => setTaskForm((prev) => ({ ...prev, priority: e.target.value }))}>
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#8a7d5e]">Assignee</label>
                    <select className={selectClass} value={taskForm.assigneeId} onChange={(e) => setTaskForm((prev) => ({ ...prev, assigneeId: e.target.value }))}>
                      <option value="">Unassigned</option>
                      {store.scopedMembers.map((member) => (
                        <option key={member.userId || member.id} value={member.userId || member.id}>{member.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#8a7d5e]">Due date</label>
                    <input className={inputClass} type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm((prev) => ({ ...prev, dueDate: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#8a7d5e]">Effort (hours)</label>
                  <input className={inputClass} type="number" min="1" max="8" value={taskForm.effort} onChange={(e) => setTaskForm((prev) => ({ ...prev, effort: Number(e.target.value) }))} />
                </div>
              </div>
            </div>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#4C5C2D] px-5 py-3 text-sm font-semibold text-[#fff8dd] shadow-[0_8px_24px_rgba(76,92,45,0.25)] transition hover:-translate-y-0.5 hover:bg-[#3a4822] hover:shadow-[0_12px_32px_rgba(76,92,45,0.3)] active:translate-y-0"
              onClick={handleCreateTask}
            >
              <PlusIcon className="size-4" />
              Create Task
            </button>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Projects"
        subtitle={showArchived ? "Archived projects can be restored here" : "Click column headers to sort"}
        action={
          <label className="flex items-center gap-2 rounded-lg border border-[#e0d5b8] bg-[#faf5e4] px-3 py-1.5 text-xs font-medium text-[#6c6346] transition hover:bg-[#f5edd4] cursor-pointer select-none">
            <input className="accent-[#4C5C2D] size-3.5" type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Show archived
          </label>
        }
      >
        <SimpleTable
          sortable
          columns={[
            { key: "name", label: "Name" },
            {
              key: "status",
              label: "Status",
              sortValue: (row) => ({ "Planning": 0, "Active": 1, "On Hold": 2, "Completed": 3, "Cancelled": 4 }[row.status] ?? 5),
              render: (row) => (
                <select
                  value={row.status}
                  onChange={(e) => handleProjectStatusChange(row, e.target.value)}
                  className="rounded-lg border-0 bg-transparent py-0.5 text-sm font-medium outline-none cursor-pointer hover:bg-[#faf5e4] transition"
                >
                  <option>Planning</option>
                  <option>Active</option>
                  <option>Completed</option>
                  <option>On Hold</option>
                  <option>Cancelled</option>
                </select>
              ),
            },
            {
              key: "priority",
              label: "Priority",
              sortValue: (row) => ({ "High": 0, "Medium": 1, "Low": 2 }[row.priority] ?? 3),
              render: (row) => (
                <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${priorityBadge[row.priority] || ""}`}>
                  {row.priority}
                </span>
              ),
            },
            { key: "endDate", label: "Deadline" },
            {
              key: "actions",
              label: "",
              render: (row) => showArchived ? (
                <button
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#4C5C2D]/20 bg-white px-3 py-1.5 text-xs font-medium text-[#4C5C2D] transition hover:bg-[#f0eddf]"
                  onClick={() => handleRestoreProject(row)}
                >
                  <ArchiveRestoreIcon className="size-3.5" />
                  Restore
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button className="rounded-lg p-1.5 text-[#8a7d5e] transition hover:bg-[#fff1a6] hover:text-[#4C5C2D]" title="Archive" onClick={() => handleArchiveProject(row)}>
                    <ArchiveIcon className="size-4" />
                  </button>
                  <button className="rounded-lg p-1.5 text-[#c4956a] transition hover:bg-rose-50 hover:text-rose-600" title="Delete" onClick={() => handleDeleteProject(row)}>
                    <Trash2Icon className="size-4" />
                  </button>
                </div>
              ),
            },
          ]}
          rows={showArchived ? store.scopedArchivedProjects : store.scopedProjects}
        />
      </SectionCard>

      <SectionCard
        title="Tasks"
        subtitle={showArchived ? "Archived tasks can be restored here" : "Click column headers to sort"}
        action={
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="rounded-xl border border-[#e0d5b8] bg-[#faf5e4] px-3 py-1.5 text-xs font-medium text-[#6c6346] outline-none transition hover:bg-[#f5edd4] cursor-pointer"
          >
            <option value="all">All projects</option>
            {(showArchived ? store.scopedArchivedProjects : store.scopedProjects).map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        }
      >
        <SimpleTable
          sortable
          columns={[
            { key: "title", label: "Task" },
            {
              key: "status",
              label: "Status",
              sortValue: (row) => ({ "Todo": 0, "In Progress": 1, "Done": 2 }[row.status] ?? 3),
              render: (row) => (
                <select
                  value={row.status}
                  onChange={(e) => handleTaskStatusChange(row, e.target.value)}
                  className="rounded-lg border-0 bg-transparent py-0.5 text-sm font-medium outline-none cursor-pointer hover:bg-[#faf5e4] transition"
                >
                  <option>Todo</option>
                  <option>In Progress</option>
                  <option>Done</option>
                </select>
              ),
            },
            {
              key: "priority",
              label: "Priority",
              sortValue: (row) => ({ "High": 0, "Medium": 1, "Low": 2 }[row.priority] ?? 3),
              render: (row) => (
                <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${priorityBadge[row.priority] || ""}`}>
                  {row.priority}
                </span>
              ),
            },
            { key: "dueDate", label: "Due" },
            {
              key: "assigneeId",
              label: "Assignee",
              sortValue: (row) => store.scopedMembers.find((member) => (member.userId || member.id) === row.assigneeId)?.name || "\uffff",
              render: (row) => {
                const name = store.scopedMembers.find((member) => (member.userId || member.id) === row.assigneeId)?.name;
                return name
                  ? <span className="text-sm">{name}</span>
                  : <span className="text-xs text-[#b5a882]">Unassigned</span>;
              },
            },
            {
              key: "actions",
              label: "",
              render: (row) => (
                <div className="flex items-center gap-1.5">
                  {showArchived ? (
                    <button
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#4C5C2D]/20 bg-white px-3 py-1.5 text-xs font-medium text-[#4C5C2D] transition hover:bg-[#f0eddf]"
                      onClick={() => handleRestoreTask(row)}
                    >
                      <ArchiveRestoreIcon className="size-3.5" />
                      Restore
                    </button>
                  ) : (
                    <>
                      <button className="rounded-lg p-1.5 text-[#8a7d5e] transition hover:bg-[#faf5e4] hover:text-[#4C5C2D]" title="Edit" onClick={() => setEditingTask(row)}>
                        <PencilIcon className="size-4" />
                      </button>
                      <button className="rounded-lg p-1.5 text-[#8a7d5e] transition hover:bg-[#fff1a6] hover:text-[#4C5C2D]" title="Archive" onClick={() => handleArchiveTask(row)}>
                        <ArchiveIcon className="size-4" />
                      </button>
                      <button className="rounded-lg p-1.5 text-[#c4956a] transition hover:bg-rose-50 hover:text-rose-600" title="Delete" onClick={() => handleDeleteTask(row)}>
                        <Trash2Icon className="size-4" />
                      </button>
                    </>
                  )}
                </div>
              ),
            },
          ]}
          rows={filteredTasks}
        />
      </SectionCard>
    </div>
  );
}
