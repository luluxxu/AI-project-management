import { useEffect, useRef, useState } from "react";
import { chatWithClaude } from "../utils/claudeApi";
import { buildWorkspaceContext } from "../utils/buildWorkspaceContext";
import ActionConfirmCard from "./ActionConfirmCard";

// Quick-start prompts shown when the conversation is empty.
// Clicking one immediately sends it as a user message.
const SUGGESTED_PROMPTS = [
  "What should I focus on today?",
  "Are there any overdue or high-risk tasks?",
  "Summarise the overall project status",
  "Is the team workload balanced?",
];

// Full chat interface: message history, suggested prompt chips, text input, and
// optional action confirmation cards rendered beneath AI replies.
//
// Props:
//   apiKey — Groq API key string (guaranteed non-empty when this component renders)
//   store  — global store object, passed through to ActionConfirmCard
export default function AiChatPanel({ apiKey, store }) {
  // Each message: { role: "user" | "assistant", content: string, action?: object }
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // A ref to an invisible div at the bottom of the message list.
  // Scrolling it into view after every new message keeps the latest reply visible.
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Core function: appends the user message, calls the API, appends the AI reply.
  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMsg]; // include new message in history
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      // Build a plain-text snapshot of the workspace to give the AI context.
      const context = buildWorkspaceContext(
        store.activeWorkspace,
        store.scopedProjects,
        store.scopedTasks,
        store.scopedMembers
      );
      // Send the full conversation history + workspace context to the AI.
      const result = await chatWithClaude(nextMessages, context, apiKey);

      // Append the AI reply. `result.action` is non-null when the model suggested
      // a store mutation — ActionConfirmCard will handle rendering it.
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.text, action: result.action },
      ]);
    } catch (e) {
      setError(e.message || "Claude API call failed. Please check if your API key is valid.");
    } finally {
      setLoading(false);
    }
  };

  // Send on Enter; allow Shift+Enter to insert a newline instead.
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">

        {/* Show suggested prompt chips only when no messages have been sent yet. */}
        {messages.length === 0 && !loading && (
          <div className="chip-row">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button key={prompt} className="chip" onClick={() => sendMessage(prompt)}>
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Render each message as a left (AI) or right (user) aligned bubble. */}
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble-wrapper ${msg.role === "user" ? "user" : "assistant"}`}>
            <div className={`chat-bubble chat-bubble-${msg.role}`}>{msg.content}</div>

            {/* If the AI suggested an action, render a confirmation card below its bubble. */}
            {msg.action && (
              <ActionConfirmCard
                action={msg.action}
                store={store}
                onDismiss={() => {
                  // Clear the action from this message so the card disappears.
                  setMessages((prev) =>
                    prev.map((m, idx) => (idx === i ? { ...m, action: null } : m))
                  );
                }}
              />
            )}
          </div>
        ))}

        {/* Animated loading indicator while waiting for the AI response. */}
        {loading && (
          <div className="chat-bubble-wrapper assistant">
            <div className="chat-bubble chat-bubble-assistant loading-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}

        {/* Invisible anchor that we scroll into view after each new message. */}
        <div ref={messagesEndRef} />
      </div>

      {/* Error banner shown below the message list when an API call fails. */}
      {error && <p className="chat-error">{error}</p>}

      <div className="chat-input-row">
        <textarea
          rows={2}
          placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          className="primary-btn"
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
