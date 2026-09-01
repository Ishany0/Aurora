import { GoogleGenAI, Type } from "@google/genai";
import type { MoodSignalResult, ReflectionResult, ActionItem, WeeklyInsightResult } from "../src/types.js";

// Lazy-initialized Gemini client with required User-Agent header
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set. Using mock/resilient local reflection mode.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "dummy-key-for-local-fallback",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

const MODEL_LADDER = [
  "gemini-3.7-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
];

/**
 * Resilient content generation wrapper executing an automated fallback ladder.
 */
export async function generateWithFallback(
  params: {
    systemInstruction?: string;
    prompt: string;
    parts?: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
    responseMimeType?: "application/json" | "text/plain";
    responseSchema?: any;
    temperature?: number;
  }
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("NO_API_KEY");
  }

  const client = getAiClient();
  let lastError: Error | null = null;

  for (const model of MODEL_LADDER) {
    try {
      const contents: any = params.parts && params.parts.length > 0 
        ? { parts: params.parts }
        : params.prompt;

      const config: any = {
        temperature: params.temperature ?? 0.7,
      };

      if (params.systemInstruction) {
        config.systemInstruction = params.systemInstruction;
      }
      if (params.responseMimeType) {
        config.responseMimeType = params.responseMimeType;
      }
      if (params.responseSchema) {
        config.responseSchema = params.responseSchema;
      }

      const response = await client.models.generateContent({
        model,
        contents,
        config,
      });

      const text = response.text;
      if (text && typeof text === "string") {
        return text.trim();
      }
    } catch (err: any) {
      console.warn(`[Gemini Fallback] Model ${model} encountered error:`, err?.message || err);
      lastError = err instanceof Error ? err : new Error(String(err));
      // Continue to next model in the fallback ladder
    }
  }

  throw lastError || new Error("All Gemini models in fallback ladder failed.");
}

// ----------------------------------------------------------------------------
// AGENT 1: MOOD & SIGNAL AGENT (Structured JSON only)
// ----------------------------------------------------------------------------

