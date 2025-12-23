// --- FILE: ./app/(main)/team/_components/OperationalDocumentInterface.tsx ---
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, CheckCircle2, Plus, 
  Printer, CornerDownRight, MoreHorizontal, ShieldAlert,
  StickyNote, History, Calendar, User
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { TeamMember } from "../../calendar/_components/types";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, orderBy, getDocs } from "firebase/firestore";
import toast from "react-hot-toast";

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
    { id: "Performance Review", icon: FileText, color: "text-blue-600 bg-blue-50 border-blue-100" },
    { id: "Incident Report", icon: ShieldAlert, color: "text-red-600 bg-red-50 border-red-100" },
    { id: "Commendation", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
    { id: "Note", icon: StickyNote, color: "text-amber-600 bg-amber-50 border-amber-100" },
] as const;

export default function OperationalDocumentInterface({ member, currentUser }: Props) {
  const [entries, setEntries] = useState<DocEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isCreating, setIsCreating] = useState(false);
  const [newEntry, setNewEntry] = useState<Partial<DocEntry>>({ type: "Note", content: "" });
  const [isSaving, setIsSaving] = useState(false);

  // --- FETCH DOCUMENTS ON MOUNT ---
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const q = query(
          collection(db, "events"),
          where("teamMemberId", "==", member.id),
          orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);
        
        const loadedEntries: DocEntry[] = snapshot.docs
          .map(doc => {
            const data = doc.data();
            // Parse only Document Logs based on the description tag we set
            if (data.description && data.description.startsWith("[DOCUMENT LOG:")) {
               const match = data.description.match(/\[DOCUMENT LOG: (.*?)\]\n\n([\s\S]*)/);
               if (match) {
                 return {
                   id: doc.id,
                   type: match[1] as any,
                   title: data.title,
                   content: match[2],
                   author: data.assigneeName || "Unknown",
                   timestamp: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                   status: "Official"
                 };
               }
            }
            return null;
          })
          .filter((e): e is DocEntry => e !== null);

        setEntries(loadedEntries);
      } catch (error) {
        console.error("Error loading documents:", error);
        toast.error("Could not load records");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, [member.id]);

  const handleSave = async () => {
      if(!newEntry.content) return;
      setIsSaving(true);
      
      const timestamp = new Date();

      // Create local entry object for immediate UI feedback
      const entry: DocEntry = {
          id: Math.random().toString(),
          type: newEntry.type as any || "Note",
          title: newEntry.title || "General Entry",
          content: newEntry.content || "",
          author: currentUser,
          timestamp: timestamp,
          status: "Official"
      };

      try {
        await addDoc(collection(db, "events"), {
            type: "Operation", 
            title: entry.title,
            status: "Done",
            priority: entry.type === "Incident Report" ? "High" : "Medium",
            startDate: timestamp,
            endDate: timestamp,
            assignee: "System", 
            assigneeName: entry.author,
            teamMemberId: member.id,
            teamMemberName: member.name,
            description: `[DOCUMENT LOG: ${entry.type}]\n\n${entry.content}`, 
            createdAt: serverTimestamp()
        });

        // Update local state immediately
        setEntries([entry, ...entries]);
        setIsCreating(false);
        setNewEntry({ type: "Note", content: "" });
        toast.success("Record Officialized");

      } catch (err) {
        console.error(err);
        toast.error("Failed to sync record");
      } finally {
        setIsSaving(false);
      }
  };

  const handlePrint = (entry: DocEntry) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
        <html>
        <head>
            <title>Official Record - ${entry.title}</title>
            <style>
                body { font-family: 'Arial', sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; }
                .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
                .logo { font-size: 24px; font-weight: 900; color: #004F71; text-transform: uppercase; letter-spacing: -1px; }
                .meta { text-align: right; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
                .badge { display: inline-block; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; margin-bottom: 10px; border: 1px solid #e2e8f0; }
                h1 { font-size: 28px; margin: 0 0 20px 0; font-weight: 800; line-height: 1.2; }
                .content { font-size: 14px; line-height: 1.8; white-space: pre-wrap; color: #334155; }
                .footer { margin-top: 60px; border-top: 1px solid #e2e8f0; padding-top: 20px; display: flex; justify-content: space-between; align-items: center; }
                .signature { font-family: 'Courier New', monospace; font-size: 12px; }
                .stamp { border: 2px dashed #cbd5e1; color: #cbd5e1; padding: 10px 20px; font-weight: 900; text-transform: uppercase; transform: rotate(-5deg); font-size: 12px; border-radius: 8px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo">TrainingBook</div>
                <div class="meta">
                    Personnel Record<br/>
                    ${format(new Date(), "MMMM do, yyyy")}
                </div>
            </div>
            
            <div class="badge">${entry.type}</div>
            <h1>${entry.title}</h1>
            
            <div class="content">
                ${entry.content}
            </div>

            <div class="footer">
                <div class="signature">
                    <strong>SIGNED:</strong> ${entry.author}<br/>
                    <strong>DATE:</strong> ${format(entry.timestamp, "yyyy-MM-dd HH:mm")}
                </div>
                <div class="stamp">Official Entry</div>
            </div>
        </body>
        </html>
    `);
    doc.close();

    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();

    setTimeout(() => {
        document.body.removeChild(iframe);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] relative overflow-hidden">
        
        {/* --- STICKY HEADER --- */}
        <div className="px-6 py-5 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex justify-between items-center shrink-0 z-30 sticky top-0">
            <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-slate-50 text-slate-400 rounded-xl border border-slate-200 flex items-center justify-center shadow-sm">
                    <History className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                    <h3 className="text-sm font-[900] text-slate-900 uppercase tracking-wide">Personnel Record</h3>
                    <span className="text-[10px] font-bold text-slate-400 tracking-wide">Official Ledger • {member.name}</span>
                </div>
            </div>
            <button 
                onClick={() => setIsCreating(true)}
                className="group flex items-center gap-2 px-5 py-2.5 bg-[#004F71] text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/20 active:scale-95 transition-all hover:bg-[#003b55] hover:pr-6"
            >
                <Plus className="w-3.5 h-3.5 transition-transform group-hover:rotate-90" /> New Entry
            </button>
        </div>

        {/* --- MAIN CONTENT --- */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10 relative">
            <div className="max-w-4xl mx-auto">
                
                {/* CREATION CARD */}
                <AnimatePresence>
                    {isCreating && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className="bg-white rounded-[32px] border border-slate-200 shadow-2xl overflow-hidden mb-12 ring-4 ring-slate-50 relative z-20"
                        >
                            <div className="p-2 bg-slate-50/50 border-b border-slate-100 flex gap-2 overflow-x-auto no-scrollbar">
                                {DOC_TYPES.map(t => (
                                    <button 
                                        key={t.id}
                                        onClick={() => setNewEntry({...newEntry, type: t.id})}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2.5 rounded-[18px] text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap border",
                                            newEntry.type === t.id 
                                                ? "bg-white text-slate-900 shadow-sm border-slate-200 ring-1 ring-black/5" 
                                                : "text-slate-400 border-transparent hover:bg-white/60"
                                        )}
                                    >
                                        <t.icon className={cn("w-3.5 h-3.5", t.color.split(' ')[0])} />
                                        {t.id}
                                    </button>
                                ))}
                            </div>
                            <div className="p-8 space-y-6">
                                <input 
                                    className="w-full text-2xl font-[900] text-slate-900 placeholder:text-slate-300 outline-none bg-transparent tracking-tight"
                                    placeholder="Title of Entry..."
                                    value={newEntry.title || ""}
                                    onChange={e => setNewEntry({...newEntry, title: e.target.value})}
                                    autoFocus
                                />
                                <textarea 
                                    className="w-full min-h-[160px] text-base leading-relaxed text-slate-600 placeholder:text-slate-300 outline-none resize-none bg-transparent font-medium"
                                    placeholder="Record observations, tactical feedback, or incident details..."
                                    value={newEntry.content}
                                    onChange={e => setNewEntry({...newEntry, content: e.target.value})}
                                />
                            </div>
                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                                <button onClick={() => setIsCreating(false)} className="px-6 py-3 text-[10px] font-bold uppercase text-slate-400 hover:text-slate-600 tracking-widest transition-colors">Cancel</button>
                                <button 
                                    onClick={handleSave} 
                                    disabled={!newEntry.content || isSaving}
                                    className="px-8 py-3 bg-[#004F71] text-white rounded-[18px] text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/10 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2 hover:translate-y-[-1px]"
                                >
                                    {isSaving ? <span className="animate-pulse">Saving...</span> : <>Save Record <CornerDownRight className="w-3.5 h-3.5" /></>}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* TIMELINE FEED */}
                <div className="relative pl-8 lg:pl-10 space-y-10 pb-20">
                    
                    {isLoading ? (
                        <div className="absolute inset-0 flex items-start justify-center pt-10 bg-white/50 backdrop-blur-sm z-50">
                             <div className="flex flex-col items-center gap-2 animate-pulse">
                                 <History className="w-6 h-6 text-slate-300" />
                                 <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Syncing Ledger...</span>
                             </div>
                        </div>
                    ) : (
                        <>
                            {/* The Timeline Line */}
                            <div className="absolute left-[19px] lg:left-[21px] top-4 bottom-0 w-px bg-gradient-to-b from-slate-200 via-slate-200 to-transparent" />
        
                            <AnimatePresence>
                                {entries.map((entry, idx) => {
                                    const typeConfig = DOC_TYPES.find(t => t.id === entry.type) || DOC_TYPES[0];
                                    const Icon = typeConfig.icon;
                                    
                                    return (
                                        <motion.div 
                                            key={entry.id}
                                            layout
                                            initial={{ opacity: 0, x: -20, scale: 0.95 }}
                                            animate={{ opacity: 1, x: 0, scale: 1 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="relative"
                                        >
                                            {/* Timeline Dot */}
                                            <div className={cn(
                                                "absolute -left-[42px] lg:-left-[44px] top-0 z-10 w-10 h-10 lg:w-11 lg:h-11 rounded-2xl flex items-center justify-center border-[4px] border-[#F8FAFC] shadow-sm shrink-0 bg-white",
                                            )}>
                                                <div className={cn("w-full h-full rounded-xl flex items-center justify-center opacity-90", typeConfig.color.replace('text-', 'bg-').replace('bg-', 'bg-opacity-20 '))} >
                                                <Icon className={cn("w-4 h-4 lg:w-5 lg:h-5", typeConfig.color.split(' ')[0])} />
                                                </div>
                                            </div>
        
                                            {/* The Card */}
                                            <div className="bg-white rounded-[28px] border border-slate-100 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.03)] overflow-hidden group hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] hover:border-slate-200 transition-all duration-300">
                                                
                                                {/* Card Header */}
                                                <div className="px-6 py-5 border-b border-slate-50 flex justify-between items-start bg-slate-50/30">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2.5">
                                                            <span className={cn("px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border", typeConfig.color)}>
                                                                {entry.type}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                                                                <Calendar className="w-3 h-3" /> {format(entry.timestamp, "MMM do, yyyy")}
                                                            </span>
                                                        </div>
                                                        <h4 className="text-xl font-[800] text-slate-900 tracking-tight mt-1">{entry.title}</h4>
                                                    </div>
                                                    <button className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                                        <MoreHorizontal className="w-5 h-5" />
                                                    </button>
                                                </div>
                                                
                                                {/* Card Body */}
                                                <div className="p-7">
                                                    <p className="text-sm lg:text-[15px] font-medium text-slate-600 leading-[1.8] whitespace-pre-wrap">
                                                        {entry.content}
                                                    </p>
                                                </div>
        
                                                {/* Card Footer */}
                                                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-xl bg-[#004F71] text-white flex items-center justify-center text-[10px] font-black shadow-md shadow-blue-900/10">
                                                            {entry.author.charAt(0)}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Signed By</span>
                                                            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">
                                                                {entry.author}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                        <button 
                                                            onClick={() => handlePrint(entry)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[9px] font-bold text-slate-500 hover:text-[#004F71] hover:border-blue-200 shadow-sm transition-all active:scale-95"
                                                        >
                                                            <Printer className="w-3 h-3" /> Print
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>

                            {/* End Cap */}
                            <div className="relative flex gap-6 opacity-30 pl-1">
                                <div className="relative z-10 w-3 h-3 rounded-full bg-slate-300 -left-[24px]" />
                                <div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">End of Record</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
}