"use client";

import { useParams, useRouter } from 'next/navigation';
import QuizHistory from '../../components/QuizHistory';
import Image from 'next/image';

export default function SubjectQuizHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const subject = typeof params.subject === 'string'
    ? decodeURIComponent(params.subject)
    : Array.isArray(params.subject)
      ? decodeURIComponent(params.subject[0])
      : '';
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  return (
    <div className="min-h-screen flex flex-col items-center bg-[linear-gradient(135deg,_#e0f2fe_0%,_#f0f9ff_20%,_#ffe4e6_40%,_#bae6fd_60%,_#a5f3fc_100%)] text-[#222] p-4">
      <div className="max-w-4xl w-full flex flex-col items-center">
        <Image src="/High Res Logo Ulearn Black.svg" alt="ULearn Logo" width={220} height={100} className="mb-4 mt-2" />
        <button
          onClick={() => router.push('/subjects-history')}
          className="mb-6 text-blue-600 hover:underline self-start"
        >
          ← Back to Subjects
        </button>
        <h2 className="text-2xl font-semibold mb-4 text-[#1e88a8]">{subject} Quiz History</h2>
        <QuizHistory userId={userId} subject={subject} />
      </div>
    </div>
  );
} 