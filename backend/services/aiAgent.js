import Habit from "../models/Habit.js";
import HabitLog from "../models/HabitLog.js";
import AgentActivity from "../models/AgentActivity.js";
import { chatCompletion } from "../utils/aiService.js";

const ALLOWED_CATEGORIES = [
    "Health",
    "Fitness",
    "Mindfulness",
    "Productivity",
    "Social",
    "Finance",
    "Creative",
    "Other",
];

const ALLOWED_FREQUENCIES = ["daily", "weekly"];

const clampTargetDays = (value, frequency) => {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return 1;
    }

    if (frequency === "daily") {
        return Math.min(Math.max(Math.round(number), 1), 7);
    }

    return Math.min(Math.max(Math.round(number), 1), 7);
};

const saveAgentActivity = async ({
    userId,
    action,
    reason,
    habitId = null,
    habitName = "",
    status = "executed",
    changes = {},
}) => {
    try {
        await AgentActivity.create({
            userId,
            action,
            reason,
            habitId,
            habitName,
            status,
            changes,
        });
    } catch (error) {
        // Activity logging should never break the AI Agent itself.
        console.error("AgentActivity save error:", error);
    }
};

export const runHabitAgent = async (userId, goal = "") => {

    // --------------------------------------------------
    // 1. OBSERVE
    // --------------------------------------------------

    const habits = await Habit.find({
        userId,
        isArchived: false,
    });

    const logs = await HabitLog.find({
        userId,
    })
        .sort({ completedDate: -1 })
        .limit(30);

    const userData = {
        goal: goal || "Improve my current habit routine.",

        habits: habits.map((h) => ({
            id: String(h._id),
            name: h.name,
            category: h.category,
            frequency: h.frequency,
            targetDays: h.targetDays,
            description: h.description || "",
        })),

        recentLogs: logs.map((l) => ({
            habitId: String(l.habitId),
            completedDate: l.completedDate,
        })),
    };

    // --------------------------------------------------
    // 2. ASK GEMINI TO ANALYZE + DECIDE
    // --------------------------------------------------

    const result = await chatCompletion({
        system: `
You are an autonomous AI habit management agent.

Your job is to analyze the user's current habits and recent activity,
identify one useful improvement, and choose ONE action.

You are NOT a chatbot.

You must make a practical decision that can be executed by the backend.

Possible actions:

1. update_habit
2. create_habit
3. no_action

Return JSON ONLY.

Required format:

{
  "action": "update_habit" | "create_habit" | "no_action",
  "habitId": "existing habit id or null",
  "reason": "short explanation based on the user's data",
  "changes": {
    "targetDays": null,
    "description": ""
  },
  "newHabit": {
    "name": "",
    "description": "",
    "category": "Health|Fitness|Mindfulness|Productivity|Social|Finance|Creative|Other",
    "frequency": "daily|weekly",
    "targetDays": 1
  }
}

Rules:

- Only choose update_habit when an existing habit clearly needs improvement.
- Only choose create_habit when a useful missing habit can be inferred.
- Do not create duplicate habits.
- Do not invent user activity.
- Do not change unrelated habits.
- Keep targetDays between 1 and 7.
- category MUST be one of:
  Health, Fitness, Mindfulness, Productivity, Social, Finance, Creative, Other.
- frequency MUST be daily or weekly.
- If there is not enough evidence for a useful action, choose no_action.
- Make only ONE action.
- Keep the reason concise.
`,
        user: JSON.stringify(userData),
    });

    // --------------------------------------------------
    // 3. PARSE GEMINI DECISION
    // --------------------------------------------------

    let decision;

    try {
        const cleaned = result.content
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

        decision = JSON.parse(cleaned);
    } catch (error) {
        console.error("AI Agent JSON parse error:", error);

        await saveAgentActivity({
            userId,
            action: "no_action",
            reason: "Agent returned an invalid decision.",
            status: "failed",
        });

        return {
            action: "no_action",
            reason: "Agent returned an invalid decision.",
        };
    }

    // --------------------------------------------------
    // 4. VALIDATE ACTION
    // --------------------------------------------------

    const validActions = [
        "update_habit",
        "create_habit",
        "no_action",
    ];

    if (!validActions.includes(decision.action)) {

        await saveAgentActivity({
            userId,
            action: "no_action",
            reason: "Agent returned an unsupported action.",
            status: "failed",
        });

        return {
            action: "no_action",
            reason: "Agent returned an unsupported action.",
        };
    }

    // --------------------------------------------------
    // 5. EXECUTE UPDATE
    // --------------------------------------------------

    if (
        decision.action === "update_habit" &&
        decision.habitId
    ) {
        const habit = await Habit.findOne({
            _id: decision.habitId,
            userId,
            isArchived: false,
        });

        if (!habit) {

            await saveAgentActivity({
                userId,
                action: "update_habit",
                reason: "The selected habit could not be found.",
                habitId: decision.habitId,
                status: "failed",
            });

            return {
                action: "no_action",
                reason: "The selected habit could not be found.",
            };
        }

        const changes = decision.changes || {};

        let changed = false;

        const appliedChanges = {};

        if (
            changes.targetDays !== null &&
            changes.targetDays !== undefined
        ) {
            const newTargetDays = clampTargetDays(
                changes.targetDays,
                habit.frequency
            );

            habit.targetDays = newTargetDays;

            appliedChanges.targetDays = newTargetDays;

            changed = true;
        }

        if (
            typeof changes.description === "string" &&
            changes.description.trim()
        ) {
            habit.description = changes.description.trim();

            appliedChanges.description =
                changes.description.trim();

            changed = true;
        }

        if (!changed) {

            await saveAgentActivity({
                userId,
                action: "update_habit",
                reason:
                    "The agent did not provide a valid habit change.",
                habitId: habit._id,
                habitName: habit.name,
                status: "failed",
            });

            return {
                action: "no_action",
                reason:
                    "The agent did not provide a valid habit change.",
            };
        }

        await habit.save();

        const reason =
            decision.reason ||
            "The agent improved an existing habit.";

        // RECORD REAL AGENT ACTION
        await saveAgentActivity({
            userId,
            action: "update_habit",
            reason,
            habitId: habit._id,
            habitName: habit.name,
            status: "executed",
            changes: appliedChanges,
        });

        return {
            action: "update_habit",
            reason,
            habit,
        };
    }

    // --------------------------------------------------
    // 6. EXECUTE CREATE
    // --------------------------------------------------

    if (
        decision.action === "create_habit" &&
        decision.newHabit
    ) {
        const newHabit = decision.newHabit;

        const name =
            typeof newHabit.name === "string"
                ? newHabit.name.trim()
                : "";

        if (!name) {

            await saveAgentActivity({
                userId,
                action: "create_habit",
                reason:
                    "The agent did not provide a valid habit name.",
                status: "failed",
            });

            return {
                action: "no_action",
                reason:
                    "The agent did not provide a valid habit name.",
            };
        }

        const category = ALLOWED_CATEGORIES.includes(
            newHabit.category
        )
            ? newHabit.category
            : "Other";

        const frequency = ALLOWED_FREQUENCIES.includes(
            newHabit.frequency
        )
            ? newHabit.frequency
            : "daily";

        // Prevent duplicate habits
        const duplicate = await Habit.findOne({
            userId,
            isArchived: false,
            name: {
                $regex: `^${name.replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&"
                )}$`,
                $options: "i",
            },
        });

        if (duplicate) {

            await saveAgentActivity({
                userId,
                action: "create_habit",
                reason: "A similar habit already exists.",
                habitId: duplicate._id,
                habitName: duplicate.name,
                status: "skipped",
            });

            return {
                action: "no_action",
                reason: "A similar habit already exists.",
            };
        }

        const count = await Habit.countDocuments({
            userId,
        });

        const targetDays = clampTargetDays(
            newHabit.targetDays,
            frequency
        );

        const description =
            typeof newHabit.description === "string"
                ? newHabit.description.trim()
                : "";

        const habit = await Habit.create({
            userId,
            name,
            description,
            category,
            frequency,
            targetDays,
            order: count,
        });

        const reason =
            decision.reason ||
            "The agent created a useful new habit.";

        // RECORD REAL AGENT ACTION
        await saveAgentActivity({
            userId,
            action: "create_habit",
            reason,
            habitId: habit._id,
            habitName: habit.name,
            status: "executed",
            changes: {
                name: habit.name,
                description: habit.description,
                category: habit.category,
                frequency: habit.frequency,
                targetDays: habit.targetDays,
            },
        });

        return {
            action: "create_habit",
            reason,
            habit,
        };
    }

    // --------------------------------------------------
    // 7. NO ACTION
    // --------------------------------------------------

    const reason =
        decision.reason ||
        "No useful action was needed.";

    await saveAgentActivity({
        userId,
        action: "no_action",
        reason,
        status: "skipped",
    });

    return {
        action: "no_action",
        reason,
    };
};