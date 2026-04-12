// Login / Register page — shown to unauthenticated users
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [mode, setMode] = useState("login"); // "login" | "register"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body = mode === "register"
        ? { name, email, password }
        : { email, password };
      const data = await apiFetch(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      login(data.token, data.user);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg, #f5f7fa)",
    }}>
      <div style={{
        background: "#fff",
        borderRadius: "12px",
        padding: "2.5rem",
        width: "100%",
        maxWidth: "400px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
      }}>
        <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem" }}>TaskPilot AI</h2>
        <p style={{ margin: "0 0 2rem", color: "#6b7280", fontSize: "0.9rem" }}>
          Project management platform
        </p>

        {/* Tab toggle */}
        <div style={{ display: "flex", marginBottom: "1.5rem", borderRadius: "8px", overflow: "hidden", border: "1px solid #e5e7eb" }}>
          {["login", "register"].map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(""); }}
              style={{
                flex: 1,
                padding: "0.6rem",
                border: "none",
                cursor: "pointer",
                fontWeight: 500,
                fontSize: "0.9rem",
                background: mode === m ? "#6366f1" : "transparent",
                color: mode === m ? "#fff" : "#6b7280",
                transition: "all 0.15s",
              }}
            >
              {m === "login" ? "Log in" : "Register"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {mode === "register" && (
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, marginBottom: "0.4rem", color: "#374151" }}>
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your name"
                style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.95rem", boxSizing: "border-box" }}
              />
            </div>
          )}

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, marginBottom: "0.4rem", color: "#374151" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.95rem", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, marginBottom: "0.4rem", color: "#374151" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Min. 6 characters"
              style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.95rem", boxSizing: "border-box" }}
            />
          </div>

          {error && (
            <p style={{ margin: 0, color: "#dc2626", fontSize: "0.875rem", background: "#fef2f2", padding: "0.6rem 0.75rem", borderRadius: "6px" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="primary-btn"
            style={{ marginTop: "0.5rem", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
