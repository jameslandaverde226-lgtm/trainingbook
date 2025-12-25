"use client";

import { useMemo, useState } from "react";
import { Check, Terminal, Layers, HardDrive, BookOpen, Loader2, Maximize2, ChevronLeft, ChevronDown, ChevronUp, Hash, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

// FIX: Correct Import Path (3 levels up)
import { TeamMember } from "../../../calendar/_components/types";

import { useAppStore } from "@/lib/store/useStore";
import { doc, setDoc, serverTimestamp, collection, addDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";
import { motion, AnimatePresence, useDragControls, PanInfo } from "framer-motion";
import ClientPortal from "@/components/core/ClientPortal";

// --- MANUAL VIEWER MODAL LOGIC ---
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

  // FIX: Case-Insensitive Match
  const filteredCurriculum = useMemo(() => {
      const targetDept = member.dept === 'Unassigned' ? 'FOH' : member.dept;
      return curriculum.filter(s => s.dept?.toUpperCase() === targetDept?.toUpperCase());
  }, [curriculum, member.dept]);
  
  const handleVerifyTask = async (taskId: string, sectionId: string) => {
      const currentCompleted = member.completedTaskIds || [];
      const wasCompleted = currentCompleted.includes(taskId);
      const memberRef = doc(db, "profileOverrides", member.id);
      
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

  if (filteredCurriculum.length === 0) {
      return (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
              <Layers className="w-12 h-12 opacity-20" />
              <p className="text-xs font-bold uppercase tracking-widest">No Curriculum Found for {member.dept}</p>
          </div>
      );
  }

  return (
    <div className="p-8 space-y-8 pb-32">
        <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-slate-900 text-white rounded-2xl"><HardDrive className="w-5 h-5" /></div>
            <div>
                <h3 className="text-xl font-[900] text-slate-900 tracking-tight">Active Curriculum</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{member.dept} Training Path</p>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
            {filteredCurriculum.map((section, i) => (
                <div key={section.id} className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm group">
                    <div className="bg-slate-50/50 px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                         <div>
                             <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-1">Phase 0{i + 1}</span>
                             <h4 className="text-lg font-bold text-slate-900">{section.title}</h4>
                         </div>
                         <button 
                            onClick={() => setSelectedSection(section)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-[#004F71] hover:border-[#004F71] transition-all shadow-sm"
                         >
                             <BookOpen className="w-3.5 h-3.5" /> Manual
                         </button>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {section.tasks?.map((task: any) => {
                             const isCompleted = (member.completedTaskIds || []).includes(task.id);
                             return (
                                 <button 
                                    key={task.id}
                                    onClick={() => handleVerifyTask(task.id, section.id)}
                                    className={cn(
                                        "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left group hover:scale-[1.02] active:scale-95",
                                        isCompleted ? "border-emerald-100 bg-emerald-50/30" : "border-slate-100 hover:border-slate-200"
                                    )}
                                 >
                                     <div className={cn("w-6 h-6 rounded-full flex items-center justify-center border-2 shrink-0 transition-colors", isCompleted ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-200 text-transparent")}>
                                         <Check className="w-3 h-3" />
                                     </div>
                                     <span className={cn("text-xs font-bold", isCompleted ? "text-emerald-900" : "text-slate-600")}>{task.title}</span>
                                 </button>
                             )
                        })}
                    </div>
                </div>
            ))}
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