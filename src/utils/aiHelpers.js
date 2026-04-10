const priorityScore = { High: 3, Medium: 2, Low: 1 };
const statusScore = { Todo: 2, "In Progress": 1, Done: 0 };

export function extractTasksFromText(text) {
  return text
    .split(/\n|\.|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.length > 4)
    .slice(0, 8)
    .map((line, index) => ({
      id: `draft-${index + 1}`,
      title: line.replace(/^[-*]\s*/, ""),
      priority: /urgent|asap|critical|high/i.test(line)
        ? "High"
        : /later|nice to have|low/i.test(line)
        ? "Low"
        : "Medium",
      effort: /research|design|plan/i.test(line) ? 2 : /build|implement|develop/i.test(line) ? 4 : 3,
    }));
}

export function generateDailyPlan(tasks) {
  return [...tasks]
    .filter((task) => task.status !== "Done")
    .sort((a, b) => {
<<<<<<< HEAD
      const dueCompare = (a.dueDate || "").localeCompare(b.dueDate || "");
=======
      const dueCompare = a.dueDate.localeCompare(b.dueDate);
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
      if (dueCompare !== 0) return dueCompare;
      const priorityCompare = priorityScore[b.priority] - priorityScore[a.priority];
      if (priorityCompare !== 0) return priorityCompare;
      return statusScore[b.status] - statusScore[a.status];
    })
    .slice(0, 5)
    .map((task, index) => ({
      rank: index + 1,
      title: task.title,
      reason: `${task.priority} priority · due ${task.dueDate} · ${task.effort || 1}h estimate`,
    }));
}
