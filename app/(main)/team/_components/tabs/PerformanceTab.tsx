"use client";

import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { 
  ShieldCheck, MessageSquare, Link2, Medal, Zap, Target, Activity, 
  FileText, CheckCircle2, AlertTriangle, BookOpen, Star, StickyNote, File, Trophy, Vote, Crown, ArrowLeftRight, UserPlus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TeamMember, CalendarEvent } from "../../../calendar/_components/types";
import OneOnOneSessionModal from "../../../calendar/_components/OneOnOneSessionModal";
import { useAppStore } from "@/lib/store/useStore";
import { AnimatePresence, motion } from "framer-motion";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";

interface Props {
  member: TeamMember;
}

// Visual Configuration
const getActivityConfig = (type: string) => {
    switch (type) {
        // Operational
        case 'GOAL': return { icon: Target, color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', accent: 'border-l-emerald-500' };
        case '1-ON-1': return { icon: MessageSquare, color: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', accent: 'border-l-purple-500' };
        // New System Types
        case 'AWARD': return { icon: Trophy, color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', accent: 'border-l-amber-500' };
        case 'WINNER': return { icon: Crown, color: 'bg-amber-400', text: 'text-amber-800', bg: 'bg-amber-100', border: 'border-amber-300', accent: 'border-l-amber-500' }; // NEW WINNER STYLE
        case 'VOTE': return { icon: Vote, color: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200', accent: 'border-l-slate-400' };
        
        // --- NEW ICONS ---
        case 'PROMOTION': return { icon: Crown, color: 'bg-indigo-500', text: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200', accent: 'border-l-indigo-500' };
        case 'TRANSFER': return { icon: ArrowLeftRight, color: 'bg-cyan-500', text: 'text-cyan-700', bg: 'bg-cyan-50', border: 'border-cyan-200', accent: 'border-l-cyan-500' };
        case 'ASSIGNMENT': return { icon: UserPlus, color: 'bg-sky-500', text: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200', accent: 'border-l-sky-500' };

        // Documents
        case 'INCIDENT': return { icon: AlertTriangle, color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', accent: 'border-l-red-500' };
        case 'COMMENDATION': return { icon: Star, color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', accent: 'border-l-amber-500' };
        case 'REVIEW': return { icon: FileText, color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', accent: 'border-l-blue-500' };
        case 'NOTE': return { icon: StickyNote, color: 'bg-slate-500', text: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200', accent: 'border-l-slate-400' };
        case 'DOCUMENT': return { icon: File, color: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', accent: 'border-l-slate-300' };
        
        // System
        case 'MODULE': return { icon: BookOpen, color: 'bg-indigo-500', text: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200', accent: 'border-l-indigo-500' };
        default: return { icon: Activity, color: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', accent: 'border-l-slate-300' };
    }
};

export function PerformanceTab({ member }: Props) {
  const { events, curriculum } = useAppStore();
  const [selectedSession, setSelectedSession] = useState<CalendarEvent | null>(null);

  // --- AGGREGATE TIMELINE DATA ---
  const timelineData = useMemo(() => {
    const history: any[] = [];
    
    // We want events where the member is EITHER the assignee (lead) OR the participant (teamMemberId)
    // BUT for "Award" events (like EOTM), the 'assignee' is usually "System", so we check teamMemberId mainly.
    const relevantEvents = events.filter(e => 
        e.teamMemberId === member.id || (e.assignee === member.id && e.type === 'Goal')
    );
    
    relevantEvents.forEach(e => {
        let category = 'MISSION';
        let title = e.title;
        let desc = e.description || "";

        // Parse Document Logs
        if (desc.startsWith("[DOCUMENT LOG:")) {
             const match = desc.match(/\[DOCUMENT LOG: (.*?)\]/);
             const docType = match ? match[1] : 'Note';
             if (docType.includes("Incident")) category = 'INCIDENT';
             else if (docType.includes("Commendation")) category = 'COMMENDATION';
             else if (docType.includes("Review")) category = 'REVIEW';
             else if (docType.includes("Note")) category = 'NOTE';
             else category = 'DOCUMENT';
             desc = desc.replace(/\[DOCUMENT LOG: .*?\]\n\n/, "");
        }
        else if (e.type === 'Goal') category = 'GOAL';
        else if (e.type === 'OneOnOne') category = '1-ON-1';
        else if (e.type === 'Award') {
             // DETECT EOTM WINNER
             if (title.startsWith("EOTM Winners")) {
                 category = 'WINNER';
                 // Clean up description for the card view
                 desc = "Awarded Employee of the Month for outstanding performance.";
             } else {
                 category = 'AWARD';
             }
        }
        else if (e.type === 'Vote') category = 'VOTE';
        else if (e.title === "Mentorship Uplink") category = 'SYSTEM';

        // NEW CATEGORIES
        if (desc.includes("[SYSTEM LOG: PROMOTION]")) category = 'PROMOTION';
        else if (desc.includes("[SYSTEM LOG: TRANSFER]")) category = 'TRANSFER';
        else if (desc.includes("[SYSTEM LOG: ASSIGNMENT]")) category = 'ASSIGNMENT';

        // Clean System Logs
        if (desc.startsWith("[SYSTEM LOG:") || desc.startsWith("[OFFICIAL")) {
             desc = desc.replace(/\[.*?\]\n/, "").trim();
        }

        history.push({ 
            id: e.id, 
            date: e.createdAt?.toDate ? e.createdAt.toDate() : e.startDate,
            title, 
            category, 
            rawEvent: e, 
            description: desc 
        });
    });

    // 2. CURRICULUM MODULES
    if (member.completedTaskIds && member.completedTaskIds.length > 0) {
        let completedNames: string[] = [];
        curriculum.forEach(section => {
             section.tasks?.forEach((t: any) => {
                 if (member.completedTaskIds?.includes(t.id)) completedNames.push(t.title);
             });
        });
        if (completedNames.length > 0) {
             history.push({
                 id: 'module-summary',
                 date: new Date(), 
                 title: `${completedNames.length} Training Modules Verified`,
                 category: 'MODULE',
                 description: `Completed: ${completedNames.slice(0, 3).join(", ")}${completedNames.length > 3 ? "..." : ""}`
             });
        }
    }

    return history.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [events, member, curriculum]);

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
        <div className="p-8 pb-32 h-full overflow-y-auto custom-scrollbar bg-[#F8FAFC]">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg">
                    <Activity className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-2xl font-[900] text-slate-900 tracking-tight leading-none">Performance Log</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Holistic Operational Data</p>
                </div>
            </div>

            {timelineData.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-[400px] text-slate-300 border-2 border-dashed border-slate-200 rounded-[32px]">
                     <Activity className="w-12 h-12 opacity-20 mb-4" />
                     <p className="text-xs font-bold uppercase tracking-widest">No Activity Recorded</p>
                 </div>
            ) : (
                <div className="relative pl-6 lg:pl-10 space-y-8">
                    <div className="absolute left-[23px] lg:left-[39px] top-4 bottom-4 w-0.5 bg-slate-200" />

                    {timelineData.map((item, idx) => {
                        const config = getActivityConfig(item.category);
                        const Icon = config.icon;
                        const isInteractive = !!item.rawEvent && item.category === '1-ON-1';

                        return (
                            <motion.div 
                                key={`${item.id}-${idx}`}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className={cn("relative group", isInteractive && "cursor-pointer")}
                                onClick={() => handleItemClick(item)}
                            >
                                <div className={cn(
                                    "absolute -left-[34px] lg:-left-[54px] top-0 w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center border-4 border-[#F8FAFC] shadow-sm z-10 text-white", 
                                    config.color
                                )}>
                                    <Icon className="w-3.5 h-3.5 lg:w-4 lg:h-4 fill-current" />
                                </div>

                                <div className={cn(
                                    "p-5 lg:p-6 bg-white border rounded-[24px] shadow-sm transition-all relative overflow-hidden",
                                    "border-l-4", config.accent,
                                    config.border,
                                    isInteractive ? "hover:shadow-md active:scale-[0.99]" : ""
                                )}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={cn("px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider", config.bg, config.text)}>
                                            {item.category}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-300 whitespace-nowrap">
                                            {formatDistanceToNow(item.date)} ago
                                        </span>
                                    </div>

                                    <h4 className="text-base lg:text-lg font-black text-slate-900 mb-1.5 leading-tight">{item.title}</h4>
                                    
                                    {item.description && (
                                        <p className="text-xs lg:text-sm text-slate-500 font-medium leading-relaxed line-clamp-3 whitespace-pre-wrap">
                                            {item.description}
                                        </p>
                                    )}

                                    {isInteractive && (
                                        <div className="mt-4 pt-3 border-t border-purple-100 flex items-center gap-2 text-purple-600 text-[10px] font-black uppercase tracking-wider">
                                            <MessageSquare className="w-3 h-3" /> View Session Details
                                        </div>
                                    )}
                                </div>
                            </motion.div>
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