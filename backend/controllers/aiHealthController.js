
import Habit from "../models/Habit.js";
import HabitLog from "../models/HabitLog.js";

export const habitHealth = async (req, res) => {
    try {
        const userId = req.user._id;

        const habits = await Habit.find({
            userId,
            isArchived: false,
        });

        const logs = await HabitLog.find({
            userId,
        })
            .sort({ completedDate: -1 })
            .limit(100);

        if (habits.length === 0) {
            return res.json({
                score: 0,
                level: "No data",
                message:
                    "Create your first habit to start tracking your habit health.",
                strengths: [],
                improvements: [],
                habitsAnalyzed: 0,
                habitScores: [],
                consistency: 0,
                missedHabits: 0,
                activeStreaks: 0,
                weeklyTrend: 0,
                scoreReason:
                    "There is not enough habit data yet to calculate your health.",
                strongestHabit: null,
                weakestHabit: null,
                recommendation:
                    "Create a habit and start completing it to receive personalized insights.",
            });
        }

        const completedByHabit = {};

        logs.forEach((log) => {
            const habitId = String(log.habitId);

            if (!completedByHabit[habitId]) {
                completedByHabit[habitId] = 0;
            }

            completedByHabit[habitId] += 1;
        });

        let totalScore = 0;

        const habitScores = habits.map((habit) => {
            const completed =
                completedByHabit[String(habit._id)] || 0;

            const target =
                habit.frequency === "daily"
                    ? 7
                    : Number(habit.targetDays) || 1;

            const rate = Math.min(
                (completed / target) * 100,
                100
            );

            const roundedScore = Math.round(rate);

            totalScore += roundedScore;

            return {
                name: habit.name || "Unnamed habit",
                score: roundedScore,
                completed,
                target,
            };
        });

        const score = Math.round(
            totalScore / habitScores.length
        );

        const consistency = score;

        const missedHabits = habitScores.filter(
            (habit) => habit.completed < habit.target
        ).length;

        const activeStreaks = habitScores.filter(
            (habit) => habit.score >= 70
        ).length;

        const now = new Date();

        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(
            sevenDaysAgo.getDate() - 7
        );

        const fourteenDaysAgo = new Date(now);
        fourteenDaysAgo.setDate(
            fourteenDaysAgo.getDate() - 14
        );

        let thisWeekCompletions = 0;
        let lastWeekCompletions = 0;

        logs.forEach((log) => {
            const completedDate = new Date(
                log.completedDate || log.createdAt
            );

            if (Number.isNaN(completedDate.getTime())) {
                return;
            }

            if (completedDate >= sevenDaysAgo) {
                thisWeekCompletions += 1;
            } else if (completedDate >= fourteenDaysAgo) {
                lastWeekCompletions += 1;
            }
        });

        let weeklyTrend = 0;

        if (lastWeekCompletions > 0) {
            weeklyTrend = Math.round(
                ((thisWeekCompletions -
                    lastWeekCompletions) /
                    lastWeekCompletions) *
                    100
            );
        } else if (thisWeekCompletions > 0) {
            weeklyTrend = 100;
        }

        let level;
        let message;

        if (score >= 85) {
            level = "Excellent";
            message =
                "Your habits are highly consistent. Keep protecting this momentum.";
        } else if (score >= 70) {
            level = "Strong";
            message =
                "You're building a solid routine. A little more consistency can make it stronger.";
        } else if (score >= 50) {
            level = "Growing";
            message =
                "Your routine is developing. Focus on consistency rather than perfection.";
        } else if (score >= 30) {
            level = "Needs attention";
            message =
                "Some habits need support. Start small and rebuild consistency.";
        } else {
            level = "At risk";
            message =
                "Your recent consistency is low. Focus on one small habit and rebuild momentum.";
        }

        const strongestHabit = [...habitScores].sort(
            (a, b) => b.score - a.score
        )[0];

        const weakestHabit = [...habitScores].sort(
            (a, b) => a.score - b.score
        )[0];

        let scoreReason;

        if (score >= 85) {
            scoreReason = `Your ${score}/100 health score is driven by strong consistency across your habits.`;
        } else if (score >= 70) {
            scoreReason = `Your ${score}/100 score shows a strong routine, but ${missedHabits} habit${missedHabits === 1 ? "" : "s"} still have missed targets.`;
        } else if (score >= 50) {
            scoreReason = `Your ${score}/100 score reflects moderate consistency. Improving ${weakestHabit.name} could raise your overall health.`;
        } else if (score >= 30) {
            scoreReason = `Your ${score}/100 score is being reduced by inconsistent completion. ${weakestHabit.name} is currently your biggest improvement opportunity.`;
        } else {
            scoreReason = `Your ${score}/100 score is low because several habits are missing their targets. Start with ${weakestHabit.name} and rebuild gradually.`;
        }

        const strengths = habitScores
            .filter((habit) => habit.score >= 70)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map(
                (habit) =>
                    `${habit.name} is at ${habit.score}% consistency.`
            );

        const improvements = habitScores
            .filter((habit) => habit.score < 70)
            .sort((a, b) => a.score - b.score)
            .slice(0, 3)
            .map(
                (habit) =>
                    `${habit.name} needs more consistency (${habit.score}%).`
            );

        let recommendation;

        if (weakestHabit.score < 50) {
            recommendation = `Focus on ${weakestHabit.name} first. Make the habit smaller or easier to complete consistently.`;
        } else if (weeklyTrend < 0) {
            recommendation =
                "Your weekly activity is declining. Reduce your daily target temporarily and rebuild momentum.";
        } else if (score >= 85) {
            recommendation =
                "Your routine is performing very well. Protect your strongest habits while gradually improving weaker ones.";
        } else {
            recommendation = `Keep your current routine and focus on improving ${weakestHabit.name} by completing it consistently this week.`;
        }

        return res.json({
            score,
            level,
            message,
            strengths,
            improvements,
            habitsAnalyzed: habits.length,
            habitScores,
            consistency,
            missedHabits,
            activeStreaks,
            weeklyTrend,
            scoreReason,
            strongestHabit: strongestHabit
                ? strongestHabit.name
                : null,
            weakestHabit: weakestHabit
                ? weakestHabit.name
                : null,
            recommendation,
        });
    } catch (err) {
        console.error("Habit health error:", err);

        return res.status(500).json({
            message:
                err.message ||
                "Unable to calculate habit health",
        });
    }
};

