import { useCallback, useEffect, useMemo, useState } from "react";
import SimpleTable from "../components/SimpleTable";
import AiChatPanel from "../components/AiChatPanel";
import {
  checkAiStatus,
  extractTasksWithAi,
  generateProjectPlan,
  generateDailyPlanWithAi,
} from "../utils/claudeApi";
import { extractTasksFromText, generateDailyPlan } from "../utils/aiHelpers";
import { SparklesIcon, FileTextIcon, CalendarClockIcon, FolderKanbanIcon, MessageSquareIcon, DownloadIcon, PlayIcon, CheckCircle2Icon, AlertCircleIcon } from "lucide-react";

function parseBusyBlocks(raw, date) {
  return raw.split("\n").map((l) => l.trim()).filter(Boolean).map((line) => {
    const [start, end] = line.split("-").map((x) => x.trim());
    if (!start || !end) return null;
    return { start: `${date}T${start}:00`, end: `${date}T${end}:00` };
  }).filter(Boolean);
}

const priorityBadge = { High: "bg-rose-50 text-rose-700 border-rose-200", Medium: "bg-amber-50 text-amber-700 border-amber-200", Low: "bg-emerald-50 text-emerald-700 border-emerald-200" };

export default function AiAssistantPage({ store }) {
  const [aiStatus, setAiStatus] = useState({ configured: false, configuredProviders: [], defaultProvider: null });
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [provider, setProvider] = useState("auto");
  const [activeTab, setActiveTab] = useState("extract");

  const [text, setText] = useState("");
  const [sourceType, setSourceType] = useState("notes");
  const [selectedProjectId, setSelectedProjectId] = useState(store.scopedProjects[0]?.id || "");
  const [drafts, setDrafts] = useState([]);

  const [planDate, setPlanDate] = useState(new Date().toISOString().slice(0, 10));
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("17:00");
  const [busyText, setBusyText] = useState("");
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
      .then((s) => { setAiStatus(s); if (s.defaultProvider) setProvider(s.defaultProvider); })
      .catch(() => setAiStatus({ configured: false, configuredProviders: [], defaultProvider: null }))
      .finally(() => setCheckingStatus(false));
  }, []);

  const providerOptions = useMemo(() => {
    const available = aiStatus.configuredProviders || [];
    return [{ value: "auto", label: "Auto" }, ...(available.includes("chatgpt") ? [{ value: "chatgpt", label: "ChatGPT" }] : [])];
  }, [aiStatus.configuredProviders]);

  const handleExtract = useCallback(async () => {
    if (!text.trim()) return;
    setLoading((p) => ({ ...p, extract: true })); setError((p) => ({ ...p, extract: null }));
    try {
      if (!aiConfigured) { setDrafts(extractTasksFromText(text)); }
      else { const r = await extractTasksWithAi(text, provider, sourceType); setDrafts(r?.length ? r : extractTasksFromText(text)); }
    } catch (e) { setError((p) => ({ ...p, extract: e.message || "Failed" })); setDrafts(extractTasksFromText(text)); }
    finally { setLoading((p) => ({ ...p, extract: false })); }
  }, [text, aiConfigured, provider, sourceType]);

  const handleGeneratePlan = useCallback(async () => {
    setLoading((p) => ({ ...p, plan: true })); setError((p) => ({ ...p, plan: null }));
    try {
      if (!aiConfigured) { setPlan({ orderedTasks: generateDailyPlan(store.scopedTasks), timeBlocks: [] }); }
      else {
        const r = await generateDailyPlanWithAi({ provider, tasks: store.scopedTasks, projects: store.scopedProjects, members: store.scopedMembers, date: planDate, workHours: { start: workStart, end: workEnd }, busyBlocks: parseBusyBlocks(busyText, planDate) });
        setPlan({ orderedTasks: r?.orderedTasks || [], timeBlocks: r?.timeBlocks || [] });
      }
    } catch (e) { setError((p) => ({ ...p, plan: e.message || "Failed" })); setPlan({ orderedTasks: generateDailyPlan(store.scopedTasks), timeBlocks: [] }); }
    finally { setLoading((p) => ({ ...p, plan: false })); }
  }, [aiConfigured, busyText, planDate, provider, store.scopedMembers, store.scopedProjects, store.scopedTasks, workEnd, workStart]);

  const handleApplyPlan = useCallback(async () => {
    if (!plan.timeBlocks.length) return;
    setLoading((p) => ({ ...p, applyPlan: true })); setError((p) => ({ ...p, applyPlan: null }));
    try { await Promise.all(plan.timeBlocks.map((b) => store.updateTask(b.taskId, { plannedStart: b.start, plannedEnd: b.end }))); }
    catch (e) { setError((p) => ({ ...p, applyPlan: e.message || "Failed" })); }
    finally { setLoading((p) => ({ ...p, applyPlan: false })); }
  }, [plan.timeBlocks, store]);

  const handleGenerateProjectPlan = useCallback(async () => {
    if (!planProjectName.trim()) return;
    if (!aiConfigured) { setError((p) => ({ ...p, projectPlan: "Requires OpenAI key on server." })); return; }
    setLoading((p) => ({ ...p, projectPlan: true })); setError((p) => ({ ...p, projectPlan: null }));
    try {
      const r = await generateProjectPlan({ provider, projectName: planProjectName, description: planDescription, startDate: planStartDate, endDate: planEndDate });
      setProjectPlan({ milestones: r?.milestones || [], tasks: r?.tasks || [] });
    } catch (e) { setError((p) => ({ ...p, projectPlan: e.message || "Failed" })); }
    finally { setLoading((p) => ({ ...p, projectPlan: false })); }
  }, [aiConfigured, planProjectName, planDescription, planStartDate, planEndDate, provider]);

  const inputClass = "w-full rounded-lg border border-[#ddd5be] bg-white px-3 py-2 text-sm text-[#1B0C0C] placeholder:text-[#b5a882] outline-none transition focus:border-[#4C5C2D] focus:ring-1 focus:ring-[#4C5C2D]/20";

  const tabs = [
    { id: "extract", label: "Extract Tasks", icon: FileTextIcon },
    { id: "daily", label: "Daily Plan", icon: CalendarClockIcon },
    { id: "project", label: "Project Planner", icon: FolderKanbanIcon },
    { id: "chat", label: "Chat", icon: MessageSquareIcon },
  ];

  return (
    <div className="grid gap-3">
      {/* Status bar */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/82 px-4 py-3 shadow-[0_4px_16px_rgba(148,163,184,0.08)] backdrop-blur-md">
        <div className="flex items-center gap-2">
          <SparklesIcon className={`size-4 ${aiConfigured ? "text-[#4C5C2D]" : "text-[#8a7d5e]"}`} />
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${aiConfigured ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
            {checkingStatus ? "Checking..." : aiConfigured ? "AI Connected" : "Heuristic Mode"}
          </span>
          {aiConfigured && (
            <span className="text-xs text-[#8a7d5e]">{(aiStatus.configuredProviders || []).join(", ")}</span>
          )}
        </div>
        <select value={provider} onChange={(e) => setProvider(e.target.value)} className="rounded-lg border border-[#ddd5be] bg-white px-2.5 py-1 text-xs text-[#6c6346] outline-none cursor-pointer">
          {providerOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-[#e0d5b8] bg-[#faf5e4] p-0.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition flex-1 justify-center ${activeTab === tab.id ? "bg-[#4C5C2D] text-[#fff8dd] shadow-sm" : "text-[#6c6346] hover:text-[#4C5C2D] hover:bg-[#f5edd4]"}`}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "extract" && (
        <section className="rounded-2xl border border-white/70 bg-white/82 p-4 shadow-[0_8px_24px_rgba(148,163,184,0.1)] backdrop-blur-md">
          <h2 className="mb-1 text-base font-semibold text-slate-900">Extract Tasks from Text</h2>
          <p className="mb-3 text-sm text-[#8a7d5e]">Paste meeting notes, emails, or requirements — AI extracts actionable tasks.</p>
          <div className="grid gap-3">
            <div className="flex gap-2 max-md:flex-col">
              <select className={`${inputClass} max-w-[180px] max-md:max-w-full`} value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
                <option value="notes">Notes / Requirements</option>
                <option value="email">Email Thread</option>
              </select>
              <select className={`${inputClass} flex-1`} value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
                <option value="">Import to project...</option>
                {store.scopedProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <textarea className={`${inputClass} min-h-[100px]`} rows="4" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste your text here..." />
            <div className="flex gap-2 justify-end">
              <button onClick={handleExtract} disabled={loading.extract || !text.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-[#4C5C2D] px-4 py-2 text-sm font-medium text-[#fff8dd] transition hover:bg-[#3a4822] disabled:opacity-50">
                <SparklesIcon className="size-3.5" />
                {loading.extract ? "Analyzing..." : "Extract Tasks"}
              </button>
              {drafts.length > 0 && (
                <button
                  onClick={() => { if (!selectedProjectId || !drafts.length) return; store.importDraftTasks(drafts, selectedProjectId); setDrafts([]); }}
                  disabled={!selectedProjectId}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#4C5C2D] px-4 py-2 text-sm font-medium text-[#4C5C2D] transition hover:bg-[#faf5e4] disabled:opacity-50"
                >
                  <DownloadIcon className="size-3.5" />
                  Import {drafts.length} Task{drafts.length !== 1 ? "s" : ""}
                </button>
              )}
            </div>
          </div>
          {error.extract && <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"><AlertCircleIcon className="inline size-3.5 mr-1" />{error.extract}</p>}
          {drafts.length > 0 && (
            <div className="mt-3">
              <SimpleTable
                columns={[
                  { key: "title", label: "Task" },
                  { key: "priority", label: "Priority", render: (r) => <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${priorityBadge[r.priority] || ""}`}>{r.priority}</span> },
                  { key: "effort", label: "Hours" },
                ]}
                rows={drafts}
              />
            </div>
          )}
        </section>
      )}

      {activeTab === "daily" && (
        <section className="rounded-2xl border border-white/70 bg-white/82 p-4 shadow-[0_8px_24px_rgba(148,163,184,0.1)] backdrop-blur-md">
          <h2 className="mb-1 text-base font-semibold text-slate-900">Daily Plan</h2>
          <p className="mb-3 text-sm text-[#8a7d5e]">Generate a prioritized task order and time-blocked schedule for your day.</p>
          <div className="grid gap-3">
            <div className="grid grid-cols-4 gap-2.5 max-md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#8a7d5e]">Date</label>
                <input className={inputClass} type="date" value={planDate} onChange={(e) => setPlanDate(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#8a7d5e]">Start</label>
                <input className={inputClass} type="time" value={workStart} onChange={(e) => setWorkStart(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#8a7d5e]">End</label>
                <input className={inputClass} type="time" value={workEnd} onChange={(e) => setWorkEnd(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#8a7d5e]">Busy blocks</label>
                <input className={inputClass} value={busyText} onChange={(e) => setBusyText(e.target.value)} placeholder="12:00-13:00, 15:00-15:30" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={handleGeneratePlan} disabled={loading.plan} className="inline-flex items-center gap-1.5 rounded-lg bg-[#4C5C2D] px-4 py-2 text-sm font-medium text-[#fff8dd] transition hover:bg-[#3a4822] disabled:opacity-50">
                <PlayIcon className="size-3.5" />
                {loading.plan ? "Generating..." : "Plan My Day"}
              </button>
              {plan.timeBlocks.length > 0 && (
                <button onClick={handleApplyPlan} disabled={loading.applyPlan} className="inline-flex items-center gap-1.5 rounded-lg border border-[#4C5C2D] px-4 py-2 text-sm font-medium text-[#4C5C2D] transition hover:bg-[#faf5e4] disabled:opacity-50">
                  <CheckCircle2Icon className="size-3.5" />
                  {loading.applyPlan ? "Applying..." : "Apply to Tasks"}
                </button>
              )}
            </div>
          </div>
          {error.plan && <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"><AlertCircleIcon className="inline size-3.5 mr-1" />{error.plan}</p>}
          {plan.orderedTasks.length > 0 && (
            <div className="mt-3 grid gap-3">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-[#1B0C0C]">Priority Order</h3>
                <SimpleTable columns={[{ key: "rank", label: "#" }, { key: "title", label: "Task" }, { key: "reason", label: "Reason" }]} rows={plan.orderedTasks} />
              </div>
              {plan.timeBlocks.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-[#1B0C0C]">Time Blocks</h3>
                  <SimpleTable columns={[{ key: "title", label: "Task" }, { key: "start", label: "Start", render: (r) => r.start?.split("T")[1]?.slice(0, 5) || "" }, { key: "end", label: "End", render: (r) => r.end?.split("T")[1]?.slice(0, 5) || "" }, { key: "reason", label: "Reason" }]} rows={plan.timeBlocks} />
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {activeTab === "project" && (
        <section className="rounded-2xl border border-white/70 bg-white/82 p-4 shadow-[0_8px_24px_rgba(148,163,184,0.1)] backdrop-blur-md">
          <h2 className="mb-1 text-base font-semibold text-slate-900">Project Planner</h2>
          <p className="mb-3 text-sm text-[#8a7d5e]">Describe a project and AI will break it into milestones and tasks.</p>
          <div className="grid gap-3">
            <input className={inputClass} value={planProjectName} onChange={(e) => setPlanProjectName(e.target.value)} placeholder="Project name" />
            <textarea className={`${inputClass} min-h-[80px]`} rows="3" value={planDescription} onChange={(e) => setPlanDescription(e.target.value)} placeholder="Goals, scope, key deliverables..." />
            <div className="grid grid-cols-2 gap-2.5 max-md:grid-cols-1">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#8a7d5e]">Start</label>
                <input className={inputClass} type="date" value={planStartDate} onChange={(e) => setPlanStartDate(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#8a7d5e]">End</label>
                <input className={inputClass} type="date" value={planEndDate} onChange={(e) => setPlanEndDate(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={handleGenerateProjectPlan} disabled={loading.projectPlan || !planProjectName.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-[#4C5C2D] px-4 py-2 text-sm font-medium text-[#fff8dd] transition hover:bg-[#3a4822] disabled:opacity-50">
                <SparklesIcon className="size-3.5" />
                {loading.projectPlan ? "Generating..." : "Generate Plan"}
              </button>
            </div>
          </div>
          {error.projectPlan && <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"><AlertCircleIcon className="inline size-3.5 mr-1" />{error.projectPlan}</p>}
          {(projectPlan.milestones.length > 0 || projectPlan.tasks.length > 0) && (
            <div className="mt-3 grid gap-3">
              {projectPlan.milestones.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-[#1B0C0C]">Milestones</h3>
                  <SimpleTable columns={[{ key: "title", label: "Milestone" }, { key: "targetDate", label: "Target" }, { key: "reason", label: "Why" }]} rows={projectPlan.milestones} />
                </div>
              )}
              {projectPlan.tasks.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-[#1B0C0C]">Tasks</h3>
                  <SimpleTable columns={[
                    { key: "title", label: "Task" },
                    { key: "priority", label: "Priority", render: (r) => <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${priorityBadge[r.priority] || ""}`}>{r.priority}</span> },
                    { key: "effort", label: "Hours" },
                    { key: "dueDate", label: "Due" },
                    { key: "milestone", label: "Milestone" },
                  ]} rows={projectPlan.tasks} />
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {activeTab === "chat" && (
        <section className="rounded-2xl border border-white/70 bg-white/82 p-4 shadow-[0_8px_24px_rgba(148,163,184,0.1)] backdrop-blur-md">
          <h2 className="mb-1 text-base font-semibold text-slate-900">AI Chat</h2>
          <p className="mb-3 text-sm text-[#8a7d5e]">Ask questions about your workspace — AI has context on your projects and tasks.</p>
          {aiConfigured ? (
            <AiChatPanel store={store} provider={provider} />
          ) : (
            <div className="rounded-xl border border-dashed border-[#d7c89d] bg-[#fffdf4] px-4 py-8 text-center">
              <SparklesIcon className="mx-auto size-6 text-[#8a7d5e] mb-2" />
              <p className="text-sm text-[#6c6346]">Set <code className="rounded bg-[#f0e7c3] px-1.5 py-0.5 text-xs">OPENAI_API_KEY</code> in server <code className="rounded bg-[#f0e7c3] px-1.5 py-0.5 text-xs">.env</code> to enable chat.</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
