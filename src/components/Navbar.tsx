"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Sparkles,
  Users,
  LogIn,
  Shield,
  Bell,
  Menu,
  X,
  Radio,
  LogOut,
} from "lucide-react";
import { isConfiguredApi } from "@/lib/api";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [captainEmail, setCaptainEmail] = useState<string | null>(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isLiveApi, setIsLiveApi] = useState(false);

  useEffect(() => {
    setIsLiveApi(isConfiguredApi());

    const updateAuth = () => {
      if (typeof window !== "undefined") {
        setCaptainEmail(sessionStorage.getItem("captain_email"));
        setIsAdminLoggedIn(Boolean(sessionStorage.getItem("admin_token")));
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
      ? [{ href: "/dashboard", label: "Captain Portal", icon: Sparkles }]
      : [{ href: "/login", label: "Captain Login", icon: LogIn }]),
    { href: "/admin", label: "Admin", icon: Shield },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-festive-maroon-100 shadow-sm transition-all">
      {/* Top micro-bar with Fest name and Status */}
      <div className="bg-gradient-to-r from-festive-maroon-900 via-festive-maroon-800 to-festive-saffron-700 text-white text-xs px-4 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2 font-medium">
          <span className="inline-block w-2 h-2 rounded-full bg-festive-gold-400 animate-pulse"></span>
          <span>Motihari College of Engineering • Annual Cultural Fest 2026</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[11px] opacity-90">
          {isLiveApi ? (
            <span className="inline-flex items-center gap-1 text-emerald-300 font-mono">
              <Radio className="w-3 h-3 animate-pulse" /> Live Google Sheets API
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Preview Mode
            </span>
          )}
        </div>
      </div>

      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & College Title */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-festive-maroon-800 to-festive-saffron-600 flex items-center justify-center text-white shadow-md shadow-festive-maroon-800/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-festive-gold-300" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-festive-maroon-900 to-festive-saffron-600 bg-clip-text text-transparent">
                UMANG
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded font-bold bg-festive-gold-100 text-festive-maroon-900 border border-festive-gold-300">
                2026
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-none">
              MCE Motihari Portal
            </p>
          </div>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-1 lg:gap-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-festive-maroon-50 text-festive-maroon-700 border border-festive-maroon-200 shadow-sm"
                    : "text-slate-600 hover:text-festive-maroon-800 hover:bg-slate-50"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-festive-maroon-600" : "text-slate-400"}`} />
                {link.label}
              </Link>
            );
          })}

          {captainEmail && (
            <button
              onClick={handleCaptainLogout}
              className="ml-2 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition"
              title="Logout Captain"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          )}

          <Link
            href="/register"
            className="ml-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-festive-maroon-700 via-festive-maroon-800 to-festive-saffron-600 hover:opacity-95 shadow-md shadow-festive-maroon-700/25 transition-transform active:scale-95"
          >
            <Users className="w-4 h-4 text-festive-gold-300" />
            Register Team
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            href="/register"
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-festive-maroon-700 text-white shadow"
          >
            Register
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-700 hover:bg-slate-100"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-2 shadow-xl animate-in slide-in-from-top-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold ${
                  isActive
                    ? "bg-festive-maroon-50 text-festive-maroon-700 border border-festive-maroon-200"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Icon className="w-5 h-5 text-festive-maroon-600" />
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
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50"
            >
              <LogOut className="w-5 h-5" />
              Logout ({captainEmail})
            </button>
          )}

          <div className="pt-2">
            <Link
              href="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-festive-maroon-700 to-festive-saffron-600 shadow-md"
            >
              <Users className="w-4 h-4 text-festive-gold-300" />
              Register Team Now
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
