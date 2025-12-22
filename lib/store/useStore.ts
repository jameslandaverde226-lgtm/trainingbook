import { create } from "zustand";
import { db, caresDb, auth } from "@/lib/firebase"; 
import { collection, onSnapshot, query, orderBy, doc, getDoc } from "firebase/firestore";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { 
  CalendarEvent, 
  TeamMember, 
  Status 
} from "@/app/(main)/calendar/_components/types";

// --- AUTH TYPES ---
interface UserProfile {
  uid: string;
  email: string;
  role: Status;
  name: string;
  image?: string;
}

// THIS INTERFACE WAS MISSING THE AUTH PROPERTIES
interface AppState {
  // Data State
  events: CalendarEvent[];
  team: TeamMember[];
  curriculum: any[];
  loading: boolean;
  
  // Auth State (These caused your errors)
  currentUser: UserProfile | null;
  authLoading: boolean;
  
  // Data Actions
  subscribeEvents: () => () => void;
  subscribeTeam: () => () => void;
  subscribeCurriculum: () => () => void;
  
  // Auth Actions (These caused your errors)
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial Data State
  events: [],
  team: [],
  curriculum: [],
  loading: true,
  
  // Initial Auth State
  currentUser: null,
  authLoading: true,

  // --- DATA SUBSCRIPTIONS ---

  subscribeEvents: () => {
    const q = query(collection(db, "events"), orderBy("startDate", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startDate: doc.data().startDate?.toDate(),
        endDate: doc.data().endDate?.toDate(),
      })) as CalendarEvent[];
      set({ events: eventsData, loading: false });
    });
    return unsubscribe;
  },

  subscribeTeam: () => {
    // Merging logic: We listen to 'teamMembers' (CARES DB) and 'profileOverrides' (App DB)
    // For simplicity in this view, we'll just listen to the main team collection
    // In a real app, you might join these manually.
    
    // NOTE: Ensure you are listening to the correct collection based on your setup.
    // Assuming 'teamMembers' is the source of truth for now.
    const q = query(collection(caresDb, "teamMembers")); 
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const teamData = await Promise.all(snapshot.docs.map(async (d) => {
         // Fetch override data if needed (e.g. local roles/assignments)
         const overrideRef = doc(db, "profileOverrides", d.id);
         const overrideSnap = await getDoc(overrideRef);
         const overrideData = overrideSnap.exists() ? overrideSnap.data() : {};

         return {
            id: d.id,
            ...d.data(),
            ...overrideData, // Overwrite with local app data
         };
      }));
      
      set({ team: teamData as TeamMember[] });
    });
    return unsubscribe;
  },

  subscribeCurriculum: () => {
     // Assuming a static or simple collection for curriculum
     // If you have a 'curriculum' collection:
     /*
     const unsubscribe = onSnapshot(collection(db, "curriculum"), (snap) => {
        set({ curriculum: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
     });
     return unsubscribe;
     */
     
     // Returning mock for now if no DB exists, or connect real one:
     return () => {}; 
  },

  // --- AUTH ACTIONS ---

  login: async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // 1. Fetch User Role from Team DB 
      // We assume the Auth UID matches a Document ID in 'teamMembers'
      const userDoc = await getDoc(doc(caresDb, "teamMembers", uid));
      
      // Default / Fallback User
      let userData: UserProfile = {
         uid, 
         email: userCredential.user.email || "", 
         name: "Operative", 
         role: "Team Member" 
      };

      if (userDoc.exists()) {
         const data = userDoc.data();
         userData.name = data.name;
         userData.role = (data.role as Status) || "Team Member";
         userData.image = data.image;
      } else {
         // Optional: Check 'profileOverrides' if not in main DB
         const overrideDoc = await getDoc(doc(db, "profileOverrides", uid));
         if (overrideDoc.exists()) {
             const data = overrideDoc.data();
             if (data.role) userData.role = data.role as Status;
         }
      }

      set({ currentUser: userData });
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  },

  logout: async () => {
    await signOut(auth);
    set({ currentUser: null });
  },

  checkAuth: () => {
    // Persistent Listener for Page Refreshes
    auth.onAuthStateChanged(async (user) => {
      if (user) {
         // Re-fetch profile to ensure role is up to date
         const userDoc = await getDoc(doc(caresDb, "teamMembers", user.uid));
         
         // Fallback if user is just in Auth but not in DB (e.g. initial admin)
         // You might want to hardcode your specific email as Director here for safety
         let role: Status = "Team Member";
         let name = "Admin";

         if (userDoc.exists()) {
             const data = userDoc.data();
             role = data.role as Status;
             name = data.name;
         }

         // Emergency Admin Override (Optional)
         // if (user.email === "your-email@example.com") role = "Director";

         set({ 
           currentUser: { 
             uid: user.uid, 
             email: user.email || "", 
             name, 
             role,
             image: user.photoURL || undefined
           },
           authLoading: false
         });
      } else {
        set({ currentUser: null, authLoading: false });
      }
    });
  }
}));