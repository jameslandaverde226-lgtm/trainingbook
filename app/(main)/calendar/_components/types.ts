import { 
  startOfDay, 
  addDays, 
  differenceInCalendarDays, 
  max, 
  min,
  isValid
} from "date-fns";
import { 
  Layers, 
  GraduationCap, 
  Utensils, 
  Star, 
  Briefcase, 
  Crown 
} from "lucide-react";

// --- 1. SHARED BASE TYPES ---

export type EventType = "Training" | "Goal" | "Deadline" | "Operation" | "OneOnOne";
export type Priority = "Low" | "Medium" | "High";
export type StickerType = "star" | "alert" | "fire" | "party" | "check";
export type Department = "FOH" | "BOH";

// UPDATED STATUS TYPE
export type Status = 
  | "Admin"              // Level 4 (System Owner)
  | "Director"           // Level 3 (Store Manager)
  | "Assistant Director" // Level 2
  | "Team Leader"        // Level 1
  | "Team Member"        // Level 0
  | "Training" 
  | "Onboarding";

// --- 2. TEAM & PERFORMANCE TYPES ---

export interface Goal {
    id: string;
    label: string;
    progress: number;
    status: "In Progress" | "Completed" | "At Risk";
    dueDate: string;
    priority: Priority;
}

export interface Subtask {
  id: string;
  label: string;
  isCompleted: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  dept: Department;
  status: Status;
  email: string;
  phone: string;
  joined: string;
  image: string;
  level: number;
  progress: number; 
  completedTaskIds?: string[];
  badges?: any[]; 
  tags?: { label: string; color: string }[];
  stats?: {
    speed: number;
    accuracy: number;
    hospitality: number;
    knowledge: number;
    leadership: number;
  };
  performance?: number[]; 
  goals?: Goal[];
  pairing?: { id: string; name: string; image?: string; role: string }; 
  promotionDates?: Record<string, string>; 
  curriculum?: {
    currentModule: string;
    moduleProgress: number;
    tasks: { id: string; label: string; completed: boolean }[];
  };
  hasLogin?: boolean; // Flag to check if user has dashboard access
}

// --- 3. CALENDAR EVENT TYPES ---

export interface CalendarEvent {
  id: string;
  title: string;
  assignee: string; 
  assigneeName: string;
  teamMemberId?: string;
  teamMemberName?: string;
  
  startDate: Date;
  endDate: Date;
  type: EventType;
  status: "To Do" | "In Progress" | "Done";
  priority: Priority;
  description?: string;
  isGhost?: boolean;
  stickers?: StickerType[];
  subtasks?: Subtask[]; 
  
  linkedEventIds?: string[]; 
  createdAt?: any;
  updatedAt?: any;
}

export type DraftEvent = Omit<CalendarEvent, "id" | "status">;

export interface LayoutItem {
    event: CalendarEvent;
    col: number;
    span: number;
    slot: number;
    continuesBefore: boolean;
    continuesAfter: boolean;
}

// --- 4. DOMAIN CONSTANTS ---

export const EVENT_TYPES: EventType[] = ["Training", "Goal", "Deadline", "Operation", "OneOnOne"];
export const PRIORITIES: Priority[] = ["High", "Medium", "Low"];

export const STICKERS: { id: StickerType; icon: string; label: string; color: string }[] = [
  { id: "star", icon: "⭐️", label: "Focus", color: "bg-amber-100 border-amber-200" },
  { id: "alert", icon: "❗️", label: "Urgent", color: "bg-red-100 border-red-200" },
  { id: "fire", icon: "🔥", label: "Hot", color: "bg-orange-100 border-orange-200" },
  { id: "party", icon: "🎉", label: "Event", color: "bg-purple-100 border-purple-200" },
  { id: "check", icon: "✅", label: "Verify", color: "bg-emerald-100 border-emerald-200" },
];

export const STAGES: { id: Status; title: string; icon: any }[] = [
    { id: "Onboarding", title: "Onboarding", icon: Layers },
    { id: "Training", title: "Training", icon: GraduationCap },
    { id: "Team Member", title: "Team Member", icon: Utensils },
    { id: "Team Leader", title: "Team Leader", icon: Star },
    { id: "Assistant Director", title: "Asst. Director", icon: Briefcase },
    { id: "Director", title: "Director", icon: Crown },
    { id: "Admin", title: "Admin", icon: Crown },
];

// --- 5. UI HELPERS ---

export const getEventLabel = (type: EventType) => {
  switch (type) {
    case "Training": return "Training Module";
    case "Goal": return "Strategic Goal";
    case "Deadline": return "Hard Deadline";
    case "Operation": return "Unit Operation";
    case "OneOnOne": return "1-on-1 Session";
    default: return type;
  }
};

