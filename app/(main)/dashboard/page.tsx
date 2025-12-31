"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence, LayoutGroup, Variants } from "framer-motion"; 
import { 
  Users, Clock, AlertCircle, 
  Target, CheckSquare, X,
  Trophy, CalendarRange, ChevronRight,
  Activity, CalendarDays,
  ArrowRight, GraduationCap,
  BookOpen, Sparkles, User, Plus, Edit3, Trash2, FileText, CheckCircle2, Loader2,
  Zap, Shield, MessageSquare, Flag, Mountain, Rocket, Crosshair, LayoutList, Search,
  Gauge, DollarSign, Percent, Hash, Layers, Award, Vote, Star
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
import { useTaskMap } from "@/lib/hooks/useTaskMap";

// --- HELPER: LIVE TIME AGO ---
const TimeAgo = ({ date }: { date: Date }) => {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const update = () => setLabel(formatDistanceToNow(date, { addSuffix: true }));
    update();
    const timer = setInterval(update, 60000); // Update every minute
    return () => clearInterval(timer);
  }, [date]);
  return <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{label}</span>;
};

// --- HELPER: CONTEXTUAL ICONS ---
const FeedIcon = ({ type, priority }: { type: string, priority: string }) => {
  const config = useMemo(() => {
    switch (type) {
      case "Training": return { icon: Shield, bg: "bg-blue-50", text: "text-blue-600", ring: "ring-blue-100" };
      case "Goal": return { icon: Target, bg: "bg-emerald-50", text: "text-emerald-600", ring: "ring-emerald-100" };
      case "Deadline": return { icon: Zap, bg: "bg-red-50", text: "text-red-600", ring: "ring-red-100" };
      case "OneOnOne": return { icon: MessageSquare, bg: "bg-purple-50", text: "text-purple-600", ring: "ring-purple-100" };
      case "Award": return { icon: Trophy, bg: "bg-amber-50", text: "text-amber-600", ring: "ring-amber-100" };
      case "Vote": return { icon: Vote, bg: "bg-slate-100", text: "text-slate-500", ring: "ring-slate-200" };
      default: return { icon: Activity, bg: "bg-slate-50", text: "text-slate-500", ring: "ring-slate-100" };
    }
  }, [type]);

  const Icon = config.icon;

  return (
    <div className={cn(
      "relative z-10 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-all duration-300 ring-4 ring-white",
      config.bg, config.text,
      priority === 'High' && "ring-red-50 ring-offset-2 ring-offset-white"
    )}>
      <Icon className="w-5 h-5" />
      {priority === 'High' && (
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
        </span>
      )}
    </div>
  );
};

// --- COMPONENT: KPI CARD ---
const KPICard = ({ kpi, onClick }: { kpi: any, onClick: () => void }) => {
  return (
      <motion.div 
          whileHover={{ y: -4, scale: 1.01 }}
          onClick={onClick}
          className="relative flex flex-col rounded-[24px] md:rounded-[32px] overflow-hidden bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-200 transition-all duration-300 h-[160px] md:h-[220px] cursor-pointer group"
      >
           {/* Background Watermark */}
           <div className={cn("absolute top-[-20px] right-[-20px] p-6 opacity-[0.03] pointer-events-none transform rotate-12 transition-transform group-hover:scale-110 duration-700", kpi.color)}>
              <kpi.icon className="w-24 h-24 md:w-48 md:h-48" />
          </div>

          {/* Header */}
          <div className="flex justify-between items-start p-4 md:p-6 relative z-10">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 w-full">
                   <div className={cn("w-8 h-8 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0", kpi.modalColor)}>
                       <kpi.icon className="w-4 h-4 md:w-6 md:h-6" />
                   </div>
                   
                   <div className="min-w-0 w-full">
                       <span className="block text-[7px] md:text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5 truncate w-full">
                          {kpi.trend}
                       </span>
                       <h3 className="text-[10px] md:text-lg font-[1000] text-slate-900 leading-tight w-full line-clamp-2 md:line-clamp-1 break-words">
                           {kpi.label}
                       </h3>
                   </div>
              </div>
              <div className="hidden md:block p-2 rounded-full bg-slate-50 text-slate-300 group-hover:bg-[#004F71] group-hover:text-white transition-colors shrink-0">
                   <ChevronRight className="w-4 h-4" />
              </div>
          </div>

          {/* Metric */}
          <div className="relative z-10 pl-4 md:pl-6 flex-1 flex flex-col justify-center">
               <div className="flex items-baseline gap-1">
                  <span className={cn("text-3xl md:text-5xl font-[1000] tracking-tighter", kpi.color)}>
                      {kpi.value}
                  </span>
              </div>
          </div>

          {/* Footer / Status Bar */}
          <div className="relative z-10 px-4 md:px-6 pb-4 md:pb-6 mt-auto">
               <div className="h-1 md:h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: "65%" }} 
                      transition={{ duration: 1.5, ease: "circOut" }}
                      className={cn("h-full rounded-full", kpi.modalColor)} 
                    />
               </div>
               <div className="hidden md:flex justify-between mt-2">
                   <span className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Activity className="w-3 h-3" /> Live System Data</span>
               </div>
          </div>
      </motion.div>
  )
}

