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
  Sparkles,
  Loader2,
  ArrowRight,
  ShieldAlert,
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
    <div className="max-w-md mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-festive-maroon-100 text-festive-maroon-800 mx-auto flex items-center justify-center shadow-inner">
          <LogIn className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Captain Portal Login
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          Enter the password received in your Gmail upon registering a team.
        </p>
      </div>

      {/* Login Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-5">
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-slate-700 tracking-wider">
              Captain Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="e.g. prashant.kumar@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-festive-maroon-700 text-sm font-medium"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(!showForgotPassword)}
                className="text-xs text-festive-maroon-700 font-semibold hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-festive-maroon-700 text-sm font-medium"
                required
              />
            </div>
          </div>

          {/* Forgot Password Accordion / Notice */}
          {showForgotPassword && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5 animate-in fade-in">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                Password Reset Policy:
              </div>
              <p className="text-sm font-semibold text-amber-950">
                Contact the admin to reset your password.
              </p>
              <p className="text-[11px] text-amber-800">
                To prevent unauthorized team hijacking, automated password resets by email are disabled.
                Contact the event coordinator or fest admin with your student ID to request a reset.
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{error}</p>
                {error.includes("locked") && (
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    For your security, 5 failed attempts locks login for 10 minutes.
                  </p>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl font-bold text-white text-sm bg-gradient-to-r from-festive-maroon-700 via-festive-maroon-800 to-festive-saffron-600 hover:opacity-95 transition shadow-lg shadow-festive-maroon-800/20 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Verifying Credentials...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 text-festive-gold-300" /> Log In to Dashboard
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            Haven't registered a team yet?{" "}
            <Link href="/register" className="text-festive-maroon-700 font-bold hover:underline">
              Register Team
            </Link>
          </p>
        </div>
      </div>

      {/* Helpful Hint Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-500 space-y-1">
        <p className="font-bold text-slate-700 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-festive-gold-500" />
          Tip for Captains:
        </p>
        <p>
          Your password was automatically generated and sent to the email address registered on the event's Google Form.
          Please search for "UMANG 2026" in your Gmail.
        </p>
      </div>
    </div>
  );
}