export const getTypeColor = (type: EventType, isGhost: boolean = false) => {
  if (isGhost) {
      return "bg-white/80 border-2 border-dashed border-[#004F71] text-[#004F71] shadow-xl z-50 backdrop-blur-sm mix-blend-multiply";
  }
  switch (type) {
    case "Training": return "bg-blue-50 text-blue-700 border-blue-100";
    case "Goal": return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "Deadline": return "bg-red-50 text-red-700 border-red-100";
    case "Operation": return "bg-slate-100 text-slate-700 border-slate-200";
    case "OneOnOne": return "bg-purple-50 text-purple-700 border-purple-100";
    default: return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

// --- 6. AUTHORIZATION & PERMISSIONS ---

export const ROLE_HIERARCHY: Record<string, number> = {
  "Admin": 4,              // Highest Rank
  "Director": 3,           
  "Assistant Director": 2, 
  "Team Leader": 1,        
  "Team Member": 0,        
  "Training": 0,
  "Onboarding": 0
};

// Permission Structure for RBAC
export interface PermissionSet {
    // Operations
    canCreateEvents: boolean;
    canEditEvents: boolean;
    canDeleteEvents: boolean;
    
    // Team Management
    canViewFullRoster: boolean;
    canCreateUsers: boolean;
    canEditUsers: boolean;
    canPromoteUsers: boolean;
    
    // Intelligence & Data
    canViewSensitiveDocs: boolean;
    canViewAnalytics: boolean;
    
    // System
    canAccessSettings: boolean;
}

// Default Permission Matrix (Can be overridden by Firestore)
export const DEFAULT_PERMISSIONS: Record<Status, PermissionSet> = {
    "Admin": {
        canCreateEvents: true, canEditEvents: true, canDeleteEvents: true,
        canViewFullRoster: true, canCreateUsers: true, canEditUsers: true, canPromoteUsers: true,
        canViewSensitiveDocs: true, canViewAnalytics: true, canAccessSettings: true
    },
    "Director": {
        canCreateEvents: true, canEditEvents: true, canDeleteEvents: true,
        canViewFullRoster: true, canCreateUsers: true, canEditUsers: true, canPromoteUsers: true,
        canViewSensitiveDocs: true, canViewAnalytics: true, canAccessSettings: true
    },
    "Assistant Director": {
        canCreateEvents: true, canEditEvents: true, canDeleteEvents: true,
        canViewFullRoster: true, canCreateUsers: true, canEditUsers: true, canPromoteUsers: false,
        canViewSensitiveDocs: true, canViewAnalytics: true, canAccessSettings: false
    },
    "Team Leader": {
        canCreateEvents: true, canEditEvents: false, canDeleteEvents: false,
        canViewFullRoster: true, canCreateUsers: false, canEditUsers: false, canPromoteUsers: false,
        canViewSensitiveDocs: false, canViewAnalytics: false, canAccessSettings: false
    },
    "Team Member": {
        canCreateEvents: false, canEditEvents: false, canDeleteEvents: false,
        canViewFullRoster: true, canCreateUsers: false, canEditUsers: false, canPromoteUsers: false,
        canViewSensitiveDocs: false, canViewAnalytics: false, canAccessSettings: false
    },
    "Training": {
        canCreateEvents: false, canEditEvents: false, canDeleteEvents: false,
        canViewFullRoster: false, canCreateUsers: false, canEditUsers: false, canPromoteUsers: false,
        canViewSensitiveDocs: false, canViewAnalytics: false, canAccessSettings: false
    },
    "Onboarding": {
        canCreateEvents: false, canEditEvents: false, canDeleteEvents: false,
        canViewFullRoster: false, canCreateUsers: false, canEditUsers: false, canPromoteUsers: false,
        canViewSensitiveDocs: false, canViewAnalytics: false, canAccessSettings: false
    }
};

export const canPerformAction = (userRole: string, requiredLevel: number) => {
  const level = ROLE_HIERARCHY[userRole] || 0;
  return level >= requiredLevel;
};

// --- 7. GRID MATH & LAYOUT LOGIC ---

const normalizeDate = (d: Date) => startOfDay(isValid(d) ? d : new Date());

const calculateSpan = (event: CalendarEvent, weekStartDay: Date) => {
    const eStart = normalizeDate(event.startDate);
    const rawEnd = normalizeDate(event.endDate);
    const eEnd = addDays(rawEnd, 1); 

    const wStart = normalizeDate(weekStartDay);
    const wEnd = addDays(wStart, 7); 

    if (eEnd <= wStart || eStart >= wEnd) {
        return { col: 0, span: 0, continuesBefore: false, continuesAfter: false };
    }

    const visualStart = max([eStart, wStart]);
    const visualEnd = min([eEnd, wEnd]);

    const colOffset = differenceInCalendarDays(visualStart, wStart);
    const span = differenceInCalendarDays(visualEnd, visualStart);
    const col = colOffset + 1;

    const continuesBefore = eStart < wStart;
    const continuesAfter = eEnd > wEnd;

    return { col, span, continuesBefore, continuesAfter };
}

export const getLayoutForWeek = (weekStart: Date, events: CalendarEvent[]) => {
  const weekStartDay = normalizeDate(weekStart);
  
  const weekItems = events.map(e => {
      const spanData = calculateSpan(e, weekStartDay);
      return { event: e, ...spanData };
  }).filter(item => item.span > 0);

  weekItems.sort((a,b) => {
      if (a.col !== b.col) return a.col - b.col;
      if (a.span !== b.span) return b.span - a.span;
      return a.event.id.localeCompare(b.event.id);
  });

  const slots: CalendarEvent[][] = []; 
  const placedItems: LayoutItem[] = [];

  weekItems.forEach(item => {
      let slot = 0;
      while(true) {
          if (!slots[slot]) slots[slot] = [];
          
          const collision = slots[slot].some(s => {
              const sProps = calculateSpan(s, weekStartDay);
              const itemStart = item.col;
              const itemEnd = item.col + item.span;
              const slotStart = sProps.col;
              const slotEnd = sProps.col + sProps.span;
              return (itemStart < slotEnd) && (itemEnd > slotStart);
          });

          if (!collision) {
              slots[slot].push(item.event);
              placedItems.push({ 
                  event: item.event, 
                  col: item.col, 
                  span: item.span, 
                  slot, 
                  continuesBefore: item.continuesBefore, 
                  continuesAfter: item.continuesAfter 
              });
              break;
          }
          slot++;
      }
  });

  return { placedItems, totalSlots: slots.length, occupiedSlots: slots };
};