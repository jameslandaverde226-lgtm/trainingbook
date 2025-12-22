import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trainingbook",
  description: "Training & Operations Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /* 
      FIX: Added suppressHydrationWarning to <html>. 
      This tells React to ignore attribute mismatches on the root element 
      caused by browser extensions or translation tools.
    */
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-slate-50 min-h-screen" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}