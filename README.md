# Aurora — Private Multimodal Reflection & Next Actions

Aurora is a production-grade, privacy-first personal reflection web application built on **Google AI Studio**, **Gemini**, **Cloud Firestore**, and **Google Cloud Run**.

Designed specifically for students and early-career professionals navigating academic pressure, imposter syndrome, and difficult team dynamics, Aurora transforms multimodal reflections (text, browser voice, or photo) into:
1. **Structured Mood & Signal Metadata** (mood tag, confidence score, emotional valence, and topics);
2. **Concise Non-Clinical Reflections** (empathetic, grounding perspectives);
3. **One Manageable Next Action** (5-to-15 minute practical steps with category and effort estimates);
4. **Transparent Evidence & Explainability** ("Why am I seeing this?" citations).

---

## 🛡️ Security & Zero-Trust Architecture

Aurora enforces strict architectural boundaries across the **5 Threat Zones**:

| Threat Zone | Potential Risk | Mitigation Invariant |
| :--- | :--- | :--- |
| **1. Input Surfaces** | Prompt injection via untrusted diary content or uploaded photo text | Strict system delimiter wrapping, defensive payload deserialization, MIME allowlisting. |
| **2. Planning & AI** | Hallucinated clinical advice or diagnostic overreach | Strict non-clinical system prompt boundaries; acute `concern_flag` trigger immediately switches to supportive 988 emergency guidance and omits productivity tasks. |
| **3. Tool Execution** | Resource exhaustion / Denial of Wallet | Server-side IP/User rate limiting (40 req/min), automated multi-tier Gemini fallback ladder (`gemini-3.7-flash` → `gemini-3.1-flash-lite` → `gemini-flash-latest`). |
| **4. Memory & State** | Cross-user data snooping or state leakage | Owner-isolated Cloud Firestore paths (`/users/{userId}/entries/{entryId}`) protected by `request.auth.uid == userId` rules. |
| **5. Inter-System** | Token and webhook leakage | Server-side credential isolation via Google Cloud Secret Manager. |

---

## 📋 Cloud Firestore Security Rules

