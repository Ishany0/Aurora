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
 * Failure-Resilient Reflection Pipeline:
 * Mood & Signal -> Reflection -> Action with graceful degradation and retry targeting
 */
app.post("/api/reflect", rateLimitMiddleware, async (req, res) => {
  try {
    const data = req.body && typeof req.body === "object" ? req.body : {};
    const {
      content,
      imageBase64,
      imageMime,
      correctionsContext,
      entryId,
      idempotencyKey,
      retryTarget,
      existingMoodResult,
    } = data;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return res.status(400).json({ error: "Reflection content is required." });
    }

    const safeCorrections = Array.isArray(correctionsContext) ? correctionsContext : [];

    // Target: Retry Reflection only (preserves existing Mood metadata)
    if (retryTarget === "reflection" && existingMoodResult && typeof existingMoodResult === "object") {
      const reflectionResult = await runReflectionAgent(
        content,
        existingMoodResult,
        imageBase64,
        imageMime
      );

      if (!reflectionResult) {
        return res.json({
          entryId,
          idempotencyKey,
          moodResult: existingMoodResult,
          moodStatus: "available",
          reflectionResult: null,
          reflectionStatus: "unavailable",
          actionResult: null,
          actionStatus: "skipped",
          canRetryReflection: true,
        });
      }

      const actionResult = await runActionAgent(
        content,
        existingMoodResult,
        reflectionResult.reflection,
        safeCorrections
      );

      return res.json({
        entryId,
        idempotencyKey,
        moodResult: existingMoodResult,
        moodStatus: "available",
        reflectionResult,
        reflectionStatus: "available",
        actionResult,
        actionStatus: actionResult ? "available" : "unavailable",
      });
    }

    // Step 1: Run Mood & Signal Agent (structured JSON with validation & repair)
    const moodResult = await runMoodAndSignalAgent(
      content,
      imageBase64,
      imageMime,
      safeCorrections
    );

    // If Mood & Signal fails completely (both initial & repair failed)
    if (!moodResult) {
      return res.json({
        entryId,
        idempotencyKey,
        moodResult: null,
        moodStatus: "unavailable",
        reflectionResult: null,
        reflectionStatus: "unavailable",
        actionResult: null,
        actionStatus: "skipped",
        message: "Your entry was saved. Analysis is temporarily unavailable.",
      });
    }

    // Step 2: Run Reflection Agent (concise, empathetic, non-clinical)
    const reflectionResult = await runReflectionAgent(
      content,
      moodResult,
      imageBase64,
      imageMime
    );

    // If Reflection fails, preserve mood metadata and allow retry
    if (!reflectionResult) {
      return res.json({
        entryId,
        idempotencyKey,
        moodResult,
        moodStatus: "available",
        reflectionResult: null,
        reflectionStatus: "unavailable",
        actionResult: null,
        actionStatus: "skipped",
        canRetryReflection: true,
      });
    }

    // Step 3: Run Action Agent (one optional next step; null if acute concern or failure)
    const actionResult = await runActionAgent(
      content,
      moodResult,
      reflectionResult.reflection,
      safeCorrections
    );

    return res.json({
      entryId,
      idempotencyKey,
      moodResult,
      moodStatus: "available",
      reflectionResult,
      reflectionStatus: "available",
      actionResult,
      actionStatus: actionResult ? "available" : "unavailable",
    });
  } catch (error: any) {
    console.error("Unexpected error during reflection pipeline:", error?.message || error);
    return res.status(500).json({
      error: "AI service temporarily unavailable.",
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
    console.error("Error synthesizing weekly insights:", error?.message || error);
    return res.status(500).json({
      error: "Unable to synthesize pattern digest at this time.",
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
    console.error("Error running rules verification:", error?.message || error);
    res.status(500).json({ error: "Failed to run rules verification." });
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
