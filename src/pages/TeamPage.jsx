import { useCallback, useEffect, useMemo, useState } from "react";
import SectionCard from "../components/SectionCard";
import SimpleTable from "../components/SimpleTable";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../utils/api";

export default function TeamPage({ store }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ email: "", role: "Member" });
  const [inviteError, setInviteError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [joinRequests, setJoinRequests] = useState([]);

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

  const loadJoinRequests = useCallback(() => {
    if (!wsId || !canManage) {
      setJoinRequests([]);
      return;
    }

    apiFetch(`/workspaces/${wsId}/join-requests`)
      .then((rows) => setJoinRequests(rows))
      .catch(() => setJoinRequests([]));
  }, [wsId, canManage]);

  useEffect(() => {
    loadJoinRequests();
  }, [loadJoinRequests]);

  const handleInvite = async () => {
    const email = form.email.trim();
    if (!email) return;

    setInviteError("");
    setInviteLoading(true);
    try {
      await store.addMember({ email, role: form.role });
      setForm({ email: "", role: "Member" });
    } catch (error) {
      setInviteError(error.message || "Unable to send invitation.");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleInvitationResponse = async (invitationId, action) => {
    setActionLoadingId(invitationId);
    try {
      await store.respondToInvitation(invitationId, action);
    } finally {
      setActionLoadingId("");
    }
  };

  const handleJoinRequest = async (requestId, status) => {
    setActionLoadingId(requestId);
    try {
      await apiFetch(`/workspaces/${wsId}/join-requests/${requestId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setJoinRequests((prev) => prev.filter((request) => request.id !== requestId));
      if (status === "Approved") {
        window.location.reload();
      }
    } catch (error) {
      setInviteError(error.message || "Unable to update join request.");
    } finally {
      setActionLoadingId("");
    }
  };

  const handleRemoveMember = async (member) => {
    const confirmed = window.confirm(`Remove ${member.name} from this workspace?`);
    if (!confirmed) return;

    const identifier = member.userId || member.id;
    setActionLoadingId(identifier);
    try {
      await store.removeMember(identifier);
    } catch (error) {
      setInviteError(error.message || "Unable to remove member.");
    } finally {
      setActionLoadingId("");
    }
  };

  return (
    <div className="page-grid">
      <SectionCard title="My Invitations" subtitle="Accept or reject pending workspace invitations">
        {receivedInvitations.length === 0 ? (
          <div className="empty-state">No pending invitations.</div>
        ) : (
          <div className="calendar-list compact-list">
            {receivedInvitations.map((invite) => (
              <div key={invite.id} className="calendar-item">
                <div>
                  <strong>{invite.workspaceName}</strong>
                  <p>{invite.invitedByName} invited you as {invite.role}</p>
                  <span className="muted">{new Date(invite.createdAt).toLocaleString()}</span>
                </div>
                <div className="calendar-meta">
                  <button
                    className="primary-btn"
                    disabled={actionLoadingId === invite.id}
                    onClick={() => handleInvitationResponse(invite.id, "accept")}
                  >
                    Accept
                  </button>
                  <button
                    className="secondary-btn"
                    disabled={actionLoadingId === invite.id}
                    onClick={() => handleInvitationResponse(invite.id, "reject")}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Invite Member"
        subtitle={canManage ? "Invite a registered user into this workspace" : "Only workspace owners and admins can invite members"}
      >
        <div className="form-grid">
          <input
            placeholder="Registered user email"
            value={form.email}
            disabled={!canManage}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          />
          <select
            value={form.role}
            disabled={!canManage}
            onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
          >
            <option>Owner</option>
            <option>Admin</option>
            <option>Member</option>
          </select>
          {inviteError ? <p className="inline-error">{inviteError}</p> : null}
          <button className="primary-btn" disabled={!canManage || inviteLoading || !form.email.trim()} onClick={handleInvite}>
            {inviteLoading ? "Sending..." : "Send Invite"}
          </button>
        </div>
      </SectionCard>

      {canManage && joinRequests.length > 0 ? (
        <SectionCard title="Pending Join Requests" subtitle="Users who have requested access to this workspace">
          <div className="calendar-list compact-list">
            {joinRequests.map((request) => (
              <div key={request.id} className="calendar-item">
                <div>
                  <strong>{request.name}</strong>
                  <p>{request.email}</p>
                  <span className="muted">Requested on {new Date(request.created_at).toLocaleString()}</span>
                </div>
                <div className="calendar-meta">
                  <button
                    className="primary-btn"
                    disabled={actionLoadingId === request.id}
                    onClick={() => handleJoinRequest(request.id, "Approved")}
                  >
                    Approve
                  </button>
                  <button
                    className="secondary-btn"
                    disabled={actionLoadingId === request.id}
                    onClick={() => handleJoinRequest(request.id, "Rejected")}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Team" subtitle="Shared team members for this workspace">
        <SimpleTable
          columns={[
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            {
              key: "role",
              label: "Role",
              render: (row) => (
                <select
                  value={row.role}
                  disabled={!canManage || row.role === "Owner" || row.userId === user?.id}
                  onChange={(e) => {
                    if (row.userId) {
                      store.updateMemberRole(row.userId, e.target.value);
                    } else {
                      store.updateMember(row.id, { role: e.target.value });
                    }
                  }}
                >
                  <option>Owner</option>
                  <option>Admin</option>
                  <option>Member</option>
                </select>
              ),
            },
            {
              key: "joinedAt",
              label: "Joined",
              render: (row) => (row.joinedAt ? new Date(row.joinedAt).toLocaleDateString() : "—"),
            },
            {
              key: "actions",
              label: "Actions",
              render: (row) =>
                row.role === "Owner" ? (
                  "Owner"
                ) : row.userId === user?.id ? (
                  "You"
                ) : (
                  <button
                    className="danger-btn"
                    disabled={!canManage || actionLoadingId === (row.userId || row.id)}
                    onClick={() => handleRemoveMember(row)}
                  >
                    Remove
                  </button>
                ),
            },
          ]}
          rows={store.scopedMembers}
        />
      </SectionCard>

      {canManage ? (
        <SectionCard title="Pending Team Invites" subtitle="Outstanding invitations for this workspace">
          {store.scopedInvitations.filter((invite) => invite.status === "Pending").length === 0 ? (
            <div className="empty-state">No pending invitations for this workspace.</div>
          ) : (
            <div className="calendar-list compact-list">
              {store.scopedInvitations
                .filter((invite) => invite.status === "Pending")
                .map((invite) => (
                  <div key={invite.id} className="calendar-item">
                    <div>
                      <strong>{invite.invitedName}</strong>
                      <p>{invite.invitedEmail}</p>
                      <span className="muted">Invited as {invite.role}</span>
                    </div>
                    <div className="calendar-meta">
                      <span>{invite.status}</span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </SectionCard>
      ) : null}
    </div>
  );
}
