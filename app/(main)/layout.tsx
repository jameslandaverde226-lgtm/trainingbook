import DynamicHeader from "@/components/core/DynamicHeader";
// We removed import Sidebar from "@/components/core/Sidebar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 1. Top: The Dynamic Island Header 
      */}
      <DynamicHeader />
      
      {/* 2. Main Content Area 
        - Removed <Sidebar />
        - Removed lg:pl-64 (Sidebar offset)
        - Added w-full to ensure it spans the screen
        - Adjusted pt-12 to give breathing room below the floating header
      */}
      <main className="flex-1 w-full pt-12 transition-all duration-300">
        <div className="max-w-[1800px] mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}