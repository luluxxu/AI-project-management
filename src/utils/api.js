// Fetch wrapper: prepends /api, attaches JWT from localStorage, throws on non-2xx
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("taskpilot-token");
<<<<<<< HEAD
  const res = await fetch(`/api/v1${path}`, {
=======
  const res = await fetch(`/api${path}`, {
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
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
