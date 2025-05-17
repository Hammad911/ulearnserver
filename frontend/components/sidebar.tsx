'use client'

import { useRouter, usePathname } from 'next/navigation'
import { BookOpen, Home, Atom, FlaskRound, Leaf, BrainCircuit, ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const isActive = (path: string) => {
    return pathname === path
  }

  const navigateToSubject = (subject: string) => {
    router.push(`/search?subject=${subject}`)
  }

  const navigateToHome = () => {
    router.push('/')
  }

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }

  return (
    <div 
      className={`fixed left-0 top-16 h-[calc(100vh-4rem)] z-20 bg-transparent backdrop-blur-sm shadow-lg border-r border-[#e0e7ef]/50 flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${
        isCollapsed ? 'w-24' : 'w-64'
      }`}
    >
      <div className="relative flex flex-col items-center justify-start pt-5 pb-1">
        <button
          onClick={toggleSidebar}
          className="absolute top-20 right-[-18px] -translate-y-1/2 bg-white/70 backdrop-blur-sm rounded-full p-1 shadow-md hover:bg-white/90 transition-colors border border-[#e0e7ef]/50"
          style={{ zIndex: 30 }}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-[#0e7490]" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-[#0e7490]" />
          )}
        </button>
      </div>

      <nav className="flex-1 px-2 space-y-2 flex flex-col items-center justify-start mt-4">
        <button
          onClick={navigateToHome}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isCollapsed ? 'justify-center' : ''} ${
            isActive('/') 
              ? 'bg-gradient-to-r from-[#e0f2fe]/70 to-[#bae6fd]/70 text-[#2563eb] shadow-md backdrop-blur-sm' 
              : 'text-[#0e7490] hover:bg-white/30'
          }`}
          title="Home"
        >
          <Home className="w-6 h-6" />
          {!isCollapsed && <span className="font-medium">Home</span>}
        </button>

        {!isCollapsed && (
          <div className="pt-2 w-full">
            <h3 className="px-4 text-sm font-semibold text-[#1e88a8] uppercase tracking-wider mb-2">
              Subjects
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => navigateToSubject('english')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  pathname.includes('english') 
                    ? 'bg-gradient-to-r from-[#e0f2fe]/70 to-[#bae6fd]/70 text-[#2563eb] shadow-md backdrop-blur-sm' 
                    : 'text-[#0e7490] hover:bg-white/30'
                }`}
              >
                <BookOpen className="w-5 h-5" />
                <span className="font-medium">English</span>
              </button>
              <button
                onClick={() => navigateToSubject('physics')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  pathname.includes('physics') 
                    ? 'bg-gradient-to-r from-[#e0f2fe]/70 to-[#bae6fd]/70 text-[#2563eb] shadow-md backdrop-blur-sm' 
                    : 'text-[#0e7490] hover:bg-white/30'
                }`}
              >
                <Atom className="w-5 h-5" />
                <span className="font-medium">Physics</span>
              </button>
              <button
                onClick={() => navigateToSubject('chemistry')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  pathname.includes('chemistry') 
                    ? 'bg-gradient-to-r from-[#e0f2fe]/70 to-[#bae6fd]/70 text-[#2563eb] shadow-md backdrop-blur-sm' 
                    : 'text-[#0e7490] hover:bg-white/30'
                }`}
              >
                <FlaskRound className="w-5 h-5" />
                <span className="font-medium">Chemistry</span>
              </button>
              <button
                onClick={() => navigateToSubject('biology')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  pathname.includes('biology') 
                    ? 'bg-gradient-to-r from-[#e0f2fe]/70 to-[#bae6fd]/70 text-[#2563eb] shadow-md backdrop-blur-sm' 
                    : 'text-[#0e7490] hover:bg-white/30'
                }`}
              >
                <Leaf className="w-5 h-5" />
                <span className="font-medium">Biology</span>
              </button>
              <button
                onClick={() => navigateToSubject('logicalreasoning')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  pathname.includes('logicalreasoning') 
                    ? 'bg-gradient-to-r from-[#e0f2fe]/70 to-[#bae6fd]/70 text-[#2563eb] shadow-md backdrop-blur-sm' 
                    : 'text-[#0e7490] hover:bg-white/30'
                }`}
              >
                <BrainCircuit className="w-5 h-5" />
                <span className="font-medium">Logical Reasoning</span>
              </button>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="pt-2 space-y-4 flex flex-col items-center w-full">
            <button
              onClick={() => navigateToSubject('english')}
              className={`w-full flex items-center justify-center p-3 rounded-xl transition-all duration-200 ${
                pathname.includes('english') 
                  ? 'bg-gradient-to-r from-[#e0f2fe]/70 to-[#bae6fd]/70 text-[#2563eb] shadow-md backdrop-blur-sm' 
                  : 'text-[#0e7490] hover:bg-white/30'
              }`}
              title="English"
            >
              <BookOpen className="w-6 h-6" />
            </button>
            <button
              onClick={() => navigateToSubject('physics')}
              className={`w-full flex items-center justify-center p-3 rounded-xl transition-all duration-200 ${
                pathname.includes('physics') 
                  ? 'bg-gradient-to-r from-[#e0f2fe]/70 to-[#bae6fd]/70 text-[#2563eb] shadow-md backdrop-blur-sm' 
                  : 'text-[#0e7490] hover:bg-white/30'
              }`}
              title="Physics"
            >
              <Atom className="w-6 h-6" />
            </button>
            <button
              onClick={() => navigateToSubject('chemistry')}
              className={`w-full flex items-center justify-center p-3 rounded-xl transition-all duration-200 ${
                pathname.includes('chemistry') 
                  ? 'bg-gradient-to-r from-[#e0f2fe]/70 to-[#bae6fd]/70 text-[#2563eb] shadow-md backdrop-blur-sm' 
                  : 'text-[#0e7490] hover:bg-white/30'
              }`}
              title="Chemistry"
            >
              <FlaskRound className="w-6 h-6" />
            </button>
            <button
              onClick={() => navigateToSubject('biology')}
              className={`w-full flex items-center justify-center p-3 rounded-xl transition-all duration-200 ${
                pathname.includes('biology') 
                  ? 'bg-gradient-to-r from-[#e0f2fe]/70 to-[#bae6fd]/70 text-[#2563eb] shadow-md backdrop-blur-sm' 
                  : 'text-[#0e7490] hover:bg-white/30'
              }`}
              title="Biology"
            >
              <Leaf className="w-6 h-6" />
            </button>
            <button
              onClick={() => navigateToSubject('logicalreasoning')}
              className={`w-full flex items-center justify-center p-3 rounded-xl transition-all duration-200 ${
                pathname.includes('logicalreasoning') 
                  ? 'bg-gradient-to-r from-[#e0f2fe]/70 to-[#bae6fd]/70 text-[#2563eb] shadow-md backdrop-blur-sm' 
                  : 'text-[#0e7490] hover:bg-white/30'
              }`}
              title="Logical Reasoning"
            >
              <BrainCircuit className="w-6 h-6" />
            </button>
          </div>
        )}
      </nav>
    </div>
  )
}