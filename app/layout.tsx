import type { Metadata, Viewport } from "next"; // Import Viewport
import { Inter } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/core/AuthGuard";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TrainingBook",
  description: "Operational Management System",
  manifest: "/manifest.webmanifest", // Link to the auto-generated manifest
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TrainingBook",
  },
};

// Add this Viewport export
export const viewport: Viewport = {
  themeColor: "#0F172A", // Matches your Slate 900 background
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Makes it feel like a native app (no pinch zoom)
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <AuthGuard>
           {children}
        </AuthGuard>
        
        {/* Global Toast Config */}
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
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            },
            success: {
                iconTheme: { primary: '#10b981', secondary: '#fff' },
                style: { borderLeft: '4px solid #10b981' }
            },
            error: {
                iconTheme: { primary: '#ef4444', secondary: '#fff' },
                style: { borderLeft: '4px solid #ef4444' }
            },
            loading: {
                style: { borderLeft: '4px solid #3b82f6' }
            }
        }} />
      </body>
    </html>
  );
}