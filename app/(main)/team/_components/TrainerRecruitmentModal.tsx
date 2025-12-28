"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { 
  AnimatePresence, 
  motion, 
  useMotionValue, 
  useSpring, 
  useTransform, 
  MotionValue,
  Variants
} from "framer-motion";
import { X, Crown, Search, ArrowRight } from "lucide-react";
import { useAppStore } from "@/lib/store/useStore";
import { cn } from "@/lib/utils";
import { TeamMember } from "../../calendar/_components/types";

// --- DOCK ICON COMPONENT ---
function DockIcon({ 
    trainer, 
    onSelect, 
    mouseX,
    onHoverStart,
    onHoverEnd,
    isSelected,
    isMobile // New Prop
}: { 
    trainer: TeamMember; 
    onSelect: (trainer: TeamMember) => void;
    mouseX: MotionValue;
    onHoverStart: () => void;
    onHoverEnd: () => void;
    isSelected: boolean;
    isMobile: boolean;
}) {
    const ref = useRef<HTMLButtonElement>(null);

    // --- PHYSICS ENGINE (Desktop Only) ---
    const distance = useTransform(mouseX, (val) => {
        const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
        return val - bounds.x - bounds.width / 2;
    });

    const widthSync = useTransform(distance, [-150, 0, 150], [64, 110, 64]);
    const width = useSpring(widthSync, { mass: 0.1, stiffness: 150, damping: 12 });

    // Visual Identity
    const isFOH = trainer.dept === "FOH";
    const isBOH = trainer.dept === "BOH";

    const brandColor = isFOH 
        ? "bg-[#004F71]" 
        : isBOH 
            ? "bg-[#E51636]" 
            : "bg-slate-500";

    const ringColor = isFOH 
        ? "group-hover:ring-[#004F71]/30" 
        : isBOH 
            ? "group-hover:ring-[#E51636]/30" 
            : "group-hover:ring-slate-500/30";
    
    // Initials Logic (First + Last)
    const initials = trainer.name
        .split(" ")
        .slice(0, 2)
        .map(n => n[0])
        .join("")
        .toUpperCase();

    return (
        <motion.button
            ref={ref}
            // On mobile, use static width (56px) instead of dynamic physics
            style={{ width: isMobile ? 56 : width }}
            onClick={() => onSelect(trainer)}
            className={cn(
                "relative flex flex-col items-center justify-end aspect-square shrink-0 mb-4 focus:outline-none group",
                isMobile ? "mx-1" : "" // Add spacing on mobile since physics gap is gone
            )}
            onMouseEnter={onHoverStart}
            onMouseLeave={onHoverEnd}
            whileTap={{ scale: 0.9 }}
        >
            <div className={cn(
                "w-full h-full rounded-[22px] overflow-hidden shadow-lg transition-all duration-300 cursor-pointer border-[3px] relative bg-white ring-1 ring-black/5",
                isSelected 
                    ? "border-emerald-500 ring-4 ring-emerald-500/20 scale-105" 
                    : `border-white hover:shadow-2xl hover:border-white hover:ring-4 ${ringColor}`
            )}>
                {trainer.image && !trainer.image.includes("ui-avatars.com") ? (
                    <img 
                        src={trainer.image} 
                        className="w-full h-full object-cover pointer-events-none" 
                        alt={trainer.name} 
                    />
                ) : (
                    <div className={cn("w-full h-full flex items-center justify-center text-white font-[1000] text-lg md:text-xl tracking-tight", brandColor)}>
                        {initials}
                    </div>
                )}
                
                {/* Premium Gloss Overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-black/10 via-transparent to-white/30 pointer-events-none mix-blend-overlay" />
            </div>
            
            {/* Reflection Effect */}
            <div className="absolute -bottom-2 left-2 right-2 h-1 bg-black/20 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </motion.button>
    );
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelectLeader: (leader: TeamMember | null) => void;
    selectedLeaderId: string | null;
}

