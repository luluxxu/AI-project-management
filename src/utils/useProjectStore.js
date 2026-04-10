<<<<<<< HEAD
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "./api";
import { getWorkspaceSnapshot } from "./analytics";

const promptValue = (message, fallback = "") => window.prompt(message, fallback)?.trim();

const norm = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    const camel = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
    out[camel] = value;
=======
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
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
  }
  return out;
};

export function useProjectStore() {
  const [workspaces, setWorkspaces] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [teamInvitations, setTeamInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
<<<<<<< HEAD
=======

  // Active workspace ID persisted in localStorage so it survives page refresh
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState(
    () => localStorage.getItem("taskpilot-active-ws") || ""
  );

<<<<<<< HEAD
=======
  // --- Load workspaces once on mount ---
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
  useEffect(() => {
    apiFetch("/workspaces")
      .then((list) => {
        const normalized = list.map(norm);
        setWorkspaces(normalized);
<<<<<<< HEAD
        const stored = localStorage.getItem("taskpilot-active-ws");
        const match = stored && normalized.find((workspace) => workspace.id === stored);
        if (!match && normalized.length > 0) {
=======
        // Auto-select first workspace if nothing stored
        const stored = localStorage.getItem("taskpilot-active-ws");
        if (!stored && normalized.length > 0) {
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
          setActiveWorkspaceIdState(normalized[0].id);
          localStorage.setItem("taskpilot-active-ws", normalized[0].id);
        }
      })
<<<<<<< HEAD
      .catch((eventualError) => setError(eventualError.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    apiFetch("/invitations")
      .then((list) => setInvitations(list.map(norm)))
      .catch(() => setInvitations([]));
=======
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // --- Load workspace data whenever the active workspace changes ---
  useEffect(() => {
    apiFetch("/invitations")
      .then((list) => setInvitations(list.map(norm)))
      .catch((e) => setError(e.message));
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
  }, []);

  useEffect(() => {
    if (!activeWorkspaceId) return;
<<<<<<< HEAD

    Promise.all([
      apiFetch(`/projects/${activeWorkspaceId}/projects`),
      apiFetch(`/tasks/${activeWorkspaceId}/tasks`),
      apiFetch(`/workspaces/${activeWorkspaceId}/members`),
      apiFetch(`/activities/${activeWorkspaceId}/activities`),
    ])
      .then(([projectList, taskList, memberList, activityList]) => {
        setProjects(projectList.map(norm));
        setTasks(taskList.map(norm));
        setMembers(memberList.map(norm));
        setActivities(activityList.map(norm));
      })
      .catch((eventualError) => setError(eventualError.message));
=======
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
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (!activeWorkspaceId) return;
<<<<<<< HEAD

=======
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
    apiFetch(`/workspaces/${activeWorkspaceId}/invitations`)
      .then((list) => setTeamInvitations(list.map(norm)))
      .catch(() => setTeamInvitations([]));
  }, [activeWorkspaceId]);

<<<<<<< HEAD
  const data = useMemo(
    () => ({
      workspaces,
      projects,
      tasks,
      members,
      activities,
      invitations,
      teamInvitations,
      activeWorkspaceId,
    }),
    [workspaces, projects, tasks, members, activities, invitations, teamInvitations, activeWorkspaceId]
  );

  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId) || workspaces[0];
  const resolvedId = activeWorkspace?.id || "";

  const scopedProjects = projects.filter((project) => project.workspaceId === resolvedId);
  const scopedTasks = tasks.filter((task) => task.workspaceId === resolvedId);
  const scopedMembers = members.filter((member) => member.workspaceId === resolvedId);
  const scopedActivities = [...activities]
    .filter((activity) => activity.workspaceId === resolvedId)
=======
  // Build the same `data` shape the pages expect (via store.data.workspaces etc.)
  const data = useMemo(
    () => ({ workspaces, projects, tasks, members, activities, invitations, teamInvitations, activeWorkspaceId }),
    [workspaces, projects, tasks, members, activities, invitations, teamInvitations, activeWorkspaceId]
  );

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];
  const resolvedId = activeWorkspace?.id || "";

  // Scoped to active workspace (server already scopes, but filter is harmless)
  const scopedProjects = projects.filter((p) => p.workspaceId === resolvedId);
  const scopedTasks = tasks.filter((t) => t.workspaceId === resolvedId);
  const scopedMembers = members.filter((m) => m.workspaceId === resolvedId);
  const scopedActivities = [...activities]
    .filter((a) => a.workspaceId === resolvedId)
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const scopedInvitations = [...teamInvitations]
    .filter((invite) => invite.workspaceId === resolvedId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const analytics = useMemo(
    () => getWorkspaceSnapshot(data, resolvedId),
    [data, resolvedId]
  );

<<<<<<< HEAD
  const logLocalActivity = (message) => {
    if (!resolvedId) return;
=======
  // Optimistically add a local activity so the Activity page updates immediately
  const logLocalActivity = (message) => {
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
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

<<<<<<< HEAD
  const requireWorkspace = () => {
    if (!resolvedId) {
      throw new Error("No workspace selected. Create or select a workspace first.");
    }
    return resolvedId;
  };

  const setActiveWorkspace = (workspaceId) => {
    setActiveWorkspaceIdState(workspaceId);
    localStorage.setItem("taskpilot-active-ws", workspaceId);
=======
  // --- Workspace actions ---
  const setActiveWorkspace = (wsId) => {
    setActiveWorkspaceIdState(wsId);
    localStorage.setItem("taskpilot-active-ws", wsId);
    // Clear stale data so the useEffect reload starts clean
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
    setProjects([]);
    setTasks([]);
    setMembers([]);
    setActivities([]);
    setTeamInvitations([]);
  };

  const createWorkspace = async () => {
    const name = promptValue("Workspace name:", "New Workspace");
    if (!name) return;
<<<<<<< HEAD

    setError(null);
    const workspace = norm(
      await apiFetch("/workspaces", {
        method: "POST",
        body: JSON.stringify({ name }),
      })
    );
    setWorkspaces((prev) => [...prev, workspace]);
    setActiveWorkspace(workspace.id);
  };

  const addProject = async (project) => {
    const workspaceId = requireWorkspace();
    const created = norm(
      await apiFetch(`/projects/${workspaceId}/projects`, {
=======
    setError(null);
    try {
      const ws = norm(
        await apiFetch("/workspaces", { method: "POST", body: JSON.stringify({ name }) })
      );
      setWorkspaces((prev) => [...prev, ws]);
      setActiveWorkspace(ws.id);
    } catch (e) {
      setError(e.message || "Unable to create workspace.");
      throw e;
    }
  };

  // --- Project actions ---
  const addProject = async (project) => {
    const p = norm(
      await apiFetch(`/projects/${resolvedId}/projects`, {
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
        method: "POST",
        body: JSON.stringify(project),
      })
    );
<<<<<<< HEAD
    setProjects((prev) => [...prev, created]);
=======
    setProjects((prev) => [...prev, p]);
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
    logLocalActivity(`Project '${project.name}' created.`);
  };

  const updateProject = async (projectId, patch) => {
<<<<<<< HEAD
    const updated = norm(
=======
    const p = norm(
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
      await apiFetch(`/projects/${projectId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      })
    );
<<<<<<< HEAD
    setProjects((prev) => prev.map((project) => (project.id === projectId ? updated : project)));
=======
    setProjects((prev) => prev.map((x) => (x.id === projectId ? p : x)));
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
    logLocalActivity("Project updated.");
  };

  const deleteProject = async (projectId) => {
    await apiFetch(`/projects/${projectId}`, { method: "DELETE" });
<<<<<<< HEAD
    setProjects((prev) => prev.filter((project) => project.id !== projectId));
    setTasks((prev) => prev.filter((task) => task.projectId !== projectId));
    logLocalActivity("Project deleted.");
  };

  const addTask = async (task) => {
    const workspaceId = requireWorkspace();
    const created = norm(
      await apiFetch(`/tasks/${workspaceId}/tasks`, {
=======
    setProjects((prev) => prev.filter((x) => x.id !== projectId));
    setTasks((prev) => prev.filter((x) => x.projectId !== projectId));
    logLocalActivity("Project deleted.");
  };

  // --- Task actions ---
  const addTask = async (task) => {
    const t = norm(
      await apiFetch(`/tasks/${resolvedId}/tasks`, {
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
        method: "POST",
        body: JSON.stringify(task),
      })
    );
<<<<<<< HEAD
    setTasks((prev) => [...prev, created]);
=======
    setTasks((prev) => [...prev, t]);
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
    logLocalActivity(`Task '${task.title}' created.`);
  };

  const updateTask = async (taskId, patch) => {
<<<<<<< HEAD
    const updated = norm(
=======
    const t = norm(
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
      await apiFetch(`/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      })
    );
<<<<<<< HEAD
    setTasks((prev) => prev.map((task) => (task.id === taskId ? updated : task)));
=======
    setTasks((prev) => prev.map((x) => (x.id === taskId ? t : x)));
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
    logLocalActivity("Task updated.");
  };

  const deleteTask = async (taskId) => {
    await apiFetch(`/tasks/${taskId}`, { method: "DELETE" });
<<<<<<< HEAD
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    logLocalActivity("Task deleted.");
  };

  const addMember = async (member) => {
    const workspaceId = requireWorkspace();
    const invite = norm(
      await apiFetch(`/workspaces/${workspaceId}/invitations`, {
=======
    setTasks((prev) => prev.filter((x) => x.id !== taskId));
    logLocalActivity("Task deleted.");
  };

  // --- Member actions ---
  const addMember = async (member) => {
    const invite = norm(
      await apiFetch(`/workspaces/${resolvedId}/invitations`, {
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
        method: "POST",
        body: JSON.stringify(member),
      })
    );
    setTeamInvitations((prev) => [invite, ...prev]);
    logLocalActivity(`Invitation sent to '${invite.invitedName}'.`);
    return invite;
  };

<<<<<<< HEAD
  const inviteMember = async (email, role = "Member") => {
    const workspaceId = requireWorkspace();
    const invited = norm(
      await apiFetch(`/workspaces/${workspaceId}/members`, {
        method: "POST",
        body: JSON.stringify({ email, role }),
      })
    );
    setMembers((prev) => [...prev, { ...invited, workspaceId }]);
    logLocalActivity(`${invited.name || email} was added to the workspace.`);
    return invited;
  };

  const updateMember = async (memberId, patch) => {
    const updated = norm(
=======
  const updateMember = async (memberId, patch) => {
    const m = norm(
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
      await apiFetch(`/members/${memberId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      })
    );
<<<<<<< HEAD
    setMembers((prev) => prev.map((member) => (member.id === memberId ? { ...member, ...updated } : member)));
    logLocalActivity("Member updated.");
  };

  const updateMemberRole = async (userId, role) => {
    const workspaceId = requireWorkspace();
    const updated = norm(
      await apiFetch(`/workspaces/${workspaceId}/members/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      })
    );
    setMembers((prev) =>
      prev.map((member) =>
        member.userId === userId || member.id === updated.id ? { ...member, ...updated, workspaceId } : member
      )
    );
    logLocalActivity("Member role updated.");
  };

  const removeMember = async (identifier) => {
    const workspaceId = requireWorkspace();
    const member = scopedMembers.find((entry) => entry.id === identifier || entry.userId === identifier);

    if (member?.userId) {
      await apiFetch(`/workspaces/${workspaceId}/members/${member.userId}`, { method: "DELETE" });
      setMembers((prev) => prev.filter((entry) => entry.userId !== member.userId));
    } else {
      await apiFetch(`/members/${identifier}`, { method: "DELETE" });
      setMembers((prev) => prev.filter((entry) => entry.id !== identifier));
    }

=======
    setMembers((prev) => prev.map((x) => (x.id === memberId ? m : x)));
    logLocalActivity("Member updated.");
  };

  const removeMember = async (memberId) => {
    await apiFetch(`/members/${memberId}`, { method: "DELETE" });
    setMembers((prev) => prev.filter((member) => member.id !== memberId));
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
    logLocalActivity("Member removed.");
  };

  const respondToInvitation = async (invitationId, action) => {
    const response = norm(
      await apiFetch(`/invitations/${invitationId}/respond`, {
        method: "POST",
        body: JSON.stringify({ action }),
      })
    );

    setInvitations((prev) =>
      prev.map((invite) => (invite.id === invitationId ? { ...invite, ...response } : invite))
    );

<<<<<<< HEAD
    const nextWorkspaces = (await apiFetch("/workspaces")).map(norm);
    setWorkspaces(nextWorkspaces);

    if (action === "accept") {
      const nextInvitations = (await apiFetch("/invitations")).map(norm);
      setInvitations(nextInvitations);
      if (!resolvedId && nextWorkspaces.length > 0) {
        setActiveWorkspace(nextWorkspaces[0].id);
=======
    const nextWorkspaces = await apiFetch("/workspaces");
    setWorkspaces(nextWorkspaces.map(norm));

    if (action === "accept") {
      const allInvitations = await apiFetch("/invitations");
      setInvitations(allInvitations.map(norm));

      if (!resolvedId && nextWorkspaces.length > 0) {
        setActiveWorkspace(norm(nextWorkspaces[0]).id);
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
      }
    }

    return response;
  };

<<<<<<< HEAD
  const importDraftTasks = async (drafts, projectId, assigneeId = "") => {
    const workspaceId = requireWorkspace();
    const createdTasks = await Promise.all(
      drafts.map((draft) =>
        apiFetch(`/tasks/${workspaceId}/tasks`, {
=======
  // Import multiple AI-drafted tasks into the active project
  const importDraftTasks = async (drafts, projectId, assigneeId = "") => {
    const newTasks = await Promise.all(
      drafts.map((draft) =>
        apiFetch(`/tasks/${resolvedId}/tasks`, {
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
          method: "POST",
          body: JSON.stringify({
            projectId,
            title: draft.title,
<<<<<<< HEAD
            description: draft.description || "Imported from AI helper",
=======
            description: "Imported from AI helper",
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
            status: "Todo",
            priority: draft.priority || "Medium",
            assigneeId,
            dueDate: new Date().toISOString().slice(0, 10),
            effort: draft.effort || 2,
          }),
        }).then(norm)
      )
    );
<<<<<<< HEAD
    setTasks((prev) => [...prev, ...createdTasks]);
    logLocalActivity(`${createdTasks.length} AI-generated task draft(s) imported.`);
  };

=======
    setTasks((prev) => [...prev, ...newTasks]);
    logLocalActivity(`${newTasks.length} AI-generated task draft(s) imported.`);
  };

  // With a real backend, "reset demo" just reloads from server
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
  const resetDemoData = () => window.location.reload();

  return {
    data,
    activeWorkspace,
    activeWorkspaceId: resolvedId,
    scopedProjects,
    scopedTasks,
    scopedMembers,
    scopedActivities,
    scopedInvitations,
    invitations,
    teamInvitations,
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
<<<<<<< HEAD
    inviteMember,
    updateMember,
    updateMemberRole,
=======
    updateMember,
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
    removeMember,
    respondToInvitation,
    importDraftTasks,
    resetDemoData,
  };
}
