import { create } from "zustand";
import { db, caresDb } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { 
  CalendarEvent, 
  TeamMember, 
  Status, 
  Department 
} from "@/app/(main)/calendar/_components/types";

interface AppState {
  events: CalendarEvent[];
  team: TeamMember[];
  curriculum: any[];
  loading: boolean;
  subscribeEvents: () => () => void;
  subscribeTeam: () => () => void;
  subscribeCurriculum: () => () => void;
}

export const useAppStore = create<AppState>((set) => ({
  events: [],
  team: [],
  curriculum: [],
  loading: true,

  subscribeEvents: () => {
    // Listen to the 'events' collection in the PRIMARY DB (Trainingbook)
    const q = query(collection(db, "events"), orderBy("startDate", "desc"));
    return onSnapshot(q, (snapshot) => {
      const eventData = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          startDate: doc.data().startDate?.toDate ? doc.data().startDate.toDate() : new Date(doc.data().startDate),
          endDate: doc.data().endDate?.toDate ? doc.data().endDate.toDate() : new Date(doc.data().endDate),
      })) as CalendarEvent[];
      set({ events: eventData, loading: false });
    });
  },

  subscribeTeam: () => {
    // 1. External HR Data (Read-Only)
    const caresQuery = collection(caresDb, "teamMembers");
    // 2. Local Overrides (Write Access)
    const overridesQuery = collection(db, "profileOverrides");

    let rawCaresData: any[] = [];
    let allOverrides: Record<string, any> = {};

    const performMerge = () => {
      const roleMap: Record<string, Status> = {
        "team_leader": "Team Leader",
        "director": "Director",
        "asst_director": "Assistant Director",
        "team_member": "Team Member",
        "trainee": "Training",
        "onboarding": "Onboarding"
      };

      const mergedTeam = rawCaresData.map(data => {
        const friendlyStatus = roleMap[data.role] || "Team Member";
        const override = allOverrides[data.id] || {};
        
        // --- FIX: DYNAMIC COLOR LOGIC ---
        // Determine color based on department (FOH = Navy, BOH = Red)
        const dept = (data.department || "FOH") as Department;
        const avatarColor = dept === "FOH" ? "004F71" : "E51636"; 
        
        return {
          id: data.id,
          name: data.name || "Unknown",
          role: friendlyStatus,
          status: friendlyStatus,
          dept: dept,
          email: data.email || "",
          phone: data.phone || "",
          joined: "Recently",
          
          // --- MERGE LOGIC ---
          badges: override.badges || [], 
          // FIX: Use 'avatarColor' variable instead of hardcoded 'E51636'
          image: override.image || data.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'User')}&background=${avatarColor}&color=fff`,
          
          // Ensure pairing data is retrieved from overrides
          pairing: override.pairing || null,

          progress: override.progress !== undefined ? override.progress : (data.progress || 0),
          completedTaskIds: override.completedTaskIds || data.completedTaskIds || [],

          level: data.level || 1,
          stats: data.stats || { speed: 50, accuracy: 50, hospitality: 50, knowledge: 50, leadership: 50 }
        };
      }) as TeamMember[];

      set({ team: mergedTeam });
    };

    const unsubCares = onSnapshot(caresQuery, (snapshot) => {
      rawCaresData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      performMerge();
    });

    const unsubOverrides = onSnapshot(overridesQuery, (snapshot) => {
      const newOverrides: Record<string, any> = {};
      snapshot.docs.forEach(doc => {
        newOverrides[doc.id] = doc.data();
      });
      allOverrides = newOverrides;
      performMerge();
    });

    return () => { unsubCares(); unsubOverrides(); };
  },

  subscribeCurriculum: () => {
    const q = query(collection(db, "curriculum"), orderBy("order", "asc"));
    return onSnapshot(q, (snapshot) => {
      set({ curriculum: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) });
    });
  }
}));