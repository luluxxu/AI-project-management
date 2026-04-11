import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import SectionCard from "../components/SectionCard";
import SimpleTable from "../components/SimpleTable";
import { useConfirmDialog } from "../context/ConfirmDialogContext";

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

  const filteredTasks = useMemo(() => {
    if (selectedProjectId === "all") return store.scopedTasks;
    return store.scopedTasks.filter((task) => task.projectId === selectedProjectId);
  }, [selectedProjectId, store.scopedTasks]);

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

  return (
    <div className="page-grid">
      <div className="two-col-grid">
        <SectionCard title="Create Project" subtitle={`Add a new project for ${teamName}`}>
          <div className="form-grid">
            <input placeholder="Project name" value={projectForm.name} onChange={(e) => setProjectForm((prev) => ({ ...prev, name: e.target.value }))} />
            <input placeholder="Description" value={projectForm.description} onChange={(e) => setProjectForm((prev) => ({ ...prev, description: e.target.value }))} />
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
            <input type="date" value={projectForm.startDate} onChange={(e) => setProjectForm((prev) => ({ ...prev, startDate: e.target.value }))} />
            <input type="date" value={projectForm.endDate} onChange={(e) => setProjectForm((prev) => ({ ...prev, endDate: e.target.value }))} />
            <button
              className="bg-blue-600 text-white border-blue-600 rounded-xl px-4 py-2 hover:bg-blue-700 transition"
              onClick={handleCreateProject}
            >
              Save Project
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Create Task" subtitle={`Capture shared tasks for ${teamName}`}>
          <div className="form-grid">
            <select value={taskForm.projectId} onChange={(e) => setTaskForm((prev) => ({ ...prev, projectId: e.target.value }))}>
              <option value="">Choose project</option>
              {store.scopedProjects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
            <input placeholder="Task title" value={taskForm.title} onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))} />
            <input placeholder="Description" value={taskForm.description} onChange={(e) => setTaskForm((prev) => ({ ...prev, description: e.target.value }))} />
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
            <select value={taskForm.assigneeId} onChange={(e) => setTaskForm((prev) => ({ ...prev, assigneeId: e.target.value }))}>
              <option value="">Unassigned</option>
              {store.scopedMembers.map((member) => (
                <option key={member.userId || member.id} value={member.userId || member.id}>{member.name}</option>
              ))}
            </select>
            <input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm((prev) => ({ ...prev, dueDate: e.target.value }))} />
            <input type="number" min="1" max="8" value={taskForm.effort} onChange={(e) => setTaskForm((prev) => ({ ...prev, effort: Number(e.target.value) }))} />
            <button
              className="bg-blue-600 text-white border-blue-600 rounded-xl px-4 py-2 hover:bg-blue-700 transition"
              onClick={handleCreateTask}
            >
              Save Task
            </button>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Projects" subtitle="Edit status inline or remove finished work">
        <SimpleTable
          columns={[
            { key: "name", label: "Name" },
            { key: "team", label: "Team", render: () => teamName },
            {
              key: "status",
              label: "Status",
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
            { key: "priority", label: "Priority" },
            { key: "endDate", label: "Deadline" },
            { key: "actions", label: "Actions", render: (row) => <button className="bg-red-50 border-red-200 text-red-800 rounded-xl px-4 py-2 hover:bg-red-100 transition" onClick={() => handleDeleteProject(row)}>Delete</button> },
          ]}
          rows={store.scopedProjects}
        />
      </SectionCard>

      <SectionCard
        title="Tasks"
        subtitle="Filter by project and manage task state"
        action={
          <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
            <option value="all">All projects</option>
            {store.scopedProjects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        }
      >
        <SimpleTable
          columns={[
            { key: "title", label: "Task" },
            { key: "team", label: "Team", render: () => teamName },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <select value={row.status} onChange={(e) => handleTaskStatusChange(row, e.target.value)}>
                  <option>Todo</option>
                  <option>In Progress</option>
                  <option>Done</option>
                </select>
              ),
            },
            { key: "priority", label: "Priority" },
            { key: "dueDate", label: "Due" },
            {
              key: "assigneeId",
              label: "Assignee",
              render: (row) => store.scopedMembers.find((member) => (member.userId || member.id) === row.assigneeId)?.name || "Unassigned",
            },
            { key: "actions", label: "Actions", render: (row) => <button className="bg-red-50 border-red-200 text-red-800 rounded-xl px-4 py-2 hover:bg-red-100 transition" onClick={() => handleDeleteTask(row)}>Delete</button> },
          ]}
          rows={filteredTasks}
        />
      </SectionCard>
    </div>
  );
}
