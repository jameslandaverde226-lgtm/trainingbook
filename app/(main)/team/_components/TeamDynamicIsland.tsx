"use client";

import { useState } from "react";
import { AnimatePresence, motion, LayoutGroup, Variants, Transition } from "framer-motion";
import { Layers, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { STAGES, Status } from "../../calendar/_components/types";

// --- ANIMATION CONFIG ---
const ISLAND_TRANSITION: Transition = {
    type: "spring",
    damping: 25,
    stiffness: 300,
    mass: 0.8
};

const CONTENT_VARIANTS: Variants = {
    closed: { 
        opacity: 0, 
        y: -4, 
        filter: "blur(4px)",
        transition: { duration: 0.2 } 
    },
    open: { 
        opacity: 1, 
        y: 0, 
        filter: "blur(0px)",
        transition: { delay: 0.1, duration: 0.3 } 
    }
};

interface Props {
    activeStage: Status;
    setActiveStage: (s: Status) => void;
    activeFilter: "ALL" | "FOH" | "BOH";
    setActiveFilter: (f: "ALL" | "FOH" | "BOH") => void;
}

export default function TeamDynamicIsland({ 
    activeStage, setActiveStage, 
    activeFilter, setActiveFilter 
}: Props) {
    const [isOpen, setIsOpen] = useState(false);

    // Filter out "Admin" from the visible stages
    const visibleStages = STAGES.filter(s => s.id !== "Admin");
    const activeStageTitle = STAGES.find(s => s.id === activeStage)?.title || "Roster";

    return (
        <div className="fixed top-24 left-0 right-0 z-50 flex flex-col items-center pointer-events-none px-4">
            <LayoutGroup id="island-nav">
                <motion.div 
                    layout 
                    initial={false}
                    animate={{ 
                        width: isOpen ? "auto" : "fit-content",
                        height: isOpen ? "auto" : "44px",
                        borderRadius: isOpen ? 32 : 50
                    }}
                    transition={ISLAND_TRANSITION}
                    onClick={() => !isOpen && setIsOpen(true)}
                    className={cn(
                        "pointer-events-auto bg-white/90 backdrop-blur-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col relative overflow-hidden transform-gpu ring-1 ring-black/5 transition-colors duration-300",
                        isOpen 
                            ? "p-2 cursor-default min-w-[340px] max-w-[95vw]" 
                            : "px-2 cursor-pointer hover:scale-[1.02] active:scale-95 flex-row items-center justify-center hover:bg-white/95"
                    )}
                >
                    <motion.div layout="position" className={cn("flex items-center justify-between w-full", !isOpen && "h-full")}>
                        <motion.div layout="position" className="flex items-center gap-2 px-2">
                            <motion.div layout className="flex items-center gap-2 text-[#004F71]">
                                <div className={cn("p-1.5 rounded-full transition-colors", isOpen ? "bg-[#004F71]/10" : "bg-transparent")}>
                                    <Layers className="w-3.5 h-3.5 fill-current" />
                                </div>
                                <motion.span layout="position" className="text-[11px] font-[900] uppercase tracking-widest whitespace-nowrap text-slate-700">
                                    {activeStageTitle}
                                </motion.span>
                            </motion.div>

                            {!isOpen && (
                                <motion.div 
                                    initial={{ opacity: 0, width: 0 }} 
                                    animate={{ opacity: 1, width: "auto" }} 
                                    exit={{ opacity: 0, width: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex items-center gap-2 overflow-hidden pl-1"
                                >
                                    <div className="h-3 w-px bg-slate-200" />
                                    <span className={cn(
                                        "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider",
                                        activeFilter === 'FOH' ? "bg-blue-50 text-blue-600" : 
                                        activeFilter === 'BOH' ? "bg-red-50 text-red-600" : 
                                        "bg-slate-100 text-slate-500"
                                    )}>
                                        {activeFilter}
                                    </span>
                                </motion.div>
                            )}
                        </motion.div>

                        <AnimatePresence mode="popLayout">
                            {isOpen && (
                                <motion.button 
                                    layout
                                    initial={{ opacity: 0, scale: 0.5, rotate: -90 }} 
                                    animate={{ opacity: 1, scale: 1, rotate: 0 }} 
                                    exit={{ opacity: 0, scale: 0.5, rotate: 90 }} 
                                    transition={{ duration: 0.2 }} 
                                    onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} 
                                    className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-900 transition-all ml-2"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    <AnimatePresence>
                        {isOpen && (
                            <motion.div 
                                variants={CONTENT_VARIANTS} 
                                initial="closed" 
                                animate="open" 
                                exit="closed" 
                                className="flex flex-col gap-4 w-full origin-top pt-4 px-2 pb-2"
                            >
                                {/* Filter Toggle */}
                                <div className="bg-slate-50 p-1.5 rounded-2xl flex relative isolate shadow-inner">
                                    {(["ALL", "FOH", "BOH"] as const).map(f => {
                                        const isActive = activeFilter === f;
                                        return (
                                            <button 
                                                key={f} 
                                                onClick={() => setActiveFilter(f)} 
                                                className={cn(
                                                    "flex-1 py-3 rounded-xl text-[10px] font-[900] uppercase tracking-widest transition-all relative z-10", 
                                                    isActive ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
                                                )}
                                            >
                                                {isActive && (
                                                    <motion.div 
                                                        layoutId="filter-pill" 
                                                        className="absolute inset-0 bg-white rounded-xl shadow-sm ring-1 ring-black/5" 
                                                        transition={ISLAND_TRANSITION} 
                                                    />
                                                )}
                                                <span className="relative z-10">{f}</span>
                                            </button>
                                        )
                                    })}
                                </div>

                                {/* Stages List */}
                                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 mask-linear-fade px-1">
                                    {visibleStages.map((stage) => {
                                        const isActive = activeStage === stage.id;
                                        return (
                                            <button 
                                                key={stage.id} 
                                                onClick={(e) => { e.stopPropagation(); setActiveStage(stage.id); }} 
                                                className={cn(
                                                    "px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shrink-0 border whitespace-nowrap active:scale-95", 
                                                    isActive 
                                                        ? "bg-[#0F172A] text-white border-transparent shadow-lg shadow-slate-900/20 scale-[1.02]" 
                                                        : "bg-white text-slate-500 border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                                                )}
                                            >
                                                <span className="text-[10px] font-black uppercase tracking-wider">{stage.title}</span>
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