export async function runMoodAndSignalAgent(
  content: string,
  imageBase64?: string,
  imageMime?: string,
  correctionsContext?: Array<{ originalMood: string; correctedMood: string }>
): Promise<MoodSignalResult> {
  const correctionsNote = correctionsContext && correctionsContext.length > 0
    ? `\nUser Calibration Memory: This user has previously corrected mood tags:\n${correctionsContext
        .map((c) => `- "${c.originalMood}" was corrected to "${c.correctedMood}"`)
        .join("\n")}\nAccount for this calibration preference.`
    : "";

  const systemInstruction = `You are Aurora's Mood & Signal Agent.
Your sole responsibility is to analyze a private reflection entry (text and optional photo) and output structured metadata.
CRITICAL SAFETY & ROLE DIRECTIVES:
1. You are NOT a medical diagnostic tool or clinician. Do not infer clinical psychiatric disorders (e.g. do not diagnose clinical depression, BPD, PTSD).
2. 'concern_flag': Set to true ONLY if the text expresses acute crisis, self-harm, suicidal ideation, or severe unbearable distress where immediate human/crisis support is recommended. Otherwise false.
3. Mood: Return a single concise, empathetic emotional descriptor (e.g., 'Overwhelmed', 'Relieved', 'Grateful', 'Anxious', 'Hopeful', 'Exhausted', 'Reflective', 'Motivated', 'Content').
4. Confidence: A float between 0.0 and 1.0 representing classification confidence.
5. Topics: Extract 1 to 4 concise theme keywords (e.g., ['Thesis Deadline', 'Family Conversation', 'Burnout']).
6. Return valid JSON adhering strictly to the schema.${correctionsNote}`;

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
  if (imageBase64 && imageMime) {
    parts.push({
      inlineData: {
        mimeType: imageMime,
        data: imageBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, ""),
      },
    });
  }
  parts.push({
    text: `Analyze this private journal entry:\n"""\n${content.slice(0, 5000)}\n"""`,
  });

  try {
    const rawJson = await generateWithFallback({
      systemInstruction,
      prompt: "",
      parts,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          mood: { type: Type.STRING, description: "Single-word or short phrase mood descriptor." },
          confidence: { type: Type.NUMBER, description: "Confidence score between 0.0 and 1.0." },
          topics: { type: Type.ARRAY, items: { type: Type.STRING }, description: "1-4 key topic tags." },
          concern_flag: { type: Type.BOOLEAN, description: "Flag if acute distress or crisis is detected." },
          emotional_valence: {
            type: Type.STRING,
            enum: ["positive", "neutral", "reflective", "challenging", "mixed"],
          },
          intensity: {
            type: Type.STRING,
            enum: ["low", "moderate", "high"],
          },
        },
        required: ["mood", "confidence", "topics", "concern_flag", "emotional_valence", "intensity"],
      },
      temperature: 0.2,
    });

    const parsed = JSON.parse(rawJson);
    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

    return {
      mood: typeof parsed.mood === "string" ? parsed.mood : "Reflective",
      confidence: typeof parsed.confidence === "number" ? Math.min(Math.max(parsed.confidence, 0), 1) : 0.85,
      topics: Array.isArray(parsed.topics) ? parsed.topics.slice(0, 4) : ["General Reflection"],
      concern_flag: Boolean(parsed.concern_flag),
      emotional_valence: ["positive", "neutral", "reflective", "challenging", "mixed"].includes(parsed.emotional_valence)
        ? parsed.emotional_valence
        : "reflective",
      intensity: ["low", "moderate", "high"].includes(parsed.intensity) ? parsed.intensity : "moderate",
      explanation_evidence: {
        word_count: wordCount,
        detected_themes: Array.isArray(parsed.topics) ? parsed.topics : [],
        sentiment_balance: parsed.emotional_valence || "reflective",
        correction_applied: correctionsContext && correctionsContext.length > 0,
      },
    };
  } catch (err) {
    console.warn("Mood & Signal Agent fallback activated:", err);
    // Intelligent heuristic local fallback
    const lower = content.toLowerCase();
    const hasDistress = lower.includes("hurt myself") || lower.includes("suicide") || lower.includes("end my life") || lower.includes("can't go on");
    let detectedMood = "Reflective";
    let valence: any = "reflective";

    if (lower.includes("happy") || lower.includes("excited") || lower.includes("proud") || lower.includes("great")) {
      detectedMood = "Joyful";
      valence = "positive";
    } else if (lower.includes("tired") || lower.includes("exhausted") || lower.includes("drained")) {
      detectedMood = "Exhausted";
      valence = "challenging";
    } else if (lower.includes("stress") || lower.includes("anxious") || lower.includes("nervous") || lower.includes("scared")) {
      detectedMood = "Anxious";
      valence = "challenging";
    } else if (lower.includes("calm") || lower.includes("peace") || lower.includes("relaxed")) {
      detectedMood = "Calm";
      valence = "positive";
    }

    return {
      mood: detectedMood,
      confidence: 0.75,
      topics: ["Mindful Journal"],
      concern_flag: hasDistress,
      emotional_valence: valence,
      intensity: "moderate",
      explanation_evidence: {
        word_count: content.split(/\s+/).length,
        detected_themes: ["Mindful Journal"],
        sentiment_balance: valence,
      },
    };
  }
}

// ----------------------------------------------------------------------------
// AGENT 2: REFLECTION AGENT (Concise, empathetic, non-clinical)
// ----------------------------------------------------------------------------

