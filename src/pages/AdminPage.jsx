import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { apiFetch } from "../utils/api";

export default function AdminPage({ store }) {
  const { confirm } = useConfirmDialog();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadWorkspaces = useCallback(() => {
    setLoading(true);
    apiFetch("/workspaces")
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

  return (
    <div className="grid gap-4">
      <div className="bg-white rounded-2xl shadow-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold">All Workspaces</h2>
            <p className="text-slate-500 text-sm">Manage all workspaces across the platform</p>
          </div>
          <button
            className="bg-slate-200 hover:bg-slate-300 text-slate-900 transition rounded-xl px-4 py-2 text-sm"
            onClick={store.createWorkspace}
          >
            + New Workspace
          </button>
        </div>

        {error && (
          <p className="my-2 px-3 py-2 rounded-xl bg-red-50 text-red-800 text-sm">{error}</p>
        )}

        {loading ? (
          <p className="text-slate-400 text-sm py-4">Loading workspaces…</p>
        ) : workspaces.length === 0 ? (
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
                {workspaces.map((ws) => (
                  <tr key={ws.id} className="hover:bg-slate-50">
                    <td className="p-3 border-b border-slate-50 font-medium">{ws.name}</td>
                    <td className="p-3 border-b border-slate-50 text-slate-500 text-sm font-mono">{ws.id}</td>
                    <td className="p-3 border-b border-slate-50 text-slate-500 text-sm">{ws.owner_id}</td>
                    <td className="p-3 border-b border-slate-50 text-slate-500 text-sm">
                      {new Date(ws.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3 border-b border-slate-50">
                      <button
                        className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg px-3 py-1 text-sm transition"
                        onClick={() => handleDelete(ws.id, ws.name)}
                      >
                        Delete
                      </button>
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
