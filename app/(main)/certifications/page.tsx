// --- FILE: ./app/(main)/certifications/page.tsx ---
"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { 
  Search, Loader2, Sparkles, X, Layout, Pipette, Check, 
  Trash2, Edit3, User, Users, RefreshCw, Star, Plus, MoreHorizontal, ArrowRight
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
import ForgeModal from "./_components/ForgeModal"; 
import CertificationsDynamicIsland from "./_components/CertificationsDynamicIsland";

// --- TYPES ---
interface Badge {
    id: string;
    label: string;
    desc?: string;
    hex: string;
    iconId: string;
}

// --- SUB-COMPONENT: BADGE LIST ITEM (Beautiful & Interactive) ---
const BadgeListItem = ({ 
    badge, 
    onAward, 
    onEdit, 
    onDelete, 
    isSelectionMode 
}: { 
    badge: Badge; 
    onAward: (b: Badge) => void; 
    onEdit: (b: Badge) => void; 
    onDelete: (id: string) => void;
    isSelectionMode: boolean; // True if we are picking for a user
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const IconComp = TACTICAL_ICONS.find(i => i.id === badge.iconId)?.icon || Star;

    return (
        <div className="relative overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:shadow-md hover:border-slate-200">
            {/* Ambient Background Tint */}
            <div 
                className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                style={{ backgroundColor: badge.hex }} 
            />
            
            {/* Strip on left */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: badge.hex }} />

            <div className="relative z-10 flex items-center p-4 gap-4">
                {/* ICON BOX */}
                <div 
                    className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 bg-white shrink-0 relative overflow-hidden"
                >
                    <div className="absolute inset-0 opacity-10" style={{ backgroundColor: badge.hex }} />
                    <IconComp className="w-6 h-6" style={{ color: badge.hex }} />
                </div>

                {/* CONTENT */}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => !isMenuOpen && onAward(badge)}>
                    <h4 className="text-sm font-[800] text-slate-900 truncate leading-tight">{badge.label}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide truncate mt-0.5">
                        {badge.desc || "Certification Module"}
                    </p>
                </div>

                {/* ACTIONS */}
                <div className="flex items-center gap-2">
                    {/* If menu is closed, show Award Button (if in selection mode) or Menu Trigger */}
                    <AnimatePresence mode="wait" initial={false}>
                        {!isMenuOpen ? (
                            <motion.div 
                                key="default"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="flex items-center gap-2"
                            >
                                {isSelectionMode && (
                                    <button 
                                        onClick={() => onAward(badge)}
                                        className="h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform hover:bg-slate-800"
                                    >
                                        <ArrowRight className="w-5 h-5" />
                                    </button>
                                )}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setIsMenuOpen(true); }}
                                    className="h-10 w-10 rounded-full bg-slate-50 text-slate-400 border border-slate-200 flex items-center justify-center hover:bg-slate-100 active:scale-95 transition-all"
                                >
                                    <MoreHorizontal className="w-5 h-5" />
                                </button>
                            </motion.div>
                        ) : (
                            /* EXPANDED MENU */
                            <motion.div 
                                key="menu"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="flex items-center gap-2 bg-white/80 backdrop-blur-md p-1 rounded-full border border-slate-100 shadow-lg absolute right-3 z-20"
                            >
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onEdit(badge); setIsMenuOpen(false); }}
                                    className="p-2.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                                >
                                    <Edit3 className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onDelete(badge.id); }}
                                    className="p-2.5 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <div className="w-px h-6 bg-slate-200 mx-1" />
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); }}
                                    className="p-2.5 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

