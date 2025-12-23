"use client";

import { useState, useEffect, useMemo } from "react";
// Added: Trash2, RefreshCw, KeyRound, UserMinus
import { 
  User, Shield, Fingerprint, Loader2, Camera, Plus, Check, Search, UserPlus, Save,
  ChevronDown, Trash2, RefreshCw, KeyRound, UserMinus 
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion"; // Added for dropdown
import { useAppStore } from "@/lib/store/useStore"; 
import { auth } from "@/lib/firebase"; 
import toast from "react-hot-toast";
import { ROLE_HIERARCHY, Status } from "../calendar/_components/types"; 
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { currentUser, team } = useAppStore(); 
  
  const [activeTab, setActiveTab] = useState('identity');
  const [formData, setFormData] = useState({ name: "", email: "" });
  const [isSaving, setIsSaving] = useState(false);

  // New User Form State
  const [newUser, setNewUser] = useState({ 
    name: "", 
    email: "", 
    password: "", 
    role: "Team Member" as Status, 
    dept: "FOH",
    linkedMemberId: "" 
  });
  const [isCreating, setIsCreating] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  
  // State for Custom Dropdown
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  // --- HIERARCHY LOGIC ---
  const myLevel = ROLE_HIERARCHY[currentUser?.role || "Team Member"] || 0;
  const canCreateAccounts = myLevel >= 2;

  // Filter existing members
  const filteredMembers = useMemo(() => {
     return team.filter(m => 
        m.name.toLowerCase().includes(memberSearch.toLowerCase())
     );
  }, [team, memberSearch]);

  // Filter members WHO HAVE ACCESS (for management list)
  // Assuming 'hasLogin' flag exists, or we check if they have a specialized role
  const activeUsers = useMemo(() => {
      // In a real app, you might want to fetch a list of auth users from an API
      // For now, let's assume anyone with a role > Team Member has a login, or use a flag
      return team.filter(m => m.status !== "Team Member" && m.status !== "Onboarding" && m.status !== "Training");
  }, [team]);

  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || "",
        email: currentUser.email || ""
      });
    }
  }, [currentUser]);

  const selectMemberForActivation = (member: any) => {
      setNewUser({
          ...newUser,
          name: member.name,
          email: member.email || "", 
          role: member.role || "Team Member",
          dept: member.dept || "FOH",
          linkedMemberId: member.id
      });
      setMemberSearch(""); 
      toast.success(`Selected: ${member.name}`);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 1000));
    toast.success("Profile Updated");
    setIsSaving(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newUser.linkedMemberId) return toast.error("Please select a team member from the roster first.");
      
      setIsCreating(true);
      try {
          const token = await auth.currentUser?.getIdToken();
          if (!token) throw new Error("Authentication Token Missing");

          const res = await fetch('/api/admin/create-user', {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}` 
              },
              body: JSON.stringify(newUser)
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          toast.success(`Access Granted: ${newUser.name}`);
          setNewUser({ name: "", email: "", password: "", role: "Team Member", dept: "FOH", linkedMemberId: "" });
      } catch (error: any) {
          toast.error(error.message || "Failed to create operative");
      } finally {
          setIsCreating(false);
      }
  };

  // Define available roles based on hierarchy
  const availableRoles = [
      { id: "Team Member", label: "Team Member (Lvl 0)", level: 0 },
      { id: "Team Leader", label: "Team Leader (Lvl 1)", level: 1 },
      { id: "Assistant Director", label: "Assistant Director (Lvl 2)", level: 2 },
      { id: "Director", label: "Director (Lvl 3)", level: 3 },
  ].filter(r => r.level < myLevel || myLevel === 4); // Only allow creating roles below yours, unless Admin(4)

  if (!currentUser) return <div className="flex h-screen items-center justify-center bg-[#F8FAFC]"><Loader2 className="w-8 h-8 animate-spin text-[#E51636]" /></div>;

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
            {activeTab === 'identity' && (
                <button onClick={handleSaveProfile} disabled={isSaving} className="px-8 py-4 bg-[#E51636] hover:bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.25em] shadow-lg shadow-red-500/20 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Deploy Changes
                </button>
            )}
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
            
            {/* SIDEBAR */}
            <div className="w-full lg:w-64 shrink-0 space-y-2">
                {[
                    { id: 'identity', label: 'Identity', icon: User, visible: true },
                    { id: 'ops', label: 'Operations', icon: Fingerprint, visible: canCreateAccounts }, 
                    { id: 'security', label: 'Security', icon: Shield, visible: true },
                ].filter(i => i.visible).map((item) => (
                    <button 
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all ${
                            activeTab === item.id 
                            ? "bg-[#004F71] text-white shadow-lg shadow-blue-900/20" 
                            : "bg-white text-slate-400 hover:bg-white/80 hover:text-slate-600"
                        }`}
                    >
                        <item.icon className={`w-4 h-4 ${activeTab === item.id ? "text-white" : "text-slate-300"}`} />
                        {item.label}
                    </button>
                ))}
            </div>

            {/* CONTENT */}
            <div className="flex-1 space-y-6">
                
                {/* --- TAB: IDENTITY --- */}
                {activeTab === 'identity' && (
                    <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-sm border border-slate-100">
                         {/* ... (Identity Content remains same) ... */}
                         <div className="mb-10">
                            <h2 className="text-2xl font-[1000] text-slate-900 tracking-tight">Operator Identity</h2>
                            <p className="text-sm font-medium text-slate-400 mt-1">Manage your administrative profile.</p>
                        </div>
                        <div className="flex flex-col md:flex-row gap-10 items-center md:items-start">
                            <div className="relative group">
                                <div className="w-32 h-32 md:w-40 md:h-40 rounded-[32px] bg-slate-100 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden">
                                    {currentUser.image ? (
                                        <img src={currentUser.image} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-4xl font-black text-slate-300">{currentUser.name?.charAt(0) || "U"}</span>
                                    )}
                                </div>
                                <button className="absolute -bottom-3 -right-3 p-3 bg-slate-900 text-white rounded-xl shadow-lg hover:scale-110 transition-transform">
                                    <Camera className="w-4 h-4" />
                                </button>
                            </div>

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
                                                disabled 
                                                className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-500 outline-none cursor-not-allowed"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 flex items-start gap-4">
                                    <div className="p-2 bg-blue-100 text-[#004F71] rounded-lg"><Shield className="w-4 h-4" /></div>
                                    <div>
                                        <p className="text-xs font-black text-[#004F71] uppercase tracking-wide mb-0.5">Rank: {currentUser.role}</p>
                                        <p className="text-[11px] font-medium text-slate-500">Level {myLevel} Access Clearance.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB: OPERATIONS (Create & Manage) --- */}
                {activeTab === 'ops' && canCreateAccounts && (
                    <div className="space-y-6">
                        
                        {/* 1. ONBOARDING CARD */}
                        <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-sm border border-slate-100">
                            <div className="mb-10 flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-[1000] text-slate-900 tracking-tight">Personnel Onboarding</h2>
                                    <p className="text-sm font-medium text-slate-400 mt-1">Grant system access to existing team members.</p>
                                </div>
                                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                                    <UserPlus className="w-6 h-6" />
                                </div>
                            </div>

                            {/* --- TEAM MEMBER SELECTOR --- */}
                            <div className="mb-8 p-6 bg-slate-50 rounded-3xl border border-slate-200">
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3 block flex items-center gap-2">
                                    <Search className="w-3 h-3" /> Select Team Member to Activate
                                </label>
                                <div className="relative group">
                                    <input 
                                        value={memberSearch}
                                        onChange={(e) => setMemberSearch(e.target.value)}
                                        placeholder="Search roster..."
                                        className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold text-slate-900 outline-none focus:border-[#E51636] transition-all"
                                    />
                                    {memberSearch.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 max-h-48 overflow-y-auto z-20">
                                            {filteredMembers.length > 0 ? (
                                                filteredMembers.map(m => (
                                                    <button 
                                                        key={m.id}
                                                        onClick={() => selectMemberForActivation(m)}
                                                        className="w-full text-left px-5 py-3 hover:bg-slate-50 text-sm font-bold text-slate-700 flex justify-between items-center"
                                                    >
                                                        <span>{m.name}</span>
                                                        <span className="text-[10px] uppercase text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{m.role}</span>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="p-4 text-xs text-slate-400 font-bold text-center">No members found</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="w-full h-px bg-slate-100 mb-8" />

                            <form onSubmit={handleCreateUser} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] pl-1">Operative Name</label>
                                        <input required value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} placeholder="e.g. John Doe" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 outline-none focus:border-[#E51636] transition-all" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] pl-1">Secure Email</label>
                                        <input required type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} placeholder="john@trainingbook.com" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 outline-none focus:border-[#E51636] transition-all" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] pl-1">Initial Password</label>
                                        <input required type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} placeholder="••••••••" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 outline-none focus:border-[#E51636] transition-all" />
                                    </div>
                                    
                                    {/* --- CUSTOM DROPDOWN FOR CLEARANCE LEVEL --- */}
                                    <div className="space-y-2 relative">
                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] pl-1">Clearance Level</label>
                                        <button 
                                            type="button"
                                            onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 outline-none focus:border-[#E51636] transition-all flex items-center justify-between"
                                        >
                                            <span>{availableRoles.find(r => r.id === newUser.role)?.label || newUser.role}</span>
                                            <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isRoleDropdownOpen && "rotate-180")} />
                                        </button>
                                        
                                        <AnimatePresence>
                                            {isRoleDropdownOpen && (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                                                    className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl z-30 overflow-hidden"
                                                >
                                                    {availableRoles.map(role => (
                                                        <button
                                                            key={role.id}
                                                            type="button"
                                                            onClick={() => { setNewUser({...newUser, role: role.id as Status}); setIsRoleDropdownOpen(false); }}
                                                            className="w-full text-left px-5 py-3 hover:bg-slate-50 text-sm font-bold text-slate-700 flex items-center gap-2"
                                                        >
                                                            <span className={cn("w-2 h-2 rounded-full", newUser.role === role.id ? "bg-[#004F71]" : "bg-slate-200")} />
                                                            {role.label}
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] pl-1">Unit Assignment</label>
                                        <div className="flex gap-4">
                                            {['FOH', 'BOH'].map(dept => (
                                                <button 
                                                    key={dept}
                                                    type="button"
                                                    onClick={() => setNewUser({...newUser, dept})}
                                                    className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all ${newUser.dept === dept ? (dept === 'FOH' ? 'bg-[#004F71] text-white border-[#004F71]' : 'bg-[#E51636] text-white border-[#E51636]') : 'bg-white border-slate-200 text-slate-400'}`}
                                                >
                                                    {dept}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                
                                <button 
                                    type="submit"
                                    disabled={isCreating}
                                    className="w-full py-5 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase text-xs tracking-[0.3em] shadow-xl hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Initialize Operative
                                </button>
                            </form>
                        </div>

                        {/* 2. MANAGE ACTIVE ACCOUNTS (NEW SECTION) */}
                        <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-sm border border-slate-100">
                             <div className="mb-8 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-[1000] text-slate-900 tracking-tight">Active Accounts</h2>
                                    <p className="text-xs font-medium text-slate-400 mt-1">Users with system login access.</p>
                                </div>
                                <div className="p-2.5 bg-slate-100 text-slate-500 rounded-xl">
                                    <KeyRound className="w-5 h-5" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                {activeUsers.length > 0 ? activeUsers.map(user => (
                                    <div key={user.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-black text-sm text-slate-700 shadow-sm">
                                                {user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{user.name}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{user.role}</span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                    <span className="text-[9px] font-medium text-slate-400">{user.email}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-all" title="Reset Password">
                                                <RefreshCw className="w-4 h-4" />
                                            </button>
                                            <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Revoke Login Access">
                                                <UserMinus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-8 text-slate-400 text-xs font-bold uppercase tracking-widest">No active login accounts</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}