import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../utils/api";
import { useAuth } from "../context/AuthContext";

export default function TeamPage({ store }) {
  const { user } = useAuth();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Member");
  const [inviteError, setInviteError] = useState(null);
  const [joinRequests, setJoinRequests] = useState([]);

  const wsId = store.activeWorkspaceId;
  const myWsRole = store.data.workspaces.find((w) => w.id === wsId)?.myRole;
  const canManage = myWsRole === "Owner" || myWsRole === "Admin";

  // Load join requests for Owner/Admin
  const loadJoinRequests = useCallback(() => {
    if (!wsId || !canManage) return;
    apiFetch(`/workspaces/${wsId}/join-requests`)
      .then(setJoinRequests)
      .catch(() => {});
  }, [wsId, canManage]);

  useEffect(() => { loadJoinRequests(); }, [loadJoinRequests]);

  const handleInvite = async () => {
    setInviteError(null);
    if (!inviteEmail.trim()) return;
    try {
      await store.inviteMember(inviteEmail.trim(), inviteRole);
      setInviteEmail("");
      setInviteRole("Member");
    } catch (e) {
      setInviteError(e.message);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      await apiFetch(`/workspaces/${wsId}/join-requests/${requestId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "Approved" }),
      });
      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId));
      window.location.reload();
    } catch (e) {
      setInviteError(e.message);
    }
  };

  const handleReject = async (requestId) => {
    try {
      await apiFetch(`/workspaces/${wsId}/join-requests/${requestId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "Rejected" }),
      });
      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (e) {
      setInviteError(e.message);
    }
  };

  return (
    <div className="grid gap-4">
      {/* Invite section — only for Owner/Admin */}
      {canManage && (
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <h2 className="text-lg font-semibold mb-1">Invite Member</h2>
          <p className="text-slate-500 text-sm mb-3">Add a registered user to this workspace by email</p>

          {inviteError && (
            <p className="my-2 px-3 py-2 rounded-xl bg-red-50 text-red-800 text-sm">{inviteError}</p>
          )}

          <div className="grid gap-3 max-w-md">
            <input
              placeholder="user@example.com"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
              <option value="Member">Member</option>
              <option value="Admin">Admin</option>
            </select>
            <button
              className="bg-blue-600 text-white border-blue-600 rounded-xl px-4 py-2 hover:bg-blue-700 transition"
              onClick={handleInvite}
            >
              Invite
            </button>
          </div>
        </div>
      )}

      {/* Join Requests — only for Owner/Admin */}
      {canManage && joinRequests.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <h2 className="text-lg font-semibold mb-1">Pending Join Requests</h2>
          <p className="text-slate-500 text-sm mb-3">Users who want to join this workspace</p>
          <div className="grid gap-2">
            {joinRequests.map((req) => (
              <div key={req.id} className="flex justify-between items-center gap-4 p-3 rounded-xl border border-slate-200">
                <div>
                  <p className="font-medium text-slate-900">{req.name}</p>
                  <p className="text-slate-500 text-sm">{req.email}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg px-3 py-1 text-sm transition"
                    onClick={() => handleApprove(req.id)}
                  >
                    Approve
                  </button>
                  <button
                    className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg px-3 py-1 text-sm transition"
                    onClick={() => handleReject(req.id)}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Members List */}
      <div className="bg-white rounded-2xl shadow-lg p-4">
        <h2 className="text-lg font-semibold mb-1">Team Members</h2>
        <p className="text-slate-500 text-sm mb-3">People who have access to this workspace</p>

        {store.scopedMembers.length === 0 ? (
          <p className="text-slate-400 text-sm py-4">No members yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-3 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">Name</th>
                  <th className="text-left p-3 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">Email</th>
                  <th className="text-left p-3 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">Role</th>
                  <th className="text-left p-3 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">Joined</th>
                  {canManage && (
                    <th className="text-left p-3 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {store.scopedMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="p-3 border-b border-slate-50 font-medium">{m.name}</td>
                    <td className="p-3 border-b border-slate-50 text-slate-500 text-sm">{m.email}</td>
                    <td className="p-3 border-b border-slate-50">
                      {canManage && m.userId !== user?.id && m.role !== "Owner" ? (
                        <select
                          className="text-sm border border-slate-200 rounded-lg px-2 py-1"
                          value={m.role}
                          onChange={(e) => store.updateMemberRole(m.userId, e.target.value)}
                        >
                          <option value="Admin">Admin</option>
                          <option value="Member">Member</option>
                        </select>
                      ) : (
                        <span className={`text-sm px-2 py-1 rounded-lg ${
                          m.role === "Owner" ? "bg-amber-50 text-amber-800" :
                          m.role === "Admin" ? "bg-blue-50 text-blue-800" :
                          "bg-slate-100 text-slate-700"
                        }`}>
                          {m.role}
                        </span>
                      )}
                    </td>
                    <td className="p-3 border-b border-slate-50 text-slate-500 text-sm">
                      {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : "—"}
                    </td>
                    {canManage && (
                      <td className="p-3 border-b border-slate-50">
                        {m.userId !== user?.id && m.role !== "Owner" ? (
                          <button
                            className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg px-3 py-1 text-sm transition"
                            onClick={() => {
                              if (window.confirm(`Remove ${m.name} from this workspace?`)) {
                                store.removeMember(m.userId);
                              }
                            }}
                          >
                            Remove
                          </button>
                        ) : m.userId === user?.id ? (
                          <span className="text-slate-400 text-sm">You</span>
                        ) : null}
                      </td>
                    )}
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
