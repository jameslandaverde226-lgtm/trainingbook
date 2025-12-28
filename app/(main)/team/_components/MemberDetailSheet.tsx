"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Mail, CheckCircle2, Award, 
  Activity, Target, FileText, TrendingUp, Plus,
  Shield, Calendar, ChevronDown, Repeat, ChevronLeft,
  Zap, Sparkles, Crown, ArrowRight, Link2, User
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { TeamMember } from "../../calendar/_components/types";
import { useAppStore } from "@/lib/store/useStore";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore"; 
import { useRouter } from "next/navigation";
import ClientPortal from "@/components/core/ClientPortal";
import AdvancedCreateModal from "@/app/(main)/calendar/_components/AdvancedCreateModal";
import toast from "react-hot-toast";

// NEW IMPORTS FOR TABS
import { OverviewTab } from "./tabs/OverviewTab";
import { CurriculumTab } from "./tabs/CurriculumTab";
import { PerformanceTab } from "./tabs/PerformanceTab";
import OperationalDocumentInterface from "./OperationalDocumentInterface";

// --- CONFIGURATION ---
const COLLECTION_NAME = "profileOverrides"; 

interface Props {
  member: TeamMember;
  onClose: () => void;
  activeTab: "overview" | "curriculum" | "performance" | "documents";
  setActiveTab: (tab: "overview" | "curriculum" | "performance" | "documents") => void;
}

const TRANSITION = { type: "spring" as const, damping: 25, stiffness: 300 };

