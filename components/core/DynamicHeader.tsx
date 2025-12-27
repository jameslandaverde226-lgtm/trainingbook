"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image'; 
import { usePathname } from 'next/navigation'; 
import { motion, useScroll, useTransform } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap,
  Calendar,
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import UserNav from '@/components/core/UserNav'; 

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
  
  // Header animations
  const headerY = useTransform(scrollY, [0, 100], [0, -10]);
  const headerBorder = useTransform(scrollY, [0, 20], ["rgba(0,0,0,0)", "rgba(226,232,240,1)"]);
  const headerShadow = useTransform(scrollY, [0, 20], ["none", "0 10px 15px -3px rgba(0, 0, 0, 0.05)"]);

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
              <div className="relative h-9 w-9 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Image 
                    src="/planning.svg" 
                    alt="TrainingBook Logo" 
                    width={36} 
                    height={36} 
                    className="w-full h-full object-contain"
                />
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
            {/* REMOVED: Search and Bell buttons were here */}
            
            {/* UserNav Component */}
            <UserNav />
            
          </div>
        </div>
      </motion.header>

      {/* =======================================
          MOBILE TOP BAR
      ======================================= */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-[101] px-6 py-4 bg-slate-50/80 backdrop-blur-md flex items-center justify-between shadow-sm">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="relative h-9 w-9">
                 <Image 
                    src="/planning.svg" 
                    alt="Logo" 
                    width={36} 
                    height={36} 
                    className="w-full h-full object-contain"
                />
            </div>
            <span className="text-lg font-black tracking-tight text-slate-900">Trainingbook</span>
          </Link>

          {/* UserNav Component */}
          <UserNav />
          
      </header>

      {/* =======================================
          MOBILE COMMAND DOCK
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