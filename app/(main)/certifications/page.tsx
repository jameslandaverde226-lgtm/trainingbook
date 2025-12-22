"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { 
  Trophy, Star, Target, Zap, ShieldCheck, Search, Loader2, 
  Plus, Award, Heart, Medal, Activity, Users, Clock, Crown, 
  Fingerprint, Crosshair, Rocket, Flame, Coffee, GripVertical, 
  Sparkles, Shield, X, Palette, Layout, Settings, Pipette, 
  Check, Trash2, Edit3, Save, ChevronRight
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
import ClientPortal from "@/components/core/ClientPortal"; // Added Import

// Components
import { Badge } from "../team/_components/Badge";

const PRESET_COLORS = [
    { id: "red", hex: "#E51636" }, { id: "navy", hex: "#004F71" },
    { id: "emerald", hex: "#10b981" }, { id: "amber", hex: "#f59e0b" },
    { id: "violet", hex: "#8b5cf6" }, { id: "rose", hex: "#f43f5e" },
    { id: "cyan", hex: "#06b6d4" }, { id: "slate", hex: "#475569" },
];

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

export default function CertificationsPage() {
  const { team, loading } = useAppStore(); // Removed subscription logic
  
  // -- UI States --
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredMemberId, setHoveredMemberId] = useState<string | null>(null);
  const [isArchitectOpen, setIsArchitectOpen] = useState(false);
  const [isMobileArmoryOpen, setIsMobileArmoryOpen] = useState(false); // Mobile Armory State
  
  // -- CRUD States --
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customAccolades, setCustomAccolades] = useState<any[]>([]);
  const [badgeDraft, setBadgeDraft] = useState({ 
    label: "", iconId: "Star", hex: "#E51636", desc: "Operational Excellence" 
  });
  
  // New state for mobile awarding flow
  const [selectedMemberForAward, setSelectedMemberForAward] = useState<string | null>(null);

  useEffect(() => {
    // Only subscribe to custom accolades locally since they are specific to this page
    const q = query(collection(db, "customAccolades"), orderBy("createdAt", "desc"));
    const unsubBadges = onSnapshot(q, (snap) => {
        setCustomAccolades(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubBadges();
  }, []);

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
    setIsMobileArmoryOpen(false); // Close mobile sheet if open
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

  // -- DRAG ENGINE (Desktop) --
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
  
  // -- AWARD LOGIC (Shared) --
  const awardBadge = async (targetId: string, badge: any) => {
      const member = team.find(m => m.id === targetId);
      const loadingToast = toast.loading(`Synchronizing Identity...`);
      try {
        const memberRef = doc(db, "profileOverrides", targetId); 
        await setDoc(memberRef, {
            badges: arrayUnion({ ...badge, awardedId: Math.random().toString(36).substr(2, 9), timestamp: new Date().toISOString() }), 
            updatedAt: serverTimestamp() 
        }, { merge: true });
        toast.success(`${badge.label} Validated for ${member?.name}`, { id: loadingToast });
        setSelectedMemberForAward(null); // Close mobile selection if active
        setIsMobileArmoryOpen(false); // Close sheet
      } catch (e) {
        toast.error("Authentication Failure", { id: loadingToast });
      }
  };

  // -- MOBILE CLICK HANDLER --
  const handleMobileMemberClick = (memberId: string) => {
      // Only on mobile do we want clicking a member to open the award sheet
      if (window.innerWidth < 1024) {
          setSelectedMemberForAward(memberId);
          setIsMobileArmoryOpen(true);
      }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] relative font-sans select-none overflow-x-hidden pt-6 pb-32 md:pb-0">
      
      <div className="max-w-[1750px] mx-auto flex flex-col lg:flex-row gap-8 px-4 md:px-6">
        
        {/* --- MAIN ROSTER --- */}
        {/* Removed huge padding-right on mobile */}
        <div className="flex-1 w-full lg:pr-[300px]">
          <div className="mb-6 md:mb-8 space-y-2 mt-12 md:mt-0">
              <div className="flex items-center gap-3">
                 <div className="w-1.5 h-6 bg-[#E51636] rounded-full shadow-[0_0_15px_#e51636]" />
                 <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Validated Roster</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-[1000] text-slate-900 tracking-tighter leading-none">Certifications</h1>
              <p className="md:hidden text-xs font-bold text-slate-400">Tap a member to award a certification.</p>
          </div>

          <div className="space-y-3 pb-20 md:pb-40">
            {loading && team.length === 0 ? (
                <div className="flex justify-center py-40"><Loader2 className="animate-spin text-[#E51636] w-12 h-12" /></div>
            ) : (
                <AnimatePresence mode="popLayout">
                    {filteredTeam.map((member) => {
                        const isFOH = member.dept === "FOH";
                        const isHoveredTarget = hoveredMemberId === member.id || selectedMemberForAward === member.id;
                        const initials = member.name.split(' ').map(n => n[0]).join('').toUpperCase();
                        
                        return (
                            <motion.div 
                                key={member.id} 
                                data-member-id={member.id} 
                                layout 
                                onClick={() => handleMobileMemberClick(member.id)}
                                className={cn(
                                    "group relative overflow-hidden rounded-[24px] border transition-all duration-300 active:scale-95 md:active:scale-100 cursor-pointer lg:cursor-default",
                                    isHoveredTarget 
                                        ? "border-[#E51636] bg-white shadow-xl scale-[1.01] z-30 ring-4 ring-red-50" 
                                        : "bg-white border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-slate-200",
                                    isDragging && !isHoveredTarget && "opacity-40 grayscale blur-[1px] scale-98"
                                )}
                            >
                                {/* Subtle Department Tint */}
                                <div className={cn(
                                    "absolute left-0 top-0 bottom-0 w-1 transition-colors z-0",
                                    isFOH ? "bg-[#004F71]" : "bg-[#E51636]"
                                )} />
                                
                                <div className="flex items-start p-4 pl-6 relative z-10 gap-4 md:gap-6">
                                    {/* COMPACT AVATAR */}
                                    <div className="relative shrink-0 pt-1">
                                        <div className={cn(
                                            "h-10 w-10 md:h-12 md:w-12 rounded-2xl flex items-center justify-center text-sm md:text-lg font-black shadow-md transition-all duration-500 relative overflow-hidden group-hover:scale-105",
                                            isFOH ? "bg-[#004F71] text-white" : "bg-[#E51636] text-white",
                                            isHoveredTarget && "rotate-[-12deg] scale-110"
                                        )}>
                                            <span className="relative z-10">{initials}</span>
                                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-50" />
                                        </div>
                                    </div>

                                    {/* INFO SECTION */}
                                    <div className="flex-1 min-w-0 flex flex-col gap-2 md:gap-3">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <h3 className="text-base md:text-lg font-[900] text-slate-900 tracking-tight leading-none group-hover:text-[#004F71] transition-colors">{member.name}</h3>
                                                <div className="flex items-center gap-2">
                                                    <span className={cn("text-[7px] md:text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider border", isFOH ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-red-50 text-red-700 border-red-100")}>{member.dept}</span>
                                                    <span className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-wider">{member.role}</span>
                                                </div>
                                            </div>
                                            
                                            {/* Count Indicator */}
                                            {member.badges?.length > 0 && (
                                                <div className="px-2 py-1 bg-slate-50 border border-slate-100 rounded-full text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest shadow-sm">
                                                    {member.badges.length} <span className="hidden md:inline">Certified</span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* ASSET TRAY */}
                                        <div className="bg-slate-50/50 rounded-[16px] border border-slate-100/50 shadow-inner p-2 md:p-2.5 min-h-[44px] md:min-h-[52px]">
                                            {member.badges?.length > 0 ? (
                                                <div className="flex flex-wrap gap-1.5 md:gap-2">
                                                    {member.badges.map((b: any) => {
                                                        const Icon = TACTICAL_ICONS.find(i => i.id === b.iconId)?.icon || Award;
                                                        return (
                                                            <motion.div 
                                                                initial={{ scale: 0 }} 
                                                                animate={{ scale: 1 }} 
                                                                key={b.awardedId || Math.random()} 
                                                                className="relative group/badge z-10 hover:z-50 transition-all"
                                                            >
                                                                <div 
                                                                    className="h-7 w-7 md:h-8 md:w-8 rounded-lg flex items-center justify-center shadow-sm border border-white bg-white hover:scale-110 hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden"
                                                                >
                                                                    <div className="absolute inset-0 opacity-10" style={{ backgroundColor: b.hex }} />
                                                                    <Icon className="w-3.5 h-3.5 md:w-4 md:h-4 relative z-10" style={{ color: b.hex }} />
                                                                </div>
                                                                {/* Tooltip hidden on mobile to prevent clutter */}
                                                                <div className="hidden md:flex absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[#0F172A] text-white text-[9px] font-bold uppercase rounded-lg opacity-0 group-hover/badge:opacity-100 transition-all whitespace-nowrap pointer-events-none shadow-xl z-50 items-center gap-2 transform origin-bottom scale-95 group-hover/badge:scale-100">
                                                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: b.hex }} />
                                                                    {b.label}
                                                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#0F172A] border-b border-r border-[#E51636]/20 rotate-45" />
                                                                </div>
                                                            </motion.div>
                                                        )
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center h-full gap-2 opacity-40 py-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">No Certifications</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Overlay only for drag hover on desktop */}
                                {isHoveredTarget && isDragging && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-[2px] z-20">
                                        <div className="px-6 py-2.5 bg-[#E51636] text-white rounded-full font-[900] text-[10px] uppercase tracking-[0.25em] shadow-xl flex items-center gap-2 animate-bounce border-2 border-white/20">
                                            <Sparkles className="w-3.5 h-3.5 fill-current" /> 
                                            Validate Module
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            )}
          </div>
        </div>

        {/* --- DESKTOP ARMORY SIDEBAR (Hidden on Mobile) --- */}
        <aside className="hidden lg:block fixed top-28 right-8 bottom-8 w-[280px] z-[40]">
            <div className="h-full bg-[#F8FAFC]/90 backdrop-blur-3xl border border-white/80 rounded-[40px] shadow-[0_20px_60px_-12px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden ring-1 ring-white/60 relative">
                
                <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />

                <div className="p-6 pb-2 relative z-10 shrink-0">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-slate-900 text-white rounded-lg shadow-lg">
                                <Trophy className="w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-[1000] text-slate-900 uppercase tracking-tighter leading-none">Armory</h2>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Active</span>
                                </div>
                            </div>
                        </div>
                        <div className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[8px] font-black text-slate-400 uppercase tracking-widest">
                            v4.2
                        </div>
                    </div>

                    <button 
                        onClick={() => openForge()} 
                        className="group w-full relative overflow-hidden rounded-[20px] bg-slate-900 text-white p-0.5 shadow-xl shadow-slate-900/10 transition-all hover:scale-[1.02] active:scale-95"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-900" />
                        <div className="relative flex items-center justify-between p-4">
                            <div className="flex flex-col items-start">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Create</span>
                                <span className="text-sm font-bold">New Module</span>
                            </div>
                            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 group-hover:bg-white group-hover:text-slate-900 transition-colors">
                                <Plus className="w-4 h-4" />
                            </div>
                        </div>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-2 space-y-2 relative z-10">
                    <div className="flex items-center justify-between px-1 mb-1">
                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em]">Inventory</span>
                        <span className="text-[8px] font-bold text-slate-300">{customAccolades.length}</span>
                    </div>

                    <div className="space-y-2 pb-20">
                        {customAccolades.map(badge => {
                            const IconComp = TACTICAL_ICONS.find(i => i.id === badge.iconId)?.icon || Star;
                            return (
                                <motion.div 
                                    key={badge.id} 
                                    drag dragSnapToOrigin dragElastic={0.05} 
                                    onDragStart={() => setIsDragging(true)} 
                                    onDrag={(e, info) => handleDragUpdate(e, info)} 
                                    onDragEnd={(e, info) => handleDragEnd(e, info, badge)} 
                                    whileHover={{ scale: 1.02, x: 2 }} 
                                    whileDrag={{ scale: 1.1, zIndex: 1000, rotate: -3, pointerEvents: 'none', boxShadow: "0 20px 40px -10px rgba(0,0,0,0.2)" }} 
                                    className="group relative bg-white border border-slate-100 p-2.5 rounded-[18px] flex items-center gap-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all hover:border-slate-200"
                                >
                                    <div className="h-10 w-10 rounded-xl flex items-center justify-center shadow-inner relative overflow-hidden shrink-0" style={{ backgroundColor: `${badge.hex}10` }}>
                                        <IconComp className="w-5 h-5 relative z-10 transition-transform group-hover:scale-110" style={{ color: badge.hex }} />
                                    </div>

                                    <div className="min-w-0 flex-1 py-0.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-xs font-bold text-slate-700 leading-none truncate group-hover:text-slate-900 transition-colors">{badge.label}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: badge.hex }} />
                                            <span className="text-[7px] font-mono text-slate-400 uppercase tracking-wider truncate">
                                                {badge.hex}
                                            </span>
                                        </div>
                                    </div>

                                    <button onClick={(e) => { e.stopPropagation(); openForge(badge); }} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-300 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100">
                                        <Edit3 className="w-3 h-3" />
                                    </button>
                                    
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-slate-100 rounded-l-full group-hover:bg-slate-200 transition-colors" />
                                </motion.div>
                            )
                        })}
                    </div>
                </div>
                
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#F8FAFC] to-transparent pointer-events-none z-20" />
            </div>
        </aside>
      </div>

      {/* --- MOBILE FAB (Open Armory Sheet) --- */}
      <button 
        onClick={() => setIsMobileArmoryOpen(true)}
        className="lg:hidden fixed bottom-28 right-6 w-14 h-14 bg-[#0F172A] text-white rounded-full shadow-[0_10px_30px_-10px_rgba(15,23,42,0.5)] flex items-center justify-center z-50 active:scale-90 transition-transform border-4 border-white"
      >
        <Trophy className="w-6 h-6" />
      </button>

      {/* --- MOBILE ARMORY SHEET --- */}
      <AnimatePresence>
        {isMobileArmoryOpen && (
             <ClientPortal>
                <div className="fixed inset-0 z-[200] lg:hidden flex items-end justify-center pointer-events-none">
                     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto" onClick={() => { setIsMobileArmoryOpen(false); setSelectedMemberForAward(null); }} />
                     
                     <motion.div 
                        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} 
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="pointer-events-auto bg-[#F8FAFC] w-full h-[75vh] rounded-t-[32px] shadow-2xl relative flex flex-col overflow-hidden"
                     >
                         <div className="flex justify-center pt-3 pb-1 shrink-0"><div className="w-12 h-1.5 bg-slate-300 rounded-full" /></div>
                         <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white shrink-0">
                             <div className="flex flex-col">
                                 <h2 className="text-lg font-black text-slate-900">{selectedMemberForAward ? "Award Badge" : "Armory"}</h2>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                     {selectedMemberForAward 
                                        ? `To: ${team.find(m => m.id === selectedMemberForAward)?.name}` 
                                        : "Manage Certifications"}
                                 </p>
                             </div>
                             <div className="flex gap-2">
                                <button onClick={() => openForge()} className="p-2.5 bg-slate-100 rounded-full active:scale-95 transition-all text-slate-600"><Plus className="w-5 h-5" /></button>
                                <button onClick={() => { setIsMobileArmoryOpen(false); setSelectedMemberForAward(null); }} className="p-2.5 bg-slate-100 rounded-full active:scale-95 transition-all text-slate-600"><X className="w-5 h-5" /></button>
                             </div>
                         </div>

                         <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
                             {customAccolades.map(badge => {
                                 const IconComp = TACTICAL_ICONS.find(i => i.id === badge.iconId)?.icon || Star;
                                 return (
                                     <div 
                                        key={badge.id}
                                        onClick={() => {
                                            if (selectedMemberForAward) {
                                                awardBadge(selectedMemberForAward, badge);
                                            } else {
                                                openForge(badge);
                                            }
                                        }}
                                        className="bg-white p-4 rounded-[20px] border border-slate-100 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-transform"
                                     >
                                        <div className="h-12 w-12 rounded-xl flex items-center justify-center shadow-inner relative overflow-hidden shrink-0" style={{ backgroundColor: `${badge.hex}10` }}>
                                            <IconComp className="w-6 h-6 relative z-10" style={{ color: badge.hex }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-900">{badge.label}</p>
                                            <p className="text-[10px] text-slate-400 font-medium truncate">{badge.desc || "No description"}</p>
                                        </div>
                                        <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                                            {selectedMemberForAward ? <Check className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                                        </div>
                                     </div>
                                 )
                             })}
                         </div>
                     </motion.div>
                </div>
             </ClientPortal>
        )}
      </AnimatePresence>

      {/* --- ARCHITECT MODAL --- */}
      <AnimatePresence>
        {isArchitectOpen && (
            <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center md:p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#0F172A]/90 backdrop-blur-xl" onClick={() => setIsArchitectOpen(false)} />
                <motion.div 
                    initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} 
                    className="relative bg-white w-full h-[90vh] md:h-[600px] md:max-w-4xl rounded-t-[40px] md:rounded-[48px] shadow-2xl overflow-hidden flex flex-col md:flex-row md:border-[8px] border-white"
                >
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
        )}
      </AnimatePresence>
    </div>
  );
}