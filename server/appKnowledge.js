// Canonical knowledge catalog for the Study Sakha application
// This reflects the exact structure, screens, and content available in the app.

const APP_INFO = {
  name: 'Study Sakha',
  tagline: 'Your personal AI study partner & exam prep platform',
  version: '1.0.0',
};

const EXAMS_SUPPORTED = [
  { id: 'upsc', name: 'UPSC Civil Services' },
  { id: 'ssc', name: 'SSC CGL & CHSL' },
  { id: 'banking', name: 'Banking (IBPS & SBI)' },
  { id: 'neet', name: 'NEET UG' },
  { id: 'jee', name: 'JEE Main & Advanced' },
  { id: 'ras', name: 'RAS / RPSC' },
  { id: 'rssb', name: 'RSSB (Rajasthan Staff Selection Board)' },
  { id: 'state_pcs', name: 'State PCS / Civil Services' },
];

// Compact product documentation used for query-time retrieval. Statuses describe
// repository behavior, not marketing availability.
const FEATURE_REGISTRY = [
  { id: 'dashboard', name: 'Dashboard', route: 'DashboardRoot', path: 'Main navigation → Dashboard', keywords: ['dashboard', 'home screen', 'home', 'डैशबोर्ड'], description: 'Review study summary and launch Study Planner, Focus Center, Library, Alarm and other registered tools.', dataSources: ['StoreProvider studyLog', 'planner tasks', 'focus session state', 'test results'], relatedModules: ['screens/DashboardScreen.tsx', 'components/Shell.tsx', 'lib/store.tsx'], settings: [], actions: ['Open Study Planner', 'Open Focus Center', 'Open Alarm', 'Open Library'], platforms: ['Android', 'iOS', 'Web'], permissions: [], status: 'implemented', limitations: 'Quick actions depend on the current dashboard layout.' },
  { id: 'planner', name: 'Study Planner', route: 'StudyPlanner', path: 'More navigation group → Study Planner', keywords: ['planner', 'schedule', 'tasks', 'study plan', 'timetable', 'प्लानर', 'समय सारणी'], description: 'Create and edit schedule entries and study tasks, set dates, recurrence, priorities, and mark work complete.', dataSources: ['StoreProvider plannerTasks', 'plannerScheduleItems', 'plannerCompletions', 'plannerSettings'], relatedModules: ['screens/StudyPlannerScreen.tsx', 'lib/planner.ts', 'lib/store.tsx'], settings: ['Default task duration', 'Recurring tasks', 'Automatic carry-forward', 'AI suggestions'], actions: ['Add or edit schedule entry', 'Mark task complete', 'Review daily and calendar views', 'Open Task Performance'], platforms: ['Android', 'iOS', 'Web'], permissions: [], status: 'implemented', limitations: 'No external calendar sync is documented.' },
  { id: 'focus', name: 'Focus sessions', route: 'FocusCenter', path: 'Dashboard → Start focus session (or Study Planner → Focus)', keywords: ['focus', 'timer', 'pomodoro', 'meditation', 'break', 'फोकस', 'ध्यान'], description: 'Start timer, stopwatch, Pomodoro, meditation, and break sessions; completion and study time are recorded.', dataSources: ['StoreProvider studyLog', 'focusHistory', 'active focus session state'], relatedModules: ['screens/FocusCenterScreen.tsx', 'lib/focusSession.tsx', 'lib/focusHistory.ts'], settings: ['Focus duration', 'Session mode', 'Music selection'], actions: ['Start or complete a session', 'Pause or resume', 'Open completion summary'], platforms: ['Android', 'iOS', 'Web'], permissions: ['Android audio playback uses audio settings; no microphone permission is requested'], status: 'implemented', limitations: 'Session options depend on the selected mode.' },
  { id: 'focus-lock', name: 'Focus Lock', route: 'FocusLock', path: 'Dashboard → Focus Lock card', keywords: ['focus lock', 'block apps', 'accessibility', 'lock', 'ऐप ब्लॉक'], description: 'Configure a focus lock session and manage app blocking through Android accessibility integration.', dataSources: ['native Focus Lock preferences'], relatedModules: ['screens/FocusLockScreen.tsx', 'native/focus-lock/android/', 'plugins/withFocusLock.js'], settings: ['Blocked applications', 'Lock session controls'], actions: ['Open Focus Lock', 'Configure or start a lock session'], platforms: ['Android only for app blocking'], permissions: ['User must enable the Focus Lock accessibility service in Android Settings'], status: 'partially implemented', limitations: 'Android requires the user to enable the accessibility service; iOS and web cannot block other apps.' },
  { id: 'groups', name: 'Study Groups and Study Hall', route: 'Groups', path: 'Study navigation group → Groups → select a group → Study Hall', keywords: ['group', 'study hall', 'join group', 'study room', 'groups', 'ग्रुप', 'स्टडी हॉल'], description: 'Browse and join study groups, open a group room, participate in supported room activities, and return to Focus Center.', settings: ['Room-specific controls where shown'], actions: ['Browse or join a group', 'Enter Study Hall', 'Return to Focus Center'], platforms: ['Android', 'iOS', 'Web'], permissions: [], status: 'partially implemented', limitations: 'Room features include local/demo flows; the Plus badge is not evidence of paid entitlement, billing, live video, or real-time collaboration.' },
  { id: 'library', name: 'Library, Books, Notes and PYQs', route: 'Library', path: 'Study navigation group → Library → Books / Notes / PYQ Sets / Starred / Downloads', keywords: ['library', 'books', 'notes', 'pyq', 'previous year', 'पुस्तक', 'नोट्स', 'प्रश्न'], description: 'Browse the in-app catalog, open book readers and notes, solve PYQs, and view starred resources.', settings: [], actions: ['Browse books and notes', 'Open PYQ bank', 'Star resources', 'Open available downloads'], platforms: ['Android', 'iOS', 'Web'], permissions: [], status: 'implemented', limitations: 'Only resources shown in the current catalog are available; do not claim arbitrary external PDFs or a complete exam archive.' },
  { id: 'tests', name: 'Tests and quizzes', route: 'Tests', path: 'Study navigation group → Test Series', keywords: ['test', 'quiz', 'mock', 'results', 'टेस्ट', 'क्विज'], description: 'Choose an available mock or quiz, take it in the test player, and review saved results.', settings: [], actions: ['Choose an available test', 'Submit answers', 'Review saved result'], platforms: ['Android', 'iOS', 'Web'], permissions: [], status: 'implemented', limitations: 'Only listed in-app tests can be launched.' },
  { id: 'analytics', name: 'Focus Analytics and Statistics', route: 'Statistics', path: 'Study navigation group → Statistics', keywords: ['analytics', 'statistics', 'study hours', 'progress', 'focus analytics', 'आंकड़े'], description: 'Review recorded study time, activity trends, subject progress, and available test performance.', dataSources: ['StoreProvider studyLog', 'focusHistory', 'test results', 'planner completions'], relatedModules: ['screens/StatisticsScreen.tsx', 'lib/statistics.ts', 'lib/store.tsx'], actions: ['View Study Statistics', 'Open Task Performance'], status: 'implemented', limitations: 'Charts reflect data recorded in the app and are not external rankings.' },
  { id: 'task-performance', name: 'Task Performance', route: 'TaskPerformance', path: 'Statistics → Task Performance', keywords: ['task performance', 'productivity', 'completed tasks', 'planner analytics'], description: 'Review completion and productivity evidence from recorded planner tasks.', dataSources: ['plannerTasks', 'plannerCompletions', 'plannerTaskStudySeconds'], relatedModules: ['screens/TaskPerformanceScreen.tsx', 'lib/store.tsx'], actions: ['Open Task Performance'], platforms: ['Android', 'iOS', 'Web'], permissions: [], status: 'implemented', limitations: 'Only tasks recorded in Study Sakha are included.' },
  { id: 'alarm', name: 'Alarm and reminders', route: 'Alarm', path: 'Dashboard → Alarm', keywords: ['alarm', 'reminder', 'wake up', 'alert', 'अलार्म', 'रिमाइंडर'], description: 'Create and manage study alarms and reminders available in the app.', dataSources: ['Alarm module local storage'], relatedModules: ['screens/StudySakhaAlarmScreen.tsx', 'src/modules/alarm/StudySakhaAlarmModule.tsx'], actions: ['Open Alarm'], platforms: ['Android', 'iOS', 'Web'], permissions: ['Notifications may be required for system delivery'], status: 'implemented', limitations: 'Delivery depends on OS permissions and platform scheduling support.' },
  { id: 'ai', name: 'Sakha AI', route: 'SakhaAI', path: 'Intelligence navigation group or mobile bottom tab → Sakha AI', keywords: ['sakha ai', 'ai', 'assistant', 'gemini', 'सखा एआई'], description: 'Ask study questions, request explanations, analyze authorized study data, and get help navigating documented app features.', dataSources: ['authenticated StoreProvider context', 'verified app registry', 'Gemini backend'], relatedModules: ['screens/SakhaAIScreen.tsx', 'lib/geminiChat.ts', 'server/gemini.js'], actions: ['Ask a study question', 'Open a documented feature'], platforms: ['Android', 'iOS', 'Web'], permissions: ['Authenticated Supabase session'], status: 'implemented', limitations: 'Requires an authenticated account and a reachable configured backend; answers may be unavailable during service outages.' },
  { id: 'profile-settings', name: 'Profile and Settings', route: 'Profile', path: 'Account navigation group → Profile / Settings', keywords: ['profile', 'settings', 'theme', 'notifications', 'permissions', 'प्रोफाइल', 'सेटिंग'], description: 'Edit profile details and review app preferences such as theme, language, and notification controls.', status: 'implemented', limitations: 'Android notifications require notification permission; Focus Lock additionally requires its accessibility service to be enabled in Android Settings.' },
  { id: 'admin', name: 'Admin tools', route: 'Admin', path: 'Account navigation group → Admin Portal (authorized accounts)', keywords: ['admin', 'manage content', 'administrator'], description: 'Authorized admin accounts can manage supported app content.', status: 'partially implemented', limitations: 'Visible only to accounts with the admin role; do not tell ordinary users they can access it.' },
  { id: 'notifications', name: 'Notifications', route: 'Notifications', path: 'Intelligence navigation group → Notifications', keywords: ['notifications', 'alerts', 'bell', 'सूचनाएं'], description: 'Review in-app notifications and available study alerts.', settings: ['Notification preferences in Settings'], actions: ['Open notification list'], platforms: ['Android', 'iOS', 'Web'], permissions: ['Android notification permission is required for system notifications'], status: 'implemented', limitations: 'System notification delivery depends on OS permission and app notification settings.' },
  { id: 'search', name: 'Search', route: 'Search', path: 'Intelligence navigation group → Search', keywords: ['search', 'find resource', 'खोज'], description: 'Search available in-app study resources.', settings: [], actions: ['Search catalog content'], platforms: ['Android', 'iOS', 'Web'], permissions: [], status: 'implemented', limitations: 'Search results are limited to content present in the app.' },
  { id: 'downloads', name: 'Downloads and bookmarks', route: 'LibraryDownloads', path: 'Library → Downloads / Starred', keywords: ['downloads', 'offline', 'bookmarks', 'starred', 'save resource', 'ऑफलाइन', 'बुकमार्क'], description: 'Open resources saved for offline access and resources marked for quick return.', dataSources: ['resourceDownloads', 'starredIds', 'bookmarks'], relatedModules: ['screens/LibraryDownloadsScreen.tsx', 'lib/resourceDownloads.ts'], actions: ['Open Offline Downloads', 'Open Starred Resources'], platforms: ['Android', 'iOS', 'Web'], permissions: ['Storage or media access may be requested when saving files'], status: 'implemented', limitations: 'Only resources explicitly saved in the app are available offline.' },
];

