"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion, LayoutGroup, Transition } from "framer-motion";
import { Layers, X, ChevronDown, Filter, Check, AlertCircle, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { STAGES, Status } from "../../calendar/_components/types";
import { useAppStore } from "@/lib/store/useStore"; 

// --- ANIMATION PHYSICS ---
const transition: Transition = {
  type: "spring",
  stiffness: 350,
  damping: 30,
  mass: 0.8
};

interface Props {
  activeStage: Status;
  setActiveStage: (s: Status) => void;
  activeFilter: "ALL" | "FOH" | "BOH";
  setActiveFilter: (f: "ALL" | "FOH" | "BOH") => void;
  // NEW PROPS
  showMyPairings: boolean;
  setShowMyPairings: (show: boolean) => void;
}

export default function TeamDynamicIsland({
  activeStage,
  setActiveStage,
  activeFilter,
  setActiveFilter,
  showMyPairings,
  setShowMyPairings
}: Props) {
  const { team } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const unassignedCount = team.filter(m => m.dept === "Unassigned").length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const visibleStages = STAGES.filter((s) => s.id !== "Admin");
  const activeStageData = STAGES.find((s) => s.id === activeStage);

  return (
    <div className="fixed top-24 left-0 right-0 z-50 flex justify-center pointer-events-none px-4">
      <LayoutGroup>
        <motion.div
          ref={containerRef}
          layout
          initial={false}
          transition={transition}
          onClick={() => !isOpen && setIsOpen(true)}
          className={cn(
            "pointer-events-auto bg-white/95 backdrop-blur-2xl border shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] flex flex-col ring-1 ring-black/5 transform-gpu origin-top relative z-50 overflow-hidden",
            isOpen
              ? "rounded-[32px] w-full max-w-[420px] border-white/60" 
              : "rounded-full w-auto border-slate-200/60 cursor-pointer hover:scale-[1.02] hover:bg-white"
          )}
        >
            <AnimatePresence mode="popLayout" initial={false}>
                {!isOpen ? (
                    // --- 1. COLLAPSED VIEW ---
                    <motion.div 
                        key="collapsed"
                        layout="position"
                        initial={{ opacity: 0, filter: "blur(4px)" }}
                        animate={{ opacity: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0, filter: "blur(4px)", transition: { duration: 0.15 } }}
                        className="flex items-center gap-3 px-1.5 py-1.5 pr-3 h-14 relative w-full"
                    >
                         <motion.div layoutId="icon-container" className="w-10 h-10 bg-[#E51636] rounded-full flex items-center justify-center text-white shadow-md shadow-red-500/20 shrink-0">
                             <Layers className="w-5 h-5" />
                         </motion.div>
                         
                         <motion.div layout="position" className="flex flex-col justify-center pr-2 min-w-[120px]">
                             <motion.span layoutId="title-text" className="text-[11px] font-black uppercase tracking-widest text-slate-800 leading-tight whitespace-nowrap">
                                 {activeStageData?.title || "Roster"}
                             </motion.span>
                             <motion.span layoutId="subtitle-text" className="text-[9px] font-bold text-slate-400 whitespace-nowrap flex items-center gap-1.5">
                                 {showMyPairings && <UserCheck className="w-3 h-3 text-[#004F71]" />}
                                 {showMyPairings ? "My Pairings Only" : activeFilter === "ALL" ? "All Units" : `${activeFilter} Unit`}
                             </motion.span>
                         </motion.div>
                         
                         {unassignedCount > 0 && (
                             <motion.div 
                                layoutId="notification-badge"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-[#E51636] rounded-full flex items-center justify-center border border-white text-[9px] font-black text-white shadow-sm z-50 pointer-events-none"
                             >
                                 {unassignedCount}
                             </motion.div>
                         )}

                         <motion.div layoutId="chevron" className="opacity-40 pl-1">
                             <ChevronDown className="w-4 h-4" />
                         </motion.div>
                    </motion.div>
                ) : (
                    // --- 2. EXPANDED VIEW ---
                    <motion.div 
                        key="expanded"
                        layout="position"
                        initial={{ opacity: 0, filter: "blur(4px)" }}
                        animate={{ opacity: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0, filter: "blur(4px)", transition: { duration: 0.15 } }}
                        className="flex flex-col p-3 gap-4 min-w-[320px] w-full"
                    >
                        {/* Header Row */}
                        <div className="flex items-center justify-between px-2">
                             <div className="flex items-center gap-3">
                                 <motion.div layoutId="icon-container" className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                                     <Filter className="w-4 h-4" />
                                 </motion.div>
                                 <motion.span layoutId="title-text" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filtering Roster</motion.span>
                             </div>
                             <motion.button 
                                layoutId="chevron"
                                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                             >
                                 <X className="w-4 h-4" />
                             </motion.button>
                        </div>

                        {/* --- NEW: PERSONAL FILTER TOGGLE --- */}
                         <motion.button
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => setShowMyPairings(!showMyPairings)}
                            className={cn(
                                "flex items-center justify-between px-4 py-3 rounded-2xl border transition-all duration-200 text-left relative overflow-hidden mx-1",
                                showMyPairings
                                    ? "bg-[#004F71] text-white border-[#004F71] shadow-md shadow-blue-900/20"
                                    : "bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100"
                            )}
                        >
                             <div className="flex items-center gap-3">
                                <UserCheck className={cn("w-4 h-4", showMyPairings ? "text-white" : "text-slate-400")} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Show My Pairings</span>
                             </div>
                             {showMyPairings && <Check className="w-3.5 h-3.5 text-white" />}
                        </motion.button>

                        <div className="h-px bg-slate-100 mx-2" />

                        {/* Unit Filter */}
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-slate-50 p-1 rounded-[20px] flex relative border border-slate-100"
                        >
                          {(["ALL", "FOH", "BOH"] as const).map((f) => {
                            const isActive = activeFilter === f;
                            return (
                              <button
                                key={f}
                                onClick={() => setActiveFilter(f)}
                                className={cn(
                                  "flex-1 py-3 rounded-[16px] text-[10px] font-black uppercase tracking-widest relative z-10 transition-colors duration-200 flex items-center justify-center gap-1.5",
                                  isActive ? "text-white" : "text-slate-400 hover:text-slate-600"
                                )}
                              >
                                {isActive && (
                                  <motion.div
                                    layoutId="activeFilterBg"
                                    className="absolute inset-0 bg-[#E51636] rounded-[16px] shadow-sm shadow-red-500/20"
                                    transition={transition}
                                  />
                                )}
                                <span className="relative z-10">{f === 'ALL' ? 'All Units' : f}</span>
                                
                                {f === 'ALL' && unassignedCount > 0 && (
                                    <motion.span 
                                        layoutId="notification-badge"
                                        className={cn(
                                            "relative z-10 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[8px] font-bold shadow-sm transition-colors",
                                            isActive ? "bg-white text-[#E51636]" : "bg-red-100 text-red-600"
                                        )}
                                    >
                                        {unassignedCount}
                                    </motion.span>
                                )}
                              </button>
                            );
                          })}
                        </motion.div>
                        
                        {unassignedCount > 0 && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="mx-1 px-3 py-2 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2"
                            >
                                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                                <span className="text-[9px] font-bold text-red-600 uppercase tracking-wide">
                                    {unassignedCount} Members require Unit Assignment
                                </span>
                            </motion.div>
                        )}

                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-px bg-slate-100 w-full" />

                        {/* Roles Grid */}
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            className="grid grid-cols-2 gap-2.5 px-1 pb-2"
                        >
                          {visibleStages.map((stage) => {
                            const isActive = activeStage === stage.id;
                            const Icon = stage.icon;
                            return (
                              <button
                                key={stage.id}
                                onClick={() => setActiveStage(stage.id)}
                                className={cn(
                                  "flex items-center justify-between px-4 py-3.5 rounded-2xl border transition-all duration-200 text-left group relative overflow-hidden",
                                  isActive
                                    ? "bg-[#004F71] text-white border-[#004F71] shadow-lg shadow-blue-900/20" 
                                    : "bg-white border-slate-100 hover:border-slate-200 text-slate-500 hover:bg-slate-50"
                                )}
                              >
                                <div className="flex items-center gap-3">
                                    <Icon
                                    className={cn(
                                        "w-4 h-4",
                                        isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"
                                    )}
                                    />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">
                                        {stage.title}
                                    </span>
                                </div>
                                {isActive && <Check className="w-3.5 h-3.5 text-white" />}
                              </button>
                            );
                          })}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
      </LayoutGroup>
    </div>
  );
}