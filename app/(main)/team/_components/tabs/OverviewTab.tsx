"use client";

import { useMemo } from "react";
import { 
  Zap, Users, Check, Award, Command, Activity, Target, 
  ShieldAlert, CalendarClock, MessageSquare, Link2, Lightbulb 
} from "lucide-react";
import { cn, getProbationStatus } from "@/lib/utils";
import { TeamMember, STAGES, CalendarEvent } from "../../../calendar/_components/types";
import { useAppStore } from "@/lib/store/useStore";
import { formatDistanceToNow } from "date-fns";
import { TACTICAL_ICONS } from "@/lib/icon-library";
import { motion } from "framer-motion";

interface Props {
  member: TeamMember;
}

export function OverviewTab({ member }: Props) {
  const { events } = useAppStore();
  const isFOH = member.dept === "FOH";
  const probation = useMemo(() => getProbationStatus(member.joined), [member.joined]);

  // --- ACTIVITY DATA ---
  const timelineData = useMemo(() => {
    const history: any[] = [];
    const assignedEvents = events.filter(e => e.teamMemberId === member.id || e.assignee === member.id);
    
    assignedEvents.forEach(e => {
        let category = 'MISSION';
        if (e.type === 'Goal') category = 'GOAL';
        else if (e.type === 'OneOnOne') category = '1-ON-1';
        else if (e.title === "Mentorship Uplink") category = 'SYSTEM';

        let desc = e.description || "";
        if (desc.startsWith("[DOCUMENT LOG:")) desc = desc.replace(/\[DOCUMENT LOG: .*?\]\n\n/, "");

        history.push({ 
            id: e.id, date: e.startDate, title: e.title, category, 
            description: desc, rawEvent: e, mentorName: e.assigneeName 
        });
    });
    return history.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5); 
  }, [events, member.id]);

  return (
    <div className="p-5 lg:p-10 space-y-6 lg:space-y-8 pb-32 h-full overflow-y-auto custom-scrollbar bg-[#F8FAFC]">
        
        {/* --- TOP ROW: MENTOR & PROBATION --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
            
            {/* 1. MENTOR CARD */}
            {member.pairing ? (
                <div className="bg-white p-4 lg:p-5 rounded-[24px] lg:rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between relative overflow-hidden group hover:shadow-md transition-all">
                    <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", isFOH ? "bg-[#004F71]" : "bg-[#E51636]")} />
                    <div className="flex items-center gap-4 pl-3">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-2xl p-0.5 bg-gradient-to-br from-slate-100 to-slate-200 shadow-sm">
                                <img src={member.pairing.image} className="w-full h-full rounded-[14px] object-cover" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-emerald-500 ring-2 ring-white rounded-full p-0.5">
                                <Zap className="w-2.5 h-2.5 text-white fill-current" />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <h4 className="text-sm font-bold text-slate-900 leading-none">{member.pairing.name}</h4>
                                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[8px] font-black uppercase text-slate-500 tracking-wider">Mentor</span>
                            </div>
                            <p className="text-[10px] font-medium text-slate-400">{member.pairing.role}</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-6 rounded-[24px] lg:rounded-[28px] border-2 border-dashed border-slate-200 flex items-center justify-center gap-3 text-slate-300 bg-slate-50/50">
                    <Users className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">No Mentor Assigned</span>
                </div>
            )}

            {/* 2. PROBATION CARD */}
            {probation && probation.isActive && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 lg:p-5 rounded-[24px] lg:rounded-[28px] border border-amber-100 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start mb-2 relative z-10">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-amber-100 rounded-lg text-amber-600">
                                <ShieldAlert className="w-4 h-4" />
                            </div>
                            <div>
                                <h4 className="text-xs font-black text-amber-900 uppercase tracking-wide">Probation</h4>
                                <p className="text-[10px] font-medium text-amber-600/80">30-Day Period</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-black text-amber-500 leading-none">{probation.daysRemaining}</span>
                            <span className="text-[8px] font-bold text-amber-400 block uppercase">Left</span>
                        </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-1.5 w-full bg-amber-200/50 rounded-full overflow-hidden relative z-10">
                        <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${probation.percentage}%` }}
                            className="h-full bg-amber-500 rounded-full"
                        />
                    </div>
                    <CalendarClock className="absolute -bottom-4 -right-4 w-24 h-24 text-amber-500/5 rotate-12" />
                </div>
            )}
        </div>

        {/* --- DEPLOYMENT STATUS TIMELINE --- */}
        <div className="bg-white p-6 lg:p-10 rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-6 text-center">Unit Deployment Status</h4>
            <div className="overflow-x-auto no-scrollbar pb-4 -mx-6 px-6 scroll-smooth snap-x">
                <div className="flex justify-between px-6 relative min-w-[600px] lg:min-w-full">
                    {/* Connector Line */}
                    <div className="absolute top-5 left-10 right-10 h-0.5 bg-slate-100" />
                    
                    {STAGES.map((s, i) => { 
                        const currentIdx = STAGES.findIndex(x => x.id === member.status); 
                        const isDone = i < currentIdx; 
                        const isCurrent = i === currentIdx; 
                        return (
                            <div key={s.id} className="relative z-10 flex flex-col items-center gap-3 group snap-center">
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all shadow-lg",
                                    isDone ? "bg-emerald-500 border-emerald-400 text-white" 
                                    : isCurrent ? "bg-white border-[#E51636] text-[#E51636] ring-4 ring-red-50 scale-110 shadow-xl" 
                                    : "bg-white border-slate-100 text-slate-200"
                                )}>
                                    {isDone ? <Check className="w-5 h-5" /> : <span className="font-black text-xs">{i + 1}</span>}
                                </div>
                                <span className={cn(
                                    "text-[9px] font-bold uppercase tracking-widest whitespace-nowrap transition-colors", 
                                    isCurrent ? "text-slate-900" : "text-slate-300"
                                )}>{s.title}</span>
                            </div>
                        ) 
                    })}
                </div>
            </div>
        </div>

        {/* --- ACCOLADES --- */}
        <div className="space-y-3">
            <div className="flex items-center gap-3 px-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Validated Accolades</span>
            </div>
            
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pl-2 snap-x">
                {member.badges && member.badges.length > 0 ? member.badges.map((badge: any, i: number) => { 
                    const Icon = TACTICAL_ICONS.find(ic => ic.id === badge.iconId)?.icon || Award; 
                    return (
                        <div key={i} className="min-w-[140px] p-4 rounded-[20px] bg-white border border-slate-100 shadow-sm flex flex-col items-center text-center gap-2 hover:shadow-md transition-all snap-center">
                            <div className="p-2.5 rounded-xl shadow-inner" style={{ backgroundColor: `${badge.hex}15`, color: badge.hex }}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <span className="text-[9px] font-bold text-slate-800 uppercase tracking-tight line-clamp-1">{badge.label}</span>
                        </div>
                    ) 
                }) : (
                    <div className="w-full text-center py-6 border-2 border-dashed border-slate-200 rounded-[20px] text-slate-300 bg-slate-50/50">
                        <p className="text-[9px] font-bold uppercase tracking-widest">No badges awarded</p>
                    </div>
                )}
            </div>
        </div>

        {/* --- INTELLIGENCE & ACTIVITY --- */}
        <div className="bg-white p-5 lg:p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-900 text-white rounded-xl shadow-md"><Command className="w-4 h-4" /></div>
                <div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-300 block">Command Center</span>
                    <span className="text-base lg:text-lg font-bold text-slate-900 leading-none">Intelligence</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-7 space-y-5 relative pl-4 border-l-2 border-slate-50">
                    <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-3.5 h-3.5 text-[#E51636]" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Activity Stream</span>
                    </div>

                    {timelineData.length > 0 ? timelineData.map((item, idx) => (
                        <div key={idx} className="relative group">
                            <div className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full border-[3px] border-white bg-slate-200 group-hover:bg-[#E51636] transition-all shadow-sm z-10" />
                            <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={cn("px-2 py-0.5 rounded-md text-[8px] font-black uppercase border", item.category === 'MISSION' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-slate-100 text-slate-600 border-slate-200')}>{item.category}</span>
                                    <span className="text-[8px] font-bold text-slate-300 uppercase">{formatDistanceToNow(item.date)} ago</span>
                                </div>
                                <p className="text-xs lg:text-sm font-bold text-slate-800 leading-tight">{item.title}</p>
                            </div>
                        </div>
                    )) : (
                        <p className="text-xs text-slate-300 italic pl-2">No recent activity detected.</p>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
}