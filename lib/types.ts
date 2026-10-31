export type ExamId = 'upsc' | 'ssc' | 'banking' | 'neet' | 'jee';

export type Exam = { id: ExamId; name: string; short: string; color: string; aspirants: string };

export type Subject = { id: string; name: string; exams: ExamId[]; icon: string; color: string };

export type Resource = {
  id: string;
  type: 'note' | 'book' | 'pyq-set';
  title: string;
  subject: string;
  exam: ExamId;
  author: string;
  pages: number;
  minutes: number;
  rating: number;
  downloads: number;
  tags: string[];
  summary: string;
  folder: string;
  body: string[];
  cover: string;
  toc?: string[];
  updated: string;
};

export type PYQ = {
  id: string;
  exam: ExamId;
  year: number;
  subject: string;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  paper: string;
};

export type TestQuestion = {
  id: string;
  section: string;
  subject: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
};

export type MockTest = {
  id: string;
  title: string;
  exam: ExamId;
  kind: 'Full Mock' | 'Sectional' | 'Daily Quiz' | 'Live';
  durationMin: number;
  marksPerQ: number;
  negative: number;
  attempts: number;
  liveAt?: string;
  sections: { name: string; count: number }[];
  questions: TestQuestion[];
};

export type TestResult = {
  id: string;
  testId: string;
  title: string;
  exam: ExamId;
  takenAt: number;
  score: number;
  maxScore: number;
  correct: number;
  wrong: number;
  skipped: number;
  accuracy: number;
  percentile: number;
  rank: number;
  totalAspirants: number;
  timeTakenSec: number;
  bySubject: { subject: string; correct: number; total: number }[];
  answers: Record<string, number | null>;
};

export type UserNote = {
  id: string;
  title: string;
  folder: string;
  tags: string[];
  body: string;
  exam: ExamId;
  subject: string;
  updatedAt: number;
  flashcards?: { front: string; back: string }[];
  quiz?: { q: string; options: string[]; answer: number }[];
  aiSummary?: string;
};

export type SourceRef = {
  id: string;
  title: string;
  type: 'Book' | 'Note' | 'PYQ' | 'Test';
  section?: string;
  pages?: number;
  route: string;
  params?: any;
};

export type ChatMsg = {
  id: string;
  role: 'user' | 'sakha';
  text: string;
  at: number;
  chips?: string[];
  action?: { label: string; route: string; params?: any };
  sources?: SourceRef[];
  intent?: string;
  status?: 'sending' | 'sent' | 'error';
  error?: string;
  modelUsed?: string;
  retryText?: string;
};

export type CurrentAffair = {
  id: string;
  title: string;
  date: string;
  category: string;
  summary: string;
  points: string[];
  exams: ExamId[];
  readMinutes: number;
};

export type Learner = {
  id: string;
  name: string;
  email: string;
  exam: ExamId;
  joined: string;
  streak: number;
  tests: number;
  avgScore: number;
  plan: 'Free' | 'Pro' | 'Elite';
  status: 'active' | 'suspended';
};

export type PendingContent = {
  id: string;
  title: string;
  type: 'Note' | 'Book' | 'PYQ Set' | 'Mock Test';
  author: string;
  exam: ExamId;
  submitted: string;
  status: 'pending' | 'approved' | 'rejected';
};

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  at: number;
  kind: 'test' | 'content' | 'streak' | 'announcement';
  read: boolean;
};
