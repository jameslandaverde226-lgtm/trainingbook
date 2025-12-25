"use client";

import { useMemo, useState } from "react";
import { 
  Check, HardDrive, BookOpen, Loader2, Maximize2, 
  Minimize2, AlertTriangle, Play, ArrowLeft, ChevronRight, LayoutGrid, CheckCircle2 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TeamMember } from "../../../calendar/_components/types";
import { useAppStore } from "@/lib/store/useStore";
import { doc, setDoc, serverTimestamp, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";
import { motion, AnimatePresence, useDragControls, PanInfo } from "framer-motion";
import ClientPortal from "@/components/core/ClientPortal";

// --- MANUAL VIEWER MODAL (Unchanged) ---
function ManualViewerModal({ url, title, pages, onClose, color }: { url: string, title: string, pages: string, onClose: () => void, color: string }) {
    const [loading, setLoading] = useState(true);
    const dragControls = useDragControls();

    return (
        <ClientPortal>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div 
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                drag="y" dragControls={dragControls} dragListener={false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={0.05}
                onDragEnd={(_, info: PanInfo) => { if (info.offset.y > 100) onClose(); }}
                className="fixed bottom-0 left-0 right-0 z-[210] h-[92vh] bg-white rounded-t-[40px] shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
            >
                <div className="absolute top-0 left-0 right-0 h-14 z-50 flex items-start justify-center pt-3 cursor-grab active:cursor-grabbing touch-none bg-gradient-to-b from-white via-white to-transparent" onPointerDown={(e) => dragControls.start(e)}>
                    <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
                </div>
                <div className="flex items-center justify-between px-6 md:px-8 pt-8 md:pt-10 pb-4 border-b border-slate-100 bg-white shrink-0 relative z-40">
                    <div>
                        <div className="flex items-center gap-2 mb-1"><span className={cn("w-2 h-2 rounded-full", color === 'bg-[#004F71]' ? 'bg-[#004F71]' : 'bg-[#E51636]')} /><p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Manual Viewer</p></div>
                        <h3 className="text-lg md:text-xl font-black text-slate-900 leading-none tracking-tight">{title}</h3>
                    </div>
                    <button onClick={onClose} className="p-2.5 bg-slate-50 rounded-full hover:bg-slate-100 transition-all border border-slate-100"><Minimize2 className="w-5 h-5 text-slate-500" /></button>
                </div>
                <div className="relative flex-1 bg-slate-50 overflow-hidden">
                    {loading && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-0"><Loader2 className={cn("w-10 h-10 animate-spin", color === 'bg-[#004F71]' ? "text-[#004F71]" : "text-[#E51636]")} /><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Retrieving Data...</p></div>}
                    <iframe src={url} className="w-full h-full border-none relative z-10" onLoad={() => setLoading(false)} />
                </div>
            </motion.div>
        </ClientPortal>
    );
}

const CANVA_LINKS: Record<string, string> = {
  FOH: "https://www.canva.com/design/DAG7sot3RWY/Sv-7Y3IEyBqUUFB999JiPA/view",
  BOH: "https://www.canva.com/design/DAG7ssYg444/FFZwbb8mLfLGiGrP2VeHiA/view",
  Unassigned: "https://www.canva.com/design/DAG7sot3RWY/Sv-7Y3IEyBqUUFB999JiPA/view"
};

interface Props {
  member: TeamMember;
}

export function CurriculumTab({ member }: Props) {
  const { curriculum, updateMemberLocal } = useAppStore();
  const [activeSection, setActiveSection] = useState<any | null>(null);
  const [manualSection, setManualSection] = useState<any | null>(null);

  const filteredCurriculum = useMemo(() => {
      if (member.dept === "Unassigned") return [];
      const targetDept = member.dept;
      return curriculum.filter(s => s.dept?.toUpperCase() === targetDept?.toUpperCase());
  }, [curriculum, member.dept]);
  
  const globalTotalTasks = useMemo(() => {
      return filteredCurriculum.reduce((acc, curr) => acc + (curr.tasks?.length || 0), 0);
  }, [filteredCurriculum]);

  const handleVerifyTask = async (taskId: string) => {
      const currentIds = member.completedTaskIds || [];
      const wasCompleted = currentIds.includes(taskId);
      
      const newCompletedIds = wasCompleted ? currentIds.filter(id => id !== taskId) : [...currentIds, taskId];
      const newProgress = globalTotalTasks > 0 ? Math.round((newCompletedIds.length / globalTotalTasks) * 100) : 0;

      // Optimistic
      updateMemberLocal(member.id, { completedTaskIds: newCompletedIds, progress: newProgress });

      // DB
      const memberRef = doc(db, "profileOverrides", member.id);
      try {
          await setDoc(memberRef, { 
              completedTaskIds: wasCompleted ? arrayRemove(taskId) : arrayUnion(taskId), 
              progress: newProgress,
              updatedAt: serverTimestamp() 
          }, { merge: true });
          
          if (!wasCompleted) toast.success("Module Verified");
      } catch (e) {
          toast.error("Sync Failed");
          updateMemberLocal(member.id, { completedTaskIds: currentIds }); // Revert
      }
  };

  const getEmbedUrl = () => {
    if (!manualSection) return null;
    const link = CANVA_LINKS[member.dept] || CANVA_LINKS.FOH;
    const base = link.split('?')[0];
    return `${base}?embed#${manualSection.pageStart}`;
  };

  const isFOH = member.dept === "FOH";
  const brandBg = isFOH ? 'bg-[#004F71]' : 'bg-[#E51636]';

  // --- EMPTY STATES ---
  if (member.dept === "Unassigned") {
      return (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 p-8 text-center">
              <div className="p-4 bg-amber-50 rounded-full border border-amber-100 animate-pulse"><AlertTriangle className="w-8 h-8 text-amber-500" /></div>
              <div><h3 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-1">Unit Assignment Required</h3><p className="text-xs text-slate-400 font-medium">Please assign this member to FOH or BOH.</p></div>
          </div>
      );
  }

  if (filteredCurriculum.length === 0) {
      return (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
              <div className="p-4 bg-slate-50 rounded-full border border-slate-100"><BookOpen className="w-10 h-10 opacity-20" /></div>
              <p className="text-xs font-bold uppercase tracking-widest">No Curriculum Found</p>
          </div>
      );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 md:space-y-8 pb-32 h-full overflow-y-auto custom-scrollbar relative bg-[#F8FAFC]">
        
        {/* HEADER AREA - More compact on mobile */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-3">
                <div className={cn("p-2.5 md:p-3 rounded-2xl text-white shadow-lg transition-colors", brandBg)}>
                    <HardDrive className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <div>
                    <h3 className="text-lg md:text-2xl font-[900] text-slate-900 tracking-tight leading-none">Active Curriculum</h3>
                    <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5 md:mt-1">{member.dept} Training Path</p>
                </div>
            </div>
            
            {activeSection && (
                <button 
                    onClick={() => setActiveSection(null)}
                    className="self-start md:self-auto flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                >
                    <ArrowLeft className="w-3.5 h-3.5" /> Return
                </button>
            )}
        </div>

        <AnimatePresence mode="wait">
            
            {/* VIEW 1: PHASE SELECTION GRID */}
            {!activeSection ? (
                <motion.div 
                    key="phase-grid"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="grid grid-cols-1 gap-4"
                >
                    {filteredCurriculum.map((section, i) => {
                        const totalTasks = section.tasks?.length || 0;
                        const completedCount = section.tasks?.filter((t: any) => (member.completedTaskIds || []).includes(t.id)).length || 0;
                        const percent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
                        const isComplete = percent === 100 && totalTasks > 0;

                        return (
                            <motion.div 
                                key={section.id}
                                layoutId={`card-${section.id}`}
                                onClick={() => setActiveSection(section)}
                                className={cn(
                                    "group relative bg-white border rounded-[28px] md:rounded-[32px] p-5 md:p-6 cursor-pointer transition-all hover:scale-[1.01] hover:shadow-lg overflow-hidden",
                                    isComplete ? "border-emerald-100" : "border-slate-200 hover:border-[#004F71]/30"
                                )}
                            >
                                <span className="absolute -right-4 -bottom-8 text-[100px] md:text-[120px] font-[1000] text-slate-50 opacity-50 pointer-events-none group-hover:scale-110 transition-transform duration-500">
                                    {i + 1}
                                </span>

                                <div className="relative z-10 flex items-center justify-between">
                                    <div className="flex items-center gap-4 md:gap-5">
                                        <div className={cn(
                                            "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center font-black text-lg md:text-xl shadow-sm border transition-colors shrink-0",
                                            isComplete ? "bg-emerald-500 text-white border-emerald-400" : "bg-white text-slate-900 border-slate-100 group-hover:border-slate-200"
                                        )}>
                                            {isComplete ? <Check className="w-6 h-6 md:w-7 md:h-7" /> : `0${i + 1}`}
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 mb-1 block truncate">Phase {i + 1}</span>
                                            <h4 className="text-base md:text-xl font-black text-slate-900 truncate leading-tight">{section.title}</h4>
                                            <div className="flex items-center gap-2 mt-2">
                                                <div className="h-1.5 w-16 md:w-24 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className={cn("h-full rounded-full transition-all duration-700", isComplete ? "bg-emerald-500" : brandBg)} style={{ width: `${percent}%` }} />
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-400">{percent}%</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-[#004F71] group-hover:text-white transition-all shrink-0 ml-2">
                                        <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>
            ) : (
                /* VIEW 2: TASK MODULES (DETAIL) */
                <motion.div 
                    key="phase-detail"
                    layoutId={`card-${activeSection.id}`}
                    className="space-y-4 md:space-y-6"
                >
                    {/* Sticky Header Card */}
                    <div className="bg-white border border-slate-200 rounded-[24px] md:rounded-[32px] p-5 md:p-6 shadow-sm flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 mb-1 block">Phase Overview</span>
                                <h2 className="text-xl md:text-2xl font-[1000] text-slate-900 leading-tight">{activeSection.title}</h2>
                            </div>
                            <button 
                                onClick={() => setManualSection(activeSection)}
                                className="flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 bg-slate-900 text-white rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shrink-0"
                            >
                                <BookOpen className="w-3 h-3 md:w-3.5 md:h-3.5" /> <span className="hidden md:inline">Manual</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                        {activeSection.tasks?.map((task: any) => {
                             const isCompleted = (member.completedTaskIds || []).includes(task.id);
                             return (
                                 <motion.button 
                                    key={task.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    onClick={() => handleVerifyTask(task.id)}
                                    whileTap={{ scale: 0.98 }}
                                    className={cn(
                                        "relative overflow-hidden flex items-center gap-4 md:gap-5 p-4 md:p-5 rounded-[20px] md:rounded-[24px] border-2 text-left group transition-all duration-300 min-h-[90px] md:h-28",
                                        isCompleted 
                                            ? "bg-emerald-500 border-emerald-500 shadow-xl shadow-emerald-500/20" 
                                            : "bg-white border-slate-100 hover:border-slate-300 hover:shadow-lg"
                                    )}
                                 >
                                     <div className={cn(
                                         "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border-[3px] shrink-0 transition-all duration-300 z-10",
                                         isCompleted 
                                            ? "bg-white border-white text-emerald-600 scale-110 shadow-sm" 
                                            : "border-slate-200 text-transparent group-hover:border-slate-300 bg-slate-50"
                                     )}>
                                         <Check className="w-4 h-4 md:w-5 md:h-5" strokeWidth={4} />
                                     </div>
                                     
                                     <div className="flex-1 min-w-0 z-10">
                                         <span className={cn(
                                             "text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] block mb-1 transition-colors",
                                             isCompleted ? "text-emerald-100" : "text-slate-400"
                                         )}>
                                             Module
                                         </span>
                                         <span className={cn(
                                             "text-xs md:text-sm font-bold block transition-colors leading-tight line-clamp-2",
                                             isCompleted ? "text-white" : "text-slate-700"
                                         )}>
                                             {task.title}
                                         </span>
                                     </div>

                                     {!isCompleted && (
                                        <div className="opacity-0 group-hover:opacity-10 transition-opacity absolute right-4">
                                            <Play className="w-12 h-12 md:w-16 md:h-16 -rotate-12" />
                                        </div>
                                     )}

                                     {isCompleted && (
                                         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 to-transparent opacity-50" />
                                     )}
                                 </motion.button>
                             )
                        })}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        <AnimatePresence>
            {manualSection && (
                <ManualViewerModal 
                    url={getEmbedUrl()!} 
                    title={manualSection.title} 
                    pages={`${manualSection.pageStart}-${manualSection.pageEnd}`} 
                    color={brandBg} 
                    onClose={() => setManualSection(null)} 
                />
            )}
        </AnimatePresence>
    </div>
  );
}