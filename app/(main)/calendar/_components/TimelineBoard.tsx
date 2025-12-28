"use client";

import { useMemo, useState, useEffect } from "react";
import { format, addDays, isToday, isWeekend, eachDayOfInterval, differenceInCalendarDays, startOfWeek } from "date-fns";
import { Link2, X, Activity, Layers, Settings2, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store/useStore";
import { db } from "@/lib/firebase";
import { updateDoc, doc, arrayUnion, arrayRemove } from "firebase/firestore";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion"; 

import { CalendarEvent, EVENT_TYPES, getEventLabel } from "./types";
import TimelineEventCard from "./TimelineEventCard";
import TimelineConnections from "./TimelineConnections";
import { TacticalSidebarRow } from "./TacticalSidebarRow";

interface Props {
  currentDate: Date;
  events: CalendarEvent[];
  isStamping: boolean;
  onDragEnd: (id: string, offsetDays: number) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  onStamp?: (eventId: string) => void;
}

export default function TimelineBoard({ currentDate, events, isStamping, onDragEnd, onSelectEvent, onStamp }: Props) {
  const { team } = useAppStore();
  
  const [isLinkingMode, setIsLinkingMode] = useState(false);
  const [isUnlinkingMode, setIsUnlinkingMode] = useState(false);
  const [linkSourceId, setLinkSourceId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  
  // --- RESPONSIVE DIMENSIONS ---
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const DAY_WIDTH = isMobile ? 46 : 60;
  const ROW_HEIGHT = isMobile ? 56 : 60;
  const GROUP_HEADER_HEIGHT = isMobile ? 40 : 60;
  const GRID_HEADER_HEIGHT = isMobile ? 48 : 56;
  const SIDEBAR_WIDTH = isMobile ? 100 : 280; 
  const CARD_MARGIN = 8;

  // --- 1. CALCULATE DATE RANGE ---
  const timelineDays = useMemo(() => {
    const start = startOfWeek(currentDate); 
    return eachDayOfInterval({ start, end: addDays(start, 45) });
  }, [currentDate]);
  
  const timelineStart = timelineDays[0];
  const timelineEnd = timelineDays[timelineDays.length - 1];
  const totalDays = timelineDays.length;
  const totalBoardWidth = SIDEBAR_WIDTH + (totalDays * DAY_WIDTH);

  const { groupedEvents, eventCoordinates, totalHeight, sourceIds, visibleEvents } = useMemo(() => {
    const groups: Record<string, CalendarEvent[]> = {};
    const coords = new Map<string, { xStart: number; xEnd: number; y: number }>();
    const sources = new Set<string>();
    const visibleSet = new Set<string>();
    
    let currentY = GRID_HEADER_HEIGHT; 

    // First pass: Group and calculate Y positions for VISIBLE events
    EVENT_TYPES.forEach(type => {
        // FILTER 1: Match Type
        let typeEvents = events.filter(e => e.type === type);
        
        // FILTER 2: DATE RANGE CHECK (CRITICAL FIX)
        // Only calculate coordinates for events that are actually rendered within the timeline window
        typeEvents = typeEvents.filter(event => {
            return !(event.endDate < timelineStart || event.startDate > timelineEnd);
        });

        groups[type] = typeEvents;
        
        if (typeEvents.length > 0) {
            currentY += GROUP_HEADER_HEIGHT;
            typeEvents.forEach(event => {
                visibleSet.add(event.id); 
                
                // Calculate coordinates
                const effectiveStart = event.startDate < timelineStart ? timelineStart : event.startDate;
                const effectiveEnd = event.endDate > timelineEnd ? timelineEnd : event.endDate;
                
                if (effectiveStart <= effectiveEnd) {
                    const startDiff = differenceInCalendarDays(effectiveStart, timelineStart);
                    const duration = differenceInCalendarDays(effectiveEnd, effectiveStart) + 1;
                    
                    const xStart = (startDiff * DAY_WIDTH) + SIDEBAR_WIDTH; 
                    const xEnd = xStart + (duration * DAY_WIDTH) - CARD_MARGIN; 
                    const y = currentY + (ROW_HEIGHT / 2);
                    coords.set(event.id, { xStart, xEnd, y });
                }
                currentY += ROW_HEIGHT;
            });
        }
    });

    // Second pass: Identify valid sources for connections
    events.forEach(e => { 
        if (e.linkedEventIds && visibleSet.has(e.id)) {
             e.linkedEventIds.forEach(sourceId => {
                 if (visibleSet.has(sourceId)) {
                     sources.add(sourceId);
                 }
             });
        } 
    });
    
    return { 
        groupedEvents: groups, 
        eventCoordinates: coords, 
        totalHeight: currentY + 200, 
        sourceIds: sources,
        visibleEvents: events 
    };
  }, [events, timelineStart, timelineEnd, DAY_WIDTH, ROW_HEIGHT, GRID_HEADER_HEIGHT, GROUP_HEADER_HEIGHT, SIDEBAR_WIDTH]);

  const handleEventClick = async (event: CalendarEvent) => {
    if (isStamping && onStamp) { onStamp(event.id); return; }
    if (isLinkingMode) { 
        if (!linkSourceId) { setLinkSourceId(event.id); toast(`Source: ${event.title}`, { icon: '🔗' }); } 
        else { if (linkSourceId === event.id) { setLinkSourceId(null); return; } if (event.linkedEventIds?.includes(linkSourceId)) { toast.error("Already linked"); return; } const loadToast = toast.loading("Connecting..."); try { await updateDoc(doc(db, "events", event.id), { linkedEventIds: arrayUnion(linkSourceId) }); toast.success("Connected", { id: loadToast }); } catch (e) { toast.error("Fail", { id: loadToast }); } }
        return;
    }
    onSelectEvent(event);
  };

  const handleRemoveLink = async (targetId: string, sourceId: string) => { const loadToast = toast.loading("Severing link..."); try { await updateDoc(doc(db, "events", targetId), { linkedEventIds: arrayRemove(sourceId) }); toast.success("Link Cut", { id: loadToast }); } catch (error) { toast.error("Could not cut link", { id: loadToast }); } };
  const toggleLinking = () => { setIsLinkingMode(!isLinkingMode); setIsUnlinkingMode(false); setLinkSourceId(null); };
  const toggleUnlinking = () => { setIsUnlinkingMode(!isUnlinkingMode); setIsLinkingMode(false); };

  return (
    <div className="flex-1 overflow-hidden relative flex flex-col bg-slate-50/50 h-full">
         
         {/* FLOATING CONTROLS */}
         <div className="absolute top-4 right-4 md:top-24 md:right-8 z-[70] flex gap-2 md:gap-3">
            <button onClick={toggleLinking} className={cn("flex items-center justify-center gap-2 rounded-full font-black text-[10px] uppercase tracking-widest transition-all shadow-xl hover:scale-105 active:scale-95", isMobile ? "w-10 h-10 p-0" : "px-5 py-3", isLinkingMode ? "bg-[#0F172A] text-white" : "bg-white text-slate-500 hover:text-[#E51636]")}>
                {isLinkingMode ? <X className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                {!isMobile && (isLinkingMode ? "Exit Linking" : "Chain Missions")}
            </button>
            <button onClick={toggleUnlinking} className={cn("flex items-center justify-center gap-2 rounded-full font-black text-[10px] uppercase tracking-widest transition-all shadow-xl hover:scale-105 active:scale-95", isMobile ? "w-10 h-10 p-0" : "px-5 py-3", isUnlinkingMode ? "bg-red-50 text-[#E51636] ring-2 ring-[#E51636]" : "bg-white text-slate-500 hover:text-[#E51636]")}>
                {isUnlinkingMode ? <X className="w-4 h-4" /> : <Settings2 className="w-4 h-4" />}
                {!isMobile && (isUnlinkingMode ? "Done" : "Manage Links")}
            </button>
         </div>

         {/* MAIN SCROLL AREA */}
         <div className="flex-1 overflow-auto relative custom-scrollbar m-2 md:m-4 rounded-[24px] md:rounded-[32px] shadow-xl border border-slate-200 bg-white">
            <div className="relative min-w-max" style={{ height: totalHeight, width: totalBoardWidth }}>
                
                {/* GRID BACKGROUND */}
                <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: `linear-gradient(#004F71 1px, transparent 1px), linear-gradient(90deg, #004F71 1px, transparent 1px)`, backgroundSize: `${DAY_WIDTH}px ${ROW_HEIGHT}px`, backgroundPosition: `${SIDEBAR_WIDTH}px ${GRID_HEADER_HEIGHT}px` }} />

                {/* CONNECTIONS (FIXED: Passed visibleEvents instead of all events) */}
                <div className="absolute inset-0 z-0">
                    <TimelineConnections events={visibleEvents} eventCoordinates={eventCoordinates} mode="cables" draggingId={draggingId} isUnlinkingMode={isUnlinkingMode} />
                </div>

                {/* STICKY HEADER */}
                <div className="sticky top-0 z-[60] flex bg-white border-b border-slate-200 shadow-sm" style={{ height: GRID_HEADER_HEIGHT }}>
                    <div className="sticky left-0 z-[70] bg-white border-r border-slate-200 px-3 md:px-6 flex items-center justify-between font-black text-[9px] text-slate-400 uppercase tracking-[0.3em] shrink-0" style={{ width: SIDEBAR_WIDTH }}>
                         <div className="flex items-center gap-2 md:gap-3"><div className="p-1.5 bg-red-50 text-[#E51636] rounded-lg"><Activity className="w-3.5 h-3.5" /></div>{!isMobile && "Mission Logs"}</div>
                         <div className="h-4 w-px bg-slate-200" />
                    </div>
                    <div className="flex">
                        {timelineDays.map(day => (
                            <div key={day.toString()} className={cn("flex-shrink-0 flex flex-col items-center justify-center border-r border-slate-100", isWeekend(day) && "bg-slate-50/40")} style={{ width: DAY_WIDTH }}>
                                <span className="text-[7px] md:text-[8px] font-bold text-slate-300 uppercase">{format(day, "EEE")}</span>
                                <span className={cn("text-[9px] md:text-[10px] font-black w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-lg mt-0.5 transition-all", isToday(day) ? "bg-[#004F71] text-white shadow-lg shadow-blue-900/20 scale-110" : "text-slate-700")}>{format(day, "d")}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* EVENTS LAYER */}
                <div className="relative z-10">
                    <AnimatePresence initial={false}>
                        {EVENT_TYPES.map((type) => {
                            const typeEvents = groupedEvents[type] || [];
                            if (typeEvents.length === 0) return null;
                            return (
                                <motion.div key={type} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative group/category">
                                    <div className="relative z-10 flex items-center" style={{ height: GROUP_HEADER_HEIGHT }}>
                                         <div className="sticky left-0 z-[50] bg-white/95 backdrop-blur-sm border-r border-slate-200 px-3 md:px-6 flex items-center shrink-0" style={{ width: SIDEBAR_WIDTH }}>
                                             {isMobile ? (
                                                 <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-300" /><span className="text-[9px] font-black uppercase text-slate-500 truncate">{getEventLabel(type)}</span></div>
                                             ) : (
                                                 <div className="flex items-center gap-3 bg-white border border-slate-200 text-slate-700 shadow-sm rounded-full px-4 py-1.5"><div className="p-1 bg-slate-100 rounded-full"><Layers className="w-3 h-3 text-slate-500" /></div><span className="text-[9px] font-black uppercase tracking-[0.2em]">{getEventLabel(type)}</span><div className="h-3 w-px bg-slate-200" /><span className="text-[8px] font-bold text-slate-400">{typeEvents.length} Active</span></div>
                                             )}
                                         </div>
                                         <div className="absolute top-1/2 left-[100px] md:left-[280px] right-0 h-px bg-slate-100 z-0" />
                                    </div>
                                    <AnimatePresence initial={false}>
                                        {typeEvents.map((event) => {
                                            const isSource = sourceIds.has(event.id);
                                            const isTarget = event.linkedEventIds && event.linkedEventIds.length > 0;
                                            // The off-screen check is now redundant here since we filtered groupedEvents above, 
                                            // but keeping it harmless.
                                            return (
                                                <motion.div key={event.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: ROW_HEIGHT }} exit={{ opacity: 0, height: 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} className={cn("flex relative transition-colors group/row hover:bg-blue-50/10")} style={{ height: ROW_HEIGHT }}>
                                                    <div className="sticky left-0 z-[40] shrink-0 border-r border-slate-200 bg-white" style={{ width: SIDEBAR_WIDTH }}>
                                                        <TacticalSidebarRow event={event} isMobile={isMobile} />
                                                    </div>
                                                    <div className="relative flex flex-1">
                                                        {timelineDays.map(day => <div key={day.toString()} className={cn("flex-shrink-0 border-r border-slate-100/60 h-full", isWeekend(day) && "bg-slate-50/30")} style={{ width: DAY_WIDTH }} />)}
                                                        <TimelineEventCard event={event} timelineStart={timelineStart} timelineEnd={timelineEnd} dayWidth={DAY_WIDTH} isStamping={isStamping} isLinking={isLinkingMode} isSource={isSource} isTarget={isTarget} onDragEnd={onDragEnd} onClick={() => handleEventClick(event)} onDragStart={() => setDraggingId(event.id)} onDragComplete={() => setDraggingId(null)} />
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>

                <div className="absolute inset-0 z-50 pointer-events-none">
                    <TimelineConnections events={visibleEvents} eventCoordinates={eventCoordinates} mode="controls" draggingId={draggingId} onRemoveLink={handleRemoveLink} isUnlinkingMode={isUnlinkingMode} />
                </div>
            </div>
         </div>
    </div>
  );
}