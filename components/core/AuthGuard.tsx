"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store/useStore";
import { Loader2 } from "lucide-react";

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
        <div className="h-screen w-full bg-[#0F172A] flex flex-col items-center justify-center gap-4">
           <Loader2 className="w-10 h-10 text-[#E51636] animate-spin" />
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] animate-pulse">Establishing Uplink...</p>
        </div>
     );
  }

  // If on login page, just render it
  if (pathname === "/login") return <>{children}</>;

  // If logged in (or loading finished and rejected), render children
  // (The useEffect above handles the redirect if rejected)
  return <>{children}</>;
}