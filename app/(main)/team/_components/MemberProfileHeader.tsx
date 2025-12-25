"use client";

import { useRef, useState, useMemo } from "react";
import { Camera, Loader2, Mail, Calendar, ArrowLeftRight, TrendingUp } from "lucide-react";
import { cn, getProbationStatus } from "@/lib/utils";
import { format } from "date-fns";
import { Badge } from "./Badge";
import { TeamMember } from "../../calendar/_components/types";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import toast from "react-hot-toast";

interface Props {
  member: TeamMember;
}

export function MemberProfileHeader({ member }: Props) {
  const isFOH = member.dept === "FOH";
  const brandText = isFOH ? 'text-[#004F71]' : 'text-[#E51636]';
  const initials = member.name.split(' ').map(n => n[0]).join('').toUpperCase();
  const hasValidImage = member.image && !member.image.includes('ui-avatars.com');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // LOGIC RECOVERED: Image Upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      const file = e.target.files[0];
      const storageRef = ref(storage, `team-avatars/${member.id}/${file.name}`);
      try {
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        await updateDoc(doc(db, "profileOverrides", member.id), { image: url, updatedAt: serverTimestamp() });
        toast.success("Identity Updated");
      } catch (error) {
        toast.error("Upload Failed");
      } finally {
        setIsUploading(false);
      }
    }
  };

  // LOGIC RECOVERED: Department Toggle
  const toggleDepartment = async () => {
      const newDept = member.dept === "FOH" ? "BOH" : "FOH";
      const loadToast = toast.loading(`Transferring to ${newDept}...`);
      try {
          await updateDoc(doc(db, "teamMembers", member.id), { dept: newDept });
          toast.success(`Unit Updated: ${newDept}`, { id: loadToast });
      } catch(e) {
          toast.error("Transfer Failed", { id: loadToast });
      }
  };

  return (
    <div className="w-full lg:w-[340px] bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col p-8 shrink-0 overflow-y-auto no-scrollbar items-center">
        
        {/* AVATAR */}
        <div className="relative group/avatar cursor-pointer mb-6" onClick={() => fileInputRef.current?.click()}>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
            
            <div className="w-32 h-32 rounded-[32px] p-2 bg-white shadow-xl border border-slate-100 rotate-[-3deg] transition-transform group-hover/avatar:rotate-0 group-hover/avatar:scale-105">
                <div className="w-full h-full rounded-[24px] overflow-hidden flex items-center justify-center bg-slate-50 relative">
                    {hasValidImage ? (
                        <img src={member.image} className="w-full h-full object-cover" alt="" />
                    ) : (
                        <span className={cn("text-4xl font-black", brandText)}>{initials}</span>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                        {isUploading ? <Loader2 className="w-8 h-8 text-white animate-spin" /> : <Camera className="w-8 h-8 text-white" />}
                    </div>
                </div>
            </div>
        </div>

        <h2 className="text-3xl font-[900] text-slate-900 tracking-tight text-center leading-none mb-4">{member.name}</h2>
        
        {/* CLICKABLE UNIT BADGE */}
        <button 
            onClick={toggleDepartment}
            className={cn(
                "group relative flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all shadow-sm active:scale-95 mb-2 hover:bg-white",
                isFOH ? "bg-blue-50 border-blue-100 text-[#004F71]" : "bg-red-50 border-red-100 text-[#E51636]"
            )}
        >
            <span className="text-[10px] font-black uppercase tracking-widest">{member.dept} UNIT</span>
            <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm opacity-60 group-hover:opacity-100 transition-opacity">
                <ArrowLeftRight className="w-3 h-3" />
            </div>
        </button>

        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-8">{member.role}</span>

        {/* METADATA */}
        <div className="w-full space-y-3">
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
        </div>

        <div className="w-full h-px bg-slate-200 my-8" />

        {/* PROGRESS RING */}
        <div className="flex flex-col items-center gap-2">
            <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                    <circle cx="50%" cy="50%" r="40" className="text-slate-200" strokeWidth="8" stroke="currentColor" fill="transparent" />
                    <circle 
                        cx="50%" cy="50%" r="40" 
                        className={cn("transition-all duration-1000", isFOH ? "text-[#004F71]" : "text-[#E51636]")} 
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
  );
}