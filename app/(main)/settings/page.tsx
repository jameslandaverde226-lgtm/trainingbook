"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  User, Shield, Bell, Database, Save, 
  Mail, Fingerprint, Loader2, Camera 
} from "lucide-react";
import { useAppStore } from "@/lib/store/useStore"; // 1. Import Store
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { currentUser } = useAppStore(); // 2. Get Real User Data
  
  // Local state for the form fields
  const [formData, setFormData] = useState({
    name: "",
    email: ""
  });
  
  const [isSaving, setIsSaving] = useState(false);

  // 3. Sync Firebase data to Form when currentUser loads
  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || "",
        email: currentUser.email || ""
      });
    }
  }, [currentUser]);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save delay (Real update logic would go here)
    await new Promise(r => setTimeout(r, 1000));
    toast.success("Profile Updated");
    setIsSaving(false);
  };

  // Helper to get initials if image fails
  const initials = currentUser?.name 
    ? currentUser.name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2) 
    : "OP";

  if (!currentUser) {
      return (
          <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
              <Loader2 className="w-8 h-8 animate-spin text-[#E51636]" />
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-12 pb-32">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-1 h-6 bg-[#E51636]" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">System Configuration</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-[1000] text-slate-900 tracking-tighter">Command Settings</h1>
            </div>
            <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-8 py-4 bg-[#E51636] hover:bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.25em] shadow-lg shadow-red-500/20 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
            >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? "Syncing..." : "Deploy Changes"}
            </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
            
            {/* SIDEBAR NAVIGATION */}
            <div className="w-full lg:w-64 shrink-0 space-y-2">
                {[
                    { id: 'identity', label: 'Identity', icon: User, active: true },
                    { id: 'ops', label: 'Operations', icon: Fingerprint, active: false },
                    { id: 'security', label: 'Security', icon: Shield, active: false },
                    { id: 'alerts', label: 'Alerts', icon: Bell, active: false },
                    { id: 'intel', label: 'Intelligence', icon: Database, active: false },
                ].map((item) => (
                    <button 
                        key={item.id}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all ${
                            item.active 
                            ? "bg-[#004F71] text-white shadow-lg shadow-blue-900/20" 
                            : "bg-white text-slate-400 hover:bg-white/80 hover:text-slate-600"
                        }`}
                    >
                        <item.icon className={`w-4 h-4 ${item.active ? "text-white" : "text-slate-300"}`} />
                        {item.label}
                        {item.active && <div className="ml-auto w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />}
                    </button>
                ))}
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 space-y-6">
                
                {/* IDENTITY CARD */}
                <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-sm border border-slate-100">
                    <div className="mb-10">
                        <h2 className="text-2xl font-[1000] text-slate-900 tracking-tight">Operator Identity</h2>
                        <p className="text-sm font-medium text-slate-400 mt-1">Manage your administrative profile and access levels.</p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-10 items-center md:items-start">
                        {/* AVATAR SECTION */}
                        <div className="relative group">
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-[32px] bg-slate-100 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden">
                                {currentUser.image ? (
                                    <img src={currentUser.image} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-4xl font-black text-slate-300">{initials}</span>
                                )}
                            </div>
                            <button className="absolute -bottom-3 -right-3 p-3 bg-slate-900 text-white rounded-xl shadow-lg hover:scale-110 transition-transform">
                                <Camera className="w-4 h-4" />
                            </button>
                        </div>

                        {/* FORM FIELDS */}
                        <div className="flex-1 w-full space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] pl-1">Display Name</label>
                                    <div className="relative">
                                        <input 
                                            value={formData.name}
                                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 outline-none focus:border-[#E51636] transition-all"
                                        />
                                        <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] pl-1">Administrative Email</label>
                                    <div className="relative">
                                        <input 
                                            value={formData.email}
                                            disabled // Email usually can't be changed easily in Firebase
                                            className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-500 outline-none cursor-not-allowed"
                                        />
                                        <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 flex items-start gap-4">
                                <div className="p-2 bg-blue-100 text-[#004F71] rounded-lg">
                                    <Shield className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-[#004F71] uppercase tracking-wide mb-0.5">Clearance Level: {currentUser.role}</p>
                                    <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                                        Your account holds <strong>{currentUser.role}</strong> privileges. 
                                        {currentUser.role === 'Director' || currentUser.role === 'Assistant Director' 
                                            ? " You have full command access to roster management and system configuration."
                                            : " Some settings may be restricted by your current clearance level."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BOTTOM WIDGET (Visual Only for now) */}
                <div className="bg-[#0F172A] rounded-[40px] p-8 md:p-12 relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-12 opacity-5">
                        <Database className="w-64 h-64 text-white" />
                     </div>
                     <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2 text-[#004F71]">
                           <span className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-400">Source: CARES Path</span>
                        </div>
                        <h3 className="text-2xl font-black text-white mb-6">Systems Nominal</h3>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Extraction Active</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{useAppStore.getState().team.length} Profiles Synced</span>
                            </div>
                        </div>
                     </div>
                </div>

            </div>
        </div>
      </div>
    </div>
  );
}