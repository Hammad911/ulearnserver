import React, { useState, useEffect, useCallback } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface QuizTimerProps {
  totalQuestions: number;
  onTimeUp: () => void;
  isActive: boolean;
}

export default function QuizTimer({ totalQuestions, onTimeUp, isActive }: QuizTimerProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isWarning, setIsWarning] = useState(false);

  // Calculate time based on number of questions
  const calculateTime = useCallback((questions: number) => {
    switch (questions) {
      case 5:
        return 5 * 60; // 5 minutes
      case 10:
        return 10 * 60; // 10 minutes
      case 15:
        return 15 * 60; // 15 minutes
      case 20:
        return 20 * 60; // 20 minutes
      default:
        return 5 * 60; // Default 5 minutes
    }
  }, []);

  // Initialize timer when component mounts or questions change
  useEffect(() => {
    if (isActive && totalQuestions > 0) {
      const initialTime = calculateTime(totalQuestions);
      setTimeLeft(initialTime);
      setIsWarning(false);
    }
  }, [totalQuestions, isActive, calculateTime]);

  // Countdown timer
  useEffect(() => {
    if (!isActive || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        const newTime = prevTime - 1;
        
        // Show warning when 2 minutes left
        if (newTime === 120) {
          setIsWarning(true);
        }
        
        // Auto-submit when time is up
        if (newTime <= 0) {
          clearInterval(timer);
          onTimeUp();
          return 0;
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, timeLeft, onTimeUp]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Get progress percentage
  const getProgressPercentage = () => {
    const totalTime = calculateTime(totalQuestions);
    return ((totalTime - timeLeft) / totalTime) * 100;
  };

  // Get color based on time remaining
  const getTimerColor = () => {
    if (timeLeft <= 60) return 'text-red-600'; // Last minute: red
    if (timeLeft <= 180) return 'text-yellow-600'; // Last 3 minutes: yellow
    return 'text-blue-600'; // Normal: blue
  };

  if (!isActive) return null;

  return (
    <div className="bg-white rounded-xl shadow-md p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className={`w-5 h-5 ${getTimerColor()}`} />
          <span className={`text-lg font-semibold ${getTimerColor()}`}>
            {formatTime(timeLeft)}
          </span>
          {isWarning && (
            <div className="flex items-center gap-1 text-yellow-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">Time running out!</span>
            </div>
          )}
        </div>
        <div className="text-sm text-gray-600">
          {totalQuestions} questions 
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-1000 ${
            timeLeft <= 60 ? 'bg-red-500' : 
            timeLeft <= 180 ? 'bg-yellow-500' : 'bg-blue-500'
          }`}
          style={{ width: `${getProgressPercentage()}%` }}
        />
      </div>
      
      {/* Time warning message */}
      {timeLeft <= 60 && (
        <div className="mt-2 text-center">
          <span className="text-red-600 text-sm font-medium">
            Less than 1 minute remaining! Quiz will auto-submit soon.
          </span>
        </div>
      )}
    </div>
  );
} 