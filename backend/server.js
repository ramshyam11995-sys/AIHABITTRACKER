import "dotenv/config";

import express from "express";
import cors from "cors";

import { connectDB } from "./config/db.js";

import authRoutes from "./routes/auth.js";
import habitRoutes from "./routes/habits.js";
import logRoutes from "./routes/logs.js";
import aiRoutes from "./routes/ai.js";

import {
    notFound,
    errorHandler,
} from "./middlewares/errrorHandler.js";

const app = express();

// =========================
// CORS CONFIGURATION
// =========================

const allowedOrigins = (process.env.CLIENT_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests without an Origin header
        // Example: Postman, curl, server-to-server
        if (!origin) {
            return callback(null, true);
        }

        // Allow localhost during development
        const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(
            origin
        );

        if (isLocalhost) {
            return callback(null, true);
        }

        // Allow production frontend from CLIENT_URL
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(
            new Error(`Origin ${origin} not allowed by CORS`)
        );
    },

    credentials: true,

    methods: [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "OPTIONS",
    ],

    allowedHeaders: [
        "Content-Type",
        "Authorization",
    ],
};

app.use(cors(corsOptions));

// =========================
// BODY PARSER
// =========================

app.use(express.json({ limit: "1mb" }));

// =========================
// HEALTH CHECK
// =========================

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        time: new Date().toISOString(),
    });
});

// =========================
// API ROUTES
// =========================

app.use("/api/auth", authRoutes);

app.use("/api/habits", habitRoutes);

app.use("/api/logs", logRoutes);

app.use("/api/ai", aiRoutes);

// =========================
// ERROR HANDLING
// =========================

app.use(notFound);

app.use(errorHandler);

// =========================
// START SERVER
// =========================

const PORT = process.env.PORT || 8000;

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(
                `Server running on http://localhost:${PORT}`
            );
        });
    })
    .catch((error) => {
        console.error(
            "Database connection failed:",
            error.message
        );

        process.exit(1);
    });