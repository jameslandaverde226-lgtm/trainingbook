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
               Object.assign(memberData, overrideData);
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
            badges: memberData.badges || []
          } as TeamMember;

        } catch (e) {
          return null;
        }
      });

      const results = await Promise.all(promises);
      const validMembers = results.filter((m): m is TeamMember => m !== null);
      set({ team: validMembers, loading: false });
    });
  },

  subscribeCurriculum: () => {
    const q = query(collection(db, "curriculum"));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      data.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      set({ curriculum: data });
    });
  },

  login: async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
    // Note: checkAuth listener will handle setting the state
  },

  logout: async () => {
    await signOut(auth);
    set({ currentUser: null });
  },

  // --- FIXED CHECKAUTH FUNCTION ---
  checkAuth: () => {
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Default fallback values
        let profileName = user.displayName || "User";
        let profileRole: Status = "Team Member";
        let profileImage = user.photoURL || "";

        try {
            // 1. Fetch real data from TeamMembers collection using the UID
            const memberRef = doc(db, "teamMembers", user.uid);
            const memberSnap = await getDoc(memberRef);
            
            // 2. Fetch any overrides (like roles promoted via UI)
            const overrideRef = doc(db, "profileOverrides", user.uid);
            const overrideSnap = await getDoc(overrideRef);

            if (memberSnap.exists()) {
                const data = memberSnap.data();
                profileName = data.name || profileName;
                profileImage = data.image || profileImage;
                // Use stored status as role
                if (data.status) profileRole = data.status as Status;
            }

            if (overrideSnap.exists()) {
                const data = overrideSnap.data();
                // Overrides take precedence
                if (data.role) profileRole = data.role as Status;
                if (data.status) profileRole = data.status as Status; // Ensure status sync
                if (data.image) profileImage = data.image;
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
        }

        set({ 
          currentUser: { 
              uid: user.uid, 
              email: user.email || "", 
              name: profileName, 
              role: profileRole,
              image: profileImage
          },
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