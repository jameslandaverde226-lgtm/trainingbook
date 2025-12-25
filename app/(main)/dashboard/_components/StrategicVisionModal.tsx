"use client";

import { useState } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { X, Target, Zap, TrendingUp, Save, Rocket, Mountain, Plus, Trash2, GripVertical, Gauge, Users, DollarSign, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import ClientPortal from "@/components/core/ClientPortal";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";

// --- TYPES ---
export interface VisionPillar {
    id: string;
    title: string;
    subtitle: string;
    current: number;
    target: number;
    unit: "%" | "Count" | "Currency";
    icon: "Zap" | "Mountain" | "Target" | "Gauge" | "Users" | "Dollar" | "Trophy";
    color: "cyan" | "emerald" | "red" | "amber" | "violet" | "rose";
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentPillars: VisionPillar[];
}

const ICONS = { Zap, Mountain, Target, Gauge, Users, DollarSign, Trophy };
const COLORS = [
    { id: "cyan", hex: "cyan" },
    { id: "emerald", hex: "emerald" },
    { id: "red", hex: "red" },
    { id: "amber", hex: "amber" },
    { id: "violet", hex: "violet" },
    { id: "rose", hex: "rose" },
];

export default function StrategicVisionModal({ isOpen, onClose, currentPillars }: Props) {
  const [pillars, setPillars] = useState<VisionPillar[]>(currentPillars.length > 0 ? currentPillars : []);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
      setIsSaving(true);
      try {
          await setDoc(doc(db, "vision", "current"), {
              pillars,
              updatedAt: serverTimestamp()
          });
          toast.success("Directives Updated");
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
          title: "New Objective",
          subtitle: "Weekly Target",
          current: 0,
          target: 100,
          unit: "%",
          icon: "Target",
          color: "cyan"
      };
      setPillars([...pillars, newPillar]);
  };

  const removePillar = (id: string) => {
      setPillars(pillars.filter(p => p.id !== id));
  };

  const updatePillar = (id: string, field: keyof VisionPillar, value: any) => {
      setPillars(pillars.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  if (!isOpen) return null;

  return (
    <ClientPortal>
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#004F71]/80 backdrop-blur-md" onClick={onClose} />
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[85vh]">
                <div className="bg-[#004F71] p-8 pb-10 text-white relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 p-6 opacity-10"><Rocket className="w-32 h-32" /></div>
                    <div className="relative z-10">
                        <h2 className="text-2xl font-[1000] tracking-tighter uppercase leading-none">Command Directives</h2>
                        <p className="text-blue-200 text-xs font-bold mt-2 uppercase tracking-widest">Manage Strategic Pillars</p>
                    </div>
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all"><X className="w-5 h-5" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 pt-6 space-y-6 bg-slate-50">
                    <Reorder.Group axis="y" values={pillars} onReorder={setPillars} className="space-y-4">
                        {pillars.map(pillar => {
                            const Icon = ICONS[pillar.icon as keyof typeof ICONS] || Target;
                            return (
                                <Reorder.Item key={pillar.id} value={pillar} className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm relative group">
                                    <div className="flex items-start gap-4">
                                        <div className="cursor-grab active:cursor-grabbing text-slate-300 mt-2"><GripVertical className="w-5 h-5" /></div>
                                        <div className="flex-1 space-y-4">
                                            
                                            {/* HEADER ROW */}
                                            <div className="flex gap-4">
                                                <div className="flex-1 space-y-2">
                                                    <input value={pillar.title} onChange={e => updatePillar(pillar.id, 'title', e.target.value)} className="w-full text-sm font-black uppercase tracking-wide text-slate-900 border-b border-transparent focus:border-slate-200 outline-none" placeholder="TITLE" />
                                                    <input value={pillar.subtitle} onChange={e => updatePillar(pillar.id, 'subtitle', e.target.value)} className="w-full text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-transparent focus:border-slate-200 outline-none" placeholder="SUBTITLE" />
                                                </div>
                                                
                                                {/* Color Picker */}
                                                <div className="flex gap-1">
                                                    {COLORS.map(c => (
                                                        <button key={c.id} onClick={() => updatePillar(pillar.id, 'color', c.id)} className={cn("w-4 h-4 rounded-full transition-all", pillar.color === c.id ? `bg-${c.id}-500 ring-2 ring-offset-1 ring-${c.id}-500` : `bg-${c.id}-200 hover:bg-${c.id}-400`)} />
                                                    ))}
                                                </div>
                                            </div>

                                            {/* METRICS ROW */}
                                            <div className="flex gap-4 items-end">
                                                <div className="flex-1 bg-slate-50 rounded-xl p-2 px-3 border border-slate-100 flex items-center gap-2">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">Current</span>
                                                    <input type="number" value={pillar.current} onChange={e => updatePillar(pillar.id, 'current', parseFloat(e.target.value))} className="w-full bg-transparent font-black text-slate-900 outline-none" />
                                                </div>
                                                <div className="text-slate-300 font-black">/</div>
                                                <div className="flex-1 bg-slate-50 rounded-xl p-2 px-3 border border-slate-100 flex items-center gap-2">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">Target</span>
                                                    <input type="number" value={pillar.target} onChange={e => updatePillar(pillar.id, 'target', parseFloat(e.target.value))} className="w-full bg-transparent font-black text-slate-900 outline-none" />
                                                </div>
                                                
                                                {/* Unit Toggle */}
                                                <button onClick={() => updatePillar(pillar.id, 'unit', pillar.unit === '%' ? 'Count' : '%')} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-xs text-slate-500 hover:bg-slate-200 transition-colors">
                                                    {pillar.unit}
                                                </button>
                                            </div>

                                            {/* Icon Selector (Simple) */}
                                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                                {Object.entries(ICONS).map(([key, IconC]) => (
                                                    <button key={key} onClick={() => updatePillar(pillar.id, 'icon', key)} className={cn("p-2 rounded-lg transition-all", pillar.icon === key ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-400 hover:bg-slate-100")}>
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