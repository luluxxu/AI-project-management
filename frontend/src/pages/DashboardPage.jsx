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
  const dueSoonNotifications = store.scopedNotifications.slice(0, 4);

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-5 gap-4 max-lg:grid-cols-2 max-md:grid-cols-1">
        <MetricCard label="Projects" value={store.analytics.totalProjects} />
        <MetricCard label="Tasks" value={store.analytics.totalTasks} />
        <MetricCard
          label="Completion"
          value={`${store.analytics.completionRate}%`}
          tone="success"
          progress={store.analytics.completionRate}
        />
        <MetricCard label="Overdue" value={store.analytics.overdue} tone={store.analytics.overdue ? "danger" : "default"} />
        <MetricCard label="Team Size" value={store.analytics.teamSize} />
      </div>

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

      <SectionCard title="Due Soon Alerts" subtitle="Unfinished tasks that are approaching their deadlines">
        {dueSoonNotifications.length > 0 ? (
          <ul className="grid gap-3 list-none p-0 m-0">
            {dueSoonNotifications.map((notification) => (
              <li
                key={notification.id}
                className={`flex flex-col gap-2 rounded-xl border p-4 ${notification.readAt ? "border-slate-200 bg-slate-50" : "border-amber-200 bg-amber-50/70"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <strong>{notification.taskTitle}</strong>
                  {!notification.readAt ? (
                    <button type="button" onClick={() => store.markNotificationRead(notification.id)}>
                      Mark read
                    </button>
                  ) : null}
                </div>
                <span className="text-slate-600">{notification.message}</span>
                <div className="flex flex-wrap gap-2 text-sm text-slate-500">
                  {notification.projectName ? <span>{notification.projectName}</span> : null}
                  {notification.dueDate ? (
                    <span>Due {new Date(`${notification.dueDate}T00:00:00`).toLocaleDateString()}</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500 m-0">No task reminders are due yet for this workspace.</p>
        )}
      </SectionCard>

      <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        <SectionCard title="Task Status Breakdown" subtitle="A quick snapshot of workflow distribution">
          <div className="grid gap-3">
            {statusRows.map((row) => (
              <div key={row.status} className="flex justify-between gap-4 p-3 rounded-xl bg-slate-50">
                <span>{row.status}</span>
                <strong>{row.count}</strong>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Recent Activity" subtitle="Latest changes inside this workspace">
          <ul className="grid gap-3 list-none p-0 m-0">
            {store.scopedActivities.slice(0, 6).map((activity) => (
              <li key={activity.id} className="flex justify-between gap-4 p-2 rounded-xl bg-slate-50 items-start">
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
