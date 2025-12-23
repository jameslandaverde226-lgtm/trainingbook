"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Save, Clock, FileText, CheckCircle2, History, 
  User, PenTool, Hash, Calendar, MoreHorizontal, 
  CornerDownRight, Printer
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { TeamMember } from "../../calendar/_components/types";

// --- TYPES ---
interface DocHistory {
  id: string;
  action: "create" | "edit" | "save" | "sign";
  user: string;
  timestamp: Date;
  meta?: string;
}

interface Props {
  member: TeamMember;
  currentUser: string; // "Admin" or similar
}

export default function OperationalDocumentInterface({ member, currentUser }: Props) {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("Performance Review - Q3");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [sessionTime, setSessionTime] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  
  // The "Flight Recorder" Log
  const [history, setHistory] = useState<DocHistory[]>([
    { id: "1", action: "create", user: currentUser, timestamp: new Date(Date.now() - 100000), meta: "Document Initialized" },
  ]);

  // --- SESSION TIMER ---
  useEffect(() => {
    const timer = setInterval(() => setSessionTime(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- FORMAT TIMER ---
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- HANDLERS ---
  const handleSave = () => {
    setIsSaving(true);
    // Simulate Network
    setTimeout(() => {
      setIsSaving(false);
      setLastSaved(new Date());
      setHistory(prev => [
        { id: Math.random().toString(), action: "save", user: currentUser, timestamp: new Date(), meta: `Autosave (${wordCount} words)` },
        ...prev
      ]);
    }, 800);
  };

  // Debounced typing simulator for history
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setWordCount(e.target.value.split(/\s+/).filter(w => w.length > 0).length);
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
        handleSave();
    }, 2000);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full bg-[#F8FAFC] relative overflow-hidden">
        
        {/* --- LEFT: THE DOCUMENT (The "Google Doc" Feel) --- */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-8 flex justify-center">
            <div className="w-full max-w-3xl bg-white min-h-[900px] shadow-sm border border-slate-200/60 rounded-xl relative flex flex-col">
                
                {/* Doc Header */}
                <div className="px-8 py-8 border-b border-slate-50 flex flex-col gap-1">
                    <input 
                        value={title} 
                        onChange={(e) => setTitle(e.target.value)}
                        className="text-3xl font-[800] text-slate-900 placeholder:text-slate-300 outline-none bg-transparent"
                        placeholder="Untitled Document"
                    />
                    <div className="flex items-center gap-3 text-slate-400 text-xs font-medium mt-2">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold uppercase tracking-wider text-[10px]">Official Record</span>
                        <span>•</span>
                        <span>Subject: {member.name}</span>
                        <span>•</span>
                        <span>{format(new Date(), "MMMM do, yyyy")}</span>
                    </div>
                </div>

                {/* Doc Body */}
                <textarea 
                    value={content}
                    onChange={handleTyping}
                    className="flex-1 w-full p-8 text-base leading-relaxed text-slate-700 resize-none outline-none font-serif placeholder:text-slate-300 placeholder:italic"
                    placeholder="Begin typing operational report here..."
                />

                {/* Doc Footer / Signature */}
                <div className="mt-auto p-8 pt-0">
                    <div className="border-t border-slate-100 pt-8 flex justify-between items-end">
                        <div className="flex flex-col gap-4">
                            <div className="h-16 w-48 border-b border-slate-300 relative group cursor-pointer">
                                <span className="absolute bottom-1 left-0 text-3xl font-handwriting text-[#004F71] opacity-60 group-hover:opacity-100 transition-opacity">
                                    {currentUser}
                                </span>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Authorized Signature</span>
                        </div>
                        <div className="h-20 w-20 border-2 border-dashed border-slate-200 rounded-full flex items-center justify-center opacity-30 rotate-12">
                             <span className="text-[10px] font-black uppercase text-slate-400">Official</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* --- RIGHT: THE FLIGHT RECORDER (Sidebar) --- */}
        <div className="w-full lg:w-[320px] bg-white border-l border-slate-200 flex flex-col shrink-0 z-10 shadow-[-10px_0_30px_-10px_rgba(0,0,0,0.02)]">
            
            {/* 1. Status HUD */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#004F71]">Session Uplink</h3>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-bold text-emerald-600">LIVE</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-1">
                        <span className="text-2xl font-black text-slate-900 tabular-nums">{formatTime(sessionTime)}</span>
                        <span className="text-[8px] font-bold uppercase text-slate-400 tracking-wider">Duration</span>
                    </div>
                    <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-1">
                        <span className="text-2xl font-black text-slate-900 tabular-nums">{wordCount}</span>
                        <span className="text-[8px] font-bold uppercase text-slate-400 tracking-wider">Word Count</span>
                    </div>
                </div>
            </div>

            {/* 2. Timeline Feed */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Change Log</span>
                    <button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"><MoreHorizontal className="w-4 h-4" /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                    <AnimatePresence initial={false}>
                        {history.map((item, i) => (
                            <motion.div 
                                key={item.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="relative pl-4 border-l-2 border-slate-100 last:border-0 group"
                            >
                                <div className={cn(
                                    "absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm z-10",
                                    item.action === 'save' ? "bg-emerald-500" : "bg-[#004F71]"
                                )} />
                                
                                <div className="flex flex-col gap-1 -mt-1.5">
                                    <div className="flex justify-between items-start">
                                        <span className="text-xs font-bold text-slate-900">
                                            {item.action === 'create' && "Initialized"}
                                            {item.action === 'save' && "Autosaved"}
                                            {item.action === 'sign' && "Signed Off"}
                                        </span>
                                        <span className="text-[9px] font-mono text-slate-400">{format(item.timestamp, "HH:mm:ss")}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                                        {item.meta || "System action logged."}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <div className="w-4 h-4 rounded-md bg-slate-100 flex items-center justify-center text-[8px] font-black text-[#E51636]">
                                            {item.user.charAt(0)}
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{item.user}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* 3. Action Bar */}
            <div className="p-6 border-t border-slate-100 bg-white space-y-3">
                <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="w-full py-4 bg-[#004F71] hover:bg-[#003b55] text-white rounded-xl font-black uppercase text-[10px] tracking-[0.25em] shadow-lg shadow-blue-900/10 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-70"
                >
                    {isSaving ? <Clock className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isSaving ? "Syncing..." : "Save Record"}
                </button>
                <div className="flex gap-3">
                    <button className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl font-black uppercase text-[9px] tracking-widest border border-slate-200 transition-all flex items-center justify-center gap-2">
                        <Printer className="w-3.5 h-3.5" /> Print
                    </button>
                    <button className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-[#E51636] rounded-xl font-black uppercase text-[9px] tracking-widest border border-red-100 transition-all flex items-center justify-center gap-2">
                        <CornerDownRight className="w-3.5 h-3.5" /> Export
                    </button>
                </div>
            </div>

        </div>
    </div>
  );
}