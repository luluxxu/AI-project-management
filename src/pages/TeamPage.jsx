import { useState } from "react";
import SectionCard from "../components/SectionCard";
import SimpleTable from "../components/SimpleTable";

export default function TeamPage({ store }) {
  const [form, setForm] = useState({ email: "", role: "Member" });
  const [inviteError, setInviteError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddMember = async () => {
    const email = form.email.trim();
    if (!email) return;

    setInviteError("");
    setIsSubmitting(true);

    try {
      await store.addMember({ email, role: form.role });
      setForm({ email: "", role: "Member" });
    } catch (error) {
      setInviteError(error.message || "Unable to add member.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-grid">
      <SectionCard title="Invite Member" subtitle="Only users who already registered can join this workspace">
        <div className="form-grid">
          <input
            placeholder="Registered user email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          />
          <select value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}>
            <option>Owner</option>
            <option>Admin</option>
            <option>Member</option>
          </select>
          {inviteError ? <p className="inline-error">{inviteError}</p> : null}
          <button className="primary-btn" disabled={isSubmitting || !form.email.trim()} onClick={handleAddMember}>
            {isSubmitting ? "Checking..." : "Add Member"}
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Team" subtitle="Update roles inline">
        <SimpleTable
          columns={[
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            { key: "role", label: "Role", render: (row) => (
              <select value={row.role} onChange={(e) => store.updateMember(row.id, { role: e.target.value })}>
                <option>Owner</option><option>Admin</option><option>Member</option>
              </select>
            ) },
          ]}
          rows={store.scopedMembers}
        />
      </SectionCard>
    </div>
  );
}
