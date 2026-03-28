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
      setError((prev) => ({ ...prev, extract: e.message || "Task extraction failed" }));
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
      setError((prev) => ({ ...prev, plan: e.message || "Plan generation failed" }));
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
          title="Task Extraction"
          subtitle={hasKey ? "Powered by Groq / Llama 3" : "Heuristic mode (no API key)"}
        >
          <div className="form-grid">
            <textarea rows="5" value={text} onChange={(e) => setText(e.target.value)} />
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="">Select project</option>
                {store.scopedProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <button className="secondary-btn" onClick={handleExtract} disabled={loading.extract}>
                {loading.extract ? "Analyzing…" : "Extract Tasks"}
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
                Import Tasks
              </button>
            </div>
          </div>
          {error.extract && <p className="inline-error">{error.extract}</p>}
          <SimpleTable
            columns={[
              { key: "title", label: "Task Title" },
              { key: "priority", label: "Priority" },
              { key: "effort", label: "Est. Hours" },
            ]}
            rows={drafts}
            emptyLabel="Paste meeting notes or requirements, then click Extract Tasks."
          />
        </SectionCard>

        <SectionCard
          title="Daily Plan Suggestions"
          subtitle={hasKey ? "Powered by Groq / Llama 3" : "Heuristic mode (no API key)"}
        >
          <div style={{ marginBottom: "1rem" }}>
            <button className="secondary-btn" onClick={handleGeneratePlan} disabled={loading.plan}>
              {loading.plan ? "Generating…" : "Generate Today's Plan"}
            </button>
          </div>
          {error.plan && <p className="inline-error">{error.plan}</p>}
          <SimpleTable
            columns={[
              { key: "rank", label: "Rank" },
              { key: "title", label: "Task" },
              { key: "reason", label: "Reason" },
            ]}
            rows={plan}
            emptyLabel="Click Generate Today's Plan to get AI recommendations."
          />
        </SectionCard>
      </div>

      <SectionCard
        title="AI Chat Assistant"
        subtitle={hasKey ? "Chat with Llama 3 about your workspace" : "Configure an API key above to enable"}
      >
        {hasKey ? (
          <AiChatPanel apiKey={apiKey} store={store} />
        ) : (
          <p className="empty-label">Please configure a Claude API key above to enable the chat assistant.</p>
        )}
      </SectionCard>
    </div>
  );
}
