// app/(main)/dashboard/_components/StrategicVisionModal.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Target, Zap, TrendingUp, Save, Rocket, Mountain } from "lucide-react";
import { cn } from "@/lib/utils";
import ClientPortal from "@/components/core/ClientPortal";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";

interface VisionData {
  sos: number; // Speed of Service %
  leaders: { current: number; target: number };
  hospitality: number; // Score %
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentData: VisionData;
}

export default function StrategicVisionModal({ isOpen, onClose, currentData }: Props) {
  const [data, setData] = useState<VisionData>(currentData);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
      setIsSaving(true);
      try {
          // We store this in a special singleton document 'vision/current'
          await setDoc(doc(db, "vision", "current"), {
              ...data,
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

  if (!isOpen) return null;

  return (
    <ClientPortal>
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                className="absolute inset-0 bg-[#004F71]/80 backdrop-blur-md" 
                onClick={onClose}
            />
            <motion.div 
                initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden relative z-10"
            >
                <div className="bg-[#004F71] p-8 pb-10 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-10"><Rocket className="w-32 h-32" /></div>
                    <div className="relative z-10">
                        <h2 className="text-2xl font-[1000] tracking-tighter uppercase leading-none">Command Directives</h2>
                        <p className="text-blue-200 text-xs font-bold mt-2 uppercase tracking-widest">Q4 Strategic Targets</p>
                    </div>
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-8 -mt-6 bg-white rounded-t-[32px] space-y-8 relative z-20">
                    
                    {/* 1. SPEED OF SERVICE */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2"><Zap className="w-3 h-3 text-cyan-500" /> Speed of Service</label>
                            <span className="text-sm font-black text-slate-900">{data.sos}%</span>
                        </div>
                        <input 
                            type="range" min="0" max="100" value={data.sos} 
                            onChange={e => setData({...data, sos: parseInt(e.target.value)})}
                            className="w-full h-4 bg-slate-100 rounded-full appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 transition-all"
                        />
                    </div>

                    {/* 2. LEADERSHIP PIPELINE */}
                    <div className="space-y-3">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2 px-1"><Target className="w-3 h-3 text-emerald-500" /> Leadership Growth</label>
                        <div className="flex gap-4">
                            <div className="flex-1 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                <span className="text-[8px] font-bold text-slate-400 uppercase block mb-1">Current Leaders</span>
                                <input className="w-full bg-transparent text-xl font-black text-slate-900 outline-none" type="number" value={data.leaders.current} onChange={e => setData({...data, leaders: {...data.leaders, current: parseInt(e.target.value)}})} />
                            </div>
                            <div className="flex-1 bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
                                <span className="text-[8px] font-bold text-emerald-600 uppercase block mb-1">Target Goal</span>
                                <input className="w-full bg-transparent text-xl font-black text-emerald-700 outline-none" type="number" value={data.leaders.target} onChange={e => setData({...data, leaders: {...data.leaders, target: parseInt(e.target.value)}})} />
                            </div>
                        </div>
                    </div>

                    {/* 3. HOSPITALITY SCORE */}
                    <div className="space-y-3">
                         <div className="flex justify-between items-center px-1">
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2"><Mountain className="w-3 h-3 text-[#E51636]" /> Hospitality Score</label>
                            <span className="text-sm font-black text-slate-900">{data.hospitality}%</span>
                        </div>
                        <input 
                            type="range" min="0" max="100" value={data.hospitality} 
                            onChange={e => setData({...data, hospitality: parseInt(e.target.value)})}
                            className="w-full h-4 bg-slate-100 rounded-full appearance-none cursor-pointer accent-[#E51636] hover:accent-red-500 transition-all"
                        />
                    </div>

                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="w-full py-4 bg-[#004F71] text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        {isSaving ? "Syncing..." : <>Save & Deploy <Save className="w-4 h-4" /></>}
                    </button>
                </div>
            </motion.div>
        </div>
    </ClientPortal>
  );
}