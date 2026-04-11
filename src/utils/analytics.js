export function getWorkspaceSnapshot(data, workspaceId) {
  const projects = data.projects.filter((project) => project.workspaceId === workspaceId && !project.archivedAt);
  const tasks = data.tasks.filter((task) => task.workspaceId === workspaceId && !task.archivedAt);
  const members = data.members.filter((member) => member.workspaceId === workspaceId);
  const done = tasks.filter((task) => task.status === "Done").length;
  const overdue = tasks.filter((task) => task.status !== "Done" && task.dueDate < new Date().toISOString().slice(0, 10)).length;

  return {
    totalProjects: projects.length,
    totalTasks: tasks.length,
    teamSize: members.length,
    completionRate: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
    overdue,
  };
}

export function groupTasksByStatus(tasks) {
  return ["Todo", "In Progress", "Done"].map((status) => ({
    status,
    count: tasks.filter((task) => task.status === status).length,
  }));
}
