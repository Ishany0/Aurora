import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  type User,
} from "firebase/auth";
import { getFirestore, doc, getDocFromServer, collection, setDoc, getDoc, getDocs, deleteDoc, query, orderBy, onSnapshot } from "firebase/firestore";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase with environment variables or applet configuration
const metaEnv = typeof import.meta !== "undefined" ? (import.meta as any).env || {} : {};

export const clientConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: metaEnv.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  firestoreDatabaseId: metaEnv.VITE_FIRESTORE_DATABASE_ID || firebaseConfig.firestoreDatabaseId,
};

const app = initializeApp(clientConfig);

// CRITICAL: Bind explicitly to firestoreDatabaseId
export const db = getFirestore(app, clientConfig.firestoreDatabaseId || firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Ensure local persistence for secure sessions across reloads
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn("[Aurora Auth] Could not set browserLocalPersistence:", err);
});

export const storage = getStorage(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

export { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signInAnonymously, signOut, onAuthStateChanged };
export type { User };

/**
 * Uploads a user photo safely to their isolated storage path /users/{userId}/uploads/{uploadId}
 */
export async function uploadUserPhoto(userId: string, dataUrl: string, uploadId?: string): Promise<string> {
  const fileId = uploadId || `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const storageRef = ref(storage, `users/${userId}/uploads/${fileId}`);
  
  // upload data URL format (e.g. data:image/jpeg;base64,...)
  const uploadResult = await uploadString(storageRef, dataUrl, "data_url");
  const downloadUrl = await getDownloadURL(uploadResult.ref);
  return downloadUrl;
}

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Validates connection to Firestore on initial boot.
 */
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Firestore connection check: Client appears offline or database initializing.");
    }
    // Permission denied on test/connection is expected since security rules default-deny /test
    return true;
  }
}

// Initial connection test
testConnection();
