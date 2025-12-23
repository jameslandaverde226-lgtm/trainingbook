// --- FILE: ./app/(main)/team/_components/TeamCard.tsx ---
"use client";

import { useState, useRef, memo, useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence, PanInfo } from "framer-motion";
import { Award, Camera, Loader2, Link2, ShieldCheck, Zap, Plus, User, Crown, UserPlus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { TeamMember } from "../../calendar/_components/types";
import { storage, db } from "@/lib/firebase"; 
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { differenceInDays } from "date-fns";
import toast from "react-hot-toast";

interface Props {
  member: TeamMember;
  onClick: (m: TeamMember) => void;
  onAssignClick: (m: TeamMember) => void;
  onDragStart: () => void;
  onDragEnd: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
  isDragging: boolean;
  isDropTarget?: boolean;
}

// 3D Tilt Logic
const TiltWrapper = ({ children, disabled, className, ...props }: any) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 120, damping: 25 });
  const mouseYSpring = useSpring(y, { stiffness: 120, damping: 25 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7deg", "-7deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7deg", "7deg"]);

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

const TeamCardComponent = ({ member, onClick, onAssignClick, onDragStart, onDragEnd, isDragging, isDropTarget }: Props) => {
  const isFOH = member.dept === "FOH";
  const hasImage = member.image && !member.image.includes('ui-avatars.com');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isMobile, setIsMobile] = useState(true);

  // --- 30 DAY LOGIC ---
  const isNewHire = member.joined ? differenceInDays(new Date(), new Date(member.joined)) <= 30 : false;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.matchMedia("(max-width: 768px)").matches);
    checkMobile();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      const file = e.target.files[0];
      const storageRef = ref(storage, `team-avatars/${member.id}/${file.name}`);
      try {
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        
        await updateDoc(doc(db, "profileOverrides", member.id), { // Fixed to profileOverrides for safety
          image: url,
          updatedAt: serverTimestamp()
        });
        toast.success("Identity Updated");
      } catch (error) {
        toast.error("Upload Failed");
      } finally {
        setIsUploading(false);
      }
    }
  };

  // Styles
  const superGlassDark = "bg-gradient-to-br from-white/30 via-white/10 to-transparent border border-white/30 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] backdrop-blur-xl text-white";
  const superGlassLight = "bg-gradient-to-br from-white/80 via-white/40 to-white/20 border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] backdrop-blur-xl text-slate-600";
  const superGlassRuby = "bg-gradient-to-br from-[#E51636] to-[#b91c1c] border border-[#E51636]/50 shadow-[0_8px_32px_0_rgba(229,22,54,0.3)] text-white";
  
  const activeLabel = (member.progress || 0) < 100 ? "Active Phase" : "Deployment Ready";

  return (
    <TiltWrapper 
      disabled={isMobile || isDragging}
      className={cn(
        "relative group w-full aspect-[4/5] perspective-1000 cursor-pointer",
        isDropTarget && !isDragging && "z-50 scale-105"
      )}
      onClick={() => !isDragging && onClick(member)}
    >
       <motion.div
         drag={!isMobile}
         dragSnapToOrigin
         dragElastic={0.05}
         onDragStart={onDragStart}
         onDragEnd={onDragEnd}
         style={{ filter: isDragging ? 'brightness(1.1)' : 'none', zIndex: isDragging ? 100 : 1 }}
         className="h-full w-full"
       >
        {/* AMBIENT GLOW */}
        <div className={cn(
          "absolute -inset-4 rounded-[40px] blur-[60px] transition-opacity duration-500 pointer-events-none opacity-0 group-hover:opacity-30",
          isFOH ? "bg-[#004F71]" : "bg-[#E51636]",
          isDropTarget && "opacity-80 bg-emerald-400 duration-200"
        )} />

        {/* CARD CHASSIS */}
        <div className={cn(
          "relative h-full w-full rounded-[40px] border overflow-hidden flex flex-col transition-all duration-300 transform-gpu",
          hasImage || isFOH 
            ? "bg-[#0F172A] border-white/10 shadow-xl" 
            : "bg-white border-slate-200 shadow-lg",
          isDragging && "ring-4 ring-[#E51636]/50 shadow-[0_20px_50px_-12px_rgba(229,22,54,0.5)]",
          isDropTarget && "ring-4 ring-emerald-400 scale-[1.02] border-emerald-400"
        )}>
          
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />

          {/* BACKGROUND */}
          <div className="absolute inset-0 z-0">
            {hasImage ? (
              <>
                <img 
                    src={member.image} 
                    alt={member.name} 
                    loading="lazy" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/40 to-transparent" />
              </>
            ) : isFOH ? (
              <div className="w-full h-full bg-[#004F71] relative overflow-hidden">
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_2px_2px,_rgba(255,255,255,0.2)_1px,_transparent_0)] [background-size:20px_20px]" />
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              </div>
            ) : (
              <div className="w-full h-full bg-white relative">
                   <div className="absolute inset-0 bg-slate-50/50" />
                   <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-white to-transparent" />
              </div>
            )}
          </div>

          {/* CONTENT */}
          <div className="relative z-10 h-full p-5 md:p-6 flex flex-col justify-between">
            
            {/* TOP BAR */}
            <div className="flex justify-between items-start">
              <div className="flex gap-2">
                  <div className={cn(
                    "px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] relative overflow-hidden flex items-center justify-center",
                    isFOH ? superGlassDark + " text-blue-100" : superGlassRuby
                  )}>
                    <span className="relative z-10">{member.dept} UNIT</span>
                  </div>

                  {/* --- NEW HIRE BADGE --- */}
                  {isNewHire && (
                     <div className="px-2.5 py-1.5 rounded-xl bg-[#E51636] text-white text-[8px] font-black uppercase tracking-wider shadow-lg shadow-red-500/30 flex items-center gap-1 border border-white/20 animate-pulse">
                         <Sparkles className="w-2.5 h-2.5 fill-current" />
                         <span>NEW</span>
                     </div>
                  )}
              </div>

              {!isDropTarget && (
                <button 
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className={cn(
                    "p-2.5 rounded-xl transition-all duration-300 opacity-0 group-hover:opacity-100 relative overflow-hidden",
                    hasImage || isFOH ? superGlassDark : superGlassLight
                    )}
                >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                </button>
              )}
            </div>

            {/* BIG INITIALS */}
            {!hasImage && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <div className={cn("text-6xl font-[1000] tracking-tighter drop-shadow-2xl select-none", isFOH ? "text-white/20" : "text-slate-900/10")}>
                        {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                </div>
            )}

            {/* BOTTOM INFO CLUSTER */}
            <div className="space-y-4 transform transition-transform duration-300 md:group-hover:-translate-y-2">
              <div>
                <h3 className={cn("text-2xl font-black tracking-tight leading-none mb-1.5", hasImage || isFOH ? "text-white" : "text-slate-900")}>
                  {member.name}
                </h3>
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] font-bold uppercase tracking-widest", hasImage || isFOH ? "text-white/60" : "text-slate-400")}>
                    {member.role}
                  </span>
                  <span className={cn("text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md backdrop-blur-sm", hasImage || isFOH ? "bg-white/10 text-white/80" : "bg-slate-100 text-slate-500")}>
                    {activeLabel}
                  </span>
                </div>
              </div>

              {/* --- MENTOR / CONNECTION SLOT (BEAUTIFIED) --- */}
              <div className="grid grid-cols-[1fr_auto] gap-2">
                  
                  {/* SLOT 1: MENTOR ASSIGNMENT */}
                  <div 
                    onClick={(e) => { e.stopPropagation(); onAssignClick(member); }}
                    className={cn(
                      "rounded-2xl flex items-center relative overflow-hidden transition-all duration-300 cursor-pointer h-14 active:scale-95 group/mentor",
                      // VISUAL LOGIC:
                      isDropTarget 
                        ? "bg-emerald-500 text-white shadow-xl shadow-emerald-500/30 col-span-2 justify-center" 
                        : (member.pairing 
                            ? (hasImage || isFOH ? "bg-white/10 border border-white/20 backdrop-blur-md px-3" : "bg-white border border-slate-100 shadow-sm px-3")
                            : (hasImage || isFOH 
                                // Dark Card (FOH or Image) - Gradient Button
                                ? cn("justify-center border backdrop-blur-md", isFOH ? "bg-gradient-to-br from-blue-500/20 to-blue-600/20 hover:from-blue-500/30 hover:to-blue-600/30 border-blue-400/30" : "bg-gradient-to-br from-red-500/20 to-red-600/20 hover:from-red-500/30 hover:to-red-600/30 border-red-400/30")
                                // Light Card - Subtle Gradient Button
                                : "justify-center bg-gradient-to-br from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 border border-slate-300/50"
                              )
                          )
                    )}
                  >
                     <AnimatePresence mode="wait">
                      {isDropTarget ? (
                           <motion.div 
                              key="drop"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="flex items-center gap-2"
                           >
                             <div className="p-1.5 bg-white/20 rounded-full animate-pulse">
                                <Link2 className="w-5 h-5 text-white" />
                             </div>
                             <div className="flex flex-col items-start leading-none">
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/80">Connect</span>
                                <span className="text-xs font-bold text-white">Release to Pair</span>
                             </div>
                           </motion.div>
                      ) : (
                        member.pairing ? (
                            <motion.div 
                                key="paired"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-center gap-3 w-full"
                            >
                                <div className="relative shrink-0">
                                    <div className="w-9 h-9 rounded-xl p-[2px] bg-gradient-to-tr from-emerald-400 to-blue-500 shadow-lg">
                                        <img src={member.pairing.image} alt="" className="w-full h-full rounded-[10px] object-cover bg-slate-900" />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full p-[2px]">
                                        <Crown className="w-2 h-2 text-white" />
                                    </div>
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className={cn("text-[7px] font-bold uppercase tracking-wider opacity-60", hasImage || isFOH ? "text-white" : "text-slate-500")}>
                                        Mentored By
                                    </span>
                                    <span className={cn("text-[11px] font-black truncate", hasImage || isFOH ? "text-white" : "text-slate-900")}>
                                        {member.pairing.name}
                                    </span>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="empty"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={cn(
                                    "flex items-center gap-2 transition-colors",
                                    hasImage || isFOH ? "text-white/80 group-hover/mentor:text-white" : "text-slate-600 group-hover/mentor:text-slate-800"
                                )}
                            >
                                <UserPlus className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Connect Mentor</span>
                            </motion.div>
                        )
                      )}
                     </AnimatePresence>
                  </div>

                  {/* SLOT 2: PROGRESS RING (Hidden during Drop) */}
                  {!isDropTarget && (
                      <div className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center relative overflow-hidden shrink-0",
                          hasImage || isFOH ? superGlassDark : superGlassLight
                      )}>
                          <svg className="w-8 h-8 -rotate-90">
                                <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-10" />
                                <circle cx="16" cy="16" r="13" fill="none" stroke={isFOH ? "#60a5fa" : "#f87171"} strokeWidth="2.5" strokeDasharray="81" strokeDashoffset={81 - (81 * (member.progress || 0) / 100)} strokeLinecap="round" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className={cn("text-[9px] font-black", hasImage || isFOH ? "text-white" : "text-slate-900")}>
                                {member.progress}
                            </span>
                          </div>
                      </div>
                  )}
              </div>

            </div>
          </div>
        </div>
      </motion.div>
    </TiltWrapper>
  );
};

export const TeamCard = memo(TeamCardComponent);