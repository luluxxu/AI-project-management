import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import ProjectsPage from "./pages/ProjectsPage";
import CalendarPage from "./pages/CalendarPage";
import TeamPage from "./pages/TeamPage";
import AiAssistantPage from "./pages/AiAssistantPage";
import ActivityPage from "./pages/ActivityPage";
import LoginPage from "./pages/LoginPage";
import { useProjectStore } from "./utils/useProjectStore";
import { AuthProvider, useAuth } from "./context/AuthContext";

const links = [
  ["/", "Dashboard"],
  ["/projects", "Projects"],
  ["/calendar", "Calendar"],
  ["/team", "Team"],
  ["/ai", "AI Helper"],
  ["/activity", "Activity"],
];

// Redirect to /login if not authenticated
function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// Main app shell — only rendered for authenticated users
function AuthenticatedApp() {
  const store = useProjectStore();
  const { user, logout } = useAuth();

  if (store.loading) {
    return <div style={{ padding: "2rem", color: "#6b7280" }}>Loading...</div>;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand">TaskPilot AI</div>
          <p className="muted">Project management platform</p>
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

        {/* User info + logout at bottom */}
        <div style={{ marginTop: "auto", paddingTop: "1rem", borderTop: "1px solid #e5e7eb" }}>
          <p className="muted" style={{ fontSize: "0.8rem", marginBottom: "0.5rem" }}>
            {user?.name || user?.email}
          </p>
          <button className="secondary-btn" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <div>
            <h1>{store.activeWorkspace?.name || "Workspace"}</h1>
            <p className="muted">
              Keep projects, tasks, deadlines, and team updates in one place.
            </p>
          </div>
        </header>

        {store.error ? (
          <div className="inline-error">{store.error}</div>
        ) : null}

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

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <AuthenticatedApp />
            </RequireAuth>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
