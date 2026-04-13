import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
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
import CreateWorkspaceDialog from "./components/CreateWorkspaceDialog";
import ErrorBoundary from "./components/ErrorBoundary";

const links = [
  ["/", "Dashboard"],
  ["/projects", "Projects"],
  ["/calendar", "Calendar"],
  ["/team", "Team"],
  ["/ai", "AI Helper"],
  ["/activity", "Activity"],
  ["/discover", "Discover"],
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
function WsGuard({ store, children, onCreateWorkspace }) {
  if (store.data.workspaces.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md grid gap-4">
          <h2 className="text-xl font-bold text-slate-900">Welcome to TaskPilot AI</h2>
          <p className="text-slate-500">
            You don't have any workspaces yet. Create one to get started, or browse existing workspaces to request access.
          </p>
          <button
            className="bg-[#4C5C2D] text-[#fff8dd] rounded-xl px-4 py-3 hover:bg-[#3a4822] transition"
            onClick={onCreateWorkspace}
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
  const [showCreateWs, setShowCreateWs] = useState(false);

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

  const handleCreateWorkspace = async (payload) => {
    await store.createWorkspace(payload);
    setShowCreateWs(false);
  };

  return (
    <div className="grid min-h-screen grid-cols-[340px_1fr] bg-[radial-gradient(circle_at_top_left,_rgba(255,251,236,0.98),_rgba(244,237,205,0.92)_38%,_rgba(223,214,176,0.78)_100%)] max-md:grid-cols-1">
      <CreateWorkspaceDialog isOpen={showCreateWs} onClose={() => setShowCreateWs(false)} onSubmit={handleCreateWorkspace} />
      <aside className="sticky top-3 m-3 flex h-[calc(100vh-1.5rem)] flex-col gap-4 overflow-y-auto rounded-2xl border border-white/10 bg-[#1B0C0C]/96 p-5 text-slate-50 shadow-[0_24px_60px_rgba(27,12,12,0.34)] max-md:static max-md:m-0 max-md:h-auto max-md:rounded-none max-md:border-0">
        <div>
          <div className="text-xl font-extrabold tracking-tight">TaskPilot AI</div>
          <p className="mt-0.5 text-[0.75rem] text-[#d8cfbb]">Project management platform</p>
        </div>

        <div className="grid gap-2 rounded-xl border border-[#4C5C2D]/20 bg-[#fff9ea] p-3 text-[#1B0C0C]">
          <label className="text-[0.7rem] font-semibold uppercase tracking-wider text-[#4C5C2D]">Workspace</label>
          {store.data.workspaces.length > 0 ? (
            <>
              <select
                value={store.activeWorkspaceId}
                onChange={(e) => store.setActiveWorkspace(e.target.value)}
                className="w-full border-[#e6d79e] bg-[#fffdf4] rounded-lg px-2.5 py-1.5 text-[0.85rem]"
              >
                {store.data.workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
              {(store.activeWorkspace?.myRole === "Owner" || store.activeWorkspace?.currentRole === "Owner") && (
                <label className="flex items-center gap-1.5 text-[0.75rem] text-[#6c6346] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="accent-[#4C5C2D] size-3"
                    checked={!!store.activeWorkspace?.isPublic}
                    onChange={(e) => store.updateWorkspace(store.activeWorkspaceId, { isPublic: e.target.checked })}
                  />
                  Public (visible in Discover)
                </label>
              )}
            </>
          ) : (
            <p className="text-slate-500 text-[0.8rem]">No workspaces yet</p>
          )}
          <button className="rounded-lg bg-[#4C5C2D] px-3 py-1.5 text-[0.8rem] font-medium text-[#fff8dd] hover:bg-[#313E17] transition" onClick={() => setShowCreateWs(true)}>
            + New Workspace
          </button>
        </div>

        <nav className="grid gap-1 flex-1">
          {links.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `px-3 py-2 rounded-xl text-[0.9rem] text-[#d8cfbb] hover:bg-white/8 hover:text-[#FFDE42] transition duration-200 ${isActive ? " bg-[#FFDE42] text-[#1B0C0C] font-medium shadow-sm" : ""}`
              }
            >
              {label}
            </NavLink>
          ))}
          {isAdmin && (
            <>
              <div className="mt-3 mb-0.5 px-3 text-[0.65rem] font-semibold uppercase tracking-wider text-[#96896f]">
                Admin
              </div>
              {adminLinks.map(([to, label]) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-xl text-[0.9rem] text-[#d8cfbb] hover:bg-white/8 hover:text-[#FFDE42] transition duration-200 ${isActive ? " bg-[#FFDE42] text-[#1B0C0C] font-medium shadow-sm" : ""}`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* User info + logout at bottom */}
        <div className="mt-auto pt-3 border-t border-white/10">
          <p className="text-[0.85rem] text-[#f5ecd1] mb-0.5">
            {user?.name || user?.email}
          </p>
          <p className="text-[0.7rem] text-[#b9a98e] mb-2">
            {user?.role || "Member"}
          </p>
          <button className="w-full rounded-lg border border-[#4C5C2D]/50 bg-[#313E17] px-3 py-1.5 text-[0.8rem] text-[#fff8dd] hover:bg-[#4C5C2D] transition" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>

      <main className="grid gap-3 overflow-auto p-5 max-md:p-3">
        {store.data.workspaces.length > 0 && (
          <header className="relative z-30 flex items-center justify-between gap-3 rounded-2xl border border-white/50 bg-[#fff9ea]/84 px-5 py-3 shadow-[0_8px_24px_rgba(76,92,45,0.08)] backdrop-blur-md max-md:flex-col max-md:items-start">
            <div className="min-w-0">
              <h1 className="m-0 text-xl font-semibold tracking-tight text-[#1B0C0C]">{store.activeWorkspace?.name || "Workspace"}</h1>
              <p className="mt-0.5 text-sm text-[#5c543e]">
                Projects, tasks, deadlines, and team updates.
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
          <Route path="/discover" element={<ErrorBoundary><DiscoverPage /></ErrorBoundary>} />
          <Route path="/users" element={<ErrorBoundary><UsersPage /></ErrorBoundary>} />
          {isAdmin && <Route path="/admin" element={<ErrorBoundary><AdminPage store={store} /></ErrorBoundary>} />}
          <Route path="/" element={<WsGuard store={store} onCreateWorkspace={() => setShowCreateWs(true)}><ErrorBoundary><DashboardPage store={store} /></ErrorBoundary></WsGuard>} />
          <Route path="/projects" element={<WsGuard store={store} onCreateWorkspace={() => setShowCreateWs(true)}><ErrorBoundary><ProjectsPage store={store} /></ErrorBoundary></WsGuard>} />
          <Route path="/calendar" element={<WsGuard store={store} onCreateWorkspace={() => setShowCreateWs(true)}><ErrorBoundary><CalendarPage store={store} /></ErrorBoundary></WsGuard>} />
          <Route path="/team" element={<WsGuard store={store} onCreateWorkspace={() => setShowCreateWs(true)}><ErrorBoundary><TeamPage store={store} /></ErrorBoundary></WsGuard>} />
          <Route path="/ai" element={<WsGuard store={store} onCreateWorkspace={() => setShowCreateWs(true)}><ErrorBoundary><AiAssistantPage store={store} /></ErrorBoundary></WsGuard>} />
          <Route path="/activity" element={<WsGuard store={store} onCreateWorkspace={() => setShowCreateWs(true)}><ErrorBoundary><ActivityPage store={store} /></ErrorBoundary></WsGuard>} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
