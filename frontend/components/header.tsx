'use client'

import React from 'react'
import { BookOpen, Search, User, MessageSquare, Menu, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  isSidebarCollapsed: boolean;
  onNavToggle: (isOpen: boolean) => void;
}

export default function Header({ isSidebarCollapsed, onNavToggle }: HeaderProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [isNavOpen, setIsNavOpen] = React.useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  const handleProfile = () => {
    router.push('/profile');
  };

  const toggleNav = () => {
    const newState = !isNavOpen;
    setIsNavOpen(newState);
    onNavToggle(newState);
  };

  return (
    <header className="fixed top-0 right-0 left-0 z-50 backdrop-blur-sm bg-transparent">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-3 md:px-6 py-2 md:py-3">
        <div className="flex items-center gap-3 md:gap-6 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center">
            <Image src="/High Res Logo Ulearn Black.svg" alt="ULearn Logo" width={28} height={28} className="mr-2 md:w-9 md:h-9" />
            <h1 className="text-lg md:text-xl font-bold text-[#1e88a8]">ULearn</h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleNav}
              className="md:hidden flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-[#e0f2fe] to-[#bae6fd] text-[#2563eb] hover:brightness-105 transition-all"
            >
              {isNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <button className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-[#e0f2fe] to-[#bae6fd] text-[#2563eb] hover:brightness-105 transition-all"
              onClick={() => router.push("/search")}
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <div className="relative">
              <button
                className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-[#e0f2fe] to-[#bae6fd] text-[#2563eb] hover:brightness-105 transition-all"
                onClick={() => setDropdownOpen((open) => !open)}
              >
                <User className="w-4 h-4" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg py-2 z-50 border border-gray-100">
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-blue-50 text-[#2563eb]"
                    onClick={() => { setDropdownOpen(false); handleProfile(); }}
                  >
                    Profile Page
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-blue-50 text-red-600"
                    onClick={() => { setDropdownOpen(false); handleLogout(); }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className={`flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-1 w-full md:w-auto mt-2 md:mt-0 transition-all duration-300 ease-in-out ${isNavOpen ? 'max-h-48 opacity-100' : 'max-h-0 md:max-h-48 opacity-0 md:opacity-100 overflow-hidden md:overflow-visible'}`}>
          <Link href="/subjects" className="w-full md:w-auto px-3 py-2 rounded-lg text-[#0e7490] hover:bg-[#e0f2fe]/50 transition-colors">
            Subjects
          </Link>
          <Link href="/search" className="w-full md:w-auto px-3 py-2 rounded-lg text-[#0e7490] hover:bg-[#e0f2fe]/50 transition-colors">
            Search
          </Link>
          <Link href="/ulearn" className="w-full md:w-auto px-3 py-2 rounded-lg text-[#0e7490] hover:bg-[#e0f2fe]/50 transition-colors">
            Dashboard
          </Link>
          <Link href="/subjects-history" className="w-full md:w-auto px-3 py-2 rounded-lg text-[#0e7490] hover:bg-[#e0f2fe]/50 transition-colors">
            MCQS History
          </Link>
        </div>
      </div>
    </header>
  )
}