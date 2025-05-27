'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [type, setType] = useState('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Clear any existing token when the login page loads
  useEffect(() => {
    localStorage.removeItem('token');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch("https://tutor.ulearnlms.com/vle/rest/app/login", {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username, password, type }),
      });
      const data = await res.json();
      console.log('Login response:', data);
      
      if (!res.ok) {
        throw new Error(data.detail || 'Login failed');
      }
      
      // Check if the user type matches the requested type
      // const serverUserType = data.userType;
      // const expectedType = type === 'student'? 'S' : 'A';
      
      // if (serverUserType && serverUserType !== expectedType) {
      //   const actualRole = serverUserType === 'S' ? 'student' : 'admin';
      //   throw new Error(`You are registered as a ${actualRole}. Please select the correct user type.`);
      // }
      
      if (data && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('email', data.email);
        localStorage.setItem('userType', type);
        localStorage.setItem('firstName', data.firstName);
        localStorage.setItem('lastName', data.lastName);
        localStorage.setItem('photo', data.photo);
        router.push('/');
      } else {
        console.error('Unexpected response structure:', data);
        throw new Error('Invalid Password or Email');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[linear-gradient(135deg,_#e0f2fe_0%,_#f0f9ff_20%,_#ffe4e6_40%,_#bae6fd_60%,_#a5f3fc_100%)] text-[#222] p-4">
      <div className="max-w-4xl w-full flex flex-col items-center">
        <Image 
          src="/High Res Logo Ulearn Black.svg" 
          alt="ULearn Logo" 
          width={320} 
          height={140} 
          className="mb-6 mt-8"
        />
        <h1 className="text-4xl font-extrabold text-center mb-6 tracking-tight" style={{ color: '#1e88a8' }}>
          Welcome Back
        </h1>
        <p className="text-lg text-gray-700 mb-8 font-light">Please sign in to continue</p>

        <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 w-full max-w-md">
          <div className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50"
              />
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                User Type
              </label>
              <div className="relative">
                <select
                  id="type"
                  value={type}
                  onChange={e => setType(e.target.value)}
                  className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 appearance-none cursor-pointer pr-10"
                >
                  <option value="student">Student</option>
                  <option value="admin">Admin</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50/50 backdrop-blur-sm p-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 rounded-2xl font-semibold transition-all duration-200 bg-gradient-to-r from-[#e0f2fe] via-[#bae6fd] to-[#7dd3fc] text-[#2563eb] shadow-md hover:brightness-110 hover:scale-105 text-lg disabled:bg-gray-300 disabled:text-gray-400"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 