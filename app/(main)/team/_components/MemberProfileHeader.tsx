"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Mail, Calendar, ArrowLeftRight, TrendingUp, AlertCircle, Copy } from "lucide-react";
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
    <div className="w-full lg:w-[340px] bg-white lg:bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto no-scrollbar relative z-30">
        
        {/* --- MAIN CONTENT CONTAINER --- */}
        <div className="p-5 lg:p-8 flex flex-col items-center w-full">
            
            {/* TOP ROW: AVATAR + NAME + PROGRESS (Mobile Optimized) */}
            <div className="flex lg:flex-col items-center gap-5 w-full">
                
                {/* 1. AVATAR */}
                <div className="relative group/avatar cursor-pointer shrink-0 lg:mb-6" onClick={() => fileInputRef.current?.click()}>
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                    
                    <div className={cn(
                        "w-20 h-20 lg:w-32 lg:h-32 rounded-[24px] lg:rounded-[32px] p-1.5 shadow-md border border-slate-100 lg:rotate-[-3deg] transition-transform group-hover/avatar:rotate-0 group-hover/avatar:scale-105 bg-white",
                    )}>
                        <div className="w-full h-full rounded-[18px] lg:rounded-[24px] overflow-hidden flex items-center justify-center bg-slate-50 relative">
                            {hasValidImage ? (
                                <img src={member.image} className="w-full h-full object-cover" alt="" />
                            ) : (
                                <span className={cn("text-2xl lg:text-4xl font-black", brandText)}>{initials}</span>
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                                {isUploading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. IDENTITY (Name & Role) */}
                <div className="flex-1 min-w-0 flex flex-col lg:items-center">
                    <h2 className="text-xl lg:text-3xl font-[900] text-slate-900 tracking-tight lg:text-center leading-none mb-1.5 truncate w-full">{member.name}</h2>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] lg:mb-2 truncate">{member.role}</span>
                    
                    {/* Mobile Progress Pill */}
                    <div className="lg:hidden flex items-center gap-2 mt-2">
                        <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full", isFOH ? "bg-[#004F71]" : "bg-[#E51636]")} style={{ width: `${member.progress}%` }} />
                        </div>
                        <span className={cn("text-xs font-[1000]", brandText)}>{member.progress}%</span>
                    </div>
                </div>

                {/* 3. PROGRESS RING (Desktop Only) */}
                <div className="hidden lg:flex flex-col items-center gap-2 mt-2">
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

            {/* SECOND ROW: METADATA & ACTIONS */}
            <div className="w-full mt-6 lg:mt-8 grid grid-cols-1 gap-3">
                {/* Unit Button */}
                <button 
                    onClick={toggleDepartment}
                    className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all shadow-sm active:scale-95 group",
                        isFOH 
                            ? "bg-blue-50/50 border-blue-100 text-[#004F71]" 
                            : isBOH 
                                ? "bg-red-50/50 border-red-100 text-[#E51636]"
                                : "bg-slate-50 border-slate-200 text-slate-500"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <div className={cn("w-2 h-2 rounded-full", isFOH ? "bg-[#004F71]" : isBOH ? "bg-[#E51636]" : "bg-slate-400")} />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            {isUnassigned ? "Unassigned Unit" : `${member.dept} Unit`}
                        </span>
                    </div>
                    <ArrowLeftRight className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                </button>

                {/* Info Grid - BEAUTIFIED */}
                <div className="grid grid-cols-2 gap-3 w-full">
                    
                    {/* EMAIL BLOCK */}
                    <div className="flex flex-col p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1.5 flex items-center gap-1.5">
                            Email <Copy className="w-2.5 h-2.5 opacity-50" />
                        </span>
                        <div className="flex items-center gap-2 overflow-hidden">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-[10px] font-bold text-slate-700 truncate" title={member.email}>
                                {member.email || "No Email"}
                            </span>
                        </div>
                    </div>

                    {/* JOINED BLOCK */}
                    <div className="flex flex-col p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                            Joined
                        </span>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-[10px] font-bold text-slate-700 truncate">
                                {member.joined ? format(new Date(member.joined), "MMM d, yyyy") : "N/A"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {isUnassigned && (
                <div className="mt-3 flex items-center gap-2 text-red-500 bg-red-50 px-3 py-2 rounded-xl border border-red-100 w-full justify-center">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-black uppercase tracking-wide">Action Required</span>
                </div>
            )}
        </div>
    </div>
  );
}