// --- PAGE CONTROLLER ---
export default function CertificationsPage() {
  const { team, loading, subscribeTeam, updateMemberLocal } = useAppStore(); // Ensure updateMemberLocal is imported
  
  // -- VIEW STATES --
  const [activeView, setActiveView] = useState<"armory" | "eotm">("armory");
  const [isArmoryExpanded, setIsArmoryExpanded] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(0); 

  // -- FILTER & DRAG STATES --
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredMemberId, setHoveredMemberId] = useState<string | null>(null);
  
  // -- MODAL STATES --
  const [isArchitectOpen, setIsArchitectOpen] = useState(false);
  const [isMobileArmoryOpen, setIsMobileArmoryOpen] = useState(false); 
  const [selectedMemberForAward, setSelectedMemberForAward] = useState<string | null>(null);
  
  // -- DATA STATES (BADGES) --
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customAccolades, setCustomAccolades] = useState<any[]>([]);
  const [badgeDraft, setBadgeDraft] = useState({ 
    label: "", iconId: "Star", hex: "#E51636", desc: "Operational Excellence" 
  });

  // --- 1. DATA SUBSCRIPTION ---
  useEffect(() => {
    const unsubTeam = subscribeTeam();
    const q = query(collection(db, "customAccolades"), orderBy("createdAt", "desc"));
    const unsubBadges = onSnapshot(q, (snap) => {
        setCustomAccolades(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubTeam(); unsubBadges(); };
  }, [subscribeTeam, forceRefresh]);

  const filteredTeam = useMemo(() => 
    team.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
  , [team, searchQuery]);

  // --- 2. HANDLERS ---

  const handleMemberClick = (memberId: string) => {
      // On mobile, tap to select member then open armory
      // On desktop, typically we drag badges, but we can also support click-to-open if needed.
      if (window.innerWidth < 1024) {
          setSelectedMemberForAward(memberId);
          setIsMobileArmoryOpen(true);
      }
  };

  const awardBadge = async (targetId: string, badge: any) => {
      const member = team.find(m => m.id === targetId);
      if (!member) return;

      // 1. DEDUPLICATION CHECK
      // Check if user already has a badge with this ID (assuming badge.id is the template ID)
      const currentBadges = member.badges || [];
      const alreadyHas = currentBadges.some((b: any) => b.id === badge.id);

      if (alreadyHas) {
          toast.error(`${member.name} already has this certification.`);
          return;
      }

      const loadingToast = toast.loading(`Awarding to ${member.name}...`);
      
      try {
        // Create the new badge object with a unique instance ID and timestamp
        const newBadgeEntry = { 
            ...badge, 
            awardedId: Math.random().toString(36).substr(2, 9), 
            timestamp: new Date().toISOString() 
        };

        const updatedBadges = [...currentBadges, newBadgeEntry];

        // 2. OPTIMISTIC UPDATE (Instant UI Refresh)
        updateMemberLocal(targetId, { badges: updatedBadges });

        // 3. FIREBASE WRITE
        const memberRef = doc(db, "profileOverrides", targetId); 
        await setDoc(memberRef, {
            badges: arrayUnion(newBadgeEntry), 
            updatedAt: serverTimestamp() 
        }, { merge: true });
        
        toast.success(`${badge.label} Awarded`, { id: loadingToast });
        
        // If on mobile (sheet is open), close it for better flow
        if (window.innerWidth < 1024) {
            setSelectedMemberForAward(null);
            setIsMobileArmoryOpen(false); 
        }
      } catch (e) {
        // Revert on failure
        updateMemberLocal(targetId, { badges: currentBadges });
        toast.error("Failed to award certification", { id: loadingToast });
      }
  };

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
    if (targetId) awardBadge(targetId, badge);
  };

  // CRUD Handlers
  const openForge = (badge?: any) => {
    if (badge) {
        setEditingId(badge.id);
        setBadgeDraft({ label: badge.label, iconId: badge.iconId, hex: badge.hex, desc: badge.desc });
    } else {
        setEditingId(null);
        setBadgeDraft({ label: "", iconId: "Star", hex: "#E51636", desc: "Operational Excellence" });
    }
    setIsArchitectOpen(true);
    // Keep mobile sheet open? No, Forge is a modal on top.
  };

  const handleSaveBadge = async () => {
    if (!badgeDraft.label) return toast.error("Label required");
    if (editingId) {
        await updateDoc(doc(db, "customAccolades", editingId), { ...badgeDraft, updatedAt: serverTimestamp() });
        toast.success("Module Updated");
    } else {
        await addDoc(collection(db, "customAccolades"), { ...badgeDraft, createdAt: serverTimestamp() });
        toast.success("New Module Created");
    }
    setIsArchitectOpen(false);
  };

  const handleDeleteBadge = async (id: string) => {
    if (!confirm("Permanently delete this certification template?")) return;
    await deleteDoc(doc(db, "customAccolades", id));
    toast.success("Module Deleted");
    setIsArchitectOpen(false); // If open in forge
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-[#F8FAFC] relative font-sans select-none overflow-x-hidden pt-6 pb-40">
      
      {/* --- DYNAMIC ISLAND --- */}
      <CertificationsDynamicIsland 
          activeView={activeView}
          setActiveView={setActiveView}
          isExpanded={isArmoryExpanded}
          setIsExpanded={setIsArmoryExpanded}
          badges={customAccolades}
          onOpenForge={() => openForge()}
          onDragStart={() => { setIsDragging(true); setIsArmoryExpanded(true); }}
          onDragEnd={handleDragEnd}
      />

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 mt-32 md:mt-48">
        <AnimatePresence mode="wait">
            
            {/* VIEW 1: EOTM */}
            {activeView === 'eotm' ? (
                <motion.div
                    key="eotm"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-full"
                >
                    <EOTMView />
                </motion.div>
            ) : (
                /* VIEW 2: ROSTER */
                <motion.div 
                    key="armory"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-full"
                >
                    <div className="mb-8 md:mb-12 text-center md:text-left">
                        <h1 className="text-4xl md:text-5xl font-[1000] text-slate-900 tracking-tighter mb-2">
                             Certifications
                        </h1>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                            Manage & Award Tactical Achievements
                        </p>
                    </div>

                    <div className="space-y-6">
                        {/* SEARCH BAR */}
                        <div className="flex items-center gap-4 mb-6">
                            <div className="relative max-w-md w-full">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search roster..."
                                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#004F71]/10 transition-all"
                                />
                            </div>
                            <button onClick={() => setForceRefresh(p => p + 1)} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all shadow-sm">
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>

                        {/* ROSTER GRID */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-32">
                            {loading && team.length === 0 ? (
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
                                            onClick={() => handleMemberClick(member.id)}
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

      {/* --- FORGE MODAL (ARCHITECT) --- */}
      <AnimatePresence>
        {isArchitectOpen && (
            <ForgeModal 
                isOpen={isArchitectOpen}
                onClose={() => setIsArchitectOpen(false)}
                draft={badgeDraft}
                setDraft={setBadgeDraft}
                onSave={handleSaveBadge}
                onDelete={editingId ? handleDeleteBadge : undefined}
                editingId={editingId}
            />
        )}
      </AnimatePresence>

      {/* --- MOBILE ARMORY SHEET (UPDATED UI) --- */}
      <AnimatePresence>
        {isMobileArmoryOpen && (
             <ClientPortal>
                <div className="fixed inset-0 z-[200] lg:hidden flex items-end justify-center pointer-events-none">
                     <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto" 
                        onClick={() => { setIsMobileArmoryOpen(false); setSelectedMemberForAward(null); }} 
                     />
                     
                     <motion.div 
                        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} 
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="pointer-events-auto bg-[#F8FAFC] w-full h-[85vh] rounded-t-[32px] shadow-2xl relative flex flex-col overflow-hidden"
                     >
                         {/* Header */}
                         <div className="flex justify-center pt-3 pb-1 shrink-0 bg-white"><div className="w-12 h-1.5 bg-slate-200 rounded-full" /></div>
                         <div className="px-6 pb-4 pt-2 border-b border-slate-100 flex justify-between items-start bg-white shrink-0">
                             <div>
                                 <h2 className="text-xl font-[1000] text-slate-900 tracking-tight leading-none mb-1">
                                    {selectedMemberForAward ? "Award Badge" : "Armory"}
                                 </h2>
                                 {selectedMemberForAward && (
                                     <div className="flex items-center gap-1.5">
                                         <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">TO:</span>
                                         <span className="px-2 py-0.5 bg-[#004F71]/10 text-[#004F71] rounded-md text-[9px] font-black uppercase tracking-wider">
                                            {team.find(m => m.id === selectedMemberForAward)?.name}
                                         </span>
                                     </div>
                                 )}
                             </div>
                             <div className="flex gap-2">
                                <button onClick={() => openForge()} className="h-9 w-9 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center active:scale-95 transition-all text-slate-400 hover:text-[#004F71] hover:border-blue-200 shadow-sm"><Plus className="w-5 h-5" /></button>
                                <button onClick={() => { setIsMobileArmoryOpen(false); setSelectedMemberForAward(null); }} className="h-9 w-9 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center active:scale-95 transition-all text-slate-400 hover:text-red-500 hover:border-red-200 shadow-sm"><X className="w-5 h-5" /></button>
                             </div>
                         </div>

                         {/* CONTENT AREA */}
                         <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20 custom-scrollbar">
                             {customAccolades.map(badge => (
                                 <BadgeListItem 
                                     key={badge.id}
                                     badge={badge}
                                     isSelectionMode={!!selectedMemberForAward}
                                     onAward={(b) => selectedMemberForAward ? awardBadge(selectedMemberForAward, b) : openForge(b)}
                                     onEdit={() => openForge(badge)}
                                     onDelete={() => handleDeleteBadge(badge.id)}
                                 />
                             ))}
                             
                             {/* Empty State */}
                             {customAccolades.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-300 border-2 border-dashed border-slate-200 rounded-3xl mx-4">
                                    <Sparkles className="w-10 h-10 mb-2 opacity-50" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Inventory Empty</span>
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