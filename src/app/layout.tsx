import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "UMANG 2026 | Event Team Registration Portal - MCE Motihari",
  description:
    "Official Event Team Registration Portal for UMANG 2026 Cultural Fest, Motihari College of Engineering (MCE Motihari). Register teams, pick verified teammates, and manage squads.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased flex flex-col min-h-screen bg-[#faf7f2] text-slate-900 selection:bg-festive-maroon-100 selection:text-festive-maroon-900">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
