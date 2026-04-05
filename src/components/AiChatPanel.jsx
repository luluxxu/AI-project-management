import { useEffect, useRef, useState } from "react";
import { chatWithClaude } from "../utils/claudeApi";
import { buildWorkspaceContext } from "../utils/buildWorkspaceContext";
import ActionConfirmCard from "./ActionConfirmCard";

// Quick-start prompts shown when the conversation is empty.
const SUGGESTED_PROMPTS = [
  "What should I focus on today?",
  "Are there any overdue or high-risk tasks?",
  "Summarise the overall project status",
  "Is the team workload balanced?",
];

export default function AiChatPanel({ store }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const context = buildWorkspaceContext(
        store.activeWorkspace,
        store.scopedProjects,
        store.scopedTasks,
        store.scopedMembers
      );
      const result = await chatWithClaude(nextMessages, context);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.text, action: result.action },
      ]);
    } catch (e) {
      setError(e.message || "AI chat failed. Please check the server configuration.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.length === 0 && !loading && (
          <div className="chip-row">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button key={prompt} className="chip" onClick={() => sendMessage(prompt)}>
                {prompt}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble-wrapper ${msg.role === "user" ? "user" : "assistant"}`}>
            <div className={`chat-bubble chat-bubble-${msg.role}`}>{msg.content}</div>

            {msg.action && (
              <ActionConfirmCard
                action={msg.action}
                store={store}
                onDismiss={() => {
                  setMessages((prev) =>
                    prev.map((m, idx) => (idx === i ? { ...m, action: null } : m))
                  );
                }}
              />
            )}
          </div>
        ))}

        {loading && (
          <div className="chat-bubble-wrapper assistant">
            <div className="chat-bubble chat-bubble-assistant loading-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

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
