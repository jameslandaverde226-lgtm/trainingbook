"use client";

import { useState, useEffect } from "react";
// 1. Import 'Variants' type
import { motion, useDragControls, PanInfo, Variants } from "framer-motion";
import { 
  X, Trash2, Fingerprint, Sparkles, Check, 
  PaintBucket, LayoutGrid, PenLine 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TACTICAL_ICONS } from "@/lib/icon-library";
import ClientPortal from "@/components/core/ClientPortal";

// PRESETS
const PRESET_COLORS = [
    { id: "red", hex: "#E51636" }, 
    { id: "navy", hex: "#004F71" },
    { id: "emerald", hex: "#10b981" }, 
    { id: "amber", hex: "#f59e0b" },
    { id: "violet", hex: "#8b5cf6" }, 
    { id: "rose", hex: "#f43f5e" },
    { id: "cyan", hex: "#06b6d4" }, 
    { id: "slate", hex: "#475569" },
];

interface ForgeProps {
    isOpen: boolean;
    onClose: () => void;
    draft: any;
    setDraft: (d: any) => void;
    onSave: () => void;
    onDelete?: (id: string) => void;
    editingId?: string | null;
}

export default function ForgeModal({ 
    isOpen, onClose, draft, setDraft, onSave, onDelete, editingId 
}: ForgeProps) {
    
    const [isMobile, setIsMobile] = useState(false);
    const dragControls = useDragControls();

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Helper to find current icon component
    const CurrentIcon = TACTICAL_ICONS.find(i => i.id === draft.iconId)?.icon || Sparkles;

    // 2. Explicitly type the variants object
    const variants: Variants = {
        mobileHidden: { y: "100%" },
        mobileVisible: { y: 0, transition: { type: "spring", damping: 25, stiffness: 300 } },
        desktopHidden: { opacity: 0, scale: 0.95, y: 20 },
        desktopVisible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", duration: 0.5 } }
    };

    return (
        <ClientPortal>
            <div className={cn(
                "fixed inset-0 z-[200] flex justify-center pointer-events-none",
                isMobile ? "items-end" : "items-center p-4"
            )}>
                {/* Backdrop */}
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    onClick={onClose}
                    className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-xl pointer-events-auto"
                />

                {/* Main Modal Window */}
                <motion.div 
                    variants={variants}
                    initial={isMobile ? "mobileHidden" : "desktopHidden"}
                    animate={isMobile ? "mobileVisible" : "desktopVisible"}
                    exit={isMobile ? "mobileHidden" : "desktopHidden"}
                    drag={isMobile ? "y" : false}
                    dragControls={dragControls}
                    dragListener={false}
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={0.05}
                    onDragEnd={(_, info: PanInfo) => { if (isMobile && info.offset.y > 100) onClose(); }}
                    className={cn(
                        "relative bg-white shadow-2xl flex flex-col md:flex-row pointer-events-auto overflow-hidden",
                        // Mobile Styles (Bottom Sheet)
                        "w-full h-[92vh] rounded-t-[40px]",
                        // Desktop Styles (Centered Modal)
                        "md:w-full md:max-w-5xl md:h-[650px] md:rounded-[48px] md:border md:border-white/40 md:ring-1 md:ring-black/5"
                    )}
                >
                    {/* --- MOBILE DRAG HANDLE --- */}
                    <div 
                        className="md:hidden absolute top-0 left-0 right-0 h-12 flex justify-center items-center z-50 cursor-grab active:cursor-grabbing touch-none"
                        onPointerDown={(e) => dragControls.start(e)}
                    >
                        <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
                    </div>

                    {/* --- LEFT COLUMN: THE ARTIFACT STAGE (Top on Mobile) --- */}
                    <div className="w-full md:w-[45%] relative flex flex-col items-center justify-center p-8 pt-12 md:p-12 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-100 overflow-hidden shrink-0">
                        
                        {/* Dynamic Background Ambience */}
                        <motion.div 
                            animate={{ backgroundColor: draft.hex }}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] blur-[100px] opacity-15 pointer-events-none transition-colors duration-700"
                        />
                        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

                        {/* --- THE BADGE PREVIEW --- */}
                        <div className="relative z-10 flex flex-col items-center w-full">
                            
                            <motion.div 
                                layoutId="preview-badge"
                                className="w-32 h-32 md:w-40 md:h-40 rounded-[32px] md:rounded-[40px] flex items-center justify-center shadow-[0_30px_60px_-15px_rgba(0,0,0,0.2)] transition-all duration-500 relative group"
                                style={{ 
                                    backgroundColor: draft.hex,
                                    boxShadow: `0 20px 60px -10px ${draft.hex}60`
                                }}
                            >
                                {/* Glass Glint */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent rounded-[32px] md:rounded-[40px] border border-white/20" />
                                
                                {/* Icon */}
                                <CurrentIcon className="w-16 h-16 md:w-20 md:h-20 text-white drop-shadow-lg relative z-10 transform group-hover:scale-110 transition-transform duration-300" />
                            </motion.div>

                            {/* --- MODULE NAME INPUT --- */}
                            <div className="mt-8 md:mt-12 w-full relative group/input text-center">
                                <label className="block text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2 group-focus-within/input:text-[#004F71] transition-colors">
                                    Module Designation
                                </label>
                                <div className="relative flex items-center justify-center">
                                    <input 
                                        value={draft.label}
                                        onChange={(e) => setDraft({...draft, label: e.target.value})}
                                        placeholder="UNTITLED"
                                        className="w-full text-center text-2xl md:text-3xl font-[1000] text-slate-900 placeholder:text-slate-200 bg-transparent outline-none uppercase tracking-tighter transition-all"
                                        maxLength={20}
                                        autoFocus={!editingId}
                                    />
                                    <PenLine className="absolute right-4 md:right-8 w-4 h-4 md:w-5 md:h-5 text-slate-200 opacity-0 group-hover/input:opacity-100 transition-opacity pointer-events-none" />
                                </div>
                                {/* Focus Underline */}
                                <div className="h-1 w-8 bg-slate-200 rounded-full mx-auto mt-2 group-focus-within/input:w-16 group-focus-within/input:bg-[#004F71] transition-all duration-300" />
                            </div>
                        </div>

                        {/* Delete Action */}
                        {editingId && onDelete && (
                            <button 
                                onClick={() => onDelete(editingId)}
                                className="absolute top-4 left-4 md:top-6 md:left-6 p-3 rounded-full text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-all active:scale-90 z-20"
                                title="Delete Module"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                        
                        {/* Close on Mobile (Desktop has right corner X) */}
                        <button onClick={onClose} className="md:hidden absolute top-4 right-4 p-2 bg-slate-200/50 rounded-full text-slate-500 z-20">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* --- RIGHT COLUMN: CONTROLS (Bottom on Mobile) --- */}
                    <div className="flex-1 flex flex-col min-h-0 bg-white relative">
                        
                        {/* Desktop Header */}
                        <div className="hidden md:flex px-8 py-8 justify-between items-start shrink-0">
                            <div>
                                <h2 className="text-2xl font-[1000] text-slate-900 tracking-tighter">Forge Module</h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    Configure parameters & identity
                                </p>
                            </div>
                            <button onClick={onClose} className="p-2 -mr-2 text-slate-300 hover:text-slate-500 hover:bg-slate-50 rounded-full transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Scrollable Controls */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6 md:px-8 md:pb-32 space-y-10">
                            
                            {/* 1. COLOR DNA */}
                            <section>
                                <div className="flex items-center gap-2 mb-4">
                                    <PaintBucket className="w-4 h-4 text-[#004F71]" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Color DNA</span>
                                </div>
                                
                                <div className="space-y-4">
                                    {/* Swatches */}
                                    <div className="flex flex-wrap gap-3">
                                        {PRESET_COLORS.map((c) => (
                                            <button 
                                                key={c.id} 
                                                onClick={() => setDraft({...draft, hex: c.hex})} 
                                                className={cn(
                                                    "w-10 h-10 md:w-12 md:h-12 rounded-2xl transition-all relative flex items-center justify-center border-2 border-transparent",
                                                    draft.hex === c.hex 
                                                        ? "scale-110 shadow-lg shadow-black/5 ring-2 ring-offset-2 ring-slate-900" 
                                                        : "hover:scale-105 hover:border-slate-100"
                                                )}
                                                style={{ backgroundColor: c.hex }}
                                            >
                                                {draft.hex === c.hex && (
                                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                                        <Check className="w-5 h-5 md:w-6 md:h-6 text-white drop-shadow-md" strokeWidth={3} />
                                                    </motion.div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                    
                                    {/* Fine Tune Slider */}
                                    <div className="pt-1">
                                        <div className="h-3 rounded-full w-full bg-gradient-to-r from-red-500 via-green-500 to-blue-500 p-[2px] shadow-inner">
                                            <input 
                                                type="range" 
                                                min="0" max="360" 
                                                onChange={(e) => setDraft({...draft, hex: `hsl(${e.target.value}, 75%, 50%)`})} 
                                                className="w-full h-full opacity-0 cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* 2. ICONOGRAPHY */}
                            <section className="pb-24 md:pb-0">
                                <div className="flex items-center gap-2 mb-4">
                                    <LayoutGrid className="w-4 h-4 text-[#004F71]" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Iconography</span>
                                </div>

                                <div className="space-y-6">
                                    {["Achievement", "Hospitality", "BOH", "Operational", "Creative"].map((cat) => (
                                        <div key={cat}>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="h-px flex-1 bg-slate-100" />
                                                <span className="text-[8px] md:text-[9px] font-bold text-slate-300 uppercase tracking-widest">{cat}</span>
                                                <div className="h-px flex-1 bg-slate-100" />
                                            </div>
                                            <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-7 gap-2 md:gap-3">
                                                {TACTICAL_ICONS.filter(i => i.category === cat).map((item) => (
                                                    <button 
                                                        key={item.id} 
                                                        onClick={() => setDraft({...draft, iconId: item.id})} 
                                                        className={cn(
                                                            "aspect-square rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-300 group relative border",
                                                            draft.iconId === item.id 
                                                                ? "bg-slate-900 text-white shadow-xl scale-110 border-slate-900 z-10" 
                                                                : "bg-white text-slate-400 hover:bg-slate-50 border-slate-100 hover:border-slate-200"
                                                        )}
                                                    >
                                                        <item.icon className="w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:scale-110" />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        {/* Sticky Action Footer */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 bg-gradient-to-t from-white via-white/95 to-transparent z-20">
                             <button 
                                onClick={onSave}
                                className="w-full py-4 md:py-5 rounded-2xl text-white font-[900] text-xs md:text-sm uppercase tracking-[0.25em] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3 group"
                                style={{ backgroundColor: draft.hex }}
                             >
                                 <Fingerprint className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                 {editingId ? "Update Protocol" : "Fabricate Module"}
                             </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </ClientPortal>
    );
}