"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Mail, CheckCircle2, Award, 
  Activity, Target, FileText, TrendingUp, Plus,
  Shield, Calendar, ChevronDown, Repeat, ChevronLeft,
  Zap, Sparkles, Crown, ArrowRight
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

// --- CONFIGURATION ---
const COLLECTION_NAME = "profileOverrides"; 

interface Props {
  member: TeamMember;
  onClose: () => void;
  activeTab: "overview" | "curriculum" | "performance" | "documents";
  setActiveTab: (tab: "overview" | "curriculum" | "performance" | "documents") => void;
}

const TRANSITION = { type: "spring" as const, damping: 25, stiffness: 300 };

// --- HELPER: INTELLIGENT STYLE RESOLVER ---
const getLogStyle = (type: string, description: string) => {
  if (description.includes("PROMOTION")) {
    return {
      theme: "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100/80 shadow-sm",
      iconBg: "bg-amber-100 text-amber-600 border-amber-50",
      icon: Crown,
      label: "Rank Advancement",
      accent: "text-amber-900"
    };
  }
  if (description.includes("ASSIGNMENT") || description.includes("TRANSFER")) {
    return {
      theme: "bg-gradient-to-br from-slate-50 to-blue-50 border-blue-100/80 shadow-sm",
      iconBg: "bg-blue-100 text-[#004F71] border-blue-50",
      icon: Shield,
      label: "Unit Reassignment",
      accent: "text-[#004F71]"
    };
  }
  // Default Operation
  return {
    theme: "bg-white border-slate-100 hover:border-slate-200 shadow-sm",
    iconBg: "bg-slate-50 text-slate-400 border-white",
    icon: Activity,
    label: "Standard Operation",
    accent: "text-slate-700"
  };
};

