"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { 
  Users, Clock, AlertCircle, 
  Target, CheckSquare, X,
  Trophy, CalendarRange, ChevronRight,
  Activity, CalendarDays,
  ArrowRight, GraduationCap,
  BookOpen, Sparkles, User, Plus, Edit3, Trash2, FileText, CheckCircle2, Loader2,
  Zap, Shield, MessageSquare, Flag, Mountain, Rocket, Crosshair, LayoutList, Search,
  Gauge, DollarSign, Percent, Hash, Layers, Award, Vote
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isSameMonth, formatDistanceToNow, isFuture } from "date-fns";

// Firebase & Store Integration
import { useAppStore } from "@/lib/store/useStore";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";

// Shared Types & Components
import { CalendarEvent, TeamMember, EventType, getEventLabel } from "../calendar/_components/types";
import EventDetailSheet from "../calendar/_components/EventDetailSheet";
import OneOnOneSessionModal from "../calendar/_components/OneOnOneSessionModal";
import ClientPortal from "@/components/core/ClientPortal";
import { TeamCard } from "../team/_components/TeamCard"; 
import { MemberDetailSheet } from "../team/_components/MemberDetailSheet"; 
import StrategicVisionModal, { VisionPillar } from "./_components/StrategicVisionModal"; 

// --- REUSABLE UI COMPONENTS ---
const GlassCard = ({ children, className, onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) => (
  <motion.div 
    whileHover={onClick ? { scale: 1.02, y: -2 } : {}}
    whileTap={onClick ? { scale: 0.98 } : {}}
    onClick={onClick}
    className={cn(
      "bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-[24px] md:rounded-[32px] overflow-hidden relative transition-all duration-300", 
      onClick && "cursor-pointer hover:shadow-xl hover:border-slate-200",
      className
    )}
  >
    {children}
  </motion.div>
);

// UPDATED: Added Award & Vote Icons
const ActivityIcon = ({ type }: { type: EventType | 'System' }) => {
    switch (type) {
        case "Training": return <div className="w-8 h-8 rounded-xl bg-[#004F71]/10 flex items-center justify-center text-[#004F71] shadow-sm relative z-10 ring-4 ring-white"><Shield className="w-4 h-4" /></div>;
        case "Goal": return <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm relative z-10 ring-4 ring-white"><Target className="w-4 h-4" /></div>;
        case "Deadline": return <div className="w-8 h-8 rounded-xl bg-[#E51636]/10 flex items-center justify-center text-[#E51636] shadow-sm relative z-10 ring-4 ring-white"><Zap className="w-4 h-4" /></div>;
        case "OneOnOne": return <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shadow-sm relative z-10 ring-4 ring-white"><MessageSquare className="w-4 h-4" /></div>;
        
        // --- NEW TYPES ---
        case "Award": return <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-sm relative z-10 ring-4 ring-white"><Trophy className="w-4 h-4 fill-current" /></div>;
        case "Vote": return <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shadow-sm relative z-10 ring-4 ring-white"><Vote className="w-4 h-4" /></div>;

        default: return <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 shadow-sm relative z-10 ring-4 ring-white"><Activity className="w-4 h-4" /></div>;
    }
};

// --- NEW KPI CARD COMPONENT ---
const KPICard = ({ kpi, onClick }: { kpi: any, onClick: () => void }) => {
  return (
      <motion.div 
          whileHover={{ y: -4, scale: 1.01 }}
          onClick={onClick}
          className="relative flex flex-col rounded-[28px] md:rounded-[32px] overflow-hidden bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-200 transition-all duration-300 h-[200px] md:h-[220px] cursor-pointer group"
      >
           {/* Background Watermark */}
           <div className={cn("absolute top-[-20px] right-[-20px] p-6 opacity-[0.03] pointer-events-none transform rotate-12 transition-transform group-hover:scale-110 duration-700", kpi.color)}>
              <kpi.icon className="w-32 h-32 md:w-48 md:h-48" />
          </div>

          {/* Header */}
          <div className="flex justify-between items-start p-5 md:p-6 relative z-10">
              <div className="flex items-center gap-4">
                   <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center text-white shadow-lg", kpi.modalColor)}>
                       <kpi.icon className="w-5 h-5 md:w-6 md:h-6" />
                   </div>
                   <div>
                       <span className="inline-block text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                          {kpi.trend}
                       </span>
                       <h3 className="text-base md:text-lg font-[1000] text-slate-900 leading-none">
                           {kpi.label}
                       </h3>
                   </div>
              </div>
              <div className="p-2 rounded-full bg-slate-50 text-slate-300 group-hover:bg-[#004F71] group-hover:text-white transition-colors">
                   <ChevronRight className="w-4 h-4" />
              </div>
          </div>

          {/* Metric */}
          <div className="relative z-10 pl-5 md:pl-6 flex-1 flex flex-col justify-center">
               <div className="flex items-baseline gap-1">
                  <span className={cn("text-4xl md:text-5xl font-[1000] tracking-tighter", kpi.color)}>
                      {kpi.value}
                  </span>
              </div>
          </div>

          {/* Footer / Status Bar */}
          <div className="relative z-10 px-5 md:px-6 pb-5 md:pb-6">
               <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: "65%" }} 
                      transition={{ duration: 1.5, ease: "circOut" }}
                      className={cn("h-full rounded-full", kpi.modalColor)} 
                    />
               </div>
               <div className="flex justify-between mt-2">
                   <span className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Activity className="w-3 h-3" /> Live System Data</span>
               </div>
          </div>
      </motion.div>
  )
}

