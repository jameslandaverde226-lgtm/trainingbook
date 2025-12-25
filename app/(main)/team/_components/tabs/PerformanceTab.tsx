"use client";

import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ShieldCheck, MessageSquare, Link2, Medal, Zap, Target, Activity, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { TeamMember, CalendarEvent } from "../../../calendar/_components/types";
import OneOnOneSessionModal from "../../../calendar/_components/OneOnOneSessionModal";
import { useAppStore } from "@/lib/store/useStore";
import { TACTICAL_ICONS } from "@/lib/icon-library";
import { AnimatePresence } from "framer-motion";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";

interface Props {
  member: TeamMember;
}

export function PerformanceTab({ member }: Props) {
  const { events } = useAppStore();
  const [selectedSession, setSelectedSession] = useState<CalendarEvent | null>(null);

  const timelineData = useMemo(() => {
    const history: any[] = [];
    
    // FIX: Filter by ID matches even if role changes
    const assignedEvents = events.filter(e => 
        e.teamMemberId === member.id || e.assignee === member.id
    );
    
    assignedEvents.forEach(e => {
        let category = 'MISSION';
        
        let description = e.description || "";
        if (description.startsWith("[DOCUMENT LOG:")) {
             const match = description.match(/\[DOCUMENT LOG: (.*?)\]/);
             category = match ? match[1].toUpperCase() : 'DOCUMENT';
             description = description.replace(/\[DOCUMENT LOG: .*?\]\n\n/, "");
        }
        else if (e.type === 'Goal') category = 'GOAL';
        else if (e.type === 'OneOnOne') category = '1-ON-1';
        else if (e.title === "Mentorship Uplink") category = 'SYSTEM';

        history.push({ 
            id: e.id, 
            date: e.startDate, 
            title: e.title, 
            category, 
            rawEvent: e, 
            description: description 
        });
    });

    if(member.badges) {
        member.badges.forEach((b: any) => history.push({ 
            id: b.awardedId || b.id, 
            date: b.timestamp ? new Date(b.timestamp) : new Date(), 
            title: `Badge Awarded: ${b.label}`, 
            category: 'AWARD', 
            hex: b.hex, 
            iconId: b.iconId 
        }));
    }

    return history.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [events, member]); // Reactive to global event store updates

  const handleUpdateEvent = async (updatedEvent: CalendarEvent) => { 
      try { 
          await updateDoc(doc(db, "events", updatedEvent.id), { 
              description: updatedEvent.description, 
              subtasks: updatedEvent.subtasks, 
              status: updatedEvent.status, 
              updatedAt: serverTimestamp() 
          }); 
          toast.success("Session Updated"); 
          setSelectedSession(null); 
      } catch (e) { 
          toast.error("Update Failed"); 
      } 
  };

  const handleItemClick = (item: any) => {
      if (item.category === '1-ON-1' && item.rawEvent) {
          setSelectedSession(item.rawEvent);
      }
  };

  return (
    <>
        <div className="p-8 pb-32 h-full overflow-y-auto custom-scrollbar">
            {timelineData.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-[400px] text-slate-300 border-2 border-dashed border-slate-100 rounded-[32px]">
                     <Activity className="w-10 h-10 opacity-20 mb-2" />
                     <p className="text-xs font-bold uppercase tracking-widest">No History Recorded</p>
                 </div>
            ) : (
                <div className="relative pl-8 space-y-8 border-l-2 border-slate-100 ml-4">
                    {timelineData.map((item, idx) => {
                        const isAward = item.category === 'AWARD';
                        const isStrategy = item.category === '1-ON-1';
                        
                        let Icon = ShieldCheck;
                        if (isAward) Icon = TACTICAL_ICONS.find(ic => ic.id === item.iconId)?.icon || Medal;
                        if (isStrategy) Icon = MessageSquare;
                        if (item.category === 'GOAL') Icon = Target;
                        if (item.category === 'SYSTEM') Icon = Link2;
                        if (item.category.includes('INCIDENT') || item.category === 'DOCUMENT') Icon = FileText;

                        return (
                            <div key={idx} className="relative group cursor-pointer" onClick={() => handleItemClick(item)}>
                                <div className={cn("absolute -left-[44px] top-0 w-10 h-10 rounded-xl flex items-center justify-center border-4 border-white shadow-sm z-10", isAward ? "bg-white" : "bg-slate-900 text-white")} style={isAward ? { color: item.hex } : {}}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div className={cn("p-6 bg-white border border-slate-100 rounded-[24px] shadow-sm hover:shadow-md transition-all", isStrategy && "border-purple-200 bg-purple-50/20")}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md", isAward ? "bg-amber-50 text-amber-600" : isStrategy ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-500")}>{item.category}</span>
                                        <span className="text-[10px] font-bold text-slate-300">{formatDistanceToNow(item.date)} ago</span>
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-900 mb-1">{item.title}</h4>
                                    {item.description && <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed whitespace-pre-wrap">{item.description}</p>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>

        <AnimatePresence>
            {selectedSession && (
                <OneOnOneSessionModal 
                    event={selectedSession} 
                    onClose={() => setSelectedSession(null)} 
                    onUpdate={handleUpdateEvent} 
                />
            )}
        </AnimatePresence>
    </>
  );
}