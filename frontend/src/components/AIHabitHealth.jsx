import { useEffect, useState } from "react";
import {
  Sparkles,
  TrendingUp,
  Target,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import api from "../api/axios.js";

export default function AIHabitHealth() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHealth = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await api.get("/ai/health");
      setHealth(res.data);
    } catch (err) {
      console.error("Habit health error:", err);

      setError(
        err?.response?.data?.message ||
          "Unable to load your AI habit health."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  const getScoreClass = (score) => {
    if (score >= 85) return "text-emerald-400";
    if (score >= 70) return "text-emerald-400";
    if (score >= 50) return "text-amber-400";
    if (score >= 30) return "text-orange-400";
    return "text-rose-400";
  };

  const getRingClass = (score) => {
    if (score >= 85) return "border-emerald-400/40";
    if (score >= 70) return "border-emerald-400/40";
    if (score >= 50) return "border-amber-400/40";
    if (score >= 30) return "border-orange-400/40";
    return "border-rose-400/40";
  };

  const getIcon = (score) => {
    if (score >= 70) return <TrendingUp size={18} />;
    if (score >= 50) return <Target size={18} />;
    return <AlertTriangle size={18} />;
  };

  if (loading) {
    return (
      <div className="card p-5 h-full min-h-[420px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-brand-500/10 flex items-center justify-center mb-3">
            <Sparkles
              size={22}
              className="text-brand-400 animate-pulse"
            />
          </div>

          <div className="text-sm font-medium">
            AI is analyzing your habits...
          </div>

          <div className="text-xs text-muted mt-1">
            Looking at your recent consistency
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-5 h-full min-h-[420px]">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles
            size={18}
            className="text-brand-400"
          />

          <div>
            <div className="font-semibold">
              AI Habit Health
            </div>

            <div className="text-xs text-muted">
              Personalized consistency analysis
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center h-[320px] text-center">
          <AlertTriangle
            size={30}
            className="text-amber-400 mb-3"
          />

          <p className="text-sm text-soft">
            {error}
          </p>

          <button
            className="btn-secondary mt-4"
            onClick={loadHealth}
          >
            <RefreshCw size={14} />
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!health) return null;

  const score = Number(health.score || 0);

  return (
    <div className="card p-5 h-full min-h-[420px] overflow-hidden relative">
      {/* Background glow */}
      <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-brand-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-brand-500/10 flex items-center justify-center">
            <Sparkles
              size={18}
              className="text-brand-400"
            />
          </div>

          <div>
            <div className="font-semibold">
              AI Habit Health
            </div>

            <div className="text-xs text-muted">
              Your consistency snapshot
            </div>
          </div>
        </div>

        <button
          onClick={loadHealth}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-white hover:bg-white/5 transition"
          title="Refresh analysis"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Score */}
      <div className="relative flex flex-col items-center">
        <div
          className={`w-36 h-36 rounded-full border-[10px] ${getRingClass(
            score
          )} flex flex-col items-center justify-center bg-black/10`}
        >
          <div
            className={`text-4xl font-bold tracking-tight ${getScoreClass(
              score
            )}`}
          >
            {score}
          </div>

          <div className="text-[11px] text-muted uppercase tracking-wider">
            health score
          </div>
        </div>

        <div
          className={`mt-3 flex items-center gap-1.5 text-sm font-semibold ${getScoreClass(
            score
          )}`}
        >
          {getIcon(score)}
          {health.level}
        </div>
      </div>

      {/* AI message */}
      <div className="relative mt-4 rounded-xl bg-brand-500/10 border border-brand-500/10 p-3">
        <div className="flex gap-2">
          <Sparkles
            size={15}
            className="text-brand-400 mt-0.5 shrink-0"
          />

          <p className="text-xs leading-relaxed text-soft">
            {health.message}
          </p>
        </div>
      </div>

      {/* Strengths */}
      {health.strengths?.length > 0 && (
        <div className="relative mt-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2
              size={15}
              className="text-emerald-400"
            />

            <span className="text-xs font-semibold">
              What's going well
            </span>
          </div>

          <div className="space-y-1.5">
            {health.strengths.slice(0, 2).map((item, index) => (
              <div
                key={index}
                className="text-xs text-soft pl-5"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Improvements */}
      {health.improvements?.length > 0 && (
        <div className="relative mt-4">
          <div className="flex items-center gap-2 mb-2">
            <Target
              size={15}
              className="text-amber-400"
            />

            <span className="text-xs font-semibold">
              Focus next
            </span>
          </div>

          <div className="space-y-1.5">
            {health.improvements.slice(0, 2).map((item, index) => (
              <div
                key={index}
                className="text-xs text-soft pl-5"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="relative mt-5 pt-3 border-t border-white/5 flex items-center justify-between">
        <span className="text-[11px] text-muted">
          {health.habitsAnalyzed || 0} habits analyzed
        </span>

        <span className="text-[11px] text-muted flex items-center gap-1">
          <Sparkles size={11} />
          AI powered
        </span>
      </div>
    </div>
  );
}