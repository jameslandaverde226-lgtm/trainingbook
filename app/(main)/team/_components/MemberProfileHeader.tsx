"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Mail, Calendar, ArrowLeftRight, TrendingUp, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { TeamMember } from "../../calendar/_components/types";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import toast from "react-hot-toast";
import { useAppStore } from "@/lib/store/useStore";

interface Props {
  member: TeamMember;
}

export function MemberProfileHeader({ member }: Props) {
  const { updateMemberLocal } = useAppStore();
  
  const isFOH = member.dept === "FOH";
  const isBOH = member.dept === "BOH";
  const isUnassigned = !isFOH && !isBOH;

  const brandText = isFOH ? 'text-[#004F71]' : isBOH ? 'text-[#E51636]' : 'text-slate-500';
  const initials = member.name.split(' ').map(n => n[0]).join('').toUpperCase();
  const hasValidImage = member.image && !member.image.includes('ui-avatars.com');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      const file = e.target.files[0];
      const storageRef = ref(storage, `team-avatars/${member.id}/${file.name}`);
      try {
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        
        const batch = writeBatch(db);
        const overrideRef = doc(db, "profileOverrides", member.id);
        const baseRef = doc(db, "teamMembers", member.id);
        
        batch.set(overrideRef, { image: url, updatedAt: serverTimestamp() }, { merge: true });
        batch.update(baseRef, { image: url });
        
        await batch.commit();

        updateMemberLocal(member.id, { image: url });
        toast.success("Identity Updated");
      } catch (error) {
        toast.error("Upload Failed");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const toggleDepartment = async () => {
      const newDept = member.dept === "FOH" ? "BOH" : "FOH";
      const loadToast = toast.loading(`Transferring to ${newDept}...`);
      
      updateMemberLocal(member.id, { dept: newDept });

      try {
          const batch = writeBatch(db);
          const overrideRef = doc(db, "profileOverrides", member.id);
          batch.set(overrideRef, { dept: newDept, updatedAt: serverTimestamp() }, { merge: true });
          const baseRef = doc(db, "teamMembers", member.id);
          batch.update(baseRef, { dept: newDept });
          await batch.commit();
          
          toast.success(`Unit Updated: ${newDept}`, { id: loadToast });
      } catch(e) {
          console.error(e);
          toast.error("Transfer Failed", { id: loadToast });
          updateMemberLocal(member.id, { dept: member.dept });
      }
  };

  return (
    <div className="w-full lg:w-[340px] bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-200 flex lg:flex-col items-center p-5 lg:p-8 shrink-0 overflow-y-auto no-scrollbar gap-4 lg:gap-0 justify-between lg:justify-start">
        
        {/* LEFT SECTION (Mobile): Avatar + Info */}
        <div className="flex lg:flex-col items-center gap-4 lg:gap-0 w-full lg:w-auto">
            {/* AVATAR */}
            <div className="relative group/avatar cursor-pointer lg:mb-6 shrink-0" onClick={() => fileInputRef.current?.click()}>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                
                <div className={cn(
                    "w-16 h-16 lg:w-32 lg:h-32 rounded-[20px] lg:rounded-[32px] p-1.5 lg:p-2 shadow-sm lg:shadow-xl border border-slate-200 lg:border-slate-100 lg:rotate-[-3deg] transition-transform group-hover/avatar:rotate-0 group-hover/avatar:scale-105 bg-white",
                )}>
                    <div className="w-full h-full rounded-[14px] lg:rounded-[24px] overflow-hidden flex items-center justify-center bg-slate-50 relative">
                        {hasValidImage ? (
                            <img src={member.image} className="w-full h-full object-cover" alt="" />
                        ) : (
                            <span className={cn("text-xl lg:text-4xl font-black", brandText)}>{initials}</span>
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                            {isUploading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
                        </div>
                    </div>
                </div>
            </div>

            {/* IDENTITY INFO */}
            <div className="flex flex-col lg:items-center min-w-0 flex-1">
                <h2 className="text-xl lg:text-3xl font-[900] text-slate-900 tracking-tight lg:text-center leading-tight mb-1 lg:mb-4 truncate w-full">{member.name}</h2>
                
                {/* Mobile: Row Layout for Badge | Desktop: Column */}
                <div className="flex lg:flex-col items-center lg:items-center gap-2 lg:gap-0">
                    <button 
                        onClick={toggleDepartment}
                        className={cn(
                            "group relative flex items-center gap-2 lg:gap-3 px-3 lg:px-5 py-1.5 lg:py-2.5 rounded-full border transition-all shadow-sm active:scale-95 hover:shadow-md lg:mb-2",
                            isFOH 
                                ? "bg-blue-50 border-blue-100 text-[#004F71]" 
                                : isBOH 
                                    ? "bg-red-50 border-red-100 text-[#E51636]"
                                    : "bg-slate-200 border-slate-300 text-slate-500"
                        )}
                    >
                        <span className="text-[8px] lg:text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                            {isUnassigned ? "UNASSIGNED" : `${member.dept}`}
                        </span>
                        <div className="w-3.5 h-3.5 lg:w-5 lg:h-5 rounded-full bg-white flex items-center justify-center shadow-sm opacity-60 group-hover:opacity-100 transition-opacity">
                            <ArrowLeftRight className="w-2 h-2 lg:w-3 lg:h-3" />
                        </div>
                    </button>
                    
                    <span className="text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] lg:mb-8 truncate">{member.role}</span>
                </div>
            </div>
        </div>

        {/* RIGHT SECTION (Mobile): Mini Stats */}
        {/* DESKTOP: Full Stats */}
        <div className="hidden lg:flex w-full flex-col space-y-3">
            <div className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-600 truncate flex-1">{member.email || "No Email"}</span>
            </div>
             {member.joined && (
                <div className="flex items-center justify-center gap-2 text-slate-400 opacity-80">
                    <Calendar className="w-3 h-3" />
                    <span className="text-[9px] font-black uppercase tracking-widest">
                        Joined {format(new Date(member.joined), "MMM do, yyyy")}
                    </span>
                </div>
            )}
            
            <div className="w-full h-px bg-slate-200 my-8" />

            {/* PROGRESS RING (Desktop) */}
            <div className="flex flex-col items-center gap-2">
                <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90">
                        <circle cx="50%" cy="50%" r="40" className="text-slate-200" strokeWidth="8" stroke="currentColor" fill="transparent" />
                        <circle 
                            cx="50%" cy="50%" r="40" 
                            className={cn("transition-all duration-1000", isFOH ? "text-[#004F71]" : isBOH ? "text-[#E51636]" : "text-slate-400")} 
                            strokeWidth="8" strokeLinecap="round" stroke="currentColor" fill="transparent" 
                            strokeDasharray="251.2" 
                            strokeDashoffset={251.2 - (251.2 * (member.progress || 0) / 100)} 
                        />
                    </svg>
                    <span className={cn("text-2xl font-[900] absolute", brandText)}>{member.progress}%</span>
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <TrendingUp className="w-3 h-3" /> Growth Trajectory
                </span>
            </div>
        </div>

        {/* MOBILE ONLY: Simple Progress Pill */}
        <div className="lg:hidden flex flex-col items-end gap-1">
             <div className={cn("text-xl font-[1000]", brandText)}>
                {member.progress}%
             </div>
             <div className="h-1.5 w-12 bg-slate-200 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full", isFOH ? "bg-[#004F71]" : "bg-[#E51636]")} style={{ width: `${member.progress}%` }} />
             </div>
        </div>
    </div>
  );
}