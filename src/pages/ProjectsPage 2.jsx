import { useMemo, useState } from "react";
import SectionCard from "../components/SectionCard";
import SimpleTable from "../components/SimpleTable";

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
  const [projectForm, setProjectForm] = useState(emptyProject);
  const [taskForm, setTaskForm] = useState({ ...emptyTask, projectId: store.scopedProjects[0]?.id || "" });
  const [selectedProjectId, setSelectedProjectId] = useState(store.scopedProjects[0]?.id || "all");

  const filteredTasks = useMemo(() => {
    if (selectedProjectId === "all") return store.scopedTasks;
    return store.scopedTasks.filter((task) => task.projectId === selectedProjectId);
  }, [selectedProjectId, store.scopedTasks]);

  return (
    <div className="page-grid">
      <div className="two-col-grid">
        <SectionCard title="Create Project" subtitle="Add a new project to the current workspace">
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
              className="primary-btn"
              onClick={() => {
                if (!projectForm.name.trim()) return;
                store.addProject(projectForm);
                setProjectForm(emptyProject);
              }}
            >
              Save Project
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Create Task" subtitle="Capture and assign project tasks">
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
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
            <input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm((prev) => ({ ...prev, dueDate: e.target.value }))} />
            <input type="number" min="1" max="8" value={taskForm.effort} onChange={(e) => setTaskForm((prev) => ({ ...prev, effort: Number(e.target.value) }))} />
            <button
              className="primary-btn"
              onClick={() => {
                if (!taskForm.projectId || !taskForm.title.trim()) return;
                store.addTask(taskForm);
                setTaskForm({ ...emptyTask, projectId: taskForm.projectId });
              }}
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
            { key: "status", label: "Status", render: (row) => (
              <select value={row.status} onChange={(e) => store.updateProject(row.id, { status: e.target.value })}>
                <option>Planning</option><option>Active</option><option>Completed</option><option>On Hold</option><option>Cancelled</option>
              </select>
            ) },
            { key: "priority", label: "Priority" },
            { key: "endDate", label: "Deadline" },
            { key: "actions", label: "Actions", render: (row) => <button className="danger-btn" onClick={() => store.deleteProject(row.id)}>Delete</button> },
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
            { key: "status", label: "Status", render: (row) => (
              <select value={row.status} onChange={(e) => store.updateTask(row.id, { status: e.target.value })}>
                <option>Todo</option><option>In Progress</option><option>Done</option>
              </select>
            ) },
            { key: "priority", label: "Priority" },
            { key: "dueDate", label: "Due" },
            { key: "assigneeId", label: "Assignee", render: (row) => store.scopedMembers.find((member) => member.id === row.assigneeId)?.name || "Unassigned" },
            { key: "actions", label: "Actions", render: (row) => <button className="danger-btn" onClick={() => store.deleteTask(row.id)}>Delete</button> },
          ]}
          rows={filteredTasks}
        />
      </SectionCard>
    </div>
  );
}
