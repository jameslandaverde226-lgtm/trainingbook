"use client";

import { useMemo, useState } from "react";
import { 
  Check, HardDrive, BookOpen, Loader2, Maximize2, 
  Minimize2, AlertTriangle, Play, Shield, Circle, CheckCircle2 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TeamMember } from "../../../calendar/_components/types";
import { useAppStore } from "@/lib/store/useStore";
import { doc, setDoc, serverTimestamp, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";
import { motion, AnimatePresence, useDragControls, PanInfo } from "framer-motion";
import ClientPortal from "@/components/core/ClientPortal";

// --- MANUAL VIEWER MODAL ---
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
                <div className="flex items-center justify-between px-8 pt-10 pb-4 border-b border-slate-100 bg-white shrink-0 relative z-40">
                    <div>
                        <div className="flex items-center gap-2 mb-1"><span className={cn("w-2 h-2 rounded-full", color === 'bg-[#004F71]' ? 'bg-[#004F71]' : 'bg-[#E51636]')} /><p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Manual Viewer</p></div>
                        <h3 className="text-xl font-black text-slate-900 leading-none tracking-tight">{title}</h3>
                    </div>
                    <button onClick={onClose} className="p-3 bg-slate-50 rounded-full hover:bg-slate-100 transition-all border border-slate-100"><Minimize2 className="w-5 h-5 text-slate-500" /></button>
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
  const { curriculum } = useAppStore();
  const [selectedSection, setSelectedSection] = useState<any>(null);

  const filteredCurriculum = useMemo(() => {
      if (member.dept === "Unassigned") return [];
      const targetDept = member.dept;
      return curriculum.filter(s => s.dept?.toUpperCase() === targetDept?.toUpperCase());
  }, [curriculum, member.dept]);
  
  const handleVerifyTask = async (taskId: string) => {
      const currentCompleted = member.completedTaskIds || [];
      const wasCompleted = currentCompleted.includes(taskId);
      const memberRef = doc(db, "profileOverrides", member.id);
      
      // Calculate optimistic update
      // (The global store will eventually sync, but standard firestore listeners are fast enough usually)
      await setDoc(memberRef, { 
          completedTaskIds: wasCompleted ? arrayRemove(taskId) : arrayUnion(taskId), 
          updatedAt: serverTimestamp() 
      }, { merge: true });
      
      toast.success(wasCompleted ? "Progress Revoked" : "Module Verified");
  };

  const getEmbedUrl = () => {
    if (!selectedSection) return null;
    const link = CANVA_LINKS[member.dept] || CANVA_LINKS.FOH;
    const base = link.split('?')[0];
    return `${base}?embed#${selectedSection.pageStart}`;
  };

  const isFOH = member.dept === "FOH";
  const brandBg = isFOH ? 'bg-[#004F71]' : 'bg-[#E51636]';
  const brandText = isFOH ? 'text-[#004F71]' : 'text-[#E51636]';
  const brandBorder = isFOH ? 'border-[#004F71]' : 'border-[#E51636]';

  // --- EMPTY STATE: UNASSIGNED ---
  if (member.dept === "Unassigned") {
      return (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 p-8 text-center">
              <div className="p-4 bg-amber-50 rounded-full border border-amber-100 animate-pulse">
                  <AlertTriangle className="w-8 h-8 text-amber-500" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-1">Unit Assignment Required</h3>
                <p className="text-xs text-slate-400 font-medium">Please assign this member to FOH or BOH to view their training path.</p>
              </div>
          </div>
      );
  }

  // --- EMPTY STATE: NO DATA ---
  if (filteredCurriculum.length === 0) {
      return (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
              <div className="p-4 bg-slate-50 rounded-full border border-slate-100">
                  <BookOpen className="w-10 h-10 opacity-20" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest">No Curriculum Found for {member.dept}</p>
          </div>
      );
  }

  return (
    <div className="p-8 space-y-8 pb-32 h-full overflow-y-auto custom-scrollbar">
        <div className="flex items-center gap-3 mb-6">
            <div className={cn("p-3 rounded-2xl text-white shadow-lg", brandBg)}>
                <HardDrive className="w-5 h-5" />
            </div>
            <div>
                <h3 className="text-2xl font-[900] text-slate-900 tracking-tight leading-none">Active Curriculum</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{member.dept} Training Path</p>
            </div>
        </div>

        <div className="space-y-8">
            {filteredCurriculum.map((section, i) => {
                // Calculate Progress for this specific section
                const totalTasks = section.tasks?.length || 0;
                const completedCount = section.tasks?.filter((t: any) => (member.completedTaskIds || []).includes(t.id)).length || 0;
                const percent = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;
                const isSectionComplete = percent === 100 && totalTasks > 0;

                return (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={section.id} 
                        className={cn(
                            "bg-white border rounded-[32px] overflow-hidden shadow-sm transition-all duration-500",
                            isSectionComplete ? "border-emerald-100 shadow-emerald-500/5 ring-1 ring-emerald-500/10" : "border-slate-200"
                        )}
                    >
                        {/* PHASE HEADER */}
                        <div className="bg-slate-50/40 px-8 py-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                             <div className="flex items-center gap-4">
                                 <div className={cn(
                                     "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm border border-white",
                                     isSectionComplete ? "bg-emerald-500 text-white" : "bg-white text-slate-300"
                                 )}>
                                     {isSectionComplete ? <Check className="w-6 h-6" /> : `0${i + 1}`}
                                 </div>
                                 <div>
                                     <div className="flex items-center gap-3 mb-1">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Phase {i + 1}</span>
                                        {isSectionComplete && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase tracking-widest rounded-full">Completed</span>}
                                     </div>
                                     <h4 className="text-xl font-black text-slate-900 leading-none">{section.title}</h4>
                                 </div>
                             </div>
                             
                             <div className="flex items-center gap-4 pl-16 md:pl-0">
                                 <div className="flex flex-col items-end mr-2">
                                     <div className="w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                         <div 
                                            className={cn("h-full rounded-full transition-all duration-1000 ease-out", isSectionComplete ? "bg-emerald-500" : brandBg)} 
                                            style={{ width: `${percent}%` }}
                                         />
                                     </div>
                                     <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{completedCount}/{totalTasks} Completed</span>
                                 </div>

                                 <button 
                                    onClick={() => setSelectedSection(section)}
                                    className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm hover:shadow-md active:scale-95 group"
                                 >
                                     <BookOpen className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> 
                                     <span className="hidden sm:inline">Manual</span>
                                 </button>
                             </div>
                        </div>

                        {/* MODULE GRID */}
                        <div className="p-6 md:p-8 bg-gradient-to-b from-white to-slate-50/30">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {section.tasks?.map((task: any) => {
                                     const isCompleted = (member.completedTaskIds || []).includes(task.id);
                                     return (
                                         <motion.button 
                                            key={task.id}
                                            layout
                                            onClick={() => handleVerifyTask(task.id)}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className={cn(
                                                "relative overflow-hidden flex items-center gap-5 p-5 rounded-[24px] border-2 text-left group transition-all duration-300",
                                                isCompleted 
                                                    ? "bg-emerald-500 border-emerald-500 shadow-xl shadow-emerald-500/20" 
                                                    : "bg-white border-slate-100 hover:border-slate-300 hover:shadow-lg"
                                            )}
                                         >
                                             {/* Check Circle */}
                                             <div className={cn(
                                                 "w-8 h-8 rounded-full flex items-center justify-center border-[3px] shrink-0 transition-all duration-300 z-10",
                                                 isCompleted 
                                                    ? "bg-white border-white text-emerald-600 scale-110" 
                                                    : "border-slate-200 text-transparent group-hover:border-slate-300"
                                             )}>
                                                 <Check className="w-4 h-4" strokeWidth={4} />
                                             </div>
                                             
                                             <div className="flex-1 min-w-0 z-10">
                                                 <span className={cn(
                                                     "text-[9px] font-black uppercase tracking-[0.2em] block mb-1 transition-colors",
                                                     isCompleted ? "text-emerald-100" : "text-slate-400"
                                                 )}>
                                                     Module
                                                 </span>
                                                 <span className={cn(
                                                     "text-sm font-bold block truncate transition-colors",
                                                     isCompleted ? "text-white" : "text-slate-700"
                                                 )}>
                                                     {task.title}
                                                 </span>
                                             </div>

                                             {/* Decorative Icon - Only visible when not completed to keep completed clean */}
                                             {!isCompleted && (
                                                <div className="opacity-0 group-hover:opacity-10 transition-opacity absolute right-4">
                                                    <Play className="w-12 h-12 -rotate-12" />
                                                </div>
                                             )}

                                             {/* Success Burst Background */}
                                             {isCompleted && (
                                                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 to-transparent opacity-50" />
                                             )}
                                         </motion.button>
                                     )
                                })}
                            </div>
                            
                            {/* Empty Tasks State */}
                            {(!section.tasks || section.tasks.length === 0) && (
                                <div className="text-center py-8 opacity-40">
                                    <p className="text-xs font-bold uppercase tracking-widest">No modules configured for this phase</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                );
            })}
        </div>

        <AnimatePresence>
            {selectedSection && (
                <ManualViewerModal 
                    url={getEmbedUrl()!} 
                    title={selectedSection.title} 
                    pages={`${selectedSection.pageStart}-${selectedSection.pageEnd}`} 
                    color={brandBg} 
                    onClose={() => setSelectedSection(null)} 
                />
            )}
        </AnimatePresence>
    </div>
  );
}