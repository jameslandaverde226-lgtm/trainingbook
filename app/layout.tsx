import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import AuthGuard from "@/components/core/AuthGuard"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Trainingbook",
  description: "Operational Command System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <AuthGuard>
           {children}
        </AuthGuard>
        
        {/* Global Notification Toaster */}
        <Toaster 
          position="bottom-right" 
          toastOptions={{ 
            style: { 
              background: '#0F172A', 
              color: '#fff', 
              fontSize: '12px', 
              fontWeight: 'bold',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)'
            } 
          }} 
        />
      </body>
    </html>
  );
}