"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2, ShieldAlert } from "lucide-react";
import { useAppStore } from "@/lib/store/useStore";
import toast from "react-hot-toast";
import Image from 'next/image';

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
    <div className="min-h-screen w-full flex bg-white font-sans">
      {/* Left Column: Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center p-8 md:p-16 lg:p-24 relative z-10">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md mx-auto"
        >
          <div className="flex flex-col items-start mb-10">
            {/* --- UPDATED ICON SECTION ---
              The container is now larger, with a prominent shadow and border.
              The SVG icon itself is sized to look grand and central.
            */}
            <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-[0_10px_30px_-10px_rgba(229,22,54,0.3)] border-[3px] border-[#E51636] p-4 relative overflow-hidden group">
               {/* Glow effect behind the icon */}
               <div className="absolute inset-0 bg-red-500 opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-xl"></div>
               <Image 
                 src="/planning.svg" 
                 alt="Trainingbook Logo" 
                 width={64} 
                 height={64} 
                 className="w-full h-full object-contain relative z-10 drop-shadow-sm transition-transform duration-500 group-hover:scale-110"
               />
            </div>
            <h1 className="text-4xl font-black text-[#E51636] tracking-tighter uppercase mb-2">TrainingBook</h1>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em]">Operational Command Access</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
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

            <button 
              disabled={isLoading}
              className="w-full py-4 mt-4 bg-[#E51636] hover:bg-red-700 text-white rounded-2xl font-black uppercase text-sm tracking-[0.2em] shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Init Sequence <ChevronRight className="w-5 h-5" /></>}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-slate-100 flex items-center gap-2 text-slate-500">
             <ShieldAlert className="w-4 h-4 text-[#E51636]" />
             <span className="text-xs font-bold">Restricted Personnel Only</span>
          </div>
        </motion.div>
      </div>

      {/* Right Column: Branding & Artwork */}
      <div className="hidden lg:flex w-1/2 bg-[#E51636] relative overflow-hidden items-center justify-center p-16">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative z-10 text-center text-white space-y-6"
        >
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mx-auto shadow-2xl p-6">
                {/* Also using the new SVG here for consistency */}
                <Image 
                 src="/planning.svg" 
                 alt="Trainingbook Logo" 
                 width={80} 
                 height={80} 
                 className="w-full h-full object-contain drop-shadow-md"
               />
            </div>
            <h2 className="text-5xl font-black tracking-tighter uppercase leading-none">Excellence in Every Order</h2>
            <p className="text-lg font-medium opacity-80 max-w-md mx-auto">Training the next generation of leaders to serve with care and precision.</p>
        </motion.div>
        
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
}