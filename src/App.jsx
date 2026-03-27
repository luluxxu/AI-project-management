import { NavLink, Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import ProjectsPage from "./pages/ProjectsPage";
import CalendarPage from "./pages/CalendarPage";
import TeamPage from "./pages/TeamPage";
import AiAssistantPage from "./pages/AiAssistantPage";
import ActivityPage from "./pages/ActivityPage";
import { useProjectStore } from "./utils/useProjectStore";

const links = [
  ["/", "Dashboard"],
  ["/projects", "Projects"],
  ["/calendar", "Calendar"],
  ["/team", "Team"],
  ["/ai", "AI Helper"],
  ["/activity", "Activity"],
];

export default function App() {
  const store = useProjectStore();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand">TaskPilot AI</div>
          <p className="muted">Project management demo platform</p>
        </div>

        <div className="workspace-box">
          <label>Workspace</label>
          <select
            value={store.activeWorkspaceId}
            onChange={(e) => store.setActiveWorkspace(e.target.value)}
          >
            {store.data.workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
          <button className="secondary-btn" onClick={store.createWorkspace}>
            + New Workspace
          </button>
        </div>

        <nav className="nav-links">
          {links.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                isActive ? "nav-link nav-link-active" : "nav-link"
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <div>
            <h1>{store.activeWorkspace?.name || "Workspace"}</h1>
            <p className="muted">
              Keep projects, tasks, deadlines, and team updates in one place.
            </p>
          </div>
          <button className="primary-btn" onClick={store.resetDemoData}>
            Reset Demo Data
          </button>
        </header>

        <Routes>
          <Route path="/" element={<DashboardPage store={store} />} />
          <Route path="/projects" element={<ProjectsPage store={store} />} />
          <Route path="/calendar" element={<CalendarPage store={store} />} />
          <Route path="/team" element={<TeamPage store={store} />} />
          <Route path="/ai" element={<AiAssistantPage store={store} />} />
          <Route path="/activity" element={<ActivityPage store={store} />} />
        </Routes>
      </main>
    </div>
  );
}
