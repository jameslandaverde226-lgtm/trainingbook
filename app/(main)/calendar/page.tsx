"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { format, addDays, differenceInCalendarDays } from "date-fns";
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";
import { 
  Plus, Search, Loader2, Calendar as CalendarIcon, 
  RotateCcw, ChevronDown, Layers, ShieldCheck, UserCheck, 
  Sticker, Check, Flag, Zap, X, Coffee, Flame, Server,
  Filter, SlidersHorizontal, LayoutGrid, ListEnd, MessageSquare,
  ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen,
  Target, Shield, Activity, Info
} from "lucide-react";
import { cn } from "@/lib/utils";

// Firebase & Store
import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { useAppStore } from "@/lib/store/useStore";
import toast from "react-hot-toast";

// Types & Components
import { 
  CalendarEvent, EventType, EVENT_TYPES, PRIORITIES, Priority, 
  getEventLabel, DraftEvent, Department, Status, STAGES, STICKERS, StickerType
} from "./_components/types";
import CalendarGrid from "./_components/CalendarGrid";
import TimelineBoard from "./_components/TimelineBoard";
import OneOnOneView from "./_components/OneOnOneView";
import AdvancedCreateModal from "./_components/AdvancedCreateModal";
import EventDetailSheet from "./_components/EventDetailSheet";
import ClientPortal from "@/components/core/ClientPortal";
import { useTaskMap } from "@/lib/hooks/useTaskMap"; 

// --- NEW SMOOTH ACCORDION COMPONENT ---
function TacticalSidebarAccordion({ 
    id, 
    title, 
    icon: Icon, 
    isOpen, 
    onToggle, 
    children, 
    activeCount, 
    totalCount 
}: any) {
    const isFiltered = activeCount < totalCount;

    return (
        <motion.div layout className="relative overflow-hidden">
            <motion.button 
                layout="position"
                onClick={() => onToggle(isOpen ? null : id)}
                className={cn(
                    "w-full py-4 px-6 flex items-center justify-between group outline-none transition-all duration-300 rounded-2xl mx-2 my-1",
                    isOpen ? "bg-white shadow-lg shadow-slate-200/50" : "hover:bg-slate-100/50"
                )}
                style={{ width: "calc(100% - 16px)" }}
            >
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-xl transition-all duration-500 shadow-sm relative z-10",
                        isOpen ? "bg-[#004F71] text-white" : "bg-white border border-slate-100 text-slate-400 group-hover:text-slate-600 group-hover:scale-110"
                    )}>
                        <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col items-start leading-none gap-0.5">
                        <span className={cn(
                            "text-[9px] font-black uppercase tracking-[0.2em] transition-colors",
                            isOpen ? "text-[#004F71]" : "text-slate-400 group-hover:text-slate-600"
                        )}>{title}</span>
                        {isFiltered && !isOpen && (
                            <span className="text-[8px] font-bold text-[#E51636] uppercase tracking-wider">Filtered</span>
                        )}
                    </div>
                </div>
                <div className={cn("transition-transform duration-500", isOpen && "rotate-180")}>
                    <ChevronDown className={cn("w-3.5 h-3.5", isOpen ? "text-[#004F71]" : "text-slate-300")} />
                </div>
            </motion.button>
            
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 pt-1 space-y-2">
                            <div className="p-3 bg-slate-50/50 rounded-3xl border border-slate-100/60 shadow-inner">
                                {children}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function SystemClock() {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    return <span className="tabular-nums font-black text-[#004F71]">{format(time, "h:mm a")}</span>;
}

