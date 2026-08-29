import Habit from "../models/Habit.js";
import HabitLog from "../models/HabitLog.js";
import AIInsight from "../models/AIInsight.js";

import {
    chatCompletion,
    parseJSON,
    SYSTEM_PROMPTS,
} from "../utils/aiService.js";

import {
    todayKey,
    lastNDays,
} from "../utils/dateHelpers.js";


// ======================================================
// Helper: Get user's active habits and recent logs
// ======================================================

const getHabitContext = async (userId, days = 7) => {
    const habits = await Habit.find({
        userId,
        isArchived: false,
    }).lean();

    const daysList = lastNDays(days);

    const start = daysList[0];
    const end = daysList[daysList.length - 1];

    const logs = await HabitLog.find({
        userId,
        completedDate: {
            $gte: start,
            $lte: end,
        },
    })
        .sort({ completedDate: -1 })
        .lean();

    return {
        habits,
        logs,
        days: daysList,
    };
};


// ======================================================
// 1. WEEKLY AI REPORT
// POST /api/ai/weekly-report
// ======================================================

export const weeklyReport = async (req, res) => {
    try {
        const userId = req.user._id;

        const { habits, logs, days } =
            await getHabitContext(userId, 7);

        if (!habits.length) {
            return res.json({
                content:
                    "You don't have any active habits yet. Create your first habit and start building your routine!",
            });
        }

        const habitMap = {};

        for (const habit of habits) {
            habitMap[String(habit._id)] = habit;
        }

        const habitData = habits.map((habit) => {
            const habitLogs = logs.filter(
                (log) =>
                    String(log.habitId) ===
                    String(habit._id)
            );

            const completedDays = habitLogs.map(
                (log) => log.completedDate
            );

            const target =
                habit.frequency === "daily"
                    ? 7
                    : habit.targetDays || 1;

            const completionRate = Math.min(
                100,
                Math.round(
                    (completedDays.length / target) *
                        100
                )
            );

            return {
                name: habit.name,
                category: habit.category,
                frequency: habit.frequency,
                target,
                completed: completedDays.length,
                completionRate,
                completedDays,
            };
        });

        const promptData = {
            period: {
                start: days[0],
                end: days[days.length - 1],
            },
            habits: habitData,
            totalCompletions: logs.length,
        };

        const result = await chatCompletion({
            system: SYSTEM_PROMPTS.weekly,
            user: JSON.stringify(promptData),
            temperature: 0.7,
        });

        if (!result.ok) {
            return res.status(503).json({
                message: result.content,
            });
        }

        // Save AI insight
        try {
            await AIInsight.create({
                userId,
                type: "weekly",
                content: result.content,
            });
        } catch (err) {
            console.error(
                "AIInsight save error:",
                err.message
            );
        }

        res.json({
            content: result.content,
        });
    } catch (err) {
        console.error(
            "Weekly report error:",
            err
        );

        res.status(500).json({
            message:
                err.message ||
                "Unable to generate weekly report",
        });
    }
};


// ======================================================
// 2. AI HABIT SUGGESTIONS
// POST /api/ai/suggest-habits
// ======================================================

export const suggestHabits = async (req, res) => {
    try {
        const userId = req.user._id;

        const {
            goal = "",
            productiveTime = "",
            struggle = "",
        } = req.body;

        const { habits, logs } =
            await getHabitContext(userId, 30);

        const existingHabits = habits.map(
            (habit) => ({
                name: habit.name,
                category: habit.category,
                frequency: habit.frequency,
            })
        );

        const promptData = {
            goal,
            productiveTime,
            struggle,
            existingHabits,
            recentCompletions: logs.length,
        };

        const result = await chatCompletion({
            system: SYSTEM_PROMPTS.suggestion,
            user: JSON.stringify(promptData),
            temperature: 0.8,
        });

        if (!result.ok) {
            return res.status(503).json({
                message: result.content,
            });
        }

        let parsed;

        try {
            parsed = parseJSON(result.content);
        } catch (err) {
            console.error(
                "Suggestion JSON parse error:",
                err.message
            );

            return res.status(500).json({
                message:
                    "AI returned an invalid suggestion format.",
            });
        }

        res.json(parsed);
    } catch (err) {
        console.error(
            "Suggest habits error:",
            err
        );

        res.status(500).json({
            message:
                err.message ||
                "Unable to generate habit suggestions",
        });
    }
};


// ======================================================
// 3. STREAK RECOVERY PLAN
// POST /api/ai/recovery-plan
// ======================================================

