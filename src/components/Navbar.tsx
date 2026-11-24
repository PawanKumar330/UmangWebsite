"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <header className="border-b border-gray-100 bg-white sticky top-0 z-40">
      <div className="w-full max-w-[480px] md:max-w-[620px] mx-auto px-5 py-3.5 flex items-center justify-between">
        {/* Logo Branding */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-[#9B1B3A] flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
            <span className="text-white font-bold text-base leading-none">U</span>
          </div>
          <span className="font-bold text-gray-900 text-base tracking-tight">
            UMANG{" "}
            <span className="text-xs font-semibold px-1.5 py-0.5 ml-1 rounded bg-gray-100 text-gray-600">
              2026
            </span>
          </span>
        </Link>
      </div>
    </header>
  );
}
