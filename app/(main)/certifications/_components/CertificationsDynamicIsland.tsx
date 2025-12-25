"use client";

import { motion, AnimatePresence, useDragControls, Transition } from "framer-motion";
import { 
  Award, Trophy, ChevronDown, ChevronUp, Plus, Star 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TACTICAL_ICONS } from "@/lib/icon-library";

// --- CONSTANTS ---
const SPRING_TRANSITION: Transition = { 
    type: "spring", 
    stiffness: 500, 
    damping: 30, 
    mass: 1 
};

// --- LOCAL DRAGGABLE BADGE COMPONENT ---
const DraggableInventoryBadge = ({ badge, onDragStart, onDragEnd }: any) => {
    const IconComp = TACTICAL_ICONS.find(i => i.id === badge.iconId)?.icon || Star;
    const controls = useDragControls();

    return (
        <motion.div
            drag
            dragControls={controls}
            dragListener={false}
            dragSnapToOrigin
            dragElastic={0.1}
            whileHover={{ scale: 1.05, y: -2 }}
            whileDrag={{ scale: 1.2, zIndex: 999, cursor: "grabbing" }}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className="group relative flex flex-col items-center gap-2 cursor-grab touch-none shrink-0"
        >
            <div 
                onPointerDown={(e) => controls.start(e)}
                className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 bg-white relative overflow-hidden transition-shadow group-hover:shadow-md group-hover:border-[#004F71]/30"
            >
                <div className="absolute inset-0 opacity-10" style={{ backgroundColor: badge.hex }} />
                <IconComp className="w-6 h-6 relative z-10 transition-transform group-hover:scale-110" style={{ color: badge.hex }} />
            </div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight max-w-[60px] truncate text-center leading-none">
                {badge.label}
            </span>
        </motion.div>
    );
};

interface Props {
    activeView: "armory" | "eotm";
    setActiveView: (v: "armory" | "eotm") => void;
    isExpanded: boolean;
    setIsExpanded: (v: boolean) => void;
    badges: any[];
    onOpenForge: () => void;
    onDragStart: (id?: string) => void;
    onDragEnd: (e: any, info: any, badge: any) => void;
}

export default function CertificationsDynamicIsland({
    activeView, setActiveView, isExpanded, setIsExpanded,
    badges, onOpenForge, onDragStart, onDragEnd
}: Props) {

    return (
        <div className="fixed top-24 md:top-28 left-0 right-0 z-[90] flex justify-center pointer-events-none px-4">
            <motion.div 
                layout
                transition={SPRING_TRANSITION}
                className={cn(
                    "pointer-events-auto bg-white/95 backdrop-blur-2xl border border-slate-200/80 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)] rounded-[32px] flex flex-col overflow-hidden ring-1 ring-black/5",
                    isExpanded && activeView === 'armory' ? "w-[94vw] md:w-[600px]" : "w-fit"
                )}
            >
                {/* --- MAIN PILL HEADER --- */}
                <motion.div layout="position" className="flex items-center justify-between p-1.5 gap-1.5">
                    
                    <div className="flex items-center gap-1.5">
                        {/* ARMORY TAB */}
                        <button 
                            onClick={() => { setActiveView("armory"); setIsExpanded(false); }}
                            className={cn(
                                "flex items-center gap-2 px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors",
                                activeView === "armory" 
                                    ? "bg-[#004F71] text-white shadow-lg shadow-blue-900/20" 
                                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            <Award className="w-4 h-4" /> <span className="hidden md:inline">Armory</span>
                        </button>

                        {/* RECOGNITION TAB */}
                        <button 
                            onClick={() => { setActiveView("eotm"); setIsExpanded(false); }}
                            className={cn(
                                "flex items-center gap-2 px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors",
                                activeView === "eotm" 
                                    ? "bg-[#E51636] text-white shadow-lg shadow-red-900/20" 
                                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            <Trophy className="w-4 h-4" /> <span className="hidden md:inline">Recognition</span>
                        </button>
                    </div>
                    
                    {/* TOGGLE BUTTON */}
                    {activeView === 'armory' && (
                        <div className="flex items-center">
                            <div className="h-6 w-px bg-slate-200 mx-1 md:mx-2" />
                            <button 
                                onClick={() => setIsExpanded(!isExpanded)}
                                className={cn(
                                    "flex items-center justify-center gap-2 h-10 px-4 md:px-5 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors border",
                                    isExpanded 
                                        ? "bg-slate-100 text-slate-600 border-slate-200" 
                                        : "bg-white text-slate-500 border-transparent hover:bg-slate-50"
                                )}
                            >
                                 <span className="hidden md:inline">{isExpanded ? "Close" : "Inventory"}</span>
                                 {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                        </div>
                    )}
                </motion.div>

                {/* --- EXPANDABLE INVENTORY --- */}
                <AnimatePresence mode="popLayout">
                    {isExpanded && activeView === 'armory' && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ ...SPRING_TRANSITION, opacity: { duration: 0.2 } }}
                            className="border-t border-slate-100 bg-slate-50/50"
                        >
                            <div className="p-5 md:p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-[#004F71] text-white rounded-xl shadow-md">
                                            <Award className="w-4 h-4" />
                                        </div>
                                        <div className="flex flex-col">
                                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-800">Badge Inventory</h4>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Drag to Assign</p>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={onOpenForge} 
                                        className="group flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:border-[#E51636] hover:text-[#E51636] transition-all shadow-sm active:scale-95"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover:text-[#E51636]">New</span>
                                    </button>
                                </div>
                                
                                <div className="flex flex-wrap gap-3 md:gap-4 max-h-[35vh] overflow-y-auto custom-scrollbar p-1 pb-4">
                                    {badges.map(badge => (
                                        <DraggableInventoryBadge 
                                            key={badge.id}
                                            badge={badge}
                                            onDragStart={() => { onDragStart(); setIsExpanded(true); }}
                                            onDragEnd={(e: any, info: any) => onDragEnd(e, info, badge)}
                                        />
                                    ))}
                                    {badges.length === 0 && (
                                        <div className="w-full py-10 text-center flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                            <Award className="w-8 h-8 mb-2 opacity-20" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Inventory Empty</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}