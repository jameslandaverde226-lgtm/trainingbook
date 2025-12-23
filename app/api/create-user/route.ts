import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    // 1. Verify Caller is Admin (Optional but recommended: check Authorization header)
    const { name, email, password, role, dept, linkedMemberId } = await request.json();

    if (!email || !password || !linkedMemberId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 2. Create Auth User
    // We intentionally force the UID to match the TeamMember ID from the scraper.
    // This creates the perfect link between Auth and Data.
    const userRecord = await adminAuth.createUser({
      uid: linkedMemberId, // CRITICAL: This links the login to the existing data card
      email,
      password,
      displayName: name,
    });

    // 3. Set Custom Claims (Role)
    await adminAuth.setCustomUserClaims(userRecord.uid, { role });

    // 4. Update the Firestore Document to mark as "Onboarded"
    await adminDb.collection('teamMembers').doc(linkedMemberId).set({
      email, // Ensure email matches auth
      status: role, // Update role status
      hasLogin: true, // Flag for UI
    }, { merge: true });

    return NextResponse.json({ success: true, uid: userRecord.uid });

  } catch (error: any) {
    console.error('Create User Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}