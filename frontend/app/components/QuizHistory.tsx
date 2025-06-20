import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';
import { useRouter } from 'next/navigation';

interface Option {
  id: number,
  option_text: string;
  is_correct: boolean;
}

interface Question {
  id: number;
  question_text: string;
  options: Option[];
  selected_option_id: number | null;
}

interface Quiz {
  id: number;
  title: string;
  subject: string;
  topic: string;
  score: number;
  created_at: string;
  questions: Question[];
}

interface QuizHistoryProps {
  userId: string | null;
  subject?: string;
}

export default function QuizHistory({ userId, subject }: QuizHistoryProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedQuiz, setExpandedQuiz] = useState<number | null>(null);

  const fetchQuizHistory = async () => {
    if (!userId) {
      console.log('No userId provided');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/quiz/history?userId=${userId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch quiz history');
      }
      if (data.success && Array.isArray(data.quizzes)) {
        let filtered = data.quizzes;
        if (subject) {
          filtered = filtered.filter((quiz: Quiz) => quiz.subject?.toLowerCase() === subject.toLowerCase());
        }
        setQuizzes(filtered);
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch quiz history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizHistory();
  }, [userId, subject]);

  const toggleQuiz = (quizId: number) => {
    setExpandedQuiz(expandedQuiz === quizId ? null : quizId);
  };

  const formatDate = (dateString: string) => {
    try {
      // Use date-fns-tz to correctly format the UTC time in Pakistan's timezone
      return formatInTimeZone(dateString, 'Asia/Karachi', 'MMMM d, yyyy, h:mm a');
    } catch (error) {
      console.error('Error formatting date:', error);
      // Fallback to a simple date string if formatting fails
      return new Date(dateString).toLocaleString();
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading quiz history...</div>;
  }

  if (error) {
    return <div className="text-red-600 text-center py-4">{error}</div>;
  }

  if (quizzes.length === 0) {
    return <div className="text-center py-4 text-gray-600">No quiz history found</div>;
  }

  return (
    <div className="space-y-4">
      {quizzes.map((quiz) => {
        const total = quiz.questions.length;
        const obtained = quiz.score;
        const percent = total > 0 ? (obtained / total) * 100 : 0;
        let scoreColor = 'text-green-600';
        if (percent < 50) scoreColor = 'text-red-600';
        else if (percent < 70) scoreColor = 'text-yellow-600';
        return (
          <div key={quiz.id} className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div 
              className="p-6 cursor-pointer hover:bg-gray-50 flex justify-between items-center min-h-[90px]"
              onClick={() => toggleQuiz(quiz.id)}
            >
              <div>
                <h3 className="font-bold text-xl text-[#1e88a8]">
                  {quiz.topic || quiz.title}
                </h3>
                <p className="text-base text-gray-600 mt-1">
                  Subject: {quiz.subject}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {formatDate(quiz.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-semibold ${scoreColor}`}>
                  Score: {obtained}/{total}
                </span>
                {expandedQuiz === quiz.id ? (
                  <ChevronUp className="w-6 h-6 text-gray-500" />
                ) : (
                  <ChevronDown className="w-6 h-6 text-gray-500" />
                )}
              </div>
            </div>
            {expandedQuiz === quiz.id && (
              <div className="p-4 border-t space-y-6">
                {quiz.questions.map((question) => (
                  <div key={question.id} className="mb-4">
                    <div className="font-medium text-gray-800 mb-2">
                      {question.question_text}
                    </div>
                    <div className="space-y-2">
                      {question.options.map((option) => {
                        const isCorrect = option.is_correct;
                        const isUserAnswer = question.selected_option_id === option.id;
                        return (
                          <div
                            key={option.id}
                            className={`p-3 rounded-lg flex items-center gap-2 ${
                              isCorrect
                                ? 'bg-green-50 text-green-700'
                                : isUserAnswer
                                ? 'bg-red-50 text-red-700'
                                : 'bg-gray-50 text-gray-700'
                            }`}
                          >
                            {isCorrect ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : isUserAnswer ? (
                              <XCircle className="w-5 h-5 text-red-500" />
                            ) : null}
                            <span>{option.option_text}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
} 