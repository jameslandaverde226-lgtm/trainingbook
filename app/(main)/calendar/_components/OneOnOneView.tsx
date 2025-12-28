"use client";

import { useMemo, useState } from "react";
import { format, isFuture, isPast } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarEvent } from "./types";
import { useAppStore } from "@/lib/store/useStore";
import { 
  ChevronRight, Clock, CalendarDays, Archive, 
  MessageSquare, User, Sparkles
} from "lucide-react";
import OneOnOneSessionModal from "./OneOnOneSessionModal";

interface Props {
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent | null) => void;
  onUpdateEvent?: (updatedEvent: CalendarEvent) => void; 
  selectedUserId?: string | null; 
}

export default function OneOnOneView({ events: initialEvents, onSelectEvent, onUpdateEvent, selectedUserId }: Props) {
  const { team } = useAppStore();
  const [activeSession, setActiveSession] = useState<CalendarEvent | null>(null);

  const filteredEvents = useMemo(() => {
    let list = initialEvents.filter(e => e.type === "OneOnOne");
    if (selectedUserId) {
        list = list.filter(e => e.assignee === selectedUserId || e.teamMemberId === selectedUserId);
    }
    return list;
  }, [initialEvents, selectedUserId]);

  const { upcoming, historyGroups } = useMemo(() => {
    const upcoming = filteredEvents
        .filter(e => e.status !== "Done" && isFuture(e.startDate))
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    const history = filteredEvents
        .filter(e => e.status === "Done" || isPast(e.startDate))
        .sort((a, b) => b.startDate.getTime() - a.startDate.getTime());

    const groupsMap = new Map<string, CalendarEvent[]>();
    history.forEach((event) => {
        const key = format(event.startDate, "MMMM yyyy");
        if (!groupsMap.has(key)) groupsMap.set(key, []);
        groupsMap.get(key)!.push(event);
    });

    const historyGroups = Array.from(groupsMap.entries()).map(([label, events]) => ({ label, events }));

    return { upcoming, historyGroups };
  }, [filteredEvents]);

  const handleUpdate = (updatedEvent: CalendarEvent) => {
      if (onUpdateEvent) onUpdateEvent(updatedEvent);
      setActiveSession(null);
  };

  return (
    <div className="h-full bg-[#F8FAFC] overflow-y-auto custom-scrollbar p-6 md:p-12 relative pb-32">
        <div className="max-w-5xl mx-auto space-y-10 md:space-y-16">
            
            {/* HERO HEADER */}
             <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-[#E51636]/10 text-[#E51636] rounded-xl border border-[#E51636]/20">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Development Pipeline</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none mb-3 md:mb-4">
                    {selectedUserId ? team.find(u => u.id === selectedUserId)?.name : "Talent Overview"}
                </h1>
                <p className="text-slate-500 font-medium max-w-2xl text-base md:text-lg leading-relaxed">
                    {selectedUserId 
                        ? `Viewing performance history and growth path for ${team.find(u => u.id === selectedUserId)?.role}.`
                        : "Monitor system-wide leadership sessions, coaching notes, and tactical growth progress."}
                </p>
            </motion.div>

            {/* --- UPCOMING SECTION --- */}
            <section className="space-y-6 md:space-y-8">
                <div className="flex items-center gap-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 shrink-0">
                        <CalendarDays className="w-4 h-4 text-[#E51636]" /> Scheduled Sessions
                    </h3>
                    <div className="h-px flex-1 bg-slate-100" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {upcoming.length > 0 ? upcoming.map(event => {
                        const eventUser = team.find(u => u.id === event.assignee);
                        // FIX: Ensure image is not empty before rendering img tag
                        const hasImage = eventUser?.image && eventUser.image.trim() !== "";

                        return (
                            <motion.div 
                                key={event.id}
                                layoutId={event.id}
                                onClick={() => setActiveSession(event)}
                                className="group bg-white p-5 md:p-6 rounded-[28px] md:rounded-[32px] border border-slate-200 shadow-sm hover:shadow-xl hover:border-red-100 transition-all cursor-pointer relative overflow-hidden active:scale-[0.98]"
                            >
                                <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:rotate-12 transition-transform">
                                    <Clock className="w-20 h-20" />
                                </div>
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-3">
                                        {hasImage ? (
                                            <img src={eventUser!.image} className="w-12 h-12 rounded-2xl object-cover shadow-sm ring-2 ring-slate-50" alt="" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 text-sm">
                                                {eventUser ? eventUser.name.charAt(0) : <User className="w-6 h-6 text-slate-300" />}
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-base font-black text-slate-900 leading-tight mb-1">{event.title}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{eventUser?.name || "Unassigned"}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {format(event.startDate, "MMM do @ h:mm a")}</span>
                                    <span className="text-[10px] font-black text-[#E51636] uppercase tracking-widest md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center gap-1">Begin <ChevronRight className="w-3 h-3" /></span>
                                </div>
                            </motion.div>
                        );
                    }) : (
                        <div className="col-span-full py-16 bg-white rounded-[32px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                            <Clock className="w-10 h-10 mb-4 opacity-20" />
                            <p className="text-sm font-bold uppercase tracking-widest">No sessions scheduled</p>
                        </div>
                    )}
                </div>
            </section>

            {/* --- HISTORY ARCHIVE --- */}
            <section className="space-y-6 md:space-y-8">
                <div className="flex items-center gap-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 shrink-0">
                        <Archive className="w-4 h-4 text-[#004F71]" /> Past Performance Archive
                    </h3>
                    <div className="h-px flex-1 bg-slate-100" />
                </div>

                <div className="space-y-8 md:space-y-12">
                    {historyGroups.map(group => (
                        <div key={group.label} className="space-y-4">
                            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] px-2">{group.label}</h4>
                            <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden divide-y divide-slate-100 shadow-sm">
                                {group.events.map(event => (
                                    <div 
                                        key={event.id} 
                                        onClick={() => setActiveSession(event)}
                                        className="p-5 md:p-6 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group active:bg-slate-100"
                                    >
                                        <div className="flex items-center gap-4 md:gap-6">
                                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-slate-100 flex flex-col items-center justify-center text-slate-400 group-hover:bg-[#004F71] group-hover:text-white transition-all shrink-0">
                                                <span className="text-[8px] md:text-[9px] font-black uppercase leading-none mb-1">{format(event.startDate, "MMM")}</span>
                                                <span className="text-base md:text-lg font-black leading-none">{format(event.startDate, "d")}</span>
                                            </div>
                                            <div className="min-w-0">
                                                <h5 className="text-sm md:text-base font-bold text-slate-900 group-hover:text-[#004F71] transition-colors truncate pr-4">{event.title}</h5>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 truncate"><User className="w-3 h-3" /> {event.assigneeName}</span>
                                                    {event.description && <span className="text-[10px] font-bold text-emerald-500 uppercase flex items-center gap-1 hidden md:flex"><MessageSquare className="w-3 h-3" /> Notes Saved</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 md:gap-4 shrink-0">
                                            {event.status === "Done" && <span className="px-2 py-1 md:px-3 md:py-1 rounded-full bg-emerald-50 text-emerald-600 text-[8px] md:text-[9px] font-black uppercase tracking-widest border border-emerald-100">Done</span>}
                                            <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-slate-200 group-hover:text-[#004F71] transition-all" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>

        {/* --- REUSABLE SESSION COMPLETION MODAL --- */}
        <AnimatePresence>
            {activeSession && (
                <OneOnOneSessionModal 
                    event={activeSession} 
                    onClose={() => setActiveSession(null)} 
                    onUpdate={handleUpdate} 
                />
            )}
        </AnimatePresence>
    </div>
  );
}