function retrieveAppKnowledge(query, limit = 4) {
  const normalized = String(query || '').toLowerCase();
  const terms = (normalized.match(/[a-z0-9]+|[\u0900-\u097f]+/g) || []).filter((term) => !['book', 'books', 'note', 'notes', 'test', 'tests', 'pyq', 'resource', 'set', 'the', 'and', 'for', 'is', 'are', 'available', 'where', 'how', 'does', 'do'].includes(term));
  const ranked = FEATURE_REGISTRY.map((feature) => {
    const corpus = [feature.name, feature.description, feature.path, ...feature.keywords].join(' ').toLowerCase();
    const score = feature.keywords.reduce((total, keyword) => {
      const lowered = keyword.toLowerCase();
      const matches = /^[a-z0-9]+$/.test(lowered)
        ? new RegExp(`\\b${lowered}\\b`).test(normalized)
        : normalized.includes(lowered);
      return total + (matches ? 3 : 0);
    }, 0)
      + terms.reduce((total, term) => total + (term.length > 2 && corpus.includes(term) ? 1 : 0), 0);
    return { feature, score };
  }).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
  return ranked.map(({ feature }) => ({
    name: feature.name,
    path: feature.path,
    route: feature.route,
    description: feature.description,
    status: feature.status,
    limitations: feature.limitations,
    dataSources: feature.dataSources || [],
    relatedModules: feature.relatedModules || [],
    settings: feature.settings || [],
    actions: feature.actions || [],
    platforms: feature.platforms || ['Android', 'iOS', 'Web'],
    permissions: feature.permissions || [],
  }));
}

