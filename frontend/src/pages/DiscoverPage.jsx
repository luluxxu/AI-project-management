import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../utils/api";
import { GlobeIcon, UsersIcon, CheckCircleIcon, SendIcon, SearchIcon, AlertCircleIcon } from "lucide-react";

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
    <div className="grid gap-3">
      {/* Header */}
      <section className="rounded-2xl border border-white/70 bg-white/82 p-4 shadow-[0_8px_24px_rgba(148,163,184,0.1)] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[#4C5C2D]/8 p-2">
            <SearchIcon className="size-5 text-[#4C5C2D]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Discover Workspaces</h2>
            <p className="text-sm text-[#8a7d5e]">Browse public workspaces and request access to join a team.</p>
          </div>
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircleIcon className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <section className="rounded-2xl border border-white/70 bg-white/82 p-8 text-center shadow-[0_8px_24px_rgba(148,163,184,0.1)] backdrop-blur-md">
          <p className="text-sm text-[#8a7d5e]">Loading workspaces...</p>
        </section>
      ) : workspaces.length === 0 ? (
        <section className="rounded-2xl border border-white/70 bg-white/82 p-8 shadow-[0_8px_24px_rgba(148,163,184,0.1)] backdrop-blur-md">
          <div className="text-center">
            <GlobeIcon className="mx-auto size-8 text-[#c4b99a] mb-3" />
            <p className="text-base font-medium text-slate-900">No public workspaces available</p>
            <p className="mt-1 text-sm text-[#8a7d5e]">There are no public workspaces to join right now. Create your own or ask a team owner to invite you.</p>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-white/70 bg-white/82 p-4 shadow-[0_8px_24px_rgba(148,163,184,0.1)] backdrop-blur-md">
          <div className="grid gap-2">
            {workspaces.map((ws) => (
              <div key={ws.id} className="flex items-center justify-between gap-4 rounded-xl border border-[#e8dec3] bg-[#fffcf0] p-4 transition hover:border-[#4C5C2D]/30 hover:shadow-sm">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <GlobeIcon className="size-4 text-[#4C5C2D] shrink-0" />
                    <span className="text-base font-medium text-[#1B0C0C]">{ws.name}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-[#6c6346] truncate">{ws.description || "No description"}</p>
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#8a7d5e]">
                    <UsersIcon className="size-3.5" />
                    {ws.member_count} member{ws.member_count !== 1 ? "s" : ""}
                  </div>
                </div>
                {requested.has(ws.id) ? (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-sm font-medium text-emerald-700">
                    <CheckCircleIcon className="size-4" />
                    Requested
                  </span>
                ) : (
                  <button
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#4C5C2D] px-4 py-2 text-sm font-medium text-[#fff8dd] transition hover:bg-[#3a4822] shrink-0"
                    onClick={() => handleRequestAccess(ws.id)}
                  >
                    <SendIcon className="size-3.5" />
                    Request Access
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
