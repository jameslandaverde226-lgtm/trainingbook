"use client";

import { useState, useMemo, useEffect } from "react";
import { AnimatePresence, motion, LayoutGroup, PanInfo, Transition, Variants } from "framer-motion";
import { 
  Users, Search, Zap,
  LayoutGrid, GalleryHorizontal, Layers, ChevronDown, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// Firebase Imports
import { useAppStore } from "@/lib/store/useStore";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp, collection, addDoc } from "firebase/firestore"; // Added collection, addDoc

import { Status, STAGES, TeamMember } from "../calendar/_components/types";
import { TeamCard } from "./_components/TeamCard";
import { MemberDetailSheet } from "./_components/MemberDetailSheet";
import TrainerRecruitmentModal from "./_components/TrainerRecruitmentModal";

// --- PHYSICS CONFIGURATION ---
const ISLAND_TRANSITION: Transition = {
    type: "spring",
    damping: 25,
    stiffness: 300,
    mass: 0.8
};

const CONTENT_VARIANTS: Variants = {
    closed: { 
        opacity: 0, 
        y: -10, 
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

// --- PROMOTION HUD ---
function PromotionHUD({ 
    draggingMember, 
    onPromote 
}: { 
    draggingMember?: TeamMember; 
    onPromote: (memberId: string, newRole: Status) => void;
}) {
    const [hoveredStage, setHoveredStage] = useState<string | null>(null);

    return (
        <motion.div 
            initial={{ y: 100, opacity: 0, x: "-50%" }} 
            animate={{ y: 0, opacity: 1, x: "-50%" }} 
            exit={{ y: 100, opacity: 0, x: "-50%" }}
            className="fixed bottom-6 left-1/2 z-[140] w-[95%] max-w-2xl px-0 pointer-events-none"
        >
            <div className="pointer-events-auto bg-white/90 backdrop-blur-3xl border border-white/60 rounded-[32px] p-3 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.2)] flex flex-col gap-3 ring-1 ring-white/50">
                <div className="flex items-center justify-between px-4 py-1">
                    <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-[#E51636] flex items-center justify-center text-white shadow-lg shadow-red-500/30 animate-pulse">
                            <Zap className="w-4 h-4 fill-current" />
                         </div>
                         <div className="flex flex-col">
                             <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Deploying Agent</span>
                             <span className="text-xs font-bold text-slate-900">{draggingMember?.name}</span>
                         </div>
                    </div>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {STAGES.map((stage) => {
                        const isCurrent = draggingMember?.status === stage.id;
                        const isHovered = hoveredStage === stage.id;

                        return (
                            <div 
                                key={stage.id} 
                                data-role-target={stage.id} 
                                onMouseEnter={() => setHoveredStage(stage.id)}
                                onMouseLeave={() => setHoveredStage(null)}
                                onMouseUp={() => {
                                    if(draggingMember) onPromote(draggingMember.id, stage.id as Status);
                                }}
                                className={cn(
                                    "relative h-16 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-1.5 cursor-pointer overflow-hidden",
                                    isCurrent 
                                        ? "bg-slate-50 border-slate-100 opacity-40 grayscale" 
                                        : isHovered
                                            ? "bg-blue-50 border-[#004F71] scale-105 shadow-xl z-10"
                                            : "bg-white border-slate-100 hover:border-slate-300"
                                )}
                            >
                                <stage.icon className={cn(
                                    "w-4 h-4 transition-colors",
                                    isHovered ? "text-[#004F71]" : "text-slate-400"
                                )} />
                                <span className={cn(
                                    "text-[7px] font-black uppercase tracking-widest text-center leading-none px-1",
                                    isHovered ? "text-[#004F71]" : "text-slate-500"
                                )}>
                                    {stage.title.replace('Assistant', 'Asst.')}
                                </span>
                                {isHovered && !isCurrent && (
                                    <motion.div 
                                        layoutId="target-glow" 
                                        className="absolute inset-0 bg-[#004F71]/5 pointer-events-none" 
                                        transition={{ duration: 0.2 }}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </motion.div>
    );
}

// --- MAIN PAGE ---
export default function TeamBoardPage() {
    const { team, subscribeTeam, subscribeEvents } = useAppStore(); 
    
    const [activeStage, setActiveStage] = useState<Status>("Team Member");
    const [activeFilter, setActiveFilter] = useState<"ALL" | "FOH" | "BOH">("ALL");
    const [viewMode, setViewMode] = useState<"grid" | "horizontal">("grid"); 
    const [searchQuery, setSearchQuery] = useState("");
    const [isIslandExpanded, setIsIslandExpanded] = useState(false);
    const [visibleCount, setVisibleCount] = useState(12);
    const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
    const [activeTab, setActiveTab] = useState<"overview" | "curriculum" | "performance">("overview");
    const [memberDraggingId, setMemberDraggingId] = useState<string | null>(null);
    const [trainerDraggingId, setTrainerDraggingId] = useState<string | null>(null);
    const [isTrainerPanelOpen, setIsTrainerPanelOpen] = useState(false);

    useEffect(() => {
        const unsubTeam = subscribeTeam();
        const unsubEvents = subscribeEvents(); 
        return () => { unsubTeam(); unsubEvents(); };
    }, [subscribeTeam, subscribeEvents]);

    useEffect(() => {
        setVisibleCount(12);
    }, [activeStage, activeFilter, searchQuery]);

    const filteredMembers = useMemo(() => {
        return team
            .filter(m => {
                const matchesStage = m.status === activeStage;
                const matchesFilter = activeFilter === "ALL" || m.dept === activeFilter;
                const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
                return matchesStage && matchesFilter && matchesSearch;
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [team, activeStage, activeFilter, searchQuery]);

    const visibleMembers = useMemo(() => {
        return filteredMembers.slice(0, visibleCount);
    }, [filteredMembers, visibleCount]);

    const handleOpenTrainerModal = (member: TeamMember) => {
        setIsTrainerPanelOpen(true);
    };

    const handleTrainerDragStart = (trainerId: string) => setTrainerDraggingId(trainerId);

    // --- UPDATED ASSIGNMENT HANDLER ---
    const handleAssignTrainer = async (trainer: TeamMember, memberId: string) => {
        const member = team.find(m => m.id === memberId);
        if (member) {
            const loadToast = toast.loading("Establishing Link...");
            try {
                // 1. Update Profile (Visual Card)
                await setDoc(doc(db, "profileOverrides", memberId), {
                    pairing: {
                        id: trainer.id,
                        name: trainer.name,
                        role: trainer.role,
                        image: trainer.image
                    },
                    updatedAt: serverTimestamp()
                }, { merge: true });

                // 2. Create System Log (Events)
                // This ensures it shows up on Dashboard and Detail Sheet
                await addDoc(collection(db, "events"), {
                    type: "Operation",
                    title: "Mentorship Uplink",
                    status: "Done",
                    priority: "High",
                    startDate: new Date(),
                    endDate: new Date(),
                    assignee: trainer.id,
                    assigneeName: trainer.name,
                    teamMemberId: memberId,
                    teamMemberName: member.name,
                    description: `Official mentorship link established with ${trainer.name}. Training protocols synchronized.`,
                    createdAt: serverTimestamp()
                });

                toast.success(
                    <div className="flex flex-col">
                        <span className="font-bold">Mentorship Established</span>
                        <span className="text-xs opacity-90">{trainer.name} is now guiding {member.name}</span>
                    </div>,
                    { id: loadToast, icon: '🤝', style: { background: '#004F71', color: '#fff', padding: '16px', borderRadius: '16px' } }
                );
                
                setIsTrainerPanelOpen(false);
            } catch (err) {
                console.error(err);
                toast.error("Failed to assign mentor", { id: loadToast });
            }
        }
    };

    const handleTrainerDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo, trainer: TeamMember) => {
        setTrainerDraggingId(null);
        let clientX, clientY;
        // @ts-ignore
        if ('clientX' in event) { clientX = event.clientX; clientY = event.clientY; } 
        // @ts-ignore
        else if ('changedTouches' in event) { clientX = event.changedTouches[0]?.clientX; clientY = event.changedTouches[0]?.clientY; }
        
        if (clientX === undefined || clientY === undefined) return;
        const elementsBelow = document.elementsFromPoint(clientX, clientY);
        const teamCardElement = elementsBelow.find(el => el.closest('[data-team-card-id]'))?.closest('[data-team-card-id]');
        
        if (teamCardElement) {
            const memberId = teamCardElement.getAttribute('data-team-card-id');
            if (memberId) handleAssignTrainer(trainer, memberId);
        }
    };

    const handlePromoteMember = async (memberId: string, newRole: Status) => {
        setMemberDraggingId(null); 
        const loadToast = toast.loading(`Promoting to ${newRole}...`);
        try {
            await setDoc(doc(db, "profileOverrides", memberId), {
                role: newRole, 
                status: newRole,
                updatedAt: serverTimestamp()
            }, { merge: true });

            toast.success("Promotion Confirmed", { id: loadToast, icon: '🎖️' });
        } catch (error) {
            console.error(error);
            toast.error("Deployment Failed", { id: loadToast });
        }
    };

    const handleMemberDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo, member: TeamMember) => {
        setMemberDraggingId(null);
        const point = info.point;
        const elementsBelow = document.elementsFromPoint(point.x, point.y);
        const roleTarget = elementsBelow.find(el => el.hasAttribute('data-role-target'));
        if (roleTarget) {
            const newRole = roleTarget.getAttribute('data-role-target') as Status;
            if (newRole && newRole !== member.status) handlePromoteMember(member.id, newRole);
        }
    };

    const activeStageTitle = STAGES.find(s => s.id === activeStage)?.title || "Roster";

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-40 relative overflow-x-hidden selection:bg-[#E51636] selection:text-white">
            <div className="absolute inset-0 pointer-events-none opacity-[0.4]" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

            <div className="fixed top-24 left-0 right-0 z-50 flex flex-col items-center pointer-events-none px-4">
                <LayoutGroup id="island-nav">
                    <motion.div 
                        layout 
                        initial={false}
                        animate={{ 
                            width: isIslandExpanded ? "auto" : "fit-content",
                            height: isIslandExpanded ? "auto" : "44px",
                            borderRadius: isIslandExpanded ? 32 : 50
                        }}
                        transition={ISLAND_TRANSITION}
                        onClick={() => !isIslandExpanded && setIsIslandExpanded(true)}
                        className={cn(
                            "pointer-events-auto bg-white/90 backdrop-blur-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col relative overflow-hidden transform-gpu ring-1 ring-black/5",
                            isIslandExpanded 
                                ? "p-2 cursor-default min-w-[340px] max-w-[95vw]" 
                                : "px-2 cursor-pointer hover:scale-[1.02] active:scale-95 flex-row items-center justify-center"
                        )}
                    >
                        <motion.div layout="position" className={cn("flex items-center justify-between w-full", !isIslandExpanded && "h-full")}>
                            <motion.div layout="position" className="flex items-center gap-2 px-2">
                                <motion.div layout className="flex items-center gap-2 text-[#004F71]">
                                    <div className={cn("p-1.5 rounded-full transition-colors", isIslandExpanded ? "bg-[#004F71]/10" : "bg-transparent")}>
                                        <Layers className="w-3.5 h-3.5 fill-current" />
                                    </div>
                                    <motion.span layout="position" className="text-[11px] font-[900] uppercase tracking-widest whitespace-nowrap text-slate-700">
                                        {activeStageTitle}
                                    </motion.span>
                                </motion.div>

                                {!isIslandExpanded && (
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
                                {isIslandExpanded && (
                                    <motion.button 
                                        layout
                                        initial={{ opacity: 0, scale: 0.5, rotate: -90 }} 
                                        animate={{ opacity: 1, scale: 1, rotate: 0 }} 
                                        exit={{ opacity: 0, scale: 0.5, rotate: 90 }} 
                                        transition={{ duration: 0.2 }} 
                                        onClick={(e) => { e.stopPropagation(); setIsIslandExpanded(false); }} 
                                        className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full text-slate-400 transition-colors ml-2"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        </motion.div>

                        <AnimatePresence>
                            {isIslandExpanded && (
                                <motion.div 
                                    variants={CONTENT_VARIANTS} 
                                    initial="closed" 
                                    animate="open" 
                                    exit="closed" 
                                    className="flex flex-col gap-4 w-full origin-top pt-4 px-2 pb-2"
                                >
                                    <div className="bg-slate-50 p-1.5 rounded-2xl flex relative isolate">
                                        <div className="absolute inset-0 border border-slate-200/50 rounded-2xl pointer-events-none" />
                                        {(["ALL", "FOH", "BOH"] as const).map(f => {
                                            const isActive = activeFilter === f;
                                            return (
                                                <button key={f} onClick={() => setActiveFilter(f)} className={cn("flex-1 py-3 rounded-xl text-[10px] font-[900] uppercase tracking-widest transition-all relative z-10", isActive ? "text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600")}>
                                                    {isActive && <motion.div layoutId="filter-pill" className="absolute inset-0 bg-white rounded-xl shadow-sm ring-1 ring-black/5" transition={ISLAND_TRANSITION} />}
                                                    <span className="relative z-10">{f}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 mask-linear-fade">
                                        {STAGES.map((stage) => {
                                            const isActive = activeStage === stage.id;
                                            return (
                                                <button key={stage.id} onClick={(e) => { e.stopPropagation(); setActiveStage(stage.id); }} className={cn("px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shrink-0 border whitespace-nowrap", isActive ? "bg-[#0F172A] text-white border-transparent shadow-lg shadow-slate-900/20 scale-[1.02]" : "bg-white text-slate-500 border-slate-100 hover:border-slate-300 hover:bg-slate-50")}>
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

            <div className="max-w-[1400px] mx-auto mt-[8rem] md:mt-48 px-2 md:px-8 space-y-6 relative z-10">
                <div className="hidden md:flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="space-y-1"><h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none uppercase">{activeStage}</h2></div>
                </div>
            </div>

            <div className="mt-4 md:mt-8 relative z-10 px-0 md:px-8 max-w-[1400px] mx-auto">
                {viewMode === "grid" ? (
                    <LayoutGroup id="roster-grid">
                        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-10 pb-40 px-4 md:px-0">
                            <AnimatePresence mode="popLayout" initial={false}>
                                {visibleMembers.length > 0 ? (
                                    visibleMembers.map((member) => (
                                        <motion.div key={member.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2 }} data-team-card-id={member.id} className="relative">
                                            <TeamCard 
                                                member={member} 
                                                onClick={setSelectedMember} 
                                                onAssignClick={handleOpenTrainerModal} 
                                                onDragStart={() => setMemberDraggingId(member.id)} 
                                                onDragEnd={(e, info) => handleMemberDragEnd(e, info, member)} 
                                                isDragging={memberDraggingId === member.id} 
                                                isDropTarget={!!trainerDraggingId} 
                                            />
                                        </motion.div>
                                    ))
                                ) : (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full h-64 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-[32px] w-full bg-slate-50/50 mx-4 md:mx-0">
                                        <Users className="w-12 h-12 mb-4 opacity-50" /><p className="text-xs font-black uppercase tracking-[0.2em]">No Operatives Found</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                        {visibleCount < filteredMembers.length && (
                             <div className="flex justify-center pb-20 -mt-20 relative z-20">
                                 <button onClick={() => setVisibleCount(prev => prev + 12)} className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 font-bold py-3 px-8 rounded-full shadow-lg transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                                    <span className="text-xs uppercase tracking-widest">Load More Agents</span>
                                    <ChevronDown className="w-4 h-4" />
                                 </button>
                             </div>
                        )}
                    </LayoutGroup>
                ) : (
                    <div className="w-full h-[600px] flex items-center justify-center text-slate-400">
                        <p className="text-xs uppercase font-bold tracking-widest">Horizontal Mode (Optimized)</p>
                    </div>
                )}
            </div>

            <div className="md:hidden fixed bottom-28 left-0 right-0 z-40 flex items-center pointer-events-none justify-center px-4">
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="pointer-events-auto flex items-center bg-white/90 backdrop-blur-2xl border border-white/60 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)] rounded-full h-14 p-1.5 ring-1 ring-slate-900/5 w-full max-w-sm gap-2">
                    <button onClick={() => setViewMode(viewMode === 'grid' ? 'horizontal' : 'grid')} className="w-11 h-full bg-slate-100 rounded-full flex items-center justify-center text-slate-500 shadow-sm border border-slate-200 shrink-0 active:scale-95 transition-transform">
                        {viewMode === 'grid' ? <GalleryHorizontal className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
                    </button>
                    <div className="flex-1 flex items-center gap-2 px-3 bg-slate-50/80 rounded-full h-full border border-slate-100/50">
                        <Search className="w-4 h-4 text-slate-400 shrink-0" />
                        <input className="bg-transparent w-full text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400" placeholder="Find operative..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                </motion.div>
            </div>

            <TrainerRecruitmentModal isOpen={isTrainerPanelOpen} onClose={() => setIsTrainerPanelOpen(false)} onDragStart={handleTrainerDragStart} onDragEnd={handleTrainerDragEnd} draggingId={trainerDraggingId} />
            <AnimatePresence>{memberDraggingId && <PromotionHUD draggingMember={team.find(m => m.id === memberDraggingId)} onPromote={handlePromoteMember} />}</AnimatePresence>
            <AnimatePresence>{selectedMember && <MemberDetailSheet member={selectedMember} activeTab={activeTab} setActiveTab={setActiveTab} onClose={() => setSelectedMember(null)} />}</AnimatePresence>
        </div>
    );
}