function retrieveStudyResources(query, limit = 3) {
  const normalized = String(query || '').toLowerCase();
  const terms = (normalized.match(/[a-z0-9]+|[\u0900-\u097f]+/g) || []).filter((term) => !['book', 'books', 'note', 'notes', 'test', 'tests', 'pyq', 'resource', 'set', 'the', 'and', 'for', 'is', 'are', 'available', 'where', 'how', 'does', 'do'].includes(term));
  return Object.values(RESOURCE_REGISTRY)
    .map((resource) => {
      const corpus = `${resource.id} ${resource.title} ${resource.type} ${resource.subject || ''} ${resource.exam || ''} ${resource.section || ''}`.toLowerCase();
      const score = terms.reduce((total, term) => total + (term.length > 2 && corpus.includes(term) ? 1 : 0), 0);
      return { resource, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ resource }) => ({
      id: resource.id,
      title: resource.title,
      type: resource.type,
      subject: resource.subject,
      exam: resource.exam,
      section: resource.section,
      route: resource.route,
      params: resource.params,
    }));
}

const RESOURCE_REGISTRY = {
  r1: { id: 'r1', title: 'Fundamental Rights — Articles 12 to 35', type: 'Note', subject: 'Polity', exam: 'upsc', pages: 18, section: 'Articles 12–35', route: 'NoteEditor', params: { resourceId: 'r1' } },
  r2: { id: 'r2', title: 'Indian Monsoon — Mechanism & Variability', type: 'Note', subject: 'Geography', exam: 'upsc', pages: 14, section: 'Climatology & ITCZ', route: 'NoteEditor', params: { resourceId: 'r2' } },
  r3: { id: 'r3', title: 'Monetary Policy & Inflation Targeting', type: 'Note', subject: 'Economy', exam: 'banking', pages: 12, section: 'RBI & Inflation Targeting', route: 'NoteEditor', params: { resourceId: 'r3' } },
  r4: { id: 'r4', title: 'Time, Speed & Distance — 30 Shortcut Patterns', type: 'Note', subject: 'Quantitative Aptitude', exam: 'ssc', pages: 9, section: 'TSD Patterns', route: 'NoteEditor', params: { resourceId: 'r4' } },
  r5: { id: 'r5', title: 'Modern Indian History — Spectrum Companion', type: 'Book', subject: 'History', exam: 'upsc', pages: 412, section: '1857 to Independence', route: 'BookReader', params: { resourceId: 'r5' }, chapters: ['Advent of the Europeans', 'Expansion of British Power', 'Revolt of 1857', 'Socio-Religious Reform Movements', 'Rise of Indian Nationalism', 'Moderates and Extremists', 'Gandhian Era 1919–1939', 'Quit India to Independence', 'Integration of Princely States'] },
  r6: { id: 'r6', title: 'NCERT Distilled — Class 11 & 12 Biology', type: 'Book', subject: 'Biology', exam: 'neet', pages: 368, section: 'Class 11 & 12 NCERT', route: 'BookReader', params: { resourceId: 'r6' }, chapters: ['The Living World', 'Cell: Unit of Life', 'Plant Physiology', 'Human Physiology', 'Genetics and Evolution', 'Biology in Human Welfare', 'Biotechnology', 'Ecology'] },
  r7: { id: 'r7', title: 'Reasoning Mastery — Puzzles & Seating', type: 'Book', subject: 'Reasoning', exam: 'banking', pages: 286, section: 'Puzzles & Seating', route: 'BookReader', params: { resourceId: 'r7' }, chapters: ['Linear Arrangement', 'Circular Arrangement', 'Floor Puzzles', 'Box Puzzles', 'Scheduling', 'Blood Relations', 'Syllogism', 'Data Sufficiency'] },
  r8: { id: 'r8', title: 'Environment: Conventions, Protocols & Reports', type: 'Note', subject: 'Environment', exam: 'upsc', pages: 11, section: 'Climate & Conventions', route: 'NoteEditor', params: { resourceId: 'r8' } },
  r9: { id: 'r9', title: 'Rotational Motion — Formula Sheet & Traps', type: 'Note', subject: 'Physics', exam: 'jee', pages: 8, section: 'Mechanics & MOI', route: 'NoteEditor', params: { resourceId: 'r9' } },
  r10: { id: 'r10', title: 'UPSC Prelims GS Paper-I — Decadal PYQ Set', type: 'PYQ', subject: 'Polity', exam: 'upsc', pages: 64, section: 'Decadal Solved PYQs', route: 'PYQ', params: { subject: 'Polity' } },
  r11: { id: 'r11', title: 'Chemical Bonding — VSEPR, Hybridisation & MOT', type: 'Note', subject: 'Chemistry', exam: 'neet', pages: 10, section: 'VSEPR & MOT', route: 'NoteEditor', params: { resourceId: 'r11' } },
  r12: { id: 'r12', title: 'English Grammar & Comprehension Blueprint', type: 'Book', subject: 'English', exam: 'ssc', pages: 240, section: 'Grammar & Vocab', route: 'BookReader', params: { resourceId: 'r12' }, chapters: ['Parts of Speech', 'Subject–Verb Agreement', 'Tenses', 'Error Spotting Rules', 'Idioms & Phrases', 'Cloze Test', 'Reading Comprehension', 'One Word Substitution'] },
  t1: { id: 't1', title: 'UPSC Prelims Full Mock #14', type: 'Test', exam: 'upsc', route: 'TestPlayer', params: { testId: 't1' }, section: 'Full Mock (20 min)' },
  t2: { id: 't2', title: 'SSC CGL Tier-I Speed Mock #27', type: 'Test', exam: 'ssc', route: 'TestPlayer', params: { testId: 't2' }, section: 'Full Mock (15 min)' },
  t3: { id: 't3', title: 'Banking Awareness & Economy Sectional', type: 'Test', exam: 'banking', route: 'TestPlayer', params: { testId: 't3' }, section: 'Sectional Test (10 min)' },
  t4: { id: 't4', title: 'Daily Current Affairs Quiz — 26 Oct', type: 'Test', exam: 'upsc', route: 'TestPlayer', params: { testId: 't4' }, section: 'Daily Quiz (8 min)' },
  t5: { id: 't5', title: 'NEET Rapid Revision Quiz', type: 'Test', exam: 'neet', route: 'TestPlayer', params: { testId: 't5' }, section: 'Daily Quiz (10 min)' },
};

module.exports = {
  APP_INFO,
  EXAMS_SUPPORTED,
  RESOURCE_REGISTRY,
  FEATURE_REGISTRY,
  retrieveAppKnowledge,
  retrieveStudyResources,
};
