'use client'

import React from 'react'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Send, ArrowRight, CheckCircle2, XCircle, History, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import QuizHistory from '../components/QuizHistory'
import QuizTimer from '../components/QuizTimer'

interface MCQ {
  question: string;
  options: string[];
  correctAnswer: string;
}

interface QuizState {
  mcqs: MCQ[];
  currentQuestion: number;
  selectedAnswers: string[];
  showResults: boolean;
  score: number;
  isTimerActive: boolean;
}

// Add new interface for quiz submission
interface QuizSubmission {
  subject: string;
  topic: string;
  title: string;
  questions: {
    question_text: string;
    options: {
      option_text: string;
      is_correct: boolean;
    }[];
    user_answer: string;
  }[];
  score: number;
  email: string;
}

function MCQPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subject = searchParams.get('subject');
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mcqCount, setMcqCount] = useState('5');
  const [currentTopic, setCurrentTopic] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [quizState, setQuizState] = useState<QuizState>({
    mcqs: [],
    currentQuestion: 0,
    selectedAnswers: [],
    showResults: false,
    score: 0,
    isTimerActive: false
  });
  const [showHistory, setShowHistory] = useState(false);

  
  const getPKTTimestamp = () => {
    const now = new Date();
    
    const pktTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
    return pktTime.toISOString();
  };

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    const storedEmail = localStorage.getItem('email');
    console.log('Retrieved userId from localStorage:', storedUserId);
    console.log('Retrieved email from localStorage:', storedEmail);
    setUserId(storedUserId);
    setEmail(storedEmail);
  }, []);

  useEffect(() => {
    if (!subject) {
      router.push('/subjects');
    }
  }, [subject, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !subject) return;

    setLoading(true);
    try {
      console.log('Sending MCQ request:', { query: input.trim(), subject });
      
      const response = await fetch('/api/mcq', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: input.trim(),
          subject: subject,
          mcqCount: parseInt(mcqCount)
        }),
      });

      console.log('Received response:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate quiz');
      }

      if (!data.questions || !Array.isArray(data.questions)) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid quiz format received');
      }

      // Convert the new format to the expected format
      const mcqs = data.questions.map((q: any) => {
        if (!q.question || !Array.isArray(q.options) || !q.answer) {
          console.error('Invalid MCQ format:', q);
          throw new Error('Invalid MCQ format received');
        }
        return {
          question: q.question,
          options: q.options,
          correctAnswer: q.options[q.answer.charCodeAt(0) - 65] // Convert A,B,C,D to 0,1,2,3
        };
      });

      console.log('Processed MCQs:', mcqs);
      setCurrentTopic(data.topic || input.trim());
      setQuizState({
        mcqs,
        currentQuestion: 0,
        selectedAnswers: new Array(mcqs.length).fill(''),
        showResults: false,
        score: 0,
        isTimerActive: true // Start the timer
      });
    } catch (err) {
      console.error('Quiz generation error:', err);
      alert(err instanceof Error ? err.message : 'Failed to generate quiz. Please try again.');
    } finally {
      setLoading(false);
      setInput('');
    }
  };

  const parseMCQs = (text: string): MCQ[] => {
    // This is a simple parser - you might want to adjust based on your AI's response format
    const mcqRegex = /Question (\d+):\s*(.*?)\s*Options:\s*([\s\S]*?)(?=Question \d+:|$)/g;
    const mcqs: MCQ[] = [];
    let match;

    while ((match = mcqRegex.exec(text)) !== null) {
      const question = match[2].trim();
      const optionsText = match[3].trim();
      const options = optionsText.split('\n')
        .map(opt => opt.replace(/^[A-D][.)]\s*/, '').trim())
        .filter(opt => opt.length > 0);

      // Assuming the correct answer is marked with an asterisk or similar
      const correctAnswer = options.find(opt => opt.includes('*'))?.replace('*', '').trim() || options[0];

      mcqs.push({
        question,
        options: options.map(opt => opt.replace('*', '').trim()),
        correctAnswer
      });
    }

    return mcqs;
  };

  const handleAnswerSelect = (answer: string) => {
    const newSelectedAnswers = [...quizState.selectedAnswers];
    newSelectedAnswers[quizState.currentQuestion] = answer;
    setQuizState(prev => ({
      ...prev,
      selectedAnswers: newSelectedAnswers
    }));
  };

  const handleNextQuestion = async () => {
    if (quizState.currentQuestion < quizState.mcqs.length - 1) {
      setQuizState(prev => ({
        ...prev,
        currentQuestion: prev.currentQuestion + 1
      }));
    } else {
      await finishQuiz();
    }
  };

  // Function to finish quiz (used by both manual submission and timer)
  const finishQuiz = async () => {
    // Use the latest selectedAnswers for score calculation
    const finalSelectedAnswers = [...quizState.selectedAnswers];
    const score = quizState.mcqs.reduce((acc, mcq, index) => {
      return acc + (finalSelectedAnswers[index] === mcq.correctAnswer ? 1 : 0);
    }, 0);

    setQuizState(prev => ({
      ...prev,
      showResults: true,
      score,
      isTimerActive: false // Stop the timer
    }));

    // Prepare quiz submission data
    const quizSubmission: QuizSubmission = {
      subject: subject || '',
      topic: currentTopic,
      title: `${subject} Quiz`,
      questions: quizState.mcqs.map((mcq, index) => ({
        question_text: mcq.question,
        options: mcq.options.map(opt => ({
          option_text: opt,
          is_correct: opt === mcq.correctAnswer
        })),
        user_answer: finalSelectedAnswers[index]
      })),
      score: score,
      email: email || ''
    };

    // Save quiz results to database
    try {
      const response = await fetch('/api/quiz/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId || ''
        },
        body: JSON.stringify({
          ...quizSubmission,
          created_at: getPKTTimestamp() // Add PKT timestamp
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save quiz results');
      }
    } catch (error) {
      console.error('Error saving quiz results:', error);
    }
  };

  // Handle timer expiration
  const handleTimeUp = async () => {
    alert('Time is up! Your quiz will be submitted automatically.');
    await finishQuiz();
  };

  const handleRestart = () => {
    setQuizState({
      mcqs: [],
      currentQuestion: 0,
      selectedAnswers: [],
      showResults: false,
      score: 0,
      isTimerActive: false
    });
  };

  if (!subject) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[linear-gradient(135deg,_#e0f2fe_0%,_#f0f9ff_20%,_#ffe4e6_40%,_#bae6fd_60%,_#a5f3fc_100%)] text-[#222] p-4">
      <div className="max-w-4xl w-full flex flex-col items-center">
        <Image src="/High Res Logo Ulearn Black.svg" alt="ULearn Logo" width={320} height={140} className="mb-8 mt-8" />
        <h1 className="text-3xl font-bold text-center mb-8 capitalize" style={{ color: '#1e88a8' }}>
          {subject} MCQ Generator
        </h1>

       

     

        {!quizState.mcqs.length ? (
          <form onSubmit={handleSubmit} className="mb-8 w-full">
            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Ask for ${subject} MCQs (e.g., 'Create MCQs about ${subject} topics')`}
                  className="flex-1 py-3 px-4 bg-white border border-gray-300 rounded-lg focus:ring-blue-400 focus:border-blue-400 text-[#222]"
                />
                <select
                  value={mcqCount}
                  onChange={(e) => setMcqCount(e.target.value)}
                  className="py-3 px-4 bg-white border border-gray-300 rounded-lg focus:ring-blue-400 focus:border-blue-400 text-[#222]"
                >
                  <option value="5">5 MCQs</option>
                  <option value="10">10 MCQs</option>
                  <option value="15">15 MCQs</option>
                  <option value="20">20 MCQs</option>
                </select>
              </div>
              
              {/* Time allocation info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-700">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Time Allocation: {mcqCount} questions = {mcqCount} minutes
                  </span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  Quiz will auto-submit when time expires. You can submit early by clicking "Finish Quiz".
                </p>
              </div>
              
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="py-3 px-6 rounded-2xl font-semibold transition-all duration-200 bg-gradient-to-r from-[#e0f2fe] via-[#bae6fd] to-[#7dd3fc] text-[#2563eb] shadow-md hover:brightness-110 hover:scale-105 flex items-center gap-2 disabled:bg-gray-300 disabled:text-gray-400"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send className="w-5 h-5" />
                )}
                <span>Generate Quiz</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6 w-full">
            {/* Timer Component */}
            <QuizTimer 
              totalQuestions={quizState.mcqs.length}
              onTimeUp={handleTimeUp}
              isActive={quizState.isTimerActive && !quizState.showResults}
            />

            {!quizState.showResults ? (
              <>
                <div className="bg-gradient-to-r from-[#e0f2fe] via-[#f0f9ff] to-[#bae6fd] p-6 rounded-2xl shadow">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[#2563eb]">
                      Question {quizState.currentQuestion + 1} of {quizState.mcqs.length}
                    </span>
                    <span className="text-[#0e7490]">
                      {quizState.selectedAnswers.filter(Boolean).length} answered
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold mb-4 text-[#1e88a8]">
                    {quizState.mcqs[quizState.currentQuestion].question}
                  </h2>
                  <div className="space-y-3">
                    {quizState.mcqs[quizState.currentQuestion].options.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleAnswerSelect(option)}
                        className={`w-full text-left p-4 rounded-xl transition-all font-medium text-lg shadow-sm border border-transparent
                          ${quizState.selectedAnswers[quizState.currentQuestion] === option
                            ? 'bg-[#d1fae5] border-[#6ee7b7] text-[#065f46]'
                            : 'bg-white hover:bg-[#e0f2fe] text-[#222]'}
                        `}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleNextQuestion}
                    disabled={!quizState.selectedAnswers[quizState.currentQuestion]}
                    className="py-3 px-6 rounded-2xl font-semibold transition-all duration-200 bg-gradient-to-r from-[#e0f2fe] via-[#bae6fd] to-[#7dd3fc] text-[#2563eb] shadow-md hover:brightness-110 hover:scale-105 flex items-center gap-2 disabled:bg-gray-300 disabled:text-gray-400"
                  >
                    {quizState.currentQuestion === quizState.mcqs.length - 1 ? 'Finish Quiz' : 'Next Question'}
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-[#e0f2fe] via-[#f0f9ff] to-[#bae6fd] p-6 rounded-2xl shadow text-center">
                  <h2 className="text-2xl font-bold mb-2 text-[#1e88a8]">Quiz Complete!</h2>
                  <p className="text-xl text-[#2563eb]">
                    Your score: {quizState.score} out of {quizState.mcqs.length}
                  </p>
                  <p className="text-[#0e7490] mt-2">
                    {Math.round((quizState.score / quizState.mcqs.length) * 100)}% correct
                  </p>
                </div>
                <div className="space-y-4">
                  {quizState.mcqs.map((mcq, index) => (
                    <div key={index} className="bg-gradient-to-r from-[#f0f9ff] via-[#e0f2fe] to-[#bae6fd] p-6 rounded-2xl shadow">
                      <div className="flex items-start gap-2 mb-3">
                        {quizState.selectedAnswers[index] === mcq.correctAnswer ? (
                          <CheckCircle2 className="w-5 h-5 text-yellow-500 mt-1" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500 mt-1" />
                        )}
                        <h3 className="text-lg font-semibold text-[#1e88a8]">{mcq.question}</h3>
                      </div>
                      <div className="space-y-2 ml-7">
                        {mcq.options.map((option, optIndex) => (
                          <div
                            key={optIndex}
                            className={`p-2 rounded-xl font-medium text-base border border-transparent
                              ${option === mcq.correctAnswer
                                ? 'bg-green-100 text-green-700 border-green-200'
                                : option === quizState.selectedAnswers[index]
                                ? 'bg-red-100 text-red-700 border-red-200'
                                : 'bg-white text-[#222]'}
                            `}
                          >
                            {option}
                            {option === mcq.correctAnswer && ' ✓'}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={handleRestart}
                    className="py-3 px-6 rounded-2xl font-semibold transition-all duration-200 bg-gradient-to-r from-[#e0f2fe] via-[#bae6fd] to-[#7dd3fc] text-[#2563eb] shadow-md hover:brightness-110 hover:scale-105 flex items-center gap-2"
                  >
                    Generate New Quiz
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MCQPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MCQPageInner />
    </Suspense>
  );
}