export async function runReflectionAgent(
  content: string,
  moodData: MoodSignalResult,
  imageBase64?: string,
  imageMime?: string
): Promise<ReflectionResult> {
  if (moodData.concern_flag) {
    // Supportive crisis protocol prompt
    const systemInstruction = `You are Aurora's Supportive Wellbeing Companion.
The user's entry indicates deep distress.
DIRECTIVES:
1. Respond with warmth, dignity, and gentle unconditional empathy.
2. Keep the response to 2-3 gentle sentences.
3. DO NOT diagnose, evaluate, or lecture.
4. Gently let them know they are not alone and mention that reaching out to a trusted person or free 24/7 crisis support (like 988 or texting HOME to 741741) can provide immediate caring support.`;

    try {
      const reflection = await generateWithFallback({
        systemInstruction,
        prompt: `User reflection in distress:\n"""\n${content.slice(0, 3000)}\n"""`,
        temperature: 0.3,
      });
      return { reflection, is_supportive_crisis: true };
    } catch {
      return {
        reflection:
          "I hear how heavy and difficult this moment feels. Please know you do not have to carry this alone. Please consider reaching out to a trusted friend or contacting the 988 Lifeline (call/text 988 in the US/Canada) or texting HOME to 741741 for free, caring 24/7 support.",
        is_supportive_crisis: true,
      };
    }
  }

  const systemInstruction = `You are Aurora's Reflection Agent.
Your role is to offer a concise, deeply validating, and thoughtful reflection (2 to 3 sentences max) on the user's private entry.
DIRECTIVES:
1. Acknowledge what they are navigating with sincerity and grounded empathy.
2. Highlight a perspective, strength, or quiet insight present in their reflection.
3. Never use generic corporate buzzwords or toxic positivity.
4. Keep the tone warm, clear, and companionable.
5. Primary detected mood: "${moodData.mood}" (${moodData.emotional_valence}). Topics: ${moodData.topics.join(", ")}.`;

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
  if (imageBase64 && imageMime) {
    parts.push({
      inlineData: {
        mimeType: imageMime,
        data: imageBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, ""),
      },
    });
  }
  parts.push({
    text: `User Journal Entry:\n"""\n${content.slice(0, 4000)}\n"""`,
  });

  try {
    const reflection = await generateWithFallback({
      systemInstruction,
      prompt: "",
      parts,
      temperature: 0.7,
    });
    return { reflection: reflection.trim() };
  } catch (err) {
    console.warn("Reflection Agent fallback activated:", err);
    return {
      reflection: `Giving voice to this moment allows space to process your experience. You are navigating this with real honesty and thoughtful awareness.`,
    };
  }
}

// ----------------------------------------------------------------------------
// AGENT 3: ACTION AGENT (One practical, user-confirmed next step)
// ----------------------------------------------------------------------------

export async function runActionAgent(
  content: string,
  moodData: MoodSignalResult,
  reflection: string
): Promise<ActionItem | null> {
  // If acute concern is flagged, DO NOT generate a productivity action
  if (moodData.concern_flag) {
    return null;
  }

  const systemInstruction = `You are Aurora's Action Agent.
Your goal is to suggest EXACTLY ONE small, practical, low-friction next action (taking 5 to 15 minutes) that helps the user honor or resolve their reflection.
RULES:
1. Suggest exactly ONE practical action.
2. Do not issue medical, financial, or legal advice.
3. Keep the reason grounded in their specific reflection.
4. The action must be concrete and manageable (e.g., 'Draft a 3-bullet agenda for tomorrow', 'Take a 10-minute quiet walk without devices', 'Send a one-sentence check-in text').
5. Output valid JSON adhering strictly to the schema.`;

  try {
    const rawJson = await generateWithFallback({
      systemInstruction,
      prompt: `User Entry: """${content.slice(0, 2000)}"""\nMood: ${moodData.mood}\nReflection: """${reflection}"""`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING, description: "A concrete, achievable action step." },
          reason: { type: Type.STRING, description: "Brief explanation of how this honors their reflection." },
          effort: {
            type: Type.STRING,
            enum: ["5 minutes", "15 minutes", "30 minutes", "longer"],
          },
          category: {
            type: Type.STRING,
            enum: ["planning", "rest", "communication", "learning", "movement", "organization", "other"],
          },
          requires_confirmation: { type: Type.BOOLEAN },
        },
        required: ["action", "reason", "effort", "category", "requires_confirmation"],
      },
      temperature: 0.5,
    });

    const parsed = JSON.parse(rawJson);
    return {
      action: typeof parsed.action === "string" ? parsed.action : "Take 5 quiet breaths before moving to your next task",
      reason: typeof parsed.reason === "string" ? parsed.reason : "Provides a restorative pause after deep reflection",
      effort: ["5 minutes", "15 minutes", "30 minutes", "longer"].includes(parsed.effort) ? parsed.effort : "5 minutes",
      category: ["planning", "rest", "communication", "learning", "movement", "organization", "other"].includes(parsed.category)
        ? parsed.category
        : "rest",
      requires_confirmation: true,
    };
  } catch (err) {
    console.warn("Action Agent fallback activated:", err);
    return {
      action: "Take a 5-minute screen-free pause to let your thoughts settle",
      reason: "Creating a brief transition space helps ground your reflection into clarity.",
      effort: "5 minutes",
      category: "rest",
      requires_confirmation: true,
    };
  }
}