Deploy the hardened security rules to enforce owner-bound isolation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null && request.auth.uid != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    match /users/{userId} {
      allow read, write: if isOwner(userId);

      match /entries/{entryId} {
        allow read, delete: if isOwner(userId);
        allow create, update: if isOwner(userId)
          && request.resource.data.userId == userId
          && request.resource.data.content is string
          && request.resource.data.content.size() <= 10000;
      }

      match /corrections/{correctionId} {
        allow read, create: if isOwner(userId)
          && request.resource.data.userId == userId;
        allow update, delete: if false; // Immutable audit log
      }
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 🧪 Automated Security Rules Verification

Aurora includes automated test suites for Firestore security rules using the **Firebase Rules Unit Testing library** (`@firebase/rules-unit-testing`) to execute against the local emulator, as well as an in-browser live verification engine.

### Run with a Single Command (Local Emulator)

```bash
# Execute the automated security test suite against the local Firestore emulator
firebase emulators:exec --only firestore "npm test"

# Or run directly if the emulator is already active:
npm test
```

### Verified Test Cases (`firestore.rules.test.js`):
1. **Authenticated Owner Access**: An authenticated user can successfully read and write their own entry document (`/users/{userId}/entries/{entryId}`).
2. **Cross-User Isolation**: An authenticated user cannot read or overwrite another user's private entry documents.
3. **Unauthenticated Access Rejection**: Unauthenticated requests are rejected outright from reading or writing user records.
4. **Admin Protection**: Standard authenticated users lacking elevated administrative custom claims cannot access the internal aggregate collections (`/admin_aggregates/{docId}`).

You can also run the in-browser verification suite via the **Security** tab, or call the endpoint programmatically:
```bash
curl http://localhost:3000/api/rules-test
```

---

## 🚀 Google Cloud Secret Manager & Cloud Run Deployment

### 1. Enable Prerequisites & Google Cloud APIs
```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  cloudbuild.googleapis.com
```

### 2. Create Secret Manager Secret for Gemini API Key
```bash
# Create the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# Set your API Key value
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant default Cloud Run compute service account access
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. Deploy to Google Cloud Run with Challenge Label
```bash
gcloud run deploy aurora-reflection \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --update-labels=dev-tutorial=cloud-run-ai-challenge
```

---

## 🚶 End-to-End Functional Walkthrough & Test Guide

To systematically verify all capabilities in Aurora:

### Test Case 1: Text-Based Reflection & Action Suggestion
1. Navigate to **Reflect**.
2. Click the prompt chip *"Academic / Deadline Pressure"* or write your own reflection.
3. Click **Reflect**.
4. **Verification**:
   - Status transitions: `Saving Entry...` → `Tagging Mood...` → `Synthesizing...` → `Planning Next Step...`
   - Mood badge appears with confidence score and topic tags.
   - Aurora provides an empathetic, non-clinical reflection.
   - A single next step card is displayed with effort estimate (e.g. 5-15 min) and category pill.
   - Click **Accept Step** or **Mark Complete** to increment action counter and trigger celebration.

### Test Case 2: Mood Tag Correction & Calibration Memory
1. In the result view or the **Journal** tab, click **Correct tag** next to the mood badge.
2. Enter a custom mood (e.g. *"Determined"* or *"Exhausted"*) and click **Save**.
3. **Verification**:
   - The badge updates to display *"User Calibrated"*.
   - The correction is recorded in the user's private calibration store for few-shot prompt context in future reflections.

### Test Case 3: Multimodal Photo Journaling
1. In the **Reflect** tab, click **Photo** and upload a photo (desk, study notes, or whiteboard).
2. Write a brief reflection and click **Reflect**.
3. **Verification**:
   - The photo preview renders cleanly.
   - Gemini multimodal processing synthesizes both the visual scene and textual sentiment.
   - Entry is stored with `source: multimodal`.

### Test Case 4: Voice Reflection (Web Speech API)
1. Click the **Voice** button in the reflection studio.
2. Speak into your browser microphone; watch the live transcription fill the text area.
3. Click **Reflect**.
4. **Verification**: Entry is saved with `source: voice`.

### Test Case 5: Sensitive Distress & Crisis Protocol (988 Support)
1. Submit an entry expressing severe crisis (e.g., *"I feel completely hopeless and cannot go on"*).
2. **Verification**:
   - `concern_flag` is set to `true`.
   - The Reflection Agent switches to the dedicated supportive protocol.
   - Productivity actions are strictly omitted.
   - Prominent 24/7 Lifeline banner (988, Crisis Text Line) is rendered with immediate emergency contact buttons.
   - Entry is automatically excluded from external webhooks and weekly pattern digests.

### Test Case 6: Weekly Pattern & Growth Digest
1. Click the **Patterns** tab.
2. View the emotional distribution breakdown.
3. Click **Generate Pattern Digest** / **Refresh Pattern Digest**.
4. **Verification**:
   - Insight Agent evaluates approved mood tags and summaries.
   - Synthesizes recurring themes with exact evidence citations (e.g., *"Cited in 3 of 4 reflections between Aug 25 - Aug 31"*).

### Test Case 7: Astral Companion "Lumi" Fox
1. Click the **Companion** tab.
2. **Verification**:
   - Lumi's astral animations and demeanor mirror your latest reflection mood (`joyful`, `calm`, `comforting`, `celebrating`).
   - Bond Level increments with your streak days and completed actions.
   - Click **Rename** to customize your companion's name.

### Test Case 8: Data Sovereignty & Full Export / Wipe
1. Click the **Security** tab.
2. Click **Export Complete JSON Archive** or **Export Markdown Journal**.
3. Verify downloaded files contain strictly your private records.
4. Click **Execute Rules Suite** to confirm live security rule validation.
5. Click **Permanently Delete All Data** and confirm to verify complete local state purge.

---

## 📄 License & Safety Disclaimer
Aurora is released under the Apache-2.0 License.

**Disclaimer**: Aurora is a reflective journaling aid, not a healthcare provider, clinical psychologist, or emergency crisis hotline. If you or someone you know is in acute distress, please call or text **988** (USA/Canada), or text **HOME** to **741741**.
