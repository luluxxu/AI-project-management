import { useState } from "react";
import SectionCard from "../components/SectionCard";
import SimpleTable from "../components/SimpleTable";

export default function TeamPage({ store }) {
  const [form, setForm] = useState({ name: "", email: "", role: "Member" });

  return (
    <div className="page-grid">
      <SectionCard title="Invite Member" subtitle="Local demo member management">
        <div className="form-grid">
          <input placeholder="Name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
          <select value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}>
            <option>Owner</option>
            <option>Admin</option>
            <option>Member</option>
          </select>
          <button className="primary-btn" onClick={() => {
            if (!form.name.trim() || !form.email.trim()) return;
            store.addMember(form);
            setForm({ name: "", email: "", role: "Member" });
          }}>Add Member</button>
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
