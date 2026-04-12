import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import SectionCard from "../components/SectionCard";
import SimpleTable from "../components/SimpleTable";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import EditTaskDialog from "../components/EditTaskDialog";

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

export default function ProjectsPage({ store }) {
  const { confirm } = useConfirmDialog();
  const teamName = store.activeWorkspace?.name || "Current team";
  const [projectForm, setProjectForm] = useState(emptyProject);
  const [taskForm, setTaskForm] = useState({ ...emptyTask, projectId: store.scopedProjects[0]?.id || "" });
  const [selectedProjectId, setSelectedProjectId] = useState(store.scopedProjects[0]?.id || "all");
  const [editingTask, setEditingTask] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

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

  return (
    <div className="page-grid">
      <EditTaskDialog
        task={editingTask}
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        store={store}
      />

      <div className="two-col-grid">
        <SectionCard title="Create Project" subtitle={`Add a new project for ${teamName}`}>
          <div className="grid gap-4">
            <div className="rounded-3xl border border-[#e6d79e] bg-[#fff7d1]/70 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#4C5C2D]">
                  Project details
                </span>
                <span className="text-xs text-[#6c6346]">Keep it focused and time-bound</span>
              </div>
              <div className="form-grid">
                <input placeholder="Project name" value={projectForm.name} onChange={(e) => setProjectForm((prev) => ({ ...prev, name: e.target.value }))} />
                <input placeholder="Description" value={projectForm.description} onChange={(e) => setProjectForm((prev) => ({ ...prev, description: e.target.value }))} />
                <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
                  <select value={projectForm.status} onChange={(e) => setProjectForm((prev) => ({ ...prev, status: e.target.value }))}>
                    <option>Planning</option>
                    <option>Active</option>
                    <option>Completed</option>
                    <option>On Hold</option>
                    <option>Cancelled</option>
                  </select>
                  <select value={projectForm.priority} onChange={(e) => setProjectForm((prev) => ({ ...prev, priority: e.target.value }))}>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
                  <input type="date" value={projectForm.startDate} onChange={(e) => setProjectForm((prev) => ({ ...prev, startDate: e.target.value }))} />
                  <input type="date" value={projectForm.endDate} onChange={(e) => setProjectForm((prev) => ({ ...prev, endDate: e.target.value }))} />
                </div>
              </div>
            </div>
            <button
              className="inline-flex items-center justify-center rounded-2xl border border-[#4C5C2D] bg-[#4C5C2D] px-4 py-3 font-semibold text-[#fff8dd] shadow-[0_14px_28px_rgba(76,92,45,0.22)] transition hover:-translate-y-0.5 hover:bg-[#313E17]"
              onClick={handleCreateProject}
            >
              Save Project
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Create Task" subtitle={`Capture shared tasks for ${teamName}`}>
          <div className="grid gap-4">
            <div className="rounded-3xl border border-[#e6d79e] bg-[#fff7d1]/70 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#4C5C2D]">
                  Task details
                </span>
                <span className="text-xs text-[#6c6346]">Assign ownership and a due date</span>
              </div>
              <div className="form-grid">
                <select value={taskForm.projectId} onChange={(e) => setTaskForm((prev) => ({ ...prev, projectId: e.target.value }))}>
                  <option value="">Choose project</option>
                  {store.scopedProjects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
                <input placeholder="Task title" value={taskForm.title} onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))} />
                <input placeholder="Description" value={taskForm.description} onChange={(e) => setTaskForm((prev) => ({ ...prev, description: e.target.value }))} />
                <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
                  <select value={taskForm.status} onChange={(e) => setTaskForm((prev) => ({ ...prev, status: e.target.value }))}>
                    <option>Todo</option>
                    <option>In Progress</option>
                    <option>Done</option>
                  </select>
                  <select value={taskForm.priority} onChange={(e) => setTaskForm((prev) => ({ ...prev, priority: e.target.value }))}>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
                  <select value={taskForm.assigneeId} onChange={(e) => setTaskForm((prev) => ({ ...prev, assigneeId: e.target.value }))}>
                    <option value="">Unassigned</option>
                    {store.scopedMembers.map((member) => (
                      <option key={member.userId || member.id} value={member.userId || member.id}>{member.name}</option>
                    ))}
                  </select>
                  <input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm((prev) => ({ ...prev, dueDate: e.target.value }))} />
                </div>
                <input type="number" min="1" max="8" value={taskForm.effort} onChange={(e) => setTaskForm((prev) => ({ ...prev, effort: Number(e.target.value) }))} />
              </div>
            </div>
            <button
              className="inline-flex items-center justify-center rounded-2xl border border-[#4C5C2D] bg-[#4C5C2D] px-4 py-3 font-semibold text-[#fff8dd] shadow-[0_14px_28px_rgba(76,92,45,0.22)] transition hover:-translate-y-0.5 hover:bg-[#313E17]"
              onClick={handleCreateTask}
            >
              Save Task
            </button>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Projects"
        subtitle={showArchived ? "Archived projects can be restored here" : "Edit status inline or archive finished work"}
        action={
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input className="accent-[#4C5C2D]" type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Show archived
          </label>
        }
      >
        <SimpleTable
          sortable
          columns={[
            { key: "name", label: "Name" },
            { key: "team", label: "Team", render: () => teamName },
            {
              key: "status",
              label: "Status",
              sortValue: (row) => ({ "Planning": 0, "Active": 1, "On Hold": 2, "Completed": 3, "Cancelled": 4 }[row.status] ?? 5),
              render: (row) => (
                <select value={row.status} onChange={(e) => handleProjectStatusChange(row, e.target.value)}>
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
            },
            { key: "endDate", label: "Deadline" },
            {
              key: "actions",
              label: "Actions",
              render: (row) => showArchived ? (
                <button className="rounded-2xl border border-[#4C5C2D]/20 bg-white px-4 py-2.5 text-[#313E17] transition hover:bg-[#fff7d1]" onClick={() => handleRestoreProject(row)}>Restore</button>
              ) : (
                <div className="flex gap-2">
                  <button className="rounded-2xl border border-[#e6d79e] bg-[#fff1a6] px-4 py-2.5 text-[#313E17] transition hover:bg-[#FFDE42]" onClick={() => handleArchiveProject(row)}>Archive</button>
                  <button className="rounded-2xl border border-[#d8b17b] bg-[#f6dfb4] px-4 py-2.5 text-[#7a3412] transition hover:bg-[#efd296]" onClick={() => handleDeleteProject(row)}>Delete</button>
                </div>
              ),
            },
          ]}
          rows={showArchived ? store.scopedArchivedProjects : store.scopedProjects}
        />
      </SectionCard>

      <SectionCard
        title="Tasks"
        subtitle={showArchived ? "Archived tasks can be restored here" : "Filter by project and manage task state — click column headers to sort"}
        action={
          <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
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
            { key: "team", label: "Team", render: () => teamName },
            {
              key: "status",
              label: "Status",
              sortValue: (row) => ({ "Todo": 0, "In Progress": 1, "Done": 2 }[row.status] ?? 3),
              render: (row) => (
                <select value={row.status} onChange={(e) => handleTaskStatusChange(row, e.target.value)}>
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
            },
            { key: "dueDate", label: "Due" },
            {
              key: "assigneeId",
              label: "Assignee",
              sortValue: (row) => store.scopedMembers.find((member) => (member.userId || member.id) === row.assigneeId)?.name || "\uffff",
              render: (row) => store.scopedMembers.find((member) => (member.userId || member.id) === row.assigneeId)?.name || "Unassigned",
            },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                <div className="flex gap-2">
                  {showArchived ? (
                    <button
                      className="rounded-2xl border border-[#4C5C2D]/20 bg-white px-4 py-2.5 text-[#313E17] transition hover:bg-[#fff7d1]"
                      onClick={() => handleRestoreTask(row)}
                    >
                      Restore
                    </button>
                  ) : (
                    <>
                      <button
                        className="rounded-2xl border border-[#4C5C2D]/20 bg-white px-4 py-2.5 text-[#313E17] transition hover:bg-[#fff7d1]"
                        onClick={() => setEditingTask(row)}
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-2xl border border-[#e6d79e] bg-[#fff1a6] px-4 py-2.5 text-[#313E17] transition hover:bg-[#FFDE42]"
                        onClick={() => handleArchiveTask(row)}
                      >
                        Archive
                      </button>
                      <button
                        className="rounded-2xl border border-[#d8b17b] bg-[#f6dfb4] px-4 py-2.5 text-[#7a3412] transition hover:bg-[#efd296]"
                        onClick={() => handleDeleteTask(row)}
                      >
                        Delete
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
