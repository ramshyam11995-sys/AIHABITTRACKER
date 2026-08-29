import { useEffect, useState } from "react";
import { Brain, Sparkles, TrendingUp, AlertTriangle, RefreshCw } from "lucide-react";
import api from "../api/axios.js";

export default function AIHealthCard() {
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
      console.error("AI health error:", err);
      setError("Unable to calculate your habit health.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  if (loading) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-3">
          <RefreshCw
            size={18}
            className="animate-spin text-brand-500"
          />
          <div>
            <div className="font-medium">
              AI is analyzing your habits...
            </div>
            <div className="text-xs text-muted mt-1">
              Calculating your consistency score
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-5">
        <div className="text-sm text-rose-500">
          {error}
        </div>

        <button
          className="btn-secondary mt-3"
          onClick={loadHealth}
        >
          Try again
        </button>
      </div>
    );
  }

  if (!health) return null;

  const score = Number(health.score || 0);

  return (
    <div className="card p-5 overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
            <Brain
              size={20}
              className="text-brand-500"
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">
                AI Habit Health
              </h2>

              <span className="chip">
                <Sparkles size={11} />
                AI ANALYZED
              </span>
            </div>

            <p className="text-xs text-muted mt-0.5">
              Based on your recent habit consistency
            </p>
          </div>
        </div>

        <button
          className="btn-ghost"
          onClick={loadHealth}
          title="Refresh health score"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Score */}
      <div className="grid md:grid-cols-[180px_1fr] gap-6 items-center">
        <div className="flex justify-center">
          <div className="relative w-36 h-36">
            <div className="absolute inset-0 rounded-full border-[10px] border-brand-500/10" />

            <div
              className="absolute inset-0 rounded-full border-[10px] border-brand-500"
              style={{
                clipPath: `inset(${100 - score}% 0 0 0)`,
              }}
            />

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-4xl font-bold">
                {score}
              </div>

              <div className="text-xs text-muted">
                / 100
              </div>
            </div>
          </div>
        </div>

        {/* Score explanation */}
        <div>
          <div className="text-xl font-semibold">
            {health.level}
          </div>

          <p className="text-sm text-soft mt-1 leading-relaxed">
            {health.message}
          </p>

          <div className="text-xs text-muted mt-3">
            {health.habitsAnalyzed}{" "}
            {health.habitsAnalyzed === 1
              ? "habit"
              : "habits"}{" "}
            analyzed
          </div>
        </div>
      </div>

      {/* Strengths + Improvements */}
      <div className="grid md:grid-cols-2 gap-4 mt-6">
        {/* Strengths */}
        <div className="rounded-xl bg-emerald-500/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp
              size={16}
              className="text-emerald-500"
            />

            <span className="text-sm font-medium">
              What's going well
            </span>
          </div>

          {health.strengths?.length > 0 ? (
            <div className="space-y-2">
              {health.strengths.map((item, index) => (
                <div
                  key={index}
                  className="text-xs text-soft"
                >
                  ✓ {item}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted">
              Keep going — your strengths will appear as
              consistency improves.
            </div>
          )}
        </div>

        {/* Improvements */}
        <div className="rounded-xl bg-amber-500/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle
              size={16}
              className="text-amber-500"
            />

            <span className="text-sm font-medium">
              Needs attention
            </span>
          </div>

          {health.improvements?.length > 0 ? (
            <div className="space-y-2">
              {health.improvements.map((item, index) => (
                <div
                  key={index}
                  className="text-xs text-soft"
                >
                  • {item}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted">
              Excellent! No major weak areas detected.
            </div>
          )}
        </div>
      </div>

      {/* Habit breakdown */}
      {health.habitScores?.length > 0 && (
        <div className="mt-5">
          <div className="text-sm font-medium mb-3">
            Habit consistency
          </div>

          <div className="space-y-3">
            {health.habitScores.slice(0, 5).map((habit) => (
              <div key={habit.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-soft">
                    {habit.name}
                  </span>

                  <span className="font-medium">
                    {habit.score}%
                  </span>
                </div>

                <div className="h-1.5 rounded-full bg-brand-500/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-500 transition-all"
                    style={{
                      width: `${habit.score}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}