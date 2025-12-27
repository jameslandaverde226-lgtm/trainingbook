import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'; 

export async function POST(request: Request) {
  try {
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();
    const { name, email, password, role, linkedMemberId } = await request.json();

    if (!email || !password || !linkedMemberId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`[API] Processing user: ${linkedMemberId} (${email})`);

    // --- 1. CHECK IF USER EXISTS ---
    let userRecord;
    try {
      userRecord = await adminAuth.getUser(linkedMemberId);
      console.log(`[API] Found existing user: ${userRecord.uid}. Updating...`);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        console.log(`[API] User not found. Creating new...`);
        userRecord = null;
      } else {
        throw error;
      }
    }

    // --- 2. CREATE OR UPDATE ---
    if (userRecord) {
      // UPDATE EXISTING
      await adminAuth.updateUser(linkedMemberId, {
        email,
        password,
        displayName: name,
      });
    } else {
      // CREATE NEW
      // Note: We deliberately set the UID to match the teamMember ID
      userRecord = await adminAuth.createUser({
        uid: linkedMemberId,
        email,
        password,
        displayName: name,
      });
    }

    // --- 3. SET CLAIMS & FIRESTORE ---
    await adminAuth.setCustomUserClaims(linkedMemberId, { role });

    await adminDb.collection('teamMembers').doc(linkedMemberId).set({
      email,
      status: role,
      hasLogin: true, 
      updatedAt: new Date()
    }, { merge: true });

    return NextResponse.json({ success: true, uid: linkedMemberId, action: userRecord ? "updated" : "created" });

  } catch (error: any) {
    console.error('[API] Create/Update Error:', error);
    return NextResponse.json({ 
      error: error.message || "Failed to process user account." 
    }, { status: 500 });
  }
}