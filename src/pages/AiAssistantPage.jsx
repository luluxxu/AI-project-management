import { useCallback, useEffect, useState } from "react";
import SectionCard from "../components/SectionCard";
import SimpleTable from "../components/SimpleTable";
import AiChatPanel from "../components/AiChatPanel";
import { extractTasksWithClaude, generateDailyPlanWithClaude, checkAiStatus } from "../utils/claudeApi";
import { extractTasksFromText, generateDailyPlan } from "../utils/aiHelpers";

export default function AiAssistantPage({ store }) {
  const [aiConfigured, setAiConfigured] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const [text, setText] = useState(
    "Discuss onboarding flow; implement signup API ASAP; prepare unit tests; design error states for failed login"
  );
  const [selectedProjectId, setSelectedProjectId] = useState(store.scopedProjects[0]?.id || "");
  const [drafts, setDrafts] = useState([]);
  const [plan, setPlan] = useState([]);
  const [loading, setLoading] = useState({ extract: false, plan: false });
  const [error, setError] = useState({ extract: null, plan: null });

  // Check if the server has an AI key configured on mount
  useEffect(() => {
    checkAiStatus()
      .then(setAiConfigured)
      .catch(() => setAiConfigured(false))
      .finally(() => setCheckingStatus(false));
  }, []);

  const handleExtract = useCallback(async () => {
    if (!text.trim()) return;

    if (!aiConfigured) {
      setDrafts(extractTasksFromText(text));
      return;
    }

    setLoading((prev) => ({ ...prev, extract: true }));
    setError((prev) => ({ ...prev, extract: null }));
    try {
      const result = await extractTasksWithClaude(text);
      setDrafts(result ?? extractTasksFromText(text));
    } catch (e) {
      setError((prev) => ({ ...prev, extract: e.message || "Task extraction failed" }));
      setDrafts(extractTasksFromText(text));
    } finally {
      setLoading((prev) => ({ ...prev, extract: false }));
    }
  }, [text, aiConfigured]);

  const handleGeneratePlan = useCallback(async () => {
    if (!aiConfigured) {
      setPlan(generateDailyPlan(store.scopedTasks));
      return;
    }

    setLoading((prev) => ({ ...prev, plan: true }));
    setError((prev) => ({ ...prev, plan: null }));
    try {
      const result = await generateDailyPlanWithClaude(
        store.scopedTasks,
        store.scopedProjects,
        store.scopedMembers
      );
      setPlan(result ?? generateDailyPlan(store.scopedTasks));
    } catch (e) {
      setError((prev) => ({ ...prev, plan: e.message || "Plan generation failed" }));
      setPlan(generateDailyPlan(store.scopedTasks));
    } finally {
      setLoading((prev) => ({ ...prev, plan: false }));
    }
  }, [store.scopedTasks, store.scopedProjects, store.scopedMembers, aiConfigured]);

  const statusLabel = checkingStatus
    ? "Checking AI connection…"
    : aiConfigured
    ? "Groq / Llama 3 Connected (server-side)"
    : "Heuristic mode — server GROQ_API_KEY not set";

  return (
    <div className="grid gap-4">
      <SectionCard
        title="AI Service Status"
        subtitle={
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${aiConfigured ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-500"}`}>
            {statusLabel}
          </span>
        }
      >
        {!aiConfigured && !checkingStatus && (
          <p className="text-slate-500" style={{ fontSize: "0.85rem" }}>
            Set <code>GROQ_API_KEY</code> in the server <code>.env</code> file and restart the server to enable AI features.
            Get a free key at{" "}
            <a href="https://console.groq.com" target="_blank" rel="noreferrer">console.groq.com</a>.
          </p>
        )}
      </SectionCard>

      <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        <SectionCard
          title="Task Extraction"
          subtitle={aiConfigured ? "Powered by Groq / Llama 3" : "Heuristic mode"}
        >
          <div className="grid gap-3">
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
              <button className="bg-slate-200 text-slate-900 rounded-xl px-4 py-2 hover:bg-slate-300 transition" onClick={handleExtract} disabled={loading.extract}>
                {loading.extract ? "Analyzing…" : "Extract Tasks"}
              </button>
              <button
                className="bg-blue-600 text-white border-blue-600 rounded-xl px-4 py-2 hover:bg-blue-700 transition"
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
          {error.extract && <p className="my-2 px-3 py-2 rounded-xl bg-red-50 text-red-800 text-sm">{error.extract}</p>}
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
          subtitle={aiConfigured ? "Powered by Groq / Llama 3" : "Heuristic mode"}
        >
          <div style={{ marginBottom: "1rem" }}>
            <button className="bg-slate-200 text-slate-900 rounded-xl px-4 py-2 hover:bg-slate-300 transition" onClick={handleGeneratePlan} disabled={loading.plan}>
              {loading.plan ? "Generating…" : "Generate Today's Plan"}
            </button>
          </div>
          {error.plan && <p className="my-2 px-3 py-2 rounded-xl bg-red-50 text-red-800 text-sm">{error.plan}</p>}
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
        subtitle={aiConfigured ? "Chat with Llama 3 about your workspace" : "Configure server AI key to enable"}
      >
        {aiConfigured ? (
          <AiChatPanel store={store} />
        ) : (
          <p className="text-slate-400 text-sm py-2">
            Set <code>GROQ_API_KEY</code> in the server <code>.env</code> file to enable the chat assistant.
          </p>
        )}
      </SectionCard>
    </div>
  );
}
