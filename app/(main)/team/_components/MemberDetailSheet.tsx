// --- FILE: ./app/(main)/team/_components/MemberDetailSheet.tsx ---
"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useDragControls, PanInfo } from "framer-motion";
import { 
  X, Check, Terminal, Trophy, Plus, 
  MessageSquare, Activity, Sparkles, 
  BookOpen, Loader2, ShieldCheck, Target, 
  Crown, Award, Medal, Shield, Clock, Zap, ChevronRight, 
  Maximize2, Layers, HardDrive, ClipboardCheck, 
  ArrowUpRight, Save, ChevronLeft, ChevronDown, 
  Command, TrendingUp, Lightbulb, Minimize2, ExternalLink, 
  GripHorizontal, Users, Link2, FileWarning,
  Mail, Calendar, Camera // Added Icons
} from "lucide-react";
import { 
    formatDistanceToNow, parseISO, startOfWeek, startOfMonth, endOfWeek, endOfMonth, 
    eachDayOfInterval, isSameDay, isBefore, isWithinInterval, isSameMonth, subMonths, addMonths, format 
} from "date-fns";
import { cn } from "@/lib/utils";

// --- IMPORTS ---
import { db, storage } from "@/lib/firebase"; 
import { collection, addDoc, serverTimestamp, doc, setDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAppStore } from "@/lib/store/useStore";
import { TeamMember, STAGES, EventType, getEventLabel, getTypeColor, CalendarEvent } from "../../calendar/_components/types";
import { TACTICAL_ICONS } from "@/lib/icon-library";
import toast from "react-hot-toast";
import { Badge } from "./Badge";
import OneOnOneSessionModal from "../../calendar/_components/OneOnOneSessionModal";

// --- HELPERS ---

function ClientPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  return mounted ? createPortal(children, document.body) : null;
}

function ManualViewerModal({ url, title, pages, onClose, color }: { url: string, title: string, pages: string, onClose: () => void, color: string }) {
    const [loading, setLoading] = useState(true);
    const dragControls = useDragControls();

    return (
        <ClientPortal>
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div 
                initial={{ y: "100%" }} 
                animate={{ y: 0 }} 
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                drag="y"
                dragControls={dragControls}
                dragListener={false} 
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.05}
                onDragEnd={(_, info: PanInfo) => {
                    if (info.offset.y > 100) onClose();
                }}
                className="fixed bottom-0 left-0 right-0 z-[210] h-[92vh] bg-white rounded-t-[40px] shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
            >
                <div 
                    className="absolute top-0 left-0 right-0 h-14 z-50 flex items-start justify-center pt-3 cursor-grab active:cursor-grabbing touch-none bg-gradient-to-b from-white via-white to-transparent"
                    onPointerDown={(e) => dragControls.start(e)}
                >
                    <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
                </div>

                <div className="flex items-center justify-between px-8 pt-10 pb-4 border-b border-slate-100 bg-white shrink-0 relative z-40">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className={cn("w-2 h-2 rounded-full", color === 'bg-[#004F71]' ? 'bg-[#004F71]' : 'bg-[#E51636]')} />
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Manual Viewer</p>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 leading-none tracking-tight">{title}</h3>
                    </div>
                    <button onClick={onClose} className="p-3 bg-slate-50 rounded-full hover:bg-slate-100 transition-all border border-slate-100">
                        <Minimize2 className="w-5 h-5 text-slate-500" />
                    </button>
                </div>
                
                <div className="relative flex-1 bg-slate-50 overflow-hidden">
                    {loading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-0">
                            <Loader2 className={cn("w-10 h-10 animate-spin", color === 'bg-[#004F71]' ? "text-[#004F71]" : "text-[#E51636]")} />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Retrieving Data...</p>
                        </div>
                    )}
                    <iframe 
                        src={url} 
                        className="w-full h-full border-none relative z-10" 
                        onLoad={() => setLoading(false)}
                    />
                </div>

                <div className="px-8 py-6 border-t border-slate-100 bg-white flex justify-between items-center safe-area-pb shrink-0 relative z-40">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Scope</span>
                        <span className="text-sm font-bold text-slate-900">Pages {pages}</span>
                    </div>
                    <div className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg", color)}>
                        Read Only
                    </div>
                </div>
            </motion.div>
        </ClientPortal>
    );
}

function IntegratedRangePicker({ start, end, onChange }: { start: Date, end: Date, onChange: (s: Date, e: Date) => void }) {
    const [viewDate, setViewDate] = useState(start);
    const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(viewDate)), end: endOfWeek(endOfMonth(viewDate)) });
    const handleDateClick = (clickedDate: Date) => { if (isSameDay(start, end)) isBefore(clickedDate, start) ? onChange(clickedDate, clickedDate) : onChange(start, clickedDate); else onChange(clickedDate, clickedDate); };
    return (
        <div className="w-full bg-white rounded-[32px] p-5 border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-center mb-6 px-1">
                <div className="flex flex-col"><span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em] mb-1">Calendar</span><span className="text-[11px] font-black text-[#E51636] uppercase tracking-widest">{format(viewDate, "MMMM yyyy")}</span></div>
                <div className="flex gap-1.5"><button onClick={() => setViewDate(subMonths(viewDate, 1))} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-all"><ChevronLeft className="w-4 h-4" /></button><button onClick={() => setViewDate(addMonths(viewDate, 1))} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-all"><ChevronRight className="w-4 h-4" /></button></div>
            </div>
            <div className="grid grid-cols-7 gap-1">
                {["S","M","T","W","T","F","S"].map((d, i) => <div key={i} className="h-6 flex items-center justify-center text-[9px] font-black text-slate-200 uppercase">{d}</div>)}
                {days.map(d => {
                    const isStart = isSameDay(d, start);
                    const isEnd = isSameDay(d, end);
                    const inRange = isWithinInterval(d, { start, end });
                    const isCurrentMonth = isSameMonth(d, viewDate);
                    return (
                        <button key={d.toString()} onClick={() => handleDateClick(d)} className={cn("h-9 w-full flex items-center justify-center text-xs font-bold transition-all relative rounded-xl", !isCurrentMonth && "opacity-5", inRange && !isStart && !isEnd && "bg-red-50 text-[#E51636] rounded-none", (isSameDay(d, start) || isSameDay(d, end)) && "bg-[#E51636] text-white shadow-lg z-10")}>{format(d, "d")}</button>
                    );
                })}
            </div>
        </div>
    );
}