// --- COMPONENT: KPI MODAL (DRILLDOWN) ---
interface KPIModalProps {
    title: string;
    items: { id: string; title: string; subtitle: string; icon?: any; status?: string, rawEvent?: CalendarEvent }[];
    onClose: () => void;
    color: string;
    icon: any;
    onItemClick?: (item: any) => void;
}

const KPIModal = ({ title, items, onClose, color, icon: Icon, onItemClick }: KPIModalProps) => {
    // --- DYNAMIC THEME ENGINE ---
    const getThemeStyles = (bgClass: string) => {
        if (bgClass.includes("#004F71")) return { 
            gradient: "from-[#004F71] to-[#003855]", 
            iconText: "text-[#004F71]", 
            border: "group-hover:border-[#004F71]/30",
            hoverBg: "group-hover:bg-[#004F71]",
            lightBg: "bg-blue-50"
        };
        if (bgClass.includes("purple")) return { 
            gradient: "from-purple-600 to-indigo-700", 
            iconText: "text-purple-600",
            border: "group-hover:border-purple-200",
            hoverBg: "group-hover:bg-purple-600",
            lightBg: "bg-purple-50"
        };
        if (bgClass.includes("#E51636")) return { 
            gradient: "from-[#E51636] to-[#b30f28]", 
            iconText: "text-[#E51636]",
            border: "group-hover:border-[#E51636]/30",
            hoverBg: "group-hover:bg-[#E51636]",
            lightBg: "bg-red-50"
        };
        if (bgClass.includes("emerald")) return { 
            gradient: "from-emerald-600 to-teal-700", 
            iconText: "text-emerald-600",
            border: "group-hover:border-emerald-200",
            hoverBg: "group-hover:bg-emerald-600",
            lightBg: "bg-emerald-50"
        };
        return { 
            gradient: "from-slate-700 to-slate-900", 
            iconText: "text-slate-600",
            border: "group-hover:border-slate-200",
            hoverBg: "group-hover:bg-slate-600",
            lightBg: "bg-slate-50"
        };
    };

    const theme = getThemeStyles(color);
    const [search, setSearch] = useState("");

    const filteredItems = items.filter(i => 
        i.title.toLowerCase().includes(search.toLowerCase()) || 
        i.subtitle.toLowerCase().includes(search.toLowerCase())
    );

    const backdropVariants: Variants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.2 } },
        exit: { opacity: 0, transition: { duration: 0.2, delay: 0.1 } } 
    };

    const modalVariants: Variants = {
        hidden: { y: "100%", opacity: 1 },
        visible: { y: 0, opacity: 1, transition: { type: "spring", damping: 25, stiffness: 300 } },
        exit: { y: "100%", opacity: 1, transition: { duration: 0.2 } }
    };

    return (
        <ClientPortal>
            <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-4 isolate">
                <motion.div 
                    variants={backdropVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="absolute inset-0 bg-[#0F172A]/60 backdrop-blur-md -z-10 pointer-events-auto" 
                    onClick={onClose} 
                />
                
                <motion.div 
                    variants={modalVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="pointer-events-auto bg-[#F8FAFC] w-full md:w-[95%] max-w-2xl rounded-t-[40px] md:rounded-[48px] shadow-2xl relative overflow-hidden flex flex-col h-[90vh] md:max-h-[85vh] border border-white/20 ring-1 ring-black/5 z-10"
                >
                    {/* --- HEADER --- */}
                    <div className={cn("p-8 pt-10 text-white relative overflow-hidden shrink-0 bg-gradient-to-br", theme.gradient)}>
                        {/* Noise Texture */}
                        <div className="absolute inset-0 opacity-[0.08] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-overlay" />
                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-[80px] pointer-events-none" />
                        
                        <div className="relative z-10">
                            <div className="flex items-start justify-between mb-8">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 backdrop-blur-md">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/90">System Record</span>
                                </div>
                                <button 
                                    onClick={onClose} 
                                    className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white border border-white/10 active:scale-90"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-[24px] bg-white/20 border border-white/30 backdrop-blur-md shadow-2xl flex items-center justify-center shrink-0">
                                    <Icon className="w-8 h-8 text-white drop-shadow-md" />
                                </div>
                                <div>
                                    <h2 className="text-3xl md:text-4xl font-[1000] tracking-tighter leading-none mb-1">{title}</h2>
                                    <p className="text-white/70 font-bold text-xs md:text-sm uppercase tracking-wider">{items.length} Active Entries</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* --- SEARCH --- */}
                    <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center gap-3 sticky top-0 z-20 shadow-sm">
                        <Search className="w-5 h-5 text-slate-400" />
                        <input 
                            autoFocus
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            type="text" 
                            placeholder={`Search in ${title}...`} 
                            className="w-full bg-transparent text-base font-bold text-slate-700 outline-none placeholder:text-slate-300" 
                        />
                    </div>

                    {/* --- LIST --- */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 bg-[#F8FAFC] custom-scrollbar">
                        {filteredItems.length > 0 ? (
                            <AnimatePresence mode="popLayout">
                                {filteredItems.map((item, i) => (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }} 
                                        animate={{ opacity: 1, y: 0 }} 
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: i * 0.03 }}
                                        key={item.id} 
                                        onClick={() => onItemClick && onItemClick(item)}
                                        className={cn(
                                            "group bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-lg transition-all relative overflow-hidden",
                                            onItemClick && "cursor-pointer active:scale-[0.98]",
                                            theme.border
                                        )}
                                    >
                                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-inner shrink-0 transition-transform group-hover:scale-110", theme.lightBg)}>
                                            <span className={cn("relative z-10", theme.iconText)}>
                                                {item.icon ? <item.icon className="w-6 h-6" /> : item.title.charAt(0)}
                                            </span>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <p className="text-sm md:text-base font-[800] text-slate-900 truncate group-hover:text-slate-700 transition-colors">{item.title}</p>
                                                {item.status && (
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider border",
                                                        theme.lightBg, theme.iconText, "border-transparent"
                                                    )}>
                                                        {item.status}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] md:text-xs font-bold text-slate-400 truncate uppercase tracking-wide flex items-center gap-1.5">
                                                {item.subtitle}
                                            </p>
                                        </div>

                                        {onItemClick && (
                                            <div className={cn("w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center transition-colors shadow-sm", theme.hoverBg, "group-hover:text-white")}>
                                                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-white" />
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 rounded-[32px] mx-2 bg-slate-50/50">
                                <div className="p-4 bg-slate-100 rounded-full mb-3"><Activity className="w-6 h-6 opacity-30" /></div>
                                <p className="text-xs font-bold uppercase tracking-widest">No entries found</p>
                            </div>
                        )}
                    </div>
                    
                    {/* --- FOOTER --- */}
                    <div className="p-4 bg-white border-t border-slate-100 flex justify-between items-center text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest px-6 md:px-8 shrink-0">
                        <span>Synced: {new Date().toLocaleTimeString()}</span>
                        <span>v4.2.0</span>
                    </div>
                </motion.div>
            </div>
        </ClientPortal>
    );
};

// --- COMPONENT: STRATEGIC VISION BOARD ---
const StrategicVisionBoard = ({ pillars, onUpdate }: { pillars: VisionPillar[], onUpdate: () => void }) => {
    // EXPANDED ICON LIST FOR THE BOARD
    const ICONS: any = { 
        Zap, Mountain, Target, Gauge, Users, DollarSign, Trophy, 
        MessageSquare, Shield, Activity, Rocket, Sparkles, Star
    };
    
    const getColors = (color: string) => {
        const map: any = {
            cyan: { text: "text-cyan-300", bg: "bg-cyan-500/10", border: "border-cyan-500/20", bar: "from-cyan-400 to-blue-500" },
            emerald: { text: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/20", bar: "from-emerald-400 to-emerald-600" },
            red: { text: "text-red-300", bg: "bg-red-500/10", border: "border-red-500/20", bar: "from-red-500 to-orange-500" },
            amber: { text: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/20", bar: "from-amber-400 to-yellow-500" },
            violet: { text: "text-violet-300", bg: "bg-violet-500/10", border: "border-violet-500/20", bar: "from-violet-400 to-fuchsia-500" },
            rose: { text: "text-rose-300", bg: "bg-rose-500/10", border: "border-rose-500/20", bar: "from-rose-400 to-pink-500" },
            slate: { text: "text-slate-300", bg: "bg-slate-500/10", border: "border-slate-500/20", bar: "from-slate-400 to-slate-600" }
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
                    // --- UPDATED: 3 CARDS FIT ON MOBILE ---
                    <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 no-scrollbar -mx-6 px-6 md:grid md:grid-cols-2 lg:grid-cols-3 md:mx-0 md:px-0 md:overflow-visible">
                        {pillars.map(pillar => {
                            const style = getColors(pillar.color);
                            // Fallback to Target if icon not found
                            const Icon = ICONS[pillar.icon] || Target;
                            const target = pillar.target || 100;
                            const progress = Math.min(100, Math.max(0, (pillar.current / target) * 100));

                            return (
                                <motion.div 
                                    key={pillar.id} 
                                    className="relative bg-white/5 border border-white/10 rounded-[32px] overflow-hidden backdrop-blur-sm hover:bg-white/10 transition-colors group/card h-[160px] md:h-[220px] min-w-[38vw] md:min-w-0 snap-center shrink-0 flex flex-col justify-between p-4 md:p-6"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-white shadow-lg", style.bg, style.border)}>
                                                {/* REMOVED FILL-CURRENT to avoid white circle blobs on certain icons */}
                                                <Icon className="w-5 h-5 md:w-6 md:h-6" />
                                            </div>
                                            <div>
                                                <span className="inline-block text-[8px] font-black uppercase tracking-widest text-blue-200 mb-0.5">
                                                    {pillar.subtitle || "METRIC"}
                                                </span>
                                                <h3 className="text-sm md:text-lg font-[1000] text-white leading-tight line-clamp-2">
                                                    {pillar.title}
                                                </h3>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="flex items-baseline justify-center gap-1">
                                            <span className="text-3xl md:text-5xl font-[1000] tracking-tighter drop-shadow-sm text-white">
                                                {pillar.current}
                                            </span>
                                            <span className="text-[10px] md:text-xs font-bold text-blue-200 uppercase">
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
  
  // DYNAMIC TASK TITLE LOOKUP
  const taskMap = useTaskMap();
  
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

  useEffect(() => {
    const unsubEvents = subscribeEvents();
    const unsubTeam = subscribeTeam();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    const unsubVision = onSnapshot(doc(db, "vision", "current"), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.pillars) setVisionPillars(data.pillars);
        } else {
             setVisionPillars([]);
        }
    });

    return () => { unsubEvents(); unsubTeam(); unsubVision(); clearInterval(timer); };
  }, [subscribeEvents, subscribeTeam]);

  // SCROLL SPY FOR MOBILE TABS
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (entry.target === feedRef.current) setMobileTab('live');
            if (entry.target === nextRef.current) setMobileTab('next');
          }
        });
      },
      {
        root: container,
        threshold: 0.5 // 50% visibility triggers the tab switch
      }
    );

    if (feedRef.current) observer.observe(feedRef.current);
    if (nextRef.current) observer.observe(nextRef.current);

    return () => observer.disconnect();
  }, []);

  // CALCULATE LIVE METRICS
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
  
  // DYNAMIC TITLE LOGIC: Replaces raw task titles with live names from builder
  const activityFeed = useMemo(() => {
      return [...events].sort((a, b) => {
          const aCreated = (a as any).createdAt;
          const bCreated = (b as any).createdAt;
          const dateA = aCreated?.toDate ? aCreated.toDate() : new Date(a.startDate);
          const dateB = bCreated?.toDate ? bCreated.toDate() : new Date(b.startDate);
          return dateB.getTime() - dateA.getTime();
      }).slice(0, 8).map(event => {
          let displayTitle = event.title;
          
          if (event.metadata?.taskId && taskMap[event.metadata.taskId]) {
              displayTitle = `Module Verified: ${taskMap[event.metadata.taskId]}`;
          }

          return { ...event, title: displayTitle };
      });
  }, [events, taskMap]);

  const nextSession = useMemo(() => {
    return events.filter(e => e.type === "OneOnOne" && isFuture(e.startDate)).sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0];
  }, [events]);

  const handleDeleteEvent = async (id: string) => { const loadToast = toast.loading("Decommissioning..."); try { await deleteDoc(doc(db, "events", id)); toast.success("Terminated", { id: loadToast }); setSelectedEvent(null); } catch (e) { toast.error("Error", { id: loadToast }); } };
  const handleUpdateEvent = async (id: string, updates: any) => { const loadToast = toast.loading("Updating..."); try { await updateDoc(doc(db, "events", id), { ...updates, updatedAt: serverTimestamp() }); toast.success("Synced", { id: loadToast }); setSelectedEvent(null); } catch (e) { toast.error("Error", { id: loadToast }); } };
  const handleUpdate1on1 = async (updatedEvent: CalendarEvent) => { const loadToast = toast.loading("Updating Session..."); try { await updateDoc(doc(db, "events", updatedEvent.id), { description: updatedEvent.description, subtasks: updatedEvent.subtasks, status: updatedEvent.status, updatedAt: serverTimestamp() }); toast.success("Session Updated", { id: loadToast }); setSelected1on1(null); } catch (e) { toast.error("Error", { id: loadToast }); } };
  const handleKPIItemClick = (item: any) => { if (item.rawEvent) { if (item.rawEvent.type === "OneOnOne") { setSelected1on1(item.rawEvent); } else { setSelectedEvent(item.rawEvent); } } };
  
  const scrollToSection = (section: 'live' | 'next') => {
      if (!scrollRef.current) return;
      setMobileTab(section);
      if (section === 'live') {
          feedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } else {
          nextRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
  };

  const myProfile = useMemo(() => {
    return team.find(m => m.id === currentUser?.uid);
  }, [team, currentUser]);

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
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-6 pb-40 font-sans text-slate-900 relative overflow-hidden">
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
            
            <StrategicVisionBoard pillars={calculatedPillars} onUpdate={() => setIsVisionModalOpen(true)} />

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {kpis.map((kpi, idx) => (
                    <KPICard 
                        key={idx} 
                        kpi={kpi} 
                        onClick={() => setActiveKPI({ title: kpi.label, items: kpi.data, color: kpi.modalColor, icon: kpi.icon })} 
                    />
                ))}
            </div>

            {/* Mobile Sticky Tabs */}
            <div className="flex lg:hidden items-center justify-between gap-6 px-1 mb-2 sticky top-[68px] z-40 bg-[#F8FAFC]/90 backdrop-blur-lg py-3 -mx-4 md:mx-0 border-b border-slate-200/60 pl-6">
                <div className="flex items-center gap-6">
                    <button onClick={() => scrollToSection('live')} className={cn("text-base font-black uppercase tracking-widest transition-colors relative py-1", mobileTab === 'live' ? "text-[#004F71]" : "text-slate-400")}>
                        Live Feed
                        {mobileTab === 'live' && <motion.div layoutId="mobileTab" className="absolute -bottom-[13px] left-0 right-0 h-[2px] bg-[#004F71]" />}
                    </button>
                    <button onClick={() => scrollToSection('next')} className={cn("text-base font-black uppercase tracking-widest transition-colors relative py-1", mobileTab === 'next' ? "text-[#004F71]" : "text-slate-400")}>
                        Up Next
                        {mobileTab === 'next' && <motion.div layoutId="mobileTab" className="absolute -bottom-[13px] left-0 right-0 h-[2px] bg-[#004F71]" />}
                    </button>
                </div>
            </div>

            {/* --- CONTAINER: LIVE FEED & UP NEXT --- */}
            <div 
                ref={scrollRef}
                className="flex lg:grid lg:grid-cols-12 gap-6 md:gap-8 overflow-x-auto lg:overflow-visible snap-x snap-mandatory no-scrollbar -mx-4 px-4 pb-20 lg:mx-0 lg:px-0 lg:pb-0"
            >
            
            {/* =========================================================
                1. LIVE OPERATIONAL FEED (Tactical Timeline)
               ========================================================= */}
            {/* UPDATED WIDTH: 85vw creates the "peek" effect */}
            <div ref={feedRef} className="min-w-[85vw] md:min-w-[45vw] lg:min-w-0 col-span-12 lg:col-span-8 flex flex-col gap-5 snap-center h-fit shrink-0">
                
                {/* Section Header */}
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#E51636] text-white rounded-lg shadow-lg shadow-red-500/20">
                            <LayoutList className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-lg font-[1000] text-slate-900 tracking-tight leading-none">Live Ops</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Real-time Intelligence</p>
                        </div>
                    </div>
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-100 rounded-full shadow-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">System Active</span>
                    </div>
                </div>

                {/* Feed Card Container */}
                <div className="relative pl-4 md:pl-0">
                    {/* The Timeline Vertical Line */}
                    <div className="absolute left-[39px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-slate-200 via-slate-100 to-transparent hidden md:block" />

                    <div className="space-y-4">
                        <AnimatePresence mode="popLayout">
                            {activityFeed.map((event, i) => {
                                const isDone = event.status === "Done";
                                const isSystem = event.assigneeName === "System";

                                return (
                                    <motion.div 
                                        key={event.id}
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.3, delay: i * 0.05 }}
                                        onClick={() => { if(event.type === 'OneOnOne') setSelected1on1(event); else setSelectedEvent(event); }}
                                        className="relative group cursor-pointer"
                                    >
                                        <div className="flex gap-4 md:gap-6 items-start">
                                            
                                            {/* Icon Column (Desktop) */}
                                            <div className="hidden md:flex shrink-0">
                                                <FeedIcon type={event.type} priority={event.priority} />
                                            </div>

                                            {/* Main Card */}
                                            <div className={cn(
                                                "flex-1 relative overflow-hidden rounded-[20px] md:rounded-[24px] border transition-all duration-300",
                                                "bg-white shadow-sm hover:shadow-lg hover:-translate-y-0.5",
                                                event.priority === 'High' ? "border-l-[4px] border-l-red-500 border-y-slate-100 border-r-slate-100" : "border-slate-100"
                                            )}>
                                                {/* Card Content - REDUCED PADDING FOR MOBILE */}
                                                <div className="p-3 md:p-5 flex flex-col gap-2 relative z-10">
                                                    
                                                    {/* Top Row: Meta */}
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            {/* Mobile Icon */}
                                                            <div className="md:hidden"><FeedIcon type={event.type} priority={event.priority} /></div>
                                                            <div className="flex flex-col md:flex-row md:items-center gap-0.5 md:gap-2">
                                                                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-400">{getEventLabel(event.type)}</span>
                                                                {isDone && <span className="hidden md:inline text-emerald-500 text-[9px] font-black">• Completed</span>}
                                                            </div>
                                                        </div>
                                                        <TimeAgo date={event.createdAt?.toDate ? event.createdAt.toDate() : event.startDate} />
                                                    </div>

                                                    {/* Middle: Title - REDUCED FONT SIZE */}
                                                    <h4 className={cn(
                                                        "text-xs md:text-base font-bold leading-snug group-hover:text-[#004F71] transition-colors line-clamp-2",
                                                        isSystem ? "text-slate-600 font-medium italic" : "text-slate-900"
                                                    )}>
                                                        {event.title}
                                                    </h4>

                                                    {/* Bottom: Assignees */}
                                                    <div className="flex items-center gap-3 mt-1 pt-3 border-t border-slate-50">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-5 h-5 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-[9px] font-black text-slate-500 uppercase">
                                                                {event.assigneeName.charAt(0)}
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-500">{event.assigneeName}</span>
                                                        </div>
                                                        
                                                        <ArrowRight className="w-3 h-3 text-slate-300" />
                                                        
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn(
                                                                "w-5 h-5 rounded-md border flex items-center justify-center text-[9px] font-black uppercase",
                                                                event.teamMemberName === "Command" ? "bg-slate-800 text-white border-slate-800" : "bg-slate-50 text-slate-500 border-slate-200"
                                                            )}>
                                                                {event.teamMemberName ? event.teamMemberName.charAt(0) : "T"}
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-500">{event.teamMemberName || "Team"}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* =========================================================
                2. UP NEXT HUD (Mission Card)
               ========================================================= */}
            {/* UPDATED WIDTH: 85vw creates the "peek" effect */}
            <div ref={nextRef} className="min-w-[85vw] md:min-w-[40vw] lg:min-w-0 col-span-12 lg:col-span-4 lg:col-start-9 flex flex-col gap-5 lg:sticky lg:top-24 snap-center h-fit shrink-0">
                
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#004F71]" />
                        <h3 className="text-lg font-[1000] text-slate-900 tracking-tight">On Deck</h3>
                    </div>
                </div>
                
                {nextSession ? (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative w-full rounded-[32px] overflow-hidden shadow-2xl group"
                    >
                        {/* 1. Dynamic Background */}
                        <div className="absolute inset-0 bg-[#004F71]">
                            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[#E51636] rounded-full blur-[100px] opacity-40 mix-blend-screen -translate-y-1/2 translate-x-1/2 group-hover:opacity-60 transition-opacity duration-700" />
                        </div>

                        {/* 2. Glass Overlay Content */}
                        <div className="relative z-10 p-6 md:p-8 flex flex-col h-full text-white">
                            
                            {/* Top Badges */}
                            <div className="flex justify-between items-start mb-8">
                                <div className="p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-lg">
                                    <BookOpen className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="px-3 py-1 bg-[#E51636] rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg shadow-red-900/20 border border-white/10 mb-1">
                                        Priority
                                    </span>
                                    <span className="text-[10px] font-bold text-blue-200">
                                        {formatDistanceToNow(nextSession.startDate, { addSuffix: true })}
                                    </span>
                                </div>
                            </div>

                            {/* Main Info */}
                            <div className="space-y-1 mb-8">
                                <p className="text-[10px] font-black uppercase text-blue-300 tracking-[0.2em]">Next Directive</p>
                                <h2 className="text-3xl md:text-4xl font-[1000] leading-[0.9] tracking-tighter drop-shadow-sm">
                                    {nextSession.assigneeName}
                                </h2>
                                <div className="flex items-center gap-2 mt-2 opacity-90">
                                    <span className="text-xs font-medium text-blue-100">Mentoring</span>
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/10 rounded-lg border border-white/10">
                                        <User className="w-3 h-3" />
                                        <span className="text-xs font-bold uppercase">{nextSession.teamMemberName || "Team"}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Time Slot HUD */}
                            <div className="grid grid-cols-2 gap-px bg-white/10 border border-white/20 rounded-2xl overflow-hidden mb-6">
                                <div className="p-4 flex flex-col items-center justify-center bg-white/5 backdrop-blur-sm">
                                    <span className="text-2xl font-[1000] leading-none">{format(nextSession.startDate, "d")}</span>
                                    <span className="text-[9px] font-black uppercase text-blue-200">{format(nextSession.startDate, "MMM")}</span>
                                </div>
                                <div className="p-4 flex flex-col items-center justify-center bg-white/5 backdrop-blur-sm border-l border-white/10">
                                    <span className="text-xl font-[1000] leading-none">{format(nextSession.startDate, "h:mm")}</span>
                                    <span className="text-[9px] font-black uppercase text-blue-200">{format(nextSession.startDate, "aa")}</span>
                                </div>
                            </div>

                            {/* Action Button */}
                            <button 
                                onClick={() => setSelected1on1(nextSession)} 
                                className="w-full py-4 bg-white text-[#004F71] rounded-2xl font-black uppercase text-[10px] tracking-[0.25em] shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 group/btn"
                            >
                                Launch Prep <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <div className="p-8 border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center text-center bg-white/50 h-[300px]">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8 text-slate-300" />
                        </div>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1">All Clear</h4>
                        <p className="text-xs text-slate-400 font-medium">No immediate sessions scheduled.</p>
                    </div>
                )}
            </div>
            
            </div>
        </div>

        <AnimatePresence>
            {selectedEvent && (
                <EventDetailSheet 
                    event={selectedEvent} 
                    onClose={() => setSelectedEvent(null)} 
                    onDelete={selectedEvent.assigneeName === "System" ? undefined : handleDeleteEvent}
                    onUpdate={handleUpdateEvent} 
                    isSystemEvent={selectedEvent.assigneeName === "System"}
                />
            )}
        </AnimatePresence>
        <AnimatePresence>{selected1on1 && <OneOnOneSessionModal event={selected1on1} onClose={() => setSelected1on1(null)} onUpdate={handleUpdate1on1} />}</AnimatePresence>
        <AnimatePresence>{activeKPI && <KPIModal title={activeKPI.title} items={activeKPI.items} color={activeKPI.color} icon={activeKPI.icon} onClose={() => setActiveKPI(null)} onItemClick={handleKPIItemClick} />}</AnimatePresence>
        
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