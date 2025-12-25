"use client";

import { useState } from "react";
import { motion, Reorder } from "framer-motion";
import { 
  X, Target, Zap, Rocket, Mountain, Plus, Trash2, GripVertical, 
  Gauge, Users, DollarSign, Trophy, Database, PenLine, Link2, Save
} from "lucide-react";
import { cn } from "@/lib/utils";
import ClientPortal from "@/components/core/ClientPortal";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";

// --- TYPES ---
export type MetricSource = 'manual' | 'system_1on1' | 'system_training_avg' | 'system_active_goals' | 'system_leaders';

export interface VisionPillar {
    id: string;
    title: string;
    subtitle: string;
    current: number; // Used if manual
    target: number;
    unit: "%" | "Count" | "Currency";
    icon: string;
    color: string;
    source: MetricSource; // NEW: Determines if we calculate it or read 'current'
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentPillars: VisionPillar[];
}

const ICONS: any = { Zap, Mountain, Target, Gauge, Users, DollarSign, Trophy };

// Explicit Colors to prevent Tailwind purging
const COLOR_MAP: any = {
    cyan: "#06b6d4",
    emerald: "#10b981",
    red: "#ef4444",
    amber: "#f59e0b",
    violet: "#8b5cf6",
    rose: "#f43f5e",
};

