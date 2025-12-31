"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image'; 
import { usePathname } from 'next/navigation'; 
import { motion, useScroll, useTransform, AnimatePresence, useDragControls, PanInfo } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap,
  Calendar,
  BookOpen,
  X,
  Loader2,
  Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import UserNav from '@/components/core/UserNav'; 
import ClientPortal from '@/components/core/ClientPortal';

// --- CONFIGURATION ---
const PATHWAY_URL = "https://www.pathway.cfahome.com/";

const NAV_LINKS = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/calendar', label: 'Schedule', icon: Calendar },
  { href: '/training', label: 'Learn', icon: BookOpen }, 
  { href: '/certifications', label: 'Certs', icon: GraduationCap },
  { href: '/team', label: 'Roster', icon: Users },
];

// --- CUSTOM PATHWAY ICON ---
const PathwayIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 35" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="m20.936 3.8357e-4h-13.741c-1.7485-0.018804-3.4335 0.65443-4.6876 1.8729-1.2541 1.2185-1.9757 2.8833-2.0073 4.6316v22.049c0.067005 1.7321 0.80221 3.3709 2.0514 4.5727s2.9152 1.8731 4.6486 1.8731 3.3994-0.6713 4.6486-1.8731c1.2491-1.2018 1.9843-2.8406 2.0513-4.5727v-13.23c0.0106-0.6291 0.2693-1.2286 0.7199-1.6678 0.4505-0.4393 1.0563-0.6828 1.6855-0.6774h4.6204c0.2852 0.0198 0.5715-0.0193 0.841-0.1148 0.2694-0.0956 0.5164-0.2455 0.7255-0.4406 0.2091-0.195 0.3758-0.431 0.4898-0.6932 0.1139-0.2623 0.1728-0.5451 0.1728-0.8311 0-0.2859-0.0589-0.5687-0.1728-0.831-0.114-0.2622-0.2807-0.49818-0.4898-0.69324-0.2091-0.19505-0.4561-0.34502-0.7255-0.44056-0.2695-0.09553-0.5558-0.13463-0.841-0.11482h-4.5803c-1.75-0.0241-3.4381 0.64738-4.6934 1.867-1.2553 1.2195-1.9752 2.8875-2.0015 4.6375v13.24c-0.03951 0.6124-0.31066 1.1868-0.75835 1.6066-0.44769 0.4197-1.0384 0.6533-1.652 0.6533s-1.2044-0.2336-1.6521-0.6533c-0.44769-0.4198-0.7188-0.9942-0.75832-1.6066v-22.049c0.01056-0.62915 0.26926-1.2286 0.71978-1.6679 0.45053-0.43926 1.0564-0.68273 1.6856-0.67735h13.741c0.9096-0.03504 1.817 0.11392 2.6677 0.43786 0.8508 0.32395 1.6274 0.81626 2.2833 1.4474 0.656 0.63119 1.1778 1.3883 1.5343 2.2259 0.3564 0.83764 0.5401 1.7386 0.5401 2.6489 0 0.9104-0.1837 1.8113-0.5401 2.6489-0.3565 0.8376-0.8783 1.5947-1.5343 2.2259-0.6559 0.6312-1.4325 1.1235-2.2833 1.4475-0.8507 0.3239-1.7581 0.4729-2.6677 0.4378h-0.411c-0.5528 0-1.0831 0.2197-1.474 0.6106-0.391 0.391-0.6106 0.9212-0.6106 1.4741 0 0.5528 0.2196 1.0831 0.6106 1.4741 0.3909 0.3909 0.9212 0.6105 1.474 0.6105h0.411c2.8973 0 5.676-1.1509 7.7247-3.1996s3.1997-4.8275 3.1997-7.7248c0-2.8973-1.151-5.676-3.1997-7.7247-2.0487-2.0487-4.8274-3.1997-7.7247-3.1997l-0.0401-0.010032z" fill="currentColor" />
  </svg>
);

