import { useCallback, useEffect, useMemo, useState } from "react";
import SectionCard from "../components/SectionCard";
import SimpleTable from "../components/SimpleTable";
import AiChatPanel from "../components/AiChatPanel";
import {
  checkAiStatus,
  extractTasksWithAi,
  generateProjectPlan,
  generateDailyPlanWithAi,
} from "../utils/claudeApi";
import { extractTasksFromText, generateDailyPlan } from "../utils/aiHelpers";

function parseBusyBlocks(raw, date) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [start, end] = line.split("-").map((x) => x.trim());
      if (!start || !end) return null;
      return {
        start: `${date}T${start}:00`,
        end: `${date}T${end}:00`,
      };
    })
    .filter(Boolean);
}

export default function AiAssistantPage({ store }) {
  const [aiStatus, setAiStatus] = useState({
    configured: false,
    configuredProviders: [],
    defaultProvider: null,
  });
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [provider, setProvider] = useState("auto");

  const [text, setText] = useState(
    "Discuss onboarding flow; implement signup API ASAP; prepare unit tests; design error states for failed login"
  );
  const [sourceType, setSourceType] = useState("notes");
  const [selectedProjectId, setSelectedProjectId] = useState(store.scopedProjects[0]?.id || "");
  const [drafts, setDrafts] = useState([]);

  const [planDate, setPlanDate] = useState(new Date().toISOString().slice(0, 10));
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("17:00");
  const [busyText, setBusyText] = useState("12:00-13:00\n15:00-15:30");
  const [plan, setPlan] = useState({ orderedTasks: [], timeBlocks: [] });

  const [planProjectName, setPlanProjectName] = useState("");
  const [planDescription, setPlanDescription] = useState("");
  const [planStartDate, setPlanStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [planEndDate, setPlanEndDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  const [projectPlan, setProjectPlan] = useState({ milestones: [], tasks: [] });

  const [loading, setLoading] = useState({ extract: false, plan: false, applyPlan: false, projectPlan: false });
  const [error, setError] = useState({ extract: null, plan: null, applyPlan: null, projectPlan: null });

  const aiConfigured = aiStatus.configured;

  useEffect(() => {
    checkAiStatus()
      .then((status) => {
        setAiStatus(status);
        if (status.defaultProvider) setProvider(status.defaultProvider);
      })
      .catch(() => setAiStatus({ configured: false, configuredProviders: [], defaultProvider: null }))
      .finally(() => setCheckingStatus(false));
  }, []);

  const providerOptions = useMemo(() => {
    const available = aiStatus.configuredProviders || [];
    return [
      { value: "auto", label: "Auto" },
      ...(available.includes("chatgpt") ? [{ value: "chatgpt", label: "ChatGPT" }] : []),
    ];
  }, [aiStatus.configuredProviders]);

  const handleExtract = useCallback(async () => {
    if (!text.trim()) return;

    setLoading((prev) => ({ ...prev, extract: true }));
    setError((prev) => ({ ...prev, extract: null }));
    try {
      if (!aiConfigured) {
        setDrafts(extractTasksFromText(text));
      } else {
        const result = await extractTasksWithAi(text, provider, sourceType);
        setDrafts(result?.length ? result : extractTasksFromText(text));
      }
    } catch (e) {
      setError((prev) => ({ ...prev, extract: e.message || "Task extraction failed" }));
      setDrafts(extractTasksFromText(text));
    } finally {
      setLoading((prev) => ({ ...prev, extract: false }));
    }
  }, [text, aiConfigured, provider, sourceType]);

  const handleGeneratePlan = useCallback(async () => {
    setLoading((prev) => ({ ...prev, plan: true }));
    setError((prev) => ({ ...prev, plan: null }));

    try {
      if (!aiConfigured) {
        setPlan({ orderedTasks: generateDailyPlan(store.scopedTasks), timeBlocks: [] });
      } else {
        const busyBlocks = parseBusyBlocks(busyText, planDate);
        const result = await generateDailyPlanWithAi({
          provider,
          tasks: store.scopedTasks,
          projects: store.scopedProjects,
          members: store.scopedMembers,
          date: planDate,
          workHours: { start: workStart, end: workEnd },
          busyBlocks,
        });
        setPlan({
          orderedTasks: result?.orderedTasks || [],
          timeBlocks: result?.timeBlocks || [],
        });
      }
    } catch (e) {
      setError((prev) => ({ ...prev, plan: e.message || "Plan generation failed" }));
      setPlan({ orderedTasks: generateDailyPlan(store.scopedTasks), timeBlocks: [] });
    } finally {
      setLoading((prev) => ({ ...prev, plan: false }));
    }
  }, [aiConfigured, busyText, planDate, provider, store.scopedMembers, store.scopedProjects, store.scopedTasks, workEnd, workStart]);

  const handleApplyPlan = useCallback(async () => {
    if (!plan.timeBlocks.length) return;

    setLoading((prev) => ({ ...prev, applyPlan: true }));
    setError((prev) => ({ ...prev, applyPlan: null }));

    try {
      await Promise.all(
        plan.timeBlocks.map((block) =>
          store.updateTask(block.taskId, {
            plannedStart: block.start,
            plannedEnd: block.end,
          })
        )
      );
    } catch (e) {
      setError((prev) => ({ ...prev, applyPlan: e.message || "Failed to apply schedule to tasks" }));
    } finally {
      setLoading((prev) => ({ ...prev, applyPlan: false }));
    }
  }, [plan.timeBlocks, store]);

  const handleGenerateProjectPlan = useCallback(async () => {
    if (!planProjectName.trim()) return;
    if (!aiConfigured) {
      setError((prev) => ({
        ...prev,
        projectPlan: "Project planning requires OpenAI key on server.",
      }));
      return;
    }

    setLoading((prev) => ({ ...prev, projectPlan: true }));
    setError((prev) => ({ ...prev, projectPlan: null }));
    try {
      const result = await generateProjectPlan({
        provider,
        projectName: planProjectName,
        description: planDescription,
        startDate: planStartDate,
        endDate: planEndDate,
      });
      setProjectPlan({
        milestones: result?.milestones || [],
        tasks: result?.tasks || [],
      });
    } catch (e) {
      setError((prev) => ({ ...prev, projectPlan: e.message || "Project plan generation failed" }));
    } finally {
      setLoading((prev) => ({ ...prev, projectPlan: false }));
    }
  }, [aiConfigured, planProjectName, planDescription, planStartDate, planEndDate, provider]);

  const statusLabel = checkingStatus
    ? "Checking AI providers..."
    : aiConfigured
    ? `Connected: ${(aiStatus.configuredProviders || []).join(" + ")}`
    : "Heuristic mode (no ChatGPT/Gemini key configured)";

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
        <div className="grid gap-3">
          <label className="text-sm text-slate-600">Model Provider</label>
          <select value={provider} onChange={(e) => setProvider(e.target.value)} style={{ maxWidth: 280 }}>
            {providerOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {!aiConfigured && !checkingStatus && (
            <p className="text-slate-500" style={{ fontSize: "0.85rem" }}>
              Set <code>OPENAI_API_KEY</code> in server <code>.env</code> and restart the server.
            </p>
          )}
        </div>
      </SectionCard>

      <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        <SectionCard title="Task Extraction" subtitle="From notes or email text">
          <div className="grid gap-3">
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} style={{ maxWidth: 220 }}>
                <option value="notes">Notes / Requirements</option>
                <option value="email">Email Thread</option>
              </select>
            </div>
            <textarea rows="5" value={text} onChange={(e) => setText(e.target.value)} />
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="">Select project</option>
                {store.scopedProjects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
              <button className="bg-slate-200 text-slate-900 rounded-xl px-4 py-2 hover:bg-slate-300 transition" onClick={handleExtract} disabled={loading.extract}>
                {loading.extract ? "Analyzing..." : "Extract Tasks"}
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
            emptyLabel="Paste notes/email text and click Extract Tasks."
          />
        </SectionCard>

        <SectionCard title="Daily Plan + Time Blocks" subtitle="Calendar-aware planning">
          <div className="grid gap-3" style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <input type="date" value={planDate} onChange={(e) => setPlanDate(e.target.value)} />
              <input type="time" value={workStart} onChange={(e) => setWorkStart(e.target.value)} />
              <input type="time" value={workEnd} onChange={(e) => setWorkEnd(e.target.value)} />
            </div>
            <textarea
              rows="3"
              value={busyText}
              onChange={(e) => setBusyText(e.target.value)}
              placeholder={`Busy blocks, one per line:\n10:00-11:00\n14:30-15:00`}
            />
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button className="bg-slate-200 text-slate-900 rounded-xl px-4 py-2 hover:bg-slate-300 transition" onClick={handleGeneratePlan} disabled={loading.plan}>
                {loading.plan ? "Generating..." : "Plan My Day"}
              </button>
              <button className="bg-blue-600 text-white border-blue-600 rounded-xl px-4 py-2 hover:bg-blue-700 transition" onClick={handleApplyPlan} disabled={loading.applyPlan || !plan.timeBlocks.length}>
                {loading.applyPlan ? "Applying..." : "Apply Time Blocks to Tasks"}
              </button>
            </div>
          </div>
          {error.plan && <p className="my-2 px-3 py-2 rounded-xl bg-red-50 text-red-800 text-sm">{error.plan}</p>}
          {error.applyPlan && <p className="my-2 px-3 py-2 rounded-xl bg-red-50 text-red-800 text-sm">{error.applyPlan}</p>}
          <SimpleTable
            columns={[
              { key: "rank", label: "Rank" },
              { key: "title", label: "Task" },
              { key: "reason", label: "Reason" },
            ]}
            rows={plan.orderedTasks}
            emptyLabel="Click Plan My Day to generate ordered tasks."
          />
          <div className="mt-3" />
          <SimpleTable
            columns={[
              { key: "title", label: "Task" },
              {
                key: "start",
                label: "Start",
                render: (row) => row.start?.replace("T", " "),
              },
              {
                key: "end",
                label: "End",
                render: (row) => row.end?.replace("T", " "),
              },
            ]}
            rows={plan.timeBlocks}
            emptyLabel="No time blocks yet."
          />
        </SectionCard>
      </div>

      <SectionCard title="Project Planner" subtitle="AI-generated milestones and task breakdown">
        <div className="grid gap-3">
          <input value={planProjectName} onChange={(e) => setPlanProjectName(e.target.value)} placeholder="Project name" />
          <textarea rows="4" value={planDescription} onChange={(e) => setPlanDescription(e.target.value)} placeholder="Describe the project goals, scope, and key deliverables" />
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <label className="text-sm text-slate-500">Start</label>
            <input type="date" value={planStartDate} onChange={(e) => setPlanStartDate(e.target.value)} />
            <label className="text-sm text-slate-500">End</label>
            <input type="date" value={planEndDate} onChange={(e) => setPlanEndDate(e.target.value)} />
            <button className="bg-slate-200 text-slate-900 rounded-xl px-4 py-2 hover:bg-slate-300 transition" onClick={handleGenerateProjectPlan} disabled={loading.projectPlan}>
              {loading.projectPlan ? "Generating..." : "Generate Plan"}
            </button>
          </div>
        </div>
        {error.projectPlan && <p className="my-2 px-3 py-2 rounded-xl bg-red-50 text-red-800 text-sm">{error.projectPlan}</p>}
        <div className="mt-3" />
        <SimpleTable
          columns={[
            { key: "title", label: "Milestone" },
            { key: "targetDate", label: "Target Date" },
            { key: "reason", label: "Why" },
          ]}
          rows={projectPlan.milestones}
          emptyLabel="Enter a project name and click Generate Plan."
        />
        <div className="mt-3" />
        <SimpleTable
          columns={[
            { key: "title", label: "Task" },
            { key: "priority", label: "Priority" },
            { key: "effort", label: "Hours" },
            { key: "dueDate", label: "Due Date" },
            { key: "milestone", label: "Milestone" },
          ]}
          rows={projectPlan.tasks}
          emptyLabel="Tasks will appear here after generation."
        />
      </SectionCard>

      <SectionCard title="AI Chat Assistant" subtitle={aiConfigured ? "Chat with selected provider" : "Configure server AI key to enable"}>
        {aiConfigured ? (
          <AiChatPanel store={store} provider={provider} />
        ) : (
          <p className="text-slate-400 text-sm py-2">
            Set <code>OPENAI_API_KEY</code> in server <code>.env</code> to enable chat.
          </p>
        )}
      </SectionCard>
    </div>
  );
}
