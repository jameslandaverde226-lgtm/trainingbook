"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence, PanInfo, useDragControls } from "framer-motion";
import { 
  Plus, Trash2, GripVertical, Eye, Settings, X, Utensils, Coffee, 
  Cloud, Maximize2, Image as ImageIcon, CalendarClock, 
  BookOpen, Activity, Loader2, Sparkles, Layers,
  ChevronUp, ChevronDown, Hash, Terminal, ChevronRight, Book, Minimize2
} from "lucide-react";
import { cn } from "@/lib/utils";

// Firebase & Store
import { db, storage } from "@/lib/firebase";
import { 
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, doc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAppStore } from "@/lib/store/useStore";
// Shared Types
import { Department } from "../calendar/_components/types";
import ClientPortal from "@/components/core/ClientPortal";

interface Task {
  id: string;
  title: string;
  image?: string;
  duration?: string;
}

interface Section {
  id: string;
  title: string;
  duration: string;
  pageStart: number;
  pageEnd: number;
  tasks: Task[];
  dept: Department;
  order: number;
}

const CANVA_LINKS: Record<string, string> = {
  FOH: "https://www.canva.com/design/DAG7sot3RWY/Sv-7Y3IEyBqUUFB999JiPA/view",
  BOH: "https://www.canva.com/design/DAG7ssYg444/FFZwbb8mLfLGiGrP2VeHiA/view",
  Unassigned: "https://www.canva.com/design/DAG7sot3RWY/Sv-7Y3IEyBqUUFB999JiPA/view" 
};

function PageRangeSelector({ start, end, onUpdate }: any) {
    const adjust = (field: 'pageStart' | 'pageEnd', amount: number) => {
        const currentVal = field === 'pageStart' ? start : end;
        const newVal = Math.max(1, (currentVal || 0) + amount);
        onUpdate({ [field]: newVal });
    };

    return (
        <div className="flex items-center bg-white/90 backdrop-blur-md border border-slate-200 rounded-full p-1.5 shadow-lg ring-1 ring-black/5">
            <div className="px-3 flex items-center gap-2 border-r border-slate-200/60">
                <Hash className="w-3.5 h-3.5 text-[#004F71]" />
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Pages</span>
            </div>
            <div className="flex items-center px-2 group/page relative min-w-[36px] justify-center">
                <span className="text-sm font-black text-slate-900 tabular-nums">{start || 1}</span>
                <div className="flex flex-col ml-1 opacity-0 group-hover/page:opacity-100 transition-opacity absolute -top-8 bg-white shadow-md rounded-lg p-1 pointer-events-none group-hover/page:pointer-events-auto">
                    <button onClick={() => adjust('pageStart', 1)} className="text-slate-400 hover:text-[#004F71]"><ChevronUp className="w-3 h-3" /></button>
                    <button onClick={() => adjust('pageStart', -1)} className="text-slate-400 hover:text-[#004F71]"><ChevronDown className="w-3 h-3" /></button>
                </div>
            </div>
            <div className="text-slate-300 font-bold px-0.5 opacity-40">—</div>
            <div className="flex items-center px-2 group/page relative min-w-[36px] justify-center">
                <span className="text-sm font-black text-slate-900 tabular-nums">{end || 2}</span>
                <div className="flex flex-col ml-1 opacity-0 group-hover/page:opacity-100 transition-opacity absolute -top-8 bg-white shadow-md rounded-lg p-1 pointer-events-none group-hover/page:pointer-events-auto">
                    <button onClick={() => adjust('pageEnd', 1)} className="text-slate-400 hover:text-[#004F71]"><ChevronUp className="w-3 h-3" /></button>
                    <button onClick={() => adjust('pageEnd', -1)} className="text-slate-400 hover:text-[#004F71]"><ChevronDown className="w-3 h-3" /></button>
                </div>
            </div>
        </div>
    );
}

