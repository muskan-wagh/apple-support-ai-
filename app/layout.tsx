import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apple Support AI — Demo",
  description: "AI-powered customer support demo using historical Apple Support conversations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#fbfbfd] font-sans text-[#1d1d1f]">
        <nav aria-label="Product" className="bg-[#161617] text-white">
          <div className="mx-auto flex h-12 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
            <p className="text-sm font-medium tracking-tight">Support Intelligence</p>
            <p className="rounded-full border border-white/20 px-2.5 py-0.5 text-xs text-white/80">Demo</p>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
