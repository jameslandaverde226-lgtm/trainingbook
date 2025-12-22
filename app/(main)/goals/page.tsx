"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Target, MoreHorizontal, ArrowRight, CheckCircle2, 
  Clock, Sparkles, X, Loader2, Search
} from "lucide-react";
import { cn } from "@/lib/utils";

// Firebase & Global Store
import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { useAppStore } from "@/lib/store/useStore";
import { CalendarEvent, Priority, TeamMember } from "../calendar/_components/types";

const COLUMNS = [
  { id: "To Do", label: "Future Vision", color: "bg-slate-300" },
  { id: "In Progress", label: "In Progress", color: "bg-blue-500" },
  { id: "Done", label: "Accomplished", color: "bg-emerald-500" },
];

export default function GoalsBoardPage() {
  const { events, team, subscribeEvents, subscribeTeam, loading } = useAppStore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");

  useEffect(() => {
    const unsubEvents = subscribeEvents();
    const unsubTeam = subscribeTeam();
    return () => { unsubEvents(); unsubTeam(); };
  }, [subscribeEvents, subscribeTeam]);

  // Filter only "Goal" type events
  const goals = useMemo(() => events.filter(e => e.type === "Goal"), [events]);

  const handleCreate = async () => {
    if (!newGoalTitle.trim()) return;
    await addDoc(collection(db, "events"), {
      title: newGoalTitle,
      type: "Goal",
      status: "To Do",
      priority: "Medium",
      startDate: new Date(),
      endDate: addDoc, // Default logic
      assignee: team[0]?.id || "System",
      assigneeName: team[0]?.name || "Director",
      createdAt: serverTimestamp()
    });
    setNewGoalTitle("");
    setIsCreateOpen(false);
  };

  const moveGoal = async (id: string, newStatus: string) => {
    await updateDoc(doc(db, "events", id), { status: newStatus });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8 font-sans">
      <div className="max-w-[1800px] mx-auto space-y-8 mt-20">
        <div className="flex justify-between items-end pb-6 border-b border-slate-200">
           <div>
              <h1 className="text-5xl font-black text-[#004F71]">Strategic Board</h1>
              <p className="mt-2 text-slate-500 font-medium">Manage high-level objectives. Synced with Operations Schedule.</p>
           </div>
           <button onClick={() => setIsCreateOpen(true)} className="h-12 px-6 bg-[#E51636] text-white rounded-xl font-black uppercase text-xs shadow-lg flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Goal
           </button>
        </div>

        {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-300" /></div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {COLUMNS.map((col) => (
                    <div key={col.id} className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 px-2">
                            <div className={cn("w-3 h-3 rounded-full", col.color)} />
                            <h3 className="text-sm font-black text-slate-700 uppercase">{col.label}</h3>
                        </div>
                        <div className="flex-1 rounded-[24px] p-2 bg-slate-50/50 border border-dashed border-slate-200 min-h-[500px]">
                            <div className="space-y-3">
                                {goals.filter(g => g.status === col.id).map((goal) => (
                                    <motion.div layoutId={goal.id} key={goal.id} className="bg-white p-5 rounded-[20px] shadow-sm border border-slate-100 group">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-wider">Goal</span>
                                            {col.id !== "Done" && (
                                                <button onClick={() => moveGoal(goal.id, "Done")} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-emerald-50 text-emerald-500 rounded-md transition-all">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-800 leading-snug mb-4">{goal.title}</h4>
                                        <div className="flex items-center justify-between border-t pt-3">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                                                <Clock className="w-3 h-3" /> Targeted
                                            </div>
                                            <div className="w-7 h-7 rounded-full bg-[#004F71] flex items-center justify-center text-[8px] font-black text-white">
                                                {goal.assignee.substring(0, 2).toUpperCase()}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}

        <AnimatePresence>
            {isCreateOpen && (
               <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-[#004F71]/40 backdrop-blur-sm" onClick={() => setIsCreateOpen(false)} />
                  <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="relative w-full max-w-lg bg-white rounded-[32px] p-8 shadow-2xl">
                        <h2 className="text-2xl font-black mb-6">Create New Goal</h2>
                        <input autoFocus value={newGoalTitle} onChange={e => setNewGoalTitle(e.target.value)} className="w-full text-lg font-bold border-b-2 outline-none mb-8 focus:border-[#E51636]" placeholder="Improve speed of service..." />
                        <button onClick={handleCreate} className="w-full py-4 bg-[#004F71] text-white rounded-xl font-black uppercase shadow-lg">Launch Objective</button>
                  </motion.div>
               </div>
            )}
        </AnimatePresence>
      </div>
    </div>
  );
}