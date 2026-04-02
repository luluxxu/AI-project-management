import SectionCard from "../components/SectionCard";

export default function CalendarPage({ store }) {
  const sorted = [...store.scopedTasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <div className="page-grid">
      <SectionCard title="Deadline Calendar" subtitle="Simple timeline view grouped by due date">
        <div className="calendar-list">
          {sorted.length === 0 ? (
            <div className="empty-state">No tasks yet.</div>
          ) : (
            sorted.map((task) => {
              const project = store.scopedProjects.find((project) => project.id === task.projectId);
              const assignee = store.scopedMembers.find((member) => member.id === task.assigneeId);
              return (
                <div key={task.id} className="calendar-item">
                  <div>
                    <strong>{task.dueDate}</strong>
                    <p>{task.title}</p>
                    <span className="muted">{project?.name || "Unknown project"}</span>
                  </div>
                  <div className="calendar-meta">
                    <span>{task.priority}</span>
                    <span>{task.status}</span>
                    <span>{assignee?.name || "Unassigned"}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </SectionCard>
    </div>
  );
}