export default function DynamicHeader() {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  
  const headerY = useTransform(scrollY, [0, 100], [0, -10]);
  const headerBorder = useTransform(scrollY, [0, 20], ["rgba(0,0,0,0)", "rgba(226,232,240,1)"]);
  const headerShadow = useTransform(scrollY, [0, 20], ["none", "0 10px 15px -3px rgba(0, 0, 0, 0.05)"]);

  const [isPathwayOpen, setIsPathwayOpen] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const dragControls = useDragControls();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // --- SCROLL LOCKING ---
  useEffect(() => {
    if (isPathwayOpen) {
      document.body.style.overflow = 'hidden';
      // Critical for iOS to prevent body scroll behind modal
      if (isMobile) {
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
      }
    } else {
      document.body.style.overflow = 'unset';
      if (isMobile) {
        document.body.style.position = '';
        document.body.style.width = '';
      }
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isPathwayOpen, isMobile]);

  return (
    <>
      {/* DESKTOP HEADER */}
      <motion.header
        style={{ y: headerY, borderColor: headerBorder, boxShadow: headerShadow }}
        className="sticky top-4 z-50 mx-auto max-w-[1800px] w-[95%] rounded-full transition-all duration-300 bg-white/80 backdrop-blur-xl border border-transparent hidden md:block"
      >
        <div className="px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 flex-1 overflow-hidden">
            <Link href="/dashboard" className="flex items-center gap-3 group shrink-0">
              <div className="relative h-9 w-9 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Image src="/planning.svg" alt="TrainingBook Logo" width={36} height={36} className="w-full h-full object-contain" />
              </div>
              <span className="text-lg font-black tracking-tight text-slate-900">Training<span className="text-[#004F71]">book</span></span>
            </Link>
            <div className="flex items-center gap-1 p-1 bg-slate-100/50 rounded-full border border-slate-200/50">
              {NAV_LINKS.map((link) => {
                const isActive = pathname?.startsWith(link.href);
                return (
                  <Link key={link.href} href={link.href} className={cn("px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide transition-all duration-300 flex items-center gap-2 relative", isActive ? "text-[#004F71]" : "text-slate-500 hover:text-slate-700 hover:bg-white/50")}>
                    {isActive && <motion.div layoutId="desktopNav" className="absolute inset-0 bg-white shadow-sm rounded-full border border-slate-100" initial={false} transition={{ type: "spring", stiffness: 300, damping: 30 }} />}
                    <span className="relative z-10 flex items-center gap-2"><link.icon className={cn("w-3.5 h-3.5", isActive && "text-[#E51636]")} />{link.label}</span>
                  </Link>
                );
              })}
            </div>
            <button onClick={() => { setIsPathwayOpen(true); setIframeLoading(true); }} className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-50 border border-slate-200/60 hover:bg-slate-100 hover:border-slate-300 transition-all group ml-2">
                <PathwayIcon className="w-5 h-5 text-[#004F71] group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-black uppercase text-[#004F71] tracking-wide">Pathway</span>
            </button>
          </div>
          <div className="flex items-center gap-3 shrink-0"><UserNav /></div>
        </div>
      </motion.header>

      {/* MOBILE TOP BAR */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-[101] px-6 py-4 bg-slate-50/80 backdrop-blur-md flex items-center justify-between shadow-sm">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="relative h-9 w-9"><Image src="/planning.svg" alt="Logo" width={36} height={36} className="w-full h-full object-contain" /></div>
            <span className="text-lg font-black tracking-tight text-slate-900">Trainingbook</span>
          </Link>
          <UserNav />
      </header>

      {/* MOBILE DOCK */}
      <div className="md:hidden fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-auto">
        <nav className="flex items-center gap-2 p-2 bg-white/90 backdrop-blur-2xl border border-white/60 rounded-[32px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] ring-1 ring-white/50">
            {NAV_LINKS.map((link) => {
                const isActive = pathname?.startsWith(link.href);
                return (
                    <Link key={link.href} href={link.href} className="relative flex items-center justify-center w-14 h-14 rounded-full">
                        {isActive && <motion.div layoutId="mobileNav" className="absolute inset-0 bg-[#E51636] rounded-full shadow-lg shadow-red-500/30" transition={{ type: "spring", stiffness: 350, damping: 25 }} />}
                        <link.icon className={cn("w-6 h-6 transition-all relative z-10", isActive ? "text-white scale-110" : "text-slate-400 hover:text-slate-600")} />
                    </Link>
                )
            })}
            <div className="w-px h-8 bg-slate-200 mx-1" />
            <button onClick={() => { setIsPathwayOpen(true); setIframeLoading(true); }} className="relative flex items-center justify-center w-14 h-14 rounded-full bg-[#004F71]/10 border border-[#004F71]/20 active:scale-95 transition-transform">
                <PathwayIcon className="w-7 h-7 text-[#004F71]" />
            </button>
        </nav>
      </div>

      {/* --- PATHWAY IFRAME MODAL --- */}
      <AnimatePresence>
        {isPathwayOpen && (
            <ClientPortal>
                {/* Backdrop */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-[#0F172A]/80 backdrop-blur-xl" onClick={() => setIsPathwayOpen(false)} />
                
                {/* Modal Window */}
                <motion.div 
                    initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 20 }}
                    animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                    exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    drag={isMobile ? "y" : false}
                    dragControls={dragControls}
                    dragListener={false}
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={0.05}
                    onDragEnd={(_, info: PanInfo) => { if (isMobile && info.offset.y > 100) setIsPathwayOpen(false); }}
                    className={cn(
                        "fixed z-[210] bg-white shadow-2xl flex flex-col border border-white/20 ring-1 ring-black/5 pointer-events-auto",
                        // MOBILE FIX: Use 100dvh to fill screen exactly, avoid bottom rounding
                        "bottom-0 left-0 right-0 h-[100dvh] rounded-none shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.2)] overflow-hidden",
                        // Desktop
                        "md:inset-10 md:h-auto md:rounded-[40px] md:overflow-hidden"
                    )}
                >
                    {/* Mobile Drag Handle */}
                    <div 
                        className="md:hidden h-12 w-full flex items-center justify-center cursor-grab active:cursor-grabbing touch-none bg-white shrink-0 z-30 border-b border-slate-50 relative"
                        onPointerDown={(e) => dragControls.start(e)}
                    >
                        <div className="w-10 h-1 bg-slate-300 rounded-full opacity-60" />
                        <button onClick={() => setIsPathwayOpen(false)} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-slate-50 rounded-full text-slate-400">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Desktop Header */}
                    <div className="hidden md:flex h-20 bg-[#004F71] text-white px-8 items-center justify-between shrink-0 relative overflow-hidden z-20">
                        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10 shadow-sm">
                                <PathwayIcon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-[1000] tracking-tight leading-none text-white">Pathway</h3>
                                <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mt-0.5">External Resource</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 relative z-10">
                             <a href={PATHWAY_URL} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-xs font-bold transition-all border border-white/10">
                                 <Maximize2 className="w-4 h-4" /> Open in New Tab
                             </a>
                             <button onClick={() => setIsPathwayOpen(false)} className="p-2.5 bg-white text-[#004F71] hover:bg-slate-100 rounded-full transition-all shadow-lg active:scale-90"><X className="w-5 h-5" /></button>
                        </div>
                    </div>

                    {/* Iframe Content Wrapper */}
                    <div className="relative flex-1 w-full bg-slate-50 overflow-hidden md:rounded-b-[32px]">
                        {iframeLoading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-0 text-slate-400 bg-white">
                                <Loader2 className="w-10 h-10 animate-spin mb-4 text-[#004F71]" />
                                <span className="text-xs font-black uppercase tracking-widest">Connecting to Pathway...</span>
                            </div>
                        )}
                        
                        {/* 
                           IOS IFRAME HACK:
                           1. Wrapper has -webkit-overflow-scrolling: touch
                           2. Iframe is absolutely positioned to prevent expansion
                           3. Sandbox includes 'allow-popups' and 'allow-scripts' but BLOCKS top-navigation
                        */}
                        <div className="absolute inset-0 w-full h-full overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                            <iframe 
                                src={PATHWAY_URL}
                                className={cn(
                                    "w-full h-full border-none transition-opacity duration-500 bg-white",
                                    iframeLoading ? "opacity-0" : "opacity-100"
                                )}
                                onLoad={() => setIframeLoading(false)}
                                allowFullScreen
                                sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-modals"
                                style={{ minHeight: '100%' }}
                            />
                        </div>
                    </div>
                </motion.div>
            </ClientPortal>
        )}
      </AnimatePresence>
    </>
  );
}