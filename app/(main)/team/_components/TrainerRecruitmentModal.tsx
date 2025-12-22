"use client";

import { useMemo, useState, useEffect } from "react";
import { AnimatePresence, motion, useDragControls, Variants } from "framer-motion";
import { 
  X, Crown, Zap, GripVertical, ShieldCheck, 
  User, ChevronDown, ChevronUp, Users, Search
} from "lucide-react";
import { useAppStore } from "@/lib/store/useStore";
import { cn } from "@/lib/utils";
import { TeamMember } from "../../calendar/_components/types";

// --- DRAGGABLE TRAINER CHIP ---
function DraggableTrainerPill({ 
    trainer, 
    onDragStart, 
    onDragEnd, 
    isOtherBeingDragged 
}: { 
    trainer: TeamMember; 
    onDragStart: (id: string) => void; 
    onDragEnd: (event: any, info: any, trainer: TeamMember) => void;
    isOtherBeingDragged: boolean;
}) {
    const controls = useDragControls();

    // Determine Branding based on Dept
    const isFOH = trainer.dept === "FOH";
    const brandColor = isFOH ? "bg-[#004F71]" : "bg-[#E51636]";
    const brandBorder = isFOH ? "group-hover:border-[#004F71]/30" : "group-hover:border-[#E51636]/30";

    return (
        <motion.div
            drag
            dragControls={controls}
            dragListener={false}
            dragSnapToOrigin
            dragElastic={0.1}
            whileDrag={{ scale: 1.05, zIndex: 9999, cursor: "grabbing" }}
            onDragStart={() => onDragStart(trainer.id)}
            onDragEnd={(event, info) => onDragEnd(event, info, trainer)}
            className="group flex-shrink-0 relative w-full"
            layout
            // Hide if another card is being dragged to clear the UI
            animate={{ opacity: isOtherBeingDragged ? 0 : 1 }}
            transition={{ duration: 0.2 }}
        >
            <div 
                onPointerDown={(e) => controls.start(e)}
                onDragStart={(e) => e.preventDefault()}
                className={cn(
                    "flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-[18px] shadow-sm transition-all cursor-grab active:cursor-grabbing relative overflow-hidden select-none touch-none",
                    "hover:shadow-md hover:scale-[1.02]",
                    brandBorder
                )}
            >
                {/* Department Color Strip */}
                <div className={cn("absolute left-0 top-0 bottom-0 w-1", brandColor)} />

                {/* Avatar */}
                <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-slate-50 shadow-inner border border-slate-100">
                    {trainer.image && !trainer.image.includes("ui-avatars.com") ? (
                        <img 
                            src={trainer.image} 
                            className="w-full h-full object-cover pointer-events-none" 
                            alt={trainer.name} 
                            draggable={false} 
                        />
                    ) : (
                        <div className={cn("w-full h-full flex items-center justify-center text-white font-black text-xs", brandColor)}>
                            {trainer.name.charAt(0)}
                        </div>
                    )}
                </div>
                
                {/* Info */}
                <div className="flex flex-col flex-1 min-w-0 pointer-events-none">
                    <span className="text-xs font-[900] text-slate-800 truncate leading-tight group-hover:text-slate-900">{trainer.name}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={cn("text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md bg-slate-50 border border-slate-200 tracking-wider text-slate-500")}>
                            {trainer.dept}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate">
                            {trainer.role.replace('Assistant', 'Asst.')}
                        </span>
                    </div>
                </div>

                {/* Grip Handle */}
                <div className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 group-hover:bg-slate-50 group-hover:text-slate-500 transition-colors pointer-events-none">
                    <GripVertical className="w-4 h-4" />
                </div>
            </div>
        </motion.div>
    );
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onDragStart: (id: string) => void;
    onDragEnd: (event: any, info: any, trainer: TeamMember) => void;
    draggingId?: string | null;
}

