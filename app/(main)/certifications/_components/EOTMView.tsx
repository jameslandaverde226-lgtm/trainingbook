"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, Crown, Flame, Coffee, Vote, History, 
  Calendar, ChevronRight, User, Sparkles, Star, Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TeamMember } from "../../calendar/_components/types";
import { format } from "date-fns";
import { useAppStore } from "@/lib/store/useStore";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";

// --- MOCK HISTORY DATA (Replace with Firestore fetch later) ---
const MOCK_HISTORY = [
    { month: "October 2023", foh: { name: "Sarah J.", image: "" }, boh: { name: "Mike R.", image: "" } },
    { month: "September 2023", foh: { name: "Emily W.", image: "" }, boh: { name: "Chef Tony", image: "" } },
    { month: "August 2023", foh: { name: "Jessica L.", image: "" }, boh: { name: "Marcus P.", image: "" } },
];

export default function EOTMView() {
    const { team, currentUser } = useAppStore();
    const [votingDept, setVotingDept] = useState<"FOH" | "BOH" | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // --- LEADERBOARD LOGIC (Mocking vote counts for UI demo) ---
    // In production, fetch 'votes' collection and aggregate here
    const leaders = useMemo(() => {
        const foh = team.filter(m => m.dept === "FOH").slice(0, 1)[0];
        const boh = team.filter(m => m.dept === "BOH").slice(0, 1)[0];
        return { foh, boh };
    }, [team]);

    const handleVote = async (candidateId: string, candidateName: string, dept: string) => {
        const loadToast = toast.loading("Casting Vote...");
        try {
            // Write vote to Firestore
            await addDoc(collection(db, "eotm_votes"), {
                voterId: currentUser?.uid || "anon",
                candidateId,
                candidateName,
                dept,
                month: format(new Date(), "yyyy-MM"),
                timestamp: serverTimestamp()
            });
            toast.success("Vote Recorded", { id: loadToast });
            setVotingDept(null);
        } catch (e) {
            toast.error("Voting Failed", { id: loadToast });
        }
    };

    const eligibleCandidates = useMemo(() => {
        if (!votingDept) return [];
        return team.filter(m => 
            m.dept === votingDept && 
            m.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [team, votingDept, searchQuery]);

    return (
        <div className="space-y-12 animate-fade-in pb-20">
            
            {/* --- HERO: CURRENT MONTH STAGE --- */}
            <section className="relative">
                 {/* Decorative Glows */}
                <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-[#004F71]/20 blur-[100px] rounded-full mix-blend-multiply" />
                <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-[#E51636]/20 blur-[100px] rounded-full mix-blend-multiply" />

                <div className="text-center mb-10 relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full shadow-sm mb-4">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Current Cycle: {format(new Date(), "MMMM yyyy")}
                        </span>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-[1000] text-slate-900 tracking-tighter uppercase">
                        Employee of the Month
                    </h2>
                    <p className="text-slate-400 font-bold text-sm mt-2 max-w-lg mx-auto">
                        Recognizing excellence in service and culinary operations. Cast your vote for this month's champions.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto relative z-10">
                    {/* FOH CARD */}
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-b from-[#004F71] to-[#003b55] rounded-[32px] transform rotate-[-1deg] group-hover:rotate-[-2deg] transition-transform duration-500 opacity-100 shadow-xl shadow-blue-900/20" />
                        <div className="relative bg-white border border-slate-100 rounded-[32px] p-8 h-full flex flex-col items-center text-center shadow-inner overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-blue-50/50 to-transparent" />
                            <div className="w-20 h-20 bg-[#004F71] text-white rounded-3xl flex items-center justify-center shadow-lg mb-6 rotate-3 relative z-10">
                                <Coffee className="w-10 h-10" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-1">Front House</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Service Excellence</p>
                            
                            {/* Current Leader (Mock) */}
                            <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center overflow-hidden">
                                    {leaders.foh?.image ? <img src={leaders.foh.image} className="w-full h-full object-cover" /> : <User className="w-6 h-6 text-slate-300" />}
                                </div>
                                <div className="text-left flex-1">
                                    <span className="text-[9px] font-bold text-[#004F71] uppercase tracking-wider block">Current Leader</span>
                                    <span className="text-sm font-black text-slate-900">{leaders.foh?.name || "TBD"}</span>
                                </div>
                                <Crown className="w-5 h-5 text-amber-400 fill-current animate-pulse" />
                            </div>

                            <button 
                                onClick={() => setVotingDept("FOH")}
                                className="w-full py-4 bg-[#004F71] hover:bg-[#003b55] text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-blue-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Vote className="w-4 h-4" /> Cast Vote
                            </button>
                        </div>
                    </div>

                    {/* BOH CARD */}
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-b from-[#E51636] to-[#c4122d] rounded-[32px] transform rotate-[1deg] group-hover:rotate-[2deg] transition-transform duration-500 opacity-100 shadow-xl shadow-red-900/20" />
                        <div className="relative bg-white border border-slate-100 rounded-[32px] p-8 h-full flex flex-col items-center text-center shadow-inner overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-red-50/50 to-transparent" />
                            <div className="w-20 h-20 bg-[#E51636] text-white rounded-3xl flex items-center justify-center shadow-lg mb-6 -rotate-3 relative z-10">
                                <Flame className="w-10 h-10" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-1">Back House</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Culinary Mastery</p>
                            
                            {/* Current Leader */}
                            <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center overflow-hidden">
                                    {leaders.boh?.image ? <img src={leaders.boh.image} className="w-full h-full object-cover" /> : <User className="w-6 h-6 text-slate-300" />}
                                </div>
                                <div className="text-left flex-1">
                                    <span className="text-[9px] font-bold text-[#E51636] uppercase tracking-wider block">Current Leader</span>
                                    <span className="text-sm font-black text-slate-900">{leaders.boh?.name || "TBD"}</span>
                                </div>
                                <Crown className="w-5 h-5 text-amber-400 fill-current animate-pulse" />
                            </div>

                            <button 
                                onClick={() => setVotingDept("BOH")}
                                className="w-full py-4 bg-[#E51636] hover:bg-[#c4122d] text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-red-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Vote className="w-4 h-4" /> Cast Vote
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- HALL OF FAME TIMELINE --- */}
            <section className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                        <Trophy className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Hall of Fame</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Legacy of Excellence</p>
                    </div>
                </div>

                <div className="space-y-6 relative">
                    {/* Timeline Line */}
                    <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gradient-to-b from-slate-200 via-slate-200 to-transparent z-0" />

                    {MOCK_HISTORY.map((period, idx) => (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            key={period.month} 
                            className="relative z-10 flex items-start gap-6"
                        >
                            {/* Date Bubble */}
                            <div className="w-12 h-12 rounded-full bg-white border-4 border-slate-50 shadow-sm flex items-center justify-center shrink-0">
                                <History className="w-5 h-5 text-slate-300" />
                            </div>

                            {/* Card */}
                            <div className="flex-1 bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform duration-500">
                                    <Star className="w-24 h-24 text-amber-400 fill-current" />
                                </div>
                                
                                <div className="mb-4">
                                    <h4 className="text-lg font-[900] text-slate-900">{period.month}</h4>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                                    {/* FOH WINNER */}
                                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-blue-50/50 border border-blue-100">
                                        <div className="w-10 h-10 rounded-xl bg-[#004F71] text-white flex items-center justify-center font-black text-xs shadow-md">
                                            {period.foh.name.charAt(0)}
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-black text-[#004F71] uppercase tracking-widest block">FOH Winner</span>
                                            <span className="text-sm font-bold text-slate-900">{period.foh.name}</span>
                                        </div>
                                    </div>

                                    {/* BOH WINNER */}
                                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-red-50/50 border border-red-100">
                                        <div className="w-10 h-10 rounded-xl bg-[#E51636] text-white flex items-center justify-center font-black text-xs shadow-md">
                                            {period.boh.name.charAt(0)}
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-black text-[#E51636] uppercase tracking-widest block">BOH Winner</span>
                                            <span className="text-sm font-bold text-slate-900">{period.boh.name}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* --- VOTING MODAL --- */}
            <AnimatePresence>
                {votingDept && (
                    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setVotingDept(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
                        <motion.div 
                            initial={{ y: 100, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 100, scale: 0.95 }}
                            className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[80vh]"
                        >
                            <div className={cn("p-8 pb-6 text-white shrink-0", votingDept === 'FOH' ? 'bg-[#004F71]' : 'bg-[#E51636]')}>
                                <h3 className="text-2xl font-[1000] uppercase tracking-tight">Vote For {votingDept}</h3>
                                <p className="text-white/60 text-sm font-medium">Select the team member who excelled this month.</p>
                            </div>
                            
                            <div className="p-4 border-b border-slate-100 bg-slate-50 sticky top-0">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input 
                                        autoFocus
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search candidate..." 
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm font-bold outline-none focus:ring-2 focus:ring-black/5"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {eligibleCandidates.map(candidate => (
                                    <button 
                                        key={candidate.id}
                                        onClick={() => handleVote(candidate.id, candidate.name, votingDept)}
                                        className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors group border border-transparent hover:border-slate-100 text-left"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-500 text-xs overflow-hidden">
                                            {candidate.image ? <img src={candidate.image} className="w-full h-full object-cover" /> : candidate.name.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-slate-900 group-hover:text-[#004F71] transition-colors">{candidate.name}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">{candidate.role}</p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full border-2 border-slate-100 flex items-center justify-center text-slate-300 group-hover:border-[#004F71] group-hover:bg-[#004F71] group-hover:text-white transition-all">
                                            <Sparkles className="w-4 h-4" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}