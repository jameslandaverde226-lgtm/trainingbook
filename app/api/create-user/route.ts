import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'; 

export async function POST(request: Request) {
  try {
    // 1. Initialize Admin SDK (Triggers initAdmin from lib)
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    // 2. Parse Request
    const { name, email, password, role, linkedMemberId } = await request.json();

    if (!email || !password || !linkedMemberId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 3. Create or Update User
    try {
      await adminAuth.createUser({
        uid: linkedMemberId, 
        email,
        password,
        displayName: name,
      });
    } catch (error: any) {
      if (error.code === 'auth/uid-already-exists' || error.code === 'auth/email-already-exists') {
        console.log(`User ${linkedMemberId} exists. Updating credentials...`);
        await adminAuth.updateUser(linkedMemberId, {
          email,
          password,
          displayName: name,
        });
      } else {
        throw error;
      }
    }

    // 4. Set Claims
    await adminAuth.setCustomUserClaims(linkedMemberId, { role });

    // 5. Update Firestore
    await adminDb.collection('teamMembers').doc(linkedMemberId).set({
      email,
      status: role,
      hasLogin: true, 
    }, { merge: true });

    return NextResponse.json({ success: true, uid: linkedMemberId });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      error: error.message || "Internal Server Error", 
      details: "Check server logs."
    }, { status: 500 });
  }
}