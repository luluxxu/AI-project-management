import { useState } from "react";
import SectionCard from "./SectionCard";

// Displays an input to save a Groq API key, or a masked preview once one is saved.
// Props:
//   apiKey  — current key string (empty if not set)
//   hasKey  — boolean shortcut: true when a key is stored
//   onSave  — callback(key: string) called when the user clicks Save
//   onClear — callback() called when the user clicks Clear Key
export default function ApiKeySettings({ apiKey, hasKey, onSave, onClear }) {
  // Local state for the text the user types in the password input.
  const [inputValue, setInputValue] = useState("");

  // Show only the last 4 characters so the full key is never visible on screen.
  const maskedKey = hasKey
    ? `sk-ant-...${apiKey.slice(-4)}`
    : "";

  const handleSave = () => {
    if (!inputValue.trim()) return; // ignore empty submissions
    onSave(inputValue);
    setInputValue("");              // clear the input after saving
  };

  return (
    <SectionCard
      title="Groq API Settings"
      subtitle={
        // Show a green badge when connected, grey badge when not configured.
        hasKey ? (
          <span className="ai-status-badge ai-status-active">Groq / Llama 3 Connected</span>
        ) : (
          <span className="ai-status-badge ai-status-inactive">Not configured — heuristic mode</span>
        )
      }
    >
      {hasKey ? (
        // Key is already saved — show the masked value and a Clear button.
        <div className="api-key-row">
          <span className="api-key-display">{maskedKey}</span>
          <button className="secondary-btn" onClick={onClear}>Clear Key</button>
        </div>
      ) : (
        // No key yet — show a password input and Save button.
        <div className="api-key-row">
          <input
            type="password"          // hides the key while typing
            className="api-key-input"
            placeholder="gsk_..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()} // allow Enter to save
          />
          <button className="primary-btn" onClick={handleSave} disabled={!inputValue.trim()}>
            Save Key
          </button>
        </div>
      )}
      {/* Only show the hint and link when no key is set. */}
      {!hasKey && (
        <p className="api-key-hint">
          Your key is stored only in this browser's localStorage and is never sent to any server.
          Get a free API key at <a href="https://console.groq.com" target="_blank" rel="noreferrer">console.groq.com →</a>
        </p>
      )}
    </SectionCard>
  );
}
