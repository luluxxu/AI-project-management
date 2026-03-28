import { useState } from "react";

// The localStorage key used to persist the API key across browser sessions.
const STORAGE_KEY = "taskpilot-anthropic-key";

// Custom React hook that manages the Groq API key.
// Returns the key value plus helpers to save and clear it.
export function useApiKey() {
  // Initialize state from localStorage so the key survives page refreshes.
  const [apiKey, setApiKeyState] = useState(() => localStorage.getItem(STORAGE_KEY) || "");

  // Save a new key: trim whitespace, write to localStorage, then update React state.
  const setApiKey = (key) => {
    const trimmed = key.trim();
    localStorage.setItem(STORAGE_KEY, trimmed);
    setApiKeyState(trimmed);
  };

  // Remove the key from localStorage and reset state to an empty string.
  const clearApiKey = () => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKeyState("");
  };

  return {
    apiKey,                    // the raw key string (empty string if not set)
    hasKey: apiKey.length > 0, // convenience boolean — true when a key exists
    setApiKey,
    clearApiKey,
  };
}
