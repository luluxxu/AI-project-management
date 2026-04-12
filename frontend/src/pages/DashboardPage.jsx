import SimpleTable from "../components/SimpleTable";
import { groupTasksByStatus } from "../utils/analytics";
import { CheckCircle2Icon, ClockIcon, AlertTriangleIcon, FolderIcon, UsersIcon, ListTodoIcon } from "lucide-react";

const statusColor = {
  "Todo": "bg-slate-100 text-slate-600",
  "In Progress": "bg-sky-100 text-sky-700",
  "Done": "bg-emerald-100 text-emerald-700",
};

const priorityBadge = {
  High: "bg-rose-50 text-rose-700 border-rose-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Low: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function DashboardPage({ store }) {
  const statusRows = groupTasksByStatus(store.scopedTasks);
  const totalTasks = store.analytics.totalTasks || 1;

  const projectRows = store.scopedProjects.map((project) => ({
    ...project,
    taskCount: store.scopedTasks.filter((task) => task.projectId === project.id).length,
  }));

  const dueSoonNotifications = store.scopedNotifications.slice(0, 5);
  const recentActivities = store.scopedActivities.slice(0, 8);

  return (
    <div className="grid gap-3">
      {/* Metrics row */}
      <div className="grid grid-cols-5 gap-2.5 max-lg:grid-cols-3 max-md:grid-cols-2">
        {[
          { label: "Projects", value: store.analytics.totalProjects, icon: FolderIcon, color: "text-[#4C5C2D]", bg: "bg-[#4C5C2D]/8" },
          { label: "Tasks", value: store.analytics.totalTasks, icon: ListTodoIcon, color: "text-sky-600", bg: "bg-sky-50" },
          { label: "Completion", value: `${store.analytics.completionRate}%`, icon: CheckCircle2Icon, color: "text-emerald-600", bg: "bg-emerald-50", progress: store.analytics.completionRate },
          { label: "Overdue", value: store.analytics.overdue, icon: AlertTriangleIcon, color: store.analytics.overdue ? "text-rose-600" : "text-slate-400", bg: store.analytics.overdue ? "bg-rose-50" : "bg-slate-50" },
          { label: "Team", value: store.analytics.teamSize, icon: UsersIcon, color: "text-violet-600", bg: "bg-violet-50" },
        ].map((m) => (
          <div key={m.label} className="flex items-center gap-3 rounded-xl border border-white/70 bg-white/82 p-3.5 shadow-[0_4px_16px_rgba(148,163,184,0.08)] backdrop-blur-md">
            <div className={`rounded-lg p-2 ${m.bg}`}>
              <m.icon className={`size-4 ${m.color}`} />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-[#8a7d5e]">{m.label}</div>
              <div className="text-lg font-bold text-[#1B0C0C] leading-tight">{m.value}</div>
              {m.progress !== undefined && (
                <div className="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-[#f0e7c3]">
                  <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${Math.min(100, m.progress)}%` }} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Main content: two columns */}
      <div className="grid grid-cols-[1fr_320px] gap-3 max-lg:grid-cols-1">
        {/* Left column */}
        <div className="grid gap-3">
          {/* Projects table */}
          <section className="rounded-2xl border border-white/70 bg-white/82 p-4 shadow-[0_8px_24px_rgba(148,163,184,0.1)] backdrop-blur-md">
            <h2 className="mb-3 text-base font-semibold text-slate-900">
              Projects
              <span className="ml-2 text-sm font-normal text-slate-400">{projectRows.length}</span>
            </h2>
            <SimpleTable
              sortable
              columns={[
                { key: "name", label: "Name" },
                {
                  key: "status", label: "Status",
                  render: (row) => <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[row.status] || "bg-slate-100 text-slate-600"}`}>{row.status}</span>,
                },
                {
                  key: "priority", label: "Priority",
                  sortValue: (row) => ({ "High": 0, "Medium": 1, "Low": 2 }[row.priority] ?? 3),
                  render: (row) => <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${priorityBadge[row.priority] || ""}`}>{row.priority}</span>,
                },
                { key: "taskCount", label: "Tasks" },
                { key: "endDate", label: "Deadline" },
              ]}
              rows={projectRows}
              emptyLabel="No projects yet. Head to Projects to create one."
            />
          </section>

          {/* Due soon alerts */}
          {dueSoonNotifications.length > 0 && (
            <section className="rounded-2xl border border-white/70 bg-white/82 p-4 shadow-[0_8px_24px_rgba(148,163,184,0.1)] backdrop-blur-md">
              <h2 className="mb-3 text-base font-semibold text-slate-900">
                Due Soon
                <span className="ml-2 text-sm font-normal text-slate-400">{dueSoonNotifications.length}</span>
              </h2>
              <div className="grid gap-2">
                {dueSoonNotifications.map((n) => (
                  <div
                    key={n.id}
                    className={`flex items-start justify-between gap-3 rounded-xl border p-3 ${n.readAt ? "border-slate-100 bg-slate-50/50" : "border-amber-200/80 bg-amber-50/50"}`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <ClockIcon className={`size-3.5 shrink-0 ${n.readAt ? "text-slate-400" : "text-amber-600"}`} />
                        <span className="text-sm font-medium text-[#1B0C0C] truncate">{n.taskTitle}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-[#6c6346] leading-relaxed">{n.message}</p>
                      <div className="mt-1 flex gap-2 text-xs text-[#8a7d5e]">
                        {n.projectName && <span>{n.projectName}</span>}
                        {n.dueDate && <span>Due {n.dueDate}</span>}
                      </div>
                    </div>
                    {!n.readAt && (
                      <button
                        onClick={() => store.markNotificationRead(n.id)}
                        className="shrink-0 rounded-lg border border-[#ddd5be] px-2 py-1 text-xs text-[#6c6346] hover:bg-[#faf5e4] transition"
                      >
                        Read
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right sidebar column */}
        <div className="grid gap-3 content-start">
          {/* Task status breakdown */}
          <section className="rounded-2xl border border-white/70 bg-white/82 p-4 shadow-[0_8px_24px_rgba(148,163,184,0.1)] backdrop-blur-md">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Task Status</h2>
            <div className="grid gap-2">
              {statusRows.map((row) => (
                <div key={row.status} className="flex items-center gap-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[row.status] || ""}`}>{row.status}</span>
                  <div className="flex-1 h-2 overflow-hidden rounded-full bg-[#f0e7c3]">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${row.status === "Done" ? "bg-emerald-500" : row.status === "In Progress" ? "bg-sky-500" : "bg-slate-300"}`}
                      style={{ width: `${totalTasks ? (row.count / totalTasks) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-[#1B0C0C] w-6 text-right">{row.count}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Recent activity */}
          <section className="rounded-2xl border border-white/70 bg-white/82 p-4 shadow-[0_8px_24px_rgba(148,163,184,0.1)] backdrop-blur-md">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Recent Activity</h2>
            {recentActivities.length > 0 ? (
              <div className="grid gap-1">
                {recentActivities.map((a) => (
                  <div key={a.id} className="flex gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50/80 transition">
                    <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#4C5C2D]/40" />
                    <div className="min-w-0">
                      <p className="text-sm text-[#1B0C0C] leading-snug">{a.message}</p>
                      <time className="text-xs text-[#8a7d5e]">{new Date(a.createdAt).toLocaleString()}</time>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#8a7d5e]">No activity yet.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
