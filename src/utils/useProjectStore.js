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
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState(
    () => localStorage.getItem("taskpilot-active-ws") || ""
  );

  useEffect(() => {
    apiFetch("/workspaces")
      .then((list) => {
        const normalized = list.map(norm);
        setWorkspaces(normalized);
        const stored = localStorage.getItem("taskpilot-active-ws");
        const match = stored && normalized.find((workspace) => workspace.id === stored);
        if (!match && normalized.length > 0) {
          setActiveWorkspaceIdState(normalized[0].id);
          localStorage.setItem("taskpilot-active-ws", normalized[0].id);
        }
      })
      .catch((eventualError) => setError(eventualError.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    apiFetch("/invitations")
      .then((list) => setInvitations(list.map(norm)))
      .catch(() => setInvitations([]));
  }, []);

  useEffect(() => {
    if (!activeWorkspaceId) return;

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
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (!activeWorkspaceId) return;

    apiFetch(`/workspaces/${activeWorkspaceId}/invitations`)
      .then((list) => setTeamInvitations(list.map(norm)))
      .catch(() => setTeamInvitations([]));
  }, [activeWorkspaceId]);

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
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const scopedInvitations = [...teamInvitations]
    .filter((invite) => invite.workspaceId === resolvedId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const analytics = useMemo(
    () => getWorkspaceSnapshot(data, resolvedId),
    [data, resolvedId]
  );

  const logLocalActivity = (message) => {
    if (!resolvedId) return;
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

  const requireWorkspace = () => {
    if (!resolvedId) {
      throw new Error("No workspace selected. Create or select a workspace first.");
    }
    return resolvedId;
  };

  const setActiveWorkspace = (workspaceId) => {
    setActiveWorkspaceIdState(workspaceId);
    localStorage.setItem("taskpilot-active-ws", workspaceId);
    setProjects([]);
    setTasks([]);
    setMembers([]);
    setActivities([]);
    setTeamInvitations([]);
  };

  const createWorkspace = async () => {
    const name = promptValue("Workspace name:", "New Workspace");
    if (!name) return;

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
        method: "POST",
        body: JSON.stringify(project),
      })
    );
    setProjects((prev) => [...prev, created]);
    logLocalActivity(`Project '${project.name}' created.`);
  };

  const updateProject = async (projectId, patch) => {
    const updated = norm(
      await apiFetch(`/projects/${projectId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      })
    );
    setProjects((prev) => prev.map((project) => (project.id === projectId ? updated : project)));
    logLocalActivity("Project updated.");
  };

  const deleteProject = async (projectId) => {
    await apiFetch(`/projects/${projectId}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((project) => project.id !== projectId));
    setTasks((prev) => prev.filter((task) => task.projectId !== projectId));
    logLocalActivity("Project deleted.");
  };

  const addTask = async (task) => {
    const workspaceId = requireWorkspace();
    const created = norm(
      await apiFetch(`/tasks/${workspaceId}/tasks`, {
        method: "POST",
        body: JSON.stringify(task),
      })
    );
    setTasks((prev) => [...prev, created]);
    logLocalActivity(`Task '${task.title}' created.`);
  };

  const updateTask = async (taskId, patch) => {
    const updated = norm(
      await apiFetch(`/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      })
    );
    setTasks((prev) => prev.map((task) => (task.id === taskId ? updated : task)));
    logLocalActivity("Task updated.");
  };

  const deleteTask = async (taskId) => {
    await apiFetch(`/tasks/${taskId}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    logLocalActivity("Task deleted.");
  };

  const addMember = async (member) => {
    const workspaceId = requireWorkspace();
    const invite = norm(
      await apiFetch(`/workspaces/${workspaceId}/invitations`, {
        method: "POST",
        body: JSON.stringify(member),
      })
    );
    setTeamInvitations((prev) => [invite, ...prev]);
    logLocalActivity(`Invitation sent to '${invite.invitedName}'.`);
    return invite;
  };

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
      await apiFetch(`/members/${memberId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      })
    );
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

    const nextWorkspaces = (await apiFetch("/workspaces")).map(norm);
    setWorkspaces(nextWorkspaces);

    if (action === "accept") {
      const nextInvitations = (await apiFetch("/invitations")).map(norm);
      setInvitations(nextInvitations);
      if (!resolvedId && nextWorkspaces.length > 0) {
        setActiveWorkspace(nextWorkspaces[0].id);
      }
    }

    return response;
  };

  const importDraftTasks = async (drafts, projectId, assigneeId = "") => {
    const workspaceId = requireWorkspace();
    const createdTasks = await Promise.all(
      drafts.map((draft) =>
        apiFetch(`/tasks/${workspaceId}/tasks`, {
          method: "POST",
          body: JSON.stringify({
            projectId,
            title: draft.title,
            description: draft.description || "Imported from AI helper",
            status: "Todo",
            priority: draft.priority || "Medium",
            assigneeId,
            dueDate: new Date().toISOString().slice(0, 10),
            effort: draft.effort || 2,
          }),
        }).then(norm)
      )
    );
    setTasks((prev) => [...prev, ...createdTasks]);
    logLocalActivity(`${createdTasks.length} AI-generated task draft(s) imported.`);
  };

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
    inviteMember,
    updateMember,
    updateMemberRole,
    removeMember,
    respondToInvitation,
    importDraftTasks,
    resetDemoData,
  };
}
