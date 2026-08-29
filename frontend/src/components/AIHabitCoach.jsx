import { useEffect, useState } from "react";
import {
  Brain,
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import api from "../api/axios.js";

export default function AIHabitCoach() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHealth = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const res = await api.get("/ai/health");
      setHealth(res.data);
    } catch (err) {
      console.error("AI Habit Coach error:", err);
      setHealth(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  if (loading) {
    return (
      <div className="card p-5 h-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
            <Brain size={19} className="text-brand-500" />
          </div>

          <div>
            <div className="text-sm font-semibold">
              AI Habit Coach
            </div>

            <div className="text-xs text-muted">
              Analysing your habits...
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center py-12 text-sm text-muted gap-2">
          <RefreshCw size={14} className="animate-spin" />
          Building your personalised coaching insight...
        </div>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="card p-5 h-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
            <Brain size={19} className="text-brand-500" />
          </div>

          <div className="flex-1">
            <div className="text-sm font-semibold">
              AI Habit Coach
            </div>

            <div className="text-xs text-muted">
              Personalised guidance from your habit data
            </div>
          </div>
        </div>

        <div className="text-sm text-muted text-center py-10">
          Unable to analyse your habits right now.
        </div>

        <button
          className="btn-secondary w-full"
          onClick={() => loadHealth(true)}
          disabled={refreshing}
        >
          <RefreshCw
            size={14}
            className={refreshing ? "animate-spin" : ""}
          />
          Try again
        </button>
      </div>
    );
  }

  const strongest = health.habitScores?.length
    ? [...health.habitScores].sort(
        (a, b) => b.score - a.score
      )[0]
    : null;

  const weakest = health.habitScores?.length
    ? [...health.habitScores].sort(
        (a, b) => a.score - b.score
      )[0]
    : null;

  const weeklyTrend = Number(health.weeklyTrend) || 0;

  const getTrendText = () => {
    if (weeklyTrend > 0) {
      return `+${weeklyTrend}% this week`;
    }

    if (weeklyTrend < 0) {
      return `${weeklyTrend}% this week`;
    }

    return "Stable this week";
  };

  return (
    <div className="card p-5 h-full relative overflow-hidden">
      {/* Subtle AI background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background:
            "radial-gradient(circle at 100% 0%, rgba(245,158,11,0.16), transparent 55%)",
        }}
      />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-500/25">
            <Brain size={19} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">
              AI Habit Coach
            </div>

            <div className="text-xs text-muted">
              Personalised guidance from your habits
            </div>
          </div>

          <button
            onClick={() => loadHealth(true)}
            disabled={refreshing}
            className="w-8 h-8 rounded-lg glass flex items-center justify-center hover:scale-105 transition"
            title="Refresh analysis"
          >
            <RefreshCw
              size={14}
              className={refreshing ? "animate-spin" : ""}
            />
          </button>
        </div>

        {/* Score */}
        <div className="glass rounded-xl p-4 mb-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted">
                Habit health
              </div>

              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-bold">
                  {health.score}
                </span>

                <span className="text-sm text-muted">
                  / 100
                </span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-muted">
                Status
              </div>

              <div className="font-semibold text-sm text-brand-500">
                {health.level}
              </div>
            </div>
          </div>

          <div className="mt-3 h-2 rounded-full overflow-hidden bg-[var(--chip-bg)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all"
              style={{
                width: `${Math.min(100, health.score)}%`,
              }}
            />
          </div>
        </div>

        {/* Intelligence metrics */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="glass rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted mb-1">
              <CheckCircle2
                size={13}
                className="text-emerald-500"
              />
              Consistency
            </div>

            <div className="text-lg font-semibold">
              {health.consistency ?? health.score}%
            </div>
          </div>

          <div className="glass rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted mb-1">
              <XCircle
                size={13}
                className="text-rose-500"
              />
              Missed
            </div>

            <div className="text-lg font-semibold">
              {health.missedHabits ?? 0}
            </div>
          </div>

          <div className="glass rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted mb-1">
              {weeklyTrend >= 0 ? (
                <TrendingUp
                  size={13}
                  className="text-emerald-500"
                />
              ) : (
                <TrendingDown
                  size={13}
                  className="text-rose-500"
                />
              )}
              Trend
            </div>

            <div
              className={`text-sm font-semibold ${
                weeklyTrend >= 0
                  ? "text-emerald-500"
                  : "text-rose-500"
              }`}
            >
              {getTrendText()}
            </div>
          </div>
        </div>

        {/* Score explanation */}
        {health.scoreReason && (
          <div className="rounded-xl bg-brand-500/10 p-3 mb-3">
            <div className="flex gap-2">
              <Brain
                size={16}
                className="text-brand-500 shrink-0 mt-0.5"
              />

              <div>
                <div className="text-xs font-semibold mb-1">
                  Why this score?
                </div>

                <div className="text-sm text-soft leading-relaxed">
                  {health.scoreReason}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Coach message */}
        <div className="rounded-xl bg-brand-500/10 p-3 mb-3">
          <div className="flex gap-2">
            <Lightbulb
              size={16}
              className="text-brand-500 shrink-0 mt-0.5"
            />

            <div className="text-sm text-soft">
              {health.message}
            </div>
          </div>
        </div>

        {/* Strongest / weakest */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="glass rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted mb-1">
              <TrendingUp
                size={13}
                className="text-emerald-500"
              />
              Strongest
            </div>

            <div className="text-sm font-medium truncate">
              {strongest?.name || health.strongestHabit || "—"}
            </div>

            {strongest && (
              <div className="text-xs text-emerald-500 mt-0.5">
                {strongest.score}% consistency
              </div>
            )}
          </div>

          <div className="glass rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted mb-1">
              <AlertTriangle
                size={13}
                className="text-amber-500"
              />
              Focus
            </div>

            <div className="text-sm font-medium truncate">
              {weakest?.name || health.weakestHabit || "—"}
            </div>

            {weakest && (
              <div className="text-xs text-amber-500 mt-0.5">
                {weakest.score}% consistency
              </div>
            )}
          </div>
        </div>

        {/* Active streaks */}
        <div className="glass rounded-xl p-3 mb-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted">
                Active strong habits
              </div>

              <div className="text-lg font-semibold mt-0.5">
                {health.activeStreaks ?? 0}
              </div>
            </div>

            <div className="text-xs text-muted">
              of {health.habitsAnalyzed || 0} habits
            </div>
          </div>
        </div>

        {/* AI recommendation */}
        <div className="glass rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <Target
              size={15}
              className="text-brand-500"
            />

            <span className="text-xs font-semibold">
              AI recommendation
            </span>
          </div>

          <p className="text-xs text-soft leading-relaxed">
            {health.recommendation ||
              (weakest
                ? `Give ${weakest.name} extra attention this week. Aim for one small, achievable improvement rather than trying to change everything at once.`
                : "Focus on one small improvement and build consistency gradually.")}
          </p>
        </div>
      </div>
    </div>
  );
}

