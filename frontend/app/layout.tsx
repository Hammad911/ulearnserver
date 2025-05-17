'use client'
import { useState } from "react";
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
  
  return (
    <html lang="en">
      <body className={`${inter.className} overflow-x-hidden`}>
        <div className="min-h-screen flex flex-col bg-[linear-gradient(135deg,_#e0f2fe_0%,_#f0f9ff_20%,_#ffe4e6_40%,_#bae6fd_60%,_#a5f3fc_100%)]">
          <Header isSidebarCollapsed={isSidebarCollapsed} />
          <div className="flex flex-1">
            <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
            <main className={`transition-all duration-300 ease-in-out pt-16 flex-1 pb-20 ${isSidebarCollapsed ? 'ml-24' : 'ml-64'}`}>
              {children}
              <Footer />
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}