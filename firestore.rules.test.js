import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from "firebase/firestore";

const PROJECT_ID = "aurora-security-rules-test";
const RULES_PATH = "./firestore.rules";

describe("Firestore Security Rules Isolation Suite (11 Test Cases)", () => {
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

  // Case 1: Unauthenticated request cannot list or read pending user paths
  it("Case 1: Auth loading / unauth request shows no private data", async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const ref = doc(unauthDb, "users/pending_auth_user/entries/entry_1");
    await assertFails(getDoc(ref));
  });

  // Case 2: Signed-out visitor sees only public sign-in, access denied to private journal collections
  it("Case 2: Signed-out visitor is DENIED access to private journal collections", async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const colRef = collection(unauthDb, "users/alice/entries");
    await assertFails(getDocs(colRef));
  });

  // Case 3: Signed-in user can access their own root collections
  it("Case 3: Signed-in user CAN access their own entries collection", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const colRef = collection(aliceDb, "users/alice/entries");
    await assertSucceeds(getDocs(colRef));
  });

  // Case 4: User A can create and read their own entry document
  it("Case 4: User A CAN create and read their own entry document", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const aliceEntryRef = doc(aliceDb, "users/alice/entries/entry_1");

    await assertSucceeds(
      setDoc(aliceEntryRef, {
        ownerId: "alice",
        userId: "alice",
        content: "Reflecting on my project milestones and feeling grounded.",
        mood: "Grounded",
        createdAt: new Date().toISOString(),
      })
    );

    await assertSucceeds(getDoc(aliceEntryRef));
  });

  // Case 5: User B cannot read User A's entry document
  it("Case 5: User B CANNOT read User A's entry document", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, "users/alice/entries/alice_private_entry"), {
        ownerId: "alice",
        userId: "alice",
        content: "Deeply confidential personal reflection notes.",
      });
    });

    const bobDb = testEnv.authenticatedContext("bob").firestore();
    const aliceEntryRef = doc(bobDb, "users/alice/entries/alice_private_entry");

    await assertFails(getDoc(aliceEntryRef));
  });

  // Case 6: Unauthenticated users cannot read entries from any user path
  it("Case 6: Unauthenticated users CANNOT read entries from any user path", async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const targetRef = doc(unauthDb, "users/alice/entries/entry_anon_test");
    await assertFails(getDoc(targetRef));
  });

  // Case 7: Logout clears prior user access (unauthenticated write rejected)
  it("Case 7: Unauthenticated write to prior user path is DENIED", async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const targetRef = doc(unauthDb, "users/alice/entries/entry_logout_test");
    await assertFails(
      setDoc(targetRef, {
        ownerId: "alice",
        userId: "alice",
        content: "Post-logout injection attempt",
      })
    );
  });

  // Case 8: Account switch from User A to User B cannot tamper with User A's documents
  it("Case 8: User B CANNOT update User A's documents upon account switch", async () => {
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    const aliceEntryRef = doc(bobDb, "users/alice/entries/entry_switch_test");
    await assertFails(
      setDoc(aliceEntryRef, {
        ownerId: "bob",
        userId: "bob",
        content: "Tampering with Alice's entry after switch",
      })
    );
  });

  // Case 9: Shared top-level collections are strictly denied
  it("Case 9: Top-level shared collections are DENIED", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const sharedRef = doc(aliceDb, "entries/shared_entry_1");
    await assertFails(getDoc(sharedRef));
  });

  // Case 10: Same journal text from two different users stored in isolated namespaces
  it("Case 10: User B CAN store identical text in their own isolated collection", async () => {
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    const bobEntryRef = doc(bobDb, "users/bob/entries/entry_identical");
    await assertSucceeds(
      setDoc(bobEntryRef, {
        ownerId: "bob",
        userId: "bob",
        content: "Identical journal text from another user",
      })
    );
  });

  // Case 11: Admin aggregate path is denied to standard authenticated users
  it("Case 11: Standard user WITHOUT admin claim CANNOT read admin aggregates path", async () => {
    const standardUserDb = testEnv.authenticatedContext("charlie", { role: "user" }).firestore();
    const aggregateRef = doc(standardUserDb, "admin_aggregates/daily_metrics");
    await assertFails(getDoc(aggregateRef));
  });
});
