"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store/useStore";
import { Loader2, Command, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { currentUser, authLoading, checkAuth } = useAppStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!authLoading && !currentUser && pathname !== "/login") {
       router.push("/login");
    }
  }, [currentUser, authLoading, router, pathname]);

  if (authLoading) {
     return (
        <div className="h-screen w-full bg-white flex flex-col items-center justify-center relative overflow-hidden font-sans">
           {/* Ambient Background Accents */}
           <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-red-50/60 rounded-full blur-[120px] pointer-events-none mix-blend-multiply" />
           <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-slate-50 rounded-full blur-[100px] pointer-events-none" />

           {/* Central Brand Element */}
           <motion.div 
             initial={{ scale: 0.9, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             transition={{ duration: 0.5, ease: "easeOut" }}
             className="relative z-10 flex flex-col items-center"
           >
              <div className="w-20 h-20 bg-[#E51636] rounded-[24px] flex items-center justify-center shadow-[0_20px_40px_-10px_rgba(229,22,54,0.3)] mb-8 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent" />
                  <Command className="w-8 h-8 text-white relative z-10" />
              </div>

              <h2 className="text-2xl font-[1000] text-slate-900 tracking-tighter mb-2">
                Training<span className="text-[#E51636]">Book</span>
              </h2>

              <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 px-4 py-2 rounded-full mt-4">
                 <Loader2 className="w-3.5 h-3.5 text-[#E51636] animate-spin" />
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                    Establishing Uplink
                 </span>
              </div>
           </motion.div>

           {/* Footer Security Badge */}
           <div className="absolute bottom-12 flex items-center gap-2 text-slate-300 opacity-60">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[9px] font-bold uppercase tracking-widest">Secure Connection</span>
           </div>
        </div>
     );
  }

  // If on login page, just render it
  if (pathname === "/login") return <>{children}</>;

  // If logged in (or loading finished and rejected), render children
  return <>{children}</>;
}