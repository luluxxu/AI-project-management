import SectionCard from "../components/SectionCard";
import MetricCard from "../components/MetricCard";
import SimpleTable from "../components/SimpleTable";
import { groupTasksByStatus } from "../utils/analytics";

export default function DashboardPage({ store }) {
  const statusRows = groupTasksByStatus(store.scopedTasks);
  const projectRows = store.scopedProjects.map((project) => ({
    ...project,
    tasks: store.scopedTasks.filter((task) => task.projectId === project.id).length,
  }));
  const isFreshWorkspace =
    store.scopedProjects.length === 0 &&
    store.scopedTasks.length === 0 &&
    store.scopedMembers.length <= 1;

  return (
    <div className="page-grid">
      <div className="metrics-grid">
        <MetricCard label="Projects" value={store.analytics.totalProjects} />
        <MetricCard label="Tasks" value={store.analytics.totalTasks} />
        <MetricCard label="Completion" value={`${store.analytics.completionRate}%`} tone="success" />
        <MetricCard label="Overdue" value={store.analytics.overdue} tone={store.analytics.overdue ? "danger" : "default"} />
        <MetricCard label="Team Size" value={store.analytics.teamSize} />
      </div>

      {isFreshWorkspace ? (
        <SectionCard title="Team Created" subtitle="Your new workspace is ready">
          <div className="empty-state">
            This team is empty right now. Invite members from the Team page, then create your first project and task from the Projects page.
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Project Overview" subtitle="Current workspace projects and progress">
        <SimpleTable
          columns={[
            { key: "name", label: "Project" },
            { key: "status", label: "Status" },
            { key: "priority", label: "Priority" },
            { key: "tasks", label: "Tasks" },
            { key: "endDate", label: "Deadline" },
          ]}
          rows={projectRows}
          emptyLabel="Create your first project from the Projects page."
        />
      </SectionCard>

      <div className="two-col-grid">
        <SectionCard title="Task Status Breakdown" subtitle="A quick snapshot of workflow distribution">
          <div className="status-list">
            {statusRows.map((row) => (
              <div key={row.status} className="status-row">
                <span>{row.status}</span>
                <strong>{row.count}</strong>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Recent Activity" subtitle="Latest changes inside this workspace">
          <ul className="activity-list compact-list">
            {store.scopedActivities.slice(0, 6).map((activity) => (
              <li key={activity.id}>
                <strong>{new Date(activity.createdAt).toLocaleString()}</strong>
                <span>{activity.message}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
