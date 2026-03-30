// useProjectStore: same return interface as before, but backed by REST API instead of localStorage
import { useEffect, useState, useMemo } from "react";
import { apiFetch } from "./api";
import { getWorkspaceSnapshot } from "./analytics";

const promptValue = (msg, fb = "") => window.prompt(msg, fb)?.trim();

// Convert snake_case keys from server responses to camelCase for frontend use
// e.g. workspace_id → workspaceId, due_date → dueDate
const norm = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = v;
  }
  return out;
};

export function useProjectStore() {
  const [workspaces, setWorkspaces] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active workspace ID persisted in localStorage so it survives page refresh
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState(
    () => localStorage.getItem("taskpilot-active-ws") || ""
  );

  // --- Load workspaces once on mount ---
  useEffect(() => {
    apiFetch("/workspaces")
      .then((list) => {
        const normalized = list.map(norm);
        setWorkspaces(normalized);
        // Auto-select first workspace if nothing stored
        const stored = localStorage.getItem("taskpilot-active-ws");
        if (!stored && normalized.length > 0) {
          setActiveWorkspaceIdState(normalized[0].id);
          localStorage.setItem("taskpilot-active-ws", normalized[0].id);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // --- Load workspace data whenever the active workspace changes ---
  useEffect(() => {
    if (!activeWorkspaceId) return;
    Promise.all([
      apiFetch(`/projects/${activeWorkspaceId}/projects`),
      apiFetch(`/tasks/${activeWorkspaceId}/tasks`),
      apiFetch(`/members/${activeWorkspaceId}/members`),
      apiFetch(`/activities/${activeWorkspaceId}/activities`),
    ])
      .then(([proj, tsk, mem, act]) => {
        setProjects(proj.map(norm));
        setTasks(tsk.map(norm));
        setMembers(mem.map(norm));
        setActivities(act.map(norm));
      })
      .catch((e) => setError(e.message));
  }, [activeWorkspaceId]);

  // Build the same `data` shape the pages expect (via store.data.workspaces etc.)
  const data = useMemo(
    () => ({ workspaces, projects, tasks, members, activities, activeWorkspaceId }),
    [workspaces, projects, tasks, members, activities, activeWorkspaceId]
  );

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];
  const resolvedId = activeWorkspace?.id || "";

  // Scoped to active workspace (server already scopes, but filter is harmless)
  const scopedProjects = projects.filter((p) => p.workspaceId === resolvedId);
  const scopedTasks = tasks.filter((t) => t.workspaceId === resolvedId);
  const scopedMembers = members.filter((m) => m.workspaceId === resolvedId);
  const scopedActivities = [...activities]
    .filter((a) => a.workspaceId === resolvedId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const analytics = useMemo(
    () => getWorkspaceSnapshot(data, resolvedId),
    [data, resolvedId]
  );

  // Optimistically add a local activity so the Activity page updates immediately
  const logLocalActivity = (message) => {
    setActivities((prev) => [
      {
        id: `a-${crypto.randomUUID().slice(0, 8)}`,
        workspaceId: resolvedId,
        message,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  // --- Workspace actions ---
  const setActiveWorkspace = (wsId) => {
    setActiveWorkspaceIdState(wsId);
    localStorage.setItem("taskpilot-active-ws", wsId);
    // Clear stale data so the useEffect reload starts clean
    setProjects([]);
    setTasks([]);
    setMembers([]);
    setActivities([]);
  };

  const createWorkspace = async () => {
    const name = promptValue("Workspace name:", "New Workspace");
    if (!name) return;
    const ws = norm(
      await apiFetch("/workspaces", { method: "POST", body: JSON.stringify({ name }) })
    );
    setWorkspaces((prev) => [...prev, ws]);
    setActiveWorkspace(ws.id);
  };

  // --- Project actions ---
  const addProject = async (project) => {
    const p = norm(
      await apiFetch(`/projects/${resolvedId}/projects`, {
        method: "POST",
        body: JSON.stringify(project),
      })
    );
    setProjects((prev) => [...prev, p]);
    logLocalActivity(`Project '${project.name}' created.`);
  };

  const updateProject = async (projectId, patch) => {
    const p = norm(
      await apiFetch(`/projects/${projectId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      })
    );
    setProjects((prev) => prev.map((x) => (x.id === projectId ? p : x)));
    logLocalActivity("Project updated.");
  };

  const deleteProject = async (projectId) => {
    await apiFetch(`/projects/${projectId}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((x) => x.id !== projectId));
    setTasks((prev) => prev.filter((x) => x.projectId !== projectId));
    logLocalActivity("Project deleted.");
  };

  // --- Task actions ---
  const addTask = async (task) => {
    const t = norm(
      await apiFetch(`/tasks/${resolvedId}/tasks`, {
        method: "POST",
        body: JSON.stringify(task),
      })
    );
    setTasks((prev) => [...prev, t]);
    logLocalActivity(`Task '${task.title}' created.`);
  };

  const updateTask = async (taskId, patch) => {
    const t = norm(
      await apiFetch(`/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      })
    );
    setTasks((prev) => prev.map((x) => (x.id === taskId ? t : x)));
    logLocalActivity("Task updated.");
  };

  const deleteTask = async (taskId) => {
    await apiFetch(`/tasks/${taskId}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((x) => x.id !== taskId));
    logLocalActivity("Task deleted.");
  };

  // --- Member actions ---
  const addMember = async (member) => {
    const m = norm(
      await apiFetch(`/members/${resolvedId}/members`, {
        method: "POST",
        body: JSON.stringify(member),
      })
    );
    setMembers((prev) => [...prev, m]);
    logLocalActivity(`Member '${member.name}' added.`);
  };

  const updateMember = async (memberId, patch) => {
    const m = norm(
      await apiFetch(`/members/${memberId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      })
    );
    setMembers((prev) => prev.map((x) => (x.id === memberId ? m : x)));
    logLocalActivity("Member updated.");
  };

  // Import multiple AI-drafted tasks into the active project
  const importDraftTasks = async (drafts, projectId, assigneeId = "") => {
    const newTasks = await Promise.all(
      drafts.map((draft) =>
        apiFetch(`/tasks/${resolvedId}/tasks`, {
          method: "POST",
          body: JSON.stringify({
            projectId,
            title: draft.title,
            description: "Imported from AI helper",
            status: "Todo",
            priority: draft.priority || "Medium",
            assigneeId,
            dueDate: new Date().toISOString().slice(0, 10),
            effort: draft.effort || 2,
          }),
        }).then(norm)
      )
    );
    setTasks((prev) => [...prev, ...newTasks]);
    logLocalActivity(`${newTasks.length} AI-generated task draft(s) imported.`);
  };

  // With a real backend, "reset demo" just reloads from server
  const resetDemoData = () => window.location.reload();

  return {
    data,
    activeWorkspace,
    activeWorkspaceId: resolvedId,
    scopedProjects,
    scopedTasks,
    scopedMembers,
    scopedActivities,
    analytics,
    loading,
    error,
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
