import express from "express";

import {
    weeklyReport,
    suggestHabits,
    recoveryPlan,
    chatAnalysis,
    morningMotivation,
} from "../controllers/aiController.js";

import { runHabitAgent } from "../services/aiAgent.js";
import { habitHealth } from "../controllers/aiHealthController.js";
import AgentActivity from "../models/AgentActivity.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();

// All AI routes require authentication
router.use(protect);

// ==================================================
// AI COACH FEATURES
// ==================================================

router.post("/weekly-report", weeklyReport);

router.post("/suggest-habits", suggestHabits);

router.post("/recovery-plan", recoveryPlan);

router.post("/chat", chatAnalysis);

router.get("/morning", morningMotivation);

// ==================================================
// AUTONOMOUS AI AGENT
// ==================================================

router.post("/agent", async (req, res) => {
    try {
        const { goal } = req.body;

        if (!goal || !goal.trim()) {
            return res.status(400).json({
                message: "Goal is required",
            });
        }

        const result = await runHabitAgent(
            req.user._id,
            goal.trim()
        );

        res.status(200).json(result);
    } catch (err) {
        console.error("AI Agent error:", err);

        res.status(500).json({
            message: err.message || "AI Agent failed",
        });
    }
});

// ==================================================
// AI AGENT ACTIVITY HISTORY
// ==================================================

router.get("/agent/activity", async (req, res) => {
    try {
        const activities = await AgentActivity.find({
            userId: req.user._id,
        })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        res.status(200).json({
            activities,
        });
    } catch (err) {
        console.error("Agent activity error:", err);

        res.status(500).json({
            message: err.message || "Unable to load agent activity",
        });
    }
});

// ==================================================
// HABIT HEALTH SCORE
// ==================================================

router.get("/health", habitHealth);

export default router;