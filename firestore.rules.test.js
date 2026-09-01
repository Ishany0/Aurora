import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

const PROJECT_ID = "aurora-security-rules-test";
const RULES_PATH = "./firestore.rules";

describe("Firestore Security Rules Isolation Suite", () => {
  let testEnv;

  before(async () => {
    const rules = fs.readFileSync(RULES_PATH, "utf8");
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules,
        host: process.env.FIRESTORE_EMULATOR_HOST?.split(":")[0] || "127.0.0.1",
        port: parseInt(process.env.FIRESTORE_EMULATOR_HOST?.split(":")[1] || "8080", 10),
      },
    });
  });

  after(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    if (testEnv) {
      await testEnv.clearFirestore();
    }
  });

  // Case 1: Authenticated user can read and write their own entry document
  it("Case 1: Authenticated user CAN read and write their own entry document", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const aliceEntryRef = doc(aliceDb, "users/alice/entries/entry_1");

    // Write own entry
    await assertSucceeds(
      setDoc(aliceEntryRef, {
        userId: "alice",
        content: "Reflecting on my project milestones and feeling grounded.",
        mood: "Grounded",
        createdAt: new Date().toISOString(),
      })
    );

    // Read own entry
    await assertSucceeds(getDoc(aliceEntryRef));
  });

  // Case 2: Authenticated user CANNOT read another user's entry document
  it("Case 2: Authenticated user CANNOT read or write another user's entry document", async () => {
    // Setup Alice's entry with admin bypass
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, "users/alice/entries/alice_private_entry"), {
        userId: "alice",
        content: "Deeply confidential personal reflection notes.",
      });
    });

    const bobDb = testEnv.authenticatedContext("bob").firestore();
    const aliceEntryRef = doc(bobDb, "users/alice/entries/alice_private_entry");

    // Bob attempts to read Alice's entry
    await assertFails(getDoc(aliceEntryRef));

    // Bob attempts to overwrite Alice's entry
    await assertFails(
      setDoc(aliceEntryRef, {
        userId: "bob",
        content: "Attempted tampering with Alice's entry.",
      })
    );
  });

  // Case 3: Unauthenticated request is rejected outright
  it("Case 3: Unauthenticated request is REJECTED outright from reading or writing entries", async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const targetRef = doc(unauthDb, "users/alice/entries/entry_anon_test");

    // Attempt unauthenticated read
    await assertFails(getDoc(targetRef));

    // Attempt unauthenticated write
    await assertFails(
      setDoc(targetRef, {
        userId: "alice",
        content: "Unauthenticated write attempt.",
      })
    );
  });

  // Case 4: User without admin custom claim cannot read admin aggregate path
  it("Case 4: Standard user WITHOUT admin claim CANNOT read admin aggregates path", async () => {
    // Setup aggregate data with admin context
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, "admin_aggregates/daily_metrics"), {
        totalEntries: 1420,
        averageConfidence: 0.88,
      });
    });

    const standardUserDb = testEnv.authenticatedContext("charlie", { role: "user" }).firestore();
    const aggregateRef = doc(standardUserDb, "admin_aggregates/daily_metrics");

    // Standard user attempted read of internal aggregate collection
    await assertFails(getDoc(aggregateRef));

    // Standard user attempted write to internal aggregate collection
    await assertFails(
      setDoc(aggregateRef, {
        totalEntries: 9999,
      })
    );
  });
});
