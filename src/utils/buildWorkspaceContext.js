// Converts the current workspace data into a plain-text summary string.
// This string is injected into the AI system prompt so the model knows
// what projects, tasks, and team members exist in the workspace.
export function buildWorkspaceContext(workspace, projects, tasks, members) {
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  // Build a comma-separated list of team members with their roles.
  const memberNames = members
    .map((m) => `${m.name} (${m.role})`)
    .join(", ");

  // Build one line per project showing name, status, priority, and deadline.
  const projectLines = projects
    .map((p) => `  - ${p.name} [${p.status}, ${p.priority} priority, due ${p.endDate || "N/A"}]`)
    .join("\n");

  // Only include tasks that are not yet done — no point feeding Done tasks to the AI.
  const openTasks = tasks.filter((t) => t.status !== "Done");

  // Build one line per open task. Append [OVERDUE] if the due date is in the past.
  const taskLines = openTasks
    .map((t) => {
      const assignee = members.find((m) => m.id === t.assigneeId);
      const overdue = t.dueDate && t.dueDate < today ? " [OVERDUE]" : "";
      const planned = t.plannedStart && t.plannedEnd ? ` | planned ${t.plannedStart} -> ${t.plannedEnd}` : "";
      return `  - [${t.id}] ${t.title} | ${t.status} | ${t.priority} | due ${t.dueDate || "N/A"}${overdue}${planned} | Assignee: ${assignee?.name || "Unassigned"} | ${t.effort || 1}h`;
    })
    .join("\n");

  // Join all sections into a single multi-line string for the system prompt.
  return [
    `Workspace: ${workspace?.name || "Unknown"}`,
    `Team (${members.length} members): ${memberNames}`,
    `Projects (${projects.length}):`,
    projectLines || "  (none)",
    `Tasks (${openTasks.length} open):`,
    taskLines || "  (none)",
  ].join("\n");
}
