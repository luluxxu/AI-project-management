import { useState } from "react";
import SectionCard from "./SectionCard";

export default function ApiKeySettings({ apiKey, hasKey, onSave, onClear }) {
  const [inputValue, setInputValue] = useState("");

  const maskedKey = hasKey
    ? `sk-ant-...${apiKey.slice(-4)}`
    : "";

  const handleSave = () => {
    if (!inputValue.trim()) return;
    onSave(inputValue);
    setInputValue("");
  };

  return (
    <SectionCard
      title="Claude API Settings"
      subtitle={
        hasKey ? (
          <span className="ai-status-badge ai-status-active">Claude Haiku 已连接</span>
        ) : (
          <span className="ai-status-badge ai-status-inactive">未配置 — 使用启发式模式</span>
        )
      }
    >
      {hasKey ? (
        <div className="api-key-row">
          <span className="api-key-display">{maskedKey}</span>
          <button className="secondary-btn" onClick={onClear}>清除 Key</button>
        </div>
      ) : (
        <div className="api-key-row">
          <input
            type="password"
            className="api-key-input"
            placeholder="sk-ant-api03-..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <button className="primary-btn" onClick={handleSave} disabled={!inputValue.trim()}>
            保存 Key
          </button>
        </div>
      )}
      {!hasKey && (
        <p className="api-key-hint">
          Key 仅存储在你的浏览器 localStorage 中，不会上传到任何服务器。
          前往 <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">console.anthropic.com</a> 获取 API Key。
        </p>
      )}
    </SectionCard>
  );
}
