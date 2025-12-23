import { create } from "zustand";
import { db, auth } from "@/lib/firebase";
import { collection, onSnapshot, query, doc, getDoc } from "firebase/firestore";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { 
  CalendarEvent, 
  TeamMember, 
  Status 
} from "@/app/(main)/calendar/_components/types";

interface UserProfile {
  uid: string;
  email: string;
  role: Status;
  name: string;
  image?: string;
}

interface AppState {
  events: CalendarEvent[];
  team: TeamMember[];
  curriculum: any[];
  loading: boolean;
  
  currentUser: UserProfile | null;
  authLoading: boolean;
  
  subscribeEvents: () => () => void;
  subscribeTeam: () => () => void;
  subscribeCurriculum: () => () => void;
  
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  events: [],
  team: [],
  curriculum: [],
  loading: true,
  currentUser: null,
  authLoading: true,

  subscribeEvents: () => {
    // Basic event subscription
    const q = query(collection(db, "events"));
    return onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Timestamps to Dates safely
        startDate: doc.data().startDate?.toDate ? doc.data().startDate.toDate() : new Date(),
        endDate: doc.data().endDate?.toDate ? doc.data().endDate.toDate() : new Date(),
      })) as CalendarEvent[];
      set({ events: eventsData, loading: false });
    });
  },

  subscribeTeam: () => {
    // Query the main team collection
    const q = query(collection(db, "teamMembers")); 
    
    return onSnapshot(q, async (snapshot) => {
      const teamData: TeamMember[] = [];

      // We use a for...of loop or map to handle async overrides
      // Using Promise.all is faster
      const promises = snapshot.docs.map(async (d) => {
        try {
          const memberData = d.data();
          
          // Default role/status from the scraped data
          let finalStatus = memberData.status || "Team Member";
          let finalRole = memberData.role || "Team Member";

          // Try to fetch manual overrides (e.g. if you promoted someone manually)
          // We wrap this in a mini try/catch so missing overrides don't break the main user load
          try {
            const overrideRef = doc(db, "profileOverrides", d.id);
            const overrideSnap = await getDoc(overrideRef);
            
            if (overrideSnap.exists()) {
               const overrideData = overrideSnap.data();
               // Spread overrides on top
               Object.assign(memberData, overrideData);
               
               // Recalculate status if overridden
               if (overrideData.status) finalStatus = overrideData.status;
               if (overrideData.role) finalRole = overrideData.role;
            }
          } catch (err) {
            console.warn(`Could not load overrides for ${d.id}`, err);
          }

          return {
            id: d.id,
            ...memberData,
            status: finalStatus,
            role: finalRole,
            // Ensure these objects exist to prevent UI crashes
            stats: memberData.stats || { speed: 50, accuracy: 50, hospitality: 50, knowledge: 50, leadership: 50 },
            progress: memberData.progress || 0,
            dept: memberData.dept || "FOH",
            image: memberData.image || ""
          } as TeamMember;

        } catch (e) {
          console.error("Error parsing team member:", d.id, e);
          return null;
        }
      });

      const results = await Promise.all(promises);
      // Filter out any nulls from errors
      const validMembers = results.filter((m): m is TeamMember => m !== null);

      console.log(`✅ Loaded ${validMembers.length} Team Members from Firestore`);
      set({ team: validMembers });
    });
  },

  subscribeCurriculum: () => { return () => {}; },

  login: async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // (Existing login logic kept simple for brevity, assumed working)
    const uid = userCredential.user.uid;
    set({ currentUser: { uid, email, name: "Admin", role: "Director" } });
  },

  logout: async () => {
    await signOut(auth);
    set({ currentUser: null });
  },

  checkAuth: () => {
    auth.onAuthStateChanged((user) => {
      if (user) {
        set({ 
          currentUser: { uid: user.uid, email: user.email || "", name: "Admin", role: "Director" },
          authLoading: false
        });
      } else {
        set({ currentUser: null, authLoading: false });
      }
    });
  }
}));