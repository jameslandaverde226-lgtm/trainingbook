"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Lock, ChevronRight, Loader2, ShieldAlert } from "lucide-react";
import { useAppStore } from "@/lib/store/useStore";
import toast from "react-hot-toast";

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
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-[#E51636] rounded-full mix-blend-multiply filter blur-[120px] opacity-20 animate-pulse" />
         <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#004F71] rounded-full mix-blend-multiply filter blur-[120px] opacity-20" />
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 p-8 md:p-10 rounded-[40px] shadow-2xl relative z-10 ring-1 ring-white/10"
      >
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 shadow-lg border border-white/10">
             <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">TrainingBook</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Operational Command Access</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-3">Operator ID</label>
             <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-[#E51636] transition-colors placeholder:text-white/20"
                placeholder="Enter email address..."
             />
          </div>
          
          <div className="space-y-1">
             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-3">Security Key</label>
             <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-[#E51636] transition-colors placeholder:text-white/20"
                placeholder="••••••••"
             />
          </div>

          <button 
            disabled={isLoading}
            className="w-full py-4 mt-4 bg-[#E51636] hover:bg-red-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-lg shadow-red-900/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Init Sequence <ChevronRight className="w-4 h-4" /></>}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-center gap-2 text-white/30">
           <ShieldAlert className="w-4 h-4" />
           <span className="text-[10px] font-medium">Restricted Personnel Only</span>
        </div>
      </motion.div>
    </div>
  );
}