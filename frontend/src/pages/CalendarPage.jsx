import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfToday,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon, AlertTriangleIcon, ClockIcon } from "lucide-react";

const priorityDot = { High: "bg-rose-500", Medium: "bg-amber-400", Low: "bg-emerald-500" };
const priorityBadge = { High: "bg-rose-50 text-rose-700 border-rose-200", Medium: "bg-amber-50 text-amber-700 border-amber-200", Low: "bg-emerald-50 text-emerald-700 border-emerald-200" };
const statusBadge = { Done: "bg-emerald-100 text-emerald-700", "In Progress": "bg-sky-100 text-sky-700", Todo: "bg-slate-100 text-slate-600" };

function buildCalendarDays(month) {
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  const days = [];
  let current = gridStart;
  while (current <= gridEnd) { days.push(current); current = addDays(current, 1); }
  return days;
}

export default function CalendarPage({ store }) {
  const today = startOfToday();
  const [currentMonth, setCurrentMonth] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);

  const taskRows = useMemo(
    () =>
      store.scopedTasks
        .filter((t) => t.dueDate)
        .map((t) => {
          const dueDate = parseISO(t.dueDate);
          const project = store.scopedProjects.find((p) => p.id === t.projectId);
          const assignee = store.scopedMembers.find((m) => (m.userId || m.id) === t.assigneeId);
          return { ...t, dueDateObj: dueDate, projectName: project?.name || "", assigneeName: assignee?.name || "Unassigned" };
        })
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title)),
    [store.scopedMembers, store.scopedProjects, store.scopedTasks]
  );

  const tasksByDate = useMemo(() => {
    const grouped = new Map();
    taskRows.forEach((t) => { const key = format(t.dueDateObj, "yyyy-MM-dd"); const list = grouped.get(key) || []; list.push(t); grouped.set(key, list); });
    return grouped;
  }, [taskRows]);

  const calendarDays = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);
  const selectedKey = format(selectedDate, "yyyy-MM-dd");
  const selectedTasks = tasksByDate.get(selectedKey) || [];

  const upcomingTasks = taskRows.filter((t) => t.status !== "Done" && !isBefore(t.dueDateObj, today)).slice(0, 6);
  const overdueTasks = taskRows.filter((t) => t.status !== "Done" && isBefore(t.dueDateObj, today));

  return (
    <div className="grid gap-3">
      {/* Calendar */}
      <section className="rounded-2xl border border-white/70 bg-white/82 p-4 shadow-[0_8px_24px_rgba(148,163,184,0.1)] backdrop-blur-md">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <CalendarIcon className="size-4 text-[#4C5C2D]" />
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentMonth((m) => subMonths(m, 1))} className="rounded-lg p-1.5 text-[#6c6346] hover:bg-[#faf5e4] transition">
              <ChevronLeftIcon className="size-4" />
            </button>
            <button onClick={() => { setCurrentMonth(today); setSelectedDate(today); }} className="rounded-lg px-2.5 py-1 text-xs font-medium text-[#4C5C2D] hover:bg-[#faf5e4] transition">
              Today
            </button>
            <button onClick={() => setCurrentMonth((m) => addMonths(m, 1))} className="rounded-lg p-1.5 text-[#6c6346] hover:bg-[#faf5e4] transition">
              <ChevronRightIcon className="size-4" />
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-1.5 text-center text-xs font-semibold uppercase tracking-wider text-[#8a7d5e]">{d}</div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-px rounded-xl overflow-hidden border border-[#e8dec3] bg-[#e8dec3]">
          {calendarDays.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const dayTasks = tasksByDate.get(dayKey) || [];
            const inMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, today);
            const isSelected = isSameDay(day, selectedDate);
            const hasOverdue = dayTasks.some((t) => t.status !== "Done" && isBefore(t.dueDateObj, today));

            return (
              <button
                key={dayKey}
                type="button"
                onClick={() => setSelectedDate(day)}
                className={`min-h-[5.5rem] p-1.5 text-left transition-colors flex flex-col gap-0.5
                  ${inMonth ? "bg-white" : "bg-[#faf8f0]"}
                  ${isSelected ? "bg-[#fffcf0] ring-2 ring-inset ring-[#4C5C2D]" : ""}
                  ${isToday && !isSelected ? "bg-[#f0fdf4]" : ""}
                  hover:bg-[#faf5e4]`}
              >
                <div className="flex items-center justify-between px-0.5">
                  <span className={`text-xs font-bold leading-none ${!inMonth ? "text-[#c4b99a]" : isToday ? "text-[#4C5C2D]" : "text-[#1B0C0C]"}`}>
                    {format(day, "d")}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className={`size-4 flex items-center justify-center rounded-full text-[10px] font-bold ${hasOverdue ? "bg-rose-100 text-rose-700" : "bg-[#4C5C2D]/10 text-[#4C5C2D]"}`}>
                      {dayTasks.length}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-px overflow-hidden flex-1">
                  {dayTasks.slice(0, 3).map((t) => (
                    <div key={t.id} className="flex items-center gap-1 rounded px-1 py-0.5 truncate" title={`${t.title} (${t.priority})`}>
                      <div className={`size-1.5 rounded-full shrink-0 ${priorityDot[t.priority] || priorityDot.Medium}`} />
                      <span className={`text-[10px] leading-tight truncate ${inMonth ? "text-[#1B0C0C]" : "text-[#b5a882]"}`}>{t.title}</span>
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="text-[10px] text-[#8a7d5e] px-1">+{dayTasks.length - 3} more</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Bottom: selected day detail + sidebar */}
      <div className="grid grid-cols-[1fr_300px] gap-3 max-lg:grid-cols-1">
        {/* Selected date detail */}
        <section className="rounded-2xl border border-white/70 bg-white/82 p-4 shadow-[0_8px_24px_rgba(148,163,184,0.1)] backdrop-blur-md">
          <h2 className="mb-3 text-base font-semibold text-slate-900">
            {format(selectedDate, "EEEE, MMMM d")}
            <span className="ml-2 text-sm font-normal text-slate-400">{selectedTasks.length} task{selectedTasks.length !== 1 ? "s" : ""}</span>
          </h2>
          {selectedTasks.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#d7c89d] bg-[#fffdf4] px-4 py-6 text-center text-sm text-[#8a7d5e]">No tasks on this day.</p>
          ) : (
            <div className="grid gap-2">
              {selectedTasks.map((t) => (
                <div key={t.id} className="rounded-xl border border-[#e8dec3] bg-[#fffcf0] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#1B0C0C]">{t.title}</div>
                      {t.projectName && <div className="text-xs text-[#8a7d5e] mt-0.5">{t.projectName}</div>}
                      {t.description && <p className="text-xs text-[#6c6346] mt-1 leading-relaxed">{t.description}</p>}
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge[t.status] || statusBadge.Todo}`}>{t.status}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${priorityBadge[t.priority] || ""}`}>{t.priority}</span>
                    <span className="text-xs text-[#8a7d5e]">{t.assigneeName}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right sidebar: upcoming + overdue */}
        <div className="grid gap-3 content-start">
          {/* Upcoming */}
          <section className="rounded-2xl border border-white/70 bg-white/82 p-4 shadow-[0_8px_24px_rgba(148,163,184,0.1)] backdrop-blur-md">
            <h2 className="mb-2.5 text-sm font-semibold text-slate-900 flex items-center gap-1.5">
              <ClockIcon className="size-3.5 text-sky-600" />
              Upcoming
              <span className="text-xs font-normal text-slate-400">{upcomingTasks.length}</span>
            </h2>
            {upcomingTasks.length === 0 ? (
              <p className="text-xs text-[#8a7d5e]">No upcoming tasks.</p>
            ) : (
              <div className="grid gap-1">
                {upcomingTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#faf5e4] transition cursor-pointer" onClick={() => setSelectedDate(t.dueDateObj)}>
                    <div className={`size-1.5 rounded-full shrink-0 ${priorityDot[t.priority] || priorityDot.Medium}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-[#1B0C0C] truncate">{t.title}</div>
                      <div className="text-[10px] text-[#8a7d5e]">{t.projectName}</div>
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold text-[#6c6346]">{format(t.dueDateObj, "MMM d")}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Overdue */}
          {overdueTasks.length > 0 && (
            <section className="rounded-2xl border border-rose-200/70 bg-rose-50/40 p-4 shadow-[0_8px_24px_rgba(148,163,184,0.1)] backdrop-blur-md">
              <h2 className="mb-2.5 text-sm font-semibold text-rose-800 flex items-center gap-1.5">
                <AlertTriangleIcon className="size-3.5 text-rose-600" />
                Overdue
                <span className="text-xs font-normal text-rose-400">{overdueTasks.length}</span>
              </h2>
              <div className="grid gap-1">
                {overdueTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-rose-100/50 transition cursor-pointer" onClick={() => { setSelectedDate(t.dueDateObj); setCurrentMonth(t.dueDateObj); }}>
                    <div className="size-1.5 rounded-full shrink-0 bg-rose-500" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-[#1B0C0C] truncate">{t.title}</div>
                      <div className="text-[10px] text-[#8a7d5e]">{t.projectName}</div>
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold text-rose-600">{format(t.dueDateObj, "MMM d")}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
