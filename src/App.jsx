import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import ProjectsPage from "./pages/ProjectsPage";
import CalendarPage from "./pages/CalendarPage";
import TeamPage from "./pages/TeamPage";
import AiAssistantPage from "./pages/AiAssistantPage";
import ActivityPage from "./pages/ActivityPage";
<<<<<<< HEAD
import AdminPage from "./pages/AdminPage";
import UsersPage from "./pages/UsersPage";
import DiscoverPage from "./pages/DiscoverPage";
=======
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
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

<<<<<<< HEAD
const adminLinks = [
  ["/users", "Users"],
  ["/admin", "Workspaces"],
];

=======
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
// Redirect to /login if not authenticated
function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

<<<<<<< HEAD
// Guard: show empty state if user has no workspaces
function WsGuard({ store, children }) {
  if (store.data.workspaces.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md grid gap-4">
          <h2 className="text-xl font-bold text-slate-900">Welcome to TaskPilot AI</h2>
          <p className="text-slate-500">
            You don't have any workspaces yet. Create one to get started, or browse existing workspaces to request access.
          </p>
          <button
            className="bg-blue-600 text-white rounded-xl px-4 py-3 hover:bg-blue-700 transition"
            onClick={store.createWorkspace}
          >
            Create a Workspace
          </button>
          <NavLink
            to="/discover"
            className="bg-slate-200 text-slate-900 rounded-xl px-4 py-3 hover:bg-slate-300 transition inline-block"
          >
            Browse &amp; Request Access
          </NavLink>
        </div>
      </div>
    );
  }
  return children;
}

// Main app shell — only rendered for authenticated users
function AuthenticatedApp() {
  const store = useProjectStore();
  const { user, logout, isAdmin } = useAuth();
=======
// Main app shell — only rendered for authenticated users
function AuthenticatedApp() {
  const store = useProjectStore();
  const { user, logout } = useAuth();
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66

  if (store.loading) {
    return <div style={{ padding: "2rem", color: "#6b7280" }}>Loading...</div>;
  }

  return (
<<<<<<< HEAD
    <div className="grid grid-cols-[280px_1fr] max-md:grid-cols-1 min-h-screen">
      <aside className="p-6 bg-slate-900 text-slate-50 flex flex-col gap-5">
        <div>
          <div className="text-2xl font-extrabold">TaskPilot AI</div>
          <p className="text-slate-500">Project management platform</p>
        </div>

        <div className="bg-white text-gray-900 rounded-2xl shadow-lg p-4 grid gap-3">
          <label>Workspace</label>
          {store.data.workspaces.length > 0 ? (
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
          ) : (
            <p className="text-slate-500 text-sm">No workspaces yet</p>
          )}
          <button className="bg-slate-200 hover:bg-slate-300 text-slate-900 transition" onClick={store.createWorkspace}>
=======
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
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
            + New Workspace
          </button>
        </div>

<<<<<<< HEAD
        <nav className="grid gap-2">
=======
        <nav className="nav-links">
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
          {links.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
<<<<<<< HEAD
                `px-4 py-3 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition${isActive ? " bg-white/10 text-white" : ""}`
=======
                isActive ? "nav-link nav-link-active" : "nav-link"
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
              }
            >
              {label}
            </NavLink>
          ))}
<<<<<<< HEAD
          {isAdmin && (
            <>
              <div className="mt-4 mb-1 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Admin
              </div>
              {adminLinks.map(([to, label]) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `px-4 py-3 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition${isActive ? " bg-white/10 text-white" : ""}`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </>
          )}
=======
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
        </nav>

        {/* User info + logout at bottom */}
        <div style={{ marginTop: "auto", paddingTop: "1rem", borderTop: "1px solid #e5e7eb" }}>
<<<<<<< HEAD
          <p className="text-slate-500" style={{ fontSize: "0.8rem", marginBottom: "0.25rem" }}>
            {user?.name || user?.email}
          </p>
          <p className="text-slate-500" style={{ fontSize: "0.7rem", marginBottom: "0.5rem" }}>
            {user?.role || "Member"}
          </p>
          <button className="bg-slate-200 hover:bg-slate-300 transition text-slate-900" onClick={logout}>
=======
          <p className="muted" style={{ fontSize: "0.8rem", marginBottom: "0.5rem" }}>
            {user?.name || user?.email}
          </p>
          <button className="secondary-btn" onClick={logout}>
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
            Log out
          </button>
        </div>
      </aside>

<<<<<<< HEAD
      <main className="p-6 grid gap-4 overflow-auto">
        {store.data.workspaces.length > 0 && (
          <header className="flex justify-between items-center gap-4">
            <div>
              <h1>{store.activeWorkspace?.name || "Workspace"}</h1>
              <p className="text-slate-500">
                Keep projects, tasks, deadlines, and team updates in one place.
              </p>
            </div>
          </header>
        )}

        <Routes>
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/users" element={<UsersPage />} />
          {isAdmin && <Route path="/admin" element={<AdminPage store={store} />} />}
          <Route path="/" element={<WsGuard store={store}><DashboardPage store={store} /></WsGuard>} />
          <Route path="/projects" element={<WsGuard store={store}><ProjectsPage store={store} /></WsGuard>} />
          <Route path="/calendar" element={<WsGuard store={store}><CalendarPage store={store} /></WsGuard>} />
          <Route path="/team" element={<WsGuard store={store}><TeamPage store={store} /></WsGuard>} />
          <Route path="/ai" element={<WsGuard store={store}><AiAssistantPage store={store} /></WsGuard>} />
          <Route path="/activity" element={<WsGuard store={store}><ActivityPage store={store} /></WsGuard>} />
=======
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
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
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
