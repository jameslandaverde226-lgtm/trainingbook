"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import ClientPortal from "@/components/core/ClientPortal";
import { cn } from "@/lib/utils";
import { TeamMember } from "../../calendar/_components/types";

// --- IMPORT SUB-COMPONENTS ---
import { MemberProfileHeader } from "./MemberProfileHeader";
import { CurriculumTab } from "./tabs/CurriculumTab";
import { PerformanceTab } from "./tabs/PerformanceTab";
import OperationalDocumentInterface from "./OperationalDocumentInterface";

interface Props {
  member: TeamMember; 
  onClose: () => void;
  activeTab: "overview" | "curriculum" | "performance" | "documents"; 
  setActiveTab: (t: "overview" | "curriculum" | "performance" | "documents") => void;
}

export const MemberDetailSheet = ({ member, onClose, activeTab, setActiveTab }: Props) => {
  return (
    <ClientPortal>
      {/* Dark Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md" 
        onClick={onClose} 
      />
      
      {/* Modal Card */}
      <motion.div 
        initial={{ y: "100%", x: 0 }} 
        animate={{ y: 0, x: 0 }} 
        exit={{ y: "100%", x: 0 }} 
        transition={{ type: "spring", damping: 30, stiffness: 250 }}
        className="fixed inset-0 z-[110] bg-white shadow-2xl flex flex-col lg:flex-row overflow-hidden lg:inset-y-6 lg:right-6 lg:left-auto lg:w-full lg:max-w-[1400px] lg:rounded-[48px] lg:border border-white/20 ring-1 ring-black/5"
      >
        
        {/* LEFT SIDEBAR: Avatar, Unit, Basic Info */}
        <MemberProfileHeader member={member} />

        {/* RIGHT CONTENT: Tabs & Details */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
          
          {/* Tabs Navigation */}
          <div className="px-8 h-20 flex items-center justify-between border-b border-slate-100 shrink-0 bg-white z-20">
             <div className="flex gap-8 overflow-x-auto no-scrollbar">
                {['overview', 'documents', 'curriculum', 'performance'].map(tab => (
                   <button 
                    key={tab} 
                    onClick={() => setActiveTab(tab as any)} 
                    className="relative py-7 group outline-none shrink-0"
                   >
                      <span className={cn("text-xs font-black uppercase tracking-[0.2em] transition-colors", activeTab === tab ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600")}>{tab}</span>
                      {activeTab === tab && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#E51636] rounded-t-full" />}
                   </button>
                ))}
             </div>
             <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-full transition-colors shrink-0"><X className="w-6 h-6 text-slate-400" /></button>
          </div>

          {/* Tab Content Area */}
          <div className="flex-1 overflow-hidden relative bg-slate-50/30">
              {activeTab === 'overview' && (
                  <div className="p-10 flex flex-col items-center justify-center h-full text-slate-300 gap-4">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                          <span className="text-2xl">🚧</span>
                      </div>
                      <p className="text-xs font-bold uppercase tracking-widest">Overview Dashboard Coming Soon</p>
                  </div>
              )}
              
              {activeTab === 'documents' && <OperationalDocumentInterface member={member} currentUser="Director" />}
              
              {/* These components now hold the logic that was "lost" from the main file */}
              {activeTab === 'curriculum' && <CurriculumTab member={member} />}
              
              {activeTab === 'performance' && <PerformanceTab member={member} />}
          </div>

        </div>
      </motion.div>
    </ClientPortal>
  );
};