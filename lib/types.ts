export type Evidence = { pageNumbers: number[]; snippets: string[] };
export type Option = { id: string; text: string; isCorrect?: boolean };
export type QuestionType = "single_choice" | "multiple_choice" | "short_answer";
export type Difficulty = "easy" | "medium" | "hard";

export type Question = {
  id: string;
  type: QuestionType;
  difficulty: Difficulty;
  prompt: string;
  options?: Option[];
  shortAnswerAccepted?: string[];
  explanation?: string;
  source: { pdfName: string; evidence: Evidence };
  topicTags: string[];
};

export type QuizSet = {
  id: string;
  title: string;
  pdfName: string;
  createdAt: string;
  questionCount: number;
  questions: Question[];
  status: "draft" | "published";
};

export type QuizResult = {
  id: string;
  quizId: string;
  takenAt: string;
  durationSec: number;
  answers: Array<{
    questionId: string;
    selectedOptionIds?: string[];
    shortAnswerText?: string;
    isCorrect: boolean;
  }>;
  score: { correct: number; total: number; percent: number };
};

export type PerPageText = { pageNumber: number; text: string };
export type ParsedPdf = {
  pdfName: string;
  pages: PerPageText[];
  headings: string[];
};


