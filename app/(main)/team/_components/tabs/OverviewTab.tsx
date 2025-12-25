"use client";

import { useMemo } from "react";
import { 
  Zap, Users, Check, Award, Command, Activity, Target, 
  ShieldAlert, CalendarClock, MessageSquare, Link2, Lightbulb, Goal, BookOpen 
} from "lucide-react";
import { cn, getProbationStatus } from "@/lib/utils";
import { TeamMember, STAGES, CalendarEvent } from "../../../calendar/_components/types";
import { useAppStore } from "@/lib/store/useStore";
import { format, formatDistanceToNow, isValid } from "date-fns";
import { TACTICAL_ICONS } from "@/lib/icon-library";
import { motion } from "framer-motion";

interface Props {
  member: TeamMember;
}

export function OverviewTab({ member }: Props) {
  // 1. ADD: Destructure curriculum from store
  const { events, curriculum } = useAppStore();
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
            id: e.id, 
            date: e.startDate, 
            title: e.title, 
            category, 
            description: desc, 
            rawEvent: e, 
            mentorName: e.assigneeName 
        });
    });

    // 2. ADD: Curriculum Logic (Same as Performance Tab)
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
                 date: new Date(), // Always fresh
                 title: `${completedNames.length} Training Modules Verified`,
                 category: 'MODULE',
                 description: `Completed: ${completedNames.slice(0, 2).join(", ")}${completedNames.length > 2 ? "..." : ""}`
             });
        }
    }

    return history.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 8); 
  }, [events, member.id, curriculum, member.completedTaskIds]);

  const recentGoals = useMemo(() => {
      return timelineData.filter(i => i.category === 'GOAL' || i.category === '1-ON-1').slice(0, 3);
  }, [timelineData]);

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
                    <div className="h-1.5 w-full bg-amber-200/50 rounded-full overflow-hidden relative z-10">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${probation.percentage}%` }} className="h-full bg-amber-500 rounded-full" />
                    </div>
                    <CalendarClock className="absolute -bottom-4 -right-4 w-24 h-24 text-amber-500/5 rotate-12" />
                </div>
            )}
        </div>

        {/* --- DEPLOYMENT STATUS TIMELINE --- */}
        <div className="bg-white p-6 lg:p-10 rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-6 text-center">Unit Deployment Status</h4>
            <div className="overflow-x-auto no-scrollbar pt-12 pb-6 -mx-6 px-6 scroll-smooth snap-x">
                <div className="flex items-center gap-4 px-4 min-w-max mx-auto">
                    <div className="absolute left-10 right-10 top-[4.5rem] h-0.5 bg-slate-100 -z-10" />
                    {STAGES.map((s, i) => { 
                        const currentIdx = STAGES.findIndex(x => x.id === member.status); 
                        const isDone = i < currentIdx; 
                        const isCurrent = i === currentIdx; 
                        
                        let dateStr = "";
                        if (s.id === "Onboarding" && member.joined) {
                            dateStr = format(new Date(member.joined), "MMM yyyy");
                        } else if (member.promotionDates?.[s.id]) {
                             const d = new Date(member.promotionDates[s.id]);
                             if (isValid(d)) dateStr = format(d, "MMM yyyy");
                        } else if (isCurrent) {
                             dateStr = "Current";
                        } else if (isDone) {
                             dateStr = "Completed";
                        }

                        return (
                            <div key={s.id} className="relative z-10 flex flex-col items-center gap-3 group snap-center min-w-[90px]">
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all shadow-lg bg-white relative",
                                    isDone ? "bg-emerald-500 border-emerald-400 text-white" 
                                    : isCurrent ? "bg-white border-[#E51636] text-[#E51636] ring-4 ring-red-50 scale-125 shadow-xl" 
                                    : "bg-white border-slate-100 text-slate-200"
                                )}>
                                    {isDone ? <Check className="w-5 h-5" /> : <span className="font-black text-xs">{i + 1}</span>}
                                </div>
                                <div className="flex flex-col items-center gap-0.5 text-center">
                                    <span className={cn("text-[9px] font-bold uppercase tracking-widest whitespace-nowrap transition-colors leading-none", isCurrent ? "text-slate-900" : "text-slate-300")}>{s.title}</span>
                                    <span className={cn("text-[8px] font-bold uppercase tracking-wide", isCurrent ? "text-[#E51636]" : isDone ? "text-emerald-500" : "text-slate-300 opacity-0")}>{dateStr}</span>
                                </div>
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
                <div className="p-2 bg-[#004F71] text-white rounded-xl shadow-md"><Command className="w-4 h-4" /></div>
                <div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-300 block">Command Center</span>
                    <span className="text-base lg:text-lg font-bold text-slate-900 leading-none">Intelligence</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* COLUMN 1: ACTIVITY STREAM */}
                <div className="lg:col-span-7 space-y-5 relative pl-4 border-l-2 border-slate-100">
                    <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-3.5 h-3.5 text-[#E51636]" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Activity Stream</span>
                    </div>

                    {timelineData.length > 0 ? timelineData.map((item, idx) => (
                        <div key={idx} className="relative group">
                            <div className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full border-[3px] border-white bg-slate-200 group-hover:bg-[#E51636] transition-all shadow-sm z-10" />
                            <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-md text-[8px] font-black uppercase border",
                                        item.category === 'MODULE' ? 'bg-slate-100 text-slate-600 border-slate-200' : 
                                        item.category === 'MISSION' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-slate-50 text-slate-600 border-slate-100'
                                    )}>
                                        {item.category}
                                    </span>
                                    <span className="text-[8px] font-bold text-slate-300 uppercase">{formatDistanceToNow(item.date)} ago</span>
                                </div>
                                <p className="text-xs lg:text-sm font-bold text-slate-800 leading-tight">{item.title}</p>
                                {item.description && <p className="text-[10px] text-slate-500 line-clamp-1">{item.description}</p>}
                            </div>
                        </div>
                    )) : (
                        <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-400 border border-slate-100 border-dashed">
                             <p className="text-[10px] font-bold uppercase tracking-widest">No recent activity detected.</p>
                        </div>
                    )}
                </div>

                {/* COLUMN 2: KEY OBJECTIVES */}
                <div className="lg:col-span-5 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Target className="w-3.5 h-3.5 text-[#004F71]" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Key Objectives</span>
                    </div>

                    {recentGoals.length > 0 ? recentGoals.map((goal, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 border border-slate-100 rounded-[20px] shadow-sm flex items-start gap-3">
                            <div className={cn("p-2 rounded-lg shrink-0", goal.category === '1-ON-1' ? "bg-purple-100 text-purple-600" : "bg-emerald-100 text-emerald-600")}>
                                {goal.category === '1-ON-1' ? <Lightbulb className="w-4 h-4" /> : <Goal className="w-4 h-4" />}
                            </div>
                            <div>
                                <h5 className="text-xs font-bold text-slate-900 leading-snug">{goal.title}</h5>
                                <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{goal.description || "No specific details logged."}</p>
                                <div className="mt-2 flex items-center gap-2">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">{formatDistanceToNow(goal.date)} ago</span>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="p-8 border-2 border-dashed border-slate-100 rounded-[24px] flex flex-col items-center justify-center text-slate-300 bg-slate-50/50">
                            <Target className="w-8 h-8 mb-2 opacity-50" />
                            <span className="text-[9px] font-bold uppercase tracking-widest text-center">No Active Goals</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
}