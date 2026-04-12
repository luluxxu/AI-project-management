import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../utils/api";

export default function DiscoverPage() {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requested, setRequested] = useState(new Set());

  const load = useCallback(() => {
    setLoading(true);
    apiFetch("/workspaces/discover")
      .then(setWorkspaces)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRequestAccess = async (wsId) => {
    try {
      await apiFetch(`/workspaces/${wsId}/join-request`, { method: "POST" });
      setRequested((prev) => new Set([...prev, wsId]));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="bg-white rounded-2xl shadow-lg p-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Discover Workspaces</h2>
          <p className="text-slate-500 text-sm">Browse workspaces and request access to join a team</p>
        </div>

        {error && (
          <p className="my-2 px-3 py-2 rounded-xl bg-red-50 text-red-800 text-sm">{error}</p>
        )}

        {loading ? (
          <p className="text-slate-400 text-sm py-4">Loading...</p>
        ) : workspaces.length === 0 ? (
          <p className="text-slate-400 text-sm py-4">No workspaces available to join.</p>
        ) : (
          <div className="grid gap-3">
            {workspaces.map((ws) => (
              <div key={ws.id} className="flex justify-between items-center gap-4 p-4 rounded-xl border border-slate-200">
                <div>
                  <p className="font-medium text-slate-900">{ws.name}</p>
                  <p className="text-slate-500 text-sm">{ws.description || "No description"}</p>
                  <p className="text-slate-400 text-xs mt-1">{ws.member_count} member{ws.member_count !== 1 ? "s" : ""}</p>
                </div>
                {requested.has(ws.id) ? (
                  <span className="text-slate-400 text-sm">Requested</span>
                ) : (
                  <button
                    className="bg-blue-600 text-white rounded-xl px-4 py-2 text-sm hover:bg-blue-700 transition"
                    onClick={() => handleRequestAccess(ws.id)}
                  >
                    Request Access
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
