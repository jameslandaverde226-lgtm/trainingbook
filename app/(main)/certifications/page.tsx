"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, PanInfo, useDragControls } from "framer-motion";
import { 
  Trophy, Star, Search, Loader2, Plus, Award, 
  Crown, Sparkles, X, Layout, Pipette, Check, 
  Trash2, Edit3, ChevronDown, ChevronUp, GripVertical,
  User, Users, Fingerprint // <--- Added Users here
} from "lucide-react";
import { cn } from "@/lib/utils";

// Firebase & Store
import { db } from "@/lib/firebase";
import { 
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc,
  arrayUnion, serverTimestamp, query, orderBy 
} from "firebase/firestore";
import { useAppStore } from "@/lib/store/useStore";
import { TACTICAL_ICONS } from "@/lib/icon-library";
import toast from "react-hot-toast";
import ClientPortal from "@/components/core/ClientPortal"; 

// Components
import EOTMView from "./_components/EOTMView";

// --- TYPES & CONSTANTS ---
const PRESET_COLORS = [
    { id: "red", hex: "#E51636" }, { id: "navy", hex: "#004F71" },
    { id: "emerald", hex: "#10b981" }, { id: "amber", hex: "#f59e0b" },
    { id: "violet", hex: "#8b5cf6" }, { id: "rose", hex: "#f43f5e" },
    { id: "cyan", hex: "#06b6d4" }, { id: "slate", hex: "#475569" },
];

