"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LogIn,
  Mail,
  Lock,
  AlertCircle,
  HelpCircle,
  Loader2,
  Info,
} from "lucide-react";
import { callApi } from "@/lib/api";

export default function CaptainLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your registered email and password.");
      return;
    }

    setLoading(true);

    try {
      const res = await callApi<{
        token: string;
        captain_name: string;
        captain_email: string;
      }>({
        action: "captainLogin",
        email: email.trim(),
        password: password,
      });

      if (res.ok && res.data) {
        // Save session in sessionStorage
        sessionStorage.setItem("captain_token", res.data.token);
        sessionStorage.setItem("captain_name", res.data.captain_name);
        sessionStorage.setItem("captain_email", res.data.captain_email);

        // Trigger storage event for Navbar update
        window.dispatchEvent(new Event("storage"));

        // Redirect to dashboard
        router.push("/dashboard");
      } else {
        setError(res.error || "Invalid email or password.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to log in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-10 h-10 rounded-md bg-[#fdf2f4] text-[#831830] mx-auto flex items-center justify-center">
          <LogIn className="w-5 h-5" />
        </div>
        <h1 className="text-2xl font-serif text-stone-900 tracking-tight">
          Captain Portal Login
        </h1>
        <p className="text-xs sm:text-sm text-stone-600">
          Enter the password delivered to your Gmail upon registering a squad.
        </p>
      </div>

      {/* Login Card */}
      <div className="bg-white rounded-lg p-6 sm:p-7 shadow-sm border border-stone-200 space-y-5">
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-700">
              Captain email address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="name@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-md border border-stone-300 focus:outline-none focus:border-[#831830] focus:ring-1 focus:ring-[#831830] text-sm text-stone-900 placeholder:text-stone-400"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-stone-700">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(!showForgotPassword)}
                className="text-xs text-[#831830] hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-md border border-stone-300 focus:outline-none focus:border-[#831830] focus:ring-1 focus:ring-[#831830] text-sm text-stone-900 placeholder:text-stone-400"
                required
              />
            </div>
          </div>

          {/* Forgot Password Accordion */}
          {showForgotPassword && (
            <div className="p-3.5 rounded-md bg-amber-50 border border-amber-200 text-xs space-y-1 text-amber-900">
              <div className="font-medium flex items-center gap-1.5 text-amber-900">
                <HelpCircle className="w-4 h-4 text-amber-700 shrink-0" />
                Password Reset Policy
              </div>
              <p className="text-xs text-amber-800">
                To prevent unauthorized roster modifications, automated self-service resets are disabled. Contact the event coordinator or festival desk with your college identity card to reset your password.
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{error}</p>
                {error.includes("locked") && (
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    For security, five consecutive failed attempts locks login for 10 minutes.
                  </p>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-md font-medium text-white text-sm bg-[#831830] hover:bg-[#6e192c] transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Verifying credentials...
              </>
            ) : (
              "Log in to portal"
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-stone-100 text-center">
          <p className="text-xs text-stone-500">
            Have not registered a team yet?{" "}
            <Link href="/register" className="text-[#831830] font-medium hover:underline">
              Register a team
            </Link>
          </p>
        </div>
      </div>

      {/* Helpful Hint Card */}
      <div className="bg-stone-50 border border-stone-200 rounded-md p-3.5 text-xs text-stone-600 space-y-1">
        <p className="font-medium text-stone-800 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-stone-500" />
          Where to find your password
        </p>
        <p className="leading-relaxed">
          Your initial password was automatically generated and sent to the Gmail address entered during event team registration. Please check your inbox or spam folder for "UMANG 2026".
        </p>
      </div>
    </div>
  );
}
