import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/core/AuthGuard";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TrainingBook",
  description: "Operational Management System",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/planning.svg", 
    shortcut: "/planning.svg",
    apple: "/planning.svg", 
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TrainingBook",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F172A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
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
        
        {/* Global Toast Config - Tactical Dark Mode Style */}
        <Toaster 
          position="bottom-right" 
          toastOptions={{
            // Define default styles
            style: {
              background: '#0F172A', // Slate 900
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
            // Success State
            success: {
                iconTheme: {
                    primary: '#10b981', // Emerald 500
                    secondary: '#fff',
                },
                style: {
                    borderLeft: '4px solid #10b981',
                }
            },
            // Error State
            error: {
                iconTheme: {
                    primary: '#ef4444', // Red 500
                    secondary: '#fff',
                },
                style: {
                    borderLeft: '4px solid #ef4444',
                }
            },
            // Loading State
            loading: {
                style: {
                    borderLeft: '4px solid #3b82f6', // Blue 500
                }
            }
        }} />
      </body>
    </html>
  );
}