// --- KPI MODAL ---
interface KPIModalProps {
    title: string;
    items: { id: string; title: string; subtitle: string; icon?: any; status?: string, rawEvent?: CalendarEvent }[];
    onClose: () => void;
    color: string;
    icon: any;
    onItemClick?: (item: any) => void;
}

const KPIModal = ({ title, items, onClose, color, icon: Icon, onItemClick }: KPIModalProps) => {
    return (
        <ClientPortal>
            <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-4">
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    className="absolute inset-0 bg-[#0F172A]/60 backdrop-blur-md" 
                    onClick={onClose} 
                />
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0, y: 100 }} 
                    animate={{ scale: 1, opacity: 1, y: 0 }} 
                    exit={{ scale: 0.95, opacity: 0, y: 100 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="bg-[#F8FAFC] w-full md:w-[95%] max-w-2xl rounded-t-[32px] md:rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col h-[85vh] md:max-h-[85vh] border border-white/40 ring-1 ring-black/5"
                >
                    <div className={cn("p-6 md:p-8 pt-8 md:pt-10 text-white relative overflow-hidden shrink-0", color)}>
                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/20 rounded-full blur-[80px] pointer-events-none" />
                        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay" />
                        
                        <div className="relative z-10 flex items-start justify-between">
                            <div className="flex items-center gap-4 md:gap-5">
                                <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-white/10 border border-white/20 backdrop-blur-md shadow-2xl flex items-center justify-center">
                                    <Icon className="w-6 h-6 md:w-8 md:h-8 text-white drop-shadow-md" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-white/80">System Record</span>
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-[1000] tracking-tighter leading-none">{title}</h2>
                                    <p className="text-white/60 font-medium text-xs md:text-sm mt-1">{items.length} Active Entries</p>
                                </div>
                            </div>
                            <button 
                                onClick={onClose} 
                                className="p-2 md:p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white border border-white/10 active:scale-90"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    
                    <div className="px-4 md:px-6 py-4 bg-white border-b border-slate-100 flex items-center gap-3 sticky top-0 z-20">
                        <Search className="w-4 h-4 text-slate-400" />
                        <input type="text" placeholder={`Search ${title}...`} className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-300" />
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 bg-[#F8FAFC]">
                        {items.length > 0 ? (
                            items.map((item, i) => (
                                <motion.div 
                                    initial={{ opacity: 0, x: -20 }} 
                                    animate={{ opacity: 1, x: 0 }} 
                                    transition={{ delay: i * 0.04 }}
                                    key={item.id} 
                                    onClick={() => onItemClick && onItemClick(item)}
                                    className={cn(
                                        "group bg-white p-4 rounded-[20px] border border-slate-100 shadow-sm flex items-center gap-4 md:gap-5 hover:shadow-xl hover:border-slate-200 transition-all relative overflow-hidden",
                                        onItemClick && "cursor-pointer active:scale-[0.98]"
                                    )}
                                >
                                    <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", color)} />

                                    <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-base md:text-lg shadow-inner shrink-0 transition-transform group-hover:scale-110", color.replace('bg-', 'bg-').replace('600', '50').replace('#', ''))}>
                                        <div className={cn("opacity-10 absolute inset-0", color)} />
                                        <span className={cn("relative z-10", color.replace('bg-', 'text-'))}>
                                            {item.icon ? <item.icon className="w-5 h-5 md:w-6 md:h-6" /> : item.title.charAt(0)}
                                        </span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <p className="text-sm font-[800] text-slate-900 truncate group-hover:text-[#E51636] transition-colors">{item.title}</p>
                                            {item.status && (
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-md text-[7px] md:text-[8px] font-black uppercase tracking-wider border",
                                                    item.status === 'High' || item.status === 'FOH' 
                                                        ? "bg-blue-50 text-[#004F71] border-blue-100" 
                                                        : "bg-slate-50 text-slate-500 border-slate-100"
                                                )}>
                                                    {item.status}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] md:text-[11px] font-bold text-slate-400 truncate uppercase tracking-wide flex items-center gap-1.5">
                                            {item.subtitle}
                                        </p>
                                    </div>

                                    {onItemClick && (
                                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-[#E51636] group-hover:text-white transition-colors shadow-sm">
                                            <ChevronRight className="w-4 h-4" />
                                        </div>
                                    )}
                                </motion.div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 rounded-[32px] mx-4">
                                <div className="p-4 bg-slate-100 rounded-full mb-3"><Activity className="w-6 h-6 opacity-50" /></div>
                                <p className="text-[10px] font-bold uppercase tracking-widest">System Empty</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="p-4 bg-white border-t border-slate-100 flex justify-between items-center text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest px-6 md:px-8">
                        <span>Synced: {new Date().toLocaleTimeString()}</span>
                        <span>v4.2.0</span>
                    </div>
                </motion.div>
            </div>
        </ClientPortal>
    );
};

// --- DYNAMIC STRATEGIC VISION BOARD ---
const StrategicVisionBoard = ({ pillars, onUpdate }: { pillars: VisionPillar[], onUpdate: () => void }) => {
    const ICONS: any = { Zap, Mountain, Target, Gauge, Users, DollarSign, Trophy };
    
    const getColors = (color: string) => {
        const map: any = {
            cyan: { text: "text-cyan-300", bg: "bg-cyan-500/10", border: "border-cyan-500/20", bar: "from-cyan-400 to-blue-500" },
            emerald: { text: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/20", bar: "from-emerald-400 to-emerald-600" },
            red: { text: "text-red-300", bg: "bg-red-500/10", border: "border-red-500/20", bar: "from-red-500 to-orange-500" },
            amber: { text: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/20", bar: "from-amber-400 to-yellow-500" },
            violet: { text: "text-violet-300", bg: "bg-violet-500/10", border: "border-violet-500/20", bar: "from-violet-400 to-fuchsia-500" },
            rose: { text: "text-rose-300", bg: "bg-rose-500/10", border: "border-rose-500/20", bar: "from-rose-400 to-pink-500" },
        };
        return map[color] || map.cyan;
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="bg-[#004F71] rounded-[32px] md:rounded-[40px] p-6 md:p-8 text-white shadow-2xl relative overflow-hidden group isolate"
        >
            <div className="absolute -top-[150px] -right-[150px] w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-gradient-to-b from-[#E51636] via-[#E51636]/40 to-transparent opacity-30 blur-[100px] md:blur-[120px] rounded-full pointer-events-none mix-blend-screen animate-pulse duration-[5000ms]" />
            <div className="absolute -bottom-[200px] -left-[100px] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-[#06b6d4] opacity-10 blur-[80px] md:blur-[100px] rounded-full pointer-events-none mix-blend-screen" />
            
            <div className="relative z-10 flex flex-col h-full justify-between space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-md shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center justify-center shrink-0">
                            <Rocket className="w-6 h-6 text-white drop-shadow-md" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-2xl md:text-3xl font-[1000] tracking-tighter leading-none text-white drop-shadow-sm">Strategic Vision</h2>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-0.5 bg-gradient-to-r from-[#E51636] to-transparent rounded-full" />
                                <p className="text-[10px] font-bold text-blue-100 uppercase tracking-[0.3em]">Command Directives</p>
                            </div>
                        </div>
                    </div>
                    <button onClick={onUpdate} className="flex group/btn relative px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10 transition-all overflow-hidden items-center gap-2 hover:border-white/30 hover:scale-105 active:scale-95">
                        <span className="relative z-10">{pillars.length > 0 ? "Update Vision" : "Initialize"}</span>
                        <ChevronRight className="w-3 h-3 relative z-10 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                </div>

                {pillars.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pillars.map(pillar => {
                            const style = getColors(pillar.color);
                            const Icon = ICONS[pillar.icon] || Target;
                            const target = pillar.target || 100;
                            const progress = Math.min(100, Math.max(0, (pillar.current / target) * 100));
                            const isAuto = pillar.source && pillar.source !== 'manual';

                            return (
                                <motion.div 
                                    key={pillar.id} 
                                    className="relative bg-white/5 border border-white/10 rounded-[32px] overflow-hidden backdrop-blur-sm hover:bg-white/10 transition-colors group/card h-[220px]"
                                >
                                    <div className="absolute inset-0 p-6 flex flex-col justify-between">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-4">
                                                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg", style.bg, style.border)}>
                                                    <Icon className="w-6 h-6 fill-current" />
                                                </div>
                                                <div>
                                                    <span className="inline-block text-[9px] font-black uppercase tracking-widest text-blue-200 mb-0.5">
                                                        {pillar.subtitle || "METRIC"}
                                                    </span>
                                                    <h3 className="text-lg font-[1000] text-white leading-tight">
                                                        {pillar.title}
                                                    </h3>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="flex items-baseline justify-center gap-1">
                                                <span className="text-5xl font-[1000] tracking-tighter drop-shadow-sm text-white">
                                                    {pillar.current}
                                                </span>
                                                <span className="text-xs font-bold text-blue-200 uppercase">
                                                    / {target} {pillar.unit === '%' && '%'}
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${progress}%` }}
                                                    transition={{ duration: 1.5, ease: "circOut" }}
                                                    className={cn("h-full rounded-full relative bg-gradient-to-r", style.bar)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-white/10 rounded-[32px] bg-white/5">
                        <div className="p-4 bg-white/10 rounded-full mb-4 shadow-lg animate-pulse">
                            <Layers className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-xl font-black text-white mb-2">No Active Directives</h3>
                        <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-6 text-center max-w-xs">
                            System is currently awaiting strategic configuration.
                        </p>
                        <button 
                            onClick={onUpdate}
                            className="px-8 py-3 bg-white text-[#004F71] rounded-full font-black text-[10px] uppercase tracking-[0.2em] hover:scale-105 transition-transform shadow-xl"
                        >
                            Initialize System
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

// --- MAIN PAGE ---

export default function DashboardPage() {
  const { events, team, loading, subscribeEvents, subscribeTeam, currentUser } = useAppStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Modals & State
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selected1on1, setSelected1on1] = useState<CalendarEvent | null>(null);
  const [activeKPI, setActiveKPI] = useState<{ title: string; items: any[]; color: string; icon: any } | null>(null);
  
  const [visionPillars, setVisionPillars] = useState<VisionPillar[]>([]);
  const [isVisionModalOpen, setIsVisionModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "curriculum" | "performance" | "documents">("overview");

  // Mobile Tabs
  const [mobileTab, setMobileTab] = useState<'live' | 'next'>('live');
  const scrollRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLDivElement>(null);

  // --- DATA SUBSCRIPTIONS ---
  useEffect(() => {
    const unsubEvents = subscribeEvents();
    const unsubTeam = subscribeTeam();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    // Subscribe to Vision Config
    const unsubVision = onSnapshot(doc(db, "vision", "current"), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.pillars) setVisionPillars(data.pillars);
        } else {
             setVisionPillars([]); // EMPTY STATE ON FRESH LOAD
        }
    });

    return () => { unsubEvents(); unsubTeam(); unsubVision(); clearInterval(timer); };
  }, [subscribeEvents, subscribeTeam]);

  // --- CALCULATE LIVE METRICS ---
  const calculatedPillars = useMemo(() => {
    const currentMonth1on1s = events.filter(e => e.type === "OneOnOne" && e.status === "Done" && isSameMonth(e.startDate, new Date())).length;
    const activeGoalsCount = events.filter(e => e.type === "Goal" && e.status !== "Done").length;
    const leaderCount = team.filter(m => m.status === "Team Leader" || m.status === "Director" || m.status === "Assistant Director").length;
    const totalProgress = team.reduce((acc, curr) => acc + (curr.progress || 0), 0);
    const avgTraining = team.length > 0 ? Math.round(totalProgress / team.length) : 0;

    return visionPillars.map(p => {
        let liveVal = p.current;
        if (p.source === 'system_1on1') liveVal = currentMonth1on1s;
        if (p.source === 'system_active_goals') liveVal = activeGoalsCount;
        if (p.source === 'system_leaders') liveVal = leaderCount;
        if (p.source === 'system_training_avg') liveVal = avgTraining;
        if (p.source === 'system_member_progress' && p.linkedMemberId) {
            const member = team.find(m => m.id === p.linkedMemberId);
            if (member) liveVal = member.progress || 0;
        }
        return { ...p, current: liveVal };
    });
  }, [visionPillars, events, team]);


  // --- KPIS (Refined) ---
  const kpis = useMemo(() => {
    const certifiedLeaders = team.filter(m => m.status === "Director" || m.status === "Assistant Director");
    const monthlyOneOnOnes = events.filter(e => e.type === "OneOnOne" && isSameMonth(e.startDate, new Date()));
    const activeGoals = events.filter(e => e.type === "Goal" && e.status !== "Done");

    return [
      { id: "leaders", label: "Certified Leaders", value: certifiedLeaders.length.toString(), icon: GraduationCap, color: "text-[#004F71]", modalColor: "bg-[#004F71]", trend: "Live Count", data: certifiedLeaders.map(l => ({ id: l.id, title: l.name, subtitle: l.role, icon: User, status: l.dept })) },
      { id: "1on1s", label: "1-on-1s (MTD)", value: monthlyOneOnOnes.length.toString(), icon: Users, color: "text-purple-600", modalColor: "bg-purple-600", trend: "Monthly Cadence", data: monthlyOneOnOnes.map(e => ({ id: e.id, title: e.title, subtitle: `with ${e.teamMemberName}`, icon: MessageSquare, status: e.status, rawEvent: e })) },
      { id: "goals", label: "Active Goals", value: activeGoals.length.toString(), icon: Target, color: "text-[#E51636]", modalColor: "bg-[#E51636]", trend: "Strategic Focus", data: activeGoals.map(g => ({ id: g.id, title: g.title, subtitle: `Assigned to ${g.assigneeName}`, icon: Target, status: g.priority, rawEvent: g })) },
      { id: "roster", label: "Total Roster", value: team.length.toString(), icon: Activity, color: "text-emerald-600", modalColor: "bg-emerald-600", trend: "Headcount", data: team.map(t => ({ id: t.id, title: t.name, subtitle: t.role, icon: User, status: t.dept })) },
    ];
  }, [team, events]);
  
  const activityFeed = useMemo(() => {
      return [...events].sort((a, b) => {
          const aCreated = (a as any).createdAt;
          const bCreated = (b as any).createdAt;
          const dateA = aCreated?.toDate ? aCreated.toDate() : new Date(a.startDate);
          const dateB = bCreated?.toDate ? bCreated.toDate() : new Date(b.startDate);
          return dateB.getTime() - dateA.getTime();
      }).slice(0, 8); 
  }, [events]);

  const nextSession = useMemo(() => {
    return events.filter(e => e.type === "OneOnOne" && isFuture(e.startDate)).sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0];
  }, [events]);

  const handleDeleteEvent = async (id: string) => { const loadToast = toast.loading("Decommissioning..."); try { await deleteDoc(doc(db, "events", id)); toast.success("Terminated", { id: loadToast }); setSelectedEvent(null); } catch (e) { toast.error("Error", { id: loadToast }); } };
  const handleUpdateEvent = async (id: string, updates: any) => { const loadToast = toast.loading("Updating..."); try { await updateDoc(doc(db, "events", id), { ...updates, updatedAt: serverTimestamp() }); toast.success("Synced", { id: loadToast }); setSelectedEvent(null); } catch (e) { toast.error("Error", { id: loadToast }); } };
  const handleUpdate1on1 = async (updatedEvent: CalendarEvent) => { const loadToast = toast.loading("Updating Session..."); try { await updateDoc(doc(db, "events", updatedEvent.id), { description: updatedEvent.description, subtasks: updatedEvent.subtasks, status: updatedEvent.status, updatedAt: serverTimestamp() }); toast.success("Session Updated", { id: loadToast }); setSelected1on1(null); } catch (e) { toast.error("Error", { id: loadToast }); } };
  const handleKPIItemClick = (item: any) => { if (item.rawEvent) { if (item.rawEvent.type === "OneOnOne") { setSelected1on1(item.rawEvent); } else { setSelectedEvent(item.rawEvent); } } };
  
  // Handlers
  const scrollToSection = (section: 'live' | 'next') => {
      if (!scrollRef.current) return;
      if (section === 'live') {
          feedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } else {
          nextRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
  };

  const myProfile = useMemo(() => {
    return team.find(m => m.id === currentUser?.uid);
  }, [team, currentUser]);

  // --- RENDER LOGIC ---
  if (currentUser?.role === "Team Member") {
    return (
        <div className="min-h-screen bg-[#F8FAFC] p-6 flex flex-col items-center justify-center">
            <div className="text-center mb-8 animate-fade-in">
                <h1 className="text-3xl font-[1000] text-slate-900 tracking-tighter mb-2">Welcome Back</h1>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">TrainingBook Operative</p>
            </div>
            {myProfile ? (
                 <div className="w-full max-w-sm perspective-1000">
                     <TeamCard 
                        member={myProfile} 
                        onClick={() => setSelectedMember(myProfile)} 
                        onAssignClick={() => {}} 
                        onDragStart={() => {}}
                        onDragEnd={() => {}}
                        isDragging={false}
                     />
                 </div>
            ) : (
                <div className="p-8 bg-white rounded-3xl shadow-sm text-center border border-slate-100">
                    <Loader2 className="w-8 h-8 text-[#E51636] animate-spin mx-auto mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Profile Synchronizing...</p>
                </div>
            )}
            <AnimatePresence>
                {selectedMember && (
                    <MemberDetailSheet 
                        member={selectedMember} 
                        onClose={() => setSelectedMember(null)}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                    />
                )}
            </AnimatePresence>
        </div>
    );
  }
  
  if (loading && team.length === 0) return <div className="h-screen flex flex-col items-center justify-center bg-[#F8FAFC] gap-4"><Loader2 className="w-10 h-10 animate-spin text-[#E51636]" /><p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Synchronizing Operations...</p></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-6 pb-32 font-sans text-slate-900 relative overflow-hidden">
        {/* Background Blurs */}
        <div className="fixed inset-0 pointer-events-none">
            <div className="absolute top-[-20%] left-[-10%] w-[800px] md:w-[1400px] h-[800px] md:h-[1400px] bg-gradient-to-br from-blue-50/40 via-purple-50/20 to-transparent rounded-full blur-[100px] md:blur-[150px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[600px] md:w-[1000px] h-[600px] md:h-[1000px] bg-gradient-to-tl from-red-50/30 to-transparent rounded-full blur-[100px] md:blur-[150px]" />
        </div>

        <div className="max-w-[1400px] mx-auto relative z-10 space-y-6 md:space-y-8 mt-4 md:mt-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-1">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                        <div className="px-3 py-1 bg-white border border-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm flex items-center justify-center md:justify-start gap-2 w-fit">
                            <CalendarDays className="w-3 h-3 text-[#E51636]" />
                            {format(currentTime, "EEEE, MMMM do")}
                            <div className="w-px h-3 bg-slate-200 mx-1 hidden md:block" />
                            <span className="tabular-nums text-slate-900">{format(currentTime, "h:mm aa")}</span>
                        </div>
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#004F71] border border-[#004F71] rounded-full text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-900/20 w-fit">
                            <Sparkles className="w-2.5 h-2.5 fill-current" />
                            Command Center
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 leading-tight">
                        Ops<span className="text-[#E51636]">Overview</span>
                    </h1>
                </motion.div>
            </div>
            
            {/* THE SMART VISION BOARD */}
            <StrategicVisionBoard pillars={calculatedPillars} onUpdate={() => setIsVisionModalOpen(true)} />

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map((kpi, idx) => (
                    <KPICard 
                        key={idx} 
                        kpi={kpi} 
                        onClick={() => setActiveKPI({ title: kpi.label, items: kpi.data, color: kpi.modalColor, icon: kpi.icon })} 
                    />
                ))}
            </div>

            {/* --- MOBILE TABS HEADER --- */}
            <div className="flex lg:hidden items-center gap-6 px-1 mb-2">
                <button onClick={() => scrollToSection('live')} className={cn("text-lg font-black transition-colors relative", mobileTab === 'live' ? "text-slate-900" : "text-slate-300")}>
                    Live Feed
                    {mobileTab === 'live' && <motion.div layoutId="mobileTab" className="absolute -bottom-1 left-0 right-0 h-1 bg-[#E51636] rounded-full" />}
                </button>
                <button onClick={() => scrollToSection('next')} className={cn("text-lg font-black transition-colors relative", mobileTab === 'next' ? "text-slate-900" : "text-slate-300")}>
                    Up Next
                    {mobileTab === 'next' && <motion.div layoutId="mobileTab" className="absolute -bottom-1 left-0 right-0 h-1 bg-[#E51636] rounded-full" />}
                </button>
            </div>

            {/* --- HORIZONTAL SCROLL CONTAINER FOR MOBILE --- */}
            <div 
                ref={scrollRef}
                className="flex lg:grid lg:grid-cols-12 gap-4 lg:gap-6 overflow-x-auto lg:overflow-visible snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] -mx-4 px-4 pb-8 lg:mx-0 lg:px-0 lg:pb-0"
            >
            
            {/* LIVE FEED PANEL */}
            <div ref={feedRef} className="min-w-[90vw] md:min-w-[50vw] lg:min-w-0 col-span-12 lg:col-span-8 lg:col-start-1 lg:row-start-1 flex flex-col gap-4 snap-center h-fit">
                <div className="hidden lg:flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <LayoutList className="w-4 h-4 text-[#E51636]" />
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">Live Operational Feed</h3>
                    </div>
                    <div className="px-2 py-0.5 bg-white border border-slate-100 rounded-full text-[8px] font-black uppercase tracking-widest text-slate-400">Real-time</div>
                </div>

                <div className="bg-white border border-slate-100 lg:bg-transparent lg:border-0 rounded-[32px] p-4 lg:p-0 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] lg:shadow-none relative h-full">
                    <div className="lg:hidden absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1 bg-slate-200 rounded-full mb-4 opacity-50" />
                    <div className="relative pl-6 lg:pl-0 mt-4 lg:mt-0">
                        <div className="absolute left-[15px] top-4 bottom-4 w-[2px] bg-slate-100 lg:hidden" />
                        <div className="grid grid-cols-1 gap-3 md:gap-3">
                            <AnimatePresence>
                                {activityFeed.map((event, i) => {
                                    const isDone = event.status === "Done";
                                    return (
                                        <motion.div 
                                            key={event.id}
                                            layoutId={`event-card-${event.id}`}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            onClick={() => { if(event.type === 'OneOnOne') setSelected1on1(event); else setSelectedEvent(event); }}
                                            transition={{ delay: i * 0.05 }}
                                            className="group relative bg-white lg:bg-white p-3 md:p-4 rounded-[20px] md:rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-300 flex items-start gap-3 md:gap-4 overflow-hidden cursor-pointer"
                                        >
                                            <div className={cn("hidden lg:block absolute left-0 top-0 bottom-0 w-1 transition-colors", event.priority === 'High' ? "bg-[#E51636]" : "bg-[#004F71]/50")} />
                                            <div className="lg:hidden absolute -left-[25px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white bg-slate-300 z-10" />
                                            <ActivityIcon type={event.type} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <div className="flex items-center gap-2"><span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-400">{getEventLabel(event.type)}</span>{isDone && <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[7px] font-black uppercase tracking-wider">Completed</span>}</div>
                                                    <span className="text-[8px] md:text-[9px] font-bold text-slate-300">{formatDistanceToNow(event.startDate)} ago</span>
                                                </div>
                                                <h4 className="text-sm md:text-base font-bold text-slate-900 leading-snug truncate group-hover:text-[#004F71] transition-colors">{event.title}</h4>
                                                <div className="flex items-center gap-1.5 mt-1.5">
                                                    <div className="w-4 h-4 rounded-md bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-500">{event.assigneeName.charAt(0)}</div>
                                                    <span className="text-[10px] font-medium text-slate-500 truncate max-w-[100px]">{event.assigneeName}</span>
                                                    <ArrowRight className="w-3 h-3 text-slate-300" />
                                                    <span className="text-[10px] font-medium text-slate-500 truncate max-w-[100px]">{event.teamMemberName || "Team"}</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>

            {/* UP NEXT PANEL */}
            <div ref={nextRef} className="min-w-[90vw] md:min-w-[50vw] lg:min-w-0 col-span-12 lg:col-span-4 lg:col-start-9 flex flex-col gap-4 lg:sticky lg:top-24 snap-center h-fit">
                <div className="hidden lg:flex items-center gap-2 px-1 mb-1">
                    <Clock className="w-4 h-4 text-[#004F71]" />
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Up Next</h3>
                </div>
                
                <GlassCard className="w-full p-6 md:p-8 flex flex-col bg-[#004F71] text-white border-0 shadow-xl relative overflow-hidden group min-h-[300px] md:min-h-[360px] snap-center">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/10 transition-colors duration-700" />
                    <div className="flex items-center justify-between relative z-10 mb-6 md:mb-8">
                        <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/10 shadow-inner"><BookOpen className="w-5 h-5" /></div>
                        <div className="px-2.5 py-1 bg-white/10 rounded-full text-[8px] font-black uppercase tracking-widest border border-white/5">Priority</div>
                    </div>

                    {nextSession ? (
                        <div className="mt-auto space-y-4 md:space-y-6 relative z-10">
                            <div>
                                <p className="text-[9px] font-black uppercase text-blue-200 tracking-[0.2em] mb-1">Upcoming Session</p>
                                <p className="text-2xl md:text-3xl font-black leading-none mb-1">{nextSession.assigneeName}</p>
                                <p className="text-xs md:text-sm text-blue-100 opacity-60 font-medium">with {nextSession.teamMemberName || "Team Member"}</p>
                            </div>
                            <div className="flex items-center gap-4 py-3 border-t border-white/10">
                                <div className="text-center"><p className="text-lg md:text-xl font-black leading-none">{format(nextSession.startDate, "d")}</p><p className="text-[8px] font-bold uppercase text-blue-200 mt-1">{format(nextSession.startDate, "MMM")}</p></div>
                                <div className="w-px h-6 bg-white/10" />
                                <div><p className="text-sm md:text-base font-bold leading-none">{format(nextSession.startDate, "h:mm a")}</p><p className="text-[8px] font-bold uppercase text-blue-200 mt-1">Start Time</p></div>
                            </div>
                            <button onClick={() => setSelected1on1(nextSession)} className="w-full py-3 md:py-4 bg-white text-[#004F71] rounded-[20px] font-black uppercase text-[10px] tracking-[0.2em] shadow-lg hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-3">Launch Prep <ArrowRight className="w-3.5 h-3.5" /></button>
                        </div>
                    ) : (
                        <div className="mt-auto text-center pb-8 relative z-10 flex flex-col items-center"><CheckCircle2 className="w-16 h-16 mb-4 opacity-20" /><p className="text-xs font-bold uppercase tracking-widest opacity-40">All sessions logged</p></div>
                    )}
                </GlassCard>
            </div>
        </div>
        </div>

        {/* ... (Modals) ... */}
        <AnimatePresence>{selectedEvent && <EventDetailSheet event={selectedEvent} onClose={() => setSelectedEvent(null)} onDelete={handleDeleteEvent} onUpdate={handleUpdateEvent} />}</AnimatePresence>
        <AnimatePresence>{selected1on1 && <OneOnOneSessionModal event={selected1on1} onClose={() => setSelected1on1(null)} onUpdate={handleUpdate1on1} />}</AnimatePresence>
        <AnimatePresence>{activeKPI && <KPIModal title={activeKPI.title} items={activeKPI.items} color={activeKPI.color} icon={activeKPI.icon} onClose={() => setActiveKPI(null)} onItemClick={handleKPIItemClick} />}</AnimatePresence>
        
        {/* STRATEGIC VISION MODAL */}
        <AnimatePresence>
            {isVisionModalOpen && (
                <StrategicVisionModal 
                    isOpen={isVisionModalOpen} 
                    onClose={() => setIsVisionModalOpen(false)} 
                    currentPillars={visionPillars} 
                />
            )}
        </AnimatePresence>
    </div>
  );
}