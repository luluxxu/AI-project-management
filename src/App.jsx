import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import DashboardPage from "./pages/DashboardPage";
import ProjectsPage from "./pages/ProjectsPage";
import CalendarPage from "./pages/CalendarPage";
import TeamPage from "./pages/TeamPage";
import AiAssistantPage from "./pages/AiAssistantPage";
import ActivityPage from "./pages/ActivityPage";
import AdminPage from "./pages/AdminPage";
import UsersPage from "./pages/UsersPage";
import DiscoverPage from "./pages/DiscoverPage";
import LoginPage from "./pages/LoginPage";
import { useProjectStore } from "./utils/useProjectStore";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ConfirmDialogProvider } from "./context/ConfirmDialogContext";
import NotificationCenter from "./components/NotificationCenter";

const links = [
  ["/", "Dashboard"],
  ["/projects", "Projects"],
  ["/calendar", "Calendar"],
  ["/team", "Team"],
  ["/ai", "AI Helper"],
  ["/activity", "Activity"],
];

const adminLinks = [
  ["/users", "Users"],
  ["/admin", "Workspaces"],
];

// Redirect to /login if not authenticated
function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

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

  useEffect(() => {
    store.unreadNotifications.slice(0, 3).forEach((notification) => {
      const storageKey = `taskpilot-notified-${notification.id}`;
      if (sessionStorage.getItem(storageKey)) return;
      sessionStorage.setItem(storageKey, "1");
      toast(notification.message, { duration: 5000 });
    });
  }, [store.unreadNotifications]);

  if (store.loading) {
    return <div style={{ padding: "2rem", color: "#6b7280" }}>Loading...</div>;
  }

  return (
    <div className="grid min-h-screen grid-cols-[292px_1fr] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(241,245,249,0.92)_35%,_rgba(226,232,240,0.9)_100%)] max-md:grid-cols-1">
      <aside className="m-4 flex flex-col gap-5 rounded-[28px] border border-white/10 bg-slate-950/95 p-6 text-slate-50 shadow-[0_24px_60px_rgba(15,23,42,0.34)] max-md:m-0 max-md:rounded-none max-md:border-0">
        <div>
          <div className="text-2xl font-extrabold tracking-tight">TaskPilot AI</div>
          <p className="mt-1 text-sm text-slate-400">Project management platform</p>
        </div>

        <div className="grid gap-3 rounded-3xl border border-slate-800 bg-white/98 p-4 text-gray-900 shadow-[0_18px_40px_rgba(15,23,42,0.16)]">
          <label className="text-sm font-semibold text-slate-600">Workspace</label>
          {store.data.workspaces.length > 0 ? (
            <select
              value={store.activeWorkspaceId}
              onChange={(e) => store.setActiveWorkspace(e.target.value)}
              className="border-slate-200 bg-slate-50/80"
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
          <button className="bg-slate-900 text-white hover:bg-slate-800 transition" onClick={store.createWorkspace}>
            + New Workspace
          </button>
        </div>

        <nav className="grid gap-2">
          {links.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `px-4 py-3 rounded-2xl text-slate-300 hover:bg-white/8 hover:text-white transition duration-200 ${isActive ? " bg-white text-slate-950 shadow-sm" : ""}`
              }
            >
              {label}
            </NavLink>
          ))}
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
                    `px-4 py-3 rounded-2xl text-slate-300 hover:bg-white/8 hover:text-white transition duration-200 ${isActive ? " bg-white text-slate-950 shadow-sm" : ""}`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* User info + logout at bottom */}
        <div style={{ marginTop: "auto", paddingTop: "1rem", borderTop: "1px solid rgba(148, 163, 184, 0.2)" }}>
          <p className="text-slate-300" style={{ fontSize: "0.84rem", marginBottom: "0.25rem" }}>
            {user?.name || user?.email}
          </p>
          <p className="text-slate-500" style={{ fontSize: "0.74rem", marginBottom: "0.75rem" }}>
            {user?.role || "Member"}
          </p>
          <button className="w-full bg-white/8 border border-white/10 hover:bg-white/12 transition text-white" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>

      <main className="grid gap-5 overflow-auto p-6 max-md:p-4">
        {store.data.workspaces.length > 0 && (
          <header className="flex items-center justify-between gap-4 rounded-[28px] border border-white/50 bg-white/78 px-6 py-5 shadow-[0_18px_40px_rgba(148,163,184,0.14)] backdrop-blur-md max-md:flex-col max-md:items-start">
            <div className="min-w-0">
              <h1 className="m-0 text-[2rem] font-semibold tracking-tight text-slate-900">{store.activeWorkspace?.name || "Workspace"}</h1>
              <p className="mt-1 text-slate-500">
                Keep projects, tasks, deadlines, and team updates in one place.
              </p>
            </div>
            <NotificationCenter
              notifications={store.scopedNotifications}
              unreadCount={store.scopedNotifications.filter((notification) => !notification.readAt).length}
              onMarkRead={store.markNotificationRead}
            />
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
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ConfirmDialogProvider>
        <Toaster position="top-right" toastOptions={{ style: { borderRadius: "16px", background: "#0f172a", color: "#f8fafc" } }} />
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
      </ConfirmDialogProvider>
    </AuthProvider>
  );
}