// ----------------------------------------------------------------------------
// AGENT 4: INSIGHT AGENT (Weekly patterns from approved tags & summaries)
// ----------------------------------------------------------------------------

export async function runInsightAgent(
  entriesSummary: Array<{ id: string; mood: string; topics: string[]; date: string; summary: string }>
): Promise<WeeklyInsightResult> {
  const count = entriesSummary.length;
  if (count < 2) {
    return {
      period: "Current Window",
      totalEntriesAnalyzed: count,
      dominantMoods: [],
      patterns: [],
      encouragement: "Continue logging reflections to unlock recurring pattern analysis (minimum 2-3 entries recommended).",
      evidenceDisclaimer: "Patterns are synthesized exclusively from your approved tags and summaries.",
    };
  }

  const systemInstruction = `You are Aurora's Pattern & Insight Agent.
Your task is to identify recurring themes and emotional rhythms across the user's approved entries.
RULES:
1. Find recurring patterns that appear across multiple entries (at least 2 entries).
2. Explicitly cite evidence counts: e.g. "in 3 of your last 5 entries" with the date range.
3. Never make ungrounded generalizations.
4. Input contains only mood tags, topic labels, and one-line summaries (NO raw private text).
5. Output structured JSON matching the schema.`;

  try {
    const rawJson = await generateWithFallback({
      systemInstruction,
      prompt: `Analyze these ${count} approved reflection records:\n${JSON.stringify(entriesSummary, null, 2)}`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          period: { type: Type.STRING },
          dominantMoods: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                mood: { type: Type.STRING },
                count: { type: Type.INTEGER },
                percentage: { type: Type.NUMBER },
              },
              required: ["mood", "count", "percentage"],
            },
          },
          patterns: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                theme: { type: Type.STRING },
                frequency: { type: Type.INTEGER },
                entriesCount: { type: Type.INTEGER },
                dateRange: { type: Type.STRING },
                observation: { type: Type.STRING },
                supportingEntryIds: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["theme", "frequency", "entriesCount", "dateRange", "observation"],
            },
          },
          encouragement: { type: Type.STRING },
          evidenceDisclaimer: { type: Type.STRING },
        },
        required: ["period", "dominantMoods", "patterns", "encouragement", "evidenceDisclaimer"],
      },
      temperature: 0.3,
    });

    return JSON.parse(rawJson);
  } catch (err) {
    console.warn("Insight Agent fallback activated:", err);
    // Dynamic heuristic digest
    const moodCounts: Record<string, number> = {};
    entriesSummary.forEach((e) => {
      moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
    });

    const dominantMoods = Object.entries(moodCounts)
      .map(([mood, cnt]) => ({
        mood,
        count: cnt,
        percentage: Math.round((cnt / count) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    return {
      period: "Recent Reflections",
      totalEntriesAnalyzed: count,
      dominantMoods,
      patterns: [
        {
          theme: "Reflective Continuity",
          frequency: count,
          entriesCount: count,
          dateRange: `${entriesSummary[0]?.date || "Recent"} — ${entriesSummary[count - 1]?.date || "Today"}`,
          observation: `In ${count} of your ${count} recorded sessions, taking time to log your thoughts brought consistent perspective.`,
          supportingEntryIds: entriesSummary.map((e) => e.id),
        },
      ],
      encouragement: "Your commitment to honest self-reflection is building healthy clarity and personal momentum.",
      evidenceDisclaimer: `Derived from ${count} user-confirmed reflections.`,
    };
  }
}
