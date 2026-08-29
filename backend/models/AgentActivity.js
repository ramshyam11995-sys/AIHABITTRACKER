import mongoose from "mongoose";

const agentActivitySchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        action: {
            type: String,
            enum: [
                "create_habit",
                "update_habit",
                "no_action",
            ],
            required: true,
        },

        reason: {
            type: String,
            default: "",
        },

        habitId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Habit",
            default: null,
        },

        habitName: {
            type: String,
            default: "",
        },

        status: {
            type: String,
            enum: ["executed", "skipped", "failed"],
            default: "executed",
        },

        changes: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("AgentActivity", agentActivitySchema);