# Aurora — Private Multimodal Reflection

> **Reflect privately. Find one manageable next step.**

[![Cloud Run Deployed](https://img.shields.io/badge/Google%20Cloud-Cloud%20Run-blue?logo=googlecloud)](https://cloud.google.com/run)
[![Firebase Security](https://img.shields.io/badge/Security-Owner--Isolated%20Rules-teal?logo=firebase)](https://firebase.google.com)
[![Gemini API](https://img.shields.io/badge/AI-Gemini%20Flash%20Ladder-orange?logo=googlegemini)](https://ai.google.dev)

---

## 1. Project Overview & Links

- **Live Application**: `[YOUR_CLOUD_RUN_URL]`
- **Source Code Repository**: `[YOUR_GITHUB_REPO]`
- **Video Demonstration (3 mins)**: `[YOUR_VIDEO_URL]`

---

## 2. The Problem

Students and early-career professionals regularly encounter intense stress, burnout, and complex decisions. Generic AI chatbots encourage endless, ungrounded conversations that can induce cognitive fatigue, while standard productivity software turns emotional hurdles into overwhelming task lists. Furthermore, existing digital tools often store sensitive emotional reflections in shared data pools or lack transparent data ownership, making users hesitant to express their authentic thoughts.

---

## 3. The Solution

Aurora is a private, multimodal reflection workspace that transforms honest personal reflections into grounded emotional signals and exactly one practical, manageable next step. Users can express themselves through typed text, browser voice dictation, or private photo uploads. By leveraging specialized Gemini AI agents, Aurora decouples emotional signal detection from non-clinical empathetic reflection and actionable planning—all while strictly isolating user data inside owner-bound Google Cloud Firestore paths.

---

## 4. What Makes Aurora Different

- **One Manageable Step**: Refuses to generate overwhelming multi-step task backlogs; outputs exactly one practical next action that the user can accept, edit, or dismiss.
- **Fail-Safe Persistence (Save-Before-AI)**: Raw user reflections are committed to Cloud Firestore before triggering any AI generation, ensuring zero data loss on network or API timeouts.
- **“Why am I seeing this?” Explainability & Zero Chain-of-Thought**: Every reflection, mood signal, and recurring pattern includes an accessible transparency panel detailing:
  - *Approved Entries Used*: Exact count of private user entries supporting the signal.
  - *Date Range*: The explicit timeframe analyzed.
  - *Repeated Topics*: Recurring themes extracted directly from user reflections.
  - *Confidence Level*: Transparent rating (High, Medium, Low).
  - *User Calibration*: Clear indication of whether user mood overrides influenced the classification.
  - *Zero Chain-of-Thought Leakage*: Internal reasoning traces and hidden prompts are never exposed, protecting cognitive privacy.
  - *Threshold Transparency*: If fewer than 5 approved entries exist, Aurora clearly informs the user: *“Keep reflecting—Aurora needs at least 5 approved entries before it can identify a reliable pattern.”*
- **Non-Clinical & Grounded**: Not a diagnostic chatbot or medical tool. Insights are grounded solely in user-authored reflections.
- **Calibrated Tag Memory**: Users can override AI-detected mood tags; Aurora stores recent corrections per user and includes them as few-shot context for subsequent mood tagging, without cross-user training or shared models.
- **True Owner Isolation**: Enforces subcollection security rules (`/users/{uid}/...`) preventing cross-user data leakage and providing instant full-data export (JSON/Markdown) or complete account wipe.

---

## 5. Google Technologies Used

| Technology | Purpose in Aurora |
| :--- | :--- |
| **Gemini API** (`@google/genai`) | Powers four single-purpose agents: Mood & Signal, Reflection, Action, and Pattern Insight with an automated multi-model fallback ladder. |
| **Firebase Authentication** | Secure Google Sign-In providing verified, tamper-proof user UIDs. |
| **Cloud Firestore** | Owner-isolated database storing reflections, metadata, mood calibrations, and weekly digests under `/users/{uid}/...`. |
| **Firebase Storage** | Owner-isolated storage for private multimodal photo attachments (`/users/{uid}/uploads/...`). |
| **Google Secret Manager** | Secure runtime storage and injection of `GEMINI_API_KEY` without hardcoded secrets. |
| **Google Cloud Run** | Fully managed containerized production deployment serving the unified Express + React Vite stack. |
| **Firebase Emulator Suite** | Local testing environment verifying Firestore security rules and cross-user isolation cases. |

---

## 6. Architecture Overview

Aurora uses a full-stack architecture deployed on Google Cloud Run. The backend handles secure Gemini API proxying, secret management, and validation, while the React client interacts directly with Firebase Authentication and owner-bound Firestore subcollections.

```text
[User Browser]
      │
      ├── Google Sign-In ───────────► [Firebase Authentication]
      │                                   │ (Verified JWT UID)
      │                                   ▼
      ├── Owner-Bound CRUD ─────────► [Cloud Firestore: /users/{uid}/...]
      │                                   │
      ├── Private Image Upload ─────► [Firebase Storage: /users/{uid}/uploads/...]
      │
      ▼
[Google Cloud Run (Express API Gateway)]
      │ (Injects GEMINI_API_KEY from Secret Manager)
      ▼
[Gemini API Multi-Agent Engine]
      ├── Mood & Signal Agent (Structured JSON + Confidence + Evidence)
      ├── Reflection Agent (Warm, Non-Clinical Streaming Reply)
      ├── Action Agent (Single Low-Effort Practical Next Step)
      └── Pattern Insight Agent (Weekly Multi-Entry Digest)
```

---

## 7. Demo Flow

1. **Authentication Gate**: Open the application to see the public landing screen. Click **Sign in with Google** to authenticate securely.
2. **Modal Studio**: Select an input mode (Text typing, continuous Voice dictation, or Photo upload).
3. **Capture & Save**: Type a thought (e.g., *“Struggling to start preparing for my software engineering interview tomorrow”*). Click **Reflect**.
4. **Immediate Persistence**: The raw entry is saved instantly with status `saved` in Firestore before AI processing begins. If Gemini is temporarily unavailable, the UI shows “Your entry is safely saved. Reflection is temporarily unavailable.” and offers a retry without creating duplicate entries.
5. **Signal & Confidence**: The **Mood & Signal Agent** returns structured tags (`Anxious`, `74% Confidence`, `Topics: Career, Preparation`) with evidence labels.
6. **Streaming Reflection**: The **Reflection Agent** streams an empathetic, non-clinical reflection acknowledging the hurdle.
7. **One Action Suggestion**: The **Action Agent** presents one optional step: *“Open one sample coding question and read just the problem description (5 mins)”*.
8. **User Control**: Click **Accept**, **Edit** to modify the time/title, or **Dismiss**.
9. **Calibration**: Override the mood tag to *“Determined”*. Aurora saves this correction to personalize subsequent signal predictions.
10. **Pattern Digest & Security**: Navigate to **Patterns** to view recurring themes across approved entries, or visit **Security** to export your complete journal as Markdown or JSON.

---

## 8. Reliability & Safety

- **Save-Before-AI Guarantee**: User entries are committed to durable storage prior to initiating Gemini calls. If an API outage occurs, the entry remains safely stored with an `analysisStatus: "unavailable"` label.
- **Multi-Model Fallback Ladder**: Backend requests cascade automatically across multiple Gemini models (e.g., `gemini-2.0-flash`, `gemini-1.5-flash`, and the latest stable flash model) before returning a recoverable error.
- **Schema Validation & Defensive Parsing**: All structured Gemini outputs are validated against strict TypeScript interfaces. Malformed JSON triggers an internal recovery path rather than breaking the client UI.
- **Idempotency & Duplicate Prevention**: Submission buttons disable immediately upon submission, preventing duplicate database writes and API calls during rapid clicking.
- **Wellbeing Safeguard**: If the Mood Agent detects acute distress (`concern_flag: true`), Aurora suppresses productivity actions, offers warm crisis support resources, and excludes the entry from pattern digests and external webhooks.

---

## 9. Security & Privacy

- **Strict Owner Isolation**: Database reads and writes are restricted to `/users/{request.auth.uid}/...`. Cross-user data queries are denied at the database engine level.
- **Zero Cross-Tenant Leakage**: Signing out immediately purges all in-memory React state (`entries`, `corrections`, `settings`) and detaches active Firestore snapshot listeners.
- **No Hardcoded Secrets**: Secrets and API keys are injected via environment variables or Secret Manager, never exposed in client bundles or public repositories.
- **Firebase Web Config vs. Server Secrets**: Firebase Web Configuration (`apiKey`, `projectId`, `appId`) identifies the Firebase project to the browser client and is secured by Firestore & Storage Security Rules. Sensitive API keys (such as `GEMINI_API_KEY`) are kept exclusively on the server side and mounted via Google Cloud Secret Manager.
- **No Third-Party Analytics Tracking**: Raw reflection text is never sent to third-party telemetry, tracking pixels, or external LLM logging services.
- **Full User Sovereignty**: Users can exclude individual entries from pattern synthesis, export complete records, or permanently wipe their account and data.

### Firestore Security Rules Baseline

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }

    match /users/{userId} {
      allow read, create, update, delete: if request.auth != null && request.auth.uid == userId;

      match /entries/{entryId} {
        allow read, create, update, delete: if request.auth != null && request.auth.uid == userId;
      }

      match /corrections/{correctionId} {
        allow read, create, update, delete: if request.auth != null && request.auth.uid == userId;
      }

      match /actions/{actionId} {
        allow read, create, update, delete: if request.auth != null && request.auth.uid == userId;
      }

      match /insights/{insightId} {
        allow read, create, update, delete: if request.auth != null && request.auth.uid == userId;
      }

      match /settings/{settingId} {
        allow read, create, update, delete: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

---

## 10. Evaluation Evidence

> All metrics and results in this section are from internal automated tests and manual two-account isolation checks. They are not from a clinical study or external user research.

*(Internal Test Results — Automated Suite & Two-Account Isolation Verification)*

| Test Category | Test Case | Target / Constraint | Result |
| :--- | :--- | :--- | :--- |
| **Auth Gating** | Initial load unauthenticated state | Zero private data mounted; Landing View only | **PASS** |
| **Security Rules** | Cross-tenant document read (`User B` → `User A`) | Permission denied by Firestore Rules | **PASS** |
| **Security Rules** | Unauthenticated entry creation | Denied by security rules | **PASS** |
| **Session Wipe** | User sign-out state clearance | Memory & listeners purged immediately | **PASS** |
| **Account Switch** | Switch from `User A` to `User B` | `User B` receives clean state with 0 cross-leak | **PASS** |
| **AI Fallback** | Simulated 503 on primary Gemini model | Seamless fallback to secondary model in ladder | **PASS** |
| **Save Integrity** | Network disconnection during AI generation | Raw journal entry preserved in Firestore | **PASS** |
| **JSON Schema** | Mood Tagger structured parsing | Valid JSON contract adherence in tests | **PASS** |

---

## 10.1. How a judge can verify this project

In under five minutes, a judge can:

1. Open the live URL and confirm the sign-in gate and reflection flow.
2. Run `npm test` (or your actual test command) locally.
3. Run the Firestore rules tests against the emulator:
   `firebase emulators:exec --only firestore "node --test firestore.rules.test.js"`
4. Inspect `firestore.rules` and confirm owner-only access under `/users/{userId}/...`.
5. Review this README’s architecture diagram and demo flow.

---

## 11. How to Run Locally

### Prerequisites

- Node.js 20+ installed
- Google Cloud / Firebase CLI (`npm install -g firebase-tools`)
- A Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

### Step-by-Step Setup

```bash
# 1. Clone the repository
git clone [YOUR_GITHUB_REPO]
cd aurora-reflection

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env and insert your GEMINI_API_KEY and Firebase Web Config

# 4. Start the unified development server (Express + Vite on port 3000)
npm run dev

# 5. Run Security Rules unit tests against the Firebase Emulator
firebase emulators:exec --only firestore "node --test firestore.rules.test.js"
```

---

## 12. How to Deploy to Google Cloud Run

```bash
# 1. Set your GCP Project ID and Region
gcloud config set project [YOUR_PROJECT_ID]
REGION="asia-east1"

# 2. Create the Gemini API Key secret in Secret Manager
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 3. Grant Secret Manager access to Cloud Run service account
PROJECT_NUM=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUM}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# 4. Deploy the application to Cloud Run
gcloud run deploy aurora-reflection \
  --source . \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --update-labels=dev-tutorial=cloud-run-ai-challenge

# Alternatively, if already deployed, apply the verification label:
gcloud run services update aurora-reflection \
  --region=$REGION \
  --update-labels=dev-tutorial=cloud-run-ai-challenge

# 5. Deploy Firestore Security Rules
firebase deploy --only firestore:rules
```

---

## 13. Known Limitations

- **Probabilistic Signals**: Mood classification and confidence scores reflect probabilistic language patterns, not clinical diagnoses.
- **Voice Recognition Variability**: Voice dictation relies on Web Speech API support, which varies across browsers and ambient noise levels.
- **Multimodal Interpretation**: Visual image tagging may occasionally misinterpret abstract artwork or handwritten notes.
- **Pattern Thresholds**: Meaningful pattern insights require at least 5 user-approved entries; Aurora intentionally declines to force insights on insufficient data.
- **Non-Clinical Boundary**: Aurora is an introspective tool and cannot provide crisis intervention, medical advice, or psychiatric treatment.

---

## 14. Future Work

- **Wearable Health Correlation**: Optional local correlation with sleep or step metrics to contextualize energy levels.
- **Bi-Directional Calendar Integration**: One-click scheduling of accepted 5-minute action items into Google Calendar.
- **Client-Side End-to-End Encryption (E2EE)**: Optional zero-knowledge passphrase encryption for journal text before Firestore writes.
- **Offline PWA Sync**: Full Service Worker caching enabling offline journal drafting with automatic background sync upon reconnection.
