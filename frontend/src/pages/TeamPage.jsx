import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import SimpleTable from "../components/SimpleTable";
import { useAuth } from "../context/AuthContext";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { apiFetch } from "../utils/api";
import { MailPlusIcon, UserPlusIcon, CheckIcon, XIcon, Trash2Icon, InboxIcon, UsersIcon, SendIcon, ClockIcon } from "lucide-react";

const roleBadge = {
  Owner: "bg-amber-100 text-amber-800 border-amber-200",
  Admin: "bg-violet-100 text-violet-700 border-violet-200",
  Member: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function TeamPage({ store }) {
  const { user } = useAuth();
  const { confirm } = useConfirmDialog();
  const [form, setForm] = useState({ email: "", role: "Member" });
  const [inviteError, setInviteError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [joinRequests, setJoinRequests] = useState([]);
  const [showInviteForm, setShowInviteForm] = useState(false);

  const workspaceRole =
    store.activeWorkspace?.myRole ||
    store.activeWorkspace?.currentRole ||
    (store.activeWorkspace?.ownerId === user?.id ? "Owner" : "");
  const canManage = workspaceRole === "Owner" || workspaceRole === "Admin";
  const wsId = store.activeWorkspaceId;

  const receivedInvitations = useMemo(
    () => store.invitations.filter((invite) => invite.status === "Pending"),
    [store.invitations]
  );

  const pendingTeamInvites = useMemo(
    () => store.scopedInvitations.filter((invite) => invite.status === "Pending"),
    [store.scopedInvitations]
  );

  const loadJoinRequests = useCallback(() => {
    if (!wsId || !canManage) { setJoinRequests([]); return; }
    apiFetch(`/workspaces/${wsId}/join-requests`)
      .then((rows) => setJoinRequests(rows))
      .catch(() => setJoinRequests([]));
  }, [wsId, canManage]);

  useEffect(() => { loadJoinRequests(); }, [loadJoinRequests]);

  const handleInvite = async () => {
    const email = form.email.trim();
    if (!email) return;
    const accepted = await confirm({ title: "Send invitation?", message: `Invite ${email} as ${form.role}?`, confirmLabel: "Send invite" });
    if (!accepted) return;
    setInviteError("");
    setInviteLoading(true);
    try {
      await store.addMember({ email, role: form.role });
      setForm({ email: "", role: "Member" });
      setShowInviteForm(false);
      toast.success("Invitation sent");
    } catch (error) {
      setInviteError(error.message || "Unable to send invitation.");
      toast.error(error.message || "Unable to send invitation.");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleInvitationResponse = async (invitationId, action) => {
    const accepted = await confirm({
      title: action === "accept" ? "Accept invitation?" : "Reject invitation?",
      message: action === "accept" ? "You will join this workspace." : "This invitation will be declined.",
      confirmLabel: action === "accept" ? "Accept" : "Reject",
      tone: action === "accept" ? "primary" : "danger",
    });
    if (!accepted) return;
    setActionLoadingId(invitationId);
    try {
      await store.respondToInvitation(invitationId, action);
      toast.success(action === "accept" ? "Invitation accepted" : "Invitation rejected");
    } finally { setActionLoadingId(""); }
  };

  const handleJoinRequest = async (requestId, status) => {
    const accepted = await confirm({
      title: status === "Approved" ? "Approve request?" : "Reject request?",
      message: status === "Approved" ? "This user will be added." : "This request will be rejected.",
      confirmLabel: status === "Approved" ? "Approve" : "Reject",
      tone: status === "Approved" ? "primary" : "danger",
    });
    if (!accepted) return;
    setActionLoadingId(requestId);
    try {
      await apiFetch(`/workspaces/${wsId}/join-requests/${requestId}`, { method: "PATCH", body: JSON.stringify({ status }) });
      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId));
      toast.success(status === "Approved" ? "Approved" : "Rejected");
      if (status === "Approved") window.location.reload();
    } catch (error) {
      toast.error(error.message || "Failed");
    } finally { setActionLoadingId(""); }
  };

  const handleRemoveMember = async (member) => {
    const accepted = await confirm({ title: "Remove member?", message: `Remove ${member.name}?`, confirmLabel: "Remove", tone: "danger" });
    if (!accepted) return;
    const identifier = member.userId || member.id;
    setActionLoadingId(identifier);
    try { await store.removeMember(identifier); toast.success("Removed"); } catch (error) { toast.error(error.message || "Failed"); } finally { setActionLoadingId(""); }
  };

  const handleRoleChange = async (row, role) => {
    if (row.role === role) return;
    const accepted = await confirm({ title: "Change role?", message: `Change ${row.name} to ${role}?`, confirmLabel: "Update" });
    if (!accepted) return;
    try {
      if (row.userId) { await store.updateMemberRole(row.userId, role); } else { await store.updateMember(row.id, { role }); }
      toast.success("Role updated");
    } catch (error) { toast.error(error.message || "Failed"); }
  };

  const inputClass = "w-full rounded-lg border border-[#ddd5be] bg-white px-3 py-2 text-sm text-[#1B0C0C] placeholder:text-[#b5a882] outline-none transition focus:border-[#4C5C2D] focus:ring-1 focus:ring-[#4C5C2D]/20";
  const hasAlerts = receivedInvitations.length > 0 || joinRequests.length > 0;

  return (
    <div className="grid gap-3">
      {/* Action bar */}
      <div className="flex items-center gap-2">
        {canManage && (
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition ${showInviteForm ? "bg-[#4C5C2D] text-[#fff8dd]" : "border border-[#ddd5be] bg-white text-[#4C5C2D] hover:bg-[#faf5e4]"}`}
          >
            {showInviteForm ? <XIcon className="size-3.5" /> : <UserPlusIcon className="size-3.5" />}
            Invite Member
          </button>
        )}
        <div className="ml-auto flex items-center gap-2 text-xs text-[#8a7d5e]">
          <UsersIcon className="size-3.5" />
          {store.scopedMembers.length} member{store.scopedMembers.length !== 1 ? "s" : ""}
          <span className="mx-1 text-[#ddd5be]">|</span>
          Your role: <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${roleBadge[workspaceRole] || roleBadge.Member}`}>{workspaceRole || "Member"}</span>
        </div>
      </div>

      {/* Inline invite form */}
      {showInviteForm && (
        <div className="rounded-2xl border border-[#e6d79e] bg-[#fffcf0] p-4">
          <div className="flex items-end gap-2.5 max-md:flex-col max-md:items-stretch">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-[#8a7d5e]">Email</label>
              <input className={inputClass} placeholder="user@example.com" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} autoFocus />
            </div>
            <div className="w-32 max-md:w-full">
              <label className="mb-1 block text-xs font-medium text-[#8a7d5e]">Role</label>
              <select className={inputClass} value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}>
                <option>Owner</option><option>Admin</option><option>Member</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowInviteForm(false)} className="rounded-lg px-3 py-2 text-sm text-[#6c6346] hover:bg-[#f0e7c3] transition">Cancel</button>
              <button
                onClick={handleInvite}
                disabled={inviteLoading || !form.email.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#4C5C2D] px-4 py-2 text-sm font-medium text-[#fff8dd] transition hover:bg-[#3a4822] disabled:opacity-50"
              >
                <SendIcon className="size-3.5" />
                {inviteLoading ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
          {inviteError && <p className="mt-2 text-sm text-rose-600">{inviteError}</p>}
        </div>
      )}

      {/* Alerts: received invitations + join requests */}
      {hasAlerts && (
        <section className="rounded-2xl border border-white/70 bg-white/82 p-4 shadow-[0_8px_24px_rgba(148,163,184,0.1)] backdrop-blur-md">
          <h2 className="mb-3 text-base font-semibold text-slate-900 flex items-center gap-2">
            <InboxIcon className="size-4 text-amber-600" />
            Pending
            <span className="text-sm font-normal text-slate-400">{receivedInvitations.length + joinRequests.length}</span>
          </h2>
          <div className="grid gap-2">
            {/* Received invitations */}
            {receivedInvitations.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-amber-50/50 p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <MailPlusIcon className="size-3.5 text-amber-600 shrink-0" />
                    <span className="text-sm font-medium text-[#1B0C0C]">{invite.workspaceName}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${roleBadge[invite.role] || roleBadge.Member}`}>{invite.role}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-[#6c6346]">Invited by {invite.invitedByName}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button disabled={actionLoadingId === invite.id} onClick={() => handleInvitationResponse(invite.id, "accept")} className="inline-flex items-center gap-1 rounded-lg bg-[#4C5C2D] px-3 py-1.5 text-xs font-medium text-[#fff8dd] hover:bg-[#3a4822] transition disabled:opacity-50">
                    <CheckIcon className="size-3" />Accept
                  </button>
                  <button disabled={actionLoadingId === invite.id} onClick={() => handleInvitationResponse(invite.id, "reject")} className="rounded-lg border border-[#ddd5be] px-3 py-1.5 text-xs font-medium text-[#6c6346] hover:bg-[#faf5e4] transition disabled:opacity-50">
                    Reject
                  </button>
                </div>
              </div>
            ))}

            {/* Join requests (admin only) */}
            {joinRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between gap-3 rounded-xl border border-sky-200/80 bg-sky-50/50 p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <UserPlusIcon className="size-3.5 text-sky-600 shrink-0" />
                    <span className="text-sm font-medium text-[#1B0C0C]">{req.name}</span>
                    <span className="text-xs text-[#8a7d5e]">{req.email}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-[#6c6346]">Requested {new Date(req.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button disabled={actionLoadingId === req.id} onClick={() => handleJoinRequest(req.id, "Approved")} className="inline-flex items-center gap-1 rounded-lg bg-[#4C5C2D] px-3 py-1.5 text-xs font-medium text-[#fff8dd] hover:bg-[#3a4822] transition disabled:opacity-50">
                    <CheckIcon className="size-3" />Approve
                  </button>
                  <button disabled={actionLoadingId === req.id} onClick={() => handleJoinRequest(req.id, "Rejected")} className="rounded-lg border border-[#ddd5be] px-3 py-1.5 text-xs font-medium text-[#6c6346] hover:bg-[#faf5e4] transition disabled:opacity-50">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Members table */}
      <section className="rounded-2xl border border-white/70 bg-white/82 p-4 shadow-[0_8px_24px_rgba(148,163,184,0.1)] backdrop-blur-md">
        <h2 className="mb-3 text-base font-semibold text-slate-900">
          Members
          <span className="ml-2 text-sm font-normal text-slate-400">{store.scopedMembers.length}</span>
        </h2>
        <SimpleTable
          sortable
          columns={[
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            {
              key: "role", label: "Role",
              sortValue: (row) => ({ "Owner": 0, "Admin": 1, "Member": 2 }[row.role] ?? 3),
              render: (row) => {
                const isFixed = !canManage || row.role === "Owner" || row.userId === user?.id;
                return isFixed
                  ? <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${roleBadge[row.role] || roleBadge.Member}`}>{row.role}</span>
                  : (
                    <select value={row.role} onChange={(e) => handleRoleChange(row, e.target.value)} className="rounded-md border-0 bg-transparent py-0 text-sm outline-none cursor-pointer hover:bg-[#faf5e4] transition">
                      <option>Owner</option><option>Admin</option><option>Member</option>
                    </select>
                  );
              },
            },
            {
              key: "joinedAt", label: "Joined",
              render: (row) => <span className="text-xs text-[#8a7d5e]">{row.joinedAt ? new Date(row.joinedAt).toLocaleDateString() : "—"}</span>,
            },
            {
              key: "actions", label: "",
              render: (row) => {
                if (row.role === "Owner" || row.userId === user?.id) return null;
                return canManage ? (
                  <button className="rounded-md p-1 text-[#c4956a] hover:bg-rose-50 hover:text-rose-600 transition" title="Remove" disabled={actionLoadingId === (row.userId || row.id)} onClick={() => handleRemoveMember(row)}>
                    <Trash2Icon className="size-3.5" />
                  </button>
                ) : null;
              },
            },
          ]}
          rows={store.scopedMembers}
        />
      </section>

      {/* Pending outgoing invites */}
      {canManage && pendingTeamInvites.length > 0 && (
        <section className="rounded-2xl border border-white/70 bg-white/82 p-4 shadow-[0_8px_24px_rgba(148,163,184,0.1)] backdrop-blur-md">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 flex items-center gap-2">
            <ClockIcon className="size-3.5 text-[#8a7d5e]" />
            Pending Invites
            <span className="text-sm font-normal text-slate-400">{pendingTeamInvites.length}</span>
          </h2>
          <div className="grid gap-1.5">
            {pendingTeamInvites.map((invite) => (
              <div key={invite.id} className="flex items-center gap-3 rounded-lg px-3 py-2 bg-slate-50/50">
                <SendIcon className="size-3.5 text-[#8a7d5e] shrink-0" />
                <span className="text-sm text-[#1B0C0C]">{invite.invitedName}</span>
                <span className="text-xs text-[#8a7d5e]">{invite.invitedEmail}</span>
                <span className={`ml-auto rounded-full border px-2 py-0.5 text-xs font-semibold ${roleBadge[invite.role] || roleBadge.Member}`}>{invite.role}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
