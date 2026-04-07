import { useMemo, useState } from "react";
import SectionCard from "../components/SectionCard";
import SimpleTable from "../components/SimpleTable";
import { useAuth } from "../context/AuthContext";

export default function TeamPage({ store }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ email: "", role: "Member" });
  const [inviteError, setInviteError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");

  const isOwner = store.activeWorkspace?.ownerId === user?.id || store.activeWorkspace?.currentRole === "Owner";
  const receivedInvitations = useMemo(
    () => store.invitations.filter((invite) => invite.status === "Pending"),
    [store.invitations]
  );

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

  const handleRemoveMember = async (memberId) => {
    const confirmed = window.confirm("Remove this member from the team?");
    if (!confirmed) return;

    setActionLoadingId(memberId);
    try {
      await store.removeMember(memberId);
    } catch (error) {
      setInviteError(error.message || "Unable to remove member.");
    } finally {
      setActionLoadingId("");
    }
  };

  return (
    <div className="page-grid">
      <SectionCard title="My Invitations" subtitle="Accept or reject pending team invitations">
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
        subtitle={isOwner ? "Invite registered users into this team" : "Only the team owner can invite members"}
      >
        <div className="form-grid">
          <input
            placeholder="Registered user email"
            value={form.email}
            disabled={!isOwner}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          />
          <select
            value={form.role}
            disabled={!isOwner}
            onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
          >
            <option>Owner</option>
            <option>Admin</option>
            <option>Member</option>
          </select>
          {inviteError ? <p className="inline-error">{inviteError}</p> : null}
          <button className="primary-btn" disabled={!isOwner || inviteLoading || !form.email.trim()} onClick={handleInvite}>
            {inviteLoading ? "Sending..." : "Send Invite"}
          </button>
        </div>
      </SectionCard>

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
                  disabled={!isOwner || row.role === "Owner"}
                  onChange={(e) => store.updateMember(row.id, { role: e.target.value })}
                >
                  <option>Owner</option>
                  <option>Admin</option>
                  <option>Member</option>
                </select>
              ),
            },
            {
              key: "actions",
              label: "Actions",
              render: (row) =>
                row.role === "Owner" ? (
                  "Owner"
                ) : (
                  <button
                    className="danger-btn"
                    disabled={!isOwner || actionLoadingId === row.id}
                    onClick={() => handleRemoveMember(row.id)}
                  >
                    Remove
                  </button>
                ),
            },
          ]}
          rows={store.scopedMembers}
        />
      </SectionCard>

      {isOwner ? (
        <SectionCard title="Pending Team Invites" subtitle="Outstanding invitations for this team">
          {store.scopedInvitations.filter((invite) => invite.status === "Pending").length === 0 ? (
            <div className="empty-state">No pending invitations for this team.</div>
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
