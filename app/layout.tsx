import type { Metadata, Viewport } from "next"; // <--- This import fixes your error
import { Inter } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/core/AuthGuard";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Trainingbook",
  description: "Operational Management System",
  // We removed the manual 'manifest' link and 'icons' block here.
  // Next.js will automatically find 'app/manifest.ts' and 'app/apple-icon.png'
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Trainingbook",
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