export const recoveryPlan = async (req, res) => {
    try {
        const userId = req.user._id;

        const {
            habitId,
        } = req.body;

        if (!habitId) {
            return res.status(400).json({
                message: "habitId is required",
            });
        }

        const habit = await Habit.findOne({
            _id: habitId,
            userId,
        }).lean();

        if (!habit) {
            return res.status(404).json({
                message: "Habit not found",
            });
        }

        const logs = await HabitLog.find({
            userId,
            habitId,
        })
            .sort({ completedDate: -1 })
            .limit(30)
            .lean();

        const recentHistory = logs.map(
            (log) => log.completedDate
        );

        const promptData = {
            habit: {
                name: habit.name,
                description: habit.description,
                category: habit.category,
                frequency: habit.frequency,
                targetDays: habit.targetDays,
            },
            recentHistory,
            today: todayKey(),
        };

        const result = await chatCompletion({
            system: SYSTEM_PROMPTS.recovery,
            user: JSON.stringify(promptData),
            temperature: 0.75,
        });

        if (!result.ok) {
            return res.status(503).json({
                message: result.content,
            });
        }

        res.json({
            content: result.content,
        });
    } catch (err) {
        console.error(
            "Recovery plan error:",
            err
        );

        res.status(500).json({
            message:
                err.message ||
                "Unable to generate recovery plan",
        });
    }
};


// ======================================================
// 4. AI CHAT ANALYSIS
// POST /api/ai/chat
// ======================================================

export const chatAnalysis = async (req, res) => {
    try {
        const userId = req.user._id;

        const {
            message,
            question,
        } = req.body;

        const userQuestion =
            message || question;

        if (!userQuestion) {
            return res.status(400).json({
                message:
                    "Message is required",
            });
        }

        const {
            habits,
            logs,
            days,
        } = await getHabitContext(userId, 30);

        const habitData = habits.map(
            (habit) => {
                const habitLogs = logs.filter(
                    (log) =>
                        String(log.habitId) ===
                        String(habit._id)
                );

                return {
                    name: habit.name,
                    category: habit.category,
                    frequency: habit.frequency,
                    targetDays:
                        habit.targetDays,
                    completions:
                        habitLogs.length,
                    completedDates:
                        habitLogs.map(
                            (log) =>
                                log.completedDate
                        ),
                };
            }
        );

        const context = {
            today: todayKey(),
            period: {
                start: days[0],
                end: days[days.length - 1],
            },
            habits: habitData,
            totalCompletions: logs.length,
        };

        const result = await chatCompletion({
            system: SYSTEM_PROMPTS.chat,
            user: JSON.stringify({
                question: userQuestion,
                data: context,
            }),
            temperature: 0.6,
        });

        if (!result.ok) {
            return res.status(503).json({
                message: result.content,
            });
        }

        res.json({
            content: result.content,
        });
    } catch (err) {
        console.error(
            "Chat analysis error:",
            err
        );

        res.status(500).json({
            message:
                err.message ||
                "Unable to analyse your habits",
        });
    }
};


// ======================================================
// 5. MORNING MOTIVATION
// GET /api/ai/morning
// ======================================================

export const morningMotivation = async (
    req,
    res
) => {
    try {
        const userId = req.user._id;

        const {
            habits,
            logs,
        } = await getHabitContext(userId, 30);

        if (!habits.length) {
            return res.json({
                content:
                    "Start small today. One good habit is enough to begin building momentum.",
            });
        }

        const habitData = habits.map(
            (habit) => {
                const habitLogs = logs
                    .filter(
                        (log) =>
                            String(
                                log.habitId
                            ) ===
                            String(habit._id)
                    )
                    .map(
                        (log) =>
                            log.completedDate
                    );

                return {
                    name: habit.name,
                    category: habit.category,
                    frequency: habit.frequency,
                    recentCompletions:
                        habitLogs,
                };
            }
        );

        const result = await chatCompletion({
            system: SYSTEM_PROMPTS.morning,
            user: JSON.stringify({
                today: todayKey(),
                habits: habitData,
            }),
            temperature: 0.8,
        });

        if (!result.ok) {
            return res.status(503).json({
                message: result.content,
            });
        }

        res.json({
            content: result.content,
        });
    } catch (err) {
        console.error(
            "Morning motivation error:",
            err
        );

        res.status(500).json({
            message:
                err.message ||
                "Unable to generate morning motivation",
        });
    }
};