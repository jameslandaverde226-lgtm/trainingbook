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
export type Status = "Onboarding" | "Training" | "Team Member" | "Team Leader" | "Assistant Director" | "Director";

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
  
  // --- ADDED THIS FIELD ---
  completedTaskIds?: string[];
  // -----------------------

  badges: string[];
  tags: { label: string; color: string }[];
  stats: {
    speed: number;
    accuracy: number;
    hospitality: number;
    knowledge: number;
    leadership: number;
  };
  performance: number[]; 
  goals?: Goal[];
  pairing?: { name: string; image: string; role: string }; 
  promotionDates?: Record<string, string>; 
  curriculum?: {
    currentModule: string;
    moduleProgress: number;
    tasks: { id: string; label: string; completed: boolean }[];
  };
}

// --- 3. CALENDAR EVENT TYPES ---

export interface CalendarEvent {
  id: string;
  title: string;
  // Primary Assigned Leader
  assignee: string; 
  assigneeName: string;
  // Assigned Team Member (Optional)
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
  
  // UPDATED: Now supports multiple dependencies
  linkedEventIds?: string[]; 
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
];

// --- 5. UI HELPERS ---

export const getEventLabel = (type: EventType) => {
  switch (type) {
    case "OneOnOne": return "1-on-1";
    default: return type;
  }
};

export const getTypeColor = (type: EventType, isGhost: boolean = false) => {
  if (isGhost) {
      return "bg-white/80 border-2 border-dashed border-[#004F71] text-[#004F71] shadow-xl z-50 backdrop-blur-sm mix-blend-multiply";
  }
  switch (type) {
    case "Training": return "bg-blue-50 text-[#004F71] border-[#004F71] shadow-sm hover:shadow-md";
    case "Goal": return "bg-emerald-50 text-emerald-800 border-emerald-600 shadow-sm hover:shadow-md";
    case "Deadline": return "bg-red-50 text-[#E51636] border-[#E51636] shadow-sm hover:shadow-md";
    case "Operation": return "bg-slate-100 text-slate-700 border-slate-500 shadow-sm hover:shadow-md";
    case "OneOnOne": return "bg-purple-50 text-purple-700 border-purple-500 shadow-sm hover:shadow-md";
    default: return "bg-white border-slate-200";
  }
};

// --- 6. GRID MATH & LAYOUT LOGIC ---

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