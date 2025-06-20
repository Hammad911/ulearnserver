import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || '',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ulearn',
  port: Number(process.env.DB_PORT) || 22473,
};

interface QuizResult extends ResultSetHeader {
  insertId: number;
}

interface QuestionResult extends ResultSetHeader {
  insertId: number;
}

interface OptionResult extends ResultSetHeader {
  insertId: number;
}

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

export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }
    const body = await req.json();
    const { subject, topic, title, questions, score, email } = body;

    const connection = await mysql.createConnection(dbConfig);
    try {
      // Insert or update user
      await connection.execute(
        'INSERT INTO users (id, username) VALUES (?, ?) ON DUPLICATE KEY UPDATE username = VALUES(username)',
        [userId, email]
      );

      // Insert quiz
      const [quizResult] = await connection.execute<QuizResult>(
        'INSERT INTO quizzes (user_id, title, subject, topic, score) VALUES (?, ?, ?, ?, ?)',
        [userId, title || '', subject, topic, score]
      );
      const quizId = quizResult.insertId;

      for (const q of questions) {
        // Insert question
        const [questionResult] = await connection.execute<QuestionResult>(
          'INSERT INTO questions (quiz_id, question_text) VALUES (?, ?)',
          [quizId, q.question_text]
        );
        const questionId = questionResult.insertId;

        // Insert options
        let selectedOptionId = null;
        for (const opt of q.options) {
          const [optionResult] = await connection.execute<OptionResult>(
            'INSERT INTO options (question_id, option_text, is_correct) VALUES (?, ?, ?)',
            [questionId, opt.option_text, !!opt.is_correct]
          );
          const optionId = optionResult.insertId;
          // Find the selected option for user_answer
          if (q.user_answer && opt.option_text === q.user_answer) {
            selectedOptionId = optionId;
          }
        }
        // Insert user answer
        if (selectedOptionId) {
          await connection.execute(
            'INSERT INTO user_answers (question_id, user_id, selected_option_id) VALUES (?, ?, ?)',
            [questionId, userId, selectedOptionId]
          );
        }
      }
      return NextResponse.json({ success: true });
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Error saving quiz:', error);
    return NextResponse.json(
      { error: 'Failed to save quiz' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
    }

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
      await connection.end();
    }
  } catch (error) {
    console.error('Error fetching quiz history:', error);
    return NextResponse.json({ error: 'Failed to fetch quiz history' }, { status: 500 });
  }
} 