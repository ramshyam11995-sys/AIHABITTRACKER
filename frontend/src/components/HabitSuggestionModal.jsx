import { useState } from "react";
import { Sparkles, Check, RefreshCw } from "lucide-react";
import Modal from "./Modal.jsx";
import api from "../api/axios.js";

export default function HabitSuggestionModal({
  open,
  onClose,
  onAccept,
}) {
  const [step, setStep] = useState(0);

  const [goals, setGoals] = useState("");
  const [productiveTime, setProductiveTime] = useState("");
  const [struggles, setStruggles] = useState("");

  const [suggestions, setSuggestions] = useState([]);
  const [added, setAdded] = useState({});
  const [loading, setLoading] = useState(false);

  // AI Agent
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentResult, setAgentResult] = useState(null);
  const [agentActivities, setAgentActivities] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);

  // --------------------------------------------------
  // RESET
  // --------------------------------------------------

  const reset = () => {
    setStep(0);
    setGoals("");
    setProductiveTime("");
    setStruggles("");
    setSuggestions([]);
    setAdded({});
    setAgentLoading(false);
    setAgentResult(null);
    setAgentActivities([]);
    setActivityLoading(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  // --------------------------------------------------
  // GET AI HABIT SUGGESTIONS
  // --------------------------------------------------

  const submit = async () => {
    setLoading(true);

    try {
      const res = await api.post("/ai/suggest-habits", {
        goals,
        productiveTime,
        struggles,
      });

      setSuggestions(res.data.suggestions || []);
      setStep(3);
    } catch (err) {
      console.error("Suggestion error:", err);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // LOAD AGENT ACTIVITY
  // --------------------------------------------------

  const loadAgentActivities = async () => {
    setActivityLoading(true);

    try {
      const res = await api.get("/ai/agent/activity");

      setAgentActivities(res.data.activities || []);
    } catch (err) {
      console.error("Agent activity error:", err);
    } finally {
      setActivityLoading(false);
    }
  };

  // --------------------------------------------------
  // RUN AUTONOMOUS AI AGENT
  // --------------------------------------------------

  const runAgent = async () => {
    setAgentLoading(true);
    setAgentResult(null);

    try {
      const res = await api.post("/ai/agent", {
        goal: goals,
      });

      setAgentResult(res.data);

      // Load latest activity after agent finishes
      await loadAgentActivities();
    } catch (err) {
      console.error("Agent error:", err);

      setAgentResult({
        action: "no_action",
        reason: "Unable to run the AI Agent.",
      });
    } finally {
      setAgentLoading(false);
    }
  };

  // --------------------------------------------------
  // ACCEPT SUGGESTED HABIT
  // --------------------------------------------------

  const accept = async (suggestion, index) => {
    try {
      await onAccept(suggestion);

      setAdded((current) => ({
        ...current,
        [index]: true,
      }));
    } catch (err) {
      console.error("Add habit error:", err);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="AI Habit Suggestions"
      maxWidth="max-w-xl"
    >
      {/* ==================================================
          STEP 0
      ================================================== */}

      {step === 0 && (
        <div className="space-y-4">
          <div className="text-sm text-soft">
            Answer 3 quick questions and I'll suggest 3
            personalised habits.
          </div>

          <div>
            <label className="label">
              What are your goals right now?
            </label>

            <textarea
              className="input resize-none"
              rows={3}
              placeholder="e.g. Get fitter, read more, reduce phone time..."
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              className="btn-secondary"
              onClick={close}
            >
              Cancel
            </button>

            <button
              className="btn-primary"
              onClick={() => setStep(1)}
              disabled={!goals.trim()}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ==================================================
          STEP 1
      ================================================== */}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="label">
              When are you most productive during the day?
            </label>

            <textarea
              className="input resize-none"
              rows={3}
              placeholder="e.g. Early morning, late evenings..."
              value={productiveTime}
              onChange={(e) => setProductiveTime(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex justify-between gap-2">
            <button
              className="btn-ghost"
              onClick={() => setStep(0)}
            >
              Back
            </button>

            <button
              className="btn-primary"
              onClick={() => setStep(2)}
              disabled={!productiveTime.trim()}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ==================================================
          STEP 2
      ================================================== */}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="label">
              What habits have you struggled with?
            </label>

            <textarea
              className="input resize-none"
              rows={3}
              placeholder="e.g. Gym in the morning, journaling at night..."
              value={struggles}
              onChange={(e) => setStruggles(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex justify-between gap-2">
            <button
              className="btn-ghost"
              onClick={() => setStep(1)}
            >
              Back
            </button>

            <button
              className="btn-primary"
              onClick={submit}
              disabled={loading || !struggles.trim()}
            >
              {loading ? (
                <>
                  <RefreshCw
                    size={14}
                    className="animate-spin"
                  />
                  Thinking...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Get suggestions
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ==================================================
          STEP 3
      ================================================== */}

      {step === 3 && (
        <div className="space-y-4">

          {/* ==================================================
              AUTONOMOUS AI AGENT
          ================================================== */}

          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles
                size={18}
                className="text-brand-500"
              />

              <div>
                <div className="font-semibold">
                  Autonomous AI Agent
                </div>

                <div className="text-xs text-soft">
                  Let AI analyze your habits and take one useful
                  action.
                </div>
              </div>
            </div>

            <button
              className="btn-primary w-full"
              onClick={runAgent}
              disabled={agentLoading}
            >
              {agentLoading ? (
                <>
                  <RefreshCw
                    size={14}
                    className="animate-spin"
                  />
                  Agent working...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Run AI Agent
                </>
              )}
            </button>
          </div>

          {/* ==================================================
              AGENT RESULT
          ================================================== */}

          {agentResult && (
            <div className="glass rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Check
                  size={17}
                  className="text-emerald-500"
                />

                <strong>
                  AI Agent completed
                </strong>
              </div>

              <div>
                <strong>Action:</strong>{" "}
                {agentResult.action === "create_habit"
                  ? "Created a new habit"
                  : agentResult.action === "update_habit"
                  ? "Updated an existing habit"
                  : "No action needed"}
              </div>

              {agentResult.habit && (
                <div>
                  <strong>Habit:</strong>{" "}
                  {agentResult.habit.name}
                </div>
              )}

              {agentResult.habit &&
                agentResult.action === "create_habit" && (
                  <div className="text-sm text-soft space-y-1">
                    <div>
                      Category: {agentResult.habit.category}
                    </div>

                    <div>
                      Frequency: {agentResult.habit.frequency}
                    </div>

                    <div>
                      Target: {agentResult.habit.targetDays} days/week
                    </div>
                  </div>
                )}

              {agentResult.habit &&
                agentResult.action === "update_habit" && (
                  <div className="text-sm text-soft">
                    The AI modified this habit based on your
                    recent activity.
                  </div>
                )}

              <div className="bg-brand-500/10 rounded-lg p-3 text-sm">
                <strong>Why:</strong>{" "}
                {agentResult.reason}
              </div>
            </div>
          )}

          {/* ==================================================
              AGENT ACTIVITY HISTORY
          ================================================== */}

          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles
                  size={16}
                  className="text-brand-500"
                />

                <strong>
                  Agent Activity
                </strong>
              </div>

              <button
                className="btn-ghost text-xs"
                onClick={loadAgentActivities}
                disabled={activityLoading}
              >
                {activityLoading ? (
                  <>
                    <RefreshCw
                      size={12}
                      className="animate-spin"
                    />
                    Loading...
                  </>
                ) : (
                  "Refresh"
                )}
              </button>
            </div>

            {agentActivities.length === 0 ? (
              <div className="text-sm text-muted">
                No agent activity yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {agentActivities.map((activity) => (
                  <div
                    key={activity._id}
                    className="rounded-lg border border-white/10 p-3 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong>
                        {activity.action === "create_habit"
                          ? "Created habit"
                          : activity.action === "update_habit"
                          ? "Updated habit"
                          : "No action"}
                      </strong>

                      <span
                        className={
                          activity.status === "executed"
                            ? "text-emerald-500"
                            : activity.status === "failed"
                            ? "text-red-500"
                            : "text-yellow-500"
                        }
                      >
                        {activity.status}
                      </span>
                    </div>

                    {activity.habitName && (
                      <div className="mt-1 text-soft">
                        Habit: {activity.habitName}
                      </div>
                    )}

                    {activity.reason && (
                      <div className="mt-1 text-xs text-muted">
                        {activity.reason}
                      </div>
                    )}

                    {activity.createdAt && (
                      <div className="mt-1 text-[11px] text-muted">
                        {new Date(
                          activity.createdAt
                        ).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ==================================================
              NORMAL AI SUGGESTIONS
          ================================================== */}

          {suggestions.length === 0 && (
            <div className="text-sm text-muted">
              No suggestions returned. Try again.
            </div>
          )}

          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="glass rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xl">
                  {suggestion.icon}
                </span>

                <div className="font-medium">
                  {suggestion.name}
                </div>

                <span className="chip">
                  {suggestion.category}
                </span>

                <span className="chip">
                  {suggestion.frequency}
                </span>
              </div>

              <div className="text-sm text-soft">
                {suggestion.description}
              </div>

              {suggestion.reason && (
                <div className="text-xs text-brand-700 dark:text-brand-300 mt-2 bg-brand-500/10 rounded-lg px-2 py-1.5">
                  Why: {suggestion.reason}
                </div>
              )}

              <div className="mt-3 flex justify-end">
                {added[index] ? (
                  <div className="text-sm text-emerald-500 flex items-center gap-1">
                    <Check size={14} />
                    Added
                  </div>
                ) : (
                  <button
                    className="btn-primary"
                    onClick={() =>
                      accept(suggestion, index)
                    }
                  >
                    Add this habit
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* ==================================================
              DONE
          ================================================== */}

          <div className="flex justify-end">
            <button
              className="btn-secondary"
              onClick={close}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}