import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/core/AuthGuard";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TrainingBook",
  description: "Operational Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning prevents errors caused by browser extensions 
    // modifying the <html> tag (e.g., Grammarly, Dark Reader, Translators).
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <AuthGuard>
           {children}
        </AuthGuard>
        
        {/* Global Toast Notifications */}
        <Toaster 
          position="bottom-right" 
          toastOptions={{
            style: {
              background: '#0F172A',
              color: '#fff',
              borderRadius: '16px',
              fontSize: '12px',
              fontWeight: 700,
              padding: '12px 16px',
              boxShadow: '0 10px 30px -10px rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.1)',
            },
            success: {
                iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                },
            },
            error: {
                iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                },
            }
        }} />
      </body>
    </html>
  );
}