// --- UNIFIED DYNAMIC LEGEND ISLAND ---
function DynamicLegendIsland() {
    const [isMobileExpanded, setIsMobileExpanded] = useState(false);

    // Desktop View (Wide Pill)
    const DesktopLegend = () => (
        <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="hidden lg:flex fixed bottom-8 left-1/2 -translate-x-1/2 z-50 items-center gap-6 bg-white/95 backdrop-blur-2xl border border-slate-200/60 px-8 py-3 rounded-full shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] ring-1 ring-black/5 hover:scale-[1.02] transition-transform duration-300"
        >
            <div className="flex items-center gap-6">
                {[
                    { label: "Training", color: "bg-[#004F71]" },
                    { label: "Goal", color: "bg-emerald-500" },
                    { label: "Deadline", color: "bg-[#E51636]" },
                    { label: "Operation", color: "bg-slate-500" },
                    { label: "1-on-1", color: "bg-purple-500" },
                ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 group cursor-default">
                        <div className={cn("w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)]", item.color)} />
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-900 transition-colors">{item.label}</span>
                    </div>
                ))}
            </div>

            <div className="w-px h-5 bg-slate-200" />

            <div className="flex items-center gap-4">
                {[
                    { label: "High", color: "text-[#E51636]" },
                    { label: "Med", color: "text-amber-500" },
                    { label: "Low", color: "text-blue-400" },
                ].map((p, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-slate-400 group cursor-default">
                        <Flag className={cn("w-3 h-3 fill-current", p.color)} />
                        <span className="text-[8px] font-bold uppercase tracking-wider group-hover:text-slate-600 transition-colors">{p.label}</span>
                    </div>
                ))}
            </div>
        </motion.div>
    );

    // Mobile View (Collapsed Fab)
    const MobileLegend = () => (
        <>
            <motion.button 
                onClick={() => setIsMobileExpanded(!isMobileExpanded)}
                className="lg:hidden fixed bottom-28 left-6 z-50 w-12 h-12 bg-white text-slate-500 rounded-full shadow-[0_10px_30px_-10px_rgba(0,0,0,0.15)] flex items-center justify-center border border-slate-200 active:scale-95 transition-transform"
            >
                {isMobileExpanded ? <X className="w-5 h-5" /> : <Info className="w-5 h-5" />}
            </motion.button>

            <AnimatePresence>
                {isMobileExpanded && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="lg:hidden fixed bottom-44 left-6 z-50 bg-white/95 backdrop-blur-xl border border-slate-200 p-5 rounded-[24px] shadow-2xl flex flex-col gap-4 min-w-[200px]"
                    >
                        <div className="space-y-3">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] block">Classifications</span>
                            {[
                                { label: "Training", color: "bg-[#004F71]" },
                                { label: "Goal", color: "bg-emerald-500" },
                                { label: "Deadline", color: "bg-[#E51636]" },
                                { label: "Operation", color: "bg-slate-500" },
                                { label: "1-on-1", color: "bg-purple-500" },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className={cn("w-2 h-2 rounded-full", item.color)} />
                                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">{item.label}</span>
                                </div>
                            ))}
                        </div>
                        <div className="h-px w-full bg-slate-100" />
                        <div className="space-y-3">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] block">Priorities</span>
                            {[
                                { label: "High Priority", color: "text-[#E51636]" },
                                { label: "Medium Priority", color: "text-amber-500" },
                                { label: "Low Priority", color: "text-blue-400" },
                            ].map((p, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <Flag className={cn("w-3 h-3 fill-current", p.color)} />
                                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">{p.label}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );

    return (
        <>
            <DesktopLegend />
            <MobileLegend />
        </>
    );
}

// --- MAIN PAGE ---
export default function CalendarPage() {
  const { events, team, subscribeEvents, subscribeTeam, loading } = useAppStore();
  
  // -- View & Data States --
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "timeline" | "oneonone">("calendar");
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  
  // -- DYNAMIC TITLE MAP --
  const taskMap = useTaskMap(); // Initialize hook

  // -- DESKTOP SIDEBAR STATE --
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // -- MOBILE SPECIFIC STATES --
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // -- STAMPING STATE --
  const [activeSticker, setActiveSticker] = useState<StickerType | null>(null);
  const [openSection, setOpenSection] = useState<string | null>('stickers'); 
  
  // -- FILTER STATES --
  const [activeTypes, setActiveTypes] = useState<EventType[]>(EVENT_TYPES);
  const [activePriorities, setActivePriorities] = useState<Priority[]>(PRIORITIES);
  // FIX: Added Unassigned to default so new members show up
  const [activeDepts, setActiveDepts] = useState<Department[]>(["FOH", "BOH", "Unassigned"]);
  const [activeRoles, setActiveRoles] = useState<Status[]>(STAGES.map(s => s.id));
  const [showSystemLogs, setShowSystemLogs] = useState(false); 

  useEffect(() => {
    const unsubEvents = subscribeEvents();
    const unsubTeam = subscribeTeam();
    return () => { unsubEvents(); unsubTeam(); };
  }, [subscribeEvents, subscribeTeam]);

  // -- FILTER & TRANSFORM EVENTS --
  const displayEvents = useMemo(() => {
    return events.filter(e => {
        const isSystemLog = e.assignee === "System";
        if (isSystemLog && !showSystemLogs) return false;
        
        const typeMatch = activeTypes.includes(e.type);
        const priorityMatch = activePriorities.includes(e.priority);
        
        // Find user to check their department
        const user = team.find(m => m.id === e.teamMemberId || m.id === e.assignee);
        const deptMatch = user ? activeDepts.includes(user.dept) : true;
        const roleMatch = user ? activeRoles.includes(user.status) : true;
        
        return typeMatch && priorityMatch && deptMatch && roleMatch;
    }).map(e => {
        // DYNAMIC TITLE OVERRIDE
        if (e.metadata?.taskId && taskMap[e.metadata.taskId]) {
            return { ...e, title: `Module Verified: ${taskMap[e.metadata.taskId]}` };
        }
        return e;
    });
  }, [events, team, activeTypes, activePriorities, activeDepts, activeRoles, showSystemLogs, taskMap]);

  const handleDragEnd = useCallback(async (id: string, offsetDays: number) => {
    const event = events.find(ev => ev.id === id);
    if (!event) return;
    const newStart = addDays(event.startDate, offsetDays);
    const newEnd = addDays(newStart, differenceInCalendarDays(event.endDate, event.startDate));
    try { await updateDoc(doc(db, "events", id), { startDate: newStart, endDate: newEnd, updatedAt: serverTimestamp() }); } catch (e) { toast.error("Sync Error"); }
  }, [events]);

  const handleEventStamp = async (eventId: string) => {
      if (!activeSticker) return;
      const loadToast = toast.loading("Applying Marker...");
      try {
          await updateDoc(doc(db, "events", eventId), {
              stickers: arrayUnion(activeSticker)
          });
          toast.success("Marker Applied", { id: loadToast });
      } catch (err) {
          toast.error("Failed to Apply", { id: loadToast });
      }
  };

  const toggle = (list: any[], item: any, setter: any) => setter(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  
  const resetFilters = () => {
    setActiveTypes(EVENT_TYPES);
    setActivePriorities(PRIORITIES);
    setActiveDepts(["FOH", "BOH", "Unassigned"]);
    setActiveRoles(STAGES.map(s => s.id));
    setShowSystemLogs(false); 
  };

  // --- COMPONENT: Sidebar Content ---
  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 bg-white/50 backdrop-blur-sm sticky top-0 z-20">
            <div className="flex items-center justify-between mb-2">
                <h1 className="text-lg font-[1000] text-slate-900 tracking-tight uppercase">Ops Center</h1>
                <div className="flex gap-2">
                    <button onClick={resetFilters} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-[#E51636] transition-all border border-transparent hover:border-slate-100" title="Reset Filters">
                        <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    {/* Hide on mobile, show on desktop */}
                    <button onClick={() => setIsSidebarOpen(false)} className="hidden lg:flex p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-[#004F71] transition-all border border-transparent hover:border-slate-100">
                        <PanelLeftClose className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <div className="bg-white border border-slate-200 px-2 py-0.5 rounded-md text-[9px] shadow-sm"><SystemClock /></div>
                <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Live Command</span>
            </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            <LayoutGroup>
                {/* 0. SYSTEM LOGS (Simple Toggle) */}
                <motion.button 
                    layout="position"
                    onClick={() => setShowSystemLogs(!showSystemLogs)} 
                    className={cn(
                        "w-full flex items-center justify-between py-4 px-6 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all border mx-2 my-1",
                        showSystemLogs 
                            ? "bg-white border-[#E51636]/20 text-[#E51636] shadow-lg shadow-red-500/10" 
                            : "bg-transparent border-transparent text-slate-400 hover:bg-slate-100/50 hover:text-slate-600"
                    )}
                    style={{ width: "calc(100% - 16px)" }}
                >
                    <div className="flex items-center gap-3">
                        <Server className={cn("w-3.5 h-3.5", showSystemLogs && "text-[#E51636]")} />
                        <span>System Logs</span>
                    </div>
                    <div className={cn("w-1.5 h-1.5 rounded-full transition-all duration-500", showSystemLogs ? "bg-[#E51636] shadow-[0_0_8px_#E51636] scale-125" : "bg-slate-200")} />
                </motion.button>

                {/* 1. TACTICAL MARKERS */}
                <TacticalSidebarAccordion id="stickers" title="Tactical Markers" icon={Sticker} isOpen={openSection === 'stickers'} onToggle={setOpenSection} activeCount={0} totalCount={0}>
                    <div className="grid grid-cols-4 gap-2">
                        {STICKERS.map(s => {
                            const isActive = activeSticker === s.id;
                            return (
                                <button key={s.id} onClick={() => setActiveSticker(isActive ? null : s.id)} className={cn("aspect-square rounded-2xl flex items-center justify-center text-lg shadow-sm border transition-all active:scale-95", s.color, isActive ? "ring-4 ring-offset-2 ring-[#004F71] scale-110 z-10" : "grayscale opacity-60 hover:grayscale-0 hover:opacity-100 bg-white hover:scale-105")}>
                                    {s.icon}
                                </button>
                            )
                        })}
                    </div>
                    {activeSticker && (
                        <div className="mt-3 text-center">
                            <button onClick={() => setActiveSticker(null)} className="text-[8px] font-black text-[#E51636] uppercase tracking-widest hover:underline">Clear Selection</button>
                        </div>
                    )}
                </TacticalSidebarAccordion>

                {/* 2. CLASSIFICATION */}
                <TacticalSidebarAccordion id="classification" title="Classification" icon={Layers} isOpen={openSection === 'classification'} onToggle={setOpenSection} activeCount={activeTypes.length} totalCount={EVENT_TYPES.length}>
                    <div className="space-y-1.5">
                        {EVENT_TYPES.map(type => {
                            const isSelected = activeTypes.includes(type);
                            return (
                                <button key={type} onClick={() => toggle(activeTypes, type, setActiveTypes)} className={cn("w-full flex items-center justify-between py-2.5 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border", isSelected ? `bg-white border-slate-200 text-slate-900 shadow-sm` : "bg-transparent border-transparent text-slate-400 hover:bg-slate-100")}>
                                    <div className="flex items-center gap-2"><div className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-[#004F71]" : "bg-slate-300")} /><span>{getEventLabel(type)}</span></div>
                                    {isSelected && <Check className="w-3 h-3 text-[#004F71]" />}
                                </button>
                            )
                        })}
                    </div>
                </TacticalSidebarAccordion>

                {/* 3. DEPLOYMENT ZONE */}
                <TacticalSidebarAccordion id="deployment" title="Deployment Zone" icon={ShieldCheck} isOpen={openSection === 'deployment'} onToggle={setOpenSection} activeCount={activeDepts.length} totalCount={3}>
                    <div className="grid grid-cols-2 gap-2">
                        {[{ id: "FOH", label: "Front House", icon: Coffee, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" }, { id: "BOH", label: "Back House", icon: Flame, color: "text-red-600", bg: "bg-red-50", border: "border-red-100" }].map(dept => {
                            const isSelected = activeDepts.includes(dept.id as Department);
                            return (
                                <button key={dept.id} onClick={() => toggle(activeDepts, dept.id as Department, setActiveDepts)} className={cn("flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all h-24 justify-center relative overflow-hidden", isSelected ? "bg-white border-slate-200 shadow-md" : "bg-slate-50 border-transparent opacity-60 hover:opacity-100")}>
                                    {isSelected && <div className={cn("absolute inset-0 opacity-10", dept.bg)} />}
                                    <div className={cn("p-2 rounded-xl shadow-sm bg-white", dept.color)}><dept.icon className="w-4 h-4" /></div>
                                    <span className={cn("text-[8px] font-black uppercase tracking-widest", isSelected ? "text-slate-900" : "text-slate-400")}>{dept.id}</span>
                                    {isSelected && <div className={cn("absolute top-2 right-2 w-1.5 h-1.5 rounded-full", dept.bg.replace('bg-', 'bg-').replace('50', '500'))} />}
                                </button>
                            )
                        })}
                        {/* Unassigned Toggle */}
                         <button onClick={() => toggle(activeDepts, "Unassigned", setActiveDepts)} className={cn("col-span-2 flex items-center justify-between p-3 rounded-2xl border transition-all h-12 relative overflow-hidden", activeDepts.includes("Unassigned") ? "bg-white border-slate-200 shadow-md" : "bg-slate-50 border-transparent opacity-60 hover:opacity-100")}>
                             <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 pl-2">Include Unassigned</span>
                             {activeDepts.includes("Unassigned") && <Check className="w-4 h-4 text-emerald-500" />}
                         </button>
                    </div>
                </TacticalSidebarAccordion>

                {/* 4. IMPACT PRIORITY */}
                <TacticalSidebarAccordion id="priority" title="Impact Priority" icon={Zap} isOpen={openSection === 'priority'} onToggle={setOpenSection} activeCount={activePriorities.length} totalCount={PRIORITIES.length}>
                    <div className="space-y-1.5">
                        {PRIORITIES.map(p => {
                            const isSelected = activePriorities.includes(p);
                            return (
                                <button key={p} onClick={() => toggle(activePriorities, p, setActivePriorities)} className={cn("w-full flex items-center justify-between py-2.5 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border", isSelected ? `bg-white border-slate-200 text-slate-900 shadow-sm` : "bg-transparent border-transparent text-slate-400 hover:bg-slate-100")}>
                                    <div className="flex items-center gap-2">
                                        <div className={cn("w-1.5 h-1.5 rounded-full", isSelected ? (p === 'High' ? "bg-[#E51636]" : p === 'Medium' ? "bg-amber-500" : "bg-blue-500") : "bg-slate-300")} />
                                        <span>{p} Priority</span>
                                    </div>
                                    {isSelected && <Check className="w-3 h-3 text-[#004F71]" />}
                                </button>
                            )
                        })}
                    </div>
                </TacticalSidebarAccordion>
            </LayoutGroup>
        </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-6rem)] md:h-[calc(100vh-5rem)] rounded-[32px] md:rounded-[48px] overflow-hidden bg-white shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)] border border-slate-200/60 ring-4 md:ring-8 ring-slate-100/50 relative mt-2 md:mt-0">
      
      {/* --- DESKTOP COLLAPSIBLE SIDEBAR --- */}
      <motion.div 
        animate={{ width: isSidebarOpen ? 300 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="hidden lg:flex bg-[#F8FAFC] border-r border-slate-200/60 flex-col shrink-0 relative z-20 overflow-hidden"
      >
         <div className="w-[300px] h-full flex flex-col">
            <SidebarContent />
         </div>
      </motion.div>

      {/* --- MAIN INTERFACE AREA --- */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-white">
        
        {/* --- DESKTOP HEADER (Modified) --- */}
        <div className="hidden lg:flex h-20 bg-white border-b border-slate-100 items-center justify-between px-8 shrink-0 z-30 relative shadow-sm">
            <div className="flex items-center gap-6 group cursor-default">
              
              {!isSidebarOpen && (
                  <motion.button 
                    initial={{ opacity: 0, scale: 0.5 }} 
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-400 hover:text-[#004F71] hover:bg-white hover:shadow-md transition-all"
                  >
                      <PanelLeftOpen className="w-5 h-5" />
                  </motion.button>
              )}

              <div className="p-3 bg-white rounded-[24px] border-2 border-slate-50 shadow-lg group-hover:border-[#E51636] transition-all duration-500">
                  <CalendarIcon className="w-6 h-6 text-[#E51636]" />
              </div>
              <div className="flex flex-col leading-none">
                  <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em] mb-1 pl-0.5 text-left">Identity Command</span>
                  <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-[1000] text-slate-900 tracking-tighter uppercase">{format(currentDate, "MMMM")}</span>
                      <span className="text-4xl font-light text-slate-200 tracking-tighter">{format(currentDate, "yyyy")}</span>
                  </div>
              </div>
           </div>

           {/* CENTERED VIEW SWITCHER */}
           <div className="absolute left-1/2 -translate-x-1/2 flex bg-slate-50 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
                <button onClick={() => setViewMode("calendar")} className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2", viewMode === "calendar" ? "bg-[#E51636] text-white shadow-lg shadow-red-500/20" : "text-slate-400 hover:text-slate-600 hover:bg-white")}>
                    <LayoutGrid className="w-3.5 h-3.5" /> Grid View
                </button>
                <div className="w-px bg-slate-200 my-2 mx-1" />
                <button onClick={() => setViewMode("timeline")} className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2", viewMode === "timeline" ? "bg-[#E51636] text-white shadow-lg shadow-red-500/20" : "text-slate-400 hover:text-slate-600 hover:bg-white")}>
                    <ListEnd className="w-3.5 h-3.5" /> Timeline
                </button>
                <div className="w-px bg-slate-200 my-2 mx-1" />
                <button onClick={() => setViewMode("oneonone")} className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2", viewMode === "oneonone" ? "bg-[#E51636] text-white shadow-lg shadow-red-500/20" : "text-slate-400 hover:text-slate-600 hover:bg-white")}>
                    <MessageSquare className="w-3.5 h-3.5" /> 1-on-1s
                </button>
            </div>

           <div className="flex items-center gap-4">
                <button onClick={() => setIsCreatorOpen(true)} className="flex items-center gap-2 bg-[#E51636] text-white px-8 py-3.5 rounded-[20px] text-[10px] font-black uppercase shadow-[0_15px_30px_-10px_rgba(229,22,54,0.4)] hover:bg-[#c4122d] active:scale-95 group transition-all tracking-widest border-b-4 border-red-800">
                    <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" /> <span>Deploy Mission</span>
                </button>
           </div>
        </div>

        {/* --- MOBILE HEADER CONTROLS --- */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-100 bg-white z-30 sticky top-0">
            <div className="flex items-center gap-3">
                <button onClick={() => setIsFilterSheetOpen(true)} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:text-[#004F71] active:scale-95 transition-all">
                    <SlidersHorizontal className="w-5 h-5" />
                </button>
                <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">View</span>
                    <span className="text-sm font-bold text-slate-900">{format(currentDate, "MMMM yyyy")}</span>
                </div>
            </div>
            
            <div className="flex bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setViewMode("calendar")} className={cn("p-2 rounded-lg transition-all", viewMode === "calendar" ? "bg-white shadow-sm text-[#E51636]" : "text-slate-400")}><LayoutGrid className="w-4 h-4" /></button>
                <button onClick={() => setViewMode("timeline")} className={cn("p-2 rounded-lg transition-all", viewMode === "timeline" ? "bg-white shadow-sm text-[#E51636]" : "text-slate-400")}><ListEnd className="w-4 h-4" /></button>
                <button onClick={() => setViewMode("oneonone")} className={cn("p-2 rounded-lg transition-all", viewMode === "oneonone" ? "bg-white shadow-sm text-[#E51636]" : "text-slate-400")}><MessageSquare className="w-4 h-4" /></button>
            </div>
        </div>

        <div className="flex-1 relative overflow-hidden bg-white">
            {loading && <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-50 flex items-center justify-center"><Loader2 className="animate-spin text-[#E51636] w-12 h-12" /></div>}
            
            <AnimatePresence mode="wait">
                <motion.div key={viewMode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full">
                    {viewMode === "calendar" ? (
                        <div className="h-full overflow-y-auto no-scrollbar">
                            <CalendarGrid 
                                currentDate={currentDate} 
                                events={displayEvents} // Pass dynamic events
                                onDragEnd={handleDragEnd} 
                                onSelectEvent={setSelectedEvent} 
                                isStamping={!!activeSticker} 
                                onStamp={handleEventStamp}
                            />
                        </div>
                    ) : viewMode === "timeline" ? (
                        <div className="h-full">
                            <TimelineBoard 
                                currentDate={currentDate} 
                                events={displayEvents} // Pass dynamic events
                                onDragEnd={handleDragEnd} 
                                onSelectEvent={setSelectedEvent} 
                                isStamping={!!activeSticker} 
                                onStamp={handleEventStamp}
                            />
                        </div>
                    ) : (
                        <OneOnOneView events={events} onSelectEvent={setSelectedEvent} selectedUserId={null} />
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
      </div>

      {/* --- MOBILE FAB --- */}
      <button 
        onClick={() => setIsCreatorOpen(true)}
        className="lg:hidden fixed bottom-28 right-6 w-14 h-14 bg-[#E51636] text-white rounded-full shadow-[0_10px_30px_-10px_rgba(229,22,54,0.5)] flex items-center justify-center z-50 active:scale-90 transition-transform border-4 border-white"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* --- FILTER SHEET (Mobile Only) --- */}
      <AnimatePresence>
        {isFilterSheetOpen && (
            <ClientPortal>
                <div className="fixed inset-0 z-[200] lg:hidden">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsFilterSheetOpen(false)} />
                    <motion.div 
                        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="absolute bottom-0 left-0 right-0 h-[85vh] bg-[#F8FAFC] rounded-t-[32px] overflow-hidden flex flex-col"
                    >
                        <div className="flex justify-center pt-3 pb-1"><div className="w-12 h-1.5 bg-slate-300 rounded-full" /></div>
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200">
                            <h2 className="text-lg font-black text-slate-900">Tactical Filters</h2>
                            <button onClick={() => setIsFilterSheetOpen(false)} className="p-2 bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-500" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar">
                            <SidebarContent />
                        </div>
                        <div className="p-6 bg-white border-t border-slate-200 safe-area-pb">
                            <button onClick={() => setIsFilterSheetOpen(false)} className="w-full py-4 bg-[#004F71] text-white rounded-2xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-transform">Apply Filters</button>
                        </div>
                    </motion.div>
                </div>
            </ClientPortal>
        )}
      </AnimatePresence>

      {/* --- UNIFIED DYNAMIC LEGEND ISLAND --- */}
      <DynamicLegendIsland />

      {/* --- FLOATING STICKER TOOL --- */}
      <AnimatePresence>
          {activeSticker && (
              <motion.div 
                  initial={{ y: 100, opacity: 0, x: "-50%" }} 
                  animate={{ y: 0, opacity: 1, x: "-50%" }} 
                  exit={{ y: 100, opacity: 0, x: "-50%" }}
                  className="fixed bottom-12 left-1/2 z-[100] flex items-center gap-6 bg-[#0F172A] text-white px-8 py-4 rounded-[32px] shadow-2xl border border-white/10 backdrop-blur-2xl w-[90%] md:w-auto justify-between md:justify-start"
              >
                  <div className="flex items-center gap-4">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg border-2 border-white/20", STICKERS.find(s => s.id === activeSticker)?.color)}>
                          {STICKERS.find(s => s.id === activeSticker)?.icon}
                      </div>
                      <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Stamping Active</span>
                          <span className="text-sm font-bold text-white">Click any mission to apply</span>
                      </div>
                  </div>
                  <div className="h-8 w-px bg-white/10 hidden md:block" />
                  <button onClick={() => setActiveSticker(null)} className="p-3 bg-white/10 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-full transition-all active:scale-90"><X className="w-5 h-5" /></button>
              </motion.div>
          )}
      </AnimatePresence>

      <AnimatePresence>{isCreatorOpen && <AdvancedCreateModal isOpen={isCreatorOpen} onClose={() => setIsCreatorOpen(false)} />}</AnimatePresence>
      <AnimatePresence>
          {selectedEvent && (
              <EventDetailSheet 
                  event={selectedEvent} 
                  onClose={() => setSelectedEvent(null)} 
                  onDelete={async (id) => { const loadToast = toast.loading("Decommissioning..."); try { await deleteDoc(doc(db, "events", id)); toast.success("Terminated", { id: loadToast }); setSelectedEvent(null); } catch (e) { toast.error("Error", { id: loadToast }); } }} 
                  onUpdate={async (id, updates) => { const loadToast = toast.loading("Updating..."); try { await updateDoc(doc(db, "events", id), { ...updates, updatedAt: serverTimestamp() }); toast.success("Synced", { id: loadToast }); setSelectedEvent(null); } catch (e) { toast.error("Error", { id: loadToast }); } }} 
                  isSystemEvent={selectedEvent.assigneeName === "System"}
              />
          )}
      </AnimatePresence>
    </div>
  );
}