import * as admin from 'firebase-admin';

export const initAdmin = () => {
  if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (!privateKey || !clientEmail || !projectId) {
      console.error(`
      ❌ [FIREBASE ADMIN] MISSING CREDENTIALS
      - Project ID: ${projectId ? 'OK' : 'MISSING'}
      - Client Email: ${clientEmail ? 'OK' : 'MISSING'}
      - Private Key: ${privateKey ? 'OK (Length: ' + privateKey.length + ')' : 'MISSING'}
      `);
      throw new Error("Server configuration error: Missing Firebase Admin credentials.");
    }

    try {
      // FIX: Handle both escaped newlines (\\n) from .env files and real newlines
      const formattedKey = privateKey.replace(/\\n/g, '\n');

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: formattedKey,
        }),
      });
      console.log("✅ [FIREBASE ADMIN] Initialized Successfully");
    } catch (error) {
      console.error("❌ [FIREBASE ADMIN] Init Error:", error);
      throw error;
    }
  }
  return admin;
};

export const getAdminAuth = () => {
  initAdmin();
  return admin.auth();
};

export const getAdminDb = () => {
  initAdmin();
  return admin.firestore();
};