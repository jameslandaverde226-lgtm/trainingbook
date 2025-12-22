import { create } from "zustand";
import { db, auth } from "@/lib/firebase"; // REMOVED caresDb, using only db
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

interface AppState {
  // Data State
  events: CalendarEvent[];
  team: TeamMember[];
  curriculum: any[];
  loading: boolean;
  
  // Auth State
  currentUser: UserProfile | null;
  authLoading: boolean;
  
  // Data Actions
  subscribeEvents: () => () => void;
  subscribeTeam: () => () => void;
  subscribeCurriculum: () => () => void;
  
  // Auth Actions
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
    // UPDATED: Now looking at the main 'db' instead of 'caresDb'
    const q = query(collection(db, "teamMembers")); 
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const teamData = await Promise.all(snapshot.docs.map(async (d) => {
         // Fetch override data if needed
         const overrideRef = doc(db, "profileOverrides", d.id);
         const overrideSnap = await getDoc(overrideRef);
         const overrideData = overrideSnap.exists() ? overrideSnap.data() : {};

         return {
            id: d.id,
            ...d.data(),
            ...overrideData, 
         };
      }));
      
      set({ team: teamData as TeamMember[] });
    });
    return unsubscribe;
  },

  subscribeCurriculum: () => {
     return () => {}; 
  },

  // --- AUTH ACTIONS ---

  login: async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // UPDATED: Now looking at 'db'
      const userDoc = await getDoc(doc(db, "teamMembers", uid));
      
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
         // Fallback to profileOverrides if needed
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
    auth.onAuthStateChanged(async (user) => {
      if (user) {
         // UPDATED: Now looking at 'db'
         const userDoc = await getDoc(doc(db, "teamMembers", user.uid));
         
         let role: Status = "Team Member";
         let name = "Admin";

         if (userDoc.exists()) {
             const data = userDoc.data();
             role = data.role as Status;
             name = data.name;
         }

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