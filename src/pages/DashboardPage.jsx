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
<<<<<<< HEAD

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-5 gap-4 max-lg:grid-cols-2 max-md:grid-cols-1">
=======
  const isFreshWorkspace =
    store.scopedProjects.length === 0 &&
    store.scopedTasks.length === 0 &&
    store.scopedMembers.length <= 1;

  return (
    <div className="page-grid">
      <div className="metrics-grid">
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
        <MetricCard label="Projects" value={store.analytics.totalProjects} />
        <MetricCard label="Tasks" value={store.analytics.totalTasks} />
        <MetricCard label="Completion" value={`${store.analytics.completionRate}%`} tone="success" />
        <MetricCard label="Overdue" value={store.analytics.overdue} tone={store.analytics.overdue ? "danger" : "default"} />
        <MetricCard label="Team Size" value={store.analytics.teamSize} />
      </div>

<<<<<<< HEAD
=======
      {isFreshWorkspace ? (
        <SectionCard title="Team Created" subtitle="Your new workspace is ready">
          <div className="empty-state">
            This team is empty right now. Invite members from the Team page, then create your first project and task from the Projects page.
          </div>
        </SectionCard>
      ) : null}

>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
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

<<<<<<< HEAD
      <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        <SectionCard title="Task Status Breakdown" subtitle="A quick snapshot of workflow distribution">
          <div className="grid gap-3">
            {statusRows.map((row) => (
              <div key={row.status} className="flex justify-between gap-4 p-3 rounded-xl bg-slate-50">
=======
      <div className="two-col-grid">
        <SectionCard title="Task Status Breakdown" subtitle="A quick snapshot of workflow distribution">
          <div className="status-list">
            {statusRows.map((row) => (
              <div key={row.status} className="status-row">
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
                <span>{row.status}</span>
                <strong>{row.count}</strong>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Recent Activity" subtitle="Latest changes inside this workspace">
<<<<<<< HEAD
          <ul className="grid gap-3 list-none p-0 m-0">
            {store.scopedActivities.slice(0, 6).map((activity) => (
              <li key={activity.id} className="flex justify-between gap-4 p-2 rounded-xl bg-slate-50 items-start">
=======
          <ul className="activity-list compact-list">
            {store.scopedActivities.slice(0, 6).map((activity) => (
              <li key={activity.id}>
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
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
