import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'Hammads-MacBook-Air.local',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ulearn',
};

interface QuizRow extends RowDataPacket {
  id: number;
  title: string;
  subject: string;
  topic: string;
  score: number;
  created_at: Date;
}

interface QuestionRow extends RowDataPacket {
  id: number;
  question_text: string;
}

interface OptionRow extends RowDataPacket {
  id: number;
  option_text: string;
  is_correct: boolean;
}

interface UserAnswerRow extends RowDataPacket {
  selected_option_id: number;
}

export async function GET(req: Request) {
  try {
    // Get user ID from request headers
    const userId = req.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    // Create database connection
    const connection = await mysql.createConnection(dbConfig);

    try {
      // Get all quizzes for the user
      const [quizzes] = await connection.execute<QuizRow[]>(
        'SELECT * FROM quizzes WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );

      // For each quiz, get questions, options, and user answers
      const quizHistory = [];
      for (const quiz of quizzes) {
        const [questions] = await connection.execute<QuestionRow[]>(
          'SELECT * FROM questions WHERE quiz_id = ?',
          [quiz.id]
        );

        const questionsWithDetails = [];
        for (const question of questions) {
          const [options] = await connection.execute<OptionRow[]>(
            'SELECT id, option_text, is_correct FROM options WHERE question_id = ?',
            [question.id]
          );
          const [userAnswer] = await connection.execute<UserAnswerRow[]>(
            'SELECT selected_option_id FROM user_answers WHERE question_id = ? AND user_id = ?',
            [question.id, userId]
          );
          const selectedOptionId = userAnswer[0]?.selected_option_id || null;
          questionsWithDetails.push({
            id: question.id,
            question_text: question.question_text,
            options,
            selected_option_id: selectedOptionId,
          });
        }

        quizHistory.push({
          id: quiz.id,
          title: quiz.title,
          subject: quiz.subject,
          topic: quiz.topic,
          score: quiz.score,
          created_at: quiz.created_at,
          questions: questionsWithDetails,
        });
      }

      return NextResponse.json({ success: true, quizzes: quizHistory });
    } finally {
      // Close connection
      await connection.end();
    }
  } catch (error) {
    console.error('Error fetching quiz history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quiz history' },
      { status: 500 }
    );
  }
} 