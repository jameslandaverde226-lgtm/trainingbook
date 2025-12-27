import * as admin from 'firebase-admin';

export const initAdmin = () => {
  if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (!privateKey || !clientEmail || !projectId) {
      throw new Error("❌ Missing Firebase Admin credentials in environment variables.");
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        // Robust handling for newlines in env variables
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  }
  return admin;
};

// Export getters to ensure init happens at call time, not load time
export const getAdminAuth = () => {
  initAdmin();
  return admin.auth();
};

export const getAdminDb = () => {
  initAdmin();
  return admin.firestore();
};