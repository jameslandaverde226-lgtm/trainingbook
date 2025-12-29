"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Settings, User, ChevronRight, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase"; 
import { signOut } from "firebase/auth";
import { useAppStore } from "@/lib/store/useStore"; 
import toast from "react-hot-toast";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function UserNav() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { currentUser } = useAppStore(); 

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    const toastId = toast.loading("Signing out...");
    try {
      await signOut(auth);
      toast.success("Signed out successfully", { id: toastId });
      router.push("/login");
    } catch (error) {
      toast.error("Error signing out", { id: toastId });
    }
  };

  const initials = currentUser?.name 
    ? currentUser.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()
    : "OP";

  return (
    <div className="relative z-50" ref={menuRef}>
      
      {/* --- TRIGGER (AVATAR) --- */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative group outline-none block"
      >
        <div className={cn(
            "w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs md:text-sm font-[1000] transition-all border-2 overflow-hidden",
            isOpen 
                ? "bg-slate-900 text-white border-slate-900 shadow-lg scale-105" 
                : "bg-white text-slate-900 border-slate-200 hover:border-slate-300"
        )}>
             {currentUser?.image ? (
                 <img src={currentUser.image} alt={initials} className="w-full h-full object-cover" />
             ) : (
                 initials
             )}
        </div>
        
        {/* Active Indicator Dot */}
        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#F8FAFC] rounded-full" />
      </button>

      {/* --- DROPDOWN MENU --- */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden origin-top-right z-[100]"
          >
            {/* Red Gradient Header */}
            <div className="p-4 bg-gradient-to-r from-[#E51636] to-[#ff4b6a] text-white relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1 opacity-90">
                        <Shield className="w-3 h-3" />
                        <span className="text-[9px] font-black uppercase tracking-widest">{currentUser?.role || "Team Member"}</span>
                    </div>
                    <p className="text-sm font-[1000] truncate tracking-tight">{currentUser?.name || "Operative"}</p>
                    <p className="text-[10px] font-bold opacity-70 truncate">{currentUser?.email}</p>
                </div>
                {/* Decor */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            </div>

            {/* Menu Items */}
            <div className="p-2 space-y-1">
                
                <Link 
                    href="/settings" 
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 w-full p-3 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all group"
                >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:shadow-sm transition-all">
                        <Settings className="w-4 h-4" />
                    </div>
                    <span className="flex-1 text-left">Settings</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-900 transition-colors" />
                </Link>

            </div>

            {/* Footer / Logout */}
            <div className="p-2 border-t border-slate-50">
                <button 
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full p-3 rounded-xl text-xs font-black text-[#E51636] hover:bg-red-50 transition-all group"
                >
                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-[#E51636] group-hover:bg-white group-hover:shadow-sm transition-all">
                        <LogOut className="w-4 h-4" />
                    </div>
                    <span className="flex-1 text-left">Log Out</span>
                </button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}