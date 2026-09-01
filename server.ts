import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import {
  runMoodAndSignalAgent,
  runReflectionAgent,
  runActionAgent,
  runInsightAgent,
} from "./server/geminiService.js";
import { runRulesVerification } from "./tests/firestore.rules.test.js";

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware for JSON body parsing with large payload capacity for multimodal photo attachments
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// In-memory rate limiting map: IP/User -> { count, resetTime }
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function rateLimitMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const identifier = (req.headers["x-user-id"] as string) || req.ip || "anonymous";
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxRequests = 40;

  const current = rateLimitMap.get(identifier);
  if (!current || now > current.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (current.count >= maxRequests) {
    return res.status(429).json({
      error: "Rate limit exceeded. Please wait a moment before submitting another reflection.",
    });
  }

  current.count += 1;
  return next();
}

// ----------------------------------------------------------------------------
// API Endpoints
// ----------------------------------------------------------------------------

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "Aurora Private Reflection API",
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY"),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Full Reflection Pipeline: Mood & Signal -> Reflection -> Action
 */
app.post("/api/reflect", rateLimitMiddleware, async (req, res) => {
  try {
    const data = req.body && typeof req.body === "object" ? req.body : {};
    const { content, imageBase64, imageMime, correctionsContext } = data;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return res.status(400).json({ error: "Reflection content is required." });
    }

    // 1. Run Mood & Signal Agent (structured JSON)
    const moodResult = await runMoodAndSignalAgent(
      content,
      imageBase64,
      imageMime,
      Array.isArray(correctionsContext) ? correctionsContext : []
    );

    // 2. Run Reflection Agent (concise, empathetic, non-clinical)
    const reflectionResult = await runReflectionAgent(
      content,
      moodResult,
      imageBase64,
      imageMime
    );

    // 3. Run Action Agent (one optional next step; null if acute concern)
    const actionResult = await runActionAgent(
      content,
      moodResult,
      reflectionResult.reflection
    );

    return res.json({
      moodResult,
      reflectionResult,
      actionResult,
    });
  } catch (error: any) {
    console.error("Error during reflection pipeline:", error);
    return res.status(500).json({
      error: "An unexpected error occurred during reflection analysis.",
      details: error?.message || String(error),
    });
  }
});

/**
 * Weekly Insight Digest synthesis
 */
app.post("/api/insights", rateLimitMiddleware, async (req, res) => {
  try {
    const data = req.body && typeof req.body === "object" ? req.body : {};
    const { entriesSummary } = data;

    if (!Array.isArray(entriesSummary)) {
      return res.status(400).json({ error: "entriesSummary must be an array." });
    }

    const insightResult = await runInsightAgent(entriesSummary);
    return res.json({ insightResult });
  } catch (error: any) {
    console.error("Error synthesizing weekly insights:", error);
    return res.status(500).json({
      error: "Unable to synthesize pattern digest at this time.",
      details: error?.message || String(error),
    });
  }
});

/**
 * Security Rules Automated Verification Endpoint
 */
app.get("/api/rules-test", (_req, res) => {
  try {
    const testResults = runRulesVerification();
    res.json(testResults);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to run rules verification" });
  }
});

// ----------------------------------------------------------------------------
// Vite & Static Asset Handling
// ----------------------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Aurora Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
