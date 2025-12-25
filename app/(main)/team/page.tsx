"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { AnimatePresence, motion, LayoutGroup, PanInfo } from "framer-motion";
import { 
  Users, Search, Zap, Loader2,
  LayoutGrid, GalleryHorizontal 
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// Firebase Imports
import { useAppStore } from "@/lib/store/useStore";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp, collection, addDoc } from "firebase/firestore";

import { Status, STAGES, TeamMember } from "../calendar/_components/types";
import { TeamCard } from "./_components/TeamCard";
import { MemberDetailSheet } from "./_components/MemberDetailSheet";
import TrainerRecruitmentModal from "./_components/TrainerRecruitmentModal";
import TeamDynamicIsland from "./_components/TeamDynamicIsland";

// --- PROMOTION HUD (Drop Target for Role Changes) ---
function PromotionHUD({ 
    draggingMember, 
    onPromote 
}: { 
    draggingMember?: TeamMember; 
    onPromote: (memberId: string, newRole: Status) => void;
}) {
    // Hide Admin from promotion target list
    const visibleStages = STAGES.filter(s => s.id !== "Admin");
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
                             <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Promoting Member</span>
                             <span className="text-xs font-bold text-slate-900">{draggingMember?.name}</span>
                         </div>
                    </div>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {visibleStages.map((stage) => {
                        const isCurrent = draggingMember?.status === stage.id;
                        const isHovered = hoveredStage === stage.id;

                        return (
                            <div 
                                key={stage.id} 
                                // Data attributes used for collision detection
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
    
    // Filters
    const [activeStage, setActiveStage] = useState<Status>("Team Member");
    const [activeFilter, setActiveFilter] = useState<"ALL" | "FOH" | "BOH">("ALL");
    const [viewMode, setViewMode] = useState<"grid" | "horizontal">("grid"); 
    const [searchQuery, setSearchQuery] = useState("");
    
    // Pagination / Infinite Scroll
    const [visibleCount, setVisibleCount] = useState(12);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    // Interaction State
    const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
    const [activeTab, setActiveTab] = useState<"overview" | "curriculum" | "performance" | "documents">("overview");
    const [memberDraggingId, setMemberDraggingId] = useState<string | null>(null);
    const [trainerDraggingId, setTrainerDraggingId] = useState<string | null>(null);
    const [isTrainerPanelOpen, setIsTrainerPanelOpen] = useState(false);

    // Subscriptions
    useEffect(() => {
        const unsubTeam = subscribeTeam();
        const unsubEvents = subscribeEvents(); 
        return () => { unsubTeam(); unsubEvents(); };
    }, [subscribeTeam, subscribeEvents]);

    // Reset pagination when filters change
    useEffect(() => {
        setVisibleCount(12);
    }, [activeStage, activeFilter, searchQuery]);

    // --- FILTER LOGIC ---
    const filteredMembers = useMemo(() => {
        return team
            .filter(m => {
                // 1. Role Match
                const matchesStage = m.status === activeStage;
                // 2. Dept Filter (FOH/BOH) - This uses the data from your scraper
                const matchesFilter = activeFilter === "ALL" || m.dept === activeFilter;
                // 3. Search
                const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
                
                return matchesStage && matchesFilter && matchesSearch;
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [team, activeStage, activeFilter, searchQuery]);

    const visibleMembers = useMemo(() => {
        return filteredMembers.slice(0, visibleCount);
    }, [filteredMembers, visibleCount]);

    // --- INFINITE SCROLL OBSERVER ---
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && visibleCount < filteredMembers.length) {
                    // Load more members when the sentinel comes into view
                    setVisibleCount((prev) => prev + 12);
                }
            },
            {
                root: null, 
                rootMargin: "200px", 
                threshold: 0.1,
            }
        );

        if (loadMoreRef.current) {
            observer.observe(loadMoreRef.current);
        }

        return () => {
            if (loadMoreRef.current) {
                observer.unobserve(loadMoreRef.current);
            }
        };
    }, [visibleCount, filteredMembers.length]);

    // --- HANDLERS ---

    const handleOpenTrainerModal = (member: TeamMember) => {
        setIsTrainerPanelOpen(true);
    };

    const handleTrainerDragStart = (trainerId: string) => setTrainerDraggingId(trainerId);

    const handleAssignTrainer = async (trainer: TeamMember, memberId: string) => {
        const member = team.find(m => m.id === memberId);
        if (member) {
            const loadToast = toast.loading("Establishing Link...");
            try {
                await setDoc(doc(db, "profileOverrides", memberId), {
                    pairing: {
                        id: trainer.id,
                        name: trainer.name,
                        role: trainer.role,
                        image: trainer.image
                    },
                    updatedAt: serverTimestamp()
                }, { merge: true });

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

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-20 relative overflow-x-hidden selection:bg-[#E51636] selection:text-white">
            <div className="absolute inset-0 pointer-events-none opacity-[0.4]" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

            {/* DYNAMIC ISLAND FILTER */}
            <TeamDynamicIsland 
                activeStage={activeStage} 
                setActiveStage={setActiveStage}
                activeFilter={activeFilter}
                setActiveFilter={setActiveFilter}
            />

            {/* HEADER */}
            <div className="max-w-[1400px] mx-auto mt-[8rem] md:mt-48 px-4 md:px-8 space-y-6 relative z-10">
                <div className="hidden md:flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="space-y-1"><h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none uppercase">{activeStage}</h2></div>
                </div>
            </div>

            {/* GRID AREA */}
            <div className="mt-4 md:mt-8 relative z-10 px-0 md:px-8 max-w-[1400px] mx-auto">
                {viewMode === "grid" ? (
                    <>
                        <LayoutGroup id="roster-grid">
                            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-10 px-4 md:px-0">
                                <AnimatePresence mode="popLayout" initial={false}>
                                    {visibleMembers.length > 0 ? (
                                        visibleMembers.map((member) => (
                                            <motion.div 
                                                key={member.id} 
                                                layout 
                                                initial={{ opacity: 0, scale: 0.9 }} 
                                                animate={{ opacity: 1, scale: 1 }} 
                                                exit={{ opacity: 0, scale: 0.9 }} 
                                                transition={{ duration: 0.2 }} 
                                                data-team-card-id={member.id} 
                                                className="relative"
                                                style={{ zIndex: memberDraggingId === member.id ? 100 : 1 }}
                                            >
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
                                            <Users className="w-12 h-12 mb-4 opacity-50" /><p className="text-xs font-black uppercase tracking-[0.2em]">No Team Members Found</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        </LayoutGroup>

                        {/* Infinite Scroll Sentinel */}
                        {visibleCount < filteredMembers.length && (
                            <div ref={loadMoreRef} className="py-12 flex justify-center w-full">
                                <div className="flex items-center gap-2 text-slate-400 bg-white/50 px-4 py-2 rounded-full border border-slate-100 shadow-sm">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Loading Roster...</span>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="w-full h-[600px] flex items-center justify-center text-slate-400">
                        <p className="text-xs uppercase font-bold tracking-widest">Horizontal Mode (Optimized)</p>
                    </div>
                )}
            </div>

            {/* MOBILE SEARCH BAR */}
            <div className="md:hidden fixed bottom-28 left-0 right-0 z-40 flex items-center pointer-events-none justify-center px-4">
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="pointer-events-auto flex items-center bg-white/90 backdrop-blur-2xl border border-white/60 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)] rounded-full h-14 p-1.5 ring-1 ring-slate-900/5 w-full max-w-sm gap-2">
                    <button onClick={() => setViewMode(viewMode === 'grid' ? 'horizontal' : 'grid')} className="w-11 h-full bg-slate-100 rounded-full flex items-center justify-center text-slate-500 shadow-sm border border-slate-200 shrink-0 active:scale-95 transition-transform">
                        {viewMode === 'grid' ? <GalleryHorizontal className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
                    </button>
                    <div className="flex-1 flex items-center gap-2 px-3 bg-slate-50/80 rounded-full h-full border border-slate-100/50">
                        <Search className="w-4 h-4 text-slate-400 shrink-0" />
                        <input className="bg-transparent w-full text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400" placeholder="Find member..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                </motion.div>
            </div>

            {/* MODALS & OVERLAYS */}
            <TrainerRecruitmentModal isOpen={isTrainerPanelOpen} onClose={() => setIsTrainerPanelOpen(false)} onDragStart={handleTrainerDragStart} onDragEnd={handleTrainerDragEnd} draggingId={trainerDraggingId} />
            <AnimatePresence>{memberDraggingId && <PromotionHUD draggingMember={team.find(m => m.id === memberDraggingId)} onPromote={handlePromoteMember} />}</AnimatePresence>
            <AnimatePresence>{selectedMember && <MemberDetailSheet member={selectedMember} activeTab={activeTab} setActiveTab={setActiveTab} onClose={() => setSelectedMember(null)} />}</AnimatePresence>
        </div>
    );
}