import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Sparkles,
  Bot,
  RefreshCw,
  CheckCircle2,
  Wand2,
} from "lucide-react";

import api from "../api/axios.js";

import Modal from "../components/Modal.jsx";
import HabitForm from "../components/HabitForm.jsx";
import TodayHabitCard from "../components/TodayHabitCard.jsx";
import WeeklyGrid from "../components/WeeklyGrid.jsx";
import HeatmapChart from "../components/HeatmapChart.jsx";
import SummaryCards from "../components/SummaryCards.jsx";
import AIWeeklyReport from "../components/AIWeeklyReport.jsx";
import MorningMotivation from "../components/MorningMotivation.jsx";
import HabitSuggestionModal from "../components/HabitSuggestionModal.jsx";
import StreakRecoveryCard from "../components/StreakRecoveryCard.jsx";
import ProgressRing from "../components/ProgressRing.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import HabitHealthCard from "../components/HabitHealthCard.jsx";

import { celebrate, celebrateBig } from "../utils/confetti.js";

import {
  streakFromKeys,
  todayKey,
  weekKeys,
} from "../utils/dateHelpers.js";

import { useAuth } from "../context/AuthContext.jsx";

export default function Dashboard() {
  const { user } = useAuth();

  const [habits, setHabits] = useState([]);
  const [todayLogs, setTodayLogs] = useState([]);
  const [weekLogs, setWeekLogs] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [allLogsByHabit, setAllLogsByHabit] = useState({});

  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [suggestOpen, setSuggestOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [recoveryHabit, setRecoveryHabit] = useState(null);

  // ==================================================
  // AI AGENT STATE
  // ==================================================

  const [agentOpen, setAgentOpen] = useState(false);
  const [agentGoal, setAgentGoal] = useState("");
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentResult, setAgentResult] = useState(null);
  const [agentError, setAgentError] = useState("");

  // ==================================================
  // LOAD DASHBOARD DATA
  // ==================================================

  const loadAll = async () => {
    setLoading(true);

    try {
      const week = weekKeys();

      const start = week[0].key;
      const end = week[week.length - 1].key;

      const [
        habitsRes,
        todayRes,
        rangeRes,
        heatRes,
      ] = await Promise.all([
        api.get("/habits"),
        api.get("/logs/today"),
        api.get("/logs/range", {
          params: {
            start,
            end,
          },
        }),
        api.get("/logs/heatmap"),
      ]);

      setHabits(habitsRes.data);
      setTodayLogs(todayRes.data);
      setWeekLogs(rangeRes.data);
      setHeatmap(heatRes.data);

      // ==================================================
      // LOAD LAST 90 DAYS FOR STREAK CALCULATIONS
      // ==================================================

      const byId = {};

      const start90 = new Date();

      start90.setDate(
        start90.getDate() - 89
      );

      const s90 = start90
        .toISOString()
        .slice(0, 10);

      const e90 = new Date()
        .toISOString()
        .slice(0, 10);

      const allRange = await api.get(
        "/logs/range",
        {
          params: {
            start: s90,
            end: e90,
          },
        }
      );

      for (const habit of habitsRes.data) {
        byId[habit._id] = [];
      }

      for (const log of allRange.data) {
        if (!byId[log.habitId]) {
          byId[log.habitId] = [];
        }

        byId[log.habitId].push(
          log.completedDate
        );
      }

      for (const key of Object.keys(byId)) {
        byId[key] = byId[key]
          .sort()
          .reverse();
      }

      setAllLogsByHabit(byId);
    } finally {
      setLoading(false);
    }
  };

  // ==================================================
  // INITIAL LOAD
  // ==================================================

  useEffect(() => {
    loadAll();
  }, []);

  // ==================================================
  // TODAY'S COMPLETED HABITS
  // ==================================================

  const completedToday = useMemo(
    () =>
      new Set(
        todayLogs.map((log) =>
          String(log.habitId)
        )
      ),
    [todayLogs]
  );

  // ==================================================
  // WEEKLY LOGS BY HABIT
  // ==================================================

  const weekLogsByHabit = useMemo(() => {
    const out = {};

    for (const log of weekLogs) {
      if (!out[log.habitId]) {
        out[log.habitId] = [];
      }

      out[log.habitId].push(
        log.completedDate
      );
    }

    return out;
  }, [weekLogs]);

  // ==================================================
  // STREAKS
  // ==================================================

  const streaksById = useMemo(() => {
    const out = {};

    for (const habit of habits) {
      out[habit._id] =
        streakFromKeys(
          allLogsByHabit[habit._id] || []
        );
    }

    return out;
  }, [habits, allLogsByHabit]);

  // ==================================================
  // TODAY PROGRESS
  // ==================================================

  const todayProgress = habits.length
    ? Math.round(
        (completedToday.size /
          habits.length) *
          100
      )
    : 0;

  // ==================================================
  // STREAK SUMMARY
  // ==================================================

  const activeStreaks =
    Object.values(
      streaksById
    ).filter(
      (streak) => streak.current > 0
    ).length;

  const bestStreak = Math.max(
    0,
    ...Object.values(
      streaksById
    ).map(
      (streak) => streak.longest
    )
  );

  // ==================================================
  // WEEKLY COMPLETION RATE
  // ==================================================

  const weekTotal =
    habits.length * 7;

  const weekDone =
    Object.values(
      weekLogsByHabit
    ).reduce(
      (sum, arr) =>
        sum + arr.length,
      0
    );

  const weekRate = weekTotal
    ? Math.round(
        (weekDone / weekTotal) *
          100
      )
    : 0;

  // ==================================================
  // STREAK RECOVERY
  // ==================================================

  useEffect(() => {
    if (recoveryHabit) return;

    if (!habits.length) return;

    const dismissed =
      JSON.parse(
        localStorage.getItem(
          "recovery-dismissed"
        ) || "{}"
      );

    for (const habit of habits) {
      const streak =
        streaksById[habit._id];

      if (!streak) continue;

      if (
        streak.longest >= 7 &&
        streak.current === 0 &&
        !dismissed[habit._id]
      ) {
        setRecoveryHabit(habit);
        return;
      }
    }
  }, [
    habits,
    streaksById,
    recoveryHabit,
  ]);

  // ==================================================
  // TOGGLE HABIT
  // ==================================================

  const toggle = async (habit) => {
    const done =
      completedToday.has(
        String(habit._id)
      );

    const today = todayKey();

    if (done) {
      await api.delete(
        "/logs",
        {
          data: {
            habitId: habit._id,
            date: today,
          },
        }
      );

      setTodayLogs(
        (logs) =>
          logs.filter(
            (log) =>
              String(
                log.habitId
              ) !==
              String(habit._id)
          )
      );

      setAllLogsByHabit(
        (prev) => {
          const next = {
            ...prev,
          };

          next[habit._id] = (
            next[habit._id] || []
          ).filter(
            (date) =>
              date !== today
          );

          return next;
        }
      );
    } else {
      const res = await api.post(
        "/logs",
        {
          habitId: habit._id,
          date: today,
        }
      );

      setTodayLogs(
        (logs) => [
          ...logs,
          res.data,
        ]
      );

      setAllLogsByHabit(
        (prev) => {
          const next = {
            ...prev,
          };

          next[habit._id] = [
            today,
            ...(next[
              habit._id
            ] || []),
          ];

          return next;
        }
      );

      celebrate();

      // Big celebration when all habits
      // are completed today
      setTimeout(() => {
        const nextDone =
          completedToday.size + 1;

        if (
          nextDone ===
            habits.length &&
          habits.length > 0
        ) {
          celebrateBig();
        }
      }, 150);
    }
  };

  // ==================================================
  // SAVE HABIT
  // ==================================================

  const saveHabit = async (data) => {
    setSubmitting(true);

    try {
      if (editing) {
        const res =
          await api.put(
            `/habits/${editing._id}`,
            data
          );

        setHabits(
          (current) =>
            current.map(
              (habit) =>
                habit._id ===
                res.data._id
                  ? res.data
                  : habit
            )
        );
      } else {
        const res =
          await api.post(
            "/habits",
            data
          );

        setHabits(
          (current) => [
            ...current,
            res.data,
          ]
        );

        setAllLogsByHabit(
          (current) => ({
            ...current,
            [res.data._id]: [],
          })
        );
      }

      setFormOpen(false);
      setEditing(null);
    } finally {
      setSubmitting(false);
    }
  };

  // ==================================================
  // DELETE HABIT
  // ==================================================

  const deleteHabit = async (habit) => {
    await api.delete(
      `/habits/${habit._id}`
    );

    setHabits(
      (current) =>
        current.filter(
          (item) =>
            item._id !== habit._id
        )
    );

    setTodayLogs(
      (logs) =>
        logs.filter(
          (log) =>
            String(
              log.habitId
            ) !==
            String(habit._id)
        )
    );

    setAllLogsByHabit(
      (prev) => {
        const next = {
          ...prev,
        };

        delete next[
          habit._id
        ];

        return next;
      }
    );

    setDeleteTarget(null);
  };

  // ==================================================
  // ARCHIVE HABIT
  // ==================================================

  const archiveHabit = async (
    habit
  ) => {
    const res =
      await api.put(
        `/habits/${habit._id}/archive`
      );

    if (res.data.isArchived) {
      setHabits(
        (current) =>
          current.filter(
            (item) =>
              item._id !==
              habit._id
          )
      );
    } else {
      setHabits(
        (current) =>
          current.map(
            (item) =>
              item._id ===
              res.data._id
                ? res.data
                : item
          )
      );
    }
  };

  // ==================================================
  // ACCEPT AI SUGGESTION
  // ==================================================

  const acceptSuggestion = async (
    suggestion
  ) => {
    const res =
      await api.post(
        "/habits",
        {
          name: suggestion.name,
          description:
            suggestion.description,
          category:
            suggestion.category,
          frequency:
            suggestion.frequency,
          icon:
            suggestion.icon,
          targetDays:
            suggestion.frequency ===
            "daily"
              ? 7
              : 3,
        }
      );

    setHabits(
      (current) => [
        ...current,
        res.data,
      ]
    );

    setAllLogsByHabit(
      (current) => ({
        ...current,
        [res.data._id]: [],
      })
    );
  };

  // ==================================================
  // RUN AI AGENT
  // ==================================================

  const runAgent = async () => {
    if (!agentGoal.trim()) {
      setAgentError(
        "Please enter a goal for the AI Agent."
      );
      return;
    }

    setAgentRunning(true);
    setAgentError("");
    setAgentResult(null);

    try {
      const res = await api.post(
        "/ai/agent",
        {
          goal: agentGoal.trim(),
        }
      );

      setAgentResult(res.data);

      // Reload dashboard data because
      // the AI Agent may have created or
      // updated a habit in the database.
      await loadAll();
    } catch (err) {
      console.error(
        "AI Agent error:",
        err
      );

      setAgentError(
        err?.response?.data?.message ||
          "AI Agent failed. Please try again."
      );
    } finally {
      setAgentRunning(false);
    }
  };

  // ==================================================
  // CLOSE AI AGENT MODAL
  // ==================================================

  const closeAgent = () => {
    if (agentRunning) return;

    setAgentOpen(false);
    setAgentGoal("");
    setAgentResult(null);
    setAgentError("");
  };

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <LoadingSpinner full />
    );
  }

  // ==================================================
  // DASHBOARD
  // ==================================================

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="flex items-center justify-between gap-3">

        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Hey{" "}
            {user?.name?.split(" ")[0]}{" "}
            👋
          </h1>

          <p className="text-sm text-muted mt-0.5">
            {new Date().toLocaleDateString(
              undefined,
              {
                weekday: "long",
                month: "long",
                day: "numeric",
              }
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">

          {/* AI AGENT BUTTON */}

          <button
            className="btn-secondary"
            onClick={() => {
              setAgentOpen(true);
              setAgentResult(null);
              setAgentError("");
            }}
          >
            <Bot size={14} />

            <span className="hidden sm:inline">
              Run AI Agent
            </span>
          </button>

          {/* SUGGEST HABIT */}

          <button
            className="btn-secondary"
            onClick={() =>
              setSuggestOpen(true)
            }
          >
            <Sparkles size={14} />

            <span className="hidden sm:inline">
              Suggest a habit
            </span>
          </button>

          {/* NEW HABIT */}

          <button
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus size={14} />
            New habit
          </button>

        </div>
      </div>

      {/* ==================================================
          MORNING MOTIVATION
      ================================================== */}

      <MorningMotivation />

      {/* ==================================================
          RECOVERY
      ================================================== */}

      {recoveryHabit && (
        <StreakRecoveryCard
          habit={recoveryHabit}
          onDismiss={() => {
            const dismissed =
              JSON.parse(
                localStorage.getItem(
                  "recovery-dismissed"
                ) || "{}"
              );

            dismissed[
              recoveryHabit._id
            ] = Date.now();

            localStorage.setItem(
              "recovery-dismissed",
              JSON.stringify(
                dismissed
              )
            );

            setRecoveryHabit(null);
          }}
        />
      )}

      {/* ==================================================
          SUMMARY
      ================================================== */}

      <SummaryCards
        totalHabits={habits.length}
        activeStreaks={activeStreaks}
        bestStreak={bestStreak}
        weekRate={weekRate}
      />

      {/* ==================================================
          AI HABIT HEALTH
      ================================================== */}

      <HabitHealthCard />

      {/* ==================================================
          TODAY'S HABITS
      ================================================== */}

      <div className="card p-5">

        <div className="flex items-center justify-between mb-4">

          <div>
            <div className="text-sm font-medium">
              Today's habits
            </div>

            <div className="text-xs text-muted">
              {completedToday.size} of{" "}
              {habits.length} complete
            </div>
          </div>

          <div className="flex items-center gap-3">

            <div className="relative">

              <ProgressRing
                value={
                  todayProgress
                }
                size={52}
                stroke={5}
              />

              <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
                {todayProgress}%
              </div>

            </div>

          </div>

        </div>

        {habits.length === 0 ? (

          <div className="text-center py-8">

            <div className="text-5xl mb-3">
              🎯
            </div>

            <div className="font-medium">
              Let's build your first habit
            </div>

            <div className="text-sm text-muted mt-1">
              Start small — something you
              can do in under 5 minutes.
            </div>

            <button
              className="btn-primary mt-4"
              onClick={() =>
                setFormOpen(true)
              }
            >
              <Plus size={14} />
              Create habit
            </button>

          </div>

        ) : (

          <div className="space-y-2">

            {habits.map(
              (habit) => (
                <TodayHabitCard
                  key={habit._id}
                  habit={habit}
                  completed={completedToday.has(
                    String(
                      habit._id
                    )
                  )}
                  streak={
                    streaksById[
                      habit._id
                    ]?.current || 0
                  }
                  onToggle={() =>
                    toggle(habit)
                  }
                  onEdit={() => {
                    setEditing(
                      habit
                    );

                    setFormOpen(
                      true
                    );
                  }}
                  onArchive={() =>
                    archiveHabit(
                      habit
                    )
                  }
                  onDelete={() =>
                    setDeleteTarget(
                      habit
                    )
                  }
                />
              )
            )}

          </div>

        )}

      </div>

      {/* ==================================================
          AI WEEKLY REPORT
      ================================================== */}

      <AIWeeklyReport />

      {/* ==================================================
          WEEKLY + HEATMAP
      ================================================== */}

      <div className="grid lg:grid-cols-12 gap-5">

        <div className="col-span-8">
          <WeeklyGrid
            habits={habits}
            logsByHabit={
              weekLogsByHabit
            }
          />
        </div>

        <div className="col-span-4">
          <HeatmapChart
            data={heatmap}
          />
        </div>

      </div>

      {/* ==================================================
          HABIT FORM
      ================================================== */}

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        title={
          editing
            ? "Edit habit"
            : "New habit"
        }
      >
        <HabitForm
          initial={editing}
          submitting={submitting}
          onCancel={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSubmit={saveHabit}
        />
      </Modal>

      {/* ==================================================
          DELETE MODAL
      ================================================== */}

      <Modal
        open={!!deleteTarget}
        onClose={() =>
          setDeleteTarget(null)
        }
        title="Delete habit?"
        maxWidth="max-w-sm"
      >

        <p className="text-sm text-soft">
          This will permanently delete{" "}
          <b>
            {deleteTarget?.name}
          </b>{" "}
          and all its history.
          This can't be undone.
        </p>

        <div className="flex justify-end gap-2 mt-5">

          <button
            className="btn-secondary"
            onClick={() =>
              setDeleteTarget(null)
            }
          >
            Cancel
          </button>

          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 px-4 py-2.5 text-sm font-medium text-white hover:brightness-110 shadow-lg shadow-rose-500/30 transition"
            onClick={() =>
              deleteHabit(
                deleteTarget
              )
            }
          >
            Delete
          </button>

        </div>

      </Modal>

      {/* ==================================================
          AI SUGGESTIONS
      ================================================== */}

      <HabitSuggestionModal
        open={suggestOpen}
        onClose={() =>
          setSuggestOpen(false)
        }
        onAccept={
          acceptSuggestion
        }
      />

      {/* ==================================================
          AI AGENT MODAL
      ================================================== */}

      <Modal
        open={agentOpen}
        onClose={closeAgent}
        title="Run AI Agent"
        maxWidth="max-w-lg"
      >

        {/* INTRO */}

        {!agentResult && !agentRunning && (
          <div>

            <div className="flex items-start gap-3 mb-5">

              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-500/25 shrink-0">
                <Bot size={21} />
              </div>

              <div>
                <div className="font-semibold">
                  Let AI improve your routine
                </div>

                <p className="text-sm text-muted mt-1">
                  The AI Agent will analyze your
                  current habits and recent activity,
                  then make one useful change if needed.
                </p>
              </div>

            </div>

            <label className="text-xs font-medium text-muted">
              What should AI help you with?
            </label>

            <textarea
              value={agentGoal}
              onChange={(e) => {
                setAgentGoal(
                  e.target.value
                );
                setAgentError("");
              }}
              placeholder="Example: Improve my consistency"
              rows={3}
              className="w-full mt-2 rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/30 resize-none"
              disabled={agentRunning}
            />

            {agentError && (
              <div className="mt-3 rounded-xl bg-rose-500/10 text-rose-500 px-3 py-2.5 text-sm">
                {agentError}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-5">

              <button
                className="btn-secondary"
                onClick={closeAgent}
              >
                Cancel
              </button>

              <button
                className="btn-primary"
                onClick={runAgent}
              >
                <Bot size={14} />
                Run AI Agent
              </button>

            </div>

          </div>
        )}

        {/* RUNNING */}

        {agentRunning && (
          <div className="py-8 text-center">

            <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-500/10 flex items-center justify-center">
              <RefreshCw
                size={25}
                className="text-brand-500 animate-spin"
              />
            </div>

            <div className="font-semibold mt-4">
              AI is analyzing your routine...
            </div>

            <p className="text-sm text-muted mt-1">
              Checking your habits and recent activity.
            </p>

          </div>
        )}

        {/* RESULT */}

        {agentResult && !agentRunning && (
          <div>

            {/* SUCCESS HEADER */}

            <div className="flex items-start gap-3 mb-5">

              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <CheckCircle2
                  size={22}
                  className="text-emerald-500"
                />
              </div>

              <div>
                <div className="font-semibold">
                  AI Agent completed
                </div>

                <div className="text-sm text-muted mt-1">
                  The agent analyzed your routine
                  and made its decision.
                </div>
              </div>

            </div>

            {/* ACTION */}

            <div className="glass rounded-xl p-4">

              <div className="flex items-center gap-2 text-xs text-muted mb-2">
                <Wand2 size={14} />
                AI action
              </div>

              <div className="text-base font-semibold">
                {agentResult.action ===
                "update_habit"
                  ? "Habit updated"
                  : agentResult.action ===
                    "create_habit"
                  ? "New habit created"
                  : "No action needed"}
              </div>

              {/* HABIT */}

              {agentResult.habit && (
                <div className="mt-3 rounded-lg bg-brand-500/10 p-3">

                  <div className="font-medium">
                    {agentResult.habit.icon && (
                      <span className="mr-2">
                        {agentResult.habit.icon}
                      </span>
                    )}

                    {agentResult.habit.name}
                  </div>

                  {agentResult.habit.targetDays && (
                    <div className="text-xs text-muted mt-1">
                      Target:{" "}
                      {agentResult.habit.targetDays}{" "}
                      day
                      {agentResult.habit.targetDays ===
                      1
                        ? ""
                        : "s"}
                      / week
                    </div>
                  )}

                  {agentResult.habit.description && (
                    <div className="text-xs text-muted mt-1">
                      {agentResult.habit.description}
                    </div>
                  )}

                </div>
              )}

              {/* REASON */}

              {agentResult.reason && (
                <div className="mt-4">

                  <div className="text-xs font-semibold text-muted mb-1">
                    Why?
                  </div>

                  <p className="text-sm text-soft leading-relaxed">
                    {agentResult.reason}
                  </p>

                </div>
              )}

            </div>

            {/* DONE BUTTON */}

            <div className="flex justify-end mt-5">

              <button
                className="btn-primary"
                onClick={closeAgent}
              >
                Done
              </button>

            </div>

          </div>
        )}

      </Modal>

    </div>
  );
}