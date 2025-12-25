"use client";

import { motion } from "framer-motion";
import { Coffee, Utensils, X, ShieldAlert, ArrowRight, CheckCircle2 } from "lucide-react";
import ClientPortal from "@/components/core/ClientPortal";
import { cn } from "@/lib/utils";
import { TeamMember } from "../../calendar/_components/types";

interface Props {
    member: TeamMember;
    onAssign: (dept: "FOH" | "BOH") => void;
    onClose: () => void;
}

export default function UnitAssignmentModal({ member, onAssign, onClose }: Props) {
    return (
        <ClientPortal>
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-md"
                    onClick={onClose}
                />
                
                {/* Modal Card */}
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                    animate={{ scale: 1, opacity: 1, y: 0 }} 
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden border border-white/20 ring-4 ring-black/5"
                >
                    {/* Header */}
                    <div className="bg-slate-50 border-b border-slate-100 p-8 pb-6 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-red-500" />
                        
                        <div className="w-20 h-20 rounded-3xl bg-white shadow-xl mx-auto mb-6 flex items-center justify-center border border-slate-100 relative z-10">
                            {member.image && !member.image.includes("ui-avatars") ? (
                                <img src={member.image} className="w-full h-full object-cover rounded-[20px]" />
                            ) : (
                                <span className="text-3xl font-black text-slate-300">{member.name.charAt(0)}</span>
                            )}
                            <div className="absolute -bottom-2 -right-2 bg-amber-400 text-white p-1.5 rounded-full border-2 border-white shadow-sm">
                                <ShieldAlert className="w-4 h-4 fill-current text-amber-900" />
                            </div>
                        </div>

                        <h2 className="text-2xl font-[1000] text-slate-900 tracking-tight leading-none mb-2">
                            Unit Assignment Required
                        </h2>
                        <p className="text-sm font-medium text-slate-400 max-w-xs mx-auto">
                            <span className="text-slate-900 font-bold">{member.name}</span> has been synced from LifeLenz but requires a tactical unit assignment.
                        </p>

                        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-500 hover:bg-white rounded-full transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Action Area */}
                    <div className="p-8 bg-white grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => onAssign("FOH")}
                            className="group relative flex flex-col items-center justify-center p-6 rounded-[28px] border-2 border-slate-100 hover:border-[#004F71] hover:bg-blue-50/30 transition-all duration-300"
                        >
                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 mb-4 group-hover:scale-110 transition-transform group-hover:shadow-md group-hover:border-blue-200">
                                <Coffee className="w-7 h-7 text-[#004F71]" />
                            </div>
                            <span className="text-sm font-black text-[#004F71] uppercase tracking-widest mb-1">Front House</span>
                            <span className="text-[10px] font-bold text-slate-400">Guest Experience</span>
                            
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                                <div className="w-6 h-6 bg-[#004F71] rounded-full flex items-center justify-center text-white shadow-lg">
                                    <ArrowRight className="w-3 h-3" />
                                </div>
                            </div>
                        </button>

                        <button 
                            onClick={() => onAssign("BOH")}
                            className="group relative flex flex-col items-center justify-center p-6 rounded-[28px] border-2 border-slate-100 hover:border-[#E51636] hover:bg-red-50/30 transition-all duration-300"
                        >
                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 mb-4 group-hover:scale-110 transition-transform group-hover:shadow-md group-hover:border-red-200">
                                <Utensils className="w-7 h-7 text-[#E51636]" />
                            </div>
                            <span className="text-sm font-black text-[#E51636] uppercase tracking-widest mb-1">Back House</span>
                            <span className="text-[10px] font-bold text-slate-400">Culinary Ops</span>

                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                                <div className="w-6 h-6 bg-[#E51636] rounded-full flex items-center justify-center text-white shadow-lg">
                                    <ArrowRight className="w-3 h-3" />
                                </div>
                            </div>
                        </button>
                    </div>

                    <div className="px-8 pb-8 pt-0 text-center">
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                            This action initializes the employee's profile
                        </p>
                    </div>
                </motion.div>
            </div>
        </ClientPortal>
    );
}