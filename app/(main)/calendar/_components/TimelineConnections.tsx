"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CalendarEvent } from "./types";
import { Scissors } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  events: CalendarEvent[];
  eventCoordinates: Map<string, { xStart: number; xEnd: number; y: number }>;
  onRemoveLink?: (targetId: string, sourceId: string) => void;
  mode?: 'cables' | 'controls';
  draggingId?: string | null;
  isUnlinkingMode?: boolean; 
}

export default function TimelineConnections({ 
  events, 
  eventCoordinates, 
  onRemoveLink,
  mode = 'cables',
  draggingId,
  isUnlinkingMode = false
}: Props) {
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);

  // Intelligent Bezier Path Generator
  const getPath = (x1: number, y1: number, x2: number, y2: number, index: number = 0) => {
    const width = Math.abs(x2 - x1);
    const isBackwards = x2 < x1;
    const fanOffset = (index % 2 === 0 ? 1 : -1) * (index * 6); 

    if (isBackwards) {
        const loopSize = Math.max(width * 0.4, 150) + Math.abs(fanOffset); 
        return `M ${x1} ${y1} C ${x1 + 50} ${y1 + 80 + fanOffset}, ${x2 - 50} ${y2 + 80 + fanOffset}, ${x2} ${y2}`;
    } else {
        const curvature = Math.min(width * 0.6, 250) + Math.abs(fanOffset); 
        return `M ${x1} ${y1} C ${x1 + curvature} ${y1}, ${x2 - curvature} ${y2}, ${x2} ${y2}`;
    }
  };

  return (
    // FIX: Remove 'pointer-events-none' from here if it blocks children, 
    // but we keep it to allow clicking through empty space. 
    // We will ensure children override this.
    <svg className="absolute inset-0 pointer-events-none overflow-visible w-full h-full">
      <defs>
        <linearGradient id="activeFlow" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
          <stop offset="50%" stopColor="#60a5fa" stopOpacity="1" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
        
        <marker id="arrowHead" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
          <path d="M0,0 L4,2 L0,4 L1,2 Z" fill="#94a3b8" />
        </marker>
        <marker id="arrowHeadSever" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
          <path d="M0,0 L4,2 L0,4 L1,2 Z" fill="#ef4444" />
        </marker>

        <filter id="wireShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#0f172a" floodOpacity="0.15" />
        </filter>
      </defs>

      {events.map((event) => {
        if (!event.linkedEventIds || event.linkedEventIds.length === 0 || !eventCoordinates.has(event.id)) return null;

        return event.linkedEventIds.map((sourceId, idx) => {
            if (!eventCoordinates.has(sourceId)) return null;

            if (draggingId && (event.id === draggingId || sourceId === draggingId)) return null;

            const source = eventCoordinates.get(sourceId)!;
            const target = eventCoordinates.get(event.id)!;

            const path = getPath(source.xEnd, source.y, target.xStart, target.y, idx);
            
            const isBackwards = target.xStart < source.xEnd;
            const midX = (source.xEnd + target.xStart) / 2;
            const midY = isBackwards ? Math.max(source.y, target.y) + 60 : (source.y + target.y) / 2;

            const linkKey = `${event.id}-${sourceId}`;
            const isHovered = hoveredLink === linkKey;
            
            const showTriggers = isHovered || isUnlinkingMode;

            // RENDER VISUALS (LAYER 0)
            if (mode === 'cables') {
                return (
                    <g key={linkKey}>
                        {/* Visible Base Line */}
                        <path 
                          d={path} 
                          fill="none" 
                          stroke={isHovered ? "#fca5a5" : "#cbd5e1"} 
                          strokeWidth={isHovered ? "3" : "2"} 
                          strokeLinecap="round"
                          style={{ filter: "url(#wireShadow)", transition: "stroke 0.3s ease, stroke-width 0.3s ease" }}
                          markerEnd={isHovered ? "url(#arrowHeadSever)" : "url(#arrowHead)"}
                        />

                        {/* Flow Animation */}
                        {!showTriggers && (
                            <motion.path
                              d={path} 
                              fill="none" 
                              stroke="url(#activeFlow)" 
                              strokeWidth="3" 
                              strokeLinecap="round"
                              strokeDasharray="100 400"
                              initial={{ strokeDashoffset: 500 }}
                              animate={{ strokeDashoffset: 0 }}
                              transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: idx * 0.3 }} 
                            />
                        )}
                    </g>
                );
            }

            // RENDER CONTROLS (LAYER 30+)
            if (mode === 'controls') {
                return (
                    <g 
                        key={linkKey} 
                        onMouseEnter={() => setHoveredLink(linkKey)}
                        onMouseLeave={() => setHoveredLink(null)}
                        // FIX: Explicitly re-enable pointer events for this group
                        style={{ pointerEvents: 'auto' }} 
                    >
                        {/* Invisible Hit Path - Widened for usability */}
                        <path 
                          d={path} 
                          fill="none" 
                          stroke="transparent" 
                          strokeWidth="30" 
                          strokeLinecap="round"
                          style={{ cursor: isUnlinkingMode ? 'not-allowed' : 'pointer' }}
                        />

                        {/* Scissor Button - Always rendered if trigger active */}
                        <AnimatePresence>
                            {showTriggers && (
                                <g transform={`translate(${midX}, ${midY})`}>
                                    {/* FIX: Ensure ForeignObject allows interaction */}
                                    <foreignObject x="-20" y="-20" width="40" height="40" style={{ overflow: 'visible', pointerEvents: 'auto' }}>
                                        <motion.button
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0, opacity: 0 }}
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault(); // Stop event bubbling
                                                if(onRemoveLink) onRemoveLink(event.id, sourceId);
                                            }}
                                            className={cn(
                                                "w-10 h-10 rounded-full border shadow-sm flex items-center justify-center transition-all cursor-pointer relative z-[100] backdrop-blur-sm",
                                                isUnlinkingMode 
                                                    ? "bg-white/95 border-red-300 text-red-500 shadow-md ring-2 ring-red-100" 
                                                    : "bg-white border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:shadow-md"
                                            )}
                                        >
                                            <Scissors className="w-5 h-5" />
                                        </motion.button>
                                    </foreignObject>
                                </g>
                            )}
                        </AnimatePresence>
                    </g>
                );
            }
            
            return null;
        });
      })}
    </svg>
  );
}