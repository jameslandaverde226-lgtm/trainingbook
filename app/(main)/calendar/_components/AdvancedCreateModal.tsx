"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Target, Shield, Zap, MessageSquare, 
  ChevronRight, Calendar as CalendarIcon, 
  Clock, Flag, FileText, User, Sparkles, 
  Search, ChevronLeft, ChevronDown, Check, AlertCircle
} from "lucide-react";
import { 
  format, addDays, startOfToday, isSameDay, 
  startOfMonth, endOfMonth, eachDayOfInterval, 
  startOfWeek, endOfWeek, addMonths, subMonths,
  isBefore, isAfter, isWithinInterval 
} from "date-fns";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store/useStore";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";
import ClientPortal from "@/components/core/ClientPortal";
import { EventType } from "./types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  preselectedDate?: Date;
  preselectedMemberId?: string;
}

// --- CONFIGURATION ---
const EVENT_TYPES: { id: EventType; label: string; icon: any; color: string; bg: string; border: string }[] = [
  { id: "Goal", label: "Strategic Goal", icon: Target, color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-200" },
  { id: "Deadline", label: "Hard Deadline", icon: Zap, color: "text-[#E51636]", bg: "bg-red-50", border: "border-red-200" },
  { id: "Training", label: "Training Module", icon: Shield, color: "text-[#004F71]", bg: "bg-blue-50", border: "border-blue-200" },
  { id: "OneOnOne", label: "1-on-1 Session", icon: MessageSquare, color: "text-purple-500", bg: "bg-purple-50", border: "border-purple-200" },
];

const PRIORITIES = [
  { id: "Low", label: "Low Impact", color: "text-slate-500", bg: "bg-slate-100" },
  { id: "Medium", label: "Medium", color: "text-amber-500", bg: "bg-amber-50" },
  { id: "High", label: "Critical", color: "text-[#E51636]", bg: "bg-red-50" },
] as const;

// --- CUSTOM SEARCHABLE SELECT COMPONENT ---
function MemberSelect({ 
    label, 
    value, 
    onChange, 
    options, 
    disabled = false, 
    placeholder = "Select...",
    zIndex = 20
}: { 
    label: string, 
    value: string, 
    onChange: (val: string) => void, 
    options: {id: string, name: string, dept: string}[], 
    disabled?: boolean,
    placeholder?: string,
    zIndex?: number
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const selectedOption = options.find(o => o.id === value);

    // FILTER LOGIC: Exclude "Unassigned" members
    const filteredOptions = options.filter(o => 
        o.name.toLowerCase().includes(search.toLowerCase()) && 
        o.dept !== "Unassigned"
    );

    return (
        <div className={cn("space-y-1.5 relative")} style={{ zIndex }}>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">{label}</span>
            <div className="relative">
                <button
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                    className={cn(
                        "w-full flex items-center justify-between bg-white border rounded-xl px-4 py-3 text-xs font-bold transition-all text-left relative z-10",
                        disabled ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed" : "border-slate-200 text-slate-900 hover:border-slate-300 focus:ring-2 focus:ring-blue-500/20"
                    )}
                >
                    <span className="truncate">{selectedOption ? selectedOption.name : placeholder}</span>
                    <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <>
                            <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
                            <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 5 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-[110] flex flex-col max-h-[240px]"
                            >
                                <div className="p-2 border-b border-slate-50 sticky top-0 bg-white">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                        <input 
                                            autoFocus
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Search operatives..."
                                            className="w-full bg-slate-50 rounded-lg pl-9 pr-3 py-2 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="overflow-y-auto p-1 custom-scrollbar max-h-[180px]">
                                    {filteredOptions.length > 0 ? filteredOptions.map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => {
                                                onChange(opt.id);
                                                setIsOpen(false);
                                                setSearch("");
                                            }}
                                            className={cn(
                                                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-colors",
                                                value === opt.id 
                                                    ? "bg-[#E51636] text-white" // CHANGED FROM bg-slate-900
                                                    : "text-slate-600 hover:bg-slate-50"
                                            )}
                                        >
                                            <div className="flex flex-col items-start">
                                                <span>{opt.name}</span>
                                                <span className={cn(
                                                    "text-[8px] uppercase font-bold tracking-wider",
                                                    value === opt.id ? "text-white/80" : "text-slate-400"
                                                )}>{opt.dept} Unit</span>
                                            </div>
                                            {value === opt.id && <Check className="w-3.5 h-3.5" />}
                                        </button>
                                    )) : (
                                        <div className="p-4 text-center flex flex-col items-center gap-2">
                                            <AlertCircle className="w-5 h-5 text-amber-500" />
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">No active personnel found</p>
                                            <p className="text-[9px] text-slate-300">Unassigned members cannot be selected.</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// --- MAIN MODAL COMPONENT ---
export default function AdvancedCreateModal({ isOpen, onClose, preselectedDate, preselectedMemberId }: Props) {
  const { team, currentUser } = useAppStore();
  
  // Form State
  const [title, setTitle] = useState("");
  const [type, setType] = useState<EventType>("Goal");
  
  // Date State: Range Selection
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date | null }>({
      start: preselectedDate || new Date(),
      end: null
  });
  
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfToday());
  const [assignee, setAssignee] = useState("");
  const [leaderId, setLeaderId] = useState(currentUser?.uid || "");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-fill logic
  useEffect(() => {
    if (isOpen) {
        if (preselectedMemberId) {
             const member = team.find(m => m.id === preselectedMemberId);
             // Safety check: Don't autofill if unassigned
             if (member && member.dept !== "Unassigned") {
                 setAssignee(preselectedMemberId);
             } else {
                 toast.error("Cannot assign mission to Unassigned member");
             }
        }
        if (preselectedDate) {
            setDateRange({ start: preselectedDate, end: null });
            setCurrentMonth(preselectedDate);
        }
    }
  }, [isOpen, preselectedMemberId, preselectedDate, team]);

  // Calendar Generation
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // --- DATE SELECTION LOGIC ---
  const handleDateClick = (day: Date) => {
    if (!dateRange.start || (dateRange.start && dateRange.end)) {
        setDateRange({ start: day, end: null });
    } else {
        if (isBefore(day, dateRange.start)) {
            setDateRange({ start: day, end: null });
        } else if (isSameDay(day, dateRange.start)) {
            setDateRange({ start: day, end: null });
        } else {
            setDateRange({ ...dateRange, end: day });
        }
    }
  };

  const handleSubmit = async () => {
    if (!title || !assignee) {
      toast.error("Mission Objective & Operative Required");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Deploying Mission...");

    try {
      const participant = team.find(m => m.id === assignee);
      const participantName = participant ? participant.name : "Unknown Operative";
      
      const leader = team.find(m => m.id === leaderId);
      const leaderName = leader ? leader.name : "System";

      const startDate = new Date(dateRange.start);
      if (isSameDay(startDate, new Date())) {
          const now = new Date();
          startDate.setHours(now.getHours(), now.getMinutes(), 0, 0);
      } else {
          startDate.setHours(9, 0, 0, 0);
      }

      // If no end date selected, default to start date
      const endDate = dateRange.end ? new Date(dateRange.end) : new Date(startDate);
      endDate.setHours(18, 0, 0, 0);

      await addDoc(collection(db, "events"), {
        title,
        type,
        startDate,
        endDate,
        assignee: leaderId || "System", 
        assigneeName: leaderName,       
        teamMemberId: assignee,         
        teamMemberName: participantName,
        description,
        priority,
        status: "To Do", 
        createdBy: currentUser?.uid || "System",
        createdAt: serverTimestamp(),
        stickers: [],
      });

      toast.success("Mission Deployed", { id: toastId });
      onClose();
      
      setTitle("");
      setDescription("");
      
    } catch (error) {
      console.error("Error:", error);
      toast.error("Deployment Failed", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ClientPortal>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center pointer-events-none">
            {/* BACKDROP */}
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-md pointer-events-auto"
              onClick={onClose}
            />
            
            {/* MODAL CARD */}
            <motion.div 
              initial={{ y: "100%", opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="pointer-events-auto relative bg-[#F8FAFC] w-full md:max-w-5xl h-[92vh] md:h-auto md:max-h-[90vh] rounded-t-[40px] md:rounded-[40px] shadow-2xl flex flex-col overflow-hidden"
            >
                {/* --- HEADER --- */}
                <div className="shrink-0 h-32 md:h-40 bg-[#E51636] z-0 flex items-start justify-between p-6 md:p-10 relative overflow-hidden">
                    <div className="relative z-10 pt-4 md:pt-0">
                        <div className="flex items-center gap-2 text-white/70 mb-1 md:mb-2">
                            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.25em]">Ops Command</span>
                            <div className="w-1 h-1 rounded-full bg-white/50" />
                            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-white/50">New Entry</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-[1000] text-white tracking-tighter shadow-sm leading-none">Deploy Mission</h2>
                    </div>
                    <button onClick={onClose} className="relative z-10 p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all active:scale-90 backdrop-blur-sm">
                        <X className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] mix-blend-overlay pointer-events-none" />
                    <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                </div>

                {/* --- CONTENT --- */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-white relative z-10 -mt-6 md:-mt-10 rounded-t-[32px] md:rounded-t-none md:rounded-none">
                    <div className="flex flex-col md:flex-row min-h-full">
                    
                        {/* LEFT COLUMN */}
                        <div className="flex-1 p-6 md:p-10 space-y-8 border-b md:border-b-0 md:border-r border-slate-100/80">
                            
                            <div className="space-y-3">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                    <Target className="w-3 h-3" /> Mission Objective
                                </label>
                                <div className="relative group">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xl select-none">{">_"}</span>
                                    <input 
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Enter directive details..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-14 pr-6 py-4 md:py-5 text-base md:text-lg font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-[#E51636] focus:ring-4 focus:ring-red-500/5 transition-all shadow-inner"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                    <Shield className="w-3 h-3" /> Classification
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {EVENT_TYPES.map((t) => (
                                        <button
                                            key={t.id}
                                            onClick={() => setType(t.id as EventType)}
                                            className={cn(
                                                "flex flex-col items-center justify-center gap-2 py-3 px-2 rounded-xl border-2 transition-all active:scale-95 h-20",
                                                type === t.id 
                                                    ? cn(t.bg, t.border, t.color, "shadow-md scale-[1.02]") 
                                                    : "border-slate-100 bg-white text-slate-400 hover:border-slate-200 hover:bg-slate-50"
                                            )}
                                        >
                                            <t.icon className={cn("w-5 h-5", type !== t.id && "opacity-50")} />
                                            <span className="text-[8px] font-black uppercase tracking-widest">{t.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <label className="text-[9px] font-black text-[#E51636] uppercase tracking-widest flex items-center gap-2">
                                        <CalendarIcon className="w-3 h-3" /> 
                                        {dateRange.end ? "Date Range" : "Target Date"}
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-slate-100 rounded-full transition-colors"><ChevronLeft className="w-4 h-4 text-slate-400" /></button>
                                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider min-w-[80px] text-center">{format(currentMonth, "MMMM yyyy")}</span>
                                        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-slate-100 rounded-full transition-colors"><ChevronRight className="w-4 h-4 text-slate-400" /></button>
                                    </div>
                                </div>
                                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm select-none">
                                    <div className="grid grid-cols-7 gap-1 text-center mb-3">
                                        {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d, i) => (
                                            <span key={i} className="text-[9px] font-black text-slate-300 uppercase">{d}</span>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-7 gap-y-2 gap-x-1">
                                        {calendarDays.map((day, i) => {
                                            const isStart = isSameDay(day, dateRange.start);
                                            const isEnd = dateRange.end ? isSameDay(day, dateRange.end) : false;
                                            
                                            const isMiddle = dateRange.end 
                                                ? isWithinInterval(day, { start: dateRange.start, end: dateRange.end }) && !isStart && !isEnd
                                                : false;

                                            const isToday = isSameDay(day, new Date());
                                            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();

                                            return (
                                                <button
                                                    key={i}
                                                    onClick={() => handleDateClick(day)}
                                                    className={cn(
                                                        "h-9 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center relative",
                                                        !isCurrentMonth && "text-slate-200",
                                                        isCurrentMonth && !isStart && !isEnd && !isMiddle && "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                                                        
                                                        (isStart || isEnd) ? "bg-[#E51636] text-white shadow-lg shadow-red-500/30 z-10 scale-105" : "",
                                                        isMiddle ? "bg-[#E51636]/10 text-[#E51636] rounded-none scale-110 mx-[-2px] w-[calc(100%+4px)]" : ""
                                                    )}
                                                >
                                                    <span>{format(day, "d")}</span>
                                                    {isToday && !isStart && !isEnd && !isMiddle && <div className="w-1 h-1 rounded-full bg-[#E51636] mt-0.5" />}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="flex-1 p-6 md:p-10 bg-slate-50/50 flex flex-col space-y-8 relative">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-100 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50 pointer-events-none" />
                            
                            <div className="space-y-6 relative z-10">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                    <Zap className="w-3 h-3" /> Logistics
                                </label>

                                <MemberSelect 
                                    label="Mission Lead"
                                    value={leaderId}
                                    onChange={setLeaderId}
                                    options={team.map(m => ({ id: m.id, name: m.name, dept: m.dept }))} 
                                    zIndex={30}
                                />

                                <MemberSelect 
                                    label="Assign Participant"
                                    value={assignee}
                                    onChange={setAssignee}
                                    options={team.map(m => ({ id: m.id, name: m.name, dept: m.dept }))} 
                                    disabled={!!preselectedMemberId}
                                    zIndex={20}
                                />

                                <div className="space-y-1.5 relative z-10">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">Impact Level</span>
                                    <div className="flex bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                                        {PRIORITIES.map((p) => (
                                            <button
                                                key={p.id}
                                                onClick={() => setPriority(p.id)}
                                                className={cn(
                                                    "flex-1 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                                                    priority === p.id 
                                                        ? cn(p.bg, p.color, "shadow-sm ring-1 ring-inset ring-black/5") 
                                                        : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                                                )}
                                            >
                                                <Flag className={cn("w-3 h-3 fill-current", priority === p.id ? "opacity-100" : "opacity-0")} />
                                                {p.id}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 flex-1 flex flex-col relative z-0">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                    <FileText className="w-3 h-3" /> Operational Context
                                </label>
                                <textarea 
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Add specific instructions, success criteria, or notes..."
                                    className="w-full flex-1 bg-white border border-slate-200 rounded-2xl p-4 text-xs font-medium text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all resize-none min-h-[120px] shadow-sm"
                                />
                            </div>
                        </div>

                    </div>
                </div>

                {/* --- STICKY FOOTER --- */}
                <div className="shrink-0 p-6 md:px-10 md:py-6 border-t border-slate-200/60 bg-white relative z-20 flex items-center justify-end">
                    <button 
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full md:w-auto px-8 py-4 bg-[#004F71] hover:bg-[#003f5c] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        {isSubmitting ? "Deploying..." : (
                            <>
                                <Zap className="w-4 h-4 fill-white" /> Initialize Directive
                            </>
                        )}
                    </button>
                </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ClientPortal>
  );
}