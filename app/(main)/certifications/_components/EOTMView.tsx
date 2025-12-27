"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence, useDragControls, PanInfo, Variants } from "framer-motion";
import { 
  Trophy, Crown, Flame, Coffee, Vote, History, 
  Calendar, ChevronRight, User, Sparkles, Star, Search, X, Gavel, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TeamMember } from "../../calendar/_components/types";
import { format } from "date-fns";
import { useAppStore } from "@/lib/store/useStore";
import { addDoc, collection, serverTimestamp, query, where, onSnapshot, orderBy, doc, setDoc, writeBatch, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";
import ClientPortal from "@/components/core/ClientPortal";

// --- STANDARD EOTM BADGE TEMPLATE ---
const EOTM_BADGE = {
    label: "Employee of the Month",
    iconId: "Trophy", // Matches icon-library ID
    hex: "#f59e0b",   // Gold/Amber color
    desc: "Recognized for outstanding performance."
};

export default function EOTMView() {
    const { team, currentUser } = useAppStore();
    const [votingDept, setVotingDept] = useState<"FOH" | "BOH" | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    
    // DATA STATES
    const [votes, setVotes] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    
    // CONFIRMATION STATE
    const [isConfirmingFinalize, setIsConfirmingFinalize] = useState(false);

    const currentMonthKey = format(new Date(), "yyyy-MM");
    const [isMobile, setIsMobile] = useState(false);
    const dragControls = useDragControls();

    const isAdmin = currentUser?.role === "Director" || currentUser?.role === "Assistant Director";

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // --- SUBSCRIPTIONS ---
    useEffect(() => {
        const q = query(collection(db, "eotm_votes"), where("month", "==", currentMonthKey));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setVotes(snapshot.docs.map(doc => doc.data()));
        });
        return () => unsubscribe();
    }, [currentMonthKey]);

    useEffect(() => {
        const q = query(collection(db, "eotm_winners"), orderBy("monthId", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setHistory(snapshot.docs.map(doc => doc.data()));
        });
        return () => unsubscribe();
    }, []);

    // --- LOGIC ---
    const leaders = useMemo(() => {
        const getLeader = (dept: "FOH" | "BOH") => {
            const deptVotes = votes.filter(v => v.dept === dept);
            if (deptVotes.length === 0) return null;
            const counts: Record<string, number> = {};
            deptVotes.forEach(v => { counts[v.candidateId] = (counts[v.candidateId] || 0) + 1; });
            const topId = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
            const member = team.find(m => m.id === topId);
            return member ? { ...member, voteCount: counts[topId] } : null;
        };
        return { foh: getLeader("FOH"), boh: getLeader("BOH") };
    }, [votes, team]);

    // --- EXECUTE FINALIZE (UPDATED) ---
    const executeFinalize = async () => {
        setIsConfirmingFinalize(false); // Close modal
        const loadToast = toast.loading("Tabulating results & Awarding Badges...");
        
        try {
            const fohWinner = leaders.foh 
                ? { name: leaders.foh.name, id: leaders.foh.id, image: leaders.foh.image || "" } 
                : { name: "No Selection", id: "null", image: "" };
                
            const bohWinner = leaders.boh 
                ? { name: leaders.boh.name, id: leaders.boh.id, image: leaders.boh.image || "" } 
                : { name: "No Selection", id: "null", image: "" };

            const historyData = {
                monthId: currentMonthKey,
                displayDate: format(new Date(), "MMMM yyyy"),
                foh: fohWinner,
                boh: bohWinner,
                totalVotes: votes.length,
                finalizedAt: serverTimestamp()
            };

            const batch = writeBatch(db);

            // 1. Commit to History
            const historyRef = doc(db, "eotm_winners", currentMonthKey);
            batch.set(historyRef, historyData);

            // 2. AWARD BADGES TO WINNERS & CREATE INDIVIDUAL LOGS
            
            // FOH Winner
            if (leaders.foh) {
                const fohRef = doc(db, "profileOverrides", leaders.foh.id);
                const badge = { 
                    ...EOTM_BADGE, 
                    id: Math.random().toString(36).substr(2, 9),
                    awardedId: Math.random().toString(36).substr(2, 9),
                    timestamp: new Date().toISOString(),
                    desc: `Employee of the Month - ${format(new Date(), "MMMM yyyy")}`
                };
                batch.set(fohRef, { badges: arrayUnion(badge), updatedAt: serverTimestamp() }, { merge: true });

                // Create dedicated log for FOH Winner's Profile
                const fohEventRef = doc(collection(db, "events"));
                batch.set(fohEventRef, {
                    title: `EOTM Winner: ${format(new Date(), "MMM")}`,
                    type: "Award",
                    status: "Done",
                    priority: "High",
                    startDate: new Date(),
                    endDate: new Date(),
                    assignee: "System",
                    assigneeName: "Command",
                    teamMemberId: leaders.foh.id, // LINK TO MEMBER
                    teamMemberName: leaders.foh.name,
                    description: `[OFFICIAL RECOGNITION]\nAwarded Front of House Employee of the Month for ${format(new Date(), "MMMM")}.`,
                    createdAt: serverTimestamp()
                });
            }

            // BOH Winner
            if (leaders.boh) {
                const bohRef = doc(db, "profileOverrides", leaders.boh.id);
                const badge = { 
                    ...EOTM_BADGE, 
                    id: Math.random().toString(36).substr(2, 9),
                    awardedId: Math.random().toString(36).substr(2, 9),
                    timestamp: new Date().toISOString(),
                    desc: `Employee of the Month - ${format(new Date(), "MMMM yyyy")}`
                };
                batch.set(bohRef, { badges: arrayUnion(badge), updatedAt: serverTimestamp() }, { merge: true });

                // Create dedicated log for BOH Winner's Profile
                const bohEventRef = doc(collection(db, "events"));
                batch.set(bohEventRef, {
                    title: `EOTM Winner: ${format(new Date(), "MMM")}`,
                    type: "Award",
                    status: "Done",
                    priority: "High",
                    startDate: new Date(),
                    endDate: new Date(),
                    assignee: "System",
                    assigneeName: "Command",
                    teamMemberId: leaders.boh.id, // LINK TO MEMBER
                    teamMemberName: leaders.boh.name,
                    description: `[OFFICIAL RECOGNITION]\nAwarded Back of House Employee of the Month for ${format(new Date(), "MMMM")}.`,
                    createdAt: serverTimestamp()
                });
            }

            // 3. Create Global Announcement Log (For Dashboard)
            const globalEventRef = doc(collection(db, "events"));
            batch.set(globalEventRef, {
                title: `EOTM Winners: ${format(new Date(), "MMM")}`,
                type: "Award",
                status: "Done",
                priority: "High", 
                startDate: new Date(),
                endDate: new Date(),
                assignee: "System",
                assigneeName: "Command",
                description: `[OFFICIAL ANNOUNCEMENT]\nThe voting cycle for ${format(new Date(), "MMMM")} is complete.\n\n🏆 FOH Winner: ${fohWinner.name}\n🏆 BOH Winner: ${bohWinner.name}\n\nTotal engagement: ${votes.length} votes cast.`,
                createdAt: serverTimestamp()
            });

            await batch.commit();

            toast.success("Cycle Finalized & Badges Awarded", { id: loadToast });
        } catch (e) {
            console.error(e);
            toast.error("Failed to finalize cycle", { id: loadToast });
        }
    };

    const hasVotedFOH = useMemo(() => votes.some(v => v.voterId === currentUser?.uid && v.dept === "FOH"), [votes, currentUser]);
    const hasVotedBOH = useMemo(() => votes.some(v => v.voterId === currentUser?.uid && v.dept === "BOH"), [votes, currentUser]);

    const eligibleCandidates = useMemo(() => {
        if (!votingDept) return [];
        const deptVotes = votes.filter(v => v.dept === votingDept);
        const counts: Record<string, number> = {};
        deptVotes.forEach(v => { counts[v.candidateId] = (counts[v.candidateId] || 0) + 1; });
        const maxVotes = Math.max(...Object.values(counts), 1); 

        return team
            .filter(m => m.dept === votingDept && m.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(m => ({
                ...m,
                voteCount: counts[m.id] || 0,
                votePercent: ((counts[m.id] || 0) / maxVotes) * 100
            }))
            .sort((a, b) => b.voteCount - a.voteCount);
    }, [team, votingDept, searchQuery, votes]);

    const handleVote = async (candidateId: string, candidateName: string, dept: string) => {
        const alreadyVoted = votes.some(v => v.voterId === currentUser?.uid && v.dept === dept);
        if (alreadyVoted) return toast.error(`You already voted for ${dept}.`);

        const loadToast = toast.loading("Casting Vote...");
        try {
            // 1. Record the Vote
            await addDoc(collection(db, "eotm_votes"), {
                voterId: currentUser?.uid || "anon",
                candidateId,
                candidateName,
                dept,
                month: currentMonthKey,
                timestamp: serverTimestamp()
            });

            // 2. INTELLIGENT EVENT LOGGING (Low Priority)
            // This creates background "chatter" in the live feed showing activity
            await addDoc(collection(db, "events"), {
                title: `${dept} Vote Cast`,
                type: "Vote",
                status: "Done",
                priority: "Low", // Low priority keeps it subtle
                startDate: new Date(),
                endDate: new Date(),
                assignee: "System",
                assigneeName: "Anonymous",
                // Linking teamMemberId allows this to show up on the Candidate's profile feed too!
                teamMemberId: candidateId,
                teamMemberName: candidateName,
                description: `A vote was cast for ${candidateName} in the ${format(new Date(), 'MMMM')} EOTM cycle.`,
                createdAt: serverTimestamp()
            });

            toast.success("Vote Recorded", { id: loadToast });
            setVotingDept(null);
        } catch (e) {
            toast.error("Voting Failed", { id: loadToast });
        }
    };

    const modalVariants: Variants = {
        mobileHidden: { y: "100%" },
        mobileVisible: { y: 0, transition: { type: "spring", damping: 25, stiffness: 300 } },
        desktopHidden: { opacity: 0, scale: 0.95, y: 20 },
        desktopVisible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", duration: 0.5 } }
    };

    return (
        <div className="space-y-8 md:space-y-12 animate-fade-in pb-40 md:pb-20 relative">
            
            {/* --- HERO SECTION --- */}
            <section className="relative pt-4 md:pt-8">
                <div className="absolute top-1/2 left-0 md:left-1/4 w-32 md:w-96 h-32 md:h-96 bg-[#004F71]/10 blur-[80px] md:blur-[120px] rounded-full mix-blend-multiply pointer-events-none" />
                <div className="absolute top-1/2 right-0 md:right-1/4 w-32 md:w-96 h-32 md:h-96 bg-[#E51636]/10 blur-[80px] md:blur-[120px] rounded-full mix-blend-multiply pointer-events-none" />

                <div className="text-center mb-6 md:mb-12 relative z-10 px-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm mb-3 md:mb-6">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Current Cycle: {format(new Date(), "MMMM yyyy")}
                        </span>
                        {/* ADMIN CONTROL: FINALIZE BUTTON */}
                        {isAdmin && (
                            <>
                                <div className="w-px h-3 bg-slate-300 mx-1" />
                                <button 
                                    onClick={() => setIsConfirmingFinalize(true)} // Open Custom Modal
                                    className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-amber-600 hover:text-amber-700 transition-colors"
                                >
                                    <Gavel className="w-3 h-3" /> Finalize
                                </button>
                            </>
                        )}
                    </div>
                    <h2 className="text-3xl md:text-6xl font-[1000] text-slate-900 tracking-tighter uppercase leading-none mb-2 md:mb-4">
                        Employee <span className="hidden md:inline">of the Month</span><span className="md:hidden">Awards</span>
                    </h2>
                    <p className="text-slate-500 font-medium text-[10px] md:text-base max-w-lg mx-auto leading-relaxed">
                        Total Votes Cast: <span className="text-slate-900 font-black">{votes.length}</span>
                    </p>
                </div>

                {/* ... CARDS GRID (Unchanged) ... */}
                <div className="grid grid-cols-2 gap-3 md:gap-8 max-w-5xl mx-auto relative z-10 px-3 md:px-4 pb-4">
                    {/* FOH CARD */}
                    <motion.div whileHover={{ y: -4 }} className="relative group rounded-[24px] md:rounded-[40px] overflow-hidden bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:border-[#004F71]/30 transition-all duration-300">
                        <div className="absolute top-0 left-0 right-0 h-24 md:h-40 bg-gradient-to-b from-[#004F71]/5 to-transparent" />
                        <div className="relative p-4 md:p-10 flex flex-col items-center text-center h-full">
                            <div className="w-12 h-12 md:w-24 md:h-24 bg-[#004F71] text-white rounded-[16px] md:rounded-[28px] flex items-center justify-center shadow-lg shadow-blue-900/20 mb-3 md:mb-8 rotate-3 group-hover:rotate-6 transition-transform duration-500">
                                <Coffee className="w-5 h-5 md:w-10 md:h-10" />
                            </div>
                            <h3 className="text-sm md:text-2xl font-[1000] text-slate-900 uppercase tracking-tight mb-0.5 md:mb-2 leading-none">Front House</h3>
                            <p className="text-[8px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 md:mb-8 hidden md:block">Service Excellence</p>
                            <div className="w-full bg-slate-50 rounded-[16px] md:rounded-[24px] p-2 md:p-5 border border-slate-100 flex flex-col md:flex-row items-center gap-2 md:gap-5 mb-4 md:mb-8 group-hover:bg-blue-50/30 group-hover:border-blue-100 transition-colors">
                                <div className="w-8 h-8 md:w-14 md:h-14 rounded-lg md:rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                                    {leaders.foh?.image ? <img src={leaders.foh.image} className="w-full h-full object-cover" /> : <User className="w-4 h-4 md:w-6 md:h-6 text-slate-300" />}
                                </div>
                                <div className="text-center md:text-left flex-1 min-w-0">
                                    <span className="text-[7px] md:text-[9px] font-black text-[#004F71] uppercase tracking-widest block mb-0.5">Leading</span>
                                    <span className="text-[10px] md:text-base font-bold text-slate-900 truncate block max-w-[80px] md:max-w-none mx-auto">{leaders.foh?.name.split(' ')[0] || "No Votes"}</span>
                                    {leaders.foh && <span className="text-[7px] md:text-[9px] font-bold text-slate-400">{leaders.foh.voteCount} Votes</span>}
                                </div>
                            </div>
                            <button 
                                onClick={() => !hasVotedFOH && setVotingDept("FOH")}
                                disabled={hasVotedFOH}
                                className={cn(
                                    "w-full py-2.5 md:py-5 rounded-[14px] md:rounded-[24px] font-black uppercase text-[9px] md:text-xs tracking-[0.2em] shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 mt-auto",
                                    hasVotedFOH ? "bg-slate-100 text-slate-400 shadow-none cursor-not-allowed" : "bg-[#004F71] hover:bg-[#003b55] text-white shadow-blue-900/10"
                                )}
                            >
                                {hasVotedFOH ? <span className="md:inline">Voted</span> : <><Vote className="w-3 h-3 md:w-4 md:h-4" /> <span className="md:inline">Vote</span></>}
                            </button>
                        </div>
                    </motion.div>

                    {/* BOH CARD */}
                    <motion.div whileHover={{ y: -4 }} className="relative group rounded-[24px] md:rounded-[40px] overflow-hidden bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:border-[#E51636]/30 transition-all duration-300">
                        <div className="absolute top-0 left-0 right-0 h-24 md:h-40 bg-gradient-to-b from-[#E51636]/5 to-transparent" />
                        <div className="relative p-4 md:p-10 flex flex-col items-center text-center h-full">
                            <div className="w-12 h-12 md:w-24 md:h-24 bg-[#E51636] text-white rounded-[16px] md:rounded-[28px] flex items-center justify-center shadow-lg shadow-red-900/20 mb-3 md:mb-8 -rotate-3 group-hover:-rotate-6 transition-transform duration-500">
                                <Flame className="w-5 h-5 md:w-10 md:h-10" />
                            </div>
                            <h3 className="text-sm md:text-2xl font-[1000] text-slate-900 uppercase tracking-tight mb-0.5 md:mb-2 leading-none">Back House</h3>
                            <p className="text-[8px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 md:mb-8 hidden md:block">Culinary Mastery</p>
                            
                            <div className="w-full bg-slate-50 rounded-[16px] md:rounded-[24px] p-2 md:p-5 border border-slate-100 flex flex-col md:flex-row items-center gap-2 md:gap-5 mb-4 md:mb-8 group-hover:bg-red-50/30 group-hover:border-red-100 transition-colors">
                                <div className="w-8 h-8 md:w-14 md:h-14 rounded-lg md:rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                                    {leaders.boh?.image ? <img src={leaders.boh.image} className="w-full h-full object-cover" /> : <User className="w-4 h-4 md:w-6 md:h-6 text-slate-300" />}
                                </div>
                                <div className="text-center md:text-left flex-1 min-w-0">
                                    <span className="text-[7px] md:text-[9px] font-black text-[#E51636] uppercase tracking-widest block mb-0.5">Leading</span>
                                    <span className="text-[10px] md:text-base font-bold text-slate-900 truncate block max-w-[80px] md:max-w-none mx-auto">{leaders.boh?.name.split(' ')[0] || "No Votes"}</span>
                                    {leaders.boh && <span className="text-[7px] md:text-[9px] font-bold text-slate-400">{leaders.boh.voteCount} Votes</span>}
                                </div>
                            </div>
                            <button 
                                onClick={() => !hasVotedBOH && setVotingDept("BOH")}
                                disabled={hasVotedBOH}
                                className={cn(
                                    "w-full py-2.5 md:py-5 rounded-[14px] md:rounded-[24px] font-black uppercase text-[9px] md:text-xs tracking-[0.2em] shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 mt-auto",
                                    hasVotedBOH ? "bg-slate-100 text-slate-400 shadow-none cursor-not-allowed" : "bg-[#E51636] hover:bg-[#c4122d] text-white shadow-red-900/10"
                                )}
                            >
                                {hasVotedBOH ? "Voted" : <><Vote className="w-3 h-3 md:w-4 md:h-4" /> <span className="md:inline">Vote</span></>}
                            </button>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ... HALL OF FAME (Unchanged) ... */}
            <section className="max-w-4xl mx-auto px-4 mt-8 md:mt-20">
                <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-10">
                    <div className="p-2 md:p-3 bg-amber-100 text-amber-600 rounded-xl md:rounded-2xl shadow-sm border border-amber-200">
                        <Trophy className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg md:text-2xl font-[1000] text-slate-900 uppercase tracking-tight leading-none">Hall of Fame</h3>
                        <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5 md:mt-1">Legacy of Excellence</p>
                    </div>
                </div>
                <div className="space-y-4 md:space-y-8 relative">
                    <div className="absolute left-[19px] md:left-[27px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-slate-200 via-slate-200 to-transparent z-0" />
                    {history.length > 0 ? history.map((period, idx) => (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} key={period.monthId} className="relative z-10 flex items-start gap-4 md:gap-8">
                            <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white border-[3px] md:border-[4px] border-slate-50 shadow-sm flex items-center justify-center shrink-0 z-10 relative mt-1 md:mt-0">
                                <History className="w-4 h-4 md:w-6 md:h-6 text-slate-300" />
                            </div>
                            <div className="flex-1 bg-white border border-slate-100 rounded-[24px] md:rounded-[32px] p-4 md:p-8 shadow-sm hover:shadow-xl hover:border-slate-200 transition-all relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:rotate-12 transition-transform duration-500">
                                    <Star className="w-24 h-24 md:w-32 md:h-32 text-amber-400 fill-current" />
                                </div>
                                <div className="mb-3 md:mb-6">
                                    <h4 className="text-sm md:text-xl font-[900] text-slate-900">{period.displayDate}</h4>
                                    <span className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">{period.totalVotes} Votes Cast</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3 md:gap-4 relative z-10">
                                    <div className="flex flex-col md:flex-row items-center md:items-start gap-2 md:gap-4 p-2 md:p-4 rounded-[16px] md:rounded-[20px] bg-blue-50/50 border border-blue-100/60 text-center md:text-left">
                                        <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-[#004F71] text-white flex items-center justify-center font-black text-[10px] md:text-sm shadow-md">{period.foh.name.charAt(0)}</div>
                                        <div><span className="text-[7px] md:text-[9px] font-black text-[#004F71] uppercase tracking-widest block mb-0.5">FOH</span><span className="text-xs md:text-base font-bold text-slate-900 leading-tight block">{period.foh.name}</span></div>
                                    </div>
                                    <div className="flex flex-col md:flex-row items-center md:items-start gap-2 md:gap-4 p-2 md:p-4 rounded-[16px] md:rounded-[20px] bg-red-50/50 border border-red-100/60 text-center md:text-left">
                                        <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-[#E51636] text-white flex items-center justify-center font-black text-[10px] md:text-sm shadow-md">{period.boh.name.charAt(0)}</div>
                                        <div><span className="text-[7px] md:text-[9px] font-black text-[#E51636] uppercase tracking-widest block mb-0.5">BOH</span><span className="text-xs md:text-base font-bold text-slate-900 leading-tight block">{period.boh.name}</span></div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )) : (
                        <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl"><History className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-xs font-bold uppercase tracking-widest">No history records yet.</p></div>
                    )}
                </div>
            </section>

            {/* --- CONFIRMATION MODAL (For Finalize Cycle) --- */}
            <AnimatePresence>
                {isConfirmingFinalize && (
                    <ClientPortal>
                        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                            <motion.div 
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                                onClick={() => setIsConfirmingFinalize(false)} 
                                className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-md" 
                            />
                            <motion.div 
                                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                                className="relative bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl text-center"
                            >
                                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <AlertTriangle className="w-8 h-8 text-amber-600" />
                                </div>
                                <h3 className="text-xl font-[1000] text-slate-900 uppercase tracking-tight mb-2">Finalize Cycle?</h3>
                                <p className="text-xs font-medium text-slate-500 mb-8 leading-relaxed">
                                    This will close voting for <strong>{format(new Date(), "MMMM")}</strong> and publish the current leaders as official winners. This cannot be undone.
                                </p>
                                <div className="flex gap-3">
                                    <button onClick={() => setIsConfirmingFinalize(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-slate-200 transition-colors">Cancel</button>
                                    <button onClick={executeFinalize} className="flex-1 py-3 bg-[#004F71] text-white font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-[#003b55] transition-colors shadow-lg shadow-blue-900/20">Confirm</button>
                                </div>
                            </motion.div>
                        </div>
                    </ClientPortal>
                )}
            </AnimatePresence>

            {/* --- SLIDE-UP VOTING MODAL --- */}
            <AnimatePresence>
                {votingDept && (
                    <ClientPortal>
                        <div className={cn("fixed inset-0 z-[200] flex justify-center pointer-events-none", isMobile ? "items-end" : "items-center p-4")}>
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setVotingDept(null)} className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-xl pointer-events-auto" />
                            <motion.div 
                                variants={modalVariants}
                                initial={isMobile ? "mobileHidden" : "desktopHidden"}
                                animate={isMobile ? "mobileVisible" : "desktopVisible"}
                                exit={isMobile ? "mobileHidden" : "desktopHidden"}
                                drag={isMobile ? "y" : false}
                                dragControls={dragControls}
                                dragListener={false}
                                dragConstraints={{ top: 0, bottom: 0 }}
                                dragElastic={0.05}
                                onDragEnd={(_, info: PanInfo) => { if (isMobile && info.offset.y > 100) setVotingDept(null); }}
                                className={cn(
                                    "relative bg-[#F8FAFC] shadow-2xl overflow-hidden pointer-events-auto flex flex-col",
                                    "w-full h-[85vh] rounded-t-[40px] md:rounded-[48px]",
                                    "md:w-full md:max-w-xl md:h-[650px] md:border md:border-white/20 md:ring-1 md:ring-white/10"
                                )}
                            >
                                <div className="md:hidden absolute top-0 left-0 right-0 h-10 flex justify-center items-center z-50 cursor-grab active:cursor-grabbing touch-none" onPointerDown={(e) => dragControls.start(e)}><div className="w-12 h-1.5 bg-white/20 rounded-full" /></div>
                                <button onClick={() => setVotingDept(null)} className="hidden md:flex absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-50"><X className="w-5 h-5" /></button>

                                <div className={cn("p-6 md:p-8 pb-6 text-white shrink-0 relative overflow-hidden", votingDept === 'FOH' ? 'bg-[#004F71]' : 'bg-[#E51636]')}>
                                    <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none"><Vote className="w-48 h-48 rotate-12" /></div>
                                    <div className="relative z-10 pt-4 md:pt-0">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 backdrop-blur-md mb-2 md:mb-4">
                                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-white">Live Ballot</span>
                                        </div>
                                        <h3 className="text-2xl md:text-4xl font-[1000] uppercase tracking-tight leading-none mb-1">Vote For {votingDept}</h3>
                                        <p className="text-white/70 text-xs md:text-sm font-medium">Select the team member who excelled.</p>
                                    </div>
                                </div>
                                
                                <div className="p-4 md:p-6 bg-white border-b border-slate-100 sticky top-0 z-20 shadow-sm">
                                    <div className="relative group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                                        <input autoFocus={!isMobile} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search candidate..." className="w-full pl-10 md:pl-12 pr-4 py-3 md:py-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl text-sm md:text-base font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-300 transition-all" />
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2 md:space-y-3 custom-scrollbar bg-[#F8FAFC]">
                                    {eligibleCandidates.map(candidate => (
                                        <button 
                                            key={candidate.id}
                                            onClick={() => handleVote(candidate.id, candidate.name, votingDept!)}
                                            className="w-full flex items-center gap-3 md:gap-4 p-2.5 md:p-3 pr-4 rounded-[16px] md:rounded-[24px] bg-white border border-slate-100 hover:border-slate-300 hover:shadow-md transition-all group text-left relative overflow-hidden active:scale-[0.98]"
                                        >
                                            <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-slate-50 flex items-center justify-center font-black text-slate-400 text-xs md:text-sm overflow-hidden shrink-0 border border-slate-100 group-hover:border-slate-200 z-10 relative">
                                                {candidate.image ? <img src={candidate.image} className="w-full h-full object-cover" /> : candidate.name.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0 z-10 relative">
                                                <p className="text-sm md:text-base font-bold text-slate-900 group-hover:text-[#004F71] transition-colors truncate">{candidate.name}</p>
                                                <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate mt-0.5">{candidate.role}</p>
                                            </div>
                                            {candidate.voteCount > 0 && (
                                                <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg z-10 relative">
                                                    <span className="text-xs font-black text-slate-700">{candidate.voteCount}</span>
                                                    <Vote className="w-3 h-3 text-slate-400" />
                                                </div>
                                            )}
                                            <div className={cn("absolute left-0 top-0 bottom-0 opacity-10 transition-all duration-500", votingDept === 'FOH' ? 'bg-[#004F71]' : 'bg-[#E51636]')} style={{ width: `${candidate.votePercent}%` }} />
                                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-[#004F71] group-hover:text-white transition-all shrink-0 z-10 relative">
                                                <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                                            </div>
                                        </button>
                                    ))}
                                    {eligibleCandidates.length === 0 && (
                                        <div className="py-12 text-center text-slate-400 flex flex-col items-center">
                                            <User className="w-12 h-12 mb-3 opacity-20" />
                                            <p className="text-xs font-bold uppercase tracking-widest">No candidates found</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    </ClientPortal>
                )}
            </AnimatePresence>
        </div>
    );
}