import { NextResponse } from 'next/server';
// Use the new getter functions instead of direct exports
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'; 

export async function POST(request: Request) {
  try {
    // 1. Initialize Admin SDK at Runtime
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    // 2. Parse Request
    const { name, email, password, role, linkedMemberId } = await request.json();

    // Validation
    if (!email || !password || !linkedMemberId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 3. Create or Update Firebase Auth User
    try {
      // Attempt creation first
      await adminAuth.createUser({
        uid: linkedMemberId, 
        email,
        password,
        displayName: name,
      });
    } catch (error: any) {
      // If they exist, force update their credentials
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

    // 4. Set Custom Claims (Role-based access)
    await adminAuth.setCustomUserClaims(linkedMemberId, { role });

    // 5. Update Firestore Profile
    await adminDb.collection('teamMembers').doc(linkedMemberId).set({
      email,
      status: role,
      hasLogin: true, 
    }, { merge: true });

    return NextResponse.json({ success: true, uid: linkedMemberId });

  } catch (error: any) {
    console.error('Create User Error:', error);
    return NextResponse.json({ error: error.message || "Failed to create user." }, { status: 500 });
  }
}