// --- COLOR PICKER COMPONENT ---
function TacticalColorPicker({ color, onChange }: { color: string, onChange: (h: string) => void }) {
    return (
        <div className="space-y-3 bg-white border border-slate-100 p-4 rounded-[24px] shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="p-1 bg-slate-100 rounded-md text-slate-400"><Pipette className="w-3 h-3" /></div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Color DNA</span>
                </div>
                <div className="h-4 w-4 rounded-full border border-slate-200 shadow-sm" style={{ backgroundColor: color }} />
            </div>
            <input type="range" min="0" max="360" onChange={(e) => onChange(`hsl(${e.target.value}, 85%, 50%)`)} className="w-full h-3 rounded-full appearance-none cursor-pointer border border-slate-200 shadow-inner overflow-hidden opacity-90 hover:opacity-100 transition-opacity" style={{ background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)' }} />
            <div className="flex gap-1.5 justify-between">{PRESET_COLORS.map((c) => (<button key={c.id} onClick={() => onChange(c.hex)} className={cn("h-5 w-5 rounded-full transition-all border border-white shadow-sm hover:scale-110", color === c.hex ? "ring-2 ring-offset-1 ring-slate-900 scale-110" : "opacity-80 hover:opacity-100")} style={{ backgroundColor: c.hex }} />))}</div>
        </div>
    );
}

// --- DRAGGABLE BADGE COMPONENT ---
const DraggableBadge = ({ badge, onDragStart, onDragEnd }: any) => {
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
            whileDrag={{ scale: 1.2, zIndex: 999, cursor: "grabbing", boxShadow: "0 20px 40px -10px rgba(0,0,0,0.3)" }}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className="group relative flex flex-col items-center gap-2 cursor-grab touch-none"
        >
            <div 
                onPointerDown={(e) => controls.start(e)}
                className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 bg-white relative overflow-hidden transition-all group-hover:shadow-md group-hover:border-slate-200"
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


// --- MAIN PAGE ---
export default function CertificationsPage() {
  const { team, loading, subscribeTeam } = useAppStore(); 
  
  // -- VIEW TOGGLE STATE --
  const [activeView, setActiveView] = useState<"armory" | "eotm">("armory");
  const [isArmoryExpanded, setIsArmoryExpanded] = useState(false);

  // -- UI States --
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredMemberId, setHoveredMemberId] = useState<string | null>(null);
  
  // -- CRUD States --
  const [isArchitectOpen, setIsArchitectOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customAccolades, setCustomAccolades] = useState<any[]>([]);
  const [badgeDraft, setBadgeDraft] = useState({ 
    label: "", iconId: "Star", hex: "#E51636", desc: "Operational Excellence" 
  });
  
  // Mobile awarding flow
  const [selectedMemberForAward, setSelectedMemberForAward] = useState<string | null>(null);

  // --- INIT SUBSCRIPTIONS ---
  useEffect(() => {
    // Ensure team data is live
    const unsubTeam = subscribeTeam();

    // Subscribe to badges
    const q = query(collection(db, "customAccolades"), orderBy("createdAt", "desc"));
    const unsubBadges = onSnapshot(q, (snap) => {
        setCustomAccolades(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubTeam(); unsubBadges(); };
  }, [subscribeTeam]);

  const filteredTeam = useMemo(() => 
    team.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
  , [team, searchQuery]);

  // -- CRUD HANDLERS --
  const openForge = (badge?: any) => {
    if (badge) {
        setEditingId(badge.id);
        setBadgeDraft({ label: badge.label, iconId: badge.iconId, hex: badge.hex, desc: badge.desc });
    } else {
        setEditingId(null);
        setBadgeDraft({ label: "", iconId: "Star", hex: "#E51636", desc: "Operational Excellence" });
    }
    setIsArchitectOpen(true);
    setIsArmoryExpanded(false);
  };

  const handleSaveBadge = async () => {
    if (!badgeDraft.label) return toast.error("Label required");
    if (editingId) {
        await updateDoc(doc(db, "customAccolades", editingId), { ...badgeDraft, updatedAt: serverTimestamp() });
        toast.success("Module Re-Configured");
    } else {
        await addDoc(collection(db, "customAccolades"), { ...badgeDraft, createdAt: serverTimestamp() });
        toast.success("Identity Module Forged");
    }
    setIsArchitectOpen(false);
  };

  const handleDeleteBadge = async (id: string) => {
    if (!confirm("Decommission this module?")) return;
    await deleteDoc(doc(db, "customAccolades", id));
    toast.error("Module Decommissioned");
    setIsArchitectOpen(false);
  };

  // -- DRAG ENGINE --
  const handleDragUpdate = (_: any, info: PanInfo) => {
    const target = document.elementFromPoint(info.point.x, info.point.y);
    const card = target?.closest("[data-member-id]");
    if (card) {
        const id = card.getAttribute("data-member-id");
        if (id !== hoveredMemberId) setHoveredMemberId(id);
    } else {
        setHoveredMemberId(null);
    }
  };

  const handleDragEnd = async (_: any, __: any, badge: any) => {
    setIsDragging(false);
    const targetId = hoveredMemberId; 
    setHoveredMemberId(null);

    if (targetId) {
        awardBadge(targetId, badge);
    }
  };
  
  const awardBadge = async (targetId: string, badge: any) => {
      const member = team.find(m => m.id === targetId);
      const loadingToast = toast.loading(`Synchronizing Identity...`);
      try {
        const memberRef = doc(db, "profileOverrides", targetId); 
        await setDoc(memberRef, {
            badges: arrayUnion({ ...badge, awardedId: Math.random().toString(36).substr(2, 9), timestamp: new Date().toISOString() }), 
            updatedAt: serverTimestamp() 
        }, { merge: true });
        toast.success(`${badge.label} Validated`, { id: loadingToast });
        setSelectedMemberForAward(null); 
      } catch (e) {
        toast.error("Authentication Failure", { id: loadingToast });
      }
  };

  const handleMemberClick = (memberId: string) => {
      if (window.innerWidth < 1024) {
          setSelectedMemberForAward(memberId);
          setIsArmoryExpanded(true); // Open panel on mobile to pick badge
      }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] relative font-sans select-none overflow-x-hidden pt-6 pb-40">
      
      {/* --- FLOATING DYNAMIC ISLAND (View Switcher & Armory Toggle) --- */}
      <div className="fixed top-24 left-0 right-0 z-[100] flex justify-center pointer-events-none px-4">
        <motion.div 
            layout
            className={cn(
                "pointer-events-auto bg-white/90 backdrop-blur-xl border border-white/60 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.12)] rounded-[32px] ring-1 ring-black/5 flex flex-col overflow-hidden transition-all duration-300",
                isArmoryExpanded && activeView === 'armory' ? "w-full max-w-2xl" : "w-auto"
            )}
        >
            {/* Header / Tabs */}
            <div className="flex items-center p-1.5 gap-1.5">
                <button 
                    onClick={() => { setActiveView("armory"); setIsArmoryExpanded(false); }}
                    className={cn(
                        "flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                        activeView === "armory" ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100/50"
                    )}
                >
                    <Award className="w-4 h-4" /> Armory
                </button>
                <button 
                    onClick={() => { setActiveView("eotm"); setIsArmoryExpanded(false); }}
                    className={cn(
                        "flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                        activeView === "eotm" ? "bg-amber-400 text-black shadow-md shadow-amber-400/20" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100/50"
                    )}
                >
                    <Trophy className="w-4 h-4" /> Recognition
                </button>
                
                {/* Expand Armory Trigger */}
                {activeView === 'armory' && (
                     <div className="h-6 w-px bg-slate-200 mx-1" />
                )}
                {activeView === 'armory' && (
                    <button 
                        onClick={() => setIsArmoryExpanded(!isArmoryExpanded)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border",
                            isArmoryExpanded ? "bg-slate-100 text-slate-600 border-slate-200" : "bg-white text-slate-500 border-transparent hover:bg-slate-50"
                        )}
                    >
                         {isArmoryExpanded ? "Close Panel" : "Open Inventory"}
                         {isArmoryExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                )}
            </div>

            {/* EXPANDED ARMORY DROPDOWN */}
            <AnimatePresence>
                {isArmoryExpanded && activeView === 'armory' && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-slate-50/50 border-t border-slate-100 overflow-hidden"
                    >
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex flex-col">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Badge Inventory</h4>
                                    <p className="text-[10px] text-slate-400 font-medium">Drag to award</p>
                                </div>
                                <button onClick={() => openForge()} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 transition-all shadow-sm">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                            
                            <div className="flex flex-wrap gap-4 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                                {customAccolades.map(badge => (
                                    <DraggableBadge 
                                        key={badge.id}
                                        badge={badge}
                                        onDragStart={() => { setIsDragging(true); setIsArmoryExpanded(true); }} // Keep open
                                        onDragEnd={(e: any, info: any) => handleDragEnd(e, info, badge)}
                                    />
                                ))}
                                {customAccolades.length === 0 && (
                                    <div className="w-full py-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest border-2 border-dashed border-slate-200 rounded-xl">
                                        Inventory Empty
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 mt-32 md:mt-48">
        
        {/* --- DYNAMIC CONTENT AREA --- */}
        <AnimatePresence mode="wait">
            
            {/* VIEW 1: EOTM (EMPLOYEE OF THE MONTH) */}
            {activeView === 'eotm' ? (
                <motion.div
                    key="eotm"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                >
                    <EOTMView />
                </motion.div>
            ) : (
                /* VIEW 2: CERTIFICATION ROSTER */
                <motion.div 
                    key="armory"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-full"
                >
                    {/* Header */}
                    <div className="mb-8 md:mb-12 text-center md:text-left">
                        <h1 className="text-4xl md:text-5xl font-[1000] text-slate-900 tracking-tighter mb-2">
                             Certifications
                        </h1>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                            Manage & Award Tactical Achievements
                        </p>
                    </div>

                    {/* Search & Grid */}
                    <div className="space-y-6">
                        {/* Search Bar */}
                        <div className="relative max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search roster..."
                                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#004F71]/10 transition-all"
                            />
                        </div>

                        {/* Roster Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-32">
                            {loading ? (
                                <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
                                    <Loader2 className="w-10 h-10 animate-spin mb-4 text-[#004F71]" />
                                    <span className="text-xs font-black uppercase tracking-widest">Loading Roster...</span>
                                </div>
                            ) : filteredTeam.length === 0 ? (
                                <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-[32px] text-slate-400">
                                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p className="text-sm font-bold uppercase tracking-widest">No Members Found</p>
                                </div>
                            ) : (
                                filteredTeam.map((member) => {
                                    const isFOH = member.dept === "FOH";
                                    const isHoveredTarget = hoveredMemberId === member.id || selectedMemberForAward === member.id;
                                    const initials = member.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
                                    const badges = member.badges || [];
                                    const hasBadges = badges.length > 0;
                                    
                                    return (
                                        <motion.div 
                                            key={member.id} 
                                            data-member-id={member.id} 
                                            layout 
                                            onClick={() => handleMemberClick(member.id)} // Fixed function name
                                            className={cn(
                                                "group relative overflow-hidden rounded-[24px] border transition-all duration-300 bg-white cursor-pointer select-none",
                                                isHoveredTarget 
                                                    ? "border-[#E51636] shadow-2xl scale-[1.02] z-30 ring-4 ring-red-50" 
                                                    : "border-slate-100 shadow-sm hover:shadow-lg hover:border-slate-200 hover:-translate-y-1",
                                                isDragging && !isHoveredTarget && "opacity-50 grayscale blur-[1px] scale-95"
                                            )}
                                        >
                                            <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", isFOH ? "bg-[#004F71]" : "bg-[#E51636]")} />
                                            
                                            <div className="p-5 pl-7 flex items-start gap-4">
                                                {/* Avatar */}
                                                <div className="relative shrink-0">
                                                    <div className={cn(
                                                        "h-12 w-12 rounded-2xl flex items-center justify-center text-sm font-black shadow-md relative overflow-hidden bg-slate-100 text-slate-400",
                                                        member.image && "bg-white"
                                                    )}>
                                                        {member.image ? (
                                                            <img src={member.image} className="w-full h-full object-cover" alt="" />
                                                        ) : (
                                                            initials
                                                        )}
                                                    </div>
                                                    {hasBadges && (
                                                        <div className="absolute -bottom-1 -right-1 bg-amber-400 text-white text-[8px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                                                            {badges.length}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-base font-black text-slate-900 truncate leading-tight group-hover:text-[#004F71] transition-colors">{member.name}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{member.role}</span>
                                                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{member.dept}</span>
                                                    </div>
                                                    
                                                    {/* Badge Tray */}
                                                    <div className="mt-3 flex flex-wrap gap-1.5 min-h-[28px]">
                                                        {hasBadges ? (
                                                            badges.slice(0, 4).map((b: any, idx: number) => {
                                                                const Icon = TACTICAL_ICONS.find(i => i.id === b.iconId)?.icon || Star;
                                                                return (
                                                                    <div key={idx} className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shadow-sm" title={b.label}>
                                                                        <Icon className="w-3.5 h-3.5" style={{ color: b.hex }} />
                                                                    </div>
                                                                )
                                                            })
                                                        ) : (
                                                            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider py-1.5 flex items-center gap-1">
                                                                <Layout className="w-3 h-3" /> No Certs
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Drop Overlay */}
                                            {isHoveredTarget && isDragging && (
                                                <div className="absolute inset-0 z-40 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                                                    <div className="px-5 py-2 bg-[#004F71] text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl animate-bounce flex items-center gap-2">
                                                        <Sparkles className="w-3.5 h-3.5" /> Validate
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </div>

      {/* --- ARCHITECT MODAL (FORGE) --- */}
      <AnimatePresence>
        {isArchitectOpen && (
            <ClientPortal>
                <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center md:p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#0F172A]/90 backdrop-blur-xl" onClick={() => setIsArchitectOpen(false)} />
                    <motion.div 
                        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} 
                        className="relative bg-white w-full h-[90vh] md:h-[600px] md:max-w-4xl rounded-t-[40px] md:rounded-[48px] shadow-2xl overflow-hidden flex flex-col md:flex-row md:border-[8px] border-white"
                    >
                        {/* Sidebar (Config) */}
                        <div className="w-full md:w-[340px] border-b md:border-b-0 md:border-r border-slate-100 flex flex-col shrink-0 bg-[#F8FAFC] relative overflow-hidden">
                            <div className="bg-[#E51636] p-6 md:p-8 text-white relative shrink-0 overflow-hidden">
                                <div className="absolute inset-0 opacity-[0.1]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '16px 16px' }} />
                                <div className="relative z-10 flex justify-between items-start">
                                    <div>
                                        <span className="text-[9px] font-black uppercase tracking-[0.3em] opacity-70 mb-1 block">Logic Core</span>
                                        <h2 className="text-3xl md:text-4xl font-[1000] tracking-tighter leading-none text-white">FORGE</h2>
                                    </div>
                                    <button onClick={() => setIsArchitectOpen(false)} className="md:hidden p-2 bg-white/20 rounded-full"><X className="w-5 h-5" /></button>
                                </div>
                            </div>
                            <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
                                <div className="relative group p-4 rounded-[28px] bg-white border border-slate-200 shadow-lg flex items-center gap-4">
                                    <div className="absolute -inset-1 rounded-[32px] blur-lg opacity-20 transition-all duration-700" style={{ backgroundColor: badgeDraft.hex }} />
                                    <div className="relative p-3 rounded-2xl shadow-md border border-slate-100 scale-100" style={{ backgroundColor: `${badgeDraft.hex}15`, color: badgeDraft.hex }}>
                                        {(() => { const Icon = TACTICAL_ICONS.find(i => i.id === badgeDraft.iconId)?.icon || Star; return <Icon className="w-8 h-8" /> })()}
                                    </div>
                                    <div className="relative min-w-0">
                                        <p className="text-lg font-[1000] text-slate-900 leading-none mb-1 truncate">{badgeDraft.label || "Untitled"}</p>
                                        <div className="flex items-center gap-1.5">
                                            <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: badgeDraft.hex }} />
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Preview</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase text-slate-400 px-2 flex items-center gap-1.5"><Fingerprint className="w-3 h-3" /> Identity</label>
                                        <input value={badgeDraft.label} onChange={e => setBadgeDraft({...badgeDraft, label: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#E51636] focus:ring-4 focus:ring-red-500/5 shadow-sm transition-all placeholder:text-slate-300" placeholder="Module Name..." />
                                    </div>
                                    <TacticalColorPicker color={badgeDraft.hex} onChange={(h) => setBadgeDraft({...badgeDraft, hex: h})} />
                                </div>
                            </div>
                            <div className="p-6 pt-0 flex gap-3 safe-area-pb">
                                {editingId && (
                                    <button onClick={() => handleDeleteBadge(editingId)} className="p-4 bg-white border border-slate-200 text-slate-400 hover:text-red-500 rounded-2xl hover:bg-red-50 transition-all active:scale-90 shadow-sm">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                )}
                                <button onClick={handleSaveBadge} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[9px] tracking-[0.3em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all">
                                    {editingId ? "Update" : "Fabricate"}
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col bg-white">
                            <div className="px-6 md:px-8 py-4 md:py-6 flex items-center justify-between border-b border-slate-50 bg-white sticky top-0 z-20">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2 text-[#E51636]">
                                        <Layout className="w-4 h-4" />
                                        <span className="text-[9px] font-black uppercase tracking-[0.3em]">Asset Library</span>
                                    </div>
                                    <h3 className="text-xl md:text-2xl font-[1000] text-slate-900 tracking-tighter leading-none">Tactical Icons</h3>
                                </div>
                                <button onClick={() => setIsArchitectOpen(false)} className="hidden md:block p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-[#E51636] hover:text-white transition-all active:scale-90 border border-slate-100"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 space-y-8 md:space-y-10 pb-20">
                                {["Achievement", "Hospitality", "BOH", "Operational", "Creative"].map((cat) => (
                                    <div key={cat} className="space-y-4">
                                        <div className="flex items-center gap-4 pl-1">
                                            <span className="text-[10px] font-black uppercase text-slate-300 tracking-[0.4em] whitespace-nowrap">{cat} Sector</span>
                                            <div className="h-px w-full bg-slate-100" />
                                        </div>
                                        <div className="grid grid-cols-5 md:grid-cols-6 gap-3">
                                            {TACTICAL_ICONS.filter(i => i.category === cat).map((item) => (
                                                <button 
                                                    key={item.id} 
                                                    onClick={() => setBadgeDraft({...badgeDraft, iconId: item.id})} 
                                                    className={cn(
                                                        "aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-300 group relative", 
                                                        badgeDraft.iconId === item.id 
                                                            ? "bg-slate-900 text-white shadow-xl scale-110 z-10" 
                                                            : "bg-slate-50 text-slate-400 hover:bg-white hover:text-slate-900 hover:shadow-md border border-transparent hover:border-slate-100"
                                                    )}
                                                >
                                                    <item.icon className="w-5 h-5 md:w-6 md:h-6 group-hover:rotate-6 transition-transform" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </ClientPortal>
        )}
      </AnimatePresence>

    </div>
  );
}