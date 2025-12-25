// --- FILE: ./lib/store/useStore.ts ---
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

  // Optimistic Update Helper
  updateMemberLocal: (id: string, updates: Partial<TeamMember>) => void;
}

export const useAppStore = create<AppState>((set) => ({
  events: [],
  team: [],
  curriculum: [],
  loading: true,
  currentUser: null,
  authLoading: true,

  subscribeEvents: () => {
    const q = query(collection(db, "events"));
    return onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startDate: doc.data().startDate?.toDate ? doc.data().startDate.toDate() : new Date(),
        endDate: doc.data().endDate?.toDate ? doc.data().endDate.toDate() : new Date(),
      })) as CalendarEvent[];
      set({ events: eventsData, loading: false });
    });
  },

  subscribeTeam: () => {
    const q = query(collection(db, "teamMembers")); 
    
    return onSnapshot(q, async (snapshot) => {
      const promises = snapshot.docs.map(async (d) => {
        try {
          const memberData = d.data();
          
          let finalStatus = memberData.status || "Team Member";
          let finalRole = memberData.role || "Team Member";

          // Merge profile overrides
          try {
            const overrideRef = doc(db, "profileOverrides", d.id);
            const overrideSnap = await getDoc(overrideRef);
            
            if (overrideSnap.exists()) {
               const overrideData = overrideSnap.data();
               Object.assign(memberData, overrideData); // Merges fields like 'badges'
               
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
            stats: memberData.stats || { speed: 50, accuracy: 50, hospitality: 50, knowledge: 50, leadership: 50 },
            progress: memberData.progress || 0,
            dept: memberData.dept || "Unassigned",
            image: memberData.image || "",
            badges: memberData.badges || [] // Ensure badges array exists
          } as TeamMember;

        } catch (e) {
          console.error("Error parsing team member:", d.id, e);
          return null;
        }
      });

      const results = await Promise.all(promises);
      const validMembers = results.filter((m): m is TeamMember => m !== null);

      set({ team: validMembers, loading: false }); // Ensure loading is set to false here
    });
  },

  subscribeCurriculum: () => {
    const q = query(collection(db, "curriculum"));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort by 'order' field to ensure correct sequence
      data.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      set({ curriculum: data });
    });
  },

  login: async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
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
  },

  updateMemberLocal: (id, updates) => {
    set((state) => ({
      team: state.team.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }));
  },
}));