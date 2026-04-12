const KEY = "ai-pm-platform";

export function loadState(fallback) {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveState(value) {
  localStorage.setItem(KEY, JSON.stringify(value));
}
