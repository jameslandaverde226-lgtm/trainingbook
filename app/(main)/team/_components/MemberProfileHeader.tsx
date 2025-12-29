"use client";

import { useRef, useState, useMemo } from "react";
import { Camera, Loader2, Mail, Calendar, ArrowLeftRight, TrendingUp, AlertCircle, Copy, Check, Link2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { TeamMember } from "../../calendar/_components/types";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, serverTimestamp, writeBatch, collection, addDoc } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import toast from "react-hot-toast";
import { useAppStore } from "@/lib/store/useStore";

interface Props {
  member: TeamMember;
}

export function MemberProfileHeader({ member }: Props) {
  const { updateMemberLocal, team } = useAppStore(); 
  
  const isFOH = member.dept === "FOH";
  const isBOH = member.dept === "BOH";
  const isUnassigned = !isFOH && !isBOH;

  const brandText = isFOH ? 'text-[#004F71]' : isBOH ? 'text-[#E51636]' : 'text-slate-500';
  const brandBg = isFOH ? 'bg-[#004F71]' : isBOH ? 'bg-[#E51636]' : 'bg-slate-500';
  const initials = member.name.split(' ').map(n => n[0]).join('').toUpperCase();
  
  const hasValidImage = member.image && !member.image.includes('ui-avatars.com');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [copied, setCopied] = useState(false);

  // --- DYNAMIC MENTOR COLOR LOGIC ---
  const mentorDeptStyle = useMemo(() => {
    if (!member.pairing?.id) return "bg-slate-900 text-white";
    
    // Find the mentor in the full team list to get their department
    const mentorObj = team.find(m => m.id === member.pairing?.id);
    
    // Fallback if not found (or data loading)
    if (!mentorObj) return "bg-slate-900 text-white";

    if (mentorObj.dept === "FOH") return "bg-[#004F71] text-white";
    if (mentorObj.dept === "BOH") return "bg-[#E51636] text-white";
    
    return "bg-slate-500 text-white";
  }, [member.pairing, team]);

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
          
          await addDoc(collection(db, "events"), {
                title: `Unit Transfer: ${newDept}`,
                type: "Operation",
                status: "Done",
                priority: "Medium",
                startDate: new Date(),
                endDate: new Date(),
                assignee: "System",
                assigneeName: "Command",
                teamMemberId: member.id,
                teamMemberName: member.name,
                description: `[SYSTEM LOG: TRANSFER]\nOperational unit reassignment to ${newDept}.`,
                createdAt: serverTimestamp()
          });

          toast.success(`Unit Updated: ${newDept}`, { id: loadToast });
      } catch(e) {
          console.error(e);
          toast.error("Transfer Failed", { id: loadToast });
          updateMemberLocal(member.id, { dept: member.dept });
      }
  };

  const copyEmail = () => {
      if (member.email) {
          navigator.clipboard.writeText(member.email);
          setCopied(true);
          toast.success("Email copied");
          setTimeout(() => setCopied(false), 2000);
      }
  };

  return (
    <div className="w-full lg:w-[340px] bg-white lg:bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto no-scrollbar relative z-30 transition-all duration-300">
        
        <div className="p-5 lg:p-8 flex flex-col items-center w-full">
            
            {/* TOP ROW: AVATAR + IDENTITY */}
            <div className="flex lg:flex-col items-center gap-5 lg:gap-6 w-full mb-6 lg:mb-0">
                
                {/* 1. AVATAR */}
                <div className="relative group/avatar cursor-pointer shrink-0" onClick={() => fileInputRef.current?.click()}>
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                    
                    <div className={cn(
                        "w-16 h-16 lg:w-32 lg:h-32 rounded-[20px] lg:rounded-[32px] p-1 shadow-sm lg:shadow-md border border-slate-100 lg:rotate-[-3deg] transition-transform group-hover/avatar:rotate-0 group-hover/avatar:scale-105 bg-white",
                    )}>
                        <div className="w-full h-full rounded-[16px] lg:rounded-[24px] overflow-hidden flex items-center justify-center bg-slate-50 relative">
                            {hasValidImage ? (
                                <img src={member.image} className="w-full h-full object-cover" alt="" />
                            ) : (
                                <span className={cn("text-xl lg:text-4xl font-black", brandText)}>{initials}</span>
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                                {isUploading ? <Loader2 className="w-5 h-5 lg:w-8 lg:h-8 text-white animate-spin" /> : <Camera className="w-5 h-5 lg:w-8 lg:h-8 text-white" />}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. IDENTITY */}
                <div className="flex-1 min-w-0 flex flex-col lg:items-center justify-center w-full">
                    <h2 className="text-xl lg:text-3xl font-[900] text-slate-900 tracking-tight lg:text-center leading-none mb-1.5 lg:mb-2 truncate w-full">{member.name}</h2>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] lg:mb-4 truncate">{member.role}</span>
                    
                    {/* MOBILE: Progress Bar */}
                    <div className="lg:hidden mt-2 w-full max-w-[200px]">
                        <div className="flex justify-between items-end mb-1">
                            <span className={cn("text-[8px] font-black uppercase tracking-widest", brandText)}>Growth</span>
                            <span className="text-[9px] font-black text-slate-900">{member.progress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                                className={cn("h-full rounded-full transition-all duration-1000", brandBg)} 
                                style={{ width: `${member.progress}%` }} 
                            />
                        </div>
                    </div>
                </div>

                {/* 3. PROGRESS RING (Desktop) */}
                <div className="hidden lg:flex flex-col items-center gap-2 mt-4">
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

            {/* SECOND ROW */}
            <div className="w-full mt-2 lg:mt-8 grid grid-cols-2 gap-3">
                
                {/* Unit Button */}
                <button 
                    onClick={toggleDepartment}
                    className={cn(
                        "col-span-2 flex items-center justify-between px-4 py-2.5 lg:py-3 rounded-xl lg:rounded-2xl border transition-all shadow-sm active:scale-95 group",
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

                {/* EMAIL BLOCK */}
                <button 
                    onClick={copyEmail}
                    className="col-span-1 lg:col-span-2 flex flex-col items-start p-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl lg:rounded-2xl transition-colors group text-left relative overflow-hidden h-full justify-center"
                >
                    <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-[7px] lg:text-[8px] font-black uppercase tracking-widest text-slate-400">EMAIL</span>
                        {copied ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5 text-slate-300 group-hover:text-[#004F71] opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </div>
                    <span className="text-[9px] lg:text-[11px] font-bold text-slate-700 truncate w-full block" title={member.email}>
                        {member.email || "No Email"}
                    </span>
                </button>

                {/* JOINED BLOCK */}
                <div className="col-span-1 lg:col-span-2 flex flex-col p-3 bg-slate-50 border border-slate-100 rounded-xl lg:rounded-2xl h-full justify-center">
                    <span className="text-[7px] lg:text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">JOINED</span>
                    <span className="text-[9px] lg:text-[11px] font-bold text-slate-700 truncate">
                        {member.joined ? format(new Date(member.joined), "MMM d, yyyy") : "N/A"}
                    </span>
                </div>
            </div>

            {/* MENTOR CARD (Fixed Color Logic) */}
            <div className="col-span-2 mt-4 group p-3 bg-white border border-slate-100 rounded-xl lg:rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-3 relative overflow-hidden">
                {member.pairing ? (
                    <>
                        <div className={cn("absolute left-0 top-0 bottom-0 w-1", mentorDeptStyle.includes("bg-[#004F71]") ? "bg-[#004F71]" : mentorDeptStyle.includes("bg-[#E51636]") ? "bg-[#E51636]" : "bg-slate-500")} />
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 shrink-0 overflow-hidden relative shadow-sm">
                            {member.pairing.image ? (
                                <img src={member.pairing.image} alt={member.pairing.name} className="w-full h-full object-cover" />
                            ) : (
                                // APPLYING THE DYNAMIC COLOR HERE
                                <div className={cn("w-full h-full flex items-center justify-center font-black text-sm", mentorDeptStyle)}>
                                    {member.pairing.name.charAt(0)}
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1.5">
                                <Link2 className="w-3 h-3 text-slate-400" /> Assigned Mentor
                            </p>
                            <p className="text-sm font-black text-slate-900 truncate">
                                {member.pairing.name}
                            </p>
                        </div>
                    </>
                ) : (
                     <>
                        <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 shrink-0 border border-dashed border-slate-200">
                            <User className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Mentorship</p>
                            <p className="text-xs font-bold text-slate-300 italic">Unassigned</p>
                        </div>
                     </>
                )}
            </div>

            {isUnassigned && (
                <div className="mt-4 flex items-center gap-2 text-red-500 bg-red-50 px-3 py-2 rounded-xl border border-red-100 w-full justify-center">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-black uppercase tracking-wide">Action Required</span>
                </div>
            )}
        </div>
    </div>
  );
}