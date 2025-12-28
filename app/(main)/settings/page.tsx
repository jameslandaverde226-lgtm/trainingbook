"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  User, Shield, Fingerprint, Loader2, Camera, Plus, Check, Search, UserPlus, Save,
  ChevronDown, Trash2, RefreshCw, KeyRound, UserMinus, Lock, Unlock, FileKey, BarChart3, Users,
  Terminal, Server, AlertCircle, CheckCircle2, Activity, Mail, Crown, Star, Briefcase, RefreshCcw,
  Sparkles // Added Sparkles icon
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "@/lib/store/useStore"; 
import { auth, db } from "@/lib/firebase"; 
import { doc, getDoc, setDoc, serverTimestamp, collection, query, orderBy, limit, onSnapshot, updateDoc } from "firebase/firestore";
import { updateProfile, updateEmail, updatePassword, signOut } from "firebase/auth"; 
import toast from "react-hot-toast";
import { ROLE_HIERARCHY, Status, PermissionSet, DEFAULT_PERMISSIONS } from "../calendar/_components/types"; 
import { cn } from "@/lib/utils";
import { PermissionToggle } from "./_components/PermissionToggle";
import { format } from "date-fns";

// --- PERMISSION LABELS MAP ---
const PERMISSION_CONFIG: { key: keyof PermissionSet; label: string; desc: string; category: "ops" | "people" | "system" }[] = [
    { key: "canCreateEvents", label: "Create Missions", desc: "Start new operations or goals.", category: "ops" },
    { key: "canEditEvents", label: "Modify Logs", desc: "Edit details of existing records.", category: "ops" },
    { key: "canDeleteEvents", label: "Expunge Records", desc: "Permanently delete data.", category: "ops" },
    { key: "canViewFullRoster", label: "View Global Roster", desc: "See all staff details.", category: "people" },
    { key: "canCreateUsers", label: "Onboard Operatives", desc: "Create new login accounts.", category: "people" },
    { key: "canPromoteUsers", label: "Promote Rank", desc: "Change security clearance levels.", category: "people" },
    { key: "canAccessSettings", label: "System Config", desc: "Access this settings panel.", category: "system" },
];

