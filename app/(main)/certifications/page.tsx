"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { 
  Search, Loader2, Sparkles, X, Layout, Pipette, Check, 
  Trash2, Edit3, User, Users, RefreshCw, Star, Plus, MoreHorizontal, ArrowRight, Shield, Award, Target
} from "lucide-react";
import { cn } from "@/lib/utils";

// Firebase & Store
import { db } from "@/lib/firebase";
import { 
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc,
  arrayUnion, arrayRemove, serverTimestamp, query, orderBy 
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
    count?: number; 
    awardedId?: string; // Specific instance ID if earned
}

// --- SUB-COMPONENT: BADGE LIST ITEM ---
const BadgeListItem = ({ 
    badge, 
    onAction, 
    onEdit, 
    onDelete, 
    mode 
}: { 
    badge: Badge; 
    onAction: (b: Badge) => void; 
    onEdit?: (b: Badge) => void; 
    onDelete?: (id: string) => void;
    mode: 'inventory' | 'earned';
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
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => !isMenuOpen && mode === 'inventory' && onAction(badge)}>
                    <h4 className="text-sm font-[800] text-slate-900 truncate leading-tight">{badge.label}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide truncate mt-0.5">
                        {badge.desc || "Certification Module"}
                    </p>
                </div>

                {/* ACTIONS */}
                <div className="flex items-center gap-2">
                    
                    {/* MODE: EARNED (Show Count or Delete) */}
                    {mode === 'earned' && (
                        <div className="flex items-center gap-2">
                             {badge.count && badge.count > 1 && (
                                <div className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-black shadow-md">
                                    x{badge.count}
                                </div>
                             )}
                             <button 
                                onClick={(e) => { e.stopPropagation(); if(onDelete) onDelete(badge.awardedId || badge.id); }}
                                className="h-8 w-8 rounded-full bg-slate-50 text-slate-300 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* MODE: INVENTORY (Show Add + Menu) */}
                    {mode === 'inventory' && (
                        <div className="flex items-center gap-2">
                            {/* Primary Action: Award */}
                             <button 
                                onClick={() => onAction(badge)}
                                className="h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform hover:bg-slate-800"
                            >
                                <Plus className="w-5 h-5" />
                            </button>

                            {/* Secondary Action: Menu */}
                            <div className="relative">
                                <AnimatePresence mode="wait">
                                    {!isMenuOpen ? (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(true); }}
                                            className="h-10 w-10 rounded-full bg-slate-50 text-slate-400 border border-slate-200 flex items-center justify-center hover:bg-slate-100 active:scale-95 transition-all"
                                        >
                                            <MoreHorizontal className="w-5 h-5" />
                                        </button>
                                    ) : (
                                        <motion.div 
                                            key="menu"
                                            initial={{ opacity: 0, x: 10, scale: 0.9 }}
                                            animate={{ opacity: 1, x: 0, scale: 1 }}
                                            exit={{ opacity: 0, x: 10, scale: 0.9 }}
                                            className="flex items-center gap-2 absolute right-0 top-0 bottom-0 bg-white/80 backdrop-blur-md p-1 rounded-full border border-slate-100 shadow-xl z-20"
                                            style={{ height: '40px', top: '0px' }} 
                                        >
                                            <button onClick={(e) => { e.stopPropagation(); onEdit?.(badge); setIsMenuOpen(false); }} className="h-8 w-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                                            <button onClick={(e) => { e.stopPropagation(); onDelete?.(badge.id); }} className="h-8 w-8 flex items-center justify-center bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                            <div className="w-px h-4 bg-slate-200 mx-0.5" />
                                            <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); }} className="h-8 w-8 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200"><X className="w-3.5 h-3.5" /></button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- RESPONSIVE SHEET FOR MANAGING BADGES ---
const MemberAwardsSheet = ({ 
    member, 
    inventory, 
    onClose, 
    onAward,
    onRemove 
}: { 
    member: any, 
    inventory: any[], 
    onClose: () => void, 
    onAward: (badge: any) => void,
    onRemove: (badgeId: string) => void
}) => {
    const [tab, setTab] = useState<'earned' | 'award'>('earned');
    const memberUniqueBadges = useMemo(() => {
        // Just return raw list for now to allow individual deletion, 
        // or grouped if you want count. Let's use raw list for full control.
        return member.badges || [];
    }, [member.badges]);

    return (
        <ClientPortal>
            <div className="fixed inset-0 z-[200] flex justify-end items-end lg:items-stretch pointer-events-none">
                {/* Backdrop */}
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto" 
                    onClick={onClose} 
                />
                
                {/* Sheet */}
                <motion.div 
                    initial={{ x: "100%", opacity: 0.5 }} 
                    animate={{ x: 0, opacity: 1 }} 
                    exit={{ x: "100%", opacity: 0 }} 
                    transition={{ type: "spring", damping: 30, stiffness: 300 }}
                    className={cn(
                        "pointer-events-auto bg-[#F8FAFC] w-full flex flex-col shadow-2xl relative overflow-hidden",
                        // Mobile Styles (Bottom Sheet)
                        "h-[85vh] rounded-t-[32px] lg:h-full lg:rounded-none lg:rounded-l-[40px] lg:max-w-md"
                    )}
                >
                    {/* Header */}
                    <div className="flex justify-center pt-3 pb-1 shrink-0 bg-white lg:hidden">
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
                    </div>
                    
                    <div className="px-6 py-6 border-b border-slate-100 flex flex-col gap-6 bg-white shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-500 text-sm overflow-hidden shadow-inner">
                                {member.image ? <img src={member.image} className="w-full h-full object-cover" /> : member.name.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-xl font-[1000] text-slate-900 tracking-tight leading-none">{member.name}</h2>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{member.role}</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="h-9 w-9 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center active:scale-95 transition-all text-slate-400 hover:text-red-500 hover:border-red-200"><X className="w-5 h-5" /></button>
                        </div>

                        {/* TABS */}
                        <div className="flex p-1.5 bg-slate-100 rounded-xl">
                            <button 
                                onClick={() => setTab('earned')}
                                className={cn(
                                    "flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                    tab === 'earned' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                Trophy Case
                            </button>
                            <button 
                                onClick={() => setTab('award')}
                                className={cn(
                                    "flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                    tab === 'award' ? "bg-[#004F71] text-white shadow-md" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                Award Badge
                            </button>
                        </div>
                    </div>

                    {/* CONTENT AREA */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-3 pb-20 custom-scrollbar">
                        {tab === 'earned' ? (
                            // EARNED LIST
                            memberUniqueBadges.length > 0 ? (
                                memberUniqueBadges.map((badge: any, i: number) => (
                                    <BadgeListItem 
                                        key={i} // using index as key because IDs might repeat if not unique instance
                                        badge={badge}
                                        mode="earned"
                                        onAction={() => {}} 
                                        onDelete={onRemove}
                                    />
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-300 border-2 border-dashed border-slate-200 rounded-3xl mx-4 bg-slate-50/50">
                                    <Shield className="w-12 h-12 mb-3 opacity-30" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">No Certifications Yet</span>
                                    <button onClick={() => setTab('award')} className="mt-4 text-[10px] font-bold text-[#004F71] underline hover:text-slate-900">Award First Badge</button>
                                </div>
                            )
                        ) : (
                            // INVENTORY LIST
                            inventory.map(badge => (
                                <BadgeListItem 
                                    key={badge.id}
                                    badge={badge}
                                    mode="inventory"
                                    onAction={(b) => { onAward(b); setTab('earned'); }}
                                />
                            ))
                        )}
                    </div>
                </motion.div>
            </div>
        </ClientPortal>
    );
};

// --- HELPER: GROUP BADGES ---
const getUniqueBadges = (badges: any[]) => {
    if (!badges || badges.length === 0) return [];
    const groups = new Map();
    badges.forEach((b: any) => {
        const key = b.id || b.label; 
        if (!groups.has(key)) {
            groups.set(key, { ...b, count: 0 });
        }
        groups.get(key).count += 1;
    });
    return Array.from(groups.values());
};

// --- PAGE CONTROLLER ---
export default function CertificationsPage() {
  const { team, loading, subscribeTeam, updateMemberLocal } = useAppStore();
  
  const [activeView, setActiveView] = useState<"armory" | "eotm">("armory");
  const [isArmoryExpanded, setIsArmoryExpanded] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(0); 

  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredMemberId, setHoveredMemberId] = useState<string | null>(null);
  
  const [isArchitectOpen, setIsArchitectOpen] = useState(false);
  
  // Award Sheet State
  const [selectedMemberForAward, setSelectedMemberForAward] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null); 
  const [customAccolades, setCustomAccolades] = useState<any[]>([]);
  const [badgeDraft, setBadgeDraft] = useState({ 
    label: "", iconId: "Star", hex: "#E51636", desc: "Operational Excellence" 
  });

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

  const activeMember = useMemo(() => 
    team.find(m => m.id === selectedMemberForAward)
  , [team, selectedMemberForAward]);

  const handleMemberClick = (memberId: string) => {
      setSelectedMemberForAward(memberId);
  };

  const awardBadge = async (targetId: string, badge: any) => {
      const member = team.find(m => m.id === targetId);
      if (!member) return;

      const currentBadges = member.badges || [];
      const loadingToast = toast.loading(`Awarding to ${member.name}...`);
      
      try {
        const newBadgeEntry = { 
            ...badge, 
            awardedId: Math.random().toString(36).substr(2, 9), 
            timestamp: new Date().toISOString() 
        };

        const updatedBadges = [...currentBadges, newBadgeEntry];
        updateMemberLocal(targetId, { badges: updatedBadges });

        const memberRef = doc(db, "profileOverrides", targetId); 
        await setDoc(memberRef, {
            badges: arrayUnion(newBadgeEntry), 
            updatedAt: serverTimestamp() 
        }, { merge: true });
        
        toast.success(`${badge.label} Awarded`, { id: loadingToast });
      } catch (e) {
        updateMemberLocal(targetId, { badges: currentBadges });
        toast.error("Failed to award certification", { id: loadingToast });
      }
  };

  const removeBadge = async (badgeId: string) => {
      if(!activeMember) return;
      
      const badgeToRemove = activeMember.badges?.find((b: any) => (b.awardedId === badgeId || b.id === badgeId));
      if (!badgeToRemove) return;

      const loadToast = toast.loading("Revoking Certification...");
      
      try {
          // FireStore arrayRemove needs the EXACT object match. 
          // Since timestamps vary, finding the exact object in the array is safer via logic, 
          // but for atomic update we need the object. 
          // Here we filter locally and set the new array to avoid complexity.
          const updatedBadges = activeMember.badges?.filter((b: any) => (b.awardedId !== badgeId && b.id !== badgeId)) || [];
          
          updateMemberLocal(activeMember.id, { badges: updatedBadges });

          const memberRef = doc(db, "profileOverrides", activeMember.id);
          await setDoc(memberRef, { badges: updatedBadges, updatedAt: serverTimestamp() }, { merge: true });
          
          toast.success("Certification Revoked", { id: loadToast });
      } catch (e) {
          toast.error("Failed to revoke", { id: loadToast });
      }
  };

  // --- DRAG HANDLERS ---
  const handleDragStart = () => {
    setIsDragging(true);
    setIsArmoryExpanded(true); 
  };

  // NEW: Handle Drag for Mobile Hover Calculation
  const handleDrag = (event: any, info: PanInfo) => {
      // Prioritize touch points
      let clientX, clientY;
      if (event.changedTouches && event.changedTouches.length > 0) {
          clientX = event.changedTouches[0].clientX;
          clientY = event.changedTouches[0].clientY;
      } else {
          clientX = event.clientX;
          clientY = event.clientY;
      }

      if (clientX && clientY) {
         const elements = document.elementsFromPoint(clientX, clientY);
         const card = elements.find(el => el.hasAttribute("data-member-id") || el.closest('[data-member-id]'));
         const targetElement = card?.hasAttribute("data-member-id") ? card : card?.closest('[data-member-id]');
         const targetId = targetElement?.getAttribute("data-member-id");
         setHoveredMemberId(targetId || null);
      }
  };

  const handleDragEnd = async (event: any, info: any, badge: any) => {
    setIsDragging(false);
    setHoveredMemberId(null);
    
    let clientX, clientY;
    if (event.changedTouches && event.changedTouches.length > 0) {
        clientX = event.changedTouches[0].clientX;
        clientY = event.changedTouches[0].clientY;
    } else if (event.clientX !== undefined && event.clientY !== undefined) {
        clientX = event.clientX;
        clientY = event.clientY;
    } else {
        clientX = info.point.x;
        clientY = info.point.y;
    }

    const elements = document.elementsFromPoint(clientX, clientY);
    const card = elements.find(el => el.hasAttribute("data-member-id") || el.closest('[data-member-id]'));
    const targetElement = card?.hasAttribute("data-member-id") ? card : card?.closest('[data-member-id]');
    const targetId = targetElement?.getAttribute("data-member-id");
    
    if (targetId) {
        await awardBadge(targetId, badge);
    }
  };

  // --- CRUD HANDLERS ---
  const openForge = (badge?: any) => {
    if (badge) {
        setEditingId(badge.id);
        setBadgeDraft({ label: badge.label, iconId: badge.iconId, hex: badge.hex, desc: badge.desc });
    } else {
        setEditingId(null);
        setBadgeDraft({ label: "", iconId: "Star", hex: "#E51636", desc: "Operational Excellence" });
    }
    setIsArchitectOpen(true);
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

  const requestDeleteBadge = (id: string) => { setDeleteTargetId(id); };

  const confirmDeleteBadge = async () => {
    if (!deleteTargetId) return;
    const loadToast = toast.loading("Decommissioning Module...");
    try {
        await deleteDoc(doc(db, "customAccolades", deleteTargetId));
        toast.success("Module Deleted", { id: loadToast });
        setIsArchitectOpen(false);
    } catch (e) {
        toast.error("Failed to delete", { id: loadToast });
    } finally {
        setDeleteTargetId(null);
    }
  };

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
          onDragStart={handleDragStart}
          onDrag={handleDrag} // Connect new drag handler
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
                                    
                                    // GROUP BADGES FOR CARD DISPLAY
                                    const uniqueBadges = getUniqueBadges(member.badges || []);
                                    const hasBadges = uniqueBadges.length > 0;
                                    
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
                                                
                                                // FIXED: Removed scale-95 to make target larger
                                                isDragging && !isHoveredTarget && "opacity-40"
                                            )}
                                        >
                                            <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", isFOH ? "bg-[#004F71]" : "bg-[#E51636]")} />
                                            
                                            {/* DROPPABLE OVERLAY */}
                                            {isDragging && (
                                                <div className={cn(
                                                    "absolute inset-0 z-20 flex items-center justify-center transition-opacity bg-white/60 backdrop-blur-[1px] pointer-events-none",
                                                    isHoveredTarget ? "opacity-100" : "opacity-0"
                                                )}>
                                                    <div className="px-4 py-2 bg-[#004F71] text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2">
                                                        <Target className="w-4 h-4" /> Drop to Award
                                                    </div>
                                                </div>
                                            )}

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
                                                    {(member.badges?.length || 0) > 0 && (
                                                        <div className="absolute -bottom-1 -right-1 bg-amber-400 text-white text-[8px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                                                            {member.badges?.length}
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
                                                    
                                                    {/* CARD BADGE PREVIEW */}
                                                    <div className="mt-3 flex flex-wrap gap-1.5 min-h-[28px]">
                                                        {hasBadges ? (
                                                            uniqueBadges.slice(0, 4).map((b: any, idx: number) => {
                                                                const Icon = TACTICAL_ICONS.find(i => i.id === b.iconId)?.icon || Star;
                                                                return (
                                                                    <div 
                                                                        key={idx} 
                                                                        className="h-7 px-1.5 rounded-lg bg-white border border-slate-200 flex items-center gap-1 shadow-sm"
                                                                        title={b.label}
                                                                    >
                                                                        <Icon className="w-3.5 h-3.5" style={{ color: b.hex }} />
                                                                        {b.count > 1 && (
                                                                            <span className="text-[8px] font-black text-slate-600 leading-none">x{b.count}</span>
                                                                        )}
                                                                    </div>
                                                                )
                                                            })
                                                        ) : (
                                                            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider py-1.5 flex items-center gap-1">
                                                                <Layout className="w-3 h-3" /> No Certs
                                                            </span>
                                                        )}
                                                        {uniqueBadges.length > 4 && (
                                                            <div className="h-7 px-1.5 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                                                                <span className="text-[8px] font-black text-slate-500">+{uniqueBadges.length - 4}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
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
                onDelete={editingId ? requestDeleteBadge : undefined}
                editingId={editingId}
            />
        )}
      </AnimatePresence>

      {/* --- MEMBER AWARDS SHEET (Responsive: Bottom on Mobile, Side on Desktop) --- */}
      <AnimatePresence>
        {activeMember && (
            <MemberAwardsSheet 
                member={activeMember}
                inventory={customAccolades}
                onClose={() => setSelectedMemberForAward(null)}
                onAward={(badge) => awardBadge(activeMember.id, badge)}
                onRemove={removeBadge}
            />
        )}
      </AnimatePresence>

      {/* --- DELETE MODULE CONFIRMATION --- */}
      <AnimatePresence>
        {deleteTargetId && (
            <ClientPortal>
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                        className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-md"
                        onClick={() => setDeleteTargetId(null)}
                    />
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                        className="relative bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl text-center border border-white/20"
                    >
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-100">
                            <Trash2 className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-xl font-[1000] text-slate-900 uppercase tracking-tight mb-2">Delete Module?</h3>
                        <p className="text-xs font-medium text-slate-500 mb-8 leading-relaxed px-4">
                            This action will permanently remove this certification template from the system.
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setDeleteTargetId(null)} 
                                className="flex-1 py-3.5 bg-slate-100 text-slate-500 font-bold rounded-xl text-[10px] uppercase tracking-wider hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmDeleteBadge} 
                                className="flex-1 py-3.5 bg-[#E51636] text-white font-bold rounded-xl text-[10px] uppercase tracking-wider hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20"
                            >
                                Delete
                            </button>
                        </div>
                    </motion.div>
                </div>
            </ClientPortal>
        )}
      </AnimatePresence>
    </div>
  );
}