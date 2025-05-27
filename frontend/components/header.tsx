'use client'

import React from 'react'
import { BookOpen, Search, User, MessageSquare } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  isSidebarCollapsed: boolean;
}

export default function Header({ isSidebarCollapsed }: HeaderProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  const handleProfile = () => {
    router.push('/profile');
  };

  return (
    <header className="fixed top-0 right-0 left-0 z-50 backdrop-blur-sm bg-transparent">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center">
            <Image src="/High Res Logo Ulearn Black.svg" alt="ULearn Logo" width={36} height={36} className="mr-2" />
            <h1 className="text-xl font-bold text-[#1e88a8]">ULearn</h1>
          </div>
          <div className="hidden md:flex items-center space-x-1">
            <Link href="/subjects" className="px-3 py-2 rounded-lg text-[#0e7490] hover:bg-[#e0f2fe]/50 transition-colors">
              Subjects
            </Link>
            <Link href="/search" className="px-3 py-2 rounded-lg text-[#0e7490] hover:bg-[#e0f2fe]/50 transition-colors">
              Search
            </Link>
            <Link href="/ulearn" className="px-3 py-2 rounded-lg text-[#0e7490] hover:bg-[#e0f2fe]/50 transition-colors">
              Dashboard
            </Link>
            <Link href="/subjects-history" className="px-3 py-2 rounded-lg text-[#0e7490] hover:bg-[#e0f2fe]/50 transition-colors">
              MCQS History
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3 relative">
          <button className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-[#e0f2fe] to-[#bae6fd] text-[#2563eb] hover:brightness-105 transition-all"
            onClick={() => router.push("/search")}
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <div className="relative">
            <button
              className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-[#e0f2fe] to-[#bae6fd] text-[#2563eb] hover:brightness-105 transition-all"
              onClick={() => setDropdownOpen((open) => !open)}
            >
              <User className="w-5 h-5" />
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
    </header>
  )
}