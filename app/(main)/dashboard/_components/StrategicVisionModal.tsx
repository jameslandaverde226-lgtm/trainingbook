"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { 
  X, Target, Zap, Rocket, Mountain, Activity, 
  Minus, Plus, Save, SlidersHorizontal, PenLine, 
  Percent, Hash, Trophy, Gauge, Users, DollarSign, Check, Layers
} from "lucide-react";
import { cn } from "@/lib/utils";
import ClientPortal from "@/components/core/ClientPortal";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";
import { useAppStore } from "@/lib/store/useStore"; 
import { isSameMonth } from "date-fns"; 

// --- TYPES ---
export type MetricSource = 
    | 'manual' 
    | 'system_1on1' 
    | 'system_training_avg' 
    | 'system_active_goals' 
    | 'system_leaders'
    | 'system_member_progress';

export interface VisionPillar {
    id: string;
    title: string;
    subtitle: string;
    current: number; 
    target: number;
    unit: "%" | "Count" | "Currency";
    icon: string;
    color: string;
    source: MetricSource; 
    linkedMemberId?: string; 
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentPillars: VisionPillar[];
}

const ICONS: any = { Zap, Mountain, Target, Gauge, Users, DollarSign, Trophy };
const COLOR_MAP: any = { 
    cyan: "#06b6d4", 
    emerald: "#10b981", 
    red: "#ef4444", 
    amber: "#f59e0b", 
    violet: "#8b5cf6", 
    rose: "#f43f5e",
    slate: "#64748b"
};

// --- HELPER: NUMBER STEPPER ---
const NumberStepper = ({ value, onChange, label, unit }: { value: number | string, onChange: (val: number | string) => void, label: string, unit?: string }) => {
    return (
        <div className="flex-1 bg-slate-50 hover:bg-white focus-within:bg-white focus-within:ring-2 focus-within:ring-[#004F71]/20 rounded-xl p-1 border border-slate-200 transition-all flex items-center justify-between group h-12">
            <button 
                onClick={() => onChange(Math.max(0, (Number(value) || 0) - 1))} 
                className="w-8 h-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all flex items-center justify-center active:scale-90"
            >
                <Minus className="w-3 h-3" />
            </button>
            
            <div className="flex flex-col items-center justify-center flex-1 leading-none">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</span>
                <div className="flex items-center gap-0.5">
                    <input 
                        type="number" 
                        value={value} 
                        onChange={(e) => onChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        className="bg-transparent text-center font-[1000] text-sm text-slate-900 outline-none w-10 appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0"
                    />
                    {unit && <span className="text-[9px] font-bold text-slate-400">{unit}</span>}
                </div>
            </div>
            
            <button 
                onClick={() => onChange((Number(value) || 0) + 1)} 
                className="w-8 h-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all flex items-center justify-center active:scale-90"
            >
                <Plus className="w-3 h-3" />
            </button>
        </div>
    );
};

// --- COMPONENT: SMALL CARD (GRID VIEW) ---
const VisionCardSmall = ({ pillar, onOpen, isHidden }: any) => {
    const { team, events } = useAppStore();
    const Icon = ICONS[pillar.icon] || Target;
    
    // Live Value Logic
    const liveValue = useMemo(() => {
        if (pillar.source === 'manual') return pillar.current;
        switch (pillar.source) {
            case 'system_1on1': return events.filter(e => e.type === "OneOnOne" && e.status === "Done" && isSameMonth(e.startDate, new Date())).length;
            case 'system_active_goals': return events.filter(e => e.type === "Goal" && e.status !== "Done").length;
            case 'system_leaders': return team.filter(m => ["Team Leader", "Director", "Assistant Director"].includes(m.status)).length;
            case 'system_training_avg': return team.length > 0 ? Math.round(team.reduce((acc, curr) => acc + (curr.progress || 0), 0) / team.length) : 0;
            case 'system_member_progress': 
                 if (pillar.linkedMemberId) return team.find(m => m.id === pillar.linkedMemberId)?.progress || 0;
                 return 0;
            default: return 0;
        }
    }, [pillar, team, events]);

    const activeColor = COLOR_MAP[pillar.color];
    const target = pillar.target || 100;
    const progress = Math.min(100, Math.max(0, (liveValue / target) * 100));

    return (
        <motion.div 
            layoutId={`card-${pillar.id}`}
            onClick={onOpen}
            className={cn(
                "relative flex flex-col rounded-[32px] overflow-hidden bg-white shadow-[0_4px_24px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.1)] border border-slate-100 hover:border-slate-200 h-[280px] cursor-pointer group transition-colors",
                isHidden && "opacity-0 pointer-events-none"
            )}
        >
             {/* Background Watermark Icon */}
             <div className="absolute top-[-20px] right-[-20px] p-6 opacity-[0.03] pointer-events-none transform rotate-12 transition-transform group-hover:scale-110 duration-700">
                <Icon className="w-48 h-48" style={{ color: activeColor }} />
            </div>

            {/* Header */}
            <div className="flex justify-between items-start p-6 relative z-10">
                <div className="flex items-center gap-4">
                     <motion.div 
                        layoutId={`icon-box-${pillar.id}`}
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg"
                        style={{ backgroundColor: activeColor }}
                     >
                         <Icon className="w-7 h-7" />
                     </motion.div>
                     <div>
                         <motion.span layoutId={`subtitle-${pillar.id}`} className="inline-block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                            {pillar.subtitle || "METRIC"}
                         </motion.span>
                         <motion.h3 layoutId={`title-${pillar.id}`} className="text-xl font-[1000] text-slate-900 leading-tight">
                             {pillar.title}
                         </motion.h3>
                     </div>
                </div>
                <motion.div layoutId={`btn-${pillar.id}`} className="p-2.5 bg-slate-50 text-slate-400 group-hover:bg-[#004F71] group-hover:text-white rounded-full transition-colors">
                     <SlidersHorizontal className="w-4 h-4" />
                </motion.div>
            </div>

            {/* Metric */}
            <div className="relative z-10 text-center py-2 flex-1 flex flex-col justify-center">
                <div className="flex items-baseline justify-center gap-1">
                    <span className="text-6xl font-[1000] tracking-tighter drop-shadow-sm" style={{ color: activeColor }}>
                        {liveValue}
                    </span>
                    <span className="text-sm font-bold text-slate-400 uppercase">
                        / {target} {pillar.unit === '%' && '%'}
                    </span>
                </div>
            </div>

            {/* Footer */}
            <div className="relative z-10 p-6 pt-0">
                <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    <span>Progress</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: activeColor }}
                    />
                </div>
                {pillar.source !== 'manual' && (
                    <div className="mt-3 flex items-center justify-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider opacity-60">
                        <Activity className="w-3 h-3" /> Auto-Synced
                    </div>
                )}
            </div>
        </motion.div>
    );
};

