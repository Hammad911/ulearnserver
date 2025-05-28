import { NextResponse } from 'next/server';
import { executeQuery } from '../../../lib/db';

interface Quiz {
  id: number;
  title: string;
  subject: string;
  topic: string;
  score: number;
  created_at: Date;
}

interface QuestionRow {
  id: number;
  question_text: string;
  option_id: number;
  option_text: string;
  is_correct: boolean;
  selected_option_id: number | null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    console.log('userId received:', userId, typeof userId);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required', quizzes: [] },
        { status: 400 }
      );
    }

    // First get the basic quiz information
    const quizQuery = `
      SELECT 
        q.id,
        q.title,
        q.subject,
        q.topic,
        q.score,
        q.created_at
      FROM quizzes q
      WHERE q.user_id = ?
      ORDER BY q.created_at DESC
    `;

    const quizzes = await executeQuery<Quiz[]>(quizQuery, [userId]);
    console.log('quizzes found:', quizzes);

    // For each quiz, get its questions and options
    const quizzesWithDetails = await Promise.all(
      quizzes.map(async (quiz) => {
        const questionsQuery = `
          SELECT 
            q.id,
            q.question_text,
            o.id as option_id,
            o.option_text,
            o.is_correct,
            ua.selected_option_id
          FROM questions q
          LEFT JOIN options o ON q.id = o.question_id
          LEFT JOIN user_answers ua ON q.id = ua.question_id AND ua.user_id = ?
          WHERE q.quiz_id = ?
        `;

        const questionRows = await executeQuery<QuestionRow[]>(questionsQuery, [userId, quiz.id]);
        
        // Group options by question
        const questionsMap = new Map();
        questionRows.forEach(row => {
          if (!questionsMap.has(row.id)) {
            questionsMap.set(row.id, {
              id: row.id,
              question_text: row.question_text,
              options: [],
              selected_option_id: row.selected_option_id
            });
          }
          if (row.option_id) {
            questionsMap.get(row.id).options.push({
              id: row.option_id,
              option_text: row.option_text,
              is_correct: row.is_correct
            });
          }
        });

        return {
          ...quiz,
          questions: Array.from(questionsMap.values())
        };
      })
    );

    return NextResponse.json({ success: true, quizzes: quizzesWithDetails });
  } catch (error) {
    console.error('Error fetching quiz history:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch quiz history', quizzes: [] },
      { status: 500 }
    );
  }
} 