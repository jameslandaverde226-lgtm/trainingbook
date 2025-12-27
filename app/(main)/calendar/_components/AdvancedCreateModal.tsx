"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Target, Shield, Zap, MessageSquare, 
  ChevronRight, Calendar as CalendarIcon, 
  Clock, Flag, FileText, User, Sparkles, 
  Search, ChevronLeft, ChevronDown, Check
} from "lucide-react";
import { 
  format, addDays, startOfToday, isSameDay, 
  startOfMonth, endOfMonth, eachDayOfInterval, 
  startOfWeek, endOfWeek, addMonths, subMonths 
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
    placeholder = "Select..." 
}: { 
    label: string, 
    value: string, 
    onChange: (val: string) => void, 
    options: {id: string, name: string}[], 
    disabled?: boolean,
    placeholder?: string
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const selectedOption = options.find(o => o.id === value);

    const filteredOptions = options.filter(o => 
        o.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-1.5 relative z-20">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">{label}</span>
            <div className="relative">
                <button
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                    className={cn(
                        "w-full flex items-center justify-between bg-white border rounded-xl px-4 py-3 text-xs font-bold transition-all text-left",
                        disabled ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed" : "border-slate-200 text-slate-900 hover:border-slate-300 focus:ring-2 focus:ring-blue-500/20"
                    )}
                >
                    <span className="truncate">{selectedOption ? selectedOption.name : placeholder}</span>
                    <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
                </button>

                {/* Dropdown Menu - FIXED Z-INDEX and POSITION */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-[100] flex flex-col max-h-[240px]"
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
                            <div className="overflow-y-auto p-1 custom-scrollbar">
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
                                            value === opt.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
                                        )}
                                    >
                                        {opt.name}
                                        {value === opt.id && <Check className="w-3.5 h-3.5" />}
                                    </button>
                                )) : (
                                    <div className="p-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">No results found</div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            {/* Click outside listener backdrop */}
            {isOpen && <div className="fixed inset-0 z-[90]" onClick={() => setIsOpen(false)} />}
        </div>
    );
}

