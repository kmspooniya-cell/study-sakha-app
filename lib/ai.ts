import { CURRENT_AFFAIRS, EXAMS, PYQS, RESOURCES, SUBJECTS, TESTS } from './data';
import { ExamId, TestResult, UserNote } from './types';

export type AiContext = {
  name: string;
  exam: ExamId;
  streak: number;
  todayMinutes: number;
  goalMinutes: number;
  results: TestResult[];
  notes: UserNote[];
  starred: string[];
};

export type AiReply = {
  text: string;
  chips: string[];
  intent: string;
  action?: { label: string; route: string; params?: any };
};

const INTENTS: { id: string; keys: string[] }[] = [
  { id: 'greeting', keys: ['hi', 'hello', 'hey', 'namaste', 'good morning', 'good evening', 'kaise ho'] },
  { id: 'capabilities', keys: ['what can you do', 'help', 'features', 'how do you work', 'who are you', 'capabilities'] },
  { id: 'explain', keys: ['explain', 'what is', 'define', 'meaning of', 'tell me about', 'concept', 'how does', 'why does', 'difference between'] },
  { id: 'pyq', keys: ['pyq', 'previous year', 'past paper', 'asked in', 'last year question', 'repeated question'] },
  { id: 'test', keys: ['mock', 'test series', 'give me a test', 'practice test', 'quiz', 'attempt a test', 'live test'] },
  { id: 'performance', keys: ['how am i doing', 'my score', 'performance', 'last test', 'result', 'percentile', 'analysis'] },
  { id: 'weakness', keys: ['weak', 'weakness', 'improve', 'bad at', 'struggling', 'low score in', 'mistakes'] },
  { id: 'plan', keys: ['plan', 'schedule', 'timetable', 'routine', 'strategy', 'how to prepare', 'roadmap', 'revision plan'] },
  { id: 'summary', keys: ['summarise', 'summarize', 'summary', 'short notes', 'tl;dr', 'condense', 'key points'] },
  { id: 'flashcards', keys: ['flashcard', 'flash card', 'revise quickly', 'recall', 'active recall', 'memorise', 'memorize'] },
  { id: 'currentaffairs', keys: ['current affairs', 'news', 'today', 'latest', 'editorial', 'monthly magazine', 'daily digest'] },
  { id: 'motivation', keys: ['motivat', 'demotivated', 'give up', 'tired', 'burnout', 'stress', 'anxious', 'confidence'] },
  { id: 'examinfo', keys: ['syllabus', 'exam pattern', 'eligibility', 'age limit', 'notification', 'negative marking', 'cut off', 'cutoff'] },
  { id: 'streak', keys: ['streak', 'goal', 'how many hours', 'study time', 'progress today', 'target'] },
];

function detect(q: string): string {
  const s = q.toLowerCase();
  let best = 'fallback';
  let bestScore = 0;
  for (const intent of INTENTS) {
    let score = 0;
    for (const k of intent.keys) if (s.includes(k)) score += k.split(' ').length * 2 + 1;
    if (score > bestScore) {
      bestScore = score;
      best = intent.id;
    }
  }
  if (best === 'fallback') {
    const topic = findResource(s);
    if (topic) return 'explain';
    const subj = findSubject(s);
    if (subj) return 'explain';
  }
  return best;
}

function findSubject(s: string) {
  return SUBJECTS.find((sub) => s.includes(sub.name.toLowerCase()) || s.includes(sub.id));
}

