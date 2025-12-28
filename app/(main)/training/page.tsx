// app/(main)/training/page.tsx
"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { 
  motion, AnimatePresence, useDragControls, LayoutGroup, Transition, Reorder 
} from "framer-motion";
import { 
  Plus, Trash2, GripVertical, Eye, Settings, X, Utensils, Coffee, 
  Cloud, Maximize2, CalendarClock, BookOpen, Loader2, 
  ChevronDown, Hash, ChevronRight, ChevronUp, Filter, Minimize2, CheckCircle2,
  Expand, AlignLeft, ArrowLeft, LayoutGrid, List, Clock, FileText
} from "lucide-react";
import { cn } from "@/lib/utils";

// Firebase & Store imports
import { db, storage } from "@/lib/firebase";
import { 
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, doc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import ClientPortal from "@/components/core/ClientPortal";

// --- TYPES ---
import { Department } from "../calendar/_components/types";

interface Task {
  id: string;
  title: string;
  image?: string;
  duration?: string;
  type?: 'task' | 'subject'; 
  color?: string; 
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

// --- PRESET COLORS FOR SUBJECTS ---
const SUBJECT_COLORS = [
    { id: "slate", hex: "#f8fafc", bg: "bg-slate-50", text: "text-slate-500", border: "border-slate-200", dot: "bg-slate-400" }, 
    { id: "navy", hex: "#f0f9ff", bg: "bg-[#004F71]/10", text: "text-[#004F71]", border: "border-[#004F71]/20", dot: "bg-[#004F71]" }, 
    { id: "red", hex: "#fff1f2", bg: "bg-[#E51636]/10", text: "text-[#E51636]", border: "border-[#E51636]/20", dot: "bg-[#E51636]" }, 
    { id: "amber", hex: "#fffbeb", bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200", dot: "bg-amber-400" },
];

const SPRING_TRANSITION: Transition = {
  type: "spring",
  stiffness: 350,
  damping: 30,
  mass: 0.8
};

// --- UTILS: Custom Debounce (No external dependency needed) ---
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
    let timeout: NodeJS.Timeout;
    return ((...args: any[]) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    }) as T;
}

// --- HELPER COMPONENTS ---

function PageRangeSelector({ start, end, onUpdate, readOnly }: any) {
    if (readOnly) {
        return (
             <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50/50 rounded-lg border border-slate-200/60">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                    Pg {start}-{end}
                </span>
            </div>
        );
    }

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

function TrainingDynamicIsland({ 
    activeDept, setActiveDept, 
    activePhaseIndex, activePhaseTitle,
    previewMode, setPreviewMode,
    viewMode // 'grid' | 'detail'
}: any) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const brandColor = activeDept === "FOH" ? "bg-[#004F71]" : "bg-[#E51636]";
    const brandShadow = activeDept === "FOH" ? "shadow-blue-500/20" : "shadow-red-500/20";
    const activeEditorClass = activeDept === "FOH" ? "bg-[#004F71] border-[#004F71] shadow-lg shadow-blue-900/20" : "bg-[#E51636] border-[#E51636] shadow-lg shadow-red-900/20";

    return (
        <div className="fixed top-24 left-0 right-0 z-[90] flex justify-center pointer-events-none px-4">
            <LayoutGroup>
                <motion.div
                    ref={containerRef}
                    layout
                    initial={false}
                    transition={SPRING_TRANSITION}
                    onClick={() => !isOpen && setIsOpen(true)}
                    className={cn(
                        "pointer-events-auto bg-white/95 backdrop-blur-2xl border shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] flex flex-col ring-1 ring-black/5 transform-gpu origin-top relative overflow-hidden",
                        isOpen ? "rounded-[32px] w-full max-w-[420px] border-white/60" : "rounded-full w-auto border-slate-200/60 cursor-pointer hover:scale-[1.02] hover:bg-white"
                    )}
                >
                    <AnimatePresence mode="popLayout" initial={false}>
                        {!isOpen ? (
                            <motion.div 
                                key="collapsed"
                                layout="position"
                                initial={{ opacity: 0, filter: "blur(4px)" }}
                                animate={{ opacity: 1, filter: "blur(0px)" }}
                                exit={{ opacity: 0, filter: "blur(4px)", transition: { duration: 0.15 } }}
                                className="flex items-center gap-3 px-1.5 py-1.5 pr-4 h-14 relative w-full"
                            >
                                <motion.div layoutId="icon-container" className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md shrink-0 transition-colors", brandColor, brandShadow)}>
                                    {activeDept === "FOH" ? <Coffee className="w-5 h-5" /> : <Utensils className="w-5 h-5" />}
                                </motion.div>
                                <motion.div layout="position" className="flex flex-col justify-center min-w-[120px]">
                                    <motion.span layoutId="title-text" className="text-[11px] font-black uppercase tracking-widest text-slate-800 leading-tight whitespace-nowrap">
                                        {viewMode === 'grid' ? "Training Dashboard" : `Phase ${String(activePhaseIndex + 1).padStart(2, '0')}`}
                                    </motion.span>
                                    <motion.span layoutId="subtitle-text" className="text-[9px] font-bold text-slate-400 whitespace-nowrap truncate max-w-[140px]">
                                        {viewMode === 'grid' ? "Select a phase to edit" : activePhaseTitle || "Curriculum Loading..."}
                                    </motion.span>
                                </motion.div>
                                <motion.div layoutId="chevron" className="opacity-40 pl-1 border-l border-slate-200 ml-1"><ChevronDown className="w-4 h-4 ml-2" /></motion.div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="expanded"
                                layout="position"
                                initial={{ opacity: 0, filter: "blur(4px)" }}
                                animate={{ opacity: 1, filter: "blur(0px)" }}
                                exit={{ opacity: 0, filter: "blur(4px)", transition: { duration: 0.15 } }}
                                className="flex flex-col p-3 gap-4 w-full"
                            >
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-3">
                                        <motion.div layoutId="icon-container" className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500"><Filter className="w-4 h-4" /></motion.div>
                                        <motion.span layoutId="title-text" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Configuration</motion.span>
                                    </div>
                                    <motion.button layoutId="chevron" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"><X className="w-4 h-4" /></motion.button>
                                </div>
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-slate-50 p-1 rounded-[20px] flex relative border border-slate-100">
                                    {(["FOH", "BOH"] as const).map((dept) => {
                                        const isActive = activeDept === dept;
                                        return (
                                            <button key={dept} onClick={() => setActiveDept(dept)} className={cn("flex-1 py-3 rounded-[16px] text-[10px] font-black uppercase tracking-widest relative z-10 transition-colors duration-200 flex items-center justify-center gap-1.5", isActive ? "text-white" : "text-slate-400 hover:text-slate-600")}>
                                                {isActive && (<motion.div layoutId="activeFilterBg" className={cn("absolute inset-0 rounded-[16px] shadow-sm", dept === "FOH" ? "bg-[#004F71] shadow-blue-500/20" : "bg-[#E51636] shadow-red-500/20")} transition={SPRING_TRANSITION} />)}
                                                <span className="relative z-10 flex items-center gap-2">{dept === "FOH" ? <Coffee className="w-3.5 h-3.5" /> : <Utensils className="w-3.5 h-3.5" />}{dept} Training</span>
                                            </button>
                                        );
                                    })}
                                </motion.div>
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-px bg-slate-100 w-full" />
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="px-1 pb-1">
                                    <button onClick={() => setPreviewMode(!previewMode)} className={cn("w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border transition-all duration-200 text-left group relative overflow-hidden", !previewMode ? cn("text-white", activeEditorClass) : "bg-white border-slate-100 hover:border-slate-200 text-slate-500 hover:bg-slate-50")}>
                                        <div className="flex items-center gap-3">{!previewMode ? <Settings className="w-4 h-4 text-white" /> : <Eye className="w-4 h-4" />}<span className="text-[10px] font-bold uppercase tracking-wider">{!previewMode ? "Editor Active" : "Preview Mode Active"}</span></div>
                                        <div className={cn("w-2 h-2 rounded-full", !previewMode ? "bg-white animate-pulse" : "bg-slate-300")} />
                                    </button>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </LayoutGroup>
        </div>
    );
}

const DraggableTask = ({ 
    task, 
    activeDept, 
    previewMode, 
    handleFileUpload, 
    updateSection, 
    saveSection,   
    setViewingImage, 
    section,
    onInteract 
}: any) => {
    const controls = useDragControls();
    const isSubject = task.type === 'subject';
    
    const colorTheme = SUBJECT_COLORS.find(c => c.id === task.color) || SUBJECT_COLORS[0];
    
    const subjectClasses = isSubject 
        ? cn(colorTheme.bg, colorTheme.text, "rounded-xl border", colorTheme.border, "shadow-sm") 
        : "bg-slate-50/50 rounded-xl md:rounded-2xl border border-transparent hover:border-slate-200 hover:bg-white";

    return (
        <Reorder.Item value={task} dragListener={false} dragControls={controls} className="relative">
            <motion.div layout className={cn("group transition-all flex flex-col gap-3 relative p-3 md:p-4", isSubject ? "mt-4 mb-2" : "", subjectClasses)}>
                <div className="flex items-center gap-3 md:gap-4">
                    <div className="shrink-0 cursor-grab active:cursor-grabbing touch-none" onPointerDown={(e) => !previewMode && controls.start(e)}>
                        {isSubject ? (
                            <div className="w-6 h-6 flex items-center justify-center bg-white/50 rounded-lg"><AlignLeft className={cn("w-3.5 h-3.5", colorTheme.text)} /></div>
                        ) : !previewMode ? (
                            <GripVertical className="w-4 h-4 text-slate-200 hover:text-slate-400 transition-colors" />
                        ) : (
                            <CheckCircle2 className="w-4 h-4 text-slate-300" />
                        )}
                    </div>
                    <div className="flex-1">
                        {previewMode ? (
                            <p className={cn("whitespace-pre-wrap break-words", isSubject ? cn("text-xs font-[900] uppercase tracking-[0.2em]", colorTheme.text) : "text-sm font-medium text-slate-700")}>{task.title || (isSubject ? "UNNAMED SUBJECT" : "Untitled Objective")}</p>
                        ) : (
                            <textarea 
                                value={task.title} 
                                onChange={e => { 
                                    const val = e.target.value;
                                    const newTasks = section.tasks.map((t: Task) => t.id === task.id ? { ...t, title: val } : t); 
                                    updateSection(section.id, { tasks: newTasks });
                                    saveSection(section.id, { tasks: newTasks });
                                    e.target.style.height = 'auto';
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                }}
                                onFocus={() => onInteract(true, section.id)}
                                onBlur={() => onInteract(false)}
                                className={cn("w-full bg-transparent outline-none resize-none overflow-hidden", isSubject ? cn("text-xs font-[900] uppercase tracking-[0.2em] placeholder:opacity-50", colorTheme.text) : "text-sm font-bold text-slate-700 placeholder:text-slate-300")}
                                placeholder={isSubject ? "SUBJECT HEADER..." : "Enter objective..."}
                                rows={1}
                                onClick={(e) => e.stopPropagation()} 
                                ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; } }}
                            />
                        )}
                    </div>
                    <AnimatePresence>
                        {!previewMode && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 self-start pt-1">
                                {isSubject && (
                                    <div className="flex gap-1.5 bg-white/60 p-1.5 rounded-lg border border-slate-200/50 shadow-sm backdrop-blur-sm">
                                        {SUBJECT_COLORS.map(c => (
                                            <button key={c.id} onClick={(e) => { e.stopPropagation(); const newTasks = section.tasks.map((t: Task) => t.id === task.id ? { ...t, color: c.id } : t); updateSection(section.id, { tasks: newTasks }); saveSection(section.id, { tasks: newTasks }); }} className={cn("w-3.5 h-3.5 rounded-full transition-transform hover:scale-125 border border-black/5", c.dot, task.color === c.id ? "ring-2 ring-slate-400 scale-110" : "")} title={c.id} />
                                        ))}
                                    </div>
                                )}
                                {!isSubject && (
                                    <label onClick={(e) => e.stopPropagation()} className="cursor-pointer p-2 hover:bg-blue-50 text-slate-300 hover:text-blue-50 rounded-lg transition-all shrink-0">
                                        <Cloud className="w-4 h-4" /><input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(section, task.id, e)} />
                                    </label>
                                )}
                                <button onClick={(e) => { e.stopPropagation(); const newTasks = section.tasks.filter((t: Task) => t.id !== task.id); updateSection(section.id, { tasks: newTasks }); saveSection(section.id, { tasks: newTasks }); }} className="p-2 text-slate-300 hover:text-red-500 shrink-0"><X className="w-4 h-4" /></button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                {!isSubject && task.image && (
                    <motion.div layoutId={`image-${task.id}`} onClick={() => setViewingImage({ id: task.id, url: task.image! })} className={cn("relative w-full overflow-hidden rounded-xl border shadow-sm cursor-zoom-in group/img transition-all bg-slate-100", "aspect-[16/9] md:aspect-[21/9]", activeDept === "FOH" ? "border-[#004F71]/10 hover:border-[#004F71]/40" : "border-[#E51636]/10 hover:border-[#E51636]/40")}>
                        <img src={task.image} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl scale-125 opacity-40 saturate-200" aria-hidden="true" />
                        <motion.img src={task.image} className="relative z-10 w-full h-full object-contain transition-transform duration-700 group-hover/img:scale-[1.02]" />
                        <div className="absolute inset-0 z-20 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover/img:opacity-100 pointer-events-none">
                            <div className="bg-white/20 backdrop-blur-md p-2.5 rounded-full text-white border border-white/40 shadow-lg"><Expand className="w-5 h-5" /></div>
                        </div>
                    </motion.div>
                )}
            </motion.div>
        </Reorder.Item>
    );
};

