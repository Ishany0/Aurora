# Aurora — Private Multimodal Reflection

> **Reflect privately. Find one manageable next step.**

[![Google Cloud Run](https://img.shields.io/badge/Google_Cloud_Run-Deployed-4285F4?style=flat-square&logo=google-cloud&logoColor=white)](https://cloud.google.com/run)
[![Gemini API](https://img.shields.io/badge/Gemini_API-Multi--Agent-8E75B2?style=flat-square&logo=google-gemini&logoColor=white)](https://ai.google.dev/)
[![Firebase Auth](https://img.shields.io/badge/Firebase_Auth-Google_Sign--In-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Cloud Firestore](https://img.shields.io/badge/Cloud_Firestore-Owner--Isolated-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com/docs/firestore)
[![Secret Manager](https://img.shields.io/badge/Secret_Manager-Zero_Hardcoding-4285F4?style=flat-square&logo=google-cloud&logoColor=white)](https://cloud.google.com/secret-manager)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

[🌐 **Live Demo**](https://ais-dev-wuo2gdbdhq7aa4ie75xoms-874611223113.asia-southeast1.run.app) &nbsp;|&nbsp; [💻 **Source Code**]([YOUR_GITHUB_REPO]) &nbsp;|&nbsp; [🎥 **Demo Video (3 mins)**]([YOUR_VIDEO_URL]) &nbsp;|&nbsp; [📣 **Social Post**]([YOUR_SOCIAL_POST_URL])

---

## 🌪️ The Problem

Students and early-career professionals regularly face intense cognitive overload, emotional exhaustion, and burnout. Generic conversational AI chatbots often encourage endless, circular discussions that increase fatigue, while standard productivity software transforms personal vulnerabilities into daunting task backlogs. Furthermore, existing journaling tools frequently route private thoughts to central analytics pools without cryptographic or path-level owner isolation, making users hesitant to express their authentic feelings.

---

## 💡 The Solution

**Aurora** is a private, multimodal reflection workspace that transforms unvarnished personal thoughts into grounded emotional clarity and **exactly one practical next step**. Users express themselves through text, voice dictation, or photo uploads. Rather than running an unconstrained chatbot, Aurora orchestrates four distinct, single-purpose Gemini API agents (Mood & Signal, Reflection, Action, and Pattern Digest) to safely process thoughts while keeping all data isolated strictly inside owner-bound Google Cloud Firestore subcollections.

---

## ✨ What Makes Aurora Different

- 🎯 **One Manageable Step (Anti-Overwhelm)**: Rejects bloated to-do backlogs; generates exactly one realistic, low-effort next action (with time estimate) that can be accepted, edited, dismissed, or exported directly to your calendar (`.ics` / Google Calendar).
- 🔒 **Fail-Safe "Save-Before-AI" Storage**: Raw reflections are guaranteed and committed to Cloud Firestore *before* triggering any Gemini API call, ensuring zero lost thoughts even during network or API interruptions.
- 🔍 **Explainability Panels ("Why am I seeing this?")**: Every insight transparently cites supporting entry counts, date ranges, and confidence levels without leaking internal model reasoning traces.
- 🧠 **Calibrated Mood Memory**: Users can override AI-detected mood tags; Aurora remembers recent calibrations per user and uses them as few-shot prompt context without cross-user data contamination.
- 🛡️ **Zero Cross-Tenant Leakage**: Enforces strict Firestore security rules (`/users/{uid}/...`) with automated unit tests, immediate in-memory state wiping on sign-out, and instant one-click data export / deletion.
- 🎙️ **Private Multimodal Inputs**: Complete support for voice dictation (Web Speech API) and photo reflections (Firebase Storage), with coarse location privacy rounding (~1.1 km).

---

## 🧰 Tech Stack

| Layer | Technologies | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS v4, Motion | Responsive, accessible, dark-mode reflection studio |
| **Backend API** | Node.js, Express | Secure API proxy, payload sanitizer & Secret Manager integration |
| **Authentication** | Firebase Auth (Google Sign-In) | Cryptographic identity & verified JWT user tokens |
| **Database** | Google Cloud Firestore | Owner-isolated NoSQL collections under `/users/{uid}/...` |
| **Object Storage** | Firebase Storage | Private photo attachments under `/users/{uid}/uploads/...` |
| **AI Multi-Agent** | Google Gemini API (`@google/genai`) | Specialized Mood, Reflection, Action, and Digest agents |
| **Infrastructure** | Google Cloud Run & Secret Manager | Containerized auto-scaling deployment & zero-hardcoding secrets |
| **Web & Geospatial** | Web Speech API, Google Geocoding API | Client-side voice dictation & privacy-safe location tagging |

---

## 🏗 Architecture Overview

Aurora runs as a unified, full-stack container on **Google Cloud Run**. The Express backend securely proxies requests to the **Gemini API** using credentials retrieved from **Google Secret Manager**, while the React frontend directly connects to **Firebase Authentication** and **Cloud Firestore** using owner-scoped security rules.

```text
               ┌────────────────────────────────────────────────────────┐
               │                      USER BROWSER                      │
               └─────────┬───────────────────┬────────────────────┬─────┘
                         │                   │                    │
            Google Auth  │       Owner CRUD  │     Upload Image   │
           (Verified JWT)│    (/users/{uid}) │   (/users/{uid}/..)│
                         ▼                   ▼                    ▼
             ┌───────────────────────┐ ┌───────────┐     ┌──────────────┐
             │ Firebase Auth (Google)│ │ Firestore │     │ Cloud Storage│
             └───────────────────────┘ └───────────┘     └──────────────┘
                         │
                         ▼
        ┌─────────────────────────────────────────────────┐
        │       GOOGLE CLOUD RUN CONTAINER (Node/Express) │
        │  ┌───────────────────────────────────────────┐  │
        │  │ Google Secret Manager (GEMINI_API_KEY)    │  │
        │  └─────────────────────┬─────────────────────┘  │
        └────────────────────────┼────────────────────────┘
                                 │
                                 ▼
             ┌────────────────────────────────────────────┐
             │       GEMINI API MULTI-AGENT ENGINE        │
             │  ├── Mood & Signal Agent (Structured JSON) │
             │  ├── Reflection Agent (Empathetic Stream)  │
             │  ├── Action Agent (1 Practical Next Step)  │
             │  └── Pattern Digest Agent (Weekly Insight) │
             └────────────────────────────────────────────┘
```

---

## ▶️ Demo Flow

1. **Access Live App**: Open the Cloud Run URL and view the public landing page.
2. **Sign In**: Authenticate securely using Google Sign-In via Firebase Auth.
3. **Draft a Thought**: Enter a reflection using typed text, browser voice recognition, or a photo upload.
4. **Instant Persistence**: Click **Reflect** — the raw text is committed to Firestore *before* AI calls execute.
5. **Multi-Agent Processing**: Observe the structured mood tag, confidence score, and streaming empathetic reflection.
6. **Action Recommendation**: Review the single suggested action; accept it, edit it, or export it to Google Calendar / `.ics`.
7. **Inspect Explainability**: Click **"Why am I seeing this?"** to review the exact evidence and confidence metrics.
8. **Weekly Pattern Digest**: Navigate to **Pattern Digest** to see thematic patterns synthesized across 5+ entries.
9. **Verify Isolation**: Navigate to **Security & Privacy** to export data, calibrate mood memory, or sign out and verify complete session clearing.

---

## 🚀 Features Beyond the Base App

- **Structured Multi-Agent Pipeline**: Decouples mood signal extraction, empathetic reflection, and action planning across isolated, purpose-built Gemini prompts.
- **Weekly Pattern Digest with Evidence Counts**: Synthesizes recurring triggers and emotional trends across approved entries with exact date ranges and frequency counts (skips analysis if <5 entries).
- **Explainability Panel**: Every insight includes a transparent breakdown of supporting entries, topic clusters, and confidence levels without exposing raw chain-of-thought traces.
- **Continuous Voice Reflection**: Built-in speech-to-text dictation via Web Speech API with real-time feedback and browser capability detection.
- **Privacy-Preserving Geolocation**: Coarse rounding (~1.1 km) before reverse geocoding to prevent pinpoint coordinate leakage.
- **Comprehensive User Sovereignty**: Direct tag corrections (stored as few-shot user preferences), per-entry pattern exclusions, full JSON/Markdown data export, and complete account erasure.

---

## 🛡 Reliability & Safety

- 💾 **Save-Before-AI Guarantee**: User entries are saved to durable Firestore storage prior to invoking Gemini. If an API outage occurs, the entry remains saved with an `analysisStatus: "unavailable"` label.
- 🪜 **Automated Fallback Ladder**: Backend API calls cascade across prioritized models (`gemini-3.7-flash` → `gemini-3.1-flash-lite` → `gemini-flash-latest`) upon recoverable HTTP/API status errors (`503`, `429`, `500`).
- 📋 **Schema Validation & Defensive Parsing**: All structured Gemini outputs are validated against strict TypeScript/JSON schemas, with single-retry repair routines for malformed payloads.
- 🛑 **Duplicate Prevention & Idempotency**: Submission controls assign unique client idempotency keys and disable interactive buttons during execution to avoid accidental double-posts.
- 🩺 **Non-Clinical Stance & Crisis Safety**: If acute distress is detected (`concern_flag: true`), Aurora suppresses productivity tasks, displays regional support hotlines, and excludes the entry from digests and webhooks.

---

## 🔒 Security & Privacy

- **Strict Owner-Isolated Rules**: Firestore security rules restrict all read, write, and delete operations to `/users/{request.auth.uid}/...`. Cross-tenant data access is blocked at the database engine level.
- **Zero Hardcoded Secrets**: Sensitive API keys (`GEMINI_API_KEY`) reside exclusively in **Google Cloud Secret Manager** and are dynamically bound to the Cloud Run service at deployment time.
- **Zero Third-Party Telemetry**: Raw reflections and personal notes are never transmitted to third-party marketing pixels, analytics trackers, or public training sets.
- **Complete Session Purging**: Signing out immediately clears all client-side React state (`entries`, `corrections`, `settings`) and unbinds active Firestore snapshot listeners.
- **Full Data Portability & Erasure**: Users can download their complete history as structured JSON or Markdown, or wipe their account and all subcollections with one click.

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

      match /{subcollection}/{docId} {
        allow read, create, update, delete: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

---

## 🧪 Evaluation Evidence

> **Disclaimer**: All metrics and results in this section are from internal automated test suites and manual two-account isolation checks. They are not from a clinical study or external user research.

| Test Category | Test Case Scenario | Validation Target | Status |
| :--- | :--- | :--- | :---: |
| **Auth Gating** | Unauthenticated user opens root application URL | Private dashboard unmounted; landing screen displayed | **PASS** |
| **Security Rules** | `User B` attempts to read `/users/UserA/entries/123` | Firestore rules reject with `PERMISSION_DENIED` | **PASS** |
| **Security Rules** | Unauthenticated client attempts Firestore write | Firestore rules reject with `PERMISSION_DENIED` | **PASS** |
| **Session Wipe** | User clicks Sign Out | In-memory entries, settings, and listeners purged | **PASS** |
| **Account Switch** | Sign out `User A` and authenticate as `User B` | `User B` sees 0 entries from `User A` | **PASS** |
| **Save Integrity** | Simulate Gemini API 503 outage during submission | Raw journal entry persists safely in Firestore | **PASS** |
| **Model Fallback** | Primary model rate-limit response | Automatically recovers via fallback model ladder | **PASS** |
| **Schema Validation**| Malformed JSON returned from LLM | Caught, repaired or flagged as fallback metadata | **PASS** |

---

## 👀 How a Judge Can Verify This Project

In under 5 minutes, a judge can verify Aurora's core capabilities:

1. **Verify Live Auth & Reflection Flow**: Open the [Live Cloud Run URL](https://ais-dev-wuo2gdbdhq7aa4ie75xoms-874611223113.asia-southeast1.run.app), sign in with Google, and create an entry using voice or text.
2. **Confirm Multi-Agent & Calendar Output**: Check the structured mood tag, the streaming empathetic reflection, the suggested action item, and test the calendar export (`.ics` / Google Calendar).
3. **Inspect Firestore Security Rules**: Review `firestore.rules` to confirm strict `/users/{userId}/...` path matching.
4. **Execute Rules Unit Tests**: Run local automated tests using the Firebase Emulator:
   ```bash
   firebase emulators:exec --only firestore "node --test firestore.rules.test.js"
   ```
5. **Verify Cross-User Isolation**: Sign out, sign in with a different Google account, and verify that the first account's entries and settings are completely invisible.

---

## 🧑‍💻 How to Run Locally

### Prerequisites
- Node.js 20+ installed
- Firebase CLI (`npm install -g firebase-tools`)
- Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

### Step-by-Step Setup

```bash
# 1. Clone the repository
git clone [YOUR_GITHUB_REPO]
cd aurora-reflection

# 2. Install project dependencies
npm install

# 3. Configure local environment variables
cp .env.example .env
# Open .env and add your GEMINI_API_KEY and Firebase Web Config

# 4. Start the full-stack development server (Express + Vite on Port 3000)
npm run dev

# 5. Run Firestore Security Rules unit tests
firebase emulators:exec --only firestore "node --test firestore.rules.test.js"
```

---

## 🚢 How to Deploy to Google Cloud Run

Aurora deploys as a containerized full-stack application with automatic HTTPS on **Google Cloud Run**:

```bash
# 1. Set Google Cloud Project ID & Target Region
export PROJECT_ID="[YOUR_PROJECT_ID]"
export REGION="asia-east1"
gcloud config set project $PROJECT_ID

# 2. Store your Gemini API Key in Google Secret Manager
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "[YOUR_GEMINI_API_KEY]" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 3. Grant Secret Manager access to the Cloud Run service account
PROJECT_NUM=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUM}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# 4. Build and deploy to Cloud Run with mandatory campaign labels
gcloud run deploy aurora-reflection \
  --source . \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --update-labels=dev-tutorial=cloud-run-ai-challenge

# 5. Deploy Firestore Security Rules to production
firebase deploy --only firestore:rules
```

---

## ⚠️ Known Limitations

- **Probabilistic Insights**: Mood classification and confidence scores represent natural language pattern detection, not clinical or diagnostic assessments.
- **Browser Speech Support**: Voice dictation relies on Web Speech API implementations, which vary across browser engines (e.g., Chrome vs. Firefox).
- **Coarse Location Precision**: Geocoding deliberately rounds coordinates (~1.1 km) to safeguard exact physical locations.
- **Minimum Data for Digests**: Pattern synthesis requires at least 5 approved entries; Aurora will not force speculative conclusions on sparse data.
- **Introspective Scope**: Aurora is designed as a personal reflection tool, not a clinical treatment system or emergency crisis line.

---

## 🔮 Future Work

- 🔑 **Client-Side Zero-Knowledge Encryption**: Optional passphrase-derived client-side encryption of raw journal entries prior to Firestore sync.
- 📱 **Offline Progressive Web App (PWA)**: Full service worker offline caching allowing offline drafting with automatic sync upon reconnection.
- 🔄 **Two-Way Calendar Sync**: Bi-directional status synchronization to update Aurora actions when completed in Google Calendar.
- ⌚ **Local Wearable Correlation**: Optional, on-device correlation of reflection mood trends against sleep and activity metrics.
onal Calendar Integration**: One-click scheduling of accepted 5-minute action items into Google Calendar.
- **Client-Side End-to-End Encryption (E2EE)**: Optional zero-knowledge passphrase encryption for journal text before Firestore writes.
- **Offline PWA Sync**: Full Service Worker caching enabling offline journal drafting with automatic background sync upon reconnection.