function findResource(s: string) {
  const words = s.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3);
  let best: (typeof RESOURCES)[number] | undefined;
  let bestScore = 0;
  for (const r of RESOURCES) {
    const hay = `${r.title} ${r.summary} ${r.tags.join(' ')} ${r.subject} ${r.body.join(' ').slice(0, 900)}`.toLowerCase();
    let score = 0;
    for (const w of words) if (hay.includes(w)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return bestScore >= 2 ? best : undefined;
}

function findPyqs(s: string) {
  const subj = findSubject(s);
  const yearMatch = s.match(/20\d{2}/);
  const exam = EXAMS.find((e) => s.includes(e.short.toLowerCase()) || s.includes(e.id));
  let list = PYQS;
  if (exam) list = list.filter((p) => p.exam === exam.id);
  if (subj) list = list.filter((p) => p.subject.toLowerCase() === subj.name.toLowerCase());
  if (yearMatch) list = list.filter((p) => p.year === Number(yearMatch[0]));
  if (!list.length) list = PYQS.slice(0, 3);
  return list.slice(0, 3);
}

const pct = (n: number) => `${Math.round(n)}%`;

export function askSakha(query: string, ctx: AiContext): AiReply {
  const q = query.trim();
  const s = q.toLowerCase();
  const intent = detect(s);
  const first = ctx.name.split(' ')[0] || 'Aspirant';
  const exam = EXAMS.find((e) => e.id === ctx.exam) ?? EXAMS[0];
  const last = ctx.results[0];

  switch (intent) {
    case 'greeting':
      return {
        intent,
        text: `Namaste ${first} 👋 I am Sakha, your study partner for ${exam.name}.\n\nYou are on a ${ctx.streak}-day streak and have logged ${ctx.todayMinutes} of ${ctx.goalMinutes} minutes today. Ask me to explain a concept, pull previous year questions, analyse your last mock or build a revision plan.`,
        chips: ['Explain Fundamental Rights', 'Show me Polity PYQs', 'How am I doing?', 'Build a 7-day plan'],
      };

    case 'capabilities':
      return {
        intent,
        text: `I work directly on your Study Sakha data, so my answers are grounded in what you actually study.\n\n• Explain concepts using your library notes and books\n• Pull previous year questions by exam, subject, year or difficulty\n• Analyse mock results — accuracy, percentile and subject gaps\n• Build revision plans and recovery plans after a weak test\n• Summarise notes, generate flashcards and practice MCQs\n• Track your streak, daily goal and current affairs digest`,
        chips: ['Summarise my Polity note', 'Recommend a mock test', 'What is in the news today?', 'I need motivation'],
      };

    case 'explain': {
      const res = findResource(s);
      const subj = findSubject(s);
      if (res) {
        const lines = res.body.slice(0, 3).map((b) => `• ${b}`).join('\n\n');
        return {
          intent,
          text: `Here is the core of **${res.title}** from your ${res.subject} library:\n\n${lines}\n\nThis resource runs ${res.pages} pages and takes about ${res.minutes} minutes to revise fully.`,
          chips: [`PYQs on ${res.subject}`, `Make flashcards from this`, `Summarise ${res.subject}`, 'Open the full note'],
          action: { label: res.type === 'book' ? 'Open book' : 'Open note', route: res.type === 'book' ? 'BookReader' : 'NoteEditor', params: { resourceId: res.id } },
        };
      }
      if (subj) {
        const resources = RESOURCES.filter((r) => r.subject === subj.name);
        return {
          intent,
          text: `${subj.name} appears in ${subj.exams.map((e) => e.toUpperCase()).join(', ')}. Your library has ${resources.length} resource(s) on it.\n\n${resources
            .slice(0, 3)
            .map((r) => `• ${r.title} — ${r.summary}`)
            .join('\n')}\n\nAsk me about a specific topic and I will pull the exact lines you need.`,
          chips: [`${subj.name} PYQs`, `${subj.name} revision plan`, 'Open Library'],
          action: { label: 'Open Library', route: 'Library', params: { subject: subj.name } },
        };
      }
      return {
        intent: 'fallback',
        text: `I could not map that to a topic in your library yet. Try naming a syllabus term — for example "explain the monsoon mechanism", "what is inflation targeting" or "explain rotational motion".`,
        chips: ['Explain the monsoon mechanism', 'What is inflation targeting?', 'Explain rotational motion'],
      };
    }

    case 'pyq': {
      const list = findPyqs(s);
      const body = list
        .map((p) => `• ${p.exam.toUpperCase()} ${p.year} (${p.difficulty}) — ${p.question}\n   Answer: ${p.options[p.answer]}`)
        .join('\n\n');
      return {
        intent,
        text: `Pulled ${list.length} previous year question(s) from the PYQ bank:\n\n${body}\n\nOpen the PYQ bank to reveal full explanations and filter by year or difficulty.`,
        chips: ['Open PYQ bank', 'Polity PYQs 2024', 'Hard questions only', 'Explain the answer'],
        action: { label: 'Open PYQ bank', route: 'PYQ', params: { subject: list[0]?.subject } },
      };
    }

    case 'test': {
      const live = TESTS.find((t) => t.kind === 'Live') ?? TESTS[0];
      const forExam = TESTS.filter((t) => t.exam === ctx.exam);
      const pick = forExam[0] ?? live;
      return {
        intent,
        text: `Recommended next attempt: **${pick.title}**.\n\n• ${pick.questions.length} questions • ${pick.durationMin} minutes • +${pick.marksPerQ} per correct, −${pick.negative.toFixed(2)} per wrong\n• Sections: ${pick.sections.map((x) => x.name).join(', ')}\n• ${pick.attempts.toLocaleString('en-IN')} aspirants have attempted it\n\n${live.liveAt ? `A live test (${live.title}) is scheduled for ${live.liveAt}.` : ''}`,
        chips: ['Start this test', 'Show all tests', 'How is percentile calculated?'],
        action: { label: 'Start test', route: 'TestPlayer', params: { testId: pick.id } },
      };
    }

    case 'performance': {
      if (!last) {
        return {
          intent,
          text: `You have not attempted a mock on Study Sakha yet, so I cannot analyse accuracy or percentile.\n\nAttempt any mock and I will break it down by subject, flag your weak areas and build a recovery plan within seconds.`,
          chips: ['Recommend a test', 'Build a study plan', 'Show PYQs instead'],
          action: { label: 'Browse tests', route: 'Tests' },
        };
      }
      const worst = [...last.bySubject].sort((a, b) => a.correct / a.total - b.correct / b.total)[0];
      return {
        intent,
        text: `Your last attempt — **${last.title}**\n\n• Score ${last.score.toFixed(2)} / ${last.maxScore}\n• Accuracy ${pct(last.accuracy)} · ${last.correct} correct, ${last.wrong} wrong, ${last.skipped} skipped\n• Percentile ${last.percentile.toFixed(1)} (rank ${last.rank.toLocaleString('en-IN')} of ${last.totalAspirants.toLocaleString('en-IN')})\n• Weakest section: ${worst.subject} at ${pct((worst.correct / worst.total) * 100)}\n\n${last.skipped > last.correct ? 'You are leaving too many questions untouched — attempt rate is hurting your score more than accuracy.' : 'Your attempt rate is healthy; focus now on converting wrong answers.'}`,
        chips: [`Fix my ${worst.subject}`, 'Build a recovery plan', 'Show the result screen', 'Recommend next test'],
        action: { label: 'Open result', route: 'TestResult', params: { resultId: last.id } },
      };
    }

    case 'weakness': {
      const subj = findSubject(s);
      const target = subj?.name ?? (last ? [...last.bySubject].sort((a, b) => a.correct / a.total - b.correct / b.total)[0].subject : 'Polity');
      const res = RESOURCES.filter((r) => r.subject === target);
      const pyqs = PYQS.filter((p) => p.subject === target);
      return {
        intent,
        text: `Fix plan for **${target}**\n\n1. Revise the fundamentals: ${res[0]?.title ?? 'your core note'} (${res[0]?.minutes ?? 20} min).\n2. Solve ${Math.max(pyqs.length, 10)} PYQs on ${target} and log every mistake in your Error Log note.\n3. Re-attempt a sectional test after 48 hours — target accuracy above 75%.\n4. On day 7, write a one-page recall sheet from memory without opening the note.\n\nMost aspirants lose ${target} marks to silent-revision decay, not to difficulty. Spaced recall fixes it.`,
        chips: [`${target} PYQs`, `Open ${target} notes`, 'Build a 7-day plan'],
        action: { label: `Practise ${target}`, route: 'PYQ', params: { subject: target } },
      };
    }

    case 'plan': {
      const weak = last ? [...last.bySubject].sort((a, b) => a.correct / a.total - b.correct / b.total)[0].subject : 'Polity';
      return {
        intent,
        text: `A 7-day plan for ${exam.short}, tuned to your ${ctx.goalMinutes}-minute daily goal:\n\n• Day 1 — ${weak} concept rebuild (60 min) + 20 PYQs (40 min)\n• Day 2 — Current affairs week recap (45 min) + sectional test (30 min)\n• Day 3 — Second-weakest subject deep revision + flashcards\n• Day 4 — Full-length mock in exam slot timing, no pauses\n• Day 5 — Mock analysis, error log, re-solve every wrong question\n• Day 6 — Static revision sprint using starred notes (${ctx.starred.length} starred)\n• Day 7 — Mixed quiz + rest. Protect sleep; retention collapses below 6 hours.\n\nKeep 20% of every session for active recall rather than fresh reading.`,
        chips: ['Start day 1 now', 'Recommend a mock', `Fix my ${weak}`, 'Show today plan'],
        action: { label: 'Open dashboard plan', route: 'Dashboard' },
      };
    }

    case 'summary': {
      const res = findResource(s);
      const note = ctx.notes.find((n) => s.includes(n.title.toLowerCase().split(' ')[0])) ?? ctx.notes[0];
      if (res) {
        return {
          intent,
          text: `**${res.title}** in 5 lines:\n\n${res.body
            .slice(0, 5)
            .map((b, i) => `${i + 1}. ${b.split('. ')[0]}.`)
            .join('\n')}\n\nRevision estimate: ${res.minutes} minutes. Tags: ${res.tags.join(', ')}.`,
          chips: ['Make flashcards', 'Generate 5 MCQs', 'Open the note'],
          action: { label: 'Open note', route: 'NoteEditor', params: { resourceId: res.id } },
        };
      }
      if (note) {
        const sentences = note.body.split(/\n+/).filter(Boolean).slice(0, 4);
        return {
          intent,
          text: `Summary of your note **${note.title}**:\n\n${sentences.map((x, i) => `${i + 1}. ${x.split('.')[0]}.`).join('\n')}\n\nTags: ${note.tags.join(', ')}. Last edited ${new Date(note.updatedAt).toLocaleDateString('en-IN')}.`,
          chips: ['Make flashcards from it', 'Generate MCQs', 'Open note editor'],
          action: { label: 'Open note', route: 'NoteEditor', params: { noteId: note.id } },
        };
      }
      return { intent, text: 'Tell me which note or topic to summarise and I will compress it into five recall lines.', chips: ['Summarise Polity note', 'Summarise Economy note'] };
    }

    case 'flashcards': {
      const res = findResource(s) ?? RESOURCES[0];
      const cards = res.body.slice(0, 3).map((b, i) => {
        const parts = b.split(/[:.]/);
        return `Card ${i + 1}\n  Front: ${parts[0].slice(0, 90)}?\n  Back: ${(parts[1] ?? b).trim().slice(0, 140)}`;
      });
      return {
        intent,
        text: `Generated ${cards.length} flashcards from **${res.title}**:\n\n${cards.join('\n\n')}\n\nOpen the note editor to save these into your deck and shuffle them daily.`,
        chips: ['Save to my notes', 'Generate MCQs instead', 'Another topic'],
        action: { label: 'Open note editor', route: 'NoteEditor', params: { resourceId: res.id } },
      };
    }

    case 'currentaffairs': {
      const items = CURRENT_AFFAIRS.filter((c) => c.exams.includes(ctx.exam)).slice(0, 3);
      const list = items.length ? items : CURRENT_AFFAIRS.slice(0, 3);
      return {
        intent,
        text: `Top current affairs for ${exam.short} aspirants:\n\n${list
          .map((c) => `• ${c.title} (${c.date})\n   ${c.summary}`)
          .join('\n\n')}\n\nEach item has prelims-ready bullet points in the Current Affairs section.`,
        chips: ['Open current affairs', 'Quiz me on this week', 'Economy news only'],
        action: { label: 'Open current affairs', route: 'CurrentAffairs' },
      };
    }

    case 'motivation': {
      const lines = [
        `${first}, a ${ctx.streak}-day streak is not luck — it is compounding. Most aspirants quit in week three; you are past that.`,
        'Selection is not won on your best day. It is won on the average of your ordinary days.',
        'Lower the bar for today, not the standard for the year. Twenty focused minutes still protects the streak.',
      ];
      return {
        intent,
        text: `${lines[Math.floor(Math.random() * lines.length)]}\n\nIf today feels heavy, do the smallest honest unit of work: ten PYQs. Momentum is restored by motion, not by mood.\n\nYou have ${ctx.todayMinutes} minutes logged today against a ${ctx.goalMinutes}-minute goal.`,
        chips: ['Give me 10 quick PYQs', 'Build a lighter plan', 'Show my progress'],
        action: { label: 'Quick PYQ practice', route: 'PYQ' },
      };
    }

    case 'examinfo': {
      const target = EXAMS.find((e) => s.includes(e.short.toLowerCase()) || s.includes(e.id)) ?? exam;
      const t = TESTS.find((x) => x.exam === target.id) ?? TESTS[0];
      return {
        intent,
        text: `**${target.name}** essentials\n\n• Active aspirants on Study Sakha: ${target.aspirants}\n• Mock pattern used here: ${t.questions.length} questions, ${t.durationMin} minutes\n• Marking: +${t.marksPerQ} correct, −${t.negative.toFixed(2)} wrong (${t.negative === 1 / 3 ? 'one-third negative marking' : 'standard negative marking'})\n• Sections covered: ${t.sections.map((x) => `${x.name} (${x.count})`).join(', ')}\n• Library coverage: ${RESOURCES.filter((r) => r.exam === target.id).length} resources, ${PYQS.filter((p) => p.exam === target.id).length} PYQs\n\nNegative marking means a blind guess has negative expected value unless you can eliminate at least two options.`,
        chips: ['Show the test series', 'Open library', 'PYQ trend analysis'],
        action: { label: 'Open test series', route: 'Tests' },
      };
    }

    case 'streak': {
      const remaining = Math.max(0, ctx.goalMinutes - ctx.todayMinutes);
      return {
        intent,
        text: `Streak: **${ctx.streak} days**.\nToday: ${ctx.todayMinutes} / ${ctx.goalMinutes} minutes (${pct((ctx.todayMinutes / ctx.goalMinutes) * 100)} of goal).\n\n${remaining > 0 ? `${remaining} minutes left to close today's ring. One sectional test plus one note revision usually covers it.` : 'Goal complete for today. Anything extra is a bonus deposit into revision.'}\n\nNotes saved: ${ctx.notes.length} · Starred resources: ${ctx.starred.length} · Mocks attempted: ${ctx.results.length}`,
        chips: ['Recommend a quick test', 'Show weekly activity', 'Adjust my daily goal'],
        action: { label: 'Open profile', route: 'Profile' },
      };
    }

    default: {
      const pyqs = findPyqs(s);
      return {
        intent: 'fallback',
        text: `I did not catch a clear intent there, but here is something close from the bank:\n\n• ${pyqs[0].question}\n   Answer: ${pyqs[0].options[pyqs[0].answer]}\n\nTry asking me to explain a topic, pull PYQs, analyse your last mock, or build a revision plan.`,
        chips: ['What can you do?', 'Explain Fundamental Rights', 'Analyse my last mock', 'Current affairs today'],
      };
    }
  }
}

export const STARTER_PROMPTS = [
  'Explain the monsoon mechanism',
  'Show me Polity PYQs from 2024',
  'How am I doing in mocks?',
  'Build me a 7-day revision plan',
  'Summarise my Polity note',
  'What is in the news today?',
];
