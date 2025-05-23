'use client'

import React, { useState, useEffect } from 'react'
import { BookOpen, Brain, LogOut } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

const Response = ({ content }: { content: string }) => {
  const parseResponse = (text: string) => {
    const source = text.match(/\[SOURCE: ([^\]]+)\]/)?.[1] || '';
    const sections = {
      textbook: '',
      aiGenerated: ''
    };
    const contentWithoutSource = text.replace(/^\[SOURCE:[^\]]+\]/, '').trim();
    if (contentWithoutSource.includes('Based on the Text Reference:')) {
      const [aiPart, textbookPart] = contentWithoutSource.split('Based on the Text Reference:');
      sections.textbook = textbookPart?.trim() || '';
      sections.aiGenerated = aiPart?.trim() || '';
    } else {
      sections.aiGenerated = contentWithoutSource
        .replace(/While the textbook does not contain specific information about/, '')
        .trim();
    }
    return { source, ...sections };
  };
  const { source, textbook, aiGenerated } = parseResponse(content);
  return (
    <div className="space-y-4 w-full">
      <div className="text-purple-300 text-sm tracking-wider mb-2">
        Source: {source}
      </div>
      {textbook && (
        <div className="bg-purple-900/30 backdrop-blur-sm rounded-lg p-6 space-y-3">
          <div className="flex items-center gap-2 text-purple-300">
            <BookOpen className="w-5 h-5" />
            <span className="font-semibold">Text Reference</span>
          </div>
          <div className="text-white/90 leading-relaxed whitespace-pre-line">
            {textbook}
          </div>
        </div>
      )}
      <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-6 space-y-3">
        <div className="flex items-center gap-2 text-blue-300">
          <Brain className="w-5 h-5" />
          <span className="font-semibold">AI Response</span>
        </div>
        <div className="text-white/90 leading-relaxed whitespace-pre-line">
          {aiGenerated}
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const router = useRouter();
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check authentication on component mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  const handleNavigation = (path: string) => {
    window.location.href = path;
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    setMessages(msgs => [...msgs, { role: 'user', content: input }]);
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ 
          message: input, 
          token: localStorage.getItem('token') || '' 
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages(msgs => [...msgs, { role: 'ai', content: data.response }]);
      } else {
        setError(data.detail || 'Chat failed');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 min-h-screen">
      <div className="max-w-4xl w-full flex flex-col items-center">
        <div className="w-full flex justify-end mb-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
        <Image src="/High Res Logo Ulearn Black.svg" alt="ULearn Logo" width={320} height={140} className="mb-6 mt-8" />
        <h1 className="text-4xl font-extrabold text-center mb-8 tracking-tight" style={{ color: '#1e88a8' }}>
          ULearn Chatbot
        </h1>
        <p className="text-lg text-gray-700 mb-8 font-light">Investing in future</p>
        <div className="flex flex-col sm:flex-row gap-8 justify-center mt-2 mb-8">
          <button
            onClick={() => handleNavigation('/upload')}
            className="py-4 px-10 rounded-2xl font-semibold flex items-center justify-center gap-3 transition-all duration-200 bg-gradient-to-r from-[#e0f2fe] via-[#bae6fd] to-[#7dd3fc] text-[#2563eb] shadow-md hover:brightness-110 hover:scale-105 text-lg"
          >
            <BookOpen className="w-6 h-6" />
            <span>Upload Textbook</span>
          </button>
          <button
            onClick={() => handleNavigation('/subjects')}
            className="py-4 px-10 rounded-2xl font-semibold flex items-center justify-center gap-3 transition-all duration-200 bg-gradient-to-r from-[#a5f3fc] via-[#e0f2fe] to-[#bae6fd] text-[#0e7490] shadow-md hover:brightness-110 hover:scale-105 text-lg"
          >
            <BookOpen className="w-6 h-6" />
            <span>Browse Subjects</span>
          </button>
        </div>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[40vh] w-full">
            <div className="text-2xl sm:text-3xl font-semibold text-[#2563eb] mb-4 text-center">Welcome to your learning assistant!</div>
            <div className="text-base sm:text-lg text-[#4a4a4a] text-center max-w-xl">Ask anything from your textbooks, or use the buttons above to get started. Your AI tutor is here to help you learn and grow.</div>
          </div>
        )}
      </div>
      <main className="flex-1 w-full max-w-2xl px-2 sm:px-0 flex flex-col gap-8 items-center justify-center">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}> 
            <div
              className={`rounded-2xl px-5 py-3 max-w-[80%] shadow-lg text-base whitespace-pre-line ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-[#e0f2fe] to-[#bae6fd] text-[#2563eb] self-end'
                  : 'bg-gradient-to-r from-[#a5f3fc] to-[#e0f2fe] text-[#0e7490] self-start border border-[#bae6fd]'
              }`}
            >
              {msg.role === 'ai' ? <Response content={msg.content} /> : msg.content}
            </div>
          </div>
        ))}
        <div className="flex w-full gap-2 mt-4">
          <input
            className="flex-1 p-2 rounded border"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your message..."
            onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
            disabled={loading}
          />
          <button
            className="bg-blue-600 text-white rounded px-4 py-2"
            onClick={sendMessage}
            disabled={loading || !input.trim()}
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
        {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
      </main>
    </div>
  );
}