export default function StrategicVisionModal({ isOpen, onClose, currentPillars }: Props) {
  const [pillars, setPillars] = useState<VisionPillar[]>(currentPillars);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
      setIsSaving(true);
      try {
          await setDoc(doc(db, "vision", "current"), {
              pillars,
              updatedAt: serverTimestamp()
          });
          toast.success("System Telemetry Updated");
          onClose();
      } catch (e) {
          toast.error("Failed to update vision");
      } finally {
          setIsSaving(false);
      }
  };

  const addPillar = () => {
      const newPillar: VisionPillar = {
          id: Math.random().toString(),
          title: "New Directive",
          subtitle: "Target",
          current: 0,
          target: 100,
          unit: "%",
          icon: "Target",
          color: "cyan",
          source: "manual"
      };
      setPillars([...pillars, newPillar]);
  };

  const removePillar = (id: string) => setPillars(pillars.filter(p => p.id !== id));

  const updatePillar = (id: string, field: keyof VisionPillar, value: any) => {
      setPillars(pillars.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  if (!isOpen) return null;

  return (
    <ClientPortal>
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-md" onClick={onClose} />
            <motion.div 
                initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} 
                className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[85vh]"
            >
                {/* Header */}
                <div className="bg-[#004F71] p-8 pb-10 text-white relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 p-6 opacity-10"><Rocket className="w-32 h-32" /></div>
                    <div className="relative z-10">
                        <h2 className="text-2xl font-[1000] tracking-tighter uppercase leading-none">Command Directives</h2>
                        <p className="text-blue-200 text-xs font-bold mt-2 uppercase tracking-widest">Manage Strategic Pillars</p>
                    </div>
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all"><X className="w-5 h-5" /></button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 custom-scrollbar">
                    <Reorder.Group axis="y" values={pillars} onReorder={setPillars} className="space-y-4">
                        {pillars.map(pillar => {
                            const Icon = ICONS[pillar.icon] || Target;
                            return (
                                <Reorder.Item key={pillar.id} value={pillar} className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm relative group">
                                    <div className="flex items-start gap-4">
                                        <div className="cursor-grab active:cursor-grabbing text-slate-300 mt-2"><GripVertical className="w-5 h-5" /></div>
                                        <div className="flex-1 space-y-5">
                                            
                                            {/* TOP ROW: Config */}
                                            <div className="flex gap-4 border-b border-slate-100 pb-4">
                                                <div className="flex-1 space-y-2">
                                                    <input value={pillar.title} onChange={e => updatePillar(pillar.id, 'title', e.target.value)} className="w-full text-sm font-black uppercase tracking-wide text-slate-900 border-none outline-none p-0 focus:ring-0 placeholder:text-slate-300" placeholder="TITLE" />
                                                    <input value={pillar.subtitle} onChange={e => updatePillar(pillar.id, 'subtitle', e.target.value)} className="w-full text-[10px] font-bold uppercase tracking-widest text-slate-400 border-none outline-none p-0 focus:ring-0 placeholder:text-slate-200" placeholder="SUBTITLE" />
                                                </div>
                                                
                                                {/* Fixed Color Picker */}
                                                <div className="flex gap-1.5 h-fit">
                                                    {Object.entries(COLOR_MAP).map(([key, hex]: any) => (
                                                        <button 
                                                            key={key} 
                                                            onClick={() => updatePillar(pillar.id, 'color', key)} 
                                                            className={cn("w-5 h-5 rounded-full transition-all border-2", pillar.color === key ? "border-slate-900 scale-110" : "border-transparent opacity-50 hover:opacity-100")}
                                                            style={{ backgroundColor: hex }} 
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            {/* DATA SOURCE TOGGLE */}
                                            <div className="flex gap-3">
                                                <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0 h-fit">
                                                    <button onClick={() => updatePillar(pillar.id, 'source', 'manual')} className={cn("p-2 rounded-lg transition-all", pillar.source === 'manual' ? "bg-white shadow-sm text-slate-900" : "text-slate-400")}>
                                                        <PenLine className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => updatePillar(pillar.id, 'source', 'system_1on1')} className={cn("p-2 rounded-lg transition-all", pillar.source !== 'manual' ? "bg-[#004F71] shadow-sm text-white" : "text-slate-400")}>
                                                        <Link2 className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                <div className="flex-1 space-y-2">
                                                    {pillar.source === 'manual' ? (
                                                        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase pl-1">Manual Value</span>
                                                            <input type="number" value={pillar.current} onChange={e => updatePillar(pillar.id, 'current', parseFloat(e.target.value))} className="w-20 bg-white rounded-lg px-2 py-1 text-sm font-black text-slate-900 border border-slate-200 outline-none" />
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 bg-blue-50 p-2 rounded-xl border border-blue-100">
                                                            <Database className="w-4 h-4 text-[#004F71]" />
                                                            <select 
                                                                value={pillar.source} 
                                                                onChange={e => updatePillar(pillar.id, 'source', e.target.value)}
                                                                className="bg-transparent text-[10px] font-bold uppercase text-[#004F71] outline-none w-full"
                                                            >
                                                                <option value="system_1on1">1-on-1s (Monthly)</option>
                                                                <option value="system_training_avg">Avg. Training %</option>
                                                                <option value="system_active_goals">Active Goals</option>
                                                                <option value="system_leaders">Leader Count</option>
                                                            </select>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* TARGETS ROW */}
                                            <div className="flex gap-4 items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                                <div className="flex-1">
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase block mb-1">Goal Target</span>
                                                    <input type="number" value={pillar.target} onChange={e => updatePillar(pillar.id, 'target', parseFloat(e.target.value))} className="w-full bg-transparent text-lg font-black text-slate-900 outline-none border-b border-dashed border-slate-300 focus:border-[#004F71]" />
                                                </div>
                                                <button onClick={() => updatePillar(pillar.id, 'unit', pillar.unit === '%' ? 'Count' : '%')} className="px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-xs text-slate-500 shadow-sm hover:text-[#004F71] transition-colors">
                                                    {pillar.unit}
                                                </button>
                                            </div>

                                            {/* Icon Selector */}
                                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 pt-1">
                                                {Object.entries(ICONS).map(([key, IconC]: any) => (
                                                    <button key={key} onClick={() => updatePillar(pillar.id, 'icon', key)} className={cn("p-2 rounded-lg transition-all border", pillar.icon === key ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-400 border-slate-100 hover:border-slate-300")}>
                                                        <IconC className="w-4 h-4" />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <button onClick={() => removePillar(pillar.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </Reorder.Item>
                            );
                        })}
                    </Reorder.Group>
                    
                    <button onClick={addPillar} className="w-full py-4 border-2 border-dashed border-slate-300 rounded-[24px] text-slate-400 font-bold uppercase text-xs tracking-widest hover:border-[#004F71] hover:text-[#004F71] hover:bg-white transition-all flex items-center justify-center gap-2">
                        <Plus className="w-4 h-4" /> Add Strategic Pillar
                    </button>
                </div>

                <div className="p-6 bg-white border-t border-slate-100 shrink-0 safe-area-pb">
                     <button onClick={handleSave} disabled={isSaving} className="w-full py-4 bg-[#004F71] text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                        {isSaving ? "Syncing..." : <>Save & Deploy <Save className="w-4 h-4" /></>}
                    </button>
                </div>
            </motion.div>
        </div>
    </ClientPortal>
  );
}