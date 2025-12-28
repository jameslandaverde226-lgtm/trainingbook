"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
// ... existing imports ...
import { AnimatePresence, motion, LayoutGroup, PanInfo } from "framer-motion";
import { 
  Users, Search, Zap, Loader2,
  LayoutGrid, GalleryHorizontal, ArrowRight, ScanFace 
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

import { useAppStore } from "@/lib/store/useStore";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp, collection, addDoc, updateDoc, writeBatch } from "firebase/firestore";

import { Status, STAGES, TeamMember } from "../calendar/_components/types";
import { TeamCard } from "./_components/TeamCard";
import { MemberDetailSheet } from "./_components/MemberDetailSheet";
import TrainerRecruitmentModal from "./_components/TrainerRecruitmentModal";
import TeamDynamicIsland from "./_components/TeamDynamicIsland";
import UnitAssignmentModal from "./_components/UnitAssignmentModal";

// ... PromotionHUD component remains unchanged ...
function PromotionHUD({ 
    draggingMember, 
    onPromote 
}: { 
    draggingMember?: TeamMember; 
    onPromote: (memberId: string, newRole: Status) => void;
}) {
    // ... code unchanged ...
    const visibleStages = STAGES;
    const [hoveredStage, setHoveredStage] = useState<string | null>(null);

    return (
        <motion.div 
            initial={{ y: 100, opacity: 0, x: "-50%" }} 
            animate={{ y: 0, opacity: 1, x: "-50%" }} 
            exit={{ y: 100, opacity: 0, x: "-50%" }}
            className="fixed bottom-32 md:bottom-12 left-1/2 z-[140] w-[90%] max-w-2xl px-0 pointer-events-none"
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
    // 1. GET CURRENT USER
    // Added 'curriculum' to store hook
    const { team, subscribeTeam, subscribeEvents, subscribeCurriculum, updateMemberLocal, currentUser, curriculum } = useAppStore(); 
    
    // Filters
    const [activeStage, setActiveStage] = useState<Status>("Team Member");
    const [activeFilter, setActiveFilter] = useState<"ALL" | "FOH" | "BOH">("ALL");
    const [viewMode, setViewMode] = useState<"grid" | "gallery">("grid"); 
    const [searchQuery, setSearchQuery] = useState("");
    
    // 2. NEW STATE: MY PAIRINGS FILTER
    const [showMyPairings, setShowMyPairings] = useState(false);
    
    // Pagination / Infinite Scroll
    const [visibleCount, setVisibleCount] = useState(12);
    const visibleCountRef = useRef(visibleCount); 
    const loadMoreRef = useRef<HTMLDivElement>(null);

    // Interaction State
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
    const [assignmentMember, setAssignmentMember] = useState<TeamMember | null>(null); 
    const [activeTab, setActiveTab] = useState<"overview" | "curriculum" | "performance" | "documents">("overview");
    const [memberDraggingId, setMemberDraggingId] = useState<string | null>(null);
    
    // TRAINER ASSIGNMENT STATE
    const [activeLeaderId, setActiveLeaderId] = useState<string | null>(null);
    const [isTrainerPanelOpen, setIsTrainerPanelOpen] = useState(false);
    
    // NEW STATE: Track which member clicked "Assign Mentor" to highlight their card
    const [recipientMemberId, setRecipientMemberId] = useState<string | null>(null);
    
    const isProcessingRef = useRef(false);

    // Derived active member
    const selectedMember = useMemo(() => 
        team.find(m => m.id === selectedMemberId) || null, 
    [team, selectedMemberId]);

    // Subscriptions
    useEffect(() => {
        const unsubTeam = subscribeTeam();
        const unsubEvents = subscribeEvents(); 
        const unsubCurriculum = subscribeCurriculum();
        return () => { unsubTeam(); unsubEvents(); unsubCurriculum(); };
    }, [subscribeTeam, subscribeEvents, subscribeCurriculum]);

    useEffect(() => {
        setVisibleCount(12);
        visibleCountRef.current = 12;
    }, [activeStage, activeFilter, searchQuery]);

    useEffect(() => {
        visibleCountRef.current = visibleCount;
    }, [visibleCount]);

    // 3. UPDATE FILTER LOGIC (WITH PROGRESS CALCULATION INJECTED)
    const filteredMembers = useMemo(() => {
        return team
            .filter(m => {
                const matchesStage = m.status === activeStage;
                const matchesFilter = activeFilter === "ALL" || m.dept === activeFilter;
                const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
                
                // My Pairings Logic
                const matchesPairing = showMyPairings 
                    ? m.pairing?.id === currentUser?.uid 
                    : true;

                return matchesStage && matchesFilter && matchesSearch && matchesPairing;
            })
            // --- INJECT REAL-TIME PROGRESS HERE ---
            .map(m => {
                // Same logic as Detail Sheet
                if (!curriculum || curriculum.length === 0) return m;

                const relevantSections = curriculum.filter(section => 
                    section.dept?.toUpperCase() === m.dept?.toUpperCase()
                );
                
                const totalTasks = relevantSections.reduce((acc, section) => 
                    acc + (section.tasks?.length || 0), 0);

                const completedCount = relevantSections.reduce((acc, section) => {
                    const completedInSection = section.tasks?.filter((t: any) => 
                        m.completedTaskIds?.includes(t.id)
                    ).length || 0;
                    return acc + completedInSection;
                }, 0);

                const calculatedProgress = totalTasks > 0 
                    ? Math.round((completedCount / totalTasks) * 100) 
                    : 0;

                return { ...m, progress: calculatedProgress };
            })
            // --- END INJECTION ---
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [team, activeStage, activeFilter, searchQuery, showMyPairings, currentUser, curriculum]);

    const visibleMembers = useMemo(() => {
        return filteredMembers.slice(0, visibleCount);
    }, [filteredMembers, visibleCount]);

    // --- INFINITE SCROLL OBSERVER ---
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    if (visibleCountRef.current < filteredMembers.length) {
                        setVisibleCount(prev => prev + 12);
                    }
                }
            },
            { root: null, rootMargin: "400px", threshold: 0 } 
        );

        const currentSentinel = loadMoreRef.current;
        if (currentSentinel) observer.observe(currentSentinel);
        
        return () => { 
            if (currentSentinel) observer.unobserve(currentSentinel); 
        };
    }, [filteredMembers.length]); 

    // ... (All Handlers and Render logic remain the same, just passing the new enriched 'member' object) ...
    // Note: I will just verify the rest of the file structure is intact below.

    // --- SHARED: LINK LOGIC ---
    const linkMemberAndLeader = async (targetId: string, leaderId: string) => {
        if (isProcessingRef.current) return;
        
        const leader = team.find(m => m.id === leaderId);
        const targetMember = team.find(m => m.id === targetId);
        
        if (!leader || !targetMember) return;

        isProcessingRef.current = true;
        const loadToast = toast.loading(`Linking ${leader.name} to ${targetMember.name}...`);
        
        updateMemberLocal(targetMember.id, {
            pairing: { 
                id: leader.id, 
                name: leader.name, 
                role: leader.role, 
                image: leader.image 
            }
        });

        try {
            await setDoc(doc(db, "profileOverrides", targetMember.id), {
                pairing: { id: leader.id, name: leader.name, role: leader.role, image: leader.image },
                updatedAt: serverTimestamp()
            }, { merge: true });

            await addDoc(collection(db, "events"), {
                type: "Operation",
                title: "Mentorship Uplink",
                status: "Done",
                priority: "High",
                startDate: new Date(),
                endDate: new Date(),
                assignee: leader.id,
                assigneeName: leader.name,
                teamMemberId: targetMember.id,
                teamMemberName: targetMember.name,
                description: `Official mentorship link established with ${leader.name}.`,
                createdAt: serverTimestamp()
            });

            toast.success("Mentorship Uplink Established", { id: loadToast });
            setActiveLeaderId(null);
            setRecipientMemberId(null);
            setIsTrainerPanelOpen(false);
        } catch (e) {
            updateMemberLocal(targetMember.id, { pairing: targetMember.pairing }); 
            toast.error("Failed", { id: loadToast });
        } finally {
            isProcessingRef.current = false;
        }
    };

    // --- HANDLERS ---
    const openRecruitment = (member: TeamMember) => {
        setActiveLeaderId(null);
        setRecipientMemberId(member.id); 
        setIsTrainerPanelOpen(true);
    };

    const handleSelectLeader = (leader: TeamMember | null) => {
        if (!leader) {
            setActiveLeaderId(null);
            return;
        }
        if (recipientMemberId) {
            linkMemberAndLeader(recipientMemberId, leader.id);
            return;
        }
        if (activeLeaderId === leader.id) {
            setActiveLeaderId(null);
        } else {
            setActiveLeaderId(leader.id);
        }
    };

    const handleMemberClick = async (targetMember: TeamMember) => {
        if (targetMember.dept === "Unassigned") {
            setAssignmentMember(targetMember);
            return;
        }
        if (activeLeaderId) {
            linkMemberAndLeader(targetMember.id, activeLeaderId);
            return;
        }
        setSelectedMemberId(targetMember.id);
    };

    const handleUnitAssign = async (dept: "FOH" | "BOH") => {
        if (!assignmentMember || isProcessingRef.current) return;
        isProcessingRef.current = true;
        updateMemberLocal(assignmentMember.id, { dept });

        const loadToast = toast.loading(`Initializing ${dept} Profile...`);
        try {
            await updateDoc(doc(db, "teamMembers", assignmentMember.id), { 
                dept: dept,
                updatedAt: serverTimestamp()
            });

            await addDoc(collection(db, "events"), {
                title: `Unit Assignment: ${dept}`,
                type: "Operation",
                status: "Done",
                priority: "High",
                startDate: new Date(),
                endDate: new Date(),
                assignee: "System",
                assigneeName: "Command",
                teamMemberId: assignmentMember.id,
                teamMemberName: assignmentMember.name,
                description: `[SYSTEM LOG: ASSIGNMENT]\nInitial deployment to ${dept} Unit.`,
                createdAt: serverTimestamp()
            });

            toast.success("Unit Assigned", { id: loadToast });
            setAssignmentMember(null);
        } catch (e) {
            toast.error("Assignment Failed", { id: loadToast });
        } finally {
            isProcessingRef.current = false;
        }
    };

    const handlePromoteMember = async (memberId: string, newRole: Status) => {
        if (isProcessingRef.current) return;
        const member = team.find(m => m.id === memberId);
        if(!member || member.status === newRole) {
            setMemberDraggingId(null);
            return;
        }

        isProcessingRef.current = true;
        setMemberDraggingId(null); 
        const toastId = toast.loading(`Promoting to ${newRole}...`);
        
        updateMemberLocal(memberId, { status: newRole, role: newRole });

        try {
            const batch = writeBatch(db);
            const overrideRef = doc(db, "profileOverrides", memberId);
            const memberRef = doc(db, "teamMembers", memberId);
            const today = new Date().toISOString();

            batch.set(overrideRef, {
                role: newRole, status: newRole, promotionDates: { [newRole]: today }, updatedAt: serverTimestamp()
            }, { merge: true });

            batch.update(memberRef, { role: newRole, status: newRole, updatedAt: serverTimestamp() });
            await batch.commit();

            await addDoc(collection(db, "events"), {
                title: `Rank Advancement: ${newRole}`,
                type: "Operation",
                status: "Done",
                priority: "High",
                startDate: new Date(),
                endDate: new Date(),
                assignee: "System",
                assigneeName: "Command",
                teamMemberId: memberId,
                teamMemberName: member?.name || "Member",
                description: `[SYSTEM LOG: PROMOTION]\nOfficial rank advanced to ${newRole}.`,
                createdAt: serverTimestamp()
            });

            toast.success("Promotion Confirmed", { id: toastId, icon: '🎖️' });
        } catch (error) {
            toast.error("Deployment Failed", { id: toastId });
            updateMemberLocal(memberId, { status: member.status, role: member.role });
        } finally {
            setTimeout(() => { isProcessingRef.current = false; }, 500);
        }
    };

    const handleMemberDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo, member: TeamMember) => {
        setMemberDraggingId(null);
        // @ts-ignore
        const clientX = event.clientX || event.changedTouches?.[0]?.clientX;
        // @ts-ignore
        const clientY = event.clientY || event.changedTouches?.[0]?.clientY;

        if (clientX && clientY) {
            const elementsBelow = document.elementsFromPoint(clientX, clientY);
            const targetElement = elementsBelow.find(el => el.hasAttribute('data-role-target'));
            
            if (targetElement) {
                const newRole = targetElement.getAttribute('data-role-target') as Status;
                if (newRole && newRole !== member.status) {
                    handlePromoteMember(member.id, newRole);
                }
            }
        }
    };

    // --- REUSABLE CONTROL BAR ---
    const ControlBar = ({ className }: { className?: string }) => (
        <div className={cn("flex items-center bg-white/90 backdrop-blur-2xl border border-white/60 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)] rounded-full h-14 p-1.5 ring-1 ring-slate-900/5 w-full max-w-sm gap-2", className)}>
            <div className="flex bg-slate-100 rounded-full p-1 border border-slate-200 shrink-0">
                <button 
                    onClick={() => setViewMode('grid')}
                    className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95",
                        viewMode === 'grid' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    <LayoutGrid className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => setViewMode('gallery')}
                    className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95",
                        viewMode === 'gallery' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    <GalleryHorizontal className="w-5 h-5" />
                </button>
            </div>
            
            <div className="flex-1 flex items-center gap-2 px-3 bg-slate-50/80 rounded-full h-full border border-slate-100/50">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input 
                    className="bg-transparent w-full text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400" 
                    placeholder="Find member..." 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                />
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-40 md:pb-20 relative overflow-x-hidden selection:bg-[#E51636] selection:text-white">
            <div className="absolute inset-0 pointer-events-none opacity-[0.4]" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

            <TeamDynamicIsland 
                activeStage={activeStage} 
                setActiveStage={setActiveStage}
                activeFilter={activeFilter}
                setActiveFilter={setActiveFilter}
                showMyPairings={showMyPairings}
                setShowMyPairings={setShowMyPairings}
            />

            <div className="hidden md:flex fixed top-44 left-0 right-0 z-40 justify-center pointer-events-none">
                 <motion.div 
                    initial={{ y: -20, opacity: 0 }} 
                    animate={{ y: 0, opacity: 1 }} 
                    className="pointer-events-auto"
                 >
                     <ControlBar />
                 </motion.div>
            </div>

            <div className="max-w-[1400px] mx-auto mt-[8rem] md:mt-72 px-4 md:px-8 space-y-6 relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="space-y-1 w-full text-center md:text-left">
                        <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none uppercase">{activeStage}</h2>
                    </div>
                </div>
            </div>

            <div className="mt-8 relative z-10 w-full max-w-[100vw] overflow-visible">
                <LayoutGroup id="roster">
                    <AnimatePresence mode="wait">
                        {visibleMembers.length === 0 ? (
                             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full h-64 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-[32px] w-[90%] mx-auto bg-slate-50/50">
                                <Users className="w-12 h-12 mb-4 opacity-50" />
                                <p className="text-xs font-black uppercase tracking-[0.2em]">No Team Members Found</p>
                            </motion.div>
                        ) : viewMode === "grid" ? (
                            <motion.div 
                                key="grid"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-10 px-4 md:px-8 max-w-[1400px] mx-auto"
                            >
                                <AnimatePresence mode="popLayout">
                                    {visibleMembers.map((member) => (
                                        <motion.div 
                                            key={member.id} 
                                            layout 
                                            initial={{ opacity: 0, scale: 0.9 }} 
                                            animate={{ opacity: 1, scale: 1 }} 
                                            exit={{ opacity: 0, scale: 0.9 }} 
                                            data-team-card-id={member.id} 
                                            className="relative"
                                            style={{ zIndex: memberDraggingId === member.id ? 100 : 1 }}
                                        >
                                            <TeamCard 
                                                member={member} 
                                                onClick={handleMemberClick} 
                                                onAssignClick={openRecruitment}
                                                onDragStart={() => setMemberDraggingId(member.id)} 
                                                onDragEnd={(e, info) => handleMemberDragEnd(e, info, member)} 
                                                isDragging={memberDraggingId === member.id} 
                                                isDropTarget={!!activeLeaderId}
                                                isWaitingForMentor={recipientMemberId === member.id}
                                            />
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                                
                                {visibleCount < filteredMembers.length && (
                                    <div 
                                        ref={loadMoreRef} 
                                        className="col-span-full py-12 flex justify-center w-full cursor-pointer"
                                        onClick={() => setVisibleCount(prev => prev + 12)}
                                    >
                                        <div className="flex items-center gap-2 text-slate-400 bg-white/50 px-4 py-2 rounded-full border border-slate-100 shadow-sm hover:bg-white hover:text-slate-600 transition-colors">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Loading Roster...</span>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="gallery"
                                initial={{ opacity: 0, x: 20 }} 
                                animate={{ opacity: 1, x: 0 }} 
                                exit={{ opacity: 0, x: -20 }}
                                className="w-full overflow-x-auto overflow-y-hidden pb-12 pt-4 px-6 md:px-[calc(50%-190px)] snap-x snap-mandatory flex gap-6 no-scrollbar items-center"
                            >
                                {visibleMembers.map((member) => (
                                    <div 
                                        key={member.id} 
                                        className="snap-center shrink-0 w-[85vw] md:w-[380px] h-[500px] md:h-[550px] relative perspective-1000 group transition-transform duration-500 hover:scale-105"
                                        data-team-card-id={member.id} 
                                    >
                                        <div className="absolute -inset-4 bg-gradient-to-b from-slate-200/50 to-transparent rounded-[40px] -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <TeamCard 
                                            member={member} 
                                            onClick={handleMemberClick} 
                                            onAssignClick={openRecruitment}
                                            onDragStart={() => setMemberDraggingId(member.id)} 
                                            onDragEnd={(e, info) => handleMemberDragEnd(e, info, member)} 
                                            isDragging={memberDraggingId === member.id} 
                                            isDropTarget={!!activeLeaderId}
                                            isWaitingForMentor={recipientMemberId === member.id}
                                        />
                                        
                                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            <ScanFace className="w-4 h-4" />
                                            <span className="text-[9px] font-black uppercase tracking-widest">View Profile</span>
                                        </div>
                                    </div>
                                ))}
                                
                                <div className="snap-center shrink-0 w-[10vw]" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </LayoutGroup>
            </div>

            <div className="md:hidden fixed bottom-28 left-0 right-0 z-40 flex items-center pointer-events-none justify-center px-4">
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="pointer-events-auto w-full max-w-sm">
                    <ControlBar />
                </motion.div>
            </div>

            <TrainerRecruitmentModal 
                isOpen={isTrainerPanelOpen} 
                onClose={() => { 
                    setIsTrainerPanelOpen(false); 
                    setActiveLeaderId(null); 
                    setRecipientMemberId(null); 
                }} 
                onSelectLeader={handleSelectLeader}
                selectedLeaderId={activeLeaderId}
            />
            
            <AnimatePresence>{assignmentMember && <UnitAssignmentModal member={assignmentMember} onAssign={handleUnitAssign} onClose={() => setAssignmentMember(null)} />}</AnimatePresence>
            <AnimatePresence>{memberDraggingId && <PromotionHUD draggingMember={team.find(m => m.id === memberDraggingId)} onPromote={handlePromoteMember} />}</AnimatePresence>
            <AnimatePresence>{selectedMember && <MemberDetailSheet member={selectedMember} activeTab={activeTab} setActiveTab={setActiveTab} onClose={() => setSelectedMemberId(null)} />}</AnimatePresence>
        </div>
    );
}