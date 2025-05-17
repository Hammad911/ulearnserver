'use client'
import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Twitter, Facebook, Instagram, Linkedin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="right-0 left-0 z-10 backdrop-blur-sm bg-transparent">
      <div className="max-w-3xl mx-auto flex flex-col items-center py-12 px-4">
        {/* Logo and Brand */}
        <div className="flex flex-col items-center mb-4">
          <Image src="/High Res Logo Ulearn Black.svg" alt="ULearn Logo" width={48} height={48} />
          <span className="text-2xl font-bold mt-2 text-[#2563eb]">ULearn</span>
        </div>
        
        {/* Tagline */}
        <p className="text-center text-[#4a4a4a] mb-6 max-w-md">
          Empowering your learning journey. Connect, explore, and grow with ULearn.
        </p>
        
        {/* Social Icons */}
        <div className="flex gap-6 mb-6">
          <Link href="https://twitter.com/" target="_blank" className="text-[#2563eb] hover:text-[#38bdf8] transition-colors">
            <Twitter className="w-6 h-6" />
          </Link>
          <Link href="https://facebook.com/" target="_blank" className="text-[#2563eb] hover:text-[#38bdf8] transition-colors">
            <Facebook className="w-6 h-6" />
          </Link>
          <Link href="https://instagram.com/" target="_blank" className="text-[#2563eb] hover:text-[#38bdf8] transition-colors">
            <Instagram className="w-6 h-6" />
          </Link>
          <Link href="https://linkedin.com/" target="_blank" className="text-[#2563eb] hover:text-[#38bdf8] transition-colors">
            <Linkedin className="w-6 h-6" />
          </Link>
        </div>
        
        {/* Divider */}
        <div className="w-24 h-1 bg-gradient-to-r from-[#e0f2fe] to-[#7dd3fc] rounded-full mb-6" />
        
        {/* Bottom Row */}
        <div className="w-full flex flex-col md:flex-row items-center justify-between text-[#4a4a4a] text-sm gap-2">
          <div className="mb-2 md:mb-0">&copy; {new Date().getFullYear()} ULearn. All rights reserved.</div>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-[#2563eb] transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[#2563eb] transition-colors">Terms of Service</Link>
            <Link href="/contact" className="hover:text-[#2563eb] transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}