import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { apiFetch } from "../utils/api";
import { useAuth } from "../context/AuthContext";

export default function UsersPage() {
  const { isAdmin, user: currentUser } = useAuth();
  const { confirm } = useConfirmDialog();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadUsers = useCallback(() => {
    if (!isAdmin) { setLoading(false); return; }
    setLoading(true);
    apiFetch("/users")
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleRoleChange = async (userId, newRole) => {
    const userRecord = users.find((entry) => entry.id === userId);
    if (!userRecord || userRecord.role === newRole) return;

    const accepted = await confirm({
      title: "Change user role?",
      message: `Change ${userRecord.name} from ${userRecord.role} to ${newRole}?`,
      confirmLabel: "Update role",
    });
    if (!accepted) return;

    try {
      const updated = await apiFetch(`/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
      });
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      toast.success("User role updated");
    } catch (e) {
      setError(e.message);
      toast.error(e.message || "Failed to update user");
    }
  };

  const handleDelete = async (userId, name) => {
    const accepted = await confirm({
      title: "Delete user?",
      message: `Delete user "${name}"? This cannot be undone.`,
      confirmLabel: "Delete user",
      tone: "danger",
    });
    if (!accepted) return;

    try {
      await apiFetch(`/users/${userId}`, { method: "DELETE" });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success("User deleted");
    } catch (e) {
      setError(e.message);
      toast.error(e.message || "Failed to delete user");
    }
  };

  if (!isAdmin) {
    return (
      <div className="grid gap-4">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Users</h2>
          <p className="text-slate-500 text-sm">You don't have permission to manage users. Contact an admin for access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="bg-white rounded-2xl shadow-lg p-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">All Users</h2>
          <p className="text-slate-500 text-sm">Manage user accounts and roles</p>
        </div>

        {error && (
          <p className="my-2 px-3 py-2 rounded-xl bg-red-50 text-red-800 text-sm">{error}</p>
        )}

        {loading ? (
          <p className="text-slate-400 text-sm py-4">Loading users…</p>
        ) : users.length === 0 ? (
          <p className="text-slate-400 text-sm py-4">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-3 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">Name</th>
                  <th className="text-left p-3 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">Email</th>
                  <th className="text-left p-3 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">Role</th>
                  <th className="text-left p-3 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">Joined</th>
                  <th className="text-left p-3 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="p-3 border-b border-slate-50 font-medium">{u.name}</td>
                    <td className="p-3 border-b border-slate-50 text-slate-500 text-sm">{u.email}</td>
                    <td className="p-3 border-b border-slate-50">
                      <select
                        className="text-sm border border-slate-200 rounded-lg px-2 py-1"
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        disabled={u.id === currentUser?.id}
                      >
                        <option value="Admin">Admin</option>
                        <option value="Member">Member</option>
                      </select>
                    </td>
                    <td className="p-3 border-b border-slate-50 text-slate-500 text-sm">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3 border-b border-slate-50">
                      {u.id !== currentUser?.id ? (
                        <button
                          className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg px-3 py-1 text-sm transition"
                          onClick={() => handleDelete(u.id, u.name)}
                        >
                          Delete
                        </button>
                      ) : (
                        <span className="text-slate-400 text-sm">You</span>
                      )}
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
