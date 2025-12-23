import { NextResponse } from 'next/server';
// Use the new getter functions instead of direct exports
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'; 

export async function POST(request: Request) {
  try {
    // 1. Initialize Admin SDK at Runtime (prevents build errors)
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    // 2. Parse Request
    const { name, email, password, role, linkedMemberId } = await request.json();

    // Validation
    if (!email || !password || !linkedMemberId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 3. Create Firebase Auth User
    // We force the UID to match the existing Team Member ID to link the profile card.
    const userRecord = await adminAuth.createUser({
      uid: linkedMemberId, 
      email,
      password,
      displayName: name,
    });

    // 4. Set Custom Claims (Role-based access)
    await adminAuth.setCustomUserClaims(userRecord.uid, { role });

    // 5. Update Firestore Profile
    // Marks the user as having login access and ensures their email/role are synced.
    await adminDb.collection('teamMembers').doc(linkedMemberId).set({
      email,
      status: role,
      hasLogin: true, 
    }, { merge: true });

    return NextResponse.json({ success: true, uid: userRecord.uid });

  } catch (error: any) {
    console.error('Create User Error:', error);
    // Return a clean error message to the client
    return NextResponse.json({ error: error.message || "Failed to create user." }, { status: 500 });
  }
}