"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Shield, Bell, Database, Cpu, 
  ChevronRight, Check, Save, RefreshCw, 
  Lock, Fingerprint, Globe, AlertTriangle, 
  Cloud, Terminal, Zap, Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// Store Integration
import { useAppStore } from "@/lib/store/useStore";

type TabID = "identity" | "operations" | "security" | "alerts" | "intelligence";

export default function AdvancedSettings() {
  const { team, subscribeTeam, events } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabID>("identity");
  const [isSyncing, setIsSyncing] = useState(false);

  // --- HANDLERS ---
  const handleManualExtraction = () => {
    setIsSyncing(true);
    // Re-trigger the cross-project subscription
    subscribeTeam(); 
    
    setTimeout(() => {
      setIsSyncing(false);
      toast.success("CARES PATH DATA EXTRACTED", {
        style: { background: '#0F172A', color: '#fff', fontWeight: '900', borderRadius: '15px' }
      });
    }, 1500);
  };

  const menuItems = [
    { id: "identity", label: "Identity", icon: User },
    { id: "operations", label: "Operations", icon: Cpu },
    { id: "security", label: "Security", icon: Shield },
    { id: "alerts", label: "Alerts", icon: Bell },
    { id: "intelligence", label: "Intelligence", icon: Database },
  ];

  return (
    <div className="max-w-[1700px] mx-auto pt-10 pb-20 px-6 space-y-10">
      
      {/* --- COMMAND HEADER --- */}
      <div className="flex items-center justify-between px-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-6 bg-[#E51636] rounded-full" />
             <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">System Configuration</span>
          </div>
          <h1 className="text-6xl font-black text-slate-900 tracking-tighter leading-none">Command Settings</h1>
        </div>

        <button 
          onClick={handleManualExtraction}
          disabled={isSyncing}
          className="group relative px-10 py-5 bg-[#E51636] text-white rounded-[24px] font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl shadow-red-900/20 hover:scale-[1.03] active:scale-95 transition-all flex items-center gap-4 overflow-hidden disabled:opacity-50"
        >
          {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Deploy Changes</span>
        </button>
      </div>

      <div className="grid grid-cols-12 gap-12 items-start">
        
        {/* --- LEFT SIDEBAR --- */}
        <div className="col-span-3 space-y-8">
          <div className="bg-white/50 backdrop-blur-md rounded-[32px] p-2 space-y-1 border border-slate-100 shadow-sm">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as TabID)}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-[24px] transition-all duration-500 group",
                    isActive ? "bg-white shadow-xl shadow-slate-200/40 ring-1 ring-black/5" : "hover:bg-white/80"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                      isActive ? "bg-[#004F71] text-white shadow-lg" : "bg-slate-100 text-slate-400 group-hover:bg-white"
                    )}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className={cn(
                      "text-xs font-black uppercase tracking-widest",
                      isActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"
                    )}>
                      {item.label}
                    </span>
                  </div>
                  {isActive && (
                    <motion.div layoutId="chevron" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                       <ChevronRight className="w-4 h-4 text-[#E51636]" />
                    </motion.div>
                  )}
                </button>
              );
            })}
          </div>

          {/* CLOUD STATUS WIDGET */}
          <div className="bg-[#0F172A] rounded-[40px] p-8 text-white relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all" />
             <div className="relative z-10 space-y-6">
                <div>
                   <p className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-400 mb-1">Source: CARES Path</p>
                   <h4 className="text-xl font-black tracking-tight">Systems Nominal</h4>
                </div>
                <div className="space-y-3">
                   <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Extraction Active</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{team.length} Profiles Synced</span>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* --- RIGHT CONTENT --- */}
        <div className="col-span-9 bg-white rounded-[48px] border border-slate-100 shadow-2xl shadow-slate-200/50 flex flex-col min-h-[750px] relative overflow-hidden">
          <div className="flex-1 p-12 overflow-y-auto custom-scrollbar">
            <AnimatePresence mode="wait">
              
              {activeTab === "identity" && (
                <motion.div key="identity" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-12">
                   <div className="space-y-2">
                      <h2 className="text-4xl font-black tracking-tighter text-slate-900">Operator Identity</h2>
                      <p className="text-slate-400 text-lg font-medium">Manage your administrative profile and access levels.</p>
                   </div>
                   <div className="bg-[#F8FAFC] rounded-[40px] p-10 border border-slate-100 flex items-center gap-12">
                      <div className="w-40 h-40 rounded-[56px] bg-white p-2 shadow-2xl rotate-[-3deg] border border-slate-100">
                         <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80" className="w-full h-full rounded-[48px] object-cover" />
                      </div>
                      <div className="flex-1 grid grid-cols-2 gap-8">
                         <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2">Display Name</label>
                            <input type="text" defaultValue="James Lemons" className="w-full bg-white border border-slate-200 px-6 py-4 rounded-[22px] text-sm font-black text-slate-700 outline-none focus:border-[#004F71] transition-all" />
                         </div>
                         <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2">Administrative Email</label>
                            <input type="email" defaultValue="james@trainingbook.com" className="w-full bg-white border border-slate-200 px-6 py-4 rounded-[22px] text-sm font-black text-slate-700 outline-none focus:border-[#004F71] transition-all" />
                         </div>
                      </div>
                   </div>
                </motion.div>
              )}

              {activeTab === "intelligence" && (
                <motion.div key="intel" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
                   <div className="space-y-2">
                      <h2 className="text-4xl font-black tracking-tighter text-slate-900">Extraction Manual</h2>
                      <p className="text-slate-400 text-lg font-medium">Monitoring cross-project data flow from CARES Path.</p>
                   </div>

                   <div className="grid grid-cols-2 gap-6">
                      <div className="bg-slate-900 rounded-[40px] p-8 text-white">
                         <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-500/20 rounded-xl"><Zap className="w-5 h-5 text-blue-400" /></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Live Connection</span>
                         </div>
                         <p className="text-3xl font-black mb-1">CARES-PATH-PROD</p>
                         <p className="text-slate-400 text-xs font-mono">Syncing collection: /teamMembers</p>
                         <div className="mt-8 pt-8 border-t border-white/5 flex justify-between items-center">
                            <div className="space-y-1">
                               <p className="text-[9px] font-black text-slate-500 uppercase">Profiles In State</p>
                               <p className="text-2xl font-black">{team.length}</p>
                            </div>
                            <button onClick={handleManualExtraction} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all">
                               <RefreshCw className={cn("w-5 h-5 text-white", isSyncing && "animate-spin")} />
                            </button>
                         </div>
                      </div>

                      <div className="bg-[#F8FAFC] rounded-[40px] p-8 border border-slate-100 flex flex-col justify-between">
                         <div className="flex items-center gap-3">
                            <Activity className="w-5 h-5 text-[#004F71]" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data Integrity</span>
                         </div>
                         <div className="space-y-4">
                            <div className="flex justify-between items-center">
                               <span className="text-xs font-bold text-slate-600">Cross-Project Read</span>
                               <span className="text-[10px] font-black text-emerald-500 uppercase">Success</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                               <div className="h-full w-full bg-emerald-500" />
                            </div>
                         </div>
                      </div>
                   </div>

                   {/* REAL-TIME TERMINAL LOG */}
                   <div className="bg-[#0F172A] rounded-[32px] overflow-hidden border border-slate-800">
                      <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-blue-400" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Extraction Stream</span>
                         </div>
                         <div className="flex gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-red-500/20" />
                            <div className="w-2 h-2 rounded-full bg-amber-500/20" />
                            <div className="w-2 h-2 rounded-full bg-emerald-500/20" />
                         </div>
                      </div>
                      <div className="p-6 font-mono text-[10px] space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                         {team.map((member, i) => (
                           <div key={i} className="flex gap-4 items-center opacity-80 hover:opacity-100 transition-opacity">
                              <span className="text-blue-500">[{new Date().toLocaleTimeString()}]</span>
                              <span className="text-emerald-400">EXTRACTED</span>
                              <span className="text-slate-300">Entity: {member.name}</span>
                              <span className="text-slate-500 ml-auto">UID: {member.id.substring(0,8)}...</span>
                           </div>
                         ))}
                         <div className="text-blue-400 animate-pulse mt-4">_ Listeners active. Waiting for CARES project updates...</div>
                      </div>
                   </div>
                </motion.div>
              )}
              
              {/* Placeholders for other tabs */}
              {activeTab !== "identity" && activeTab !== "intelligence" && (
                <div className="py-20 text-center text-slate-300 font-black uppercase tracking-[0.5em]">
                   Module "{activeTab}" Loading...
                </div>
              )}

            </AnimatePresence>
          </div>

          {/* --- FOOTER --- */}
          <div className="px-12 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
             <div className="flex items-center gap-4">
                <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-widest shadow-sm">v4.0.2 Stable</span>
             </div>
             <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operational Sync: Active</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}