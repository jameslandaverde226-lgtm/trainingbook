"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion, LayoutGroup, Transition } from "framer-motion";
import { Layers, X, ChevronDown, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { STAGES, Status } from "../../calendar/_components/types";

// --- ANIMATION PHYSICS ---
// Fix: Explicitly type as Transition to satisfy TS
const spring: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 0.8,
};

interface Props {
  activeStage: Status;
  setActiveStage: (s: Status) => void;
  activeFilter: "ALL" | "FOH" | "BOH";
  setActiveFilter: (f: "ALL" | "FOH" | "BOH") => void;
}

export default function TeamDynamicIsland({
  activeStage,
  setActiveStage,
  activeFilter,
  setActiveFilter,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter out "Admin" from the visible selection list
  const visibleStages = STAGES.filter((s) => s.id !== "Admin");
  const activeStageData = STAGES.find((s) => s.id === activeStage);

  return (
    <div className="fixed top-24 left-0 right-0 z-50 flex justify-center pointer-events-none px-4">
      <LayoutGroup>
        <motion.div
          ref={containerRef}
          layout
          transition={spring}
          onClick={() => !isOpen && setIsOpen(true)}
          className={cn(
            "pointer-events-auto bg-white/80 backdrop-blur-2xl border border-white/60 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden ring-1 ring-black/5 transform-gpu origin-top",
            isOpen
              ? "rounded-[32px] w-full max-w-[420px] p-2"
              : "rounded-full w-auto p-1.5 cursor-pointer hover:scale-[1.02] hover:bg-white/90"
          )}
        >
          {/* --- HEADER ROW (Visible in both states, morphs) --- */}
          <motion.div layout className="flex items-center justify-between gap-3 px-2 h-10">
            {/* Left: Icon & Label */}
            <motion.div layout className="flex items-center gap-3 min-w-0">
              <motion.div
                layout
                className={cn(
                  "flex items-center justify-center rounded-full shrink-0 transition-colors",
                  isOpen
                    ? "w-8 h-8 bg-slate-100 text-slate-900"
                    : "w-8 h-8 bg-[#004F71] text-white shadow-md shadow-blue-900/20"
                )}
              >
                {isOpen ? (
                    <Filter className="w-4 h-4" />
                ) : (
                    <Layers className="w-4 h-4" />
                )}
              </motion.div>

              <div className="flex flex-col justify-center">
                <motion.span
                  layout
                  className={cn(
                    "font-black uppercase tracking-widest leading-none whitespace-nowrap",
                    isOpen ? "text-[10px] text-slate-400" : "text-[11px] text-slate-800"
                  )}
                >
                  {isOpen ? "Filtering Roster" : activeStageData?.title || "Roster"}
                </motion.span>
                
                {/* Secondary Text (Only visible when closed) */}
                {!isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-1.5 mt-0.5"
                  >
                     <span className="text-[9px] font-bold text-slate-400">
                        {activeFilter === "ALL" ? "All Units" : `${activeFilter} Unit`}
                     </span>
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Right: Close/Chevron */}
            <motion.div layout>
              {isOpen ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <div className="pr-2 opacity-40">
                  <ChevronDown className="w-4 h-4" />
                </div>
              )}
            </motion.div>
          </motion.div>

          {/* --- EXPANDED CONTENT --- */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0, filter: "blur(10px)" }}
                animate={{
                  opacity: 1,
                  height: "auto",
                  filter: "blur(0px)",
                  transition: { duration: 0.3, delay: 0.1 },
                }}
                exit={{
                  opacity: 0,
                  height: 0,
                  filter: "blur(10px)",
                  transition: { duration: 0.2 },
                }}
                className="flex flex-col gap-3 pt-2"
              >
                {/* 1. Unit Filter Segmented Control */}
                <div className="bg-slate-100/50 p-1 rounded-[20px] flex relative border border-slate-100">
                  {(["ALL", "FOH", "BOH"] as const).map((f) => {
                    const isActive = activeFilter === f;
                    return (
                      <button
                        key={f}
                        onClick={() => setActiveFilter(f)}
                        className={cn(
                          "flex-1 py-3 rounded-[16px] text-[10px] font-black uppercase tracking-widest relative z-10 transition-colors duration-200",
                          isActive ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeFilterBg"
                            className="absolute inset-0 bg-white rounded-[16px] shadow-sm ring-1 ring-black/5"
                            transition={spring}
                          />
                        )}
                        <span className="relative z-10">{f === 'ALL' ? 'All Units' : f}</span>
                      </button>
                    );
                  })}
                </div>

                {/* 2. Divider */}
                <div className="h-px bg-slate-100 w-full mx-auto" />

                {/* 3. Roles Grid */}
                <div className="grid grid-cols-2 gap-2 pb-2 px-1">
                  {visibleStages.map((stage) => {
                    const isActive = activeStage === stage.id;
                    const Icon = stage.icon;
                    return (
                      <button
                        key={stage.id}
                        onClick={() => setActiveStage(stage.id)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-200 text-left group relative overflow-hidden",
                          isActive
                            ? "bg-slate-900 text-white border-slate-900 shadow-md"
                            : "bg-white border-slate-100 hover:border-slate-300 text-slate-500 hover:bg-slate-50"
                        )}
                      >
                         {/* Active Indicator Dot */}
                         {isActive && (
                             <motion.div 
                                layoutId="activeDot"
                                className="absolute top-1/2 right-3 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" 
                             />
                         )}

                        <Icon
                          className={cn(
                            "w-4 h-4",
                            isActive ? "text-white" : "text-slate-400 group-hover:text-slate-900"
                          )}
                        />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {stage.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>
    </div>
  );
}