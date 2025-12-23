"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Save, FileText, CheckCircle2, History, 
  User, PenTool, Calendar, Plus, ChevronDown, 
  Printer, CornerDownRight, MoreHorizontal, ShieldAlert,
  StickyNote
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { TeamMember } from "../../calendar/_components/types";

// --- TYPES ---
interface DocEntry {
  id: string;
  type: "Performance Review" | "Incident Report" | "Commendation" | "Note";
  title: string;
  content: string;
  author: string;
  timestamp: Date;
  status: "Draft" | "Official";
}

interface Props {
  member: TeamMember;
  currentUser: string; 
}

const DOC_TYPES = [
    { id: "Performance Review", icon: FileText, color: "text-blue-600 bg-blue-50" },
    { id: "Incident Report", icon: ShieldAlert, color: "text-red-600 bg-red-50" },
    { id: "Commendation", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
    { id: "Note", icon: StickyNote, color: "text-amber-600 bg-amber-50" },
] as const;

export default function OperationalDocumentInterface({ member, currentUser }: Props) {
  // Mock Data - In production, fetch this from sub-collection 'documents'
  const [entries, setEntries] = useState<DocEntry[]>([
    { 
        id: "1", 
        type: "Performance Review", 
        title: "Q3 Operational Assessment", 
        content: "Andrea has shown exceptional speed in the FOH sector. Leadership capabilities are emerging, particularly during the lunch rush. Recommended for Team Leader track.", 
        author: "Director", 
        timestamp: new Date(Date.now() - 86400000 * 2), // 2 days ago
        status: "Official" 
    }
  ]);

  const [isCreating, setIsCreating] = useState(false);
  const [newEntry, setNewEntry] = useState<Partial<DocEntry>>({ type: "Note", content: "" });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
      if(!newEntry.content) return;
      setIsSaving(true);
      
      setTimeout(() => {
          const entry: DocEntry = {
              id: Math.random().toString(),
              type: newEntry.type as any || "Note",
              title: newEntry.title || "General Entry",
              content: newEntry.content || "",
              author: currentUser,
              timestamp: new Date(),
              status: "Official"
          };
          setEntries([entry, ...entries]);
          setIsCreating(false);
          setNewEntry({ type: "Note", content: "" });
          setIsSaving(false);
      }, 800);
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] relative overflow-hidden">
        
        {/* --- HEADER --- */}
        <div className="px-6 py-4 bg-white border-b border-slate-100 flex justify-between items-center shrink-0 z-20">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 text-slate-500 rounded-xl border border-slate-200">
                    <History className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Personnel Record</h3>
                    <span className="text-[10px] font-bold text-slate-400">Official Ledger • {member.name}</span>
                </div>
            </div>
            <button 
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#004F71] text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all hover:bg-[#003b55]"
            >
                <Plus className="w-3.5 h-3.5" /> New Entry
            </button>
        </div>

        {/* --- MAIN CONTENT (SCROLLABLE) --- */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-8">
            <div className="max-w-3xl mx-auto space-y-8">
                
                {/* CREATION MODE */}
                <AnimatePresence>
                    {isCreating && (
                        <motion.div 
                            initial={{ opacity: 0, y: -20, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: "auto" }}
                            exit={{ opacity: 0, y: -20, height: 0 }}
                            className="bg-white rounded-[24px] border border-[#004F71]/20 shadow-xl overflow-hidden ring-4 ring-blue-50 relative z-30"
                        >
                            <div className="p-1 bg-slate-50 border-b border-slate-100 flex gap-1 overflow-x-auto no-scrollbar">
                                {DOC_TYPES.map(t => (
                                    <button 
                                        key={t.id}
                                        onClick={() => setNewEntry({...newEntry, type: t.id})}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap",
                                            newEntry.type === t.id ? "bg-white text-slate-900 shadow-sm ring-1 ring-black/5" : "text-slate-400 hover:bg-white/50"
                                        )}
                                    >
                                        <t.icon className={cn("w-3.5 h-3.5", t.color.split(' ')[0])} />
                                        {t.id}
                                    </button>
                                ))}
                            </div>
                            <div className="p-6 space-y-4">
                                <input 
                                    className="w-full text-lg font-bold text-slate-900 placeholder:text-slate-300 outline-none bg-transparent"
                                    placeholder="Entry Title (Optional)..."
                                    value={newEntry.title || ""}
                                    onChange={e => setNewEntry({...newEntry, title: e.target.value})}
                                />
                                <textarea 
                                    className="w-full min-h-[120px] text-sm leading-relaxed text-slate-600 placeholder:text-slate-300 outline-none resize-none bg-transparent font-medium"
                                    placeholder="Record observations, feedback, or incident details..."
                                    value={newEntry.content}
                                    onChange={e => setNewEntry({...newEntry, content: e.target.value})}
                                    autoFocus
                                />
                            </div>
                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                                <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-[10px] font-bold uppercase text-slate-400 hover:text-slate-600">Cancel</button>
                                <button 
                                    onClick={handleSave} 
                                    disabled={!newEntry.content || isSaving}
                                    className="px-6 py-2 bg-[#004F71] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isSaving ? <span className="animate-pulse">Saving...</span> : <>Save Record <CornerDownRight className="w-3 h-3" /></>}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* TIMELINE FEED */}
                <div className="relative pl-4 lg:pl-0 space-y-8">
                    {/* The Vertical Line */}
                    <div className="absolute left-[19px] lg:left-[27px] top-0 bottom-0 w-0.5 bg-slate-100" />

                    {entries.map((entry, idx) => {
                        const typeConfig = DOC_TYPES.find(t => t.id === entry.type) || DOC_TYPES[0];
                        const Icon = typeConfig.icon;
                        
                        return (
                            <motion.div 
                                key={entry.id}
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="relative flex gap-6"
                            >
                                {/* Timeline Dot */}
                                <div className={cn(
                                    "relative z-10 w-10 h-10 lg:w-14 lg:h-14 rounded-2xl flex items-center justify-center border-4 border-[#F8FAFC] shadow-sm shrink-0",
                                    typeConfig.color
                                )}>
                                    <Icon className="w-5 h-5 lg:w-6 lg:h-6" />
                                </div>

                                {/* The Card */}
                                <div className="flex-1 bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden group hover:shadow-md transition-all">
                                    <div className="p-5 lg:p-6 border-b border-slate-50 flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={cn("px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider", typeConfig.color)}>
                                                    {entry.type}
                                                </span>
                                                <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" /> {format(entry.timestamp, "MMM do, yyyy")}
                                                </span>
                                            </div>
                                            <h4 className="text-base lg:text-lg font-bold text-slate-900">{entry.title}</h4>
                                        </div>
                                        <button className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                    </div>
                                    
                                    <div className="p-5 lg:p-6 pt-4 bg-slate-50/30">
                                        <p className="text-sm font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">
                                            {entry.content}
                                        </p>
                                    </div>

                                    <div className="px-5 py-3 bg-white border-t border-slate-100 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-md bg-[#004F71] text-white flex items-center justify-center text-[9px] font-black">
                                                {entry.author.charAt(0)}
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                Authored by {entry.author}
                                            </span>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-1.5 text-slate-400 hover:text-[#004F71]"><Printer className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}

                    {/* End Cap */}
                    <div className="relative flex gap-6 opacity-50">
                        <div className="relative z-10 w-10 lg:w-14 h-10 lg:h-14 rounded-full bg-slate-100 border-4 border-[#F8FAFC] flex items-center justify-center">
                            <div className="w-2 h-2 bg-slate-300 rounded-full" />
                        </div>
                        <div className="pt-3">
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">End of Record</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}