// --- MAIN PAGE ---
export default function TrainingBuilderPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [activeDept, setActiveDept] = useState<Department>("FOH");
  const [previewMode, setPreviewMode] = useState(false);
  
  // VIEW MODE STATE
  const [viewMode, setViewMode] = useState<'grid' | 'detail'>('grid');
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  
  const [iframeLoading, setIframeLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewingImage, setViewingImage] = useState<{ id: string, url: string } | null>(null);
  const [mobileViewerOpen, setMobileViewerOpen] = useState(false);
  
  const isInteractionLocked = useRef(false); 
  const sectionsRef = useRef<Section[]>([]);
  const dragControls = useDragControls();

  const debouncedSaveSection = useMemo(() => debounce(async (id: string, updates: Partial<Section>) => {
      await updateDoc(doc(db, "curriculum", id), updates);
  }, 1000), []);

  const optimisticUpdateSection = (id: string, updates: Partial<Section>) => {
      setSections(prev => {
          const next = prev.map(s => s.id === id ? { ...s, ...updates } : s);
          sectionsRef.current = next; 
          return next;
      });
  };

  useEffect(() => {
    const q = query(collection(db, "curriculum"), where("dept", "==", activeDept));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (isInteractionLocked.current) return;
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Section[];
      const sortedData = data.sort((a, b) => (a.order || 0) - (b.order || 0));
      setSections(sortedData);
      sectionsRef.current = sortedData; 
    });
    return () => unsubscribe();
  }, [activeDept]);

  const activeIndex = sections.findIndex(s => s.id === activeSectionId);
  const activeSection = useMemo(() => sections.find(s => s.id === activeSectionId), [sections, activeSectionId]);

  const handleInteraction = useCallback((isLocked: boolean, sectionId?: string) => {
      if (isLocked && sectionId) {
          isInteractionLocked.current = true;
      } else {
          setTimeout(() => { isInteractionLocked.current = false; }, 800);
      }
  }, []);

  const lockInteraction = () => {
      isInteractionLocked.current = true;
      setTimeout(() => { isInteractionLocked.current = false; }, 1000);
  };

  const getEmbedUrl = () => {
    if (!activeSection || !activeSection.pageStart) return null;
    const link = CANVA_LINKS[activeDept] || CANVA_LINKS.FOH;
    const base = link.split('?')[0];
    return `${base}?embed#${activeSection.pageStart}`;
  };

  const addSection = async () => {
    lockInteraction();
    const nextOrder = sections.length > 0 ? (sections[sections.length - 1].order || 0) + 1 : 0;
    const lastPage = sections.length > 0 ? (Number(sections[sections.length - 1].pageEnd) || 0) : 0;
    await addDoc(collection(db, "curriculum"), {
        title: "New Training Phase", duration: "Day 1", pageStart: lastPage + 1, pageEnd: lastPage + 2,
        tasks: [], dept: activeDept, order: nextOrder, createdAt: serverTimestamp()
    });
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
      optimisticUpdateSection(section.id, { tasks: newTasks });
      await updateDoc(doc(db, "curriculum", section.id), { tasks: newTasks });
    } catch (error) { console.error(error); } finally { setIsProcessing(false); }
  };

  // --- VIEW MODE SWITCHERS ---
  const enterPhase = (id: string) => {
      setActiveSectionId(id);
      setViewMode('detail');
      window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  const exitPhase = () => {
      setViewMode('grid');
      setActiveSectionId(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32 font-sans relative">
      <TrainingDynamicIsland 
        activeDept={activeDept}
        setActiveDept={setActiveDept}
        activePhaseIndex={activeIndex !== -1 ? activeIndex : 0}
        activePhaseTitle={activeSection?.title || "Overview"}
        previewMode={previewMode}
        setPreviewMode={setPreviewMode}
        viewMode={viewMode}
      />

      <div className="max-w-[1800px] mx-auto px-4 md:px-6 pt-40 md:pt-48 pb-32">
         
         {/* --- GRID VIEW --- */}
         {viewMode === 'grid' && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {sections.map((section, idx) => (
                     <motion.div 
                        key={section.id} 
                        layoutId={`card-${section.id}`}
                        onClick={() => enterPhase(section.id)}
                        className={cn(
                            "bg-white rounded-[32px] p-8 border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col justify-between min-h-[280px]",
                            activeDept === "FOH" ? "hover:border-[#004F71]/20 hover:shadow-[#004F71]/5" : "hover:border-[#E51636]/20 hover:shadow-[#E51636]/5"
                        )}
                     >
                        <div className="space-y-4">
                            <div className="flex justify-between items-start">
                                {/* Beautiful Phase Badge */}
                                <div className={cn(
                                    "w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white shadow-lg transition-transform group-hover:scale-110", 
                                    activeDept === "FOH" ? "bg-[#004F71]" : "bg-[#E51636]"
                                )}>
                                    <span className="text-[10px] opacity-60 uppercase font-black mr-0.5">Ph</span>
                                    <span className="text-2xl">{idx + 1}</span>
                                </div>
                                <div className="p-2 rounded-full bg-slate-50 border border-slate-100 group-hover:bg-white transition-colors">
                                    <ArrowRightIcon />
                                </div>
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-tight group-hover:text-slate-700 transition-colors line-clamp-3">
                                {section.title}
                            </h3>
                        </div>
                        
                        {/* Rich Metadata Footer */}
                        <div className="flex items-center gap-3 pt-6 border-t border-slate-50 mt-4">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg text-slate-500 text-xs font-bold uppercase tracking-wide">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{section.duration}</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg text-slate-500 text-xs font-bold uppercase tracking-wide">
                                <FileText className="w-3.5 h-3.5" />
                                <span>Pg {section.pageStart}-{section.pageEnd}</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg text-slate-500 text-xs font-bold uppercase tracking-wide ml-auto">
                                <List className="w-3.5 h-3.5" />
                                <span>{section.tasks.length}</span>
                            </div>
                        </div>
                     </motion.div>
                 ))}
                 
                 {/* Add Phase Card */}
                 <button onClick={addSection} className="min-h-[280px] rounded-[32px] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 text-slate-300 hover:text-[#004F71] hover:border-[#004F71]/30 hover:bg-slate-50 transition-all group">
                     <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                         <Plus className="w-8 h-8" />
                     </div>
                     <span className="text-lg font-black uppercase tracking-tight">Add New Phase</span>
                 </button>
             </motion.div>
         )}

         {/* --- DETAIL VIEW --- */}
         {viewMode === 'detail' && activeSection && (
             <div className="grid grid-cols-12 gap-6 md:gap-12 items-start animate-in fade-in zoom-in-95 duration-300">
                 
                 {/* LEFT: Editor */}
                 <div className="col-span-12 lg:col-span-7 space-y-6">
                     <button onClick={exitPhase} className="flex items-center gap-2 text-slate-400 hover:text-[#004F71] font-bold uppercase text-xs tracking-widest mb-4 transition-colors group">
                         <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform"><ArrowLeft className="w-4 h-4" /></div>
                         Back to Grid
                     </button>

                     <div className="relative">
                        <div className={cn("hidden md:flex absolute -left-[69px] top-0 w-12 h-12 rounded-2xl flex-col items-center justify-center font-black text-white shadow-lg border-4 border-[#F8FAFC] z-20", activeDept === "FOH" ? "bg-[#004F71] scale-110" : "bg-[#E51636] scale-110")}>
                            <span className="text-[8px] opacity-60 uppercase font-black">Ph</span>
                            <span className="text-base">{activeIndex + 1}</span>
                        </div>

                        <div className="bg-white rounded-[32px] p-4 md:p-8 border border-slate-200 shadow-xl ring-1 ring-black/5 relative z-10">
                             {/* Header Inputs */}
                             <div className="flex justify-between items-start mb-8 gap-6">
                                <div className="flex-1 space-y-3">
                                   <div className="flex items-center gap-3">
                                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 text-[10px] font-black uppercase text-slate-400 shadow-inner">
                                        <CalendarClock className="w-3.5 h-3.5" />
                                        {previewMode ? <span className="font-black text-slate-600">{activeSection.duration}</span> : <input value={activeSection.duration} onChange={e => { optimisticUpdateSection(activeSection.id, { duration: e.target.value }); debouncedSaveSection(activeSection.id, { duration: e.target.value }); }} className="bg-transparent border-none focus:outline-none w-16 md:w-20 p-0 font-black" />}
                                      </div>
                                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{activeSection.tasks.length} Modules</span>
                                   </div>
                                   {previewMode ? (
                                       <h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-tight">{activeSection.title}</h3>
                                   ) : (
                                       <textarea
                                            value={activeSection.title}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                optimisticUpdateSection(activeSection.id, { title: val });
                                                debouncedSaveSection(activeSection.id, { title: val });
                                                e.target.style.height = 'auto';
                                                e.target.style.height = `${e.target.scrollHeight}px`;
                                            }}
                                            className="text-3xl font-black text-slate-900 bg-transparent w-full outline-none border-none focus:ring-0 p-0 tracking-tighter resize-none overflow-hidden"
                                            rows={1}
                                            ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; } }}
                                        />
                                   )}
                                </div>
                                <div className="flex items-start gap-3 shrink-0">
                                    <PageRangeSelector start={activeSection.pageStart} end={activeSection.pageEnd} onUpdate={(u: any) => { optimisticUpdateSection(activeSection.id, u); debouncedSaveSection(activeSection.id, u); }} readOnly={previewMode} />
                                    <AnimatePresence>{!previewMode && (<motion.button initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} onClick={() => { deleteDoc(doc(db, "curriculum", activeSection.id)); exitPhase(); }} className="p-3 text-slate-300 hover:text-red-500 transition-all bg-slate-50 rounded-2xl border border-slate-200 hover:shadow-md active:scale-90"><Trash2 className="w-4 h-4" /></motion.button>)}</AnimatePresence>
                                </div>
                             </div>
                             
                             {/* Tasks List */}
                             <div className="space-y-2.5">
                                <Reorder.Group axis="y" values={activeSection.tasks} onReorder={(newOrder) => { optimisticUpdateSection(activeSection.id, { tasks: newOrder }); debouncedSaveSection(activeSection.id, { tasks: newOrder }); }} className="space-y-2">
                                    {activeSection.tasks.map(task => (
                                        <DraggableTask 
                                            key={task.id} 
                                            task={task} 
                                            activeDept={activeDept} 
                                            previewMode={previewMode} 
                                            handleFileUpload={handleFileUpload} 
                                            updateSection={optimisticUpdateSection} 
                                            saveSection={debouncedSaveSection}
                                            setViewingImage={setViewingImage} 
                                            section={activeSection}
                                            onInteract={handleInteraction}
                                        />
                                    ))}
                                </Reorder.Group>
                                <AnimatePresence>
                                    {!previewMode && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex gap-2 pt-4">
                                            <button onClick={(e) => { e.stopPropagation(); lockInteraction(); const newTask: Task = { id: Math.random().toString(36).substr(2, 9), title: "", duration: "15m", type: "task" }; optimisticUpdateSection(activeSection.id, { tasks: [...activeSection.tasks, newTask] }); debouncedSaveSection(activeSection.id, { tasks: [...activeSection.tasks, newTask] }); }} className="flex-1 py-3.5 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:border-[#004F71] hover:text-[#004F71] transition-all flex items-center justify-center gap-2 group"><Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" /> Add Logic Block</button>
                                            <button onClick={(e) => { e.stopPropagation(); lockInteraction(); const newSubject: Task = { id: Math.random().toString(36).substr(2, 9), title: "", type: "subject", color: "slate" }; optimisticUpdateSection(activeSection.id, { tasks: [...activeSection.tasks, newSubject] }); debouncedSaveSection(activeSection.id, { tasks: [...activeSection.tasks, newSubject] }); }} className="w-16 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-all group" title="Add Subject Heading"><AlignLeft className="w-4 h-4" /></button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                             </div>
                             
                             {/* Mobile Open Manual Button */}
                             <div 
                                onClick={() => { setMobileViewerOpen(true); setIframeLoading(true); }} 
                                className="lg:hidden mt-6 flex justify-center text-slate-400 text-[9px] font-bold uppercase tracking-widest flex items-center gap-2 bg-slate-50 py-3 rounded-xl border border-slate-100 cursor-pointer active:scale-95 transition-transform"
                            >
                                <span>Tap card to open manual</span>
                                <ChevronRight className="w-3 h-3" />
                            </div>
                        </div>
                     </div>
                 </div>

                 {/* RIGHT: Canva (Sticky) */}
                 <div className="hidden lg:block col-span-5 relative h-full">
                    <div className="sticky top-28 z-40 transition-all duration-500 h-fit">
                       <div className={cn("absolute inset-0 bg-gradient-to-br opacity-40 blur-[120px] transition-colors duration-1000 -z-10", activeDept === "FOH" ? "from-blue-200" : "from-red-200")} />
                       <div className="h-[calc(100vh-8rem)] bg-white rounded-[44px] border border-slate-200/80 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col relative ring-1 ring-black/5">
                          <div className="px-7 py-5 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-xl shrink-0 z-20">
                             <div className="flex items-center gap-3">
                                 <div className={cn("p-2 rounded-xl text-white shadow-md transition-colors", activeDept === "FOH" ? "bg-[#004F71]" : "bg-[#E51636]")}><BookOpen className="w-4 h-4" /></div>
                                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">Preview Hub</span>
                             </div>
                             <div className="flex items-center gap-3">
                                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pages {activeSection.pageStart}—{activeSection.pageEnd}</span>
                                 <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                             </div>
                          </div>
                          
                          <div className="flex-1 bg-slate-50 relative group isolate overflow-hidden">
                             <AnimatePresence mode="wait">
                                 {iframeLoading && (
                                     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-white flex flex-col items-center justify-center p-12 text-center">
                                         <Loader2 className={cn("w-10 h-10 animate-spin mb-6", activeDept === "FOH" ? "text-[#004F71]" : "text-[#E51636]")} />
                                         <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter mb-1 leading-none">Syncing Intelligence</h3>
                                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mt-2">Loading Page {activeSection.pageStart}...</p>
                                     </motion.div>
                                 )}
                             </AnimatePresence>
                             
                             {getEmbedUrl() ? (
                                 <iframe src={getEmbedUrl()!} className="w-full h-full border-none mix-blend-multiply transition-opacity duration-1000" loading="lazy" onLoad={() => setIframeLoading(false)} />
                             ) : (
                                 <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-2"><BookOpen className="w-8 h-8 opacity-20" /><p className="text-[10px] font-bold uppercase tracking-widest">Phase data required</p></div>
                             )}
                          </div>

                          <div className="px-7 py-4 bg-white/80 border-t border-slate-100 flex justify-between items-center shrink-0 z-20 backdrop-blur-md">
                              <span className="text-[9px] font-bold uppercase text-slate-300 tracking-widest leading-none">Trainingbook Command v4.0</span>
                              <a href={CANVA_LINKS[activeDept] || CANVA_LINKS.FOH} target="_blank" className="flex items-center gap-2 text-[10px] font-black text-blue-600 hover:underline uppercase tracking-widest transition-all"><Maximize2 className="w-3 h-3" /> Fullscreen</a>
                          </div>
                       </div>
                    </div>
                 </div>
             </div>
         )}
      </div>

      {/* --- KEEP EXISTING MOBILE VIEWER & IMAGE MODAL CODE AS IS --- */}
      <AnimatePresence>{mobileViewerOpen && (<ClientPortal><div className="fixed inset-0 z-[200] lg:hidden flex items-end justify-center pointer-events-none"><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileViewerOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto" /><motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} drag="y" dragControls={dragControls} dragListener={false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={0.05} onDragEnd={(_, info) => { if (info.offset.y > 100) setMobileViewerOpen(false); }} className="pointer-events-auto bg-white w-full h-[92vh] rounded-t-[40px] shadow-2xl relative flex flex-col overflow-hidden"><div className="absolute top-0 left-0 right-0 h-10 flex justify-center items-center z-50 bg-white/80 backdrop-blur-sm cursor-grab active:cursor-grabbing touch-none" onPointerDown={(e) => dragControls.start(e)}><div className="w-12 h-1.5 bg-slate-300 rounded-full" /></div><div className="px-6 py-4 pt-10 border-b border-slate-100 flex justify-between items-center shrink-0 bg-white z-40"><div className="flex flex-col"><span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">{activeSection?.title || "Manual"}</span><div className="flex items-center gap-2"><div className={cn("w-2 h-2 rounded-full", activeDept === "FOH" ? "bg-[#004F71]" : "bg-[#E51636]")} /><span className="text-lg font-bold text-slate-900 leading-none">Pages {activeSection?.pageStart || "?"} - {activeSection?.pageEnd || "?"}</span></div></div><button onClick={() => setMobileViewerOpen(false)} className="p-2.5 bg-slate-100 rounded-full active:scale-95 transition-all"><Minimize2 className="w-5 h-5 text-slate-500" /></button></div><div className="flex-1 relative bg-slate-50 overflow-y-auto no-scrollbar touch-pan-y">{iframeLoading && (<div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-50"><Loader2 className={cn("w-10 h-10 animate-spin mb-4", activeDept === "FOH" ? "text-[#004F71]" : "text-[#E51636]")} /><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading Manual...</span></div>)}{getEmbedUrl() ? (<iframe src={getEmbedUrl()!} className="w-full h-full border-none" loading="lazy" onLoad={() => setIframeLoading(false)} />) : (<div className="w-full h-full flex flex-col items-center justify-center text-slate-300"><BookOpen className="w-12 h-12 opacity-20 mb-2" /><p>No content available</p></div>)}</div><div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 w-full justify-center px-4"><div className="flex-1 max-w-[280px]"><PageRangeSelector start={activeSection?.pageStart} end={activeSection?.pageEnd} onUpdate={(u: any) => { if(activeSectionId) { optimisticUpdateSection(activeSectionId, u); debouncedSaveSection(activeSectionId, u); }}} readOnly={true} /></div><a href={CANVA_LINKS[activeDept] || CANVA_LINKS.FOH} target="_blank" className="p-3.5 bg-white/90 backdrop-blur-md border border-white/40 rounded-full text-slate-600 shadow-lg hover:text-slate-900 active:scale-95 transition-all"><Maximize2 className="w-5 h-5" /></a></div></motion.div></div></ClientPortal>)}</AnimatePresence>

      <AnimatePresence>
            {viewingImage && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-10 pointer-events-none">
                     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl cursor-zoom-out pointer-events-auto" onClick={() => setViewingImage(null)} />
                     <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-6xl max-h-[85vh] md:max-h-[90vh] pointer-events-auto flex items-center justify-center">
                         <img src={viewingImage.url} className="w-full h-full object-contain rounded-2xl md:rounded-3xl shadow-2xl bg-black/5" />
                         <button onClick={() => setViewingImage(null)} className="absolute -top-12 md:-top-4 md:-right-12 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-md border border-white/10"><X className="w-6 h-6" /></button>
                     </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
}

// Arrow Icon Helper
function ArrowRightIcon() {
    return <ChevronRight className="w-4 h-4 text-slate-400" />
}