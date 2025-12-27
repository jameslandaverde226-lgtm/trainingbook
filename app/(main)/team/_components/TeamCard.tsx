"use client";

import { useState, useRef, memo, useEffect, useMemo } from "react";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence, PanInfo } from "framer-motion";
import { Camera, Loader2, Link2, UserPlus, Crown, Sparkles, User, Activity, Clock, CheckCircle2 } from "lucide-react"; 
import { cn, getProbationStatus } from "@/lib/utils";
import { TeamMember } from "../../calendar/_components/types";
import { storage, db } from "@/lib/firebase"; 
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";
import { TACTICAL_ICONS } from "@/lib/icon-library";
import { useAppStore } from "@/lib/store/useStore"; 
import Image from "next/image"; 

interface Props {
  member: TeamMember;
  onClick: (m: TeamMember) => void;
  onAssignClick: (m: TeamMember) => void;
  onDragStart: () => void;
  onDragEnd: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
  isDragging: boolean;
  isDropTarget?: boolean;
  isWaitingForMentor?: boolean;
}

// 3D Tilt Logic
const TiltWrapper = ({ children, disabled, className, ...props }: any) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 120, damping: 25 });
  const mouseYSpring = useSpring(y, { stiffness: 120, damping: 25 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["5deg", "-5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-5deg", "5deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  if (disabled) {
    return <div className={className} {...props}>{children}</div>;
  }

  return (
    <motion.div
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

const TeamCardComponent = ({ 
    member, 
    onClick, 
    onAssignClick, 
    onDragStart, 
    onDragEnd, 
    isDragging, 
    isDropTarget,
    isWaitingForMentor
}: Props) => {
  const { updateMemberLocal } = useAppStore();
  
  const isFOH = member.dept === "FOH";
  const isBOH = member.dept === "BOH";
  const isUnassigned = !isFOH && !isBOH;

  const hasImage = member.image && !member.image.includes('ui-avatars.com');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  
  const [imageLoaded, setImageLoaded] = useState(false);
  const probation = useMemo(() => getProbationStatus(member.joined), [member.joined]);
  const progressTicks = Math.round((member.progress || 0) / 10);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.matchMedia("(max-width: 768px)").matches);
    checkMobile();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setIsUploading(true);
        const file = e.target.files[0];
        const toastId = toast.loading("Processing Identity...");
        const storageRef = ref(storage, `team-avatars/${member.id}/${file.name}`);
        try {
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            updateMemberLocal(member.id, { image: url });
            await setDoc(doc(db, "profileOverrides", member.id), {
                image: url,
                updatedAt: serverTimestamp()
            }, { merge: true });
            toast.success("Identity Sync Complete", { id: toastId });
        } catch (error) {
            toast.error("Upload Failed", { id: toastId });
        } finally {
            setIsUploading(false);
        }
    }
  };

  return (
    <TiltWrapper 
      disabled={isMobile || isDragging} 
      className={cn(
        "relative group w-full aspect-[3/4] perspective-1000 cursor-pointer select-none touch-none", 
        isDropTarget && !isDragging && "z-50 scale-[1.03]",
        isWaitingForMentor && "z-50 scale-[1.02]"
      )}
      onClick={() => !isDragging && onClick(member)}
    >
       <motion.div
         drag={!isMobile} 
         dragSnapToOrigin 
         dragElastic={0.1}
         onDragStart={onDragStart}
         onDragEnd={onDragEnd}
         whileDrag={{ scale: 1.05, zIndex: 100, cursor: "grabbing" }} 
         style={{ filter: isDragging ? 'brightness(1.1)' : 'none', zIndex: isDragging ? 100 : 1 }}
         className="h-full w-full relative"
       >
        {/* --- ASSIGNMENT OVERLAY (Now placed at root of card motion div) --- */}
        <AnimatePresence>
            {isDropTarget && (
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    // z-50 ensures it is on top of everything inside this card
                    // pointer-events-none allows clicks to pass through to the wrapper onClick, BUT visual cue remains
                    className="absolute inset-0 z-50 bg-emerald-900/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white rounded-[32px] pointer-events-none"
                >
                    <motion.div 
                        initial={{ scale: 0.5, opacity: 0 }} 
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="bg-emerald-500 p-4 rounded-full shadow-xl mb-3 border-4 border-emerald-400"
                    >
                        <Link2 className="w-8 h-8 text-white" />
                    </motion.div>
                    <span className="text-sm font-black uppercase tracking-[0.2em] drop-shadow-md text-emerald-100">Click to Assign</span>
                </motion.div>
            )}
        </AnimatePresence>
        
        {/* --- NEW: WAITING FOR MENTOR OVERLAY --- */}
        <AnimatePresence>
            {isWaitingForMentor && (
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    className="absolute -inset-1 z-[-1] rounded-[36px] bg-gradient-to-tr from-amber-400 to-orange-500 blur-lg opacity-60 animate-pulse"
                />
            )}
        </AnimatePresence>

        {/* AMBIENT GLOW */}
        <div className={cn(
          "absolute -inset-2 rounded-[32px] blur-2xl transition-opacity duration-500 pointer-events-none opacity-0 group-hover:opacity-40",
          isFOH ? "bg-[#004F71]" : isBOH ? "bg-[#E51636]" : "bg-slate-500",
          // TARGET GLOW
          isDropTarget && "opacity-80 bg-emerald-500 duration-300 animate-pulse"
        )} />

        {/* CARD CHASSIS */}
        <div className={cn(
          "relative h-full w-full rounded-[32px] border overflow-hidden flex flex-col transition-all duration-300 transform-gpu",
          hasImage
            ? "bg-[#0F172A] border-white/10 shadow-2xl" 
            : isFOH 
                ? "bg-[#004F71] border-[#004F71] shadow-xl"
                : isBOH 
                    ? "bg-[#E51636] border-[#E51636] shadow-xl"
                    : "bg-slate-800 border-slate-700 shadow-xl", 
          isDragging && "ring-4 ring-white/50 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] scale-105 rotate-2",
          // TARGET BORDER
          isDropTarget && "ring-4 ring-emerald-500 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.4)]",
          // WAITING BORDER
          isWaitingForMentor && "ring-4 ring-amber-400 border-amber-400 shadow-2xl"
        )}>
          
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />

          {/* BACKGROUND LAYER */}
          <div className="absolute inset-0 z-0">
            {hasImage ? (
              <>
                <div 
                    className={cn(
                        "absolute inset-0 bg-slate-800 transition-opacity duration-700 z-10",
                        imageLoaded ? "opacity-0 pointer-events-none" : "opacity-100"
                    )}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" style={{ transform: 'skewX(-20deg)' }} />
                </div>
                <img 
                    src={member.image} 
                    alt={member.name} 
                    loading="lazy"
                    onLoad={() => setImageLoaded(true)}
                    className={cn(
                        "w-full h-full object-cover transition-all duration-1000",
                        imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105"
                    )} 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/20 to-transparent opacity-90" />
              </>
            ) : (
                <>
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />
                    <div className="absolute -bottom-10 -right-10 text-[12rem] font-[1000] text-white/5 rotate-[-15deg] leading-none pointer-events-none select-none">
                        {member.name.charAt(0)}
                    </div>
                </>
            )}
          </div>

          {/* CONTENT LAYER */}
          <div className="relative z-10 h-full p-5 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="flex flex-wrap gap-2">
                  <div className={cn(
                      "px-2.5 py-1 rounded-lg backdrop-blur-md border text-[8px] font-black uppercase tracking-[0.2em] shadow-sm",
                      isUnassigned ? "bg-slate-500/20 border-slate-500/30 text-slate-300" : "bg-white/10 border-white/10 text-white/90"
                  )}>
                    {member.dept === "Unassigned" ? "NO UNIT" : member.dept}
                  </div>
                  {probation && probation.isActive && (
                     <div className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 backdrop-blur-md flex items-center gap-2 shadow-sm text-amber-200">
                        <span className="text-[8px] font-black uppercase tracking-wider">{probation.daysRemaining} Days Left</span>
                     </div>
                  )}
              </div>
              {!isDropTarget && (
                <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all backdrop-blur-md opacity-0 group-hover:opacity-100">
                    {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            <div className="space-y-4">
               <div>
                  {!hasImage && (
                      <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-2xl font-[1000] text-white shadow-lg mb-3">
                          {member.name.charAt(0)}
                      </div>
                  )}
                  <h3 className="text-2xl md:text-3xl font-[900] text-white tracking-tighter leading-[0.9] drop-shadow-md mb-1.5">
                    {member.name}
                  </h3>
                  <div className="flex items-center gap-2 mb-3">
                      <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest">{member.role}</span>
                      <div className="w-1 h-1 rounded-full bg-white/30" />
                      <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">{member.progress}% Complete</span>
                  </div>
                  <div className="flex gap-1 mb-2">
                     {Array.from({ length: 10 }).map((_, i) => (
                         <div key={i} className={cn("h-1 flex-1 rounded-full transition-all duration-500", i < progressTicks ? "bg-white/90 shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "bg-white/10")} />
                     ))}
                  </div>
               </div>

               {/* MENTOR DOCK */}
               <div 
                    onClick={(e) => { e.stopPropagation(); onAssignClick(member); }}
                    className={cn(
                        "h-12 w-full rounded-xl border backdrop-blur-xl flex items-center px-3 gap-3 transition-all duration-300 relative overflow-hidden group/dock",
                        isDropTarget 
                            ? "bg-emerald-500 border-emerald-400 shadow-lg justify-center z-50" 
                            : isWaitingForMentor
                                ? "bg-amber-500/20 border-amber-400/50 shadow-inner"
                                : "bg-white/10 border-white/10 hover:bg-white/15"
                    )}
               >
                   <AnimatePresence mode="wait">
                       {member.pairing ? (
                           <motion.div key="paired" className="flex items-center gap-3 w-full">
                               <div className="relative shrink-0 w-8 h-8">
                                   {member.pairing.image ? <img src={member.pairing.image} className="w-full h-full rounded-lg object-cover bg-slate-900 border border-white/20" alt={member.pairing.name} /> : <div className="w-full h-full rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-black text-white border border-white/20">{member.pairing.name.charAt(0)}</div>}
                                   <div className="absolute -bottom-1 -right-1 bg-amber-400 rounded-full p-0.5 border border-black/10"><Crown className="w-2 h-2 text-black fill-current" /></div>
                               </div>
                               <div className="flex flex-col min-w-0">
                                   <span className="text-[7px] font-bold text-white/40 uppercase tracking-wider">Mentored By</span>
                                   <span className="text-[10px] font-black text-white truncate">{member.pairing.name}</span>
                               </div>
                           </motion.div>
                       ) : (
                           <motion.div key="empty" className={cn(
                               "flex items-center gap-2 transition-colors w-full",
                               isWaitingForMentor ? "text-amber-100" : "text-white/40 group-hover/dock:text-white/70"
                           )}>
                               <div className={cn(
                                   "w-8 h-8 rounded-lg border border-dashed flex items-center justify-center",
                                   isWaitingForMentor ? "border-amber-200 bg-amber-500/20" : "border-white/20"
                               )}>
                                    {isWaitingForMentor ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                               </div>
                               <span className="text-[9px] font-bold uppercase tracking-widest">
                                   {isWaitingForMentor ? "Select Leader Below..." : "Assign Mentor"}
                               </span>
                           </motion.div>
                       )}
                   </AnimatePresence>
               </div>
            </div>
          </div>
        </div>
      </motion.div>
    </TiltWrapper>
  );
};

export const TeamCard = memo(TeamCardComponent);