// --- COMPONENT: EXPANDED EDITOR (OVERLAY) ---
const VisionCardExpanded = ({ pillar, onUpdate, onClose }: any) => {
    const Icon = ICONS[pillar.icon] || Target;
    const activeColor = COLOR_MAP[pillar.color];

    return (
        <motion.div 
            layoutId={`card-${pillar.id}`}
            className="w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ring-1 ring-black/5"
        >
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white z-10 relative">
                 <div className="flex items-center gap-4">
                     <motion.div 
                        layoutId={`icon-box-${pillar.id}`}
                        className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md"
                        style={{ backgroundColor: activeColor }}
                     >
                         <Icon className="w-5 h-5" />
                     </motion.div>
                     <div>
                         <motion.span layoutId={`subtitle-${pillar.id}`} className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">
                            Configuration
                         </motion.span>
                         <motion.h3 layoutId={`title-${pillar.id}`} className="text-lg font-[1000] text-slate-900 leading-none">
                             Editing: {pillar.title}
                         </motion.h3>
                     </div>
                 </div>
                 <motion.button 
                    layoutId={`btn-${pillar.id}`}
                    onClick={onClose}
                    className="p-2 hover:bg-slate-100 text-slate-400 rounded-full transition-colors"
                 >
                     <X className="w-5 h-5" />
                 </motion.button>
            </div>

            {/* Scrollable Form */}
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1, transition: { delay: 0.2 } }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 bg-slate-50/50"
            >
                {/* 1. Identity */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Title</label>
                        <input 
                            value={pillar.title} 
                            onChange={e => onUpdate(pillar.id, 'title', e.target.value)} 
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-400 transition-colors shadow-sm"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Subtitle</label>
                        <input 
                            value={pillar.subtitle} 
                            onChange={e => onUpdate(pillar.id, 'subtitle', e.target.value)} 
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-400 transition-colors shadow-sm"
                        />
                    </div>
                </div>

                {/* 2. Source */}
                <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Data Source</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => onUpdate(pillar.id, 'source', 'manual')} className={cn("py-3.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm", pillar.source === 'manual' ? "bg-white text-[#004F71] border-[#004F71] ring-1 ring-[#004F71]/10" : "bg-white text-slate-400 border-slate-200 hover:border-slate-300")}>
                            <PenLine className="w-3.5 h-3.5" /> Manual Input
                        </button>
                        <button onClick={() => onUpdate(pillar.id, 'source', 'system_1on1')} className={cn("py-3.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm", pillar.source !== 'manual' ? "bg-[#004F71] text-white border-[#004F71] shadow-lg shadow-blue-900/20" : "bg-white text-slate-400 border-slate-200 hover:border-slate-300")}>
                            <Activity className="w-3.5 h-3.5" /> Live System
                        </button>
                    </div>
                    
                    {pillar.source !== 'manual' && (
                        <div className="p-2 bg-slate-200/40 rounded-2xl flex flex-col gap-1 border border-slate-200/60">
                            {[
                                { id: 'system_1on1', label: 'Monthly 1-on-1 Sessions' },
                                { id: 'system_active_goals', label: 'Active Strategic Goals' },
                                { id: 'system_leaders', label: 'Certified Leaders Count' },
                                { id: 'system_training_avg', label: 'Average Training Completion' },
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => onUpdate(pillar.id, 'source', opt.id)}
                                    className={cn("px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider text-left transition-all", pillar.source === opt.id ? "bg-white text-[#004F71] shadow-sm" : "text-slate-500 hover:bg-slate-100/50")}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* 3. Targets & Style */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center pl-1 pr-1">
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Target Goals</label>
                            {/* Unit Switcher */}
                            <div className="flex bg-slate-200/60 p-0.5 rounded-lg">
                                <button onClick={() => onUpdate(pillar.id, 'unit', 'Count')} className={cn("px-2 py-0.5 rounded-md text-[8px] font-black uppercase transition-all", pillar.unit === 'Count' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}>#</button>
                                <button onClick={() => onUpdate(pillar.id, 'unit', '%')} className={cn("px-2 py-0.5 rounded-md text-[8px] font-black uppercase transition-all", pillar.unit === '%' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}>%</button>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            {pillar.source === 'manual' && (
                                <NumberStepper label="Current Value" value={pillar.current} onChange={(v) => onUpdate(pillar.id, 'current', v)} unit={pillar.unit} />
                            )}
                            <NumberStepper label="Target Goal" value={pillar.target} onChange={(v) => onUpdate(pillar.id, 'target', v)} unit={pillar.unit} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Theme Color</label>
                        <div className="grid grid-cols-4 gap-2">
                            {Object.entries(COLOR_MAP).map(([key, hex]: any) => (
                                <button key={key} onClick={() => onUpdate(pillar.id, 'color', key)} className={cn("aspect-square rounded-full transition-all flex items-center justify-center", pillar.color === key ? "scale-110 ring-4 ring-slate-100 shadow-inner" : "opacity-40 hover:opacity-100")} style={{ backgroundColor: hex }}>
                                    {pillar.color === key && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 bg-white flex justify-end">
                 <button onClick={onClose} className="px-8 py-3 bg-[#0F172A] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-xl shadow-slate-900/20">
                     Apply Changes
                 </button>
            </div>
        </motion.div>
    );
};


// --- MAIN MODAL CONTROLLER ---

export default function StrategicVisionModal({ isOpen, onClose, currentPillars }: Props) {
  const [pillars, setPillars] = useState<VisionPillar[]>(currentPillars);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
      setIsSaving(true);
      try {
          const sanitizedPillars = pillars.map(p => ({
              ...p,
              current: Number(p.current) || 0,
              target: Number(p.target) || 0
          }));
          await setDoc(doc(db, "vision", "current"), {
              pillars: sanitizedPillars,
              updatedAt: serverTimestamp()
          });
          toast.success("Strategic Vision Updated");
          onClose();
      } catch (e) {
          toast.error("Failed to deploy updates");
      } finally {
          setIsSaving(false);
      }
  };

  const initPillarsIfNeeded = () => {
      const defaults: VisionPillar[] = [
         { id: "1", title: "Speed of Service", subtitle: "Weekly", current: 0, target: 80, unit: "%", icon: "Zap", color: "cyan", source: "manual" },
         { id: "2", title: "New Leaders", subtitle: "Monthly", current: 0, target: 5, unit: "Count", icon: "Target", color: "emerald", source: "system_leaders" },
         { id: "3", title: "Hospitality Score", subtitle: "North Star", current: 0, target: 20, unit: "%", icon: "Mountain", color: "red", source: "manual" }
      ];
      setPillars(defaults);
  };

  const updatePillar = (id: string, field: keyof VisionPillar, value: any) => {
      setPillars(pillars.map(p => {
          if (p.id !== id) return p;
          const updated = { ...p, [field]: value };
          
          // INTELLIGENT DEFAULTS LOGIC
          if (field === 'source') {
             if (['system_leaders', 'system_1on1', 'system_active_goals'].includes(value)) {
                 updated.unit = 'Count';
                 if (updated.target === 100) updated.target = 5; 
             }
             else if (['system_training_avg', 'system_member_progress'].includes(value)) {
                 updated.unit = '%';
                 if (updated.target <= 20) updated.target = 100;
             }
          }
          return updated;
      }));
  };

  if (!isOpen) return null;

  return (
    <ClientPortal>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-[#0F172A]/90 backdrop-blur-md flex items-center justify-center p-4 lg:p-8">
            <motion.div 
                initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} 
                className="w-full max-w-7xl h-[90vh] bg-[#F8FAFC] rounded-[48px] shadow-2xl flex flex-col overflow-hidden relative ring-8 ring-white/10"
            >
                {/* --- HEADER --- */}
                <div className="bg-white px-8 lg:px-12 py-8 border-b border-slate-200 flex justify-between items-start shrink-0 relative z-20">
                     <div className="flex gap-6 items-center">
                         <div className="w-16 h-16 rounded-[20px] bg-[#004F71] flex items-center justify-center text-white shadow-xl shadow-blue-900/20">
                             <Rocket className="w-8 h-8" />
                         </div>
                         <div>
                             <div className="flex items-center gap-3 mb-1">
                                 <span className="px-3 py-1 rounded-full bg-blue-50 text-[#004F71] text-[10px] font-black uppercase tracking-[0.25em] border border-blue-100">System Config</span>
                                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                             </div>
                             <h2 className="text-3xl lg:text-4xl font-[1000] text-slate-900 tracking-tighter uppercase leading-none">Command Directives</h2>
                             <p className="text-slate-400 font-medium mt-1">Configure strategic pillars and link to live data sources.</p>
                         </div>
                     </div>
                     
                     <div className="flex items-center gap-3">
                         <button onClick={onClose} className="p-4 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl hover:bg-slate-100 transition-all border border-slate-200">
                             <X className="w-6 h-6" />
                         </button>
                     </div>
                </div>

                {/* --- SCROLLABLE GRID --- */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 lg:p-12 relative bg-slate-50/50">
                     {pillars.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 pb-32">
                            <LayoutGroup>
                                 {pillars.map(pillar => (
                                     <VisionCardSmall 
                                         key={pillar.id}
                                         pillar={pillar}
                                         onOpen={() => setEditingId(pillar.id)}
                                         isHidden={editingId === pillar.id}
                                     />
                                 ))}
                            </LayoutGroup>
                        </div>
                     ) : (
                         /* --- EMPTY STATE --- */
                        <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                            <div className="p-6 bg-white rounded-full shadow-lg mb-6">
                                <Layers className="w-12 h-12 text-slate-300" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-2">Initialize Command Center</h3>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-8">No directives found.</p>
                            <button 
                                onClick={initPillarsIfNeeded}
                                className="px-10 py-4 bg-[#004F71] text-white rounded-full font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 transition-transform"
                            >
                                Generate Standard Protocol
                            </button>
                        </div>
                     )}
                </div>

                {/* --- EXPANDED EDITOR OVERLAY --- */}
                <AnimatePresence>
                    {editingId && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                            <motion.div 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                exit={{ opacity: 0 }} 
                                onClick={() => setEditingId(null)}
                                className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm pointer-events-auto" 
                            />
                            <div className="pointer-events-auto relative w-full flex justify-center">
                                <VisionCardExpanded 
                                    pillar={pillars.find(p => p.id === editingId)}
                                    onUpdate={updatePillar}
                                    onClose={() => setEditingId(null)}
                                />
                            </div>
                        </div>
                    )}
                </AnimatePresence>

                {/* --- FOOTER --- */}
                <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-white via-white/90 to-transparent z-30 flex justify-center pointer-events-none">
                     <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="pointer-events-auto px-12 py-5 bg-[#E51636] text-white rounded-full font-[900] text-sm uppercase tracking-[0.2em] shadow-[0_20px_50px_-12px_rgba(229,22,54,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center gap-4 disabled:opacity-70 disabled:scale-100 hover:bg-red-600"
                     >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {isSaving ? "Deploying..." : "Save & Deploy Configuration"}
                     </button>
                </div>
            </motion.div>
        </motion.div>
    </ClientPortal>
  );
}

// Simple loader
function Loader2({ className }: { className?: string }) {
    return (
        <svg className={cn("animate-spin", className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    )
}