export default function TrainerRecruitmentModal({ isOpen, onClose, onDragStart, onDragEnd, draggingId }: Props) {
    const { team } = useAppStore();
    const [isMobile, setIsMobile] = useState(false);
    const [filterQuery, setFilterQuery] = useState("");

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 1024);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const availableMentors = useMemo(() => {
        return team.filter(member => 
            ["Team Leader", "Assistant Director", "Director"].includes(member.status) &&
            member.name.toLowerCase().includes(filterQuery.toLowerCase())
        );
    }, [team, filterQuery]);

    // Enhanced Animations
    const desktopVariants: Variants = {
        hidden: { x: "120%", opacity: 0, scale: 0.95 },
        visible: { x: 0, opacity: 1, scale: 1, transition: { type: "spring", damping: 28, stiffness: 300, mass: 0.8 } },
        exit: { x: "120%", opacity: 0, transition: { duration: 0.2 } }
    };

    const mobileVariants: Variants = {
        hidden: { y: "100%", opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: "spring", damping: 25, stiffness: 300 } },
        exit: { y: "100%", opacity: 0 }
    };

    const isDragging = !!draggingId;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* BACKDROP - Completely hide when dragging */}
                    {!isDragging && (
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            onClick={onClose}
                            className="fixed inset-0 bg-slate-900/20 backdrop-blur-[4px] z-[120] lg:block hidden"
                        />
                    )}

                    <motion.div
                        key="trainer-panel"
                        variants={isMobile ? mobileVariants : desktopVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className={cn(
                            "fixed z-[130] flex flex-col transition-all duration-300 pointer-events-auto",
                            // DESKTOP
                            "lg:top-6 lg:right-6 lg:bottom-6 lg:w-[360px] lg:rounded-[40px]",
                            // MOBILE
                            "left-0 right-0 bottom-0 h-auto rounded-t-[32px] pb-8",
                            
                            // VISUAL STATE TOGGLE
                            isDragging 
                                ? "bg-transparent border-transparent shadow-none backdrop-blur-none" 
                                : "bg-white/80 backdrop-blur-2xl border-white/60 shadow-2xl border ring-1 ring-white/50 lg:bg-[#F8FAFC]"
                        )}
                        style={isMobile && !isDragging ? { backgroundColor: '#F8FAFC', borderTop: '1px solid #e2e8f0' } : {}}
                    >
                        {/* --- HEADER (Hides on Drag) --- */}
                        <div className={cn("relative p-6 pb-2 shrink-0 z-20 transition-opacity duration-200", isDragging ? "opacity-0 pointer-events-none" : "opacity-100")}>
                            {/* Decorative BG */}
                            <div className="absolute inset-0 bg-gradient-to-b from-white/80 to-transparent lg:rounded-t-[40px] pointer-events-none" />

                            <div className="relative flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-lg shadow-slate-900/20">
                                        <Crown className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-[1000] text-slate-900 uppercase tracking-tight leading-none">Trainer Command</h3>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">System Active</span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={onClose} className="p-2.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors border border-transparent hover:border-slate-200">
                                    {isMobile ? <ChevronDown className="w-5 h-5" /> : <X className="w-5 h-5" />}
                                </button>
                            </div>

                            <div className="relative group">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#004F71] transition-colors" />
                                <input 
                                    value={filterQuery}
                                    onChange={(e) => setFilterQuery(e.target.value)}
                                    placeholder="Search leaders..." 
                                    className="w-full bg-white/50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm font-bold text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-[#004F71]/30 focus:ring-4 focus:ring-[#004F71]/5 transition-all shadow-sm"
                                />
                            </div>
                        </div>

                        {/* --- LIST CONTAINER --- */}
                        <div className={cn(
                            "flex-1 p-4 lg:p-6 lg:pt-2 custom-scrollbar relative z-10 transition-all duration-200",
                            isMobile ? "flex flex-row gap-4 px-6 pb-4" : "flex flex-col gap-3",
                            
                            // SCROLL & VISIBILITY LOGIC
                            // If dragging: Allow overflow (so card isn't clipped) but hide non-dragged items via opacity
                            isDragging ? "overflow-visible" : (isMobile ? "overflow-x-auto" : "overflow-y-auto")
                        )}>
                            
                             {/* Desktop Label (Hides on Drag) */}
                            {!isMobile && (
                                <div className={cn("flex items-center justify-between px-1 pb-1 transition-opacity", isDragging ? "opacity-0" : "opacity-100")}>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Available Units</span>
                                    <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{availableMentors.length}</span>
                                </div>
                            )}

                            {availableMentors.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl p-8 bg-slate-50/50">
                                    <Users className="w-8 h-8 mb-2 opacity-30" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">No Leaders Found</p>
                                </div>
                            ) : (
                                availableMentors.map(trainer => (
                                    <DraggableTrainerPill 
                                        key={trainer.id} 
                                        trainer={trainer} 
                                        onDragStart={onDragStart} 
                                        onDragEnd={onDragEnd}
                                        isOtherBeingDragged={!!draggingId && draggingId !== trainer.id}
                                    />
                                ))
                            )}
                            
                            {isMobile && <div className="w-4 shrink-0" />}
                        </div>

                        {/* --- FOOTER (Hides on Drag) --- */}
                        <div className={cn("hidden lg:block p-6 pt-2 pb-6 relative z-20 transition-opacity duration-200", isDragging ? "opacity-0 pointer-events-none" : "opacity-100")}>
                            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200/60 shadow-sm flex gap-3">
                                <div className="p-2 bg-blue-50 text-[#004F71] rounded-lg shrink-0 h-fit">
                                    <Zap className="w-4 h-4 fill-current" />
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-widest mb-1">Operational Guide</h4>
                                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                                        Drag a leader card onto any team member in the main grid to instantly establish a mentorship uplink.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}