"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store/useStore";
import { Loader2, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  // Destructure subscribe methods from the store
  const { currentUser, authLoading, checkAuth, subscribeTeam, subscribeEvents } = useAppStore();
  const router = useRouter();
  const pathname = usePathname();
  
  // Local state to prevent premature redirects
  const [isChecking, setIsChecking] = useState(true);

  // 1. Initial Auth Check
  useEffect(() => {
    const initAuth = async () => {
        await checkAuth();
        setIsChecking(false);
    };
    initAuth();
  }, [checkAuth]);

  // 2. Global Data Subscription
  useEffect(() => {
    if (currentUser) {
       console.log("✅ [AuthGuard] User authenticated. Initializing global data streams...");
       const unsubTeam = subscribeTeam();
       const unsubEvents = subscribeEvents();
       
       return () => {
           unsubTeam();
           unsubEvents();
       };
    }
  }, [currentUser, subscribeTeam, subscribeEvents]);

  // 3. Route Protection logic
  useEffect(() => {
    // Only run this logic if we are NOT currently loading auth state
    if (!authLoading && !isChecking) {
        if (!currentUser && pathname !== "/login") {
            // No user, not on login page -> Redirect to Login
            router.push("/login");
        } else if (currentUser && pathname === "/login") {
            // User exists, but on login page -> Redirect to Dashboard
            router.push("/dashboard");
        }
    }
  }, [currentUser, authLoading, isChecking, router, pathname]);

  // If loading, show the splash screen
  if (authLoading || isChecking) {
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
              {/* Logo Container - Matches Login Style */}
              <div className="w-24 h-24 bg-white rounded-[24px] flex items-center justify-center shadow-[0_20px_40px_-10px_rgba(229,22,54,0.3)] mb-8 relative overflow-hidden group border-[3px] border-[#E51636]">
                  <div className="absolute inset-0 bg-red-500 opacity-0 group-hover:opacity-5 transition-opacity duration-500" />
                  <Image 
                    src="/planning.svg"
                    alt="TrainingBook Logo"
                    width={80}
                    height={80}
                    className="w-14 h-14 object-contain relative z-10 drop-shadow-sm"
                    priority
                  />
              </div>

              {/* Branding Text */}
              <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-2">
                Training<span className="text-[#004F71]">book</span>
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

  // If checking is done and no user (and we are on login), render children (the login form)
  // If checking is done and user exists (and we are NOT on login), render children (the app)
  return <>{children}</>;
}