export function MemberDetailSheet({ member, onClose, activeTab, setActiveTab }: Props) {
  const { events, team } = useAppStore(); 
  
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

  // --- UPDATE UNIT FUNCTION ---
  const toggleUnit = async () => {
    const newDept = isFOH ? 'BOH' : 'FOH';
    
    // 1. Optimistic Update
    setCurrentDept(newDept); 

    const toastId = toast.loading(`Transferring to ${newDept}...`, {
        style: {
            borderRadius: '12px',
            background: '#333',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 'bold',
        },
    });

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

  // --- DERIVED METRICS ---
  const memberEvents = useMemo(() => {
    return events.filter(e => e.assignee === member.id || e.teamMemberId === member.id)
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [events, member.id]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "unset"; };
  }, []);

  const joinedDate = format(new Date(), "MMMM d, yyyy");

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

                {/* Growth Ring */}
                <div className="flex flex-col items-center mb-10">
                    <div className="relative w-28 h-28">
                        <svg className="w-full h-full -rotate-90 drop-shadow-lg">
                            <circle cx="56" cy="56" r="46" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                            <circle cx="56" cy="56" r="46" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={289} strokeDashoffset={289 - (289 * (member.progress || 0) / 100)} className={themeColorText} strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-[1000] text-slate-900">{member.progress || 0}%</span>
                        </div>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-3 flex items-center gap-1.5">
                        <TrendingUp className="w-3 h-3" /> Growth Trajectory
                    </p>
                </div>

                {/* Detailed Info Cards */}
                <div className="space-y-4 w-full">
                    {/* Email */}
                    <div className="group p-4 bg-slate-50 hover:bg-white border border-slate-100 hover:border-slate-200 rounded-2xl transition-all shadow-sm hover:shadow-md flex items-start gap-4">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform", themeLightIconBg, themeColorText)}>
                            <Mail className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Contact Email</p>
                            <p className="text-xs font-bold text-slate-900 break-words leading-tight">{member.email}</p>
                        </div>
                    </div>
                    
                    {/* Joined Date */}
                    <div className="group p-4 bg-slate-50 hover:bg-white border border-slate-100 hover:border-slate-200 rounded-2xl transition-all shadow-sm hover:shadow-md flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-100/50 flex items-center justify-center text-purple-600 shrink-0 group-hover:scale-110 transition-transform">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Date Joined</p>
                            <p className="text-xs font-bold text-slate-900">{joinedDate}</p>
                        </div>
                    </div>

                    {/* Mentor */}
                    <div className="group p-4 bg-slate-50 hover:bg-white border border-slate-100 hover:border-slate-200 rounded-2xl transition-all shadow-sm hover:shadow-md flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100/50 flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-110 transition-transform">
                            <Shield className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Assigned Mentor</p>
                            <p className="text-xs font-bold text-slate-400 italic">No Mentor Assigned</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* =========================================================================
            RIGHT CONTENT AREA 
           ========================================================================= */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F8FAFC]">
            
            {/* --- MOBILE COLLAPSIBLE HEADER --- */}
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
                                {/* Background Circle */}
                                <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-slate-100" />
                                {/* Progress Circle */}
                                <circle 
                                    cx="20" cy="20" r="16" 
                                    stroke="currentColor" strokeWidth="3" 
                                    fill="transparent" 
                                    strokeDasharray={100} 
                                    strokeDashoffset={100 - (member.progress || 0)} 
                                    className={themeColorText} 
                                    strokeLinecap="round" 
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[9px] font-black text-slate-900">{member.progress || 0}%</span>
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
                                        <span className="text-[10px] font-bold text-slate-400 italic">No Mentor Assigned</span>
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
            <div className="flex-1 overflow-y-auto p-5 md:p-10 space-y-6 md:space-y-8 bg-[#F8FAFC]">
                 {/* Mobile "New Mission" Button */}
                 <div className="md:hidden">
                    <button 
                        onClick={() => setIsAddEventOpen(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#E51636] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Deploy New Mission</span>
                    </button>
                 </div>

                {/* --- TAB: OVERVIEW --- */}
                {activeTab === 'overview' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 md:space-y-8 pb-20 md:pb-0">
                        
                        {/* Unit Status (Timeline) */}
                        <div className="p-6 md:p-8 bg-white border border-slate-100 rounded-[24px] md:rounded-[32px] shadow-sm">
                            <div className="flex items-center justify-between mb-8 md:mb-10">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit Deployment Status</span>
                            </div>
                            <div className="relative px-2 md:px-4">
                                <div className="hidden md:block absolute top-[22px] left-10 right-10 h-[2px] bg-slate-100 z-0" />
                                <div className="md:hidden absolute top-4 bottom-4 left-[19px] w-[2px] bg-slate-100 z-0" />
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-y-6 md:gap-0 relative z-10">
                                    {[
                                        { label: "Onboarding", date: "Apr 2022", done: true },
                                        { label: "Training", date: "Completed", done: true },
                                        { label: "Team Member", date: "Completed", done: true },
                                        { label: "Team Leader", date: "Dec 2024", current: true },
                                        { label: "Director", date: "Locked", locked: true },
                                    ].map((step, i) => (
                                        <div key={i} className="flex md:flex-col items-center md:text-center gap-4 md:gap-3">
                                            <div className={cn(
                                                "w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center border-[3px] transition-all shadow-sm bg-white relative z-10 shrink-0",
                                                step.done ? "border-emerald-500 text-emerald-500" : 
                                                step.current ? cn(themeColorBorder, themeColorText, "scale-110 shadow-lg ring-4", themeRing) : 
                                                "border-slate-100 text-slate-200"
                                            )}>
                                                {step.done ? <CheckCircle2 className="w-5 h-5 fill-emerald-50" /> : 
                                                 step.current ? <span className="font-black text-sm">{i + 1}</span> :
                                                 <span className="font-black text-sm text-slate-200">{i + 1}</span>}
                                            </div>
                                            <div className="min-w-0">
                                                <p className={cn("text-[8px] font-black uppercase tracking-widest mb-0.5 md:mb-1", step.current ? themeColorText : "text-slate-900")}>{step.label}</p>
                                                <p className="text-[7px] font-bold text-slate-400 uppercase tracking-wide truncate">{step.date}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        {/* --- BEAUTIFIED INTELLIGENCE FEED --- */}
                        <div className="p-6 md:p-8 bg-white border border-slate-100 rounded-[24px] md:rounded-[32px] shadow-sm flex flex-col md:flex-row gap-8 md:gap-10">
                             <div className="flex-1">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-900/20", themeColorBg)}>
                                        <Activity className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Command Center</p>
                                        <h3 className="text-xl font-[1000] text-slate-900">Intelligence</h3>
                                    </div>
                                </div>
                                
                                <div className="space-y-6 relative pl-2">
                                    {/* Connector Line */}
                                    <div className="absolute left-[19px] top-4 bottom-4 w-px bg-slate-100 z-0" />

                                    {memberEvents.length > 0 ? (
                                        memberEvents.slice(0, 5).map((event) => {
                                            // 1. DATA CLEANING
                                            const rawDesc = event.description || "";
                                            const cleanDesc = rawDesc
                                                .replace(/\[SYSTEM LOG: .*?\]/g, "")
                                                .replace(/\[OFFICIAL.*?\]/g, "")
                                                .trim();
                                            
                                            // 2. GET STYLE CONFIG
                                            const style = getLogStyle(event.type, rawDesc);
                                            const Icon = style.icon;

                                            return (
                                                <motion.div 
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    key={event.id} 
                                                    className="relative z-10 pl-8 group"
                                                >
                                                    {/* Timeline Icon */}
                                                    <div className={cn(
                                                        "absolute left-0 top-0 w-9 h-9 rounded-full border-[4px] border-white flex items-center justify-center shadow-sm transition-transform group-hover:scale-110",
                                                        style.iconBg
                                                    )}>
                                                        <Icon className="w-4 h-4" />
                                                    </div>

                                                    {/* The "Beauty" Card */}
                                                    <div className={cn(
                                                        "p-4 rounded-2xl border transition-all hover:shadow-md",
                                                        style.theme
                                                    )}>
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className={cn("text-[9px] font-black uppercase tracking-widest opacity-70", style.accent)}>
                                                                {style.label}
                                                            </span>
                                                            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wide">
                                                                {format(new Date(event.startDate), "MMM d")}
                                                            </span>
                                                        </div>

                                                        {/* Main Content */}
                                                        <h4 className={cn("text-xs md:text-sm font-bold leading-snug", style.accent)}>
                                                            {cleanDesc || event.title}
                                                        </h4>
                                                        
                                                        {/* Decoration for Promotions */}
                                                        {style.label === "Rank Advancement" && (
                                                            <div className="mt-2 flex items-center gap-1.5">
                                                                <span className="px-2 py-0.5 bg-white/60 rounded-md text-[8px] font-black text-amber-600 border border-amber-100 uppercase tracking-wider">
                                                                    Official Record
                                                                </span>
                                                                <Sparkles className="w-3 h-3 text-amber-400 fill-current" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest pl-10 pt-2">No Recent Activity</div>
                                    )}
                                </div>
                             </div>

                             {/* RIGHT COLUMN: KEY OBJECTIVES */}
                             <div className="w-full md:w-[35%] pt-6 md:pt-0 border-t md:border-t-0 border-slate-100 flex flex-col">
                                <div className="flex items-center gap-2 mb-4">
                                    <Target className={cn("w-3 h-3", themeColorText)} />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Key Objectives</span>
                                </div>
                                
                                <div className="flex-1 bg-slate-50/50 border border-slate-100 rounded-2xl p-1 relative overflow-hidden group min-h-[160px]">
                                     <div className="absolute inset-0 flex flex-col items-center justify-center text-center opacity-40 group-hover:opacity-60 transition-opacity">
                                        <div className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-full flex items-center justify-center mb-2">
                                            <Target className="w-6 h-6 text-slate-300" />
                                        </div>
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">No Active Goals</span>
                                     </div>
                                </div>
                             </div>
                        </div>

                         <div className="space-y-3">
                             <div className="flex items-center gap-2 px-2">
                                <Award className="w-4 h-4 text-amber-500" />
                                <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Validated Accolades</span>
                             </div>
                             <div className="h-20 border border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-300 text-[9px] font-bold uppercase tracking-widest bg-white">
                                No Badges Awarded
                             </div>
                        </div>
                    </motion.div>
                )}

                {activeTab !== 'overview' && (
                    <div className="flex flex-col items-center justify-center h-64 text-center opacity-50">
                        <FileText className="w-12 h-12 text-slate-300 mb-4" />
                        <h3 className="text-lg font-black text-slate-900">Content Locked</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Access Restricted</p>
                    </div>
                )}
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