import { useEffect, useState } from "react";
import { Activity, RefreshCw, Sparkles, TrendingUp } from "lucide-react";
import api from "../api/axios.js";

export default function HabitHealthCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadHealth = async () => {
    setLoading(true);

    try {
      const res = await api.get("/ai/health");
      setData(res.data);
    } catch (err) {
      console.error("Habit health error:", err);
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
        <div className="flex items-center gap-2 text-sm text-soft">
          <RefreshCw size={15} className="animate-spin" />
          Analyzing your habit health...
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-brand-500" />

            <h2 className="font-semibold">
              Habit Health
            </h2>
          </div>

          <p className="text-xs text-muted mt-1">
            AI-powered consistency analysis
          </p>
        </div>

        <div className="text-right">
          <div className="text-3xl font-bold">
            {data.score}%
          </div>

          <div className="text-xs text-brand-500 font-medium">
            {data.level}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="mt-4">
        <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-700"
            style={{ width: `${data.score}%` }}
          />
        </div>
      </div>

      {/* AI message */}
      <div className="mt-4 rounded-xl bg-brand-500/10 p-3">
        <div className="flex gap-2">
          <Sparkles
            size={16}
            className="text-brand-500 mt-0.5 shrink-0"
          />

          <p className="text-sm">
            {data.message}
          </p>
        </div>
      </div>

      {/* Strengths */}
      {data.strengths?.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp size={15} className="text-emerald-500" />
            What's going well
          </div>

          <div className="mt-2 space-y-1">
            {data.strengths.map((item, index) => (
              <div
                key={index}
                className="text-xs text-soft"
              >
                • {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Improvements */}
      {data.improvements?.length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-medium">
            Focus areas
          </div>

          <div className="mt-2 space-y-1">
            {data.improvements.map((item, index) => (
              <div
                key={index}
                className="text-xs text-soft"
              >
                • {item}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-muted">
        Analyzed {data.habitsAnalyzed} active habit
        {data.habitsAnalyzed === 1 ? "" : "s"}
      </div>
    </div>
  );
}