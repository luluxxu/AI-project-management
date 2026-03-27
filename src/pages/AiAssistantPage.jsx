import { useCallback, useState } from "react";
import SectionCard from "../components/SectionCard";
import SimpleTable from "../components/SimpleTable";
import ApiKeySettings from "../components/ApiKeySettings";
import AiChatPanel from "../components/AiChatPanel";
import { extractTasksWithClaude, generateDailyPlanWithClaude } from "../utils/claudeApi";
import { extractTasksFromText, generateDailyPlan } from "../utils/aiHelpers";
import { useApiKey } from "../utils/useApiKey";

export default function AiAssistantPage({ store }) {
  const { apiKey, hasKey, setApiKey, clearApiKey } = useApiKey();

  const [text, setText] = useState(
    "Discuss onboarding flow; implement signup API ASAP; prepare unit tests; design error states for failed login"
  );
  const [selectedProjectId, setSelectedProjectId] = useState(store.scopedProjects[0]?.id || "");
  const [drafts, setDrafts] = useState([]);
  const [plan, setPlan] = useState([]);
  const [loading, setLoading] = useState({ extract: false, plan: false });
  const [error, setError] = useState({ extract: null, plan: null });

  const handleExtract = useCallback(async () => {
    if (!text.trim()) return;

    if (!hasKey) {
      setDrafts(extractTasksFromText(text));
      return;
    }

    setLoading((prev) => ({ ...prev, extract: true }));
    setError((prev) => ({ ...prev, extract: null }));
    try {
      const result = await extractTasksWithClaude(text, apiKey);
      setDrafts(result ?? extractTasksFromText(text));
    } catch (e) {
      setError((prev) => ({ ...prev, extract: e.message || "任务提取失败" }));
      setDrafts(extractTasksFromText(text));
    } finally {
      setLoading((prev) => ({ ...prev, extract: false }));
    }
  }, [text, apiKey, hasKey]);

  const handleGeneratePlan = useCallback(async () => {
    if (!hasKey) {
      setPlan(generateDailyPlan(store.scopedTasks));
      return;
    }

    setLoading((prev) => ({ ...prev, plan: true }));
    setError((prev) => ({ ...prev, plan: null }));
    try {
      const result = await generateDailyPlanWithClaude(
        store.scopedTasks,
        store.scopedProjects,
        store.scopedMembers,
        apiKey
      );
      setPlan(result ?? generateDailyPlan(store.scopedTasks));
    } catch (e) {
      setError((prev) => ({ ...prev, plan: e.message || "计划生成失败" }));
      setPlan(generateDailyPlan(store.scopedTasks));
    } finally {
      setLoading((prev) => ({ ...prev, plan: false }));
    }
  }, [store.scopedTasks, store.scopedProjects, store.scopedMembers, apiKey, hasKey]);

  return (
    <div className="page-grid">
      <ApiKeySettings
        apiKey={apiKey}
        hasKey={hasKey}
        onSave={setApiKey}
        onClear={clearApiKey}
      />

      <div className="two-col-grid">
        <SectionCard
          title="任务提取"
          subtitle={hasKey ? "由 Claude Haiku 驱动" : "启发式模式（无 API Key）"}
        >
          <div className="form-grid">
            <textarea rows="5" value={text} onChange={(e) => setText(e.target.value)} />
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="">选择项目</option>
                {store.scopedProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <button className="secondary-btn" onClick={handleExtract} disabled={loading.extract}>
                {loading.extract ? "分析中…" : "提取任务"}
              </button>
              <button
                className="primary-btn"
                disabled={!selectedProjectId || !drafts.length}
                onClick={() => {
                  if (!selectedProjectId || !drafts.length) return;
                  store.importDraftTasks(drafts, selectedProjectId);
                  setDrafts([]);
                }}
              >
                导入任务
              </button>
            </div>
          </div>
          {error.extract && <p className="inline-error">{error.extract}</p>}
          <SimpleTable
            columns={[
              { key: "title", label: "任务标题" },
              { key: "priority", label: "优先级" },
              { key: "effort", label: "预估工时(h)" },
            ]}
            rows={drafts}
            emptyLabel="粘贴会议记录或需求文本，点击「提取任务」生成草稿。"
          />
        </SectionCard>

        <SectionCard
          title="每日计划建议"
          subtitle={hasKey ? "由 Claude Haiku 驱动" : "启发式模式（无 API Key）"}
        >
          <div style={{ marginBottom: "1rem" }}>
            <button className="secondary-btn" onClick={handleGeneratePlan} disabled={loading.plan}>
              {loading.plan ? "生成中…" : "生成今日计划"}
            </button>
          </div>
          {error.plan && <p className="inline-error">{error.plan}</p>}
          <SimpleTable
            columns={[
              { key: "rank", label: "优先级" },
              { key: "title", label: "任务" },
              { key: "reason", label: "原因" },
            ]}
            rows={plan}
            emptyLabel="点击「生成今日计划」获取 AI 建议。"
          />
        </SectionCard>
      </div>

      <SectionCard
        title="AI 对话助手"
        subtitle={hasKey ? "与 Claude 对话，了解项目状态、获取建议" : "需要配置 API Key 才能使用"}
      >
        {hasKey ? (
          <AiChatPanel apiKey={apiKey} store={store} />
        ) : (
          <p className="empty-label">请先在上方配置 Claude API Key 以启用对话功能。</p>
        )}
      </SectionCard>
    </div>
  );
}
