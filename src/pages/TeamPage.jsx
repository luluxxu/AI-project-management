<<<<<<< HEAD
import { useCallback, useEffect, useMemo, useState } from "react";
import SectionCard from "../components/SectionCard";
import SimpleTable from "../components/SimpleTable";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../utils/api";
=======
import { useMemo, useState } from "react";
import SectionCard from "../components/SectionCard";
import SimpleTable from "../components/SimpleTable";
import { useAuth } from "../context/AuthContext";
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66

export default function TeamPage({ store }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ email: "", role: "Member" });
  const [inviteError, setInviteError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");
<<<<<<< HEAD
  const [joinRequests, setJoinRequests] = useState([]);

  const workspaceRole =
    store.activeWorkspace?.myRole ||
    store.activeWorkspace?.currentRole ||
    (store.activeWorkspace?.ownerId === user?.id ? "Owner" : "");
  const canManage = workspaceRole === "Owner" || workspaceRole === "Admin";
  const wsId = store.activeWorkspaceId;

=======

  const isOwner = store.activeWorkspace?.ownerId === user?.id || store.activeWorkspace?.currentRole === "Owner";
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
  const receivedInvitations = useMemo(
    () => store.invitations.filter((invite) => invite.status === "Pending"),
    [store.invitations]
  );

<<<<<<< HEAD
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

=======
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
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

<<<<<<< HEAD
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
=======
  const handleRemoveMember = async (memberId) => {
    const confirmed = window.confirm("Remove this member from the team?");
    if (!confirmed) return;

    setActionLoadingId(memberId);
    try {
      await store.removeMember(memberId);
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
    } catch (error) {
      setInviteError(error.message || "Unable to remove member.");
    } finally {
      setActionLoadingId("");
    }
  };

  return (
    <div className="page-grid">
<<<<<<< HEAD
      <SectionCard title="My Invitations" subtitle="Accept or reject pending workspace invitations">
=======
      <SectionCard title="My Invitations" subtitle="Accept or reject pending team invitations">
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
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
<<<<<<< HEAD
        subtitle={canManage ? "Invite a registered user into this workspace" : "Only workspace owners and admins can invite members"}
=======
        subtitle={isOwner ? "Invite registered users into this team" : "Only the team owner can invite members"}
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
      >
        <div className="form-grid">
          <input
            placeholder="Registered user email"
            value={form.email}
<<<<<<< HEAD
            disabled={!canManage}
=======
            disabled={!isOwner}
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          />
          <select
            value={form.role}
<<<<<<< HEAD
            disabled={!canManage}
=======
            disabled={!isOwner}
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
            onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
          >
            <option>Owner</option>
            <option>Admin</option>
            <option>Member</option>
          </select>
          {inviteError ? <p className="inline-error">{inviteError}</p> : null}
<<<<<<< HEAD
          <button className="primary-btn" disabled={!canManage || inviteLoading || !form.email.trim()} onClick={handleInvite}>
=======
          <button className="primary-btn" disabled={!isOwner || inviteLoading || !form.email.trim()} onClick={handleInvite}>
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
            {inviteLoading ? "Sending..." : "Send Invite"}
          </button>
        </div>
      </SectionCard>

<<<<<<< HEAD
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

=======
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
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
<<<<<<< HEAD
                  disabled={!canManage || row.role === "Owner" || row.userId === user?.id}
                  onChange={(e) => {
                    if (row.userId) {
                      store.updateMemberRole(row.userId, e.target.value);
                    } else {
                      store.updateMember(row.id, { role: e.target.value });
                    }
                  }}
=======
                  disabled={!isOwner || row.role === "Owner"}
                  onChange={(e) => store.updateMember(row.id, { role: e.target.value })}
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
                >
                  <option>Owner</option>
                  <option>Admin</option>
                  <option>Member</option>
                </select>
              ),
            },
            {
<<<<<<< HEAD
              key: "joinedAt",
              label: "Joined",
              render: (row) => (row.joinedAt ? new Date(row.joinedAt).toLocaleDateString() : "—"),
            },
            {
=======
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
              key: "actions",
              label: "Actions",
              render: (row) =>
                row.role === "Owner" ? (
                  "Owner"
<<<<<<< HEAD
                ) : row.userId === user?.id ? (
                  "You"
                ) : (
                  <button
                    className="danger-btn"
                    disabled={!canManage || actionLoadingId === (row.userId || row.id)}
                    onClick={() => handleRemoveMember(row)}
=======
                ) : (
                  <button
                    className="danger-btn"
                    disabled={!isOwner || actionLoadingId === row.id}
                    onClick={() => handleRemoveMember(row.id)}
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
                  >
                    Remove
                  </button>
                ),
            },
          ]}
          rows={store.scopedMembers}
        />
      </SectionCard>

<<<<<<< HEAD
      {canManage ? (
        <SectionCard title="Pending Team Invites" subtitle="Outstanding invitations for this workspace">
          {store.scopedInvitations.filter((invite) => invite.status === "Pending").length === 0 ? (
            <div className="empty-state">No pending invitations for this workspace.</div>
=======
      {isOwner ? (
        <SectionCard title="Pending Team Invites" subtitle="Outstanding invitations for this team">
          {store.scopedInvitations.filter((invite) => invite.status === "Pending").length === 0 ? (
            <div className="empty-state">No pending invitations for this team.</div>
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
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
