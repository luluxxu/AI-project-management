// Fetch wrapper: prepends /api, attaches JWT from localStorage, throws on non-2xx
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("taskpilot-token");
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}
