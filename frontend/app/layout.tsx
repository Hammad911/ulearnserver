'use client'
import { useState } from "react";
import { Analytics } from "@vercel/analytics/next"
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import Footer from "@/components/footer";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  
  return (
    <html lang="en">
      <body className={`${inter.className} overflow-x-hidden`}>
        <div className="min-h-screen flex flex-col bg-[linear-gradient(135deg,_#e0f2fe_0%,_#f0f9ff_20%,_#ffe4e6_40%,_#bae6fd_60%,_#a5f3fc_100%)]">
          <Header isSidebarCollapsed={isSidebarCollapsed} onNavToggle={setIsNavOpen} />
          <div className="flex flex-1 relative">
            <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
            <main className={`transition-all duration-300 ease-in-out ${isNavOpen ? 'pt-48' : 'pt-16'} md:pt-16 flex-1 pb-20 md:${isSidebarCollapsed ? 'ml-24' : 'ml-64'} ${isSidebarCollapsed ? 'ml-16' : 'ml-48'}`}>
              {children}
              <Footer />
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}