// --- MAIN MODAL COMPONENT ---
export default function AdvancedCreateModal({ isOpen, onClose, preselectedDate, preselectedMemberId }: Props) {
  const { team, currentUser } = useAppStore();
  
  // State
  const [title, setTitle] = useState("");
  const [type, setType] = useState<EventType>("Goal");
  const [date, setDate] = useState<Date>(preselectedDate || new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfToday());
  const [assignee, setAssignee] = useState("");
  const [leaderId, setLeaderId] = useState(currentUser?.uid || "");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-fill logic
  useEffect(() => {
    if (isOpen) {
        if (preselectedMemberId) setAssignee(preselectedMemberId);
        if (preselectedDate) {
            setDate(preselectedDate);
            setCurrentMonth(preselectedDate);
        }
    }
  }, [isOpen, preselectedMemberId, preselectedDate]);

  // Calendar Generation
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const handleSubmit = async () => {
    if (!title || !assignee) {
      toast.error("Mission Objective & Operative Required");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Deploying Mission...");

    try {
      const assignedMember = team.find(m => m.id === assignee);
      const assigneeName = assignedMember ? assignedMember.name : "Unknown Operative";
      
      const startDate = new Date(date);
      startDate.setHours(9, 0, 0, 0);

      await addDoc(collection(db, "events"), {
        title,
        type,
        startDate,
        endDate: startDate,
        assignee,
        assigneeName,
        teamMemberId: assignee,
        teamMemberName: assigneeName,
        description,
        priority,
        status: "Todo",
        createdBy: leaderId || "System",
        createdAt: serverTimestamp(),
        stickers: [],
      });

      toast.success("Mission Deployed", { id: toastId });
      onClose();
      // Reset
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
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-md"
              onClick={onClose}
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 30 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              // Removed 'overflow-hidden' from main container so dropdowns can pop out
              className="relative bg-[#F8FAFC] w-full max-w-5xl rounded-[40px] shadow-2xl flex flex-col md:flex-row max-h-[90vh] md:h-auto"
            >
                {/* --- RED HEADER BAR --- */}
                <div className="absolute top-0 left-0 right-0 h-40 bg-[#E51636] z-0 flex items-start justify-between p-8 md:p-10 rounded-t-[40px] overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 text-white/70 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.25em]">Ops Command Center</span>
                            <div className="w-1 h-1 rounded-full bg-white/50" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">New Entry</span>
                        </div>
                        <h2 className="text-4xl font-[1000] text-white tracking-tighter shadow-sm">Deploy New Mission</h2>
                    </div>
                    <button onClick={onClose} className="relative z-10 p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all active:scale-90 backdrop-blur-sm">
                        <X className="w-6 h-6" />
                    </button>
                    {/* Artistic Pattern */}
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] mix-blend-overlay pointer-events-none" />
                    <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                </div>

                {/* --- MAIN CONTENT CONTAINER --- */}
                <div className="relative z-10 mt-32 w-full bg-white rounded-t-[40px] md:rounded-[40px] flex flex-col md:flex-row shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.3)] min-h-[500px]">
                    
                    {/* LEFT COLUMN: Input, Type, Calendar */}
                    <div className="flex-1 p-8 md:p-10 space-y-8 border-r border-slate-100/80">
                        
                        {/* Objective Input */}
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
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-14 pr-6 py-5 text-lg font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-[#E51636] focus:ring-4 focus:ring-red-500/5 transition-all shadow-inner"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Classification Grid */}
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

                        {/* Beautiful Calendar */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <label className="text-[9px] font-black text-[#E51636] uppercase tracking-widest flex items-center gap-2">
                                    <CalendarIcon className="w-3 h-3" /> Target Date
                                </label>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-slate-100 rounded-full transition-colors"><ChevronLeft className="w-4 h-4 text-slate-400" /></button>
                                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider min-w-[80px] text-center">{format(currentMonth, "MMMM yyyy")}</span>
                                    <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-slate-100 rounded-full transition-colors"><ChevronRight className="w-4 h-4 text-slate-400" /></button>
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                                <div className="grid grid-cols-7 gap-1 text-center mb-3">
                                    {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d, i) => (
                                        <span key={i} className="text-[9px] font-black text-slate-300 uppercase">{d}</span>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-y-2 gap-x-1">
                                    {calendarDays.map((day, i) => {
                                        const isSelected = isSameDay(day, date);
                                        const isToday = isSameDay(day, new Date());
                                        const isCurrentMonth = day.getMonth() === currentMonth.getMonth();

                                        return (
                                            <button
                                                key={i}
                                                onClick={() => setDate(day)}
                                                className={cn(
                                                    "h-9 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center relative",
                                                    !isCurrentMonth && "text-slate-200",
                                                    isCurrentMonth && !isSelected && "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                                                    isSelected ? "bg-[#E51636] text-white shadow-lg shadow-red-500/30 scale-110 z-10" : ""
                                                )}
                                            >
                                                <span>{format(day, "d")}</span>
                                                {isToday && !isSelected && <div className="w-1 h-1 rounded-full bg-[#E51636] mt-0.5" />}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* RIGHT COLUMN: Logistics & Intel */}
                    <div className="flex-1 p-8 md:p-10 bg-slate-50/50 flex flex-col space-y-8 relative rounded-br-[40px] rounded-bl-[40px] md:rounded-bl-none">
                        {/* Decorative BG */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-100 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50 pointer-events-none" />
                        
                        {/* Logistics Section */}
                        <div className="space-y-6 relative z-10">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                <Zap className="w-3 h-3" /> Logistics
                            </label>

                            {/* Custom Searchable Selects */}
                            <MemberSelect 
                                label="Mission Lead"
                                value={leaderId}
                                onChange={setLeaderId}
                                options={team.map(m => ({ id: m.id, name: m.name }))}
                            />

                            <MemberSelect 
                                label="Assign Participant"
                                value={assignee}
                                onChange={setAssignee}
                                options={team.map(m => ({ id: m.id, name: m.name }))}
                                disabled={!!preselectedMemberId}
                            />

                            {/* Impact Level with Colored Flags */}
                            <div className="space-y-1.5">
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

                        {/* Intel Textarea */}
                        <div className="space-y-2 flex-1 flex flex-col relative z-10">
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

                        {/* Footer Action */}
                        <div className="flex items-center justify-end pt-6 border-t border-slate-200/60 relative z-10">
                            <button 
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                // UPDATED: Button is now Navy Blue (#004F71)
                                className="px-8 py-4 bg-[#004F71] hover:bg-[#003f5c] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3"
                            >
                                {isSubmitting ? "Deploying..." : (
                                    <>
                                        <Zap className="w-4 h-4 fill-white" /> Initialize Directive
                                    </>
                                )}
                            </button>
                        </div>

                    </div>
                </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ClientPortal>
  );
}