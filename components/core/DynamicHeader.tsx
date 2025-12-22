"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap,
  Settings, 
  LogOut, 
  Bell, 
  Search,
  ChevronDown,
  Calendar,
  BookOpen,
  Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';

// CONFIGURED NAV LINKS
const NAV_LINKS = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/calendar', label: 'Schedule', icon: Calendar },
  { href: '/training', label: 'Learn', icon: BookOpen }, 
  { href: '/certifications', label: 'Certs', icon: GraduationCap },
  { href: '/team', label: 'Roster', icon: Users },
];

export default function DynamicHeader() {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // --- Scroll Physics ---
  const headerY = useTransform(scrollY, [0, 100], [0, -10]);
  const headerBorder = useTransform(scrollY, [0, 20], ["rgba(0,0,0,0)", "rgba(226,232,240,1)"]);
  const headerShadow = useTransform(scrollY, [0, 20], ["none", "0 10px 15px -3px rgba(0, 0, 0, 0.05)"]);

  const user = { name: "James L.", email: "james@trainingbook.com", initials: "JL" };

  return (
    <>
      {/* =======================================
          DESKTOP & TABLET HEADER (Top)
      ======================================= */}
      <motion.header
        style={{ y: headerY, borderColor: headerBorder, boxShadow: headerShadow }}
        className="sticky top-4 z-50 mx-auto max-w-[1800px] w-[95%] rounded-full transition-all duration-300 bg-white/80 backdrop-blur-xl border border-transparent hidden md:block"
      >
        <div className="px-6 h-16 flex items-center justify-between gap-4">
          
          {/* --- Left: Logo & Nav --- */}
          <div className="flex items-center gap-6 flex-1 overflow-hidden">
            <Link href="/dashboard" className="flex items-center gap-3 group shrink-0">
              <div className="relative h-9 w-9 bg-[#004F71] rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg ring-1 ring-white/20 group-hover:scale-105 transition-transform">
                T
                <div className="absolute inset-0 bg-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="text-lg font-black tracking-tight text-slate-900">
                Training<span className="text-[#004F71]">book</span>
              </span>
            </Link>

            {/* Desktop Navigation Pills */}
            <div className="flex items-center gap-1 p-1 bg-slate-100/50 rounded-full border border-slate-200/50">
              {NAV_LINKS.map((link) => {
                const isActive = pathname?.startsWith(link.href);
                return (
                  <Link 
                    key={link.href} 
                    href={link.href}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide transition-all duration-300 flex items-center gap-2 relative",
                      isActive 
                        ? "text-[#004F71]" 
                        : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                    )}
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="desktopNav"
                        className="absolute inset-0 bg-white shadow-sm rounded-full border border-slate-100"
                        initial={false}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                        <link.icon className={cn("w-3.5 h-3.5", isActive && "text-[#E51636]")} />
                        {link.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* --- Right: Actions --- */}
          <div className="flex items-center gap-3 shrink-0">
            <button className="h-10 w-10 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-[#004F71] hover:border-blue-200 hover:shadow-md transition-all flex items-center justify-center">
               <Search className="w-4 h-4" />
            </button>

            <button className="h-10 w-10 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-indigo-500 hover:border-indigo-200 hover:shadow-md transition-all flex items-center justify-center relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2.5 h-2 w-2 bg-[#E51636] rounded-full ring-2 ring-white" />
            </button>
            
            <div className="h-8 w-px bg-slate-200 mx-1" />

            {/* Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 pl-1 pr-2 py-1 rounded-full hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200 outline-none"
              >
                <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shadow-md">
                  {user.initials}
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-900 leading-none">{user.name}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase leading-none mt-0.5">Admin</p>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/5 focus:outline-none border border-slate-100"
                    >
                      <div className="px-3 py-2 border-b border-slate-50 mb-1">
                        <p className="text-sm font-bold text-slate-900">{user.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                      <Link href="/settings" className="flex items-center px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                        <Settings className="mr-2 h-4 w-4" /> Preferences
                      </Link>
                      <button className="w-full flex items-center px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors">
                        <LogOut className="mr-2 h-4 w-4" /> Sign Out
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.header>

      {/* =======================================
          MOBILE TOP BAR (Clean & Minimal)
      ======================================= */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 px-6 py-4 bg-slate-50/80 backdrop-blur-md flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="h-9 w-9 bg-[#004F71] rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-900/20">T</div>
            <span className="text-lg font-black tracking-tight text-slate-900">Trainingbook</span>
          </Link>
          <div className="h-9 w-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shadow-md ring-2 ring-white">
             {user.initials}
          </div>
      </header>

      {/* =======================================
          MOBILE COMMAND DOCK (Floating Glass)
      ======================================= */}
      <div className="md:hidden fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-auto">
        <nav className="flex items-center gap-2 p-2 bg-white/90 backdrop-blur-2xl border border-white/60 rounded-[32px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] ring-1 ring-white/50">
            {NAV_LINKS.map((link) => {
                const isActive = pathname?.startsWith(link.href);
                return (
                    <Link 
                        key={link.href} 
                        href={link.href}
                        className="relative flex items-center justify-center w-14 h-14 rounded-full"
                    >
                        {isActive && (
                            <motion.div 
                                layoutId="mobileNav"
                                className="absolute inset-0 bg-[#E51636] rounded-full shadow-lg shadow-red-500/30"
                                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                            />
                        )}
                        <link.icon className={cn("w-6 h-6 transition-all relative z-10", isActive ? "text-white scale-110" : "text-slate-400 hover:text-slate-600")} />
                        
                        {/* Tiny Active Dot (Optional, kept for extra detail) */}
                        {isActive && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute bottom-1 w-1 h-1 bg-white rounded-full z-20" 
                            />
                        )}
                    </Link>
                )
            })}
        </nav>
      </div>
    </>
  );
}