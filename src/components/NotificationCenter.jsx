import { useMemo, useState } from "react";
import { Bell, BellRing, CalendarClock, CheckCheck } from "lucide-react";

const typeLabel = {
  due_3_days: "Due in 3 days",
  due_1_day: "Due tomorrow",
  due_today: "Due today",
};

export default function NotificationCenter({ notifications, unreadCount, onMarkRead }) {
  const [open, setOpen] = useState(false);

  const visibleNotifications = useMemo(
    () => [...notifications].slice(0, 8),
    [notifications]
  );

  return (
    <div className="relative">
      <button
        type="button"
        className="relative flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-blue-200 hover:shadow-md"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label="Open notifications"
      >
        {unreadCount > 0 ? <BellRing className="size-5 text-amber-500" /> : <Bell className="size-5 text-slate-500" />}
        <span className="text-sm font-semibold text-slate-700">Notifications</span>
        <span className={`inline-flex min-w-6 justify-center rounded-full px-2 py-1 text-xs font-bold ${unreadCount > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
          {unreadCount}
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.75rem)] z-20 w-[min(92vw,26rem)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="m-0 text-base font-bold text-slate-900">Task reminders</h2>
              <p className="m-0 text-sm text-slate-500">Upcoming deadlines for unfinished work.</p>
            </div>
            {unreadCount > 0 ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                {unreadCount} unread
              </span>
            ) : null}
          </div>

          <div className="max-h-[28rem] overflow-y-auto p-3">
            {visibleNotifications.length > 0 ? (
              <ul className="m-0 grid list-none gap-3 p-0">
                {visibleNotifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`rounded-2xl border p-4 ${notification.readAt ? "border-slate-200 bg-slate-50" : "border-amber-200 bg-amber-50/70"}`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <CalendarClock className="mt-0.5 size-4 text-slate-500" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {typeLabel[notification.type] || "Upcoming task"}
                        </span>
                      </div>
                      {!notification.readAt ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
                          onClick={() => onMarkRead(notification.id)}
                        >
                          <CheckCheck className="size-3.5" />
                          Mark read
                        </button>
                      ) : null}
                    </div>

                    <p className="mb-2 mt-0 text-sm font-semibold text-slate-900">{notification.taskTitle}</p>
                    <p className="m-0 text-sm text-slate-600">{notification.message}</p>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                      {notification.projectName ? (
                        <span className="rounded-full bg-white px-2.5 py-1">{notification.projectName}</span>
                      ) : null}
                      {notification.workspaceName ? (
                        <span className="rounded-full bg-white px-2.5 py-1">{notification.workspaceName}</span>
                      ) : null}
                      {notification.dueDate ? (
                        <span className="rounded-full bg-white px-2.5 py-1">
                          Due {new Date(`${notification.dueDate}T00:00:00`).toLocaleDateString()}
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                No approaching task reminders right now.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