export default function TrainingBuilderPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [activeDept, setActiveDept] = useState<Department>("FOH");
  const [previewMode, setPreviewMode] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [iframeLoading, setIframeLoading] = useState(false);
  const [isIslandExpanded, setIsIslandExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  
  const [mobileViewerOpen, setMobileViewerOpen] = useState(false);
  const dragControls = useDragControls();

  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    const q = query(collection(db, "curriculum"), where("dept", "==", activeDept));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Section[];
      const sortedData = data.sort((a, b) => (a.order || 0) - (b.order || 0));
      setSections(sortedData);
      if (data.length > 0 && !activeSectionId) setActiveSectionId(data[0].id);
    });
    return () => unsubscribe();
  }, [activeDept]);

  const activeIndex = sections.findIndex(s => s.id === activeSectionId);
  const activeSection = useMemo(() => sections[activeIndex] || sections[0], [sections, activeIndex]);

  const getEmbedUrl = () => {
    if (!activeSection || !activeSection.pageStart) return null;
    const link = CANVA_LINKS[activeDept] || CANVA_LINKS.FOH;
    const base = link.split('?')[0];
    return `${base}?embed#${activeSection.pageStart}`;
  };

  useEffect(() => {
    const handleScroll = () => {
        const viewportCenter = window.innerHeight / 2;
        let closestId = activeSectionId;
        let minDistance = Infinity;

        sections.forEach((s) => {
            const el = sectionRefs.current[s.id];
            if (el) {
                const rect = el.getBoundingClientRect();
                const elementCenter = rect.top + (rect.height / 2);
                const distance = Math.abs(viewportCenter - elementCenter);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestId = s.id;
                }
            }
        });

        if (closestId && closestId !== activeSectionId) {
            setActiveSectionId(closestId);
            if (window.innerWidth >= 1024 || mobileViewerOpen) {
                setIframeLoading(true);
            }
        }
    };
    
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections, activeSectionId, mobileViewerOpen]);

  useEffect(() => {
    if(iframeLoading) {
        const timer = setTimeout(() => setIframeLoading(false), 800);
        return () => clearTimeout(timer);
    }
  }, [iframeLoading]);

  const addSection = async () => {
    const nextOrder = sections.length > 0 ? (sections[sections.length - 1].order || 0) + 1 : 0;
    const lastPage = sections.length > 0 ? (Number(sections[sections.length - 1].pageEnd) || 0) : 0;
    const docRef = await addDoc(collection(db, "curriculum"), {
        title: "New Training Phase", duration: "Day 1", pageStart: lastPage + 1, pageEnd: lastPage + 2,
        tasks: [], dept: activeDept, order: nextOrder, createdAt: serverTimestamp()
    });
    setActiveSectionId(docRef.id);
  };

  const updateSection = async (id: string, updates: Partial<Section>) => {
    await updateDoc(doc(db, "curriculum", id), updates);
  };

  const handleFileUpload = async (section: Section, taskId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    try {
      const storageRef = ref(storage, `curriculum/${activeDept}/${section.id}/${taskId}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      const newTasks = section.tasks.map(t => t.id === taskId ? { ...t, image: url } : t);
      await updateDoc(doc(db, "curriculum", section.id), { tasks: newTasks });
    } catch (error) { console.error(error); } finally { setIsProcessing(false); }
  };

  const handleMobileCardClick = (sectionId: string) => {
      setActiveSectionId(sectionId);
      setMobileViewerOpen(true);
      setIframeLoading(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans relative overflow-x-hidden">
      
      {/* --- MOBILE HEADER (Sticky Island) --- */}
      {/* Moved 'top-20' to 'top-[72px]' to sit nicely below the global header on mobile */}
      {/* Added margin bottom to push content down */}
      <div className="md:hidden sticky top-[72px] z-[40] w-full px-4 mb-8 flex justify-center pointer-events-none">
        <motion.div 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="pointer-events-auto bg-white/90 backdrop-blur-xl border border-white/60 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] rounded-full p-1.5 flex items-center justify-between ring-1 ring-black/5 w-full max-w-sm"
        >
            <div className="flex bg-slate-100/50 p-1 rounded-full border border-slate-200/50">
                <button 
                    onClick={() => setActiveDept("FOH")} 
                    className={cn(
                        "px-4 py-2 text-[10px] font-black rounded-full transition-all flex items-center gap-1.5", 
                        activeDept === "FOH" ? "bg-white text-[#004F71] shadow-sm ring-1 ring-black/5" : "text-slate-400"
                    )}
                >
                    <Coffee className="w-3.5 h-3.5" /> FOH
                </button>
                <button 
                    onClick={() => setActiveDept("BOH")} 
                    className={cn(
                        "px-4 py-2 text-[10px] font-black rounded-full transition-all flex items-center gap-1.5", 
                        activeDept === "BOH" ? "bg-white text-[#E51636] shadow-sm ring-1 ring-black/5" : "text-slate-400"
                    )}
                >
                    <Utensils className="w-3.5 h-3.5" /> BOH
                </button>
            </div>
            
            <div className="flex items-center gap-3 pr-4">
                <div className="h-6 w-px bg-slate-200" />
                <div className="flex flex-col items-end leading-none">
                    <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Phase</span>
                    <AnimatePresence mode="popLayout">
                        <motion.span 
                            key={activeIndex}
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -10, opacity: 0 }}
                            className={cn("text-xs font-black tabular-nums", activeDept === "FOH" ? "text-[#004F71]" : "text-[#E51636]")}
                        >
                            {String(activeIndex + 1).padStart(2, '0')}
                        </motion.span>
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
      </div>

      {/* --- DESKTOP DYNAMIC ISLAND (Hidden Mobile) --- */}
      <div className="hidden md:flex fixed top-24 left-0 right-0 z-[120] justify-center pointer-events-none px-4" onMouseEnter={() => setIsIslandExpanded(true)} onMouseLeave={() => setIsIslandExpanded(false)}>
        <motion.div 
            layout animate={{ width: isIslandExpanded ? 780 : 380, height: 60 }} 
            transition={{ type: "spring", stiffness: 350, damping: 35 }}
            className="pointer-events-auto bg-white/90 backdrop-blur-2xl border border-slate-200/60 shadow-xl rounded-full p-2 flex items-center overflow-hidden ring-1 ring-black/5"
        >
            <AnimatePresence mode="wait">
                {!isIslandExpanded ? (
                   <motion.div key="c" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-4 px-5 w-full">
                      <div className={cn("w-2 h-2 rounded-full animate-pulse", activeDept === "FOH" ? "bg-[#004F71] shadow-[0_0_12px_#004f71]" : "bg-[#E51636] shadow-[0_0_12px_#e51636]")} />
                      <div className="flex flex-col flex-1 overflow-hidden">
                          <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em] leading-none mb-1">Active Tracking</span>
                          <span className="text-xs font-black truncate text-slate-800 tracking-tight">{activeSection?.title || "Ops Syncing..."}</span>
                      </div>
                      <div className="h-8 w-px bg-slate-100 mx-1" />
                      <div className="flex flex-col items-end shrink-0">
                          <AnimatePresence mode="popLayout">
                            <motion.span 
                                key={activeIndex}
                                initial={{ y: 5, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className={cn("text-[10px] font-black tabular-nums", activeDept === "FOH" ? "text-[#004F71]" : "text-[#E51636]")}
                            >
                                PH {String(activeIndex + 1).padStart(2, '0')}
                            </motion.span>
                          </AnimatePresence>
                          <span className="text-[8px] font-bold text-slate-300 uppercase">Stage</span>
                      </div>
                   </motion.div>
                ) : (
                    <motion.div key="e" initial={{ opacity: 0, filter: "blur(4px)" }} animate={{ opacity: 1, filter: "blur(0px)" }} className="flex items-center justify-between w-full px-2">
                        <div className="flex bg-slate-100/80 p-1 rounded-full border border-slate-200/50">
                            <button onClick={() => setActiveDept("FOH")} className={cn("px-5 py-2 text-[10px] font-black rounded-full transition-all flex items-center gap-2", activeDept === "FOH" ? "bg-white text-[#004F71] shadow-sm" : "text-slate-400 hover:text-slate-600")}><Coffee className="w-3.5 h-3.5" /> FOH</button>
                            <button onClick={() => setActiveDept("BOH")} className={cn("px-5 py-2 text-[10px] font-black rounded-full transition-all flex items-center gap-2", activeDept === "BOH" ? "bg-white text-[#E51636] shadow-sm" : "text-slate-400 hover:text-slate-600")}><Utensils className="w-3.5 h-3.5" /> BOH</button>
                        </div>
                        <div className="flex-1 px-6 flex justify-center"><div className={cn("flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all duration-700", activeDept === "FOH" ? "bg-blue-50/50 border-[#004F71]/20 text-[#004F71]" : "bg-red-50/50 border-[#E51636]/20 text-[#E51636]")}><div className={cn("w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] text-white shadow-lg", activeDept === "FOH" ? "bg-[#004F71]" : "bg-[#E51636]")}>{activeIndex + 1}</div><span className="text-[11px] font-black uppercase tracking-widest truncate max-w-[180px]">{activeSection?.title || "Drafting..."}</span></div></div>
                        <button onClick={() => setPreviewMode(!previewMode)} className={cn("px-5 py-2 rounded-full text-[10px] font-black uppercase flex items-center gap-2 border shadow-sm transition-all", previewMode ? "bg-slate-900 text-white shadow-lg" : "bg-white text-slate-500 hover:bg-slate-50")}>{previewMode ? <Settings className="w-4 h-4" /> : <Eye className="w-4 h-4" />}<span>{previewMode ? "Editor" : "Preview"}</span></button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
      </div>

      <div className="max-w-[1800px] mx-auto px-4 md:px-6 pt-0 md:pt-48 grid grid-cols-12 gap-8 md:gap-12 items-stretch relative z-10 pb-32">
         
         {/* LEFT COLUMN: LIST */}
         <div className="col-span-12 lg:col-span-7 space-y-6 md:space-y-12 pl-0 md:pl-12 border-l-0 md:border-l-2 border-slate-100 md:ml-8 relative">
            {sections.map((section, idx) => {
               const isActive = activeSectionId === section.id;
               return (
               <div 
                  key={section.id} 
                  ref={el => { sectionRefs.current[section.id] = el; }} 
                  className={cn(
                      "relative transition-all duration-500", 
                      isActive ? "z-30" : "z-0"
                  )}
               >
                  <AnimatePresence>
                    {isActive && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }} 
                            animate={{ opacity: 0.2, scale: 1.15 }} 
                            exit={{ opacity: 0, scale: 0.9 }} 
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className={cn(
                                "absolute -inset-10 md:-inset-16 bg-gradient-to-r from-transparent via-current to-transparent blur-[80px] md:blur-[120px] rounded-[50%] -z-10 pointer-events-none hidden md:block", 
                                activeDept === "FOH" ? "text-blue-500" : "text-red-500"
                            )} 
                        />
                    )}
                  </AnimatePresence>
                  
                  {/* Phase Number Badge (Desktop Only) */}
                  <div className={cn("hidden md:flex absolute -left-[69px] top-0 w-12 h-12 rounded-2xl flex-col items-center justify-center font-black text-white shadow-lg transition-all duration-700 border-4 border-[#F8FAFC] z-20", isActive ? (activeDept === "FOH" ? "bg-[#004F71] scale-110" : "bg-[#E51636] scale-110") : "bg-slate-200 grayscale opacity-40")}><span className="text-[8px] opacity-60 uppercase font-black">Ph</span><span className="text-base">{idx + 1}</span></div>
                  
                  <div 
                    onClick={() => handleMobileCardClick(section.id)}
                    className={cn(
                        "bg-white rounded-[24px] md:rounded-[32px] p-5 md:p-8 border transition-all duration-700 relative group/card cursor-pointer lg:cursor-default z-10 flex flex-col shadow-sm", 
                        isActive 
                            ? "border-slate-200 scale-100 ring-1 ring-black/5" 
                            : "border-transparent opacity-100 md:opacity-60 md:scale-95 hover:scale-[0.98] md:hover:scale-[1.01]"
                    )}
                  >
                     <div className="flex justify-between items-start mb-6 md:mb-8 gap-4 md:gap-6">
                        <div className="flex-1 space-y-2 md:space-y-3">
                           <div className="flex items-center gap-3">
                              <div className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-100 text-[10px] font-black uppercase text-slate-400 shadow-inner")}><CalendarClock className="w-3.5 h-3.5" /><input value={section.duration} onChange={e => updateSection(section.id, { duration: e.target.value })} onClick={(e) => e.stopPropagation()} className="bg-transparent border-none focus:outline-none w-20 p-0 font-black" /></div>
                              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{section.tasks.length} Modules</span>
                           </div>
                           <input value={section.title} onChange={e => updateSection(section.id, { title: e.target.value })} onClick={(e) => e.stopPropagation()} className="text-xl md:text-4xl font-black text-slate-900 bg-transparent w-full outline-none border-none focus:ring-0 p-0 tracking-tighter" />
                        </div>
                        <div className="flex items-start gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <div className="hidden md:block">
                                <PageRangeSelector start={section.pageStart} end={section.pageEnd} onUpdate={(u: any) => updateSection(section.id, u)} />
                            </div>
                            <button onClick={() => deleteDoc(doc(db, "curriculum", section.id))} className="p-2 md:p-3 text-slate-300 hover:text-red-500 transition-all bg-slate-50 rounded-xl md:rounded-2xl border border-slate-200 hover:shadow-md active:scale-90"><Trash2 className="w-4 h-4" /></button>
                        </div>
                     </div>
                     
                     <div className="space-y-3 md:space-y-2.5">
                        {section.tasks.map(task => (
                           <div key={task.id} className="group bg-slate-50/50 rounded-xl md:rounded-2xl p-4 md:p-4 border border-transparent hover:border-slate-200 hover:bg-white transition-all flex items-center gap-3 md:gap-4" onClick={(e) => e.stopPropagation()}>
                              <GripVertical className="w-4 h-4 text-slate-200" />
                              <div className="flex-1"><input value={task.title} onChange={e => {
                                    const newTasks = section.tasks.map(t => t.id === task.id ? { ...t, title: e.target.value } : t);
                                    updateSection(section.id, { tasks: newTasks });
                                 }} className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-300" placeholder="Enter objective..." /></div>
                              <div className="flex items-center gap-2">
                                 {task.image && <div onClick={() => setViewingImage(task.image!)} className="w-8 h-8 rounded-lg overflow-hidden border-2 border-white shadow-sm cursor-zoom-in shrink-0"><img src={task.image} className="w-full h-full object-cover" /></div>}
                                 <label className="cursor-pointer p-2 hover:bg-blue-50 text-slate-300 hover:text-blue-500 rounded-lg transition-all opacity-0 group-hover:opacity-100 shrink-0"><Cloud className="w-4 h-4" /><input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(section, task.id, e)} /></label>
                                 <button onClick={() => updateDoc(doc(db, "curriculum", section.id), { tasks: section.tasks.filter(t => t.id !== task.id) })} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 shrink-0"><X className="w-4 h-4" /></button>
                              </div>
                           </div>
                        ))}
                        <button onClick={(e) => {
                            e.stopPropagation();
                            const newTask = { id: Math.random().toString(36).substr(2, 9), title: "", duration: "15m" };
                            updateSection(section.id, { tasks: [...section.tasks, newTask] });
                        }} className="w-full py-4 md:py-3.5 border-2 border-dashed border-slate-200 rounded-xl md:rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:border-[#004F71] hover:text-[#004F71] transition-all flex items-center justify-center gap-2 group"><Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" /> Add Logic Block</button>
                     </div>
                     
                     {/* Mobile Only: Tap to View Manual Prompt */}
                     <div className="lg:hidden mt-6 flex justify-center text-slate-400 text-[9px] font-bold uppercase tracking-widest flex items-center gap-2 bg-slate-50 py-3 rounded-xl border border-slate-100">
                         <span>Tap card to open manual</span>
                         <ChevronRight className="w-3 h-3" />
                     </div>
                  </div>
               </div>
            )})}
            <button onClick={addSection} className="w-full py-12 md:py-16 border-4 border-dashed rounded-[32px] md:rounded-[44px] font-black uppercase transition-all flex flex-col items-center justify-center gap-4 group border-slate-200 text-slate-300 hover:border-[#004F71] hover:text-[#004F71] hover:bg-white mb-32 md:mb-0">
                <div className={cn("p-4 rounded-full transition-all group-hover:scale-110 shadow-sm bg-slate-50 group-hover:bg-[#004F71] group-hover:text-white")}><Plus className="w-8 h-8" /></div>
                <span className="text-lg md:text-xl tracking-tighter">Create New Phase</span>
            </button>
         </div>

         {/* === RIGHT: DESKTOP PREVIEW HUB (Hidden on Mobile) === */}
         <div className="hidden lg:block col-span-5 relative h-full">
            <div className="sticky top-[160px] z-40 transition-all duration-500">
               <div className={cn("absolute inset-0 bg-gradient-to-br opacity-30 blur-[100px] transition-colors duration-1000 -z-10", activeDept === "FOH" ? "from-blue-200" : "from-red-200")} />
               <div className="h-[calc(100vh-220px)] bg-white rounded-[44px] border border-slate-200/60 shadow-2xl overflow-hidden flex flex-col relative ring-1 ring-black/5">
                  <div className="px-7 py-5 border-b flex justify-between items-center bg-white/50 backdrop-blur-md shrink-0">
                     <div className="flex items-center gap-3"><div className={cn("p-2 rounded-xl text-white shadow-md", activeDept === "FOH" ? "bg-[#004F71]" : "bg-[#E51636]")}><BookOpen className="w-4 h-4" /></div><span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">Preview Hub</span></div>
                     <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pages {activeSection?.pageStart || "?"}—{activeSection?.pageEnd || "?"}</span>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                     </div>
                  </div>

                  <div className="flex-1 bg-slate-50 relative group isolate overflow-hidden">
                     <AnimatePresence mode="wait">
                        {iframeLoading && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-white flex flex-col items-center justify-center p-12 text-center">
                                <Loader2 className={cn("w-10 h-10 animate-spin mb-6", activeDept === "FOH" ? "text-[#004F71]" : "text-[#E51636]")} />
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter mb-1 leading-none">Syncing Intelligence</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mt-2">Loading Page {activeSection?.pageStart}...</p>
                            </motion.div>
                        )}
                     </AnimatePresence>
                     {getEmbedUrl() ? (
                        <iframe src={getEmbedUrl()!} className="w-full h-full border-none mix-blend-multiply transition-opacity duration-1000" loading="lazy" onLoad={() => setIframeLoading(false)} />
                     ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-2"><BookOpen className="w-8 h-8 opacity-20" /><p className="text-[10px] font-bold uppercase tracking-widest">Phase data required</p></div>
                     )}
                  </div>
                  
                  <div className="px-7 py-4 bg-white/50 border-t border-slate-100 flex justify-between items-center shrink-0">
                      <span className="text-[9px] font-bold uppercase text-slate-300 tracking-widest leading-none">Trainingbook Command v4.0</span>
                      <a href={CANVA_LINKS[activeDept] || CANVA_LINKS.FOH} target="_blank" className="flex items-center gap-2 text-[10px] font-black text-blue-600 hover:underline uppercase tracking-widest transition-all"><Maximize2 className="w-3 h-3" /> Fullscreen</a>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* --- MOBILE VIEWER MODAL (Full Screen) --- */}
      <AnimatePresence>
          {mobileViewerOpen && (
              <ClientPortal>
                  <div className="fixed inset-0 z-[200] lg:hidden flex items-end justify-center pointer-events-none">
                      {/* Backdrop */}
                      <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        onClick={() => setMobileViewerOpen(false)}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto"
                      />
                      
                      {/* Bottom Sheet Card */}
                      <motion.div 
                        initial={{ y: "100%" }} 
                        animate={{ y: 0 }} 
                        exit={{ y: "100%" }} 
                        transition={{ type: "spring", damping: 25, stiffness: 300 }} 
                        drag="y"
                        dragControls={dragControls}
                        dragListener={false} 
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={0.05}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 100) setMobileViewerOpen(false);
                        }}
                        className="pointer-events-auto bg-white w-full h-[92vh] rounded-t-[40px] shadow-2xl relative flex flex-col overflow-hidden"
                      >
                          {/* Drag Handle Area */}
                          <div 
                              className="absolute top-0 left-0 right-0 h-10 flex justify-center items-center z-50 bg-white/80 backdrop-blur-sm cursor-grab active:cursor-grabbing touch-none"
                              onPointerDown={(e) => dragControls.start(e)}
                          >
                              <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
                          </div>

                          {/* Sheet Header */}
                          <div className="px-6 py-4 pt-10 border-b border-slate-100 flex justify-between items-center shrink-0 bg-white z-40">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">{activeSection?.title || "Manual"}</span>
                                    <div className="flex items-center gap-2">
                                        <div className={cn("w-2 h-2 rounded-full", activeDept === "FOH" ? "bg-[#004F71]" : "bg-[#E51636]")} />
                                        <span className="text-lg font-bold text-slate-900 leading-none">Pages {activeSection?.pageStart || "?"} - {activeSection?.pageEnd || "?"}</span>
                                    </div>
                                </div>
                                <button onClick={() => setMobileViewerOpen(false)} className="p-2.5 bg-slate-100 rounded-full active:scale-95 transition-all"><Minimize2 className="w-5 h-5 text-slate-500" /></button>
                          </div>
                          
                          {/* Viewer Body */}
                          <div className="flex-1 relative bg-slate-50 overflow-y-auto no-scrollbar touch-pan-y">
                             {iframeLoading && (
                                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-50">
                                    <Loader2 className={cn("w-10 h-10 animate-spin mb-4", activeDept === "FOH" ? "text-[#004F71]" : "text-[#E51636]")} />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading Manual...</span>
                                </div>
                             )}
                             {getEmbedUrl() ? (
                                <iframe src={getEmbedUrl()!} className="w-full h-full border-none" loading="lazy" onLoad={() => setIframeLoading(false)} />
                             ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300"><BookOpen className="w-12 h-12 opacity-20 mb-2" /><p>No content available</p></div>
                             )}
                          </div>
                          
                          {/* Floating Bottom Controls */}
                          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 w-full justify-center px-4">
                              <div className="flex-1 max-w-[280px]">
                                <PageRangeSelector start={activeSection?.pageStart} end={activeSection?.pageEnd} onUpdate={(u: any) => activeSectionId && updateSection(activeSectionId, u)} />
                              </div>
                              <a href={CANVA_LINKS[activeDept] || CANVA_LINKS.FOH} target="_blank" className="p-3.5 bg-white/90 backdrop-blur-md border border-white/40 rounded-full text-slate-600 shadow-lg hover:text-slate-900 active:scale-95 transition-all"><Maximize2 className="w-5 h-5" /></a>
                          </div>
                      </motion.div>
                  </div>
              </ClientPortal>
          )}
      </AnimatePresence>

      <AnimatePresence>{viewingImage && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-10 cursor-zoom-out" onClick={() => setViewingImage(null)}><motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="relative max-w-5xl w-full"><img src={viewingImage} className="w-full h-auto rounded-3xl shadow-2xl border border-white/10" /><button onClick={() => setViewingImage(null)} className="absolute -top-12 right-0 p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all"><X className="w-6 h-6" /></button></motion.div></motion.div>
      )}</AnimatePresence>
    </div>
  );
}