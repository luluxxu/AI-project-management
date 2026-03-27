import { useState } from "react";

const STORAGE_KEY = "taskpilot-anthropic-key";

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState(() => localStorage.getItem(STORAGE_KEY) || "");

  const setApiKey = (key) => {
    const trimmed = key.trim();
    localStorage.setItem(STORAGE_KEY, trimmed);
    setApiKeyState(trimmed);
  };

  const clearApiKey = () => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKeyState("");
  };

  return {
    apiKey,
    hasKey: apiKey.length > 0,
    setApiKey,
    clearApiKey,
  };
}
