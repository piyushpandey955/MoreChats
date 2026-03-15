import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppSidebar from "@/components/AppSidebar";
import AppMobileNav from "@/components/AppMobileNav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CircleBuilder",
  description: "Reddit outreach automation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-[#23140f] text-slate-100`}>
        <div className="flex">
          <AppSidebar />

          {/* Main content */}
          <main className="flex-1 lg:ml-64 p-4 sm:p-6 pb-20 lg:pb-6">
            {children}
          </main>
          <AppMobileNav />
        </div>
      </body>
    </html>
  );
}
