import { useCallback, useEffect, useMemo, useState } from "react";
import SectionCard from "../components/SectionCard";
import SimpleTable from "../components/SimpleTable";
import AiChatPanel from "../components/AiChatPanel";
import {
  checkAiStatus,
  extractTasksWithAi,
  generateCourseSchedule,
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

  const [courseName, setCourseName] = useState("CS Assignment");
  const [assignmentText, setAssignmentText] = useState(
    "Build a full-stack app with auth, deployment report, and demo video."
  );
  const [courseStartDate, setCourseStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [courseDueDate, setCourseDueDate] = useState(new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10));
  const [coursePlan, setCoursePlan] = useState({ milestones: [], weeklyPlan: [] });

  const [loading, setLoading] = useState({ extract: false, plan: false, applyPlan: false, course: false });
  const [error, setError] = useState({ extract: null, plan: null, applyPlan: null, course: null });

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
      ...(available.includes("gemini") ? [{ value: "gemini", label: "Gemini" }] : []),
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

  const handleGenerateCourseSchedule = useCallback(async () => {
    if (!assignmentText.trim()) return;
    if (!aiConfigured) {
      setError((prev) => ({
        ...prev,
        course: "Course schedule generation requires ChatGPT or Gemini key on server.",
      }));
      return;
    }

    setLoading((prev) => ({ ...prev, course: true }));
    setError((prev) => ({ ...prev, course: null }));
    try {
      const result = await generateCourseSchedule({
        provider,
        courseName,
        assignmentText,
        startDate: courseStartDate,
        dueDate: courseDueDate,
      });
      setCoursePlan({
        milestones: result?.milestones || [],
        weeklyPlan: result?.weeklyPlan || [],
      });
    } catch (e) {
      setError((prev) => ({ ...prev, course: e.message || "Course schedule generation failed" }));
    } finally {
      setLoading((prev) => ({ ...prev, course: false }));
    }
  }, [aiConfigured, assignmentText, courseDueDate, courseName, courseStartDate, provider]);

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
              Set <code>OPENAI_API_KEY</code> and/or <code>GEMINI_API_KEY</code> in server <code>.env</code> and restart the server.
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

      <SectionCard title="Course Assignment Scheduler" subtitle="Milestones + weekly plan">
        <div className="grid gap-3">
          <input value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="Course or assignment name" />
          <textarea rows="4" value={assignmentText} onChange={(e) => setAssignmentText(e.target.value)} placeholder="Paste assignment description or syllabus section" />
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <input type="date" value={courseStartDate} onChange={(e) => setCourseStartDate(e.target.value)} />
            <input type="date" value={courseDueDate} onChange={(e) => setCourseDueDate(e.target.value)} />
            <button className="bg-slate-200 text-slate-900 rounded-xl px-4 py-2 hover:bg-slate-300 transition" onClick={handleGenerateCourseSchedule} disabled={loading.course}>
              {loading.course ? "Generating..." : "Generate Course Schedule"}
            </button>
          </div>
        </div>
        {error.course && <p className="my-2 px-3 py-2 rounded-xl bg-red-50 text-red-800 text-sm">{error.course}</p>}
        <div className="mt-3" />
        <SimpleTable
          columns={[
            { key: "title", label: "Milestone" },
            { key: "targetDate", label: "Target Date" },
            { key: "reason", label: "Why" },
          ]}
          rows={coursePlan.milestones}
          emptyLabel="Generate a schedule to see milestones."
        />
        <div className="mt-3" />
        <SimpleTable
          columns={[
            { key: "week", label: "Week" },
            { key: "focus", label: "Focus" },
            { key: "deliverables", label: "Deliverables" },
          ]}
          rows={coursePlan.weeklyPlan}
          emptyLabel="Weekly plan will appear here."
        />
      </SectionCard>

      <SectionCard title="AI Chat Assistant" subtitle={aiConfigured ? "Chat with selected provider" : "Configure server AI key to enable"}>
        {aiConfigured ? (
          <AiChatPanel store={store} provider={provider} />
        ) : (
          <p className="text-slate-400 text-sm py-2">
            Set <code>OPENAI_API_KEY</code> or <code>GEMINI_API_KEY</code> in server <code>.env</code> to enable chat.
          </p>
        )}
      </SectionCard>
    </div>
  );
}