export default function TrainerRecruitmentModal({ isOpen, onClose, onSelectLeader, selectedLeaderId }: Props) {
    const { team } = useAppStore();
    const [filterQuery, setFilterQuery] = useState("");
    const mouseX = useMotionValue(Infinity);
    const [hoveredTrainer, setHoveredTrainer] = useState<TeamMember | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.matchMedia("(max-width: 768px)").matches);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const availableMentors = useMemo(() => {
        return team.filter(member => 
            ["Team Leader", "Assistant Director", "Director"].includes(member.status) &&
            member.name.toLowerCase().includes(filterQuery.toLowerCase())
        );
    }, [team, filterQuery]);

    const activeLeader = useMemo(() => 
        team.find(m => m.id === selectedLeaderId), 
    [team, selectedLeaderId]);

    const dockVariants: Variants = {
        hidden: { y: 200, opacity: 0, scale: 0.9 },
        visible: { 
            y: 0, opacity: 1, scale: 1,
            transition: { type: "spring", damping: 20, stiffness: 300, mass: 0.8 } 
        },
        exit: { y: 200, opacity: 0, transition: { duration: 0.2 } }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* CLICK-AWAY LAYER */}
                    {!selectedLeaderId && (
                        <div className="fixed inset-0 z-[120]" onClick={onClose} />
                    )}

                    {/* --- THE DOCK CONTAINER --- */}
                    <motion.div
                        variants={dockVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="fixed bottom-6 md:bottom-10 inset-x-0 mx-auto w-full md:w-fit z-[130] flex flex-col items-center pointer-events-auto px-4 md:px-0"
                        onMouseMove={(e) => mouseX.set(e.pageX)}
                        onMouseLeave={() => { mouseX.set(Infinity); setHoveredTrainer(null); }}
                    >
                        {/* --- FLOATING HEADER (Label / Search / Active Banner) --- */}
                        <div className="h-14 md:h-16 mb-2 flex items-center justify-center pointer-events-none relative min-w-[280px] md:min-w-[320px] w-full">
                            <AnimatePresence mode="wait">
                                {selectedLeaderId && activeLeader ? (
                                    /* STATE 3: "CONNECTING WITH WHO?" (Assignment Mode) */
                                    <motion.div
                                        key="connecting"
                                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -10, scale: 0.9 }}
                                        className="bg-slate-900/90 backdrop-blur-3xl text-white pl-2 pr-4 py-2 rounded-full shadow-2xl border border-white/20 flex items-center gap-3 pointer-events-auto cursor-pointer group hover:bg-slate-900 transition-colors"
                                        onClick={() => onSelectLeader(null)} // Click to Cancel
                                    >
                                        {/* LEADER CHIP */}
                                        <div className="flex items-center gap-2 bg-white/10 pr-3 py-1 rounded-full pl-1">
                                            <div className="relative w-6 h-6 rounded-full overflow-hidden border border-white/30">
                                                {activeLeader.image ? (
                                                    <img src={activeLeader.image} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-white text-slate-900 flex items-center justify-center font-black text-[9px]">
                                                        {activeLeader.name.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-[10px] font-bold uppercase tracking-wide leading-none max-w-[80px] truncate">
                                                {activeLeader.name}
                                            </span>
                                        </div>

                                        {/* INSTRUCTION */}
                                        <div className="flex items-center gap-1.5 animate-pulse">
                                            <ArrowRight className="w-3 h-3 text-emerald-400" />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">
                                                Select
                                            </span>
                                        </div>

                                        <div className="w-px h-3 bg-white/20" />
                                        
                                        <X className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
                                    </motion.div>
                                ) : hoveredTrainer ? (
                                    /* STATE 2: HOVER PREVIEW */
                                    <motion.div 
                                        key="hover"
                                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        className="bg-white/90 backdrop-blur-md text-slate-900 px-4 py-2 rounded-full shadow-xl border border-white/60 flex items-center gap-2 max-w-[90vw]"
                                    >
                                        <span className="text-xs font-[900] uppercase tracking-widest truncate">{hoveredTrainer.name}</span>
                                        <span className={cn(
                                            "text-[8px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider whitespace-nowrap",
                                            hoveredTrainer.dept === "FOH" 
                                                ? "bg-blue-50 text-[#004F71]" 
                                                : hoveredTrainer.dept === "BOH"
                                                    ? "bg-red-50 text-[#E51636]"
                                                    : "bg-slate-100 text-slate-600"
                                        )}>
                                            {hoveredTrainer.role.replace("Assistant", "Asst.")}
                                        </span>
                                    </motion.div>
                                ) : (
                                    /* STATE 1: SEARCH DEFAULT */
                                    <motion.div 
                                        key="search"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="bg-white/80 backdrop-blur-3xl border border-white/60 shadow-xl rounded-full px-1.5 py-1.5 flex items-center gap-2 ring-1 ring-black/5 pointer-events-auto"
                                    >
                                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                            <Search className="w-4 h-4" />
                                        </div>
                                        <input 
                                            value={filterQuery}
                                            onChange={(e) => setFilterQuery(e.target.value)}
                                            placeholder="Find a Leader..."
                                            className="bg-transparent outline-none text-xs font-black uppercase tracking-widest text-slate-700 placeholder:text-slate-400 w-32 md:w-56 px-2"
                                            autoFocus
                                        />
                                        <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-100 hover:bg-[#E51636] hover:text-white transition-colors flex items-center justify-center text-slate-400">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* --- THE GLASS DOCK --- */}
                        <div className={cn(
                            "flex items-end gap-1 px-4 pb-2 pt-4 rounded-[32px] transition-all duration-300 mx-auto ring-1 ring-white/80 max-w-full",
                            // On mobile: Enable horizontal scroll, hide scrollbar
                            "overflow-x-auto overflow-y-hidden no-scrollbar w-full md:w-auto",
                            selectedLeaderId 
                                ? "bg-slate-900/10 backdrop-blur-[10px] border-white/10 opacity-60 grayscale hover:opacity-100 hover:grayscale-0"
                                : "bg-white/60 backdrop-blur-[40px] border border-white/50 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.2)]"
                        )}>
                            
                            {/* STATIC BADGE (Pool Indicator) - Hide on very small screens if needed */}
                            {!selectedLeaderId && (
                                <div className="hidden md:flex flex-col items-center justify-center gap-2 mr-4 opacity-100 mb-5 ml-2 shrink-0">
                                    <div className="w-12 h-12 bg-[#E51636] rounded-[18px] flex items-center justify-center shadow-lg border-2 border-white relative group cursor-default">
                                        <div className="absolute inset-0 bg-white/20 rounded-[18px] opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <Crown className="w-6 h-6 text-white fill-white drop-shadow-md" />
                                    </div>
                                    <span className="text-[9px] font-[900] text-slate-800 uppercase tracking-widest bg-white/80 px-2 py-0.5 rounded-full shadow-sm backdrop-blur-sm border border-white/40">
                                        Pool
                                    </span>
                                </div>
                            )}

                            {/* SEPARATOR */}
                            {!selectedLeaderId && <div className="hidden md:block w-px h-16 bg-slate-900/10 mx-2 mb-4 shrink-0" />}

                            {/* ICONS ROW - SCROLLABLE ON MOBILE */}
                            <div className="flex items-end gap-2 px-1 pb-1">
                                {availableMentors.length > 0 ? (
                                    availableMentors.map((trainer) => (
                                        <DockIcon 
                                            key={trainer.id}
                                            trainer={trainer}
                                            onSelect={() => onSelectLeader(selectedLeaderId === trainer.id ? null : trainer)}
                                            mouseX={mouseX}
                                            onHoverStart={() => setHoveredTrainer(trainer)}
                                            onHoverEnd={() => setHoveredTrainer(null)}
                                            isSelected={selectedLeaderId === trainer.id}
                                            isMobile={isMobile}
                                        />
                                    ))
                                ) : (
                                    <div className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic opacity-60 whitespace-nowrap">
                                        No leaders found
                                    </div>
                                )}
                                {/* Spacer for scroll padding */}
                                <div className="w-4 shrink-0 md:hidden" />
                            </div>
                        </div>

                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}