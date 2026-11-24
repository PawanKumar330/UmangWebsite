"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Users,
  LogIn,
  Shield,
  Bell,
  Menu,
  X,
  Radio,
  LogOut,
  LayoutDashboard,
} from "lucide-react";
import { isConfiguredApi } from "@/lib/api";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [captainEmail, setCaptainEmail] = useState<string | null>(null);
  const [isLiveApi, setIsLiveApi] = useState(false);

  useEffect(() => {
    setIsLiveApi(isConfiguredApi());

    const updateAuth = () => {
      if (typeof window !== "undefined") {
        setCaptainEmail(sessionStorage.getItem("captain_email"));
      }
    };

    updateAuth();
    window.addEventListener("storage", updateAuth);
    return () => window.removeEventListener("storage", updateAuth);
  }, [pathname]);

  const handleCaptainLogout = () => {
    sessionStorage.removeItem("captain_token");
    sessionStorage.removeItem("captain_email");
    sessionStorage.removeItem("captain_name");
    setCaptainEmail(null);
    window.location.href = "/login";
  };

  const navLinks = [
    { href: "/register", label: "Register Team", icon: Users },
    { href: "/notices", label: "Notices & Schedule", icon: Bell },
    ...(captainEmail
      ? [{ href: "/dashboard", label: "Captain Portal", icon: LayoutDashboard }]
      : [{ href: "/login", label: "Captain Login", icon: LogIn }]),
    { href: "/admin", label: "Admin", icon: Shield },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#fbfaf7]/95 backdrop-blur-sm border-b border-stone-200">
      {/* Top Institutional Bar */}
      <div className="bg-[#240c13] text-stone-300 text-xs px-4 py-1.5 border-b border-stone-900">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            <span className="font-medium text-stone-200">
              Motihari College of Engineering • Annual Cultural Fest 2026
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-stone-400">
            {isLiveApi ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-400 font-mono">
                <Radio className="w-3 h-3 text-emerald-400" /> Live Sheets API
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-amber-300">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Demo Mode
              </span>
            )}
          </div>
        </div>
      </div>

      <nav className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & College Title */}
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-[#831830] flex items-center justify-center text-white font-serif font-bold text-base shadow-sm">
            U
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg tracking-tight text-stone-900">
                UMANG
              </span>
              <span className="text-[11px] px-1.5 py-0.2 rounded font-mono font-medium bg-stone-100 text-stone-700 border border-stone-200">
                2026
              </span>
            </div>
            <p className="text-[11px] text-stone-500 font-normal">
              MCE Team Portal
            </p>
          </div>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              pathname === link.href ||
              (link.href !== "/" && pathname?.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-stone-200/70 text-stone-900 font-medium"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? "text-[#831830]" : "text-stone-400"
                  }`}
                />
                {link.label}
              </Link>
            );
          })}

          {captainEmail && (
            <button
              onClick={handleCaptainLogout}
              className="ml-2 flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
              title="Logout Captain"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          )}

          <Link
            href="/register"
            className="ml-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium text-white bg-[#831830] hover:bg-[#6e192c] transition-colors shadow-sm"
          >
            <Users className="w-4 h-4 text-amber-200" />
            Register Team
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            href="/register"
            className="text-xs font-medium px-2.5 py-1.5 rounded-md bg-[#831830] text-white"
          >
            Register
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-md text-stone-700 hover:bg-stone-100"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-[#fbfaf7] px-4 pt-3 pb-5 space-y-1 shadow-md">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm ${
                  isActive
                    ? "bg-stone-200/80 text-stone-900 font-medium"
                    : "text-stone-700 hover:bg-stone-100"
                }`}
              >
                <Icon className="w-4 h-4 text-[#831830]" />
                {link.label}
              </Link>
            );
          })}

          {captainEmail && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleCaptainLogout();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-rose-700 hover:bg-rose-50"
            >
              <LogOut className="w-4 h-4" />
              Logout ({captainEmail})
            </button>
          )}

          <div className="pt-2">
            <Link
              href="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-md font-medium text-sm text-white bg-[#831830] shadow-sm"
            >
              <Users className="w-4 h-4 text-amber-200" />
              Register Team
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
