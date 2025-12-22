"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Lock, ChevronRight, Loader2, ShieldAlert } from "lucide-react";
import { useAppStore } from "@/lib/store/useStore";
import toast from "react-hot-toast";

// Chick-fil-A Red Hex
const CFA_RED = "#E51636";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAppStore();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      toast.success("Identity Verified");
      router.push("/dashboard");
    } catch (error: any) {
      toast.error("Access Denied: Invalid Credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // 1. Clean White Background
    <div className="min-h-screen bg-white flex items-center justify-center p-6 relative overflow-hidden font-sans">
      
      {/* Subtle Background Pattern (Optional, e.g., a very light waffle fry pattern) */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#E51636 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        // 2. Gorgeous White Login Card with Red Accent
        className="w-full max-w-md bg-white p-10 md:p-12 rounded-[40px] shadow-[0_20px_60px_-15px_rgba(229,22,54,0.15)] relative z-10 border-t-4 border-[#E51636]"
      >
        <div className="flex flex-col items-center mb-10 text-center">
          {/* 3. Chick-fil-A Themed Branding */}
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-red-100">
             {/* You can replace this with a CFA logo SVG */}
             <Lock className="w-10 h-10 text-[#E51636]" />
          </div>
          <h1 className="text-3xl font-black text-[#E51636] tracking-tighter uppercase mb-2">TrainingBook</h1>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em]">Operational Command Access</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {/* 4. Clean, Rounded Input Fields */}
          <div className="space-y-2">
             <label className="text-xs font-black text-slate-700 uppercase tracking-widest pl-3">Operator ID</label>
             <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 font-bold outline-none focus:border-[#E51636] focus:ring-4 focus:ring-red-500/10 transition-all placeholder:text-slate-400"
                placeholder="Enter email address..."
             />
          </div>
          
          <div className="space-y-2">
             <label className="text-xs font-black text-slate-700 uppercase tracking-widest pl-3">Security Key</label>
             <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 font-bold outline-none focus:border-[#E51636] focus:ring-4 focus:ring-red-500/10 transition-all placeholder:text-slate-400"
                placeholder="••••••••"
             />
          </div>

          {/* 5. Bold Chick-fil-A Red Button */}
          <button 
            disabled={isLoading}
            className="w-full py-4 mt-4 bg-[#E51636] hover:bg-red-700 text-white rounded-2xl font-black uppercase text-sm tracking-[0.2em] shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Init Sequence <ChevronRight className="w-5 h-5" /></>}
          </button>
        </form>

        {/* 6. Footer with Red Icon */}
        <div className="mt-8 pt-8 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-500">
           <ShieldAlert className="w-4 h-4 text-[#E51636]" />
           <span className="text-xs font-bold">Restricted Personnel Only</span>
        </div>
      </motion.div>
    </div>
  );
}