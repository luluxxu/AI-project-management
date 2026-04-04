const today = new Date();
const addDays = (days) => {
  const copy = new Date(today);
  copy.setDate(copy.getDate() + days);
  return copy.toISOString().slice(0, 10);
};

export const seedData = {
  activeWorkspaceId: "ws-1",
  workspaces: [
    {
      id: "ws-1",
      name: "Mobile App Development",
      description: "Course demo workspace",
      createdAt: new Date().toISOString(),
    },
  ],
  members: [
    { id: "m-1", workspaceId: "ws-1", name: "Qiaowen Mei", role: "Owner", email: "qiaowen@example.com" },
    { id: "m-2", workspaceId: "ws-1", name: "Lu Xu", role: "Admin", email: "lu@example.com" },
    { id: "m-3", workspaceId: "ws-1", name: "Jiayu Li", role: "Member", email: "jiayu@example.com" },
    { id: "m-4", workspaceId: "ws-1", name: "Jinsha Lu", role: "Member", email: "jinsha@example.com" },
  ],
  projects: [
    {
      id: "p-1",
      workspaceId: "ws-1",
      name: "iOS App Launch",
      description: "Plan and ship the first app release.",
      status: "Active",
      priority: "High",
      startDate: addDays(-5),
      endDate: addDays(15),
    },
    {
      id: "p-2",
      workspaceId: "ws-1",
      name: "QA Automation",
      description: "Improve release quality and regression coverage.",
      status: "Planning",
      priority: "Medium",
      startDate: addDays(1),
      endDate: addDays(30),
    },
  ],
  tasks: [
    {
      id: "t-1",
      workspaceId: "ws-1",
      projectId: "p-1",
      title: "Design app icon",
      description: "Create final icon variants for app store submission.",
      status: "Done",
      priority: "Medium",
      assigneeId: "m-2",
      dueDate: addDays(-1),
      effort: 2,
    },
    {
      id: "t-2",
      workspaceId: "ws-1",
      projectId: "p-1",
      title: "Implement login feature",
      description: "Build email/password flow and error handling.",
      status: "In Progress",
      priority: "High",
      assigneeId: "m-1",
      dueDate: addDays(2),
      effort: 5,
    },
    {
      id: "t-3",
      workspaceId: "ws-1",
      projectId: "p-1",
      title: "Write unit tests",
      description: "Add authentication and API tests.",
      status: "Todo",
      priority: "Medium",
      assigneeId: "m-3",
      dueDate: addDays(4),
      effort: 3,
    },
    {
      id: "t-4",
      workspaceId: "ws-1",
      projectId: "p-2",
      title: "Define regression checklist",
      description: "List smoke tests for core user flows.",
      status: "Todo",
      priority: "Low",
      assigneeId: "m-4",
      dueDate: addDays(7),
      effort: 2,
    },
  ],
  activities: [
    {
      id: "a-1",
      workspaceId: "ws-1",
      message: "Workspace created and demo data loaded.",
      createdAt: new Date().toISOString(),
    },
  ],
};
