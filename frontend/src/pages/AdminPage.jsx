import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { apiFetch } from "../utils/api";

export default function AdminPage({ store }) {
  const { confirm } = useConfirmDialog();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  const loadWorkspaces = useCallback(() => {
    setLoading(true);
    apiFetch("/workspaces?includeArchived=true")
      .then(setWorkspaces)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadWorkspaces(); }, [loadWorkspaces]);

  const handleDelete = async (id, name) => {
    const accepted = await confirm({
      title: "Delete workspace?",
      message: `Delete workspace "${name}"? This will remove all its projects, tasks, and members.`,
      confirmLabel: "Delete workspace",
      tone: "danger",
    });
    if (!accepted) return;

    try {
      await apiFetch(`/workspaces/${id}`, { method: "DELETE" });
      setWorkspaces((prev) => prev.filter((w) => w.id !== id));
      toast.success("Workspace deleted");
    } catch (e) {
      setError(e.message);
      toast.error(e.message || "Failed to delete workspace");
    }
  };

  const handleArchive = async (id, name) => {
    const accepted = await confirm({
      title: "Archive workspace?",
      message: `Archive workspace "${name}"? Its projects and tasks will be hidden until restored.`,
      confirmLabel: "Archive workspace",
    });
    if (!accepted) return;

    try {
      const response = await apiFetch(`/workspaces/${id}/archive`, { method: "POST" });
      setWorkspaces((prev) => prev.map((workspace) => (workspace.id === id ? { ...workspace, archived_at: response.archivedAt } : workspace)));
      toast.success("Workspace archived");
    } catch (e) {
      setError(e.message);
      toast.error(e.message || "Failed to archive workspace");
    }
  };

  const handleRestore = async (id) => {
    try {
      await apiFetch(`/workspaces/${id}/restore`, { method: "POST" });
      setWorkspaces((prev) => prev.map((workspace) => (workspace.id === id ? { ...workspace, archived_at: null } : workspace)));
      toast.success("Workspace restored");
    } catch (e) {
      setError(e.message);
      toast.error(e.message || "Failed to restore workspace");
    }
  };

  const visibleWorkspaces = workspaces.filter((workspace) => showArchived ? !!workspace.archived_at : !workspace.archived_at);

  return (
    <div className="grid gap-4">
      <div className="bg-white rounded-2xl shadow-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold">All Workspaces</h2>
            <p className="text-slate-500 text-sm">Manage all workspaces across the platform</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
              Show archived
            </label>
            <button
              className="bg-slate-200 hover:bg-slate-300 text-slate-900 transition rounded-xl px-4 py-2 text-sm"
              onClick={store.createWorkspace}
            >
              + New Workspace
            </button>
          </div>
        </div>

        {error && (
          <p className="my-2 px-3 py-2 rounded-xl bg-red-50 text-red-800 text-sm">{error}</p>
        )}

        {loading ? (
          <p className="text-slate-400 text-sm py-4">Loading workspaces…</p>
        ) : visibleWorkspaces.length === 0 ? (
          <p className="text-slate-400 text-sm py-4">No workspaces found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-3 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">Name</th>
                  <th className="text-left p-3 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">ID</th>
                  <th className="text-left p-3 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">Owner</th>
                  <th className="text-left p-3 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">Created</th>
                  <th className="text-left p-3 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleWorkspaces.map((ws) => (
                  <tr key={ws.id} className="hover:bg-slate-50">
                    <td className="p-3 border-b border-slate-50 font-medium">{ws.name}</td>
                    <td className="p-3 border-b border-slate-50 text-slate-500 text-sm font-mono">{ws.id}</td>
                    <td className="p-3 border-b border-slate-50 text-slate-500 text-sm">{ws.owner_id}</td>
                    <td className="p-3 border-b border-slate-50 text-slate-500 text-sm">
                      {new Date(ws.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3 border-b border-slate-50">
                      <div className="flex gap-2">
                        {showArchived ? (
                          <button
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 transition hover:bg-slate-50"
                            onClick={() => handleRestore(ws.id)}
                          >
                            Restore
                          </button>
                        ) : (
                          <button
                            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-sm text-amber-800 transition hover:bg-amber-100"
                            onClick={() => handleArchive(ws.id, ws.name)}
                          >
                            Archive
                          </button>
                        )}
                        <button
                          className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg px-3 py-1 text-sm transition"
                          onClick={() => handleDelete(ws.id, ws.name)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