export function MemberDetailSheet({ member, onClose, activeTab, setActiveTab }: Props) {
  // Added 'curriculum' to destructured store
  const { events, team, currentUser, curriculum } = useAppStore(); 
  
  const router = useRouter(); 
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);
  
  // Local state for immediate visual feedback
  const [currentDept, setCurrentDept] = useState(member.dept);

  // --- SYNC STATE WITH PROP ---
  useEffect(() => {
    if (member.dept !== currentDept) {
        setCurrentDept(member.dept);
    }
  }, [member.dept]);

  // --- DYNAMIC THEME HELPERS ---
  const isFOH = currentDept === 'FOH';
  const themeColorText = isFOH ? 'text-[#004F71]' : 'text-[#E51636]';
  const themeColorBg = isFOH ? 'bg-[#004F71]' : 'bg-[#E51636]';
  const themeColorBorder = isFOH ? 'border-[#004F71]' : 'border-[#E51636]';
  const themeRing = isFOH ? 'ring-blue-50' : 'ring-red-50';
  const themeLightIconBg = isFOH ? 'bg-blue-100/50' : 'bg-red-100/50';

  // --- CALCULATE REAL-TIME PROGRESS ---
  // This overrides the potentially stale 'member.progress' from DB with actual task data
  const displayMember = useMemo(() => {
      if (!curriculum || curriculum.length === 0) return member;

      // 1. Filter curriculum to only count tasks for this user's department
      const relevantSections = curriculum.filter(section => 
          section.dept?.toUpperCase() === member.dept?.toUpperCase()
      );

      // 2. Count total tasks in those sections
      const totalTasks = relevantSections.reduce((acc, section) => 
          acc + (section.tasks?.length || 0), 0);

      // 3. Count how many of those specific tasks the user has completed
      // We check if the task ID exists in the user's completed list
      const completedCount = relevantSections.reduce((acc, section) => {
          const completedInSection = section.tasks?.filter((t: any) => 
              member.completedTaskIds?.includes(t.id)
          ).length || 0;
          return acc + completedInSection;
      }, 0);

      // 4. Calculate Percentage
      const calculatedProgress = totalTasks > 0 
          ? Math.round((completedCount / totalTasks) * 100) 
          : 0;

      return {
          ...member,
          progress: calculatedProgress
      };
  }, [member, curriculum]);

  // --- UPDATE UNIT FUNCTION ---
  const toggleUnit = async () => {
    const newDept = isFOH ? 'BOH' : 'FOH';
    
    // 1. Optimistic Update
    setCurrentDept(newDept); 

    const toastId = toast.loading(`Transferring to ${newDept}...`);

    try {
        // 2. Database Update
        const overrideRef = doc(db, COLLECTION_NAME, member.id); 
        
        await setDoc(overrideRef, { 
            dept: newDept,
            updatedAt: new Date().toISOString()
        }, { merge: true });

        // 3. GLOBAL STATE UPDATE
        if (team) {
            const updatedTeam = team.map(t => 
                t.id === member.id ? { ...t, dept: newDept as TeamMember["dept"] } : t
            );
            useAppStore.setState({ team: updatedTeam });
        }

        toast.success(`Unit Reassigned: ${newDept}`, { id: toastId });
        router.refresh();
        
    } catch (error) {
        console.error("Error updating unit:", error);
        toast.error("Transfer failed", { id: toastId });
        setCurrentDept(member.dept);
    }
  };

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "unset"; };
  }, []);

  const joinedDate = member.joined ? format(new Date(member.joined), "MMM d, yyyy") : "N/A";

  // IMPORT THE HEADER COMPONENT DYNAMICALLY TO AVOID CIRCULAR DEPS IF ANY
  // But here we use the imported one. 
  // We pass 'displayMember' instead of 'member' to the header components.
  
  // (Import moved to top: import { MemberProfileHeader } from "./MemberProfileHeader";)
  // Ensure you have: import { MemberProfileHeader } from "./MemberProfileHeader"; 
  // I will assume it is imported or I'll inline the fix if I was generating the full file content from scratch, 
  // but based on context, I just need to use the calculated 'displayMember'.
  const { MemberProfileHeader } = require("./MemberProfileHeader"); // Dynamic require to ensure it picks up changes if needed, or standard import above.

  return (
    <ClientPortal>
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
        className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Sheet Container */}
      <motion.div 
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} 
        transition={TRANSITION}
        className="fixed inset-y-0 right-0 z-[110] w-full md:w-[95%] lg:w-[1200px] bg-[#F8FAFC] md:rounded-l-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row"
      >
        
        {/* =========================================================================
            DESKTOP SIDEBAR 
           ========================================================================= */}
        <div className="hidden md:flex w-[380px] bg-white border-r border-slate-100 flex-col h-full shrink-0 relative z-20 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
            <div className="absolute top-0 left-0 right-0 h-64 bg-slate-50/50 -skew-y-6 transform origin-top-left z-0" />
            <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none z-0" />
            
            <div className="flex-1 p-8 flex flex-col relative z-10 overflow-y-auto custom-scrollbar">
                
                {/* Profile Header */}
                <div className="flex flex-col items-center text-center mb-8">
                    <motion.div layoutId={`member-avatar-${member.id}`} className="relative w-36 h-36 rounded-[40px] bg-white shadow-2xl shadow-slate-200/60 flex items-center justify-center mb-6 ring-4 ring-white">
                        {member.image ? (
                            <img src={member.image} alt={member.name} className="w-full h-full object-cover rounded-[36px]" />
                        ) : (
                            <span className="text-5xl font-[1000] text-slate-900">{member.name.charAt(0)}</span>
                        )}
                        
                        {/* Unit Badge / Toggle */}
                        <button 
                            onClick={toggleUnit}
                            className={cn("absolute -bottom-3 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white border-4 border-white shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2", themeColorBg)}
                        >
                            {currentDept} UNIT <Repeat className="w-3 h-3 opacity-50" />
                        </button>
                    </motion.div>

                    <h2 className="text-3xl font-[1000] text-slate-900 tracking-tight leading-tight mb-2">{member.name}</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">{member.role}</p>
                </div>

                {/* Growth Ring - USING CALCULATED PROGRESS */}
                <div className="flex flex-col items-center mb-10">
                    <div className="relative w-28 h-28">
                        <svg className="w-full h-full -rotate-90 drop-shadow-lg">
                            <circle cx="56" cy="56" r="46" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                            <circle cx="56" cy="56" r="46" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={289} strokeDashoffset={289 - (289 * (displayMember.progress || 0) / 100)} className={themeColorText} strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-[1000] text-slate-900">{displayMember.progress || 0}%</span>
                        </div>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-3 flex items-center gap-1.5">
                        <TrendingUp className="w-3 h-3" /> Growth Trajectory
                    </p>
                </div>

                {/* Detailed Info Cards (UPDATED LAYOUT) */}
                <div className="grid grid-cols-2 gap-3 w-full">
                    
                    {/* EMAIL (Span 2) */}
                    <div className="col-span-2 group p-4 bg-slate-50 hover:bg-white border border-slate-100 hover:border-slate-200 rounded-2xl transition-all shadow-sm hover:shadow-md flex items-center gap-4">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform", themeLightIconBg, themeColorText)}>
                            <Mail className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Contact Email</p>
                            <p className="text-xs font-bold text-slate-900 truncate" title={member.email}>{member.email}</p>
                        </div>
                    </div>

                    {/* JOINED (Span 2) */}
                    <div className="col-span-2 group p-4 bg-slate-50 hover:bg-white border border-slate-100 hover:border-slate-200 rounded-2xl transition-all shadow-sm hover:shadow-md flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-100/50 flex items-center justify-center text-purple-600 shrink-0 group-hover:scale-110 transition-transform">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Date Joined</p>
                            <p className="text-xs font-bold text-slate-900">{joinedDate}</p>
                        </div>
                    </div>

                    {/* MENTOR (Span 2 - Rich Card) */}
                    <div className="col-span-2 group p-3 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-3 relative overflow-hidden">
                        {member.pairing ? (
                            <>
                                <div className={cn("absolute left-0 top-0 bottom-0 w-1", themeColorBg)} />
                                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 shrink-0 overflow-hidden relative shadow-sm">
                                    {member.pairing.image ? (
                                        <img src={member.pairing.image} alt={member.pairing.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white font-black text-sm">
                                            {member.pairing.name.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1.5">
                                        <Link2 className="w-3 h-3 text-slate-400" /> Assigned Mentor
                                    </p>
                                    <p className="text-sm font-black text-slate-900 truncate">
                                        {member.pairing.name}
                                    </p>
                                </div>
                            </>
                        ) : (
                             // Empty State
                             <>
                                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 shrink-0 border border-dashed border-slate-200">
                                    <User className="w-5 h-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Mentorship</p>
                                    <p className="text-xs font-bold text-slate-300 italic">Unassigned</p>
                                </div>
                             </>
                        )}
                    </div>

                </div>
            </div>
        </div>

        {/* =========================================================================
            RIGHT CONTENT AREA 
           ========================================================================= */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F8FAFC]">
            
            {/* --- MOBILE COLLAPSIBLE HEADER (USING CALCULATED PROGRESS) --- */}
            <div className="md:hidden bg-white border-b border-slate-100 shrink-0 z-30 shadow-sm transition-all duration-300">
                <div className="flex items-center justify-between p-4">
                    
                    {/* LEFT: Back & Mini Profile */}
                    <div className="flex items-center gap-3">
                         <button 
                            onClick={onClose}
                            className="p-2 -ml-2 rounded-full text-slate-400 hover:bg-slate-50 active:scale-90 transition-all"
                         >
                            <ChevronLeft className="w-6 h-6" />
                         </button>

                         <div 
                            className="flex items-center gap-3 cursor-pointer select-none"
                            onClick={() => setIsProfileExpanded(!isProfileExpanded)}
                         >
                             <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg font-[1000] text-slate-900 shrink-0 border border-slate-200 overflow-hidden">
                                 {member.image ? (
                                    <img src={member.image} className="w-full h-full object-cover" />
                                 ) : member.name.charAt(0)}
                             </div>
                             <div>
                                 <h2 className="text-base font-[1000] text-slate-900 tracking-tight leading-none mb-1">{member.name}</h2>
                                 <div className="flex items-center gap-2">
                                    <span className={cn("px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest text-white", themeColorBg)}>
                                        {currentDept}
                                    </span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase">{member.role}</span>
                                 </div>
                             </div>
                         </div>
                    </div>

                    {/* RIGHT: Progress & Expand */}
                    <div 
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => setIsProfileExpanded(!isProfileExpanded)}
                    >
                        {/* Mini Progress Ring */}
                        <div className="relative w-10 h-10">
                            <svg className="w-full h-full -rotate-90">
                                <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-slate-100" />
                                <circle 
                                    cx="20" cy="20" r="16" 
                                    stroke="currentColor" strokeWidth="3" 
                                    fill="transparent" 
                                    strokeDasharray={100} 
                                    strokeDashoffset={100 - (displayMember.progress || 0)} 
                                    className={themeColorText} 
                                    strokeLinecap="round" 
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[9px] font-black text-slate-900">{displayMember.progress || 0}%</span>
                            </div>
                        </div>

                        {/* Chevron */}
                        <div className={cn("p-1.5 rounded-full bg-slate-50 text-slate-400 transition-transform duration-300", isProfileExpanded && "rotate-180")}>
                            <ChevronDown className="w-4 h-4" />
                        </div>
                    </div>

                </div>

                {/* Expanded Details Area */}
                <AnimatePresence>
                    {isProfileExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-t border-slate-50 bg-slate-50/50"
                        >
                            <div className="p-4 space-y-3">
                                {/* Unit Switcher */}
                                <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unit Assignment</span>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); toggleUnit(); }}
                                        className={cn("px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-white shadow-sm flex items-center gap-2 active:scale-95 transition-all", themeColorBg)}
                                    >
                                        <Repeat className="w-3 h-3" />
                                        Switch to {isFOH ? 'BOH' : 'FOH'}
                                    </button>
                                </div>

                                {/* Info Grid */}
                                <div className="grid grid-cols-1 gap-2">
                                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100">
                                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="text-[10px] font-bold text-slate-900 break-all">{member.email}</span>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100">
                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="text-[10px] font-bold text-slate-900">{joinedDate}</span>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100">
                                        <Shield className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="text-[10px] font-bold text-slate-400 italic">
                                            {member.pairing ? member.pairing.name : "No Mentor Assigned"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* --- SHARED TABS HEADER --- */}
            <div className="px-6 md:px-10 pt-4 md:pt-10 pb-0 bg-white border-b border-slate-100 flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0 z-10">
                 <button onClick={onClose} className="hidden md:block absolute top-6 right-6 p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 transition-colors z-20">
                    <X className="w-5 h-5" />
                 </button>

                <div className="flex items-center gap-6 md:gap-8 overflow-x-auto no-scrollbar w-full md:w-auto pb-0">
                    {(['overview', 'documents', 'curriculum', 'performance'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "pb-4 text-[10px] font-black uppercase tracking-[0.15em] transition-colors relative whitespace-nowrap",
                                activeTab === tab ? "text-slate-900" : "text-slate-300 hover:text-slate-500"
                            )}
                        >
                            {tab}
                            {activeTab === tab && (
                                <motion.div layoutId="activeTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E51636]" />
                            )}
                        </button>
                    ))}
                </div>

                <div className="hidden md:block mb-3 mr-12">
                     <button 
                        onClick={() => setIsAddEventOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#E51636] hover:bg-[#c9122f] text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-xl active:scale-95 shadow-red-500/20"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>New Mission</span>
                    </button>
                 </div>
            </div>

            {/* --- SCROLLABLE CONTENT --- */}
            <div className="flex-1 overflow-y-auto p-0 md:p-0 bg-[#F8FAFC]"> 
                 {/* Mobile "New Mission" Button */}
                 <div className="md:hidden p-5 pb-0">
                    <button 
                        onClick={() => setIsAddEventOpen(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#E51636] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Deploy New Mission</span>
                    </button>
                 </div>

                {/* --- TAB ROUTER --- */}
                {/* FIX: Pass displayMember (calculated progress) instead of member to tabs */}
                <div className="h-full">
                    {activeTab === 'overview' && (
                        <OverviewTab member={displayMember} />
                    )}

                    {activeTab === 'curriculum' && (
                        <CurriculumTab member={displayMember} />
                    )}

                    {activeTab === 'performance' && (
                        <PerformanceTab member={displayMember} />
                    )}

                    {activeTab === 'documents' && (
                        <OperationalDocumentInterface member={displayMember} currentUser={currentUser?.name || "Admin"} />
                    )}
                </div>
            </div>
        </div>

        {isAddEventOpen && (
            <AdvancedCreateModal 
                isOpen={isAddEventOpen} 
                onClose={() => setIsAddEventOpen(false)}
                preselectedMemberId={member.id}
            />
        )}
      </motion.div>
    </ClientPortal>
  );
}