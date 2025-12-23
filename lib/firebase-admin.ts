import * as admin from 'firebase-admin';

// Helper to ensure initialization happens only once and only when needed (at runtime)
const getFirebaseAdmin = () => {
  if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    // Only initialize if we have the credentials (runtime)
    if (privateKey && clientEmail && projectId) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
    } else {
        // This log helps debug if env vars are missing in Vercel
        console.warn("⚠️ Firebase Admin credentials missing. Skipping init (Build phase?).");
    }
  }
  return admin;
};

// Export functions instead of instances to prevent build-time execution
export const getAdminAuth = () => getFirebaseAdmin().auth();
export const getAdminDb = () => getFirebaseAdmin().firestore();