import { useMemo, useState } from "react";
import { seedData } from "./seed";
import { loadState, saveState } from "./storage";
import { getWorkspaceSnapshot } from "./analytics";

const uid = (prefix) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
const promptValue = (message, fallback = "") => window.prompt(message, fallback)?.trim();

export function useProjectStore() {
  const [data, setData] = useState(() => loadState(seedData));

  const updateData = (updater) => {
    setData((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      saveState(next);
      return next;
    });
  };

  const activeWorkspace = data.workspaces.find((workspace) => workspace.id === data.activeWorkspaceId) || data.workspaces[0];
  const activeWorkspaceId = activeWorkspace?.id;

  const scopedProjects = data.projects.filter((project) => project.workspaceId === activeWorkspaceId);
  const scopedTasks = data.tasks.filter((task) => task.workspaceId === activeWorkspaceId);
  const scopedMembers = data.members.filter((member) => member.workspaceId === activeWorkspaceId);
  const scopedActivities = data.activities
    .filter((activity) => activity.workspaceId === activeWorkspaceId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const analytics = useMemo(() => getWorkspaceSnapshot(data, activeWorkspaceId), [data, activeWorkspaceId]);

  const logActivity = (draft, workspaceId = activeWorkspaceId) => ({
    ...draft,
    id: uid("a"),
    workspaceId,
    createdAt: new Date().toISOString(),
  });

  const setActiveWorkspace = (workspaceId) => {
    updateData((current) => ({ ...current, activeWorkspaceId: workspaceId }));
  };

  const createWorkspace = () => {
    const name = promptValue("Workspace name:", "New Workspace");
    if (!name) return;
    const workspaceId = uid("ws");
    updateData((current) => ({
      ...current,
      activeWorkspaceId: workspaceId,
      workspaces: [...current.workspaces, { id: workspaceId, name, description: "", createdAt: new Date().toISOString() }],
      activities: [...current.activities, logActivity({ message: `Workspace '${name}' created.` }, workspaceId)],
    }));
  };

  const addProject = (project) => {
    updateData((current) => ({
      ...current,
      projects: [...current.projects, { ...project, id: uid("p"), workspaceId: activeWorkspaceId }],
      activities: [...current.activities, logActivity({ message: `Project '${project.name}' created.` })],
    }));
  };

  const updateProject = (projectId, patch) => {
    updateData((current) => ({
      ...current,
      projects: current.projects.map((project) => (project.id === projectId ? { ...project, ...patch } : project)),
      activities: [...current.activities, logActivity({ message: `Project updated.` })],
    }));
  };

  const deleteProject = (projectId) => {
    updateData((current) => ({
      ...current,
      projects: current.projects.filter((project) => project.id !== projectId),
      tasks: current.tasks.filter((task) => task.projectId !== projectId),
      activities: [...current.activities, logActivity({ message: `Project deleted.` })],
    }));
  };

  const addTask = (task) => {
    updateData((current) => ({
      ...current,
      tasks: [...current.tasks, { ...task, id: uid("t"), workspaceId: activeWorkspaceId }],
      activities: [...current.activities, logActivity({ message: `Task '${task.title}' created.` })],
    }));
  };

  const updateTask = (taskId, patch) => {
    updateData((current) => ({
      ...current,
      tasks: current.tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task)),
      activities: [...current.activities, logActivity({ message: `Task updated.` })],
    }));
  };

  const deleteTask = (taskId) => {
    updateData((current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== taskId),
      activities: [...current.activities, logActivity({ message: `Task deleted.` })],
    }));
  };

  const addMember = (member) => {
    updateData((current) => ({
      ...current,
      members: [...current.members, { ...member, id: uid("m"), workspaceId: activeWorkspaceId }],
      activities: [...current.activities, logActivity({ message: `Member '${member.name}' added.` })],
    }));
  };

  const updateMember = (memberId, patch) => {
    updateData((current) => ({
      ...current,
      members: current.members.map((member) => (member.id === memberId ? { ...member, ...patch } : member)),
      activities: [...current.activities, logActivity({ message: `Member updated.` })],
    }));
  };

  const importDraftTasks = (drafts, projectId, assigneeId = "") => {
    const ready = drafts.map((draft) => ({
      id: uid("t"),
      workspaceId: activeWorkspaceId,
      projectId,
      title: draft.title,
      description: "Imported from AI helper",
      status: "Todo",
      priority: draft.priority || "Medium",
      assigneeId,
      dueDate: new Date().toISOString().slice(0, 10),
      effort: draft.effort || 2,
    }));

    updateData((current) => ({
      ...current,
      tasks: [...current.tasks, ...ready],
      activities: [...current.activities, logActivity({ message: `${ready.length} AI-generated task draft(s) imported.` })],
    }));
  };

  const resetDemoData = () => {
    updateData(seedData);
  };

  return {
    data,
    activeWorkspace,
    activeWorkspaceId,
    scopedProjects,
    scopedTasks,
    scopedMembers,
    scopedActivities,
    analytics,
    setActiveWorkspace,
    createWorkspace,
    addProject,
    updateProject,
    deleteProject,
    addTask,
    updateTask,
    deleteTask,
    addMember,
    updateMember,
    importDraftTasks,
    resetDemoData,
  };
}