function WebAppDropdown({ label, icon: Icon, options, selected, onSelect, placeholder }: any) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="relative space-y-1.5">
            <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2 px-1">
                <Icon className="w-3 h-3" /> {label}
            </label>
            <button onClick={() => setIsOpen(!isOpen)} className={cn("w-full flex items-center justify-between px-4 py-3.5 bg-white border rounded-[20px] transition-all duration-300 shadow-sm", isOpen ? "border-[#E51636] ring-4 ring-red-500/5 shadow-md" : "border-slate-200 hover:border-slate-300")}>
                <div className="flex items-center gap-3 text-left overflow-hidden">
                    {selected ? (
                        <>
                            <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center overflow-hidden shrink-0 font-black text-[10px] text-white shadow-sm", selected.dept === 'FOH' ? 'bg-[#004F71]' : 'bg-[#E51636]')}>{selected.name.charAt(0)}</div>
                            <span className="text-xs font-bold text-slate-800 truncate">{selected.name}</span>
                        </>
                    ) : <span className="text-xs font-bold text-slate-400">{placeholder}</span>}
                </div>
                <ChevronDown className={cn("w-4 h-4 text-slate-300 transition-transform duration-300", isOpen && "rotate-180")} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ opacity: 0, y: 5, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: 0.98 }} className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden py-1 ring-1 ring-black/5">
                        <div className="max-h-56 overflow-y-auto custom-scrollbar">
                            {options.map((opt: TeamMember) => (
                                <button key={opt.id} onClick={() => { onSelect(opt); setIsOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0 group">
                                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-md", opt.dept === 'FOH' ? 'bg-[#004F71]' : 'bg-[#E51636]')}>{opt.name.charAt(0)}</div>
                                    <div className="flex flex-col"><span className="text-xs font-bold text-slate-700 group-hover:text-[#E51636] transition-colors">{opt.name}</span><div className="flex items-center gap-1.5"><span className={cn("text-[7px] font-black uppercase px-1.5 py-0.5 rounded-md", opt.dept === 'FOH' ? 'bg-blue-50 text-[#004F71]' : 'bg-red-50 text-[#E51636]')}>{opt.dept}</span><span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{opt.role}</span></div></div>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

const CANVA_LINKS = {
  FOH: "https://www.canva.com/design/DAG7sot3RWY/Sv-7Y3IEyBqUUFB999JiPA/view",
  BOH: "https://www.canva.com/design/DAG7ssYg444/FFZwbb8mLfLGiGrP2VeHiA/view"
};

const CATEGORIES: { id: EventType; icon: any }[] = [
    { id: "Training", icon: Shield }, 
    { id: "Goal", icon: Target },
    { id: "Deadline", icon: Zap }, 
    { id: "Operation", icon: Activity },
    { id: "OneOnOne", icon: MessageSquare },
];

interface Props {
  member: TeamMember; 
  onClose: () => void;
  activeTab: "overview" | "curriculum" | "performance";
  setActiveTab: (t: "overview" | "curriculum" | "performance") => void;
}

export const MemberDetailSheet = ({ member: initialMember, onClose, activeTab, setActiveTab }: Props) => {
  const { events, team, curriculum, subscribeCurriculum } = useAppStore();
  
  const liveMember = useMemo(() => 
    team.find(m => m.id === initialMember.id), 
  [team, initialMember.id]);

  const member = liveMember || initialMember;

  // --- UPLOAD STATE ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [localCompletedIds, setLocalCompletedIds] = useState<string[]>(member.completedTaskIds || []);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logDraft, setLogDraft] = useState({ title: "", type: "Training" as EventType, priority: "Medium" as any, startDate: new Date(), endDate: new Date(), description: "", assignee: "", assigneeName: "" });
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const [isBriefingFocused, setIsBriefingFocused] = useState(false);
  const [selectedSession, setSelectedSession] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  useEffect(() => {
    if (member.completedTaskIds) {
        setLocalCompletedIds(member.completedTaskIds);
    }
  }, [member.completedTaskIds]);

  useEffect(() => {
    const unsub = subscribeCurriculum();
    return () => unsub();
  }, [subscribeCurriculum]);

  const isFOH = member.dept === "FOH";
  const brandBg = isFOH ? 'bg-[#004F71]' : 'bg-[#E51636]';
  const brandText = isFOH ? 'text-[#004F71]' : 'text-[#E51636]';
  const initials = member.name.split(' ').map(n => n[0]).join('').toUpperCase();

  // --- IMAGE UPLOAD HANDLER ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      const file = e.target.files[0];
      const storageRef = ref(storage, `team-avatars/${member.id}/${file.name}`);
      try {
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        
        await setDoc(doc(db, "profileOverrides", member.id), {
          image: url,
          updatedAt: serverTimestamp()
        }, { merge: true });

        toast.success("Identity Updated");
      } catch (error) {
        console.error(error);
        toast.error("Upload Failed");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const hasValidImage = member.image && !member.image.includes('ui-avatars.com');

  const filteredCurriculum = useMemo(() => curriculum.filter(s => s.dept === member.dept), [curriculum, member.dept]);
  const activeSection = useMemo(() => filteredCurriculum.find(s => s.id === selectedSectionId), [filteredCurriculum, selectedSectionId]);
  const assignedEvents = useMemo(() => events.filter(e => e.teamMemberId === member.id || e.assignee === member.id), [events, member.id]);

  const timelineData = useMemo(() => {
    const history: any[] = [];
    assignedEvents.forEach(e => {
        let category = 'MISSION';
        if (e.type === 'Goal') category = 'GOAL';
        else if (e.type === 'OneOnOne') category = '1-ON-1';
        if (e.title === "Mentorship Uplink") category = 'SYSTEM';

        const rawDescription = e.description || "";
        const parts = rawDescription.split(/\[SESSION SUMMARY\]|\[KEY OUTCOMES\]|\[FOLLOW UP SCHEDULED:/);
        const goal = parts[0]?.trim() || "";
        let summary = "";
        const summaryMatch = rawDescription.match(/\[SESSION SUMMARY\]([\s\S]*?)(?=\[FOLLOW UP|$)/) || 
                             rawDescription.match(/\[KEY OUTCOMES\]([\s\S]*?)(?=\[FOLLOW UP|$)/);
        if (summaryMatch) {
            summary = summaryMatch[1].trim();
        }

        history.push({ 
            id: e.id, 
            date: e.startDate, 
            title: e.title, 
            type: e.type, 
            category,
            status: e.status,
            goal,    
            summary, 
            rawEvent: e,
            mentorName: e.assigneeName 
        });
    });

    if(member.badges) {
        member.badges.forEach((b: any) => history.push({ id: b.awardedId || b.id, date: b.timestamp ? parseISO(b.timestamp) : new Date(), title: b.label, category: 'AWARD', hex: b.hex, iconId: b.iconId, description: `Identity module successfully validated.` }));
    }
    return history.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [assignedEvents, member.badges]);

  const handleVerifyTask = async (taskId: string, sectionId: string) => {
      const wasCompleted = localCompletedIds.includes(taskId);
      const newLocalIds = wasCompleted ? localCompletedIds.filter(id => id !== taskId) : [...localCompletedIds, taskId];
      setLocalCompletedIds(newLocalIds); 
      const section = filteredCurriculum.find(s => s.id === sectionId);
      const taskTitle = section?.tasks?.find((t: any) => t.id === taskId)?.title || "Training Module";
      let totalTasks = 0;
      filteredCurriculum.forEach(sec => totalTasks += (sec.tasks?.length || 0));
      const newProgress = totalTasks > 0 ? Math.round((newLocalIds.length / totalTasks) * 100) : 0;
      const toastId = toast.loading("Syncing...");
      try {
          const memberRef = doc(db, "profileOverrides", member.id);
          await setDoc(memberRef, { completedTaskIds: wasCompleted ? arrayRemove(taskId) : arrayUnion(taskId), progress: newProgress, updatedAt: serverTimestamp() }, { merge: true });
          const baseLog = { type: "Training", status: "Done", startDate: new Date(), endDate: new Date(), teamMemberId: member.id, teamMemberName: member.name, assignee: "System", assigneeName: "TrainingBot", createdAt: serverTimestamp() };
          if (!wasCompleted) { await addDoc(collection(db, "events"), { ...baseLog, title: `Module Certified: ${taskTitle}`, priority: "Low", description: `Proficiency demonstrated in ${section?.title || 'Training Phase'}. Module "${taskTitle}" verified.` }); } 
          else { await addDoc(collection(db, "events"), { ...baseLog, title: `Module Reset: ${taskTitle}`, priority: "Medium", description: `Verification for module "${taskTitle}" was manually revoked. Status returned to Pending.` }); }
          toast.success(wasCompleted ? "Module Reset" : "Module Logged", { id: toastId });
      } catch (error) {
          toast.error("Sync Failed", { id: toastId });
          setLocalCompletedIds(localCompletedIds); 
      }
  };

  const handleTimelineItemClick = (item: any) => { if (item.type === 'OneOnOne' && item.rawEvent) { setSelectedSession(item.rawEvent); } };
  const handleUpdateEvent = async (updatedEvent: CalendarEvent) => { try { await updateDoc(doc(db, "events", updatedEvent.id), { description: updatedEvent.description, subtasks: updatedEvent.subtasks, status: updatedEvent.status, updatedAt: serverTimestamp() }); toast.success("Session Updated"); setSelectedSession(null); } catch (e) { toast.error("Update Failed"); } };
  const handleDeployLog = async () => { if (!logDraft.title) return toast.error("Identify mission objective"); try { await addDoc(collection(db, "events"), { ...logDraft, teamMemberId: member.id, teamMemberName: member.name, status: "Done", createdAt: serverTimestamp() }); toast.success("Log Deployed Successfully"); setIsLogModalOpen(false); setLogDraft({ title: "", type: "Training", priority: "Medium", startDate: new Date(), endDate: new Date(), description: "", assignee: "", assigneeName: "" }); } catch (e) { toast.error("Deployment failed"); } };
  const getEmbedUrl = () => { const base = CANVA_LINKS[member.dept as keyof typeof CANVA_LINKS]?.split('?')[0] || CANVA_LINKS.FOH; const page = activeSection?.pageStart || 1; return `${base}?embed#${page}`; };
  const EmptyState = ({ title, message }: { title: string, message: string }) => (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8 border-2 border-dashed border-slate-200 rounded-[32px] bg-slate-50/50">
          <div className="p-4 bg-white rounded-full shadow-sm mb-4">
              <FileWarning className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-1">{title}</h3>
          <p className="text-xs text-slate-400 font-medium max-w-[200px]">{message}</p>
      </div>
  );

  return (
    <ClientPortal>
      {/* Backdrop */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      
      {/* Main Container */}
      <motion.div 
        initial={{ y: "100%", x: 0 }} 
        animate={{ y: 0, x: 0 }} 
        exit={{ y: "100%", x: 0 }} 
        transition={{ type: "spring", damping: 30, stiffness: 250 }}
        className="fixed inset-0 z-[110] bg-white shadow-2xl flex flex-col lg:flex-row overflow-hidden lg:inset-y-4 lg:right-4 lg:left-auto lg:w-full lg:max-w-[1500px] lg:rounded-[60px] lg:border-l lg:border-slate-200"
      >
        
        {/* --- 1. HEADER (Sidebar) --- */}
        <div className="w-full lg:w-[340px] bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col p-6 lg:p-10 shrink-0 relative overflow-y-auto lg:overflow-visible no-scrollbar">
            <button onClick={onClose} className="lg:hidden absolute top-4 right-4 p-2 bg-white rounded-full shadow-sm text-slate-400 z-50 active:scale-90 transition-transform">
                <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-4 lg:space-y-8 pt-2 lg:pt-4">
                <div className="relative inline-block group/avatar cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                    
                    <div className="w-20 h-20 lg:w-32 lg:h-32 rounded-[28px] lg:rounded-[44px] p-1.5 bg-white shadow-2xl border border-slate-100 mx-auto overflow-hidden lg:rotate-[-2deg] transition-transform group-hover/avatar:scale-105 group-hover/avatar:rotate-0">
                        <div className="w-full h-full rounded-[20px] lg:rounded-[34px] overflow-hidden flex items-center justify-center bg-slate-50 relative">
                            {hasValidImage ? (
                                <img src={member.image} className="w-full h-full object-cover" alt="" />
                            ) : (
                                <span className={cn("text-2xl lg:text-4xl font-bold", brandText)}>{initials}</span>
                            )}
                            
                            {/* Hover Overlay for Upload */}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300">
                                {isUploading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
                            </div>
                        </div>
                    </div>
                </div>
                <div>
                    <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-1 tracking-tight leading-none">{member.name}</h2>
                    <div className="flex flex-row lg:flex-col items-center justify-center gap-2 lg:gap-3 mt-2 lg:mt-4">
                        <Badge color={isFOH ? 'blue' : 'red'} className="border-2 shadow-sm font-black">{member.dept} UNIT</Badge>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{member.role}</span>
                    </div>

                    {/* --- ADDED: Email & Join Date Block --- */}
                    <div className="mt-6 flex flex-col items-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full shadow-sm max-w-full">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-[10px] font-bold text-slate-600 truncate">{member.email || "No Email Linked"}</span>
                        </div>
                        
                        {member.joined && (
                            <div className="flex items-center gap-1.5 text-slate-400 opacity-80 hover:opacity-100 transition-opacity">
                                <Calendar className="w-3 h-3" />
                                <span className="text-[9px] font-black uppercase tracking-widest">
                                    Joined {format(new Date(member.joined), "MMMM do, yyyy")}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="relative w-full p-4 lg:p-6 rounded-[24px] lg:rounded-[36px] bg-white border border-slate-100 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05)] overflow-hidden group hover:shadow-xl transition-all duration-500 hidden md:block">
                    <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-b", isFOH ? "from-blue-50/50 to-transparent" : "from-red-50/50 to-transparent")} />
                    <div className={cn("absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br opacity-20 blur-[50px] rounded-full transition-all duration-1000 group-hover:scale-125", isFOH ? "from-blue-400 to-cyan-300" : "from-[#E51636] to-orange-400")} />

                    <div className="relative z-10 flex flex-col items-center gap-4">
                        <div className="relative w-24 h-24 lg:w-32 lg:h-32 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="50%" cy="50%" r="45%" className="text-slate-100" strokeWidth="8" stroke="currentColor" fill="transparent" />
                                <motion.circle 
                                    initial={{ strokeDashoffset: 364 }}
                                    animate={{ strokeDashoffset: 364 - (364 * member.progress) / 100 }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    cx="50%" cy="50%" r="45%" 
                                    className={cn(isFOH ? "text-[#004F71]" : "text-[#E51636]")} 
                                    strokeWidth="8" strokeLinecap="round" stroke="currentColor" fill="transparent" strokeDasharray="364" 
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={cn("text-2xl lg:text-3xl font-[1000] tracking-tighter leading-none", brandText)}>
                                    {member.progress}<span className="text-sm align-top ml-0.5 opacity-60">%</span>
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-50 border border-slate-100 shadow-sm">
                            <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Progress</span>
                        </div>
                    </div>
                </div>
                
                <div className="md:hidden w-full space-y-1">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span>Curriculum</span>
                        <span>{member.progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", isFOH ? "bg-[#004F71]" : "bg-[#E51636]")} style={{ width: `${member.progress}%` }} />
                    </div>
                </div>
            </div>
        </div>

        {/* --- 2. MAIN CONTENT AREA --- */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
          
          {/* TABS HEADER */}
          <div className="px-4 lg:px-12 h-16 lg:h-24 flex items-center justify-between border-b border-slate-100 shrink-0 bg-white z-20 overflow-x-auto no-scrollbar">
             <div className="flex gap-6 lg:gap-12 min-w-full lg:min-w-0">
                {['overview', 'curriculum', 'performance'].map(tab => (
                   <button key={tab} onClick={() => { setActiveTab(tab as any); setSelectedSectionId(null); }} className="relative py-5 lg:py-9 group outline-none shrink-0">
                      <span className={cn("text-[10px] lg:text-xs font-bold uppercase tracking-[0.15em] transition-all", activeTab === tab ? "text-slate-900" : "text-slate-400 hover:text-slate-600")}>{tab}</span>
                      {activeTab === tab && <motion.div layoutId="detailTab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#E51636] rounded-t-full shadow-[0_-4px_10px_rgba(229,22,54,0.2)]" />}
                   </button>
                ))}
             </div>
             <button onClick={onClose} className="hidden lg:block p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-[#E51636] transition-all border border-slate-100 shadow-sm"><X className="w-6 h-6" /></button>
          </div>

          {/* SCROLLABLE BODY */}
          <div className="flex-1 overflow-hidden">
             <AnimatePresence mode="wait">
                
                {/* --- TAB: OVERVIEW --- */}
                {activeTab === 'overview' && (
                    <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 lg:p-12 space-y-6 lg:space-y-10 overflow-y-auto h-full custom-scrollbar bg-slate-50/20 pb-24">
                        
                        {/* MENTOR CARD */}
                        {member.pairing ? (
                            <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm flex items-center justify-between relative overflow-hidden group">
                                <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", isFOH ? "bg-[#004F71]" : "bg-[#E51636]")} />
                                <div className="flex items-center gap-4 pl-3">
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-2xl p-0.5 bg-gradient-to-br from-slate-100 to-slate-200 shadow-sm">
                                            <img src={member.pairing.image} className="w-full h-full rounded-[14px] object-cover" />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 ring-2 ring-white rounded-full p-0.5">
                                            <Zap className="w-2.5 h-2.5 text-white fill-current" />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <h4 className="text-sm font-bold text-slate-900 leading-none">{member.pairing.name}</h4>
                                            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[8px] font-black uppercase text-slate-500 tracking-wider">Mentor</span>
                                        </div>
                                        <p className="text-[10px] font-medium text-slate-400">{member.pairing.role}</p>
                                    </div>
                                </div>
                                <div className="hidden md:flex flex-col items-end mr-2">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">Active Uplink</span>
                                </div>
                            </div>
                        ) : (
                            <div className="p-5 rounded-[28px] border-2 border-dashed border-slate-100 flex items-center justify-center gap-3 text-slate-300">
                                <Users className="w-5 h-5" />
                                <span className="text-[10px] font-black uppercase tracking-widest">No Mentor Assigned</span>
                            </div>
                        )}

                        <div className="bg-white p-6 lg:p-10 rounded-[32px] lg:rounded-[56px] border border-slate-100 shadow-sm overflow-x-auto">
                            <h4 className="text-[10px] lg:text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] mb-8 lg:mb-12 text-center min-w-[500px]">Unit Deployment Status</h4>
                            <div className="flex justify-between px-2 lg:px-6 relative min-w-[500px]">
                                <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-100" />
                                {STAGES.map((s, i) => { 
                                    const currentIdx = STAGES.findIndex(x => x.id === member.status); 
                                    const isDone = i < currentIdx; 
                                    const isCurrent = i === currentIdx; 
                                    return (
                                        <div key={s.id} className="relative z-10 flex flex-col items-center gap-4">
                                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all shadow-lg", isDone ? "bg-emerald-500 border-emerald-400 text-white" : isCurrent ? "bg-white border-[#E51636] text-[#E51636] ring-8 ring-red-50 scale-110 shadow-xl" : "bg-white border-slate-100 text-slate-200")}>
                                                {isDone ? <Check className="w-5 h-5" /> : i+1}
                                            </div>
                                            <span className={cn("text-[9px] lg:text-[10px] font-bold uppercase tracking-widest", isCurrent ? "text-slate-900" : "text-slate-300")}>{s.title}</span>
                                        </div>
                                    ) 
                                })}
                            </div>
                        </div>

                        <div className="space-y-4 lg:space-y-6">
                            <div className="flex items-center gap-3 px-2 lg:px-4">
                                <Award className="w-5 lg:w-6 h-5 lg:h-6 text-amber-500" />
                                <span className="text-xs font-black uppercase tracking-widest text-slate-900">Validated Accolades</span>
                            </div>
                            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 lg:pb-2 pl-2">
                                {member.badges?.map((badge: any, i: number) => { 
                                    const Icon = TACTICAL_ICONS.find(ic => ic.id === badge.iconId)?.icon || Medal; 
                                    return (
                                        <div key={i} className="min-w-[180px] lg:min-w-[220px] p-5 lg:p-6 rounded-[32px] lg:rounded-[44px] bg-white border border-slate-100 shadow-sm flex flex-col items-center text-center gap-4 hover:shadow-xl transition-all">
                                            <div className="p-3 lg:p-4 rounded-2xl shadow-inner" style={{ backgroundColor: `${badge.hex}10`, color: badge.hex }}><Icon className="w-6 h-6 lg:w-8 lg:h-8" /></div>
                                            <span className="text-[10px] lg:text-xs font-bold text-slate-800 uppercase tracking-tight line-clamp-2">{badge.label}</span>
                                        </div>
                                    ) 
                                })}
                                {(!member.badges || member.badges.length === 0) && (
                                    <div className="w-full text-center py-8 border-2 border-dashed border-slate-200 rounded-[32px] text-slate-300">
                                        <p className="text-[10px] font-bold uppercase tracking-widest">No badges awarded</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white p-6 lg:p-10 rounded-[32px] lg:rounded-[56px] border border-slate-100 shadow-sm space-y-6 lg:space-y-8">
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 lg:p-3 bg-slate-900 text-white rounded-xl lg:rounded-2xl shadow-lg"><Command className="w-4 h-4 lg:w-5 lg:h-5" /></div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] lg:text-xs font-black uppercase tracking-[0.2em] text-slate-300">Command Center</span>
                                        <span className="text-base lg:text-xl font-bold text-slate-900">Intelligence</span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                                <div className="lg:col-span-7 space-y-6 lg:space-y-8 relative pl-4 lg:pl-6 border-l-2 border-slate-50">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Activity className="w-4 h-4 text-[#E51636]" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Activity Stream</span>
                                    </div>
                                    <div className="space-y-6 lg:space-y-8">
                                            {timelineData.length > 0 ? timelineData.slice(0, 5).map((item, idx) => {
                                                const isSystem = item.category === 'SYSTEM';
                                                return (
                                                    <div key={idx} className="relative group">
                                                        <div className="absolute -left-[23px] lg:-left-[31px] top-1.5 w-3 h-3 lg:w-4 lg:h-4 rounded-full border-[3px] border-white bg-slate-200 group-hover:bg-[#E51636] transition-all shadow-md z-10" />
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2 lg:gap-3">
                                                                <span className={cn("px-2 py-0.5 rounded-md text-[8px] lg:text-[9px] font-black uppercase", item.category === 'MISSION' ? 'bg-blue-50 text-[#004F71]' : item.category === '1-ON-1' ? 'bg-purple-50 text-purple-700' : item.category === 'SYSTEM' ? 'bg-slate-900 text-white' : 'bg-emerald-50 text-emerald-600')}>{item.category}</span>
                                                                <span className="text-[9px] lg:text-[10px] font-bold text-slate-300 uppercase">{formatDistanceToNow(item.date)} ago</span>
                                                            </div>
                                                            <p className="text-sm lg:text-base font-bold text-slate-800 tracking-tight line-clamp-1">{item.title}</p>
                                                        </div>
                                                    </div>
                                                );
                                            }) : (
                                                <div className="text-slate-300 text-xs italic pl-2">No recent activity detected.</div>
                                            )}
                                    </div>
                                </div>
                                <div className="lg:col-span-5 space-y-4">
                                    <div className="flex items-center gap-2 mb-2 px-1">
                                        <Target className="w-4 h-4 text-[#004F71]" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Key Objectives</span>
                                    </div>
                                    {timelineData.filter(i => i.category === 'GOAL' || i.category === '1-ON-1').length > 0 ? (
                                        timelineData.filter(i => i.category === 'GOAL' || i.category === '1-ON-1').slice(0, 3).map((item, idx) => (
                                        <div key={idx} onClick={() => handleTimelineItemClick(item)} className={cn("p-5 lg:p-6 bg-slate-50 border border-slate-100 rounded-[24px] lg:rounded-[32px] shadow-sm hover:shadow-lg transition-all cursor-pointer relative overflow-hidden", item.category === '1-ON-1' && "border-purple-100/50 bg-purple-50/20")}>
                                            <div className="flex justify-between items-start mb-3 relative z-10">
                                                <div className="flex items-center gap-2">
                                                    {item.category === '1-ON-1' && <div className="p-1 bg-purple-100 text-purple-600 rounded-lg"><Lightbulb className="w-3 h-3" /></div>}
                                                    <p className="text-sm font-bold leading-tight text-slate-800 line-clamp-1">{item.title}</p>
                                                </div>
                                            </div>
                                            {item.category === 'GOAL' ? (
                                                <div className="space-y-2 relative z-10"><div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: '70%' }} className="h-full bg-[#E51636]" /></div></div>
                                            ) : (
                                                <div className="space-y-3 relative z-10">
                                                    <div><div className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Goal</div><p className="text-[11px] font-medium text-slate-700 leading-snug line-clamp-2">{item.goal || "No goal recorded."}</p></div>
                                                </div>
                                            )}
                                        </div>
                                    ))) : (
                                        <div className="p-6 border-2 border-dashed border-slate-100 rounded-[24px] text-center text-slate-300 text-xs">No active objectives</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
                
                {/* --- TAB: CURRICULUM --- */}
                {activeTab === 'curriculum' && (
                   <motion.div key="curriculum" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col bg-white">
                      {filteredCurriculum.length === 0 ? (
                          <div className="h-full flex items-center justify-center p-8 bg-slate-50/30">
                              <EmptyState title="No Curriculum Found" message={`No training modules have been assigned to the ${member.dept} department yet.`} />
                          </div>
                      ) : !selectedSectionId ? (
                         <div className="p-4 lg:p-10 grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 overflow-y-auto h-full bg-slate-50/30 pb-24">
                            {filteredCurriculum.map((section, i) => (
                                <motion.div whileHover={{ y: -5, scale: 1.01 }} key={section.id} onClick={() => { setSelectedSectionId(section.id); setIframeLoading(true); }} className="p-6 lg:p-8 rounded-[32px] lg:rounded-[48px] bg-white border border-slate-200 transition-all duration-500 cursor-pointer shadow-sm hover:shadow-xl relative overflow-hidden group flex flex-col justify-between h-[220px] lg:h-[320px]">
                                    <div className={cn("absolute -inset-16 opacity-0 group-hover:opacity-5 blur-[80px] rounded-[100px] transition-opacity duration-700", brandBg)} />
                                    <div className={cn("absolute top-6 right-6 px-3 py-1.5 rounded-2xl flex flex-col items-center font-black text-white shadow-xl", brandBg)}><span className="text-[7px] opacity-60 uppercase tracking-widest leading-none mb-0.5">PHASE</span><span className="text-sm leading-none">0{i + 1}</span></div>
                                    <div className="space-y-4 lg:space-y-6 relative z-10"><div className={cn("p-3 lg:p-4 rounded-3xl text-white shadow-lg w-fit", brandBg)}><HardDrive className="w-4 h-4 lg:w-5 lg:h-5" /></div><div><h4 className="text-lg lg:text-2xl font-bold text-slate-900 group-hover:text-[#E51636] transition-colors tracking-tight line-clamp-2">{section.title}</h4><p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Manual pgs {section.pageStart}-{section.pageEnd}</p></div></div>
                                    <div className="space-y-4 relative z-10"><div className="flex items-center gap-2 text-slate-400"><Layers className="w-4 h-4" /><span className="text-[10px] font-bold uppercase tracking-widest">{section.tasks?.length || 0} Modules</span></div></div>
                                </motion.div>
                            ))}
                         </div>
                      ) : (
                         <div className="h-full flex flex-col">
                            <div className="px-4 lg:px-8 h-16 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 shadow-[0_4px_20px_rgba(0,0,0,0.02)] z-30">
                                <button onClick={() => setSelectedSectionId(null)} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 text-[10px] font-bold transition-all bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-slate-200">
                                    <ChevronLeft className="w-4 h-4" /> Back
                                </button>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs lg:text-sm font-bold text-slate-900 tracking-tight truncate max-w-[150px] lg:max-w-none">{activeSection?.title}</span>
                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                                </div>
                            </div>
                            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
                                <div className="hidden lg:block flex-1 relative p-8 pb-12 overflow-hidden bg-slate-50/50">
                                    <div className="relative h-full w-full rounded-[40px] shadow-xl border border-white bg-white overflow-hidden ring-1 ring-black/5">
                                        <iframe src={getEmbedUrl()} className="w-full h-full border-none" onLoad={() => setIframeLoading(false)} />
                                        {iframeLoading && <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white gap-4"><Loader2 className="w-10 h-10 animate-spin text-[#E51636]" /><p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Loading Manual...</p></div>}
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar bg-white border-l border-slate-100 relative pb-32 lg:pb-20">
                                    <div className="lg:hidden p-4 pb-0">
                                        <button onClick={() => setIsManualModalOpen(true)} className={cn("w-full p-6 rounded-[32px] text-white shadow-xl relative overflow-hidden group flex items-center justify-between", brandBg)}>
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
                                            <div className="relative z-10 flex items-center gap-4"><div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md"><BookOpen className="w-6 h-6 text-white" /></div><div className="text-left"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 mb-1">Mission Brief</p><p className="text-xl font-bold leading-none">View Manual</p></div></div><div className="relative z-10 p-2 bg-white/10 rounded-full"><ExternalLink className="w-5 h-5 text-white" /></div>
                                        </button>
                                    </div>
                                    <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-slate-50 px-6 py-4 mt-2">
                                            <div className="flex items-center gap-3"><div className="p-2 bg-slate-50 text-slate-400 rounded-xl shadow-sm border border-slate-100"><ClipboardCheck className="w-4 h-4" /></div><div className="flex flex-col"><span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-300">Curriculum</span><span className="text-sm font-bold text-slate-900">Modules</span></div></div>
                                    </div>
                                    <div className="p-6 lg:p-10 pb-20 relative">
                                            <div className="absolute left-[39px] lg:left-[55px] top-10 bottom-0 w-0.5 bg-slate-100" />
                                            <div className="space-y-8 relative z-10">
                                                {activeSection?.tasks?.map((task: any, idx: number) => {
                                                    const isCompleted = localCompletedIds.includes(task.id);
                                                    return (
                                                        <div key={task.id} className="group relative pl-4">
                                                            <div className={cn("absolute left-[-23px] top-8 w-4 h-4 rounded-full border-[3px] border-white shadow-md z-20 transition-colors", isCompleted ? "bg-emerald-500" : "bg-slate-200")} />
                                                            <div className={cn("p-6 lg:p-8 bg-white rounded-[32px] border shadow-sm transition-all", isCompleted ? "border-emerald-100 bg-emerald-50/10" : "border-slate-100")}>
                                                                <div className="flex justify-between items-start mb-6">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={cn("p-2.5 rounded-2xl transition-colors shadow-sm", isCompleted ? "bg-emerald-100 text-emerald-600" : "bg-slate-50 text-slate-400")}>
                                                                            {isCompleted ? <Check className="w-5 h-5" /> : <Terminal className="w-5 h-5" />}
                                                                        </div>
                                                                        <span className={cn("text-[10px] font-black uppercase tracking-widest", isCompleted ? "text-emerald-600" : "text-slate-300")}>Block 0{idx + 1}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-2 mb-8"><h5 className={cn("text-xl lg:text-2xl font-bold leading-tight", isCompleted ? "text-emerald-900" : "text-slate-900")}>{task.title}</h5></div>
                                                                <button onClick={() => handleVerifyTask(task.id, activeSection.id)} className={cn("w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95", isCompleted ? "bg-emerald-500 text-white shadow-emerald-200" : "bg-slate-900 text-white shadow-slate-200")}>{isCompleted ? "Verified" : "Verify Module"}</button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                    </div>
                                </div>
                            </div>
                         </div>
                      )}
                   </motion.div>
                )}

                {/* --- TAB: PERFORMANCE --- */}
                {activeTab === 'performance' && (
                    <motion.div key="performance" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 lg:p-12 overflow-y-auto h-full custom-scrollbar pb-24">
                        {timelineData.length === 0 ? (
                             <div className="h-full flex items-center justify-center p-8">
                                <EmptyState title="No Performance History" message="This agent has no recorded missions, goals, or awards yet." />
                             </div>
                        ) : (
                            <div className="relative pl-8 lg:pl-12 space-y-6 lg:space-y-8 border-l-2 border-slate-100 ml-4 lg:ml-6 pb-20">
                                {timelineData.map((item, idx) => { 
                                    const isAward = item.category === 'AWARD'; 
                                    const isStrategy = item.category === '1-ON-1';
                                    const isSystem = item.category === 'SYSTEM';

                                    let Icon = ShieldCheck;
                                    if (isAward) Icon = TACTICAL_ICONS.find(ic => ic.id === item.iconId)?.icon || Medal;
                                    if (isStrategy) Icon = MessageSquare;
                                    if (isSystem) Icon = Link2; 

                                    return (
                                        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: idx * 0.05 }} key={idx} className="relative group cursor-pointer" onClick={() => handleTimelineItemClick(item)}>
                                            <div className={cn("absolute -left-[48px] lg:-left-[63px] top-0 w-8 h-8 lg:w-10 lg:h-10 rounded-2xl flex items-center justify-center border-4 border-white shadow-xl z-10", isAward ? "bg-white" : isStrategy ? "bg-purple-600 text-white" : isSystem ? "bg-slate-900 text-white" : "bg-slate-900 text-white")} style={isAward ? { color: item.hex } : {}}><Icon className="w-4 h-4 lg:w-5 lg:h-5" /></div>
                                            <div className={cn("p-6 lg:p-8 rounded-[32px] lg:rounded-[48px] border shadow-sm transition-all relative overflow-hidden", isStrategy ? "bg-purple-50/30 border-purple-100" : isSystem ? "bg-slate-50 border-slate-200" : "bg-white border-slate-100")}>
                                                <div className="flex justify-between mb-3 relative z-10">
                                                    <div className="flex items-center gap-3">
                                                        <span className={cn("px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest shadow-inner", isAward ? "bg-emerald-50 text-emerald-600" : isStrategy ? "bg-purple-100 text-purple-700" : isSystem ? "bg-slate-200 text-slate-600" : "bg-red-50 text-[#E51636]")}>
                                                            {item.category}
                                                        </span>
                                                        <span className="text-[10px] font-medium text-slate-400">{formatDistanceToNow(item.date)} ago</span>
                                                    </div>
                                                </div>
                                                <h4 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight leading-none mb-3 relative z-10">{item.title}</h4>
                                                
                                                {isSystem && item.mentorName ? (
                                                    <div className="relative z-10 p-4 rounded-2xl bg-white border border-slate-200 flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-black text-xs text-slate-500">
                                                            {item.mentorName.charAt(0)}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Linked To</span>
                                                            <span className="text-xs font-bold text-slate-900">{item.mentorName}</span>
                                                        </div>
                                                    </div>
                                                ) : isStrategy ? (
                                                    <div className="space-y-4 relative z-10"><div><div className="text-[9px] font-bold uppercase text-slate-400 tracking-widest mb-1">1-on-1 Goal</div><p className="text-sm font-medium text-slate-700 leading-relaxed">{item.goal || "No goal recorded."}</p></div><div><div className="text-[9px] font-bold uppercase text-slate-400 tracking-widest mb-1">Session Summary</div><p className="text-sm font-medium text-slate-500 leading-relaxed italic">{item.summary || "No summary recorded."}</p></div></div>
                                                ) : (
                                                    <p className="text-sm lg:text-base font-medium text-slate-500 leading-relaxed relative z-10 whitespace-pre-wrap">{item.description}</p>
                                                )}
                                            </div>
                                        </motion.div>
                                    ) 
                                })}
                            </div>
                        )}
                    </motion.div>
                )}

             </AnimatePresence>
          </div>

          {/* --- FOOTER --- */}
          <div className="px-4 lg:px-12 h-20 lg:h-24 bg-white border-t border-slate-100 flex items-center justify-end shrink-0 gap-6 safe-area-pb">
             <button onClick={() => setIsLogModalOpen(true)} className="flex items-center gap-3 px-6 lg:px-8 py-3 lg:py-3.5 bg-[#E51636] text-white rounded-3xl font-bold uppercase text-[10px] lg:text-[11px] tracking-wider shadow-lg active:scale-95 transition-all hover:scale-[1.03]"><Plus className="w-4 h-4" /> Add Record</button>
          </div>
        </div>
      </motion.div>

      {/* --- MODALS --- */}
      <AnimatePresence>
        {isLogModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-end lg:items-center justify-center lg:p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#0F172A]/90 backdrop-blur-md" onClick={() => setIsLogModalOpen(false)} />
                <motion.div initial={{ scale: 0.98, opacity: 0, y: 20 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.98, opacity: 0, y: 20 }} className="bg-white w-full max-w-6xl rounded-t-[40px] lg:rounded-[48px] shadow-2xl overflow-hidden flex flex-col h-[90vh] lg:max-h-[92vh] border border-white/20 relative z-10">
                    <div className="bg-[#E51636] px-6 lg:px-12 py-8 lg:py-10 text-white shrink-0 overflow-hidden relative">
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
                        <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12"><Command className="w-48 h-48" /></div>
                        <div className="relative z-10 flex items-center justify-between gap-10">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-4"><div className="px-3 py-1 bg-white/10 rounded-full border border-white/20 backdrop-blur-xl flex items-center gap-2"><span className="text-[8px] font-black uppercase tracking-[0.4em] text-white">Log Deployment Console</span></div><Sparkles className="w-3 h-3 text-white/40 animate-pulse" /></div>
                                <div className="flex flex-col gap-6"><h2 className="text-2xl lg:text-4xl font-black tracking-tighter leading-none text-white uppercase italic">Deploy Operational Log</h2><div className={cn("relative max-w-3xl rounded-[22px] transition-all duration-500 overflow-hidden border-2", isTitleFocused ? "bg-white border-white shadow-[0_0_40px_rgba(255,255,255,0.2)]" : "bg-white/10 border-white/20")}><div className="flex items-center px-4 lg:px-6 py-4 gap-4 relative"><span className={cn("text-xl font-black font-mono transition-colors", isTitleFocused ? "text-[#E51636]" : "text-white/40")}>&gt;</span><input autoFocus onFocus={() => setIsTitleFocused(true)} onBlur={() => setIsTitleFocused(false)} value={logDraft.title} onChange={e => setLogDraft({...logDraft, title: e.target.value})} className={cn("w-full bg-transparent text-lg lg:text-xl font-bold outline-none transition-colors placeholder:transition-colors", isTitleFocused ? "text-slate-900" : "text-white")} placeholder="Identify log objective..." />{!logDraft.title && <motion.div animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} className={cn("absolute w-3 h-6 rounded-sm left-12 top-1/2 -translate-y-1/2 pointer-events-none", isTitleFocused ? "bg-[#E51636]" : "bg-white/40")} />}</div></div></div>
                            </div>
                            <button onClick={() => setIsLogModalOpen(false)} className="shrink-0 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all"><X className="w-6 h-6" /></button>
                        </div>
                    </div>
                    
                    <div className="p-6 lg:p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-50 relative z-20">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="space-y-3"><label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] px-2 flex items-center gap-2"><Layers className="w-3 h-3" /> Classification</label><div className="flex flex-col gap-1.5">{CATEGORIES.map((cat: any) => { const isSelected = logDraft.type === cat.id; const style = getTypeColor(cat.id).split(' '); return (<button key={cat.id} onClick={() => setLogDraft({...logDraft, type: cat.id})} className={cn("w-full px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-between shadow-sm", isSelected ? `${style[0]} ${style[1]} ${style[2]} shadow-xl ring-4 ring-white` : "bg-white border-slate-200 text-slate-400 hover:border-slate-300")}><div className="flex items-center gap-3"><cat.icon className="w-3.5 h-3.5" />{getEventLabel(cat.id)}</div>{isSelected && <Check className="w-3.5 h-3.5" />}</button>) })}</div></div>
                            <div className="space-y-3"><label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] px-2 flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Scheduling</label><IntegratedRangePicker start={logDraft.startDate} end={logDraft.endDate} onChange={(s, e) => setLogDraft({...logDraft, startDate: s, endDate: e})} /></div>
                            <div className="space-y-6"><label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] px-2 flex items-center gap-2"><Activity className="w-3 h-3" /> Logistics</label><div className="bg-white p-5 rounded-[40px] border border-slate-100 shadow-sm space-y-5"><WebAppDropdown label="Mission Lead" icon={Crown} placeholder="Select Leader..." options={team.filter(m => m.status.includes('Director') || m.status.includes('Leader'))} selected={team.find(m => m.id === logDraft.assignee)} onSelect={(u: any) => setLogDraft({...logDraft, assignee: u.id, assigneeName: u.name})} /><div className="p-4 bg-slate-50 rounded-2xl border border-slate-100"><span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1 block">Locked Participant</span><div className="flex items-center gap-3"><div className={cn("w-6 h-6 rounded-lg flex items-center justify-center font-black text-[10px] text-white shadow-sm", isFOH ? 'bg-[#004F71]' : 'bg-[#E51636]')}>{initials}</div><span className="text-xs font-bold text-slate-900">{member.name}</span></div></div></div></div>
                        </div>
                        <div className="relative group"><div className={cn("absolute -inset-1 bg-gradient-to-r from-[#E51636] to-red-400 rounded-[32px] blur opacity-0 transition duration-500", isBriefingFocused && "opacity-10")} /><div className="relative bg-white border border-slate-200 rounded-[28px] overflow-hidden shadow-sm transition-all duration-500"><div className="bg-slate-50/80 border-b border-slate-100 px-6 py-2.5 flex items-center justify-between"><div className="flex items-center gap-2.5"><Terminal className="w-3.5 h-3.5 text-[#E51636]" /><span className="text-[9px] font-black uppercase text-slate-600 tracking-[0.3em]">Operational Intelligence</span></div></div><div className="relative"><textarea onFocus={() => setIsBriefingFocused(true)} onBlur={() => setIsBriefingFocused(false)} value={logDraft.description} onChange={e => setLogDraft({...logDraft, description: e.target.value})} className="w-full h-32 p-6 bg-transparent text-sm font-medium outline-none resize-none text-slate-700 leading-relaxed" placeholder="Detail operational context, success criteria, or specific requirements..." /></div></div></div>
                    </div>

                    <div className="px-6 lg:px-10 py-6 bg-white border-t border-slate-100 flex justify-between items-center shrink-0 relative z-20 safe-area-pb"><button onClick={() => setIsLogModalOpen(false)} className="px-6 lg:px-10 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#E51636] transition-all">Discard</button><button onClick={handleDeployLog} className="px-8 lg:px-12 py-4 bg-[#004F71] text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.4em] shadow-2xl flex items-center gap-3 hover:scale-[1.03] transition-all active:scale-95"><Save className="w-4 h-4" /> Deploy Mission</button></div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      <AnimatePresence>{selectedSession && (<OneOnOneSessionModal event={selectedSession} onClose={() => setSelectedSession(null)} onUpdate={handleUpdateEvent} />)}</AnimatePresence>
      <AnimatePresence>{isManualModalOpen && activeSection && (<ManualViewerModal url={getEmbedUrl()} title={activeSection.title} pages={`${activeSection.pageStart}-${activeSection.pageEnd}`} color={brandBg} onClose={() => setIsManualModalOpen(false)} />)}</AnimatePresence>
    </ClientPortal>
  );
};