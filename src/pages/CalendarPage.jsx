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
import SectionCard from "../components/SectionCard";

const priorityClassMap = {
  High: "task-chip-high",
  Medium: "task-chip-medium",
  Low: "task-chip-low",
};

const statusClassMap = {
  Done: "status-pill-done",
  "In Progress": "status-pill-progress",
  Todo: "status-pill-todo",
};

function buildCalendarDays(month) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = [];
  let current = gridStart;

  while (current <= gridEnd) {
    days.push(current);
    current = addDays(current, 1);
  }

  return days;
}

export default function CalendarPage({ store }) {
  const today = startOfToday();
  const [currentMonth, setCurrentMonth] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);

  const taskRows = useMemo(
    () =>
      store.scopedTasks
        .filter((task) => task.dueDate)
        .map((task) => {
          const dueDate = parseISO(task.dueDate);
          const project = store.scopedProjects.find((item) => item.id === task.projectId);
<<<<<<< HEAD
          const assignee = store.scopedMembers.find((item) => (item.userId || item.id) === task.assigneeId);
=======
          const assignee = store.scopedMembers.find((item) => item.id === task.assigneeId);
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66

          return {
            ...task,
            dueDateObj: dueDate,
            projectName: project?.name || "Unknown project",
            assigneeName: assignee?.name || "Unassigned",
          };
        })
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title)),
    [store.scopedMembers, store.scopedProjects, store.scopedTasks]
  );

  const tasksByDate = useMemo(() => {
    const grouped = new Map();

    taskRows.forEach((task) => {
      const key = format(task.dueDateObj, "yyyy-MM-dd");
      const list = grouped.get(key) || [];
      list.push(task);
      grouped.set(key, list);
    });

    return grouped;
  }, [taskRows]);

  const calendarDays = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);
  const selectedKey = format(selectedDate, "yyyy-MM-dd");
  const selectedTasks = tasksByDate.get(selectedKey) || [];

  const upcomingTasks = taskRows
    .filter((task) => task.status !== "Done" && !isBefore(task.dueDateObj, today))
    .slice(0, 6);

  const overdueTasks = taskRows.filter(
    (task) => task.status !== "Done" && isBefore(task.dueDateObj, today)
  );

  return (
    <div className="page-grid calendar-layout">
      <SectionCard
        title="Deadline Calendar"
        subtitle="Monthly view of every dated task across the active workspace"
        action={
          <div className="calendar-toolbar">
            <button
              type="button"
              className="secondary-btn calendar-nav-btn"
              onClick={() => setCurrentMonth((month) => subMonths(month, 1))}
            >
              Prev
            </button>
            <strong>{format(currentMonth, "MMMM yyyy")}</strong>
            <button
              type="button"
              className="secondary-btn calendar-nav-btn"
              onClick={() => setCurrentMonth((month) => addMonths(month, 1))}
            >
              Next
            </button>
          </div>
        }
      >
        <div className="calendar-board">
          <div className="calendar-weekdays">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="calendar-grid">
            {calendarDays.map((day) => {
              const dayKey = format(day, "yyyy-MM-dd");
              const dayTasks = tasksByDate.get(dayKey) || [];
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, today);
              const isSelected = isSameDay(day, selectedDate);

              return (
                <button
                  key={dayKey}
                  type="button"
                  className={[
                    "calendar-day",
                    isCurrentMonth ? "" : "calendar-day-muted",
                    isToday ? "calendar-day-today" : "",
                    isSelected ? "calendar-day-selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setSelectedDate(day)}
                >
                  <div className="calendar-day-head">
                    <span className="calendar-day-number">{format(day, "d")}</span>
                    {dayTasks.length > 0 ? (
                      <span className="calendar-count">{dayTasks.length}</span>
                    ) : null}
                  </div>

                  <div className="calendar-day-tasks">
                    {dayTasks.length === 0 ? (
                      <span className="calendar-empty-slot">No tasks</span>
                    ) : (
                      dayTasks.map((task) => (
                        <span
                          key={task.id}
                          className={`calendar-task-chip ${priorityClassMap[task.priority] || "task-chip-medium"}`}
                          title={`${task.title} • ${task.projectName} • ${task.status}`}
                        >
                          {task.title}
                        </span>
                      ))
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </SectionCard>

      <div className="two-col-grid calendar-detail-grid">
        <SectionCard
          title={format(selectedDate, "EEEE, MMMM d")}
          subtitle={`${selectedTasks.length} task${selectedTasks.length === 1 ? "" : "s"} scheduled`}
        >
          {selectedTasks.length === 0 ? (
            <div className="empty-state">No tasks scheduled for this day.</div>
          ) : (
            <div className="calendar-detail-list">
              {selectedTasks.map((task) => (
                <article key={task.id} className="calendar-detail-card">
                  <div className="calendar-detail-head">
                    <div>
                      <h3>{task.title}</h3>
                      <p className="muted">{task.projectName}</p>
                    </div>
                    <span className={`status-pill ${statusClassMap[task.status] || "status-pill-todo"}`}>
                      {task.status}
                    </span>
                  </div>

                  {task.description ? <p className="calendar-detail-description">{task.description}</p> : null}

                  <div className="calendar-meta">
                    <span>{task.priority} priority</span>
                    <span>{task.assigneeName}</span>
                    <span>Due {task.dueDate}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </SectionCard>

        <div className="page-grid">
          <SectionCard title="Upcoming Tasks" subtitle="Next open deadlines">
            {upcomingTasks.length === 0 ? (
              <div className="empty-state">No upcoming tasks.</div>
            ) : (
              <div className="calendar-list compact-list">
                {upcomingTasks.map((task) => (
                  <div key={task.id} className="calendar-item">
                    <div>
                      <strong>{format(task.dueDateObj, "MMM d")}</strong>
                      <p>{task.title}</p>
                      <span className="muted">{task.projectName}</span>
                    </div>
                    <div className="calendar-meta">
                      <span>{task.priority}</span>
                      <span>{task.assigneeName}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Overdue Tasks" subtitle="Open items past their due date">
            {overdueTasks.length === 0 ? (
              <div className="empty-state">No overdue tasks.</div>
            ) : (
              <div className="calendar-list compact-list">
                {overdueTasks.map((task) => (
                  <div key={task.id} className="calendar-item calendar-item-overdue">
                    <div>
                      <strong>{format(task.dueDateObj, "MMM d")}</strong>
                      <p>{task.title}</p>
                      <span className="muted">{task.projectName}</span>
                    </div>
                    <div className="calendar-meta">
                      <span>{task.status}</span>
                      <span>{task.assigneeName}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