export default function SettingsPage() {
  const { currentUser, team } = useAppStore(); 
  
  // Tabs
  const [activeTab, setActiveTab] = useState('identity');
  
  // Identity State
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [isSaving, setIsSaving] = useState(false);

  // Operations State
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "Team Member" as Status, dept: "FOH", linkedMemberId: "" });
  const [isCreating, setIsCreating] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  
  // NEW: Track if we are editing an existing user to change UI labels
  const [isUpdateMode, setIsUpdateMode] = useState(false);

  // --- ROLE MANAGEMENT STATE ---
  const [selectedRole, setSelectedRole] = useState<Status>("Team Member");
  const [rolePermissions, setRolePermissions] = useState<PermissionSet>(DEFAULT_PERMISSIONS["Team Member"]);
  const [isPermSaving, setIsPermSaving] = useState(false);

  // --- LOGS STATE ---
  const [systemLogs, setSystemLogs] = useState<any[]>([]);

  // --- HIERARCHY LOGIC ---
  const myLevel = ROLE_HIERARCHY[currentUser?.role || "Team Member"] || 0;
  const canCreateAccounts = myLevel >= 2;
  const canManageRoles = myLevel >= 3; 

  // Filter existing members
  const filteredMembers = useMemo(() => {
     return team.filter(m => 
        m.name.toLowerCase().includes(memberSearch.toLowerCase())
     );
  }, [team, memberSearch]);

  // --- UPDATED FILTER: Only show users who ACTUALLY have login access ---
  const activeUsers = useMemo(() => {
      return team.filter(m => m.hasLogin === true).sort((a, b) => {
          // Sort by Rank High -> Low
          return (ROLE_HIERARCHY[b.role] || 0) - (ROLE_HIERARCHY[a.role] || 0);
      });
  }, [team]);

  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        name: currentUser.name || "",
        email: currentUser.email || ""
      }));
    }
  }, [currentUser]);

  // Load Permissions on Role Change
  useEffect(() => {
    const loadPermissions = async () => {
        setRolePermissions(DEFAULT_PERMISSIONS[selectedRole]);
    };
    loadPermissions();
  }, [selectedRole]);

  // Load System Logs when on that tab
  useEffect(() => {
      if (activeTab === 'logs') {
          const q = query(collection(db, "systemLogs"), orderBy("timestamp", "desc"), limit(20));
          const unsub = onSnapshot(q, (snapshot) => {
              setSystemLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
          });
          return () => unsub();
      }
  }, [activeTab]);

  // --- HANDLERS ---
  const handleTogglePermission = (key: keyof PermissionSet) => {
      if (selectedRole === "Director") return; 
      setRolePermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSavePermissions = async () => {
      setIsPermSaving(true);
      try {
          await setDoc(doc(db, "roles", selectedRole), { ...rolePermissions, updatedAt: serverTimestamp() });
          toast.success(`${selectedRole} protocols updated.`);
      } catch (e) {
          toast.error("Failed to update protocols.");
      } finally {
          setIsPermSaving(false);
      }
  };

  const selectMemberForActivation = (member: any) => {
      // DETECT IF USER ALREADY HAS ACCESS
      const alreadyHasLogin = member.hasLogin === true;
      setIsUpdateMode(alreadyHasLogin);

      setNewUser({
          ...newUser,
          name: member.name,
          email: member.email || "", 
          role: member.role || "Team Member",
          dept: member.dept || "FOH",
          linkedMemberId: member.id,
          password: "" // Clear password field for new entry
      });
      setMemberSearch(""); 
      toast.success(alreadyHasLogin ? `Editing Access: ${member.name}` : `Selected: ${member.name}`);
  };

  // --- NEW: MANUALLY CREATE A MEMBER ID IF NOT FOUND ---
  const handleManualCreationSelect = () => {
      const generatedId = `manual_${Date.now()}`; // Simple unique ID
      setIsUpdateMode(false);
      
      setNewUser({
          ...newUser,
          name: memberSearch, // Use the search term as the name
          email: "",
          role: "Team Member",
          dept: "FOH",
          linkedMemberId: generatedId,
          password: ""
      });
      setMemberSearch("");
      toast.success(`Creating New Profile: ${memberSearch}`);
  };

  const provisionViaApi = async () => {
      if (!currentUser) return;
      if (!formData.password) throw new Error("Password required for initialization.");

      const res = await fetch('/api/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              name: formData.name,
              email: formData.email,
              password: formData.password,
              role: currentUser.role, 
              linkedMemberId: currentUser.uid
          })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Provisioning failed");
      return data;
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    
    setIsSaving(true);
    const toastId = toast.loading("Deploying changes...");

    try {
        if (auth.currentUser) {
            try {
                const user = auth.currentUser;
                const updates = [];
                if (formData.email !== user.email) updates.push(updateEmail(user, formData.email));
                if (formData.password) updates.push(updatePassword(user, formData.password));
                if (formData.name !== user.displayName) updates.push(updateProfile(user, { displayName: formData.name }));
                await Promise.all(updates);
                
                toast.success("Identity Updated", { id: toastId });
                setFormData(prev => ({ ...prev, password: "" }));
            } catch (authError: any) {
                if (authError.code === 'auth/user-token-expired' || authError.code === 'auth/requires-recent-login' || authError.code === 'auth/operation-not-allowed') {
                    console.log("Auth session stale, forcing API update...");
                    await provisionViaApi();
                    toast.success("Account Re-initialized. Please Log In.", { id: toastId });
                    await signOut(auth);
                } else {
                    throw authError;
                }
            }
        } else {
            await provisionViaApi();
            toast.success("Account Initialized. Please Log In.", { id: toastId });
        }
        await updateDoc(doc(db, "teamMembers", currentUser.uid), {
            name: formData.name,
            email: formData.email,
            updatedAt: serverTimestamp()
        });
    } catch (error: any) {
        console.error(error);
        toast.error(error.message || "Update Failed", { id: toastId });
    } finally {
        setIsSaving(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
      e.preventDefault();
      // Ensure we have an ID (either selected or generated)
      if (!newUser.linkedMemberId) return toast.error("Please select a team member or create a new one.");
      
      setIsCreating(true);
      try {
          let token = "";
          try { token = await auth.currentUser?.getIdToken() || ""; } catch(e) {}
          
          const res = await fetch('/api/create-user', {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': token ? `Bearer ${token}` : '' 
              },
              body: JSON.stringify(newUser)
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          toast.success(isUpdateMode ? `Credentials Updated: ${newUser.name}` : `Access Granted: ${newUser.name}`);
          setNewUser({ name: "", email: "", password: "", role: "Team Member", dept: "FOH", linkedMemberId: "" });
          setIsUpdateMode(false);
      } catch (error: any) {
          toast.error(error.message || "Failed to create operative");
      } finally {
          setIsCreating(false);
      }
  };

  const handleRevokeAccess = async (userId: string) => {
     if(!confirm("Are you sure you want to revoke login access? This cannot be undone from the dashboard.")) return;
     try {
         await updateDoc(doc(db, "teamMembers", userId), { hasLogin: false });
         toast.success("Access Revoked");
     } catch(e) {
         toast.error("Failed to revoke");
     }
  };

  const availableRoles = [
      { id: "Team Member", label: "Team Member (Lvl 0)", level: 0 },
      { id: "Team Leader", label: "Team Leader (Lvl 1)", level: 1 },
      { id: "Assistant Director", label: "Assistant Director (Lvl 2)", level: 2 },
      { id: "Director", label: "Director (Lvl 3)", level: 3 },
  ].filter(r => r.level < myLevel || myLevel === 4); 

  // --- HELPER: Role Styling ---
  const getRoleStyle = (role: string) => {
      switch(role) {
          case 'Admin': return "bg-slate-900 text-white border-slate-700";
          case 'Director': return "bg-[#004F71] text-white border-[#004F71]";
          case 'Assistant Director': return "bg-blue-50 text-[#004F71] border-blue-100";
          case 'Team Leader': return "bg-amber-50 text-amber-600 border-amber-100";
          default: return "bg-slate-50 text-slate-500 border-slate-100";
      }
  };

  const getRoleIcon = (role: string) => {
      switch(role) {
          case 'Admin': return Crown;
          case 'Director': return Shield;
          case 'Assistant Director': return Briefcase;
          case 'Team Leader': return Star;
          default: return User;
      }
  };

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
            
            {activeTab === 'roles' && (
                <button onClick={handleSavePermissions} disabled={isPermSaving} className="px-8 py-4 bg-[#004F71] text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.25em] shadow-lg shadow-blue-900/20 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50">
                    {isPermSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Protocols
                </button>
            )}
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
            
            {/* SIDEBAR */}
            <div className="w-full lg:w-64 shrink-0 space-y-2">
                {[
                    { id: 'identity', label: 'Identity', icon: User, visible: true },
                    { id: 'ops', label: 'Operations', icon: Fingerprint, visible: canCreateAccounts }, 
                    { id: 'roles', label: 'Access Control', icon: FileKey, visible: canManageRoles }, 
                    { id: 'logs', label: 'System Logs', icon: Terminal, visible: true },
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
                                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 outline-none focus:border-[#E51636] transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2 col-span-1 md:col-span-2">
                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] pl-1">
                                            {auth.currentUser ? "Change Password" : "Set Initial Password"}
                                        </label>
                                        <div className="relative group">
                                            <input 
                                                type="password"
                                                value={formData.password}
                                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                                placeholder={auth.currentUser ? "Enter new password to change..." : "Create password to enable login..."}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 outline-none focus:border-[#E51636] transition-all"
                                            />
                                            <KeyRound className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-[#E51636] transition-colors" />
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
                                <div className={cn("p-3 rounded-2xl transition-colors", isUpdateMode ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600")}>
                                    {isUpdateMode ? <RefreshCcw className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
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
                                    {/* DROPDOWN LOGIC */}
                                    {memberSearch.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 max-h-48 overflow-y-auto z-20">
                                            {filteredMembers.length > 0 ? (
                                                filteredMembers.map(m => (
                                                    <button 
                                                        key={m.id}
                                                        onClick={() => selectMemberForActivation(m)}
                                                        className="w-full text-left px-5 py-3 hover:bg-slate-50 text-sm font-bold text-slate-700 flex justify-between items-center"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span>{m.name}</span>
                                                            {m.hasLogin && <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[8px] font-black uppercase">Active</span>}
                                                        </div>
                                                        <span className="text-[10px] uppercase text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{m.role}</span>
                                                    </button>
                                                ))
                                            ) : (
                                                /* --- CREATE NEW OPTION --- */
                                                <button 
                                                    onClick={handleManualCreationSelect}
                                                    className="w-full text-left px-5 py-4 hover:bg-emerald-50 text-sm font-bold text-slate-600 flex items-center gap-3 transition-colors"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                                        <Plus className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-emerald-700">Create New: &quot;{memberSearch}&quot;</p>
                                                        <p className="text-[10px] font-medium text-emerald-600/70">Add manual entry to database</p>
                                                    </div>
                                                </button>
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
                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] pl-1">
                                            {isUpdateMode ? "New Password" : "Initial Password"}
                                        </label>
                                        <input required type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} placeholder="••••••••" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 outline-none focus:border-[#E51636] transition-all" />
                                    </div>
                                    
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
                                    className={cn(
                                        "w-full py-5 text-white rounded-2xl font-black uppercase text-xs tracking-[0.3em] shadow-xl hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50",
                                        isUpdateMode ? "bg-[#004F71] hover:bg-[#003b55]" : "bg-slate-900 hover:bg-black"
                                    )}
                                >
                                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : isUpdateMode ? <RefreshCcw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                                    {isUpdateMode ? "Update Credentials" : "Create & Initialize"}
                                </button>
                            </form>
                        </div>

                        {/* 2. MANAGE ACTIVE ACCOUNTS */}
                        <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-sm border border-slate-100">
                             <div className="mb-8 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-[1000] text-slate-900 tracking-tight">Active Accounts</h2>
                                    <p className="text-xs font-medium text-slate-400 mt-1">Users with authenticated system login.</p>
                                </div>
                                <div className="p-2.5 bg-slate-100 text-slate-500 rounded-xl">
                                    <KeyRound className="w-5 h-5" />
                                </div>
                            </div>

                            <div className="space-y-3">
                                {activeUsers.length > 0 ? activeUsers.map(user => {
                                    const RoleIcon = getRoleIcon(user.role);
                                    return (
                                        <div key={user.id} className="group flex items-center p-4 bg-white border border-slate-100 rounded-3xl hover:shadow-md hover:border-slate-200 transition-all">
                                            {/* Avatar Area */}
                                            <div className="relative shrink-0">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden">
                                                    {user.image && !user.image.includes('ui-avatars') ? (
                                                        <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-lg font-black text-slate-300">{user.name.charAt(0)}</span>
                                                    )}
                                                </div>
                                                <div className={cn("absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-white", user.dept === 'FOH' ? "bg-[#004F71]" : "bg-[#E51636]")}>
                                                    <RoleIcon className="w-2.5 h-2.5 text-white" />
                                                </div>
                                            </div>

                                            {/* Info Area */}
                                            <div className="flex-1 ml-4 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <h3 className="text-sm font-bold text-slate-900 truncate">{user.name}</h3>
                                                    <span className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border", getRoleStyle(user.role))}>
                                                        {user.role}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <Mail className="w-3 h-3" />
                                                    <p className="text-[10px] font-medium truncate">{user.email}</p>
                                                </div>
                                            </div>

                                            {/* Actions Area */}
                                            <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => selectMemberForActivation(user)}
                                                    className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors" 
                                                    title="Edit Password"
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleRevokeAccess(user.id)}
                                                    className="p-2.5 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors" 
                                                    title="Revoke Access"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl">
                                        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-xs font-bold uppercase tracking-widest">No active logins found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB: ROLES (RBAC) --- */}
                {activeTab === 'roles' && canManageRoles && (
                    <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-sm border border-slate-100">
                         {/* (Existing role content preserved) */}
                        <div className="mb-10">
                            <h2 className="text-2xl font-[1000] text-slate-900 tracking-tight">Access Protocols</h2>
                            <p className="text-sm font-medium text-slate-400 mt-1">Configure capability matrix for each rank.</p>
                        </div>

                        {/* ROLE SELECTOR */}
                        <div className="flex p-1.5 bg-slate-100 rounded-2xl mb-8 overflow-x-auto no-scrollbar">
                            {["Team Member", "Team Leader", "Assistant Director", "Director"].map((role) => (
                                <button
                                    key={role}
                                    onClick={() => setSelectedRole(role as Status)}
                                    className={cn(
                                        "flex-1 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap",
                                        selectedRole === role 
                                            ? "bg-white text-slate-900 shadow-sm" 
                                            : "text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    {role.replace("Assistant", "Asst.")}
                                </button>
                            ))}
                        </div>

                        {/* PERMISSIONS GRID */}
                        <div className="space-y-8">
                            
                            {/* CATEGORY: OPERATIONS */}
                            <div>
                                <div className="flex items-center gap-2 mb-4 px-1">
                                    <Fingerprint className="w-4 h-4 text-[#004F71]" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Operational Access</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {PERMISSION_CONFIG.filter(p => p.category === "ops").map(p => (
                                        <PermissionToggle 
                                            key={p.key} 
                                            label={p.label} 
                                            description={p.desc} 
                                            isEnabled={rolePermissions[p.key]} 
                                            onToggle={() => handleTogglePermission(p.key)}
                                            disabled={selectedRole === "Director"}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* CATEGORY: PEOPLE */}
                            <div>
                                <div className="flex items-center gap-2 mb-4 px-1">
                                    <Users className="w-4 h-4 text-[#E51636]" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Personnel Management</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {PERMISSION_CONFIG.filter(p => p.category === "people").map(p => (
                                        <PermissionToggle 
                                            key={p.key} 
                                            label={p.label} 
                                            description={p.desc} 
                                            isEnabled={rolePermissions[p.key]} 
                                            onToggle={() => handleTogglePermission(p.key)}
                                            disabled={selectedRole === "Director"}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* CATEGORY: SYSTEM */}
                            <div>
                                <div className="flex items-center gap-2 mb-4 px-1">
                                    <Shield className="w-4 h-4 text-slate-900" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">System Intelligence</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {PERMISSION_CONFIG.filter(p => p.category === "system").map(p => (
                                        <PermissionToggle 
                                            key={p.key} 
                                            label={p.label} 
                                            description={p.desc} 
                                            isEnabled={rolePermissions[p.key]} 
                                            onToggle={() => handleTogglePermission(p.key)}
                                            disabled={selectedRole === "Director"}
                                        />
                                    ))}
                                </div>
                            </div>

                            {selectedRole === "Director" && (
                                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-center gap-3 text-blue-600">
                                    <Lock className="w-4 h-4" />
                                    <span className="text-[10px] font-bold uppercase tracking-wide">Director Clearance is Immutable</span>
                                </div>
                            )}

                        </div>
                    </div>
                )}
                
                {/* --- TAB: SYSTEM LOGS --- */}
                {activeTab === 'logs' && (
                    <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-sm border border-slate-100 relative overflow-hidden">
                        {/* Header */}
                        <div className="mb-8 relative z-10 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-[1000] text-slate-900 tracking-tight">System Logs</h2>
                                <p className="text-sm font-medium text-slate-400 mt-1">Real-time uplink from backend services.</p>
                            </div>
                            <div className="p-3 bg-slate-100 rounded-2xl">
                                <Activity className="w-6 h-6 text-slate-400" />
                            </div>
                        </div>

                        {/* Terminal / Log Viewer */}
                        <div className="bg-slate-50 rounded-[24px] border border-slate-200 p-2 relative z-10 font-mono overflow-hidden shadow-inner">
                            
                            {/* Toolbar */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/60 bg-white/50 rounded-t-[18px]">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                                    <span className="ml-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest">Connection: Active</span>
                                </div>
                                <span className="text-[9px] font-black text-slate-300 uppercase">TrainingBook Kernel v4.2</span>
                            </div>

                            {/* Logs List */}
                            <div className="p-3 space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                                {systemLogs.length > 0 ? systemLogs.map((log) => (
                                    <div key={log.id} className="group flex items-start gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm transition-all hover:shadow-md hover:border-slate-200">
                                        
                                        {/* Status Icon */}
                                        <div className={cn(
                                            "shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mt-0.5",
                                            log.status === "SUCCESS" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                                        )}>
                                            {log.status === "SUCCESS" ? (
                                                <CheckCircle2 className="w-5 h-5" />
                                            ) : (
                                                <AlertCircle className="w-5 h-5" />
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1.5">
                                                <span className={cn(
                                                    "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border",
                                                    log.status === "SUCCESS" ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-red-50 border-red-100 text-red-700"
                                                )}>
                                                    {log.status}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                                    {log.timestamp?.toDate ? format(log.timestamp.toDate(), "MMM dd • HH:mm:ss") : "Just now"}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-600 font-medium break-all leading-relaxed font-sans">
                                                {log.message}
                                            </p>
                                        </div>

                                        {/* Source Badge */}
                                        <div className="shrink-0 hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                                            <Server className="w-3 h-3 text-slate-400" />
                                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider">{log.source}</span>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                                        <Loader2 className="w-10 h-10 animate-spin mb-4 opacity-20" />
                                        <p className="text-xs font-bold uppercase tracking-widest opacity-50">Waiting for uplink...</p>
                                    </div>
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