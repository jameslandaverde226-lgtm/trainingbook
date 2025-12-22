import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",        // Scans the App Router
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",      // Scans Pages (if any)
    "./components/**/*.{js,ts,jsx,tsx,mdx}", // Scans Components
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};
export default config;