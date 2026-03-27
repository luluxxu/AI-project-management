export function buildWorkspaceContext(workspace, projects, tasks, members) {
  const today = new Date().toISOString().slice(0, 10);

  const memberNames = members
    .map((m) => `${m.name} (${m.role})`)
    .join(", ");

  const projectLines = projects
    .map((p) => `  - ${p.name} [${p.status}, ${p.priority} priority, due ${p.endDate || "N/A"}]`)
    .join("\n");

  const openTasks = tasks.filter((t) => t.status !== "Done");
  const taskLines = openTasks
    .map((t) => {
      const assignee = members.find((m) => m.id === t.assigneeId);
      const overdue = t.dueDate && t.dueDate < today ? " [OVERDUE]" : "";
      return `  - [${t.id}] ${t.title} | ${t.status} | ${t.priority} | due ${t.dueDate || "N/A"}${overdue} | Assignee: ${assignee?.name || "Unassigned"} | ${t.effort || 1}h`;
    })
    .join("\n");

  return [
    `Workspace: ${workspace?.name || "Unknown"}`,
    `Team (${members.length} members): ${memberNames}`,
    `Projects (${projects.length}):`,
    projectLines || "  (none)",
    `Tasks (${openTasks.length} open):`,
    taskLines || "  (none)",
  ].join("\n");
}
