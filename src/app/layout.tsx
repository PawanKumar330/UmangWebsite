import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "UMANG 2026 | Team Registration Portal — MCE Motihari",
  description:
    "Official Cultural Fest Registration Portal for Motihari College of Engineering. Verify participant eligibility, assemble event squads, and manage rosters.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased flex flex-col min-h-screen bg-[#fbfaf7] text-stone-900 selection:bg-festive-maroon-100 selection:text-festive-maroon-900 font-sans">
        <Navbar />
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
