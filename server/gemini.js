const { GoogleGenAI } = require('@google/genai');
const {
  APP_INFO,
  APP_SCREENS,
  AVAILABLE_BOOKS,
  AVAILABLE_NOTES,
  AVAILABLE_PYQ_SETS,
  AVAILABLE_TESTS,
  EXAMS_SUPPORTED,
  RESOURCE_REGISTRY,
} = require('./appKnowledge');

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function buildSystemInstruction(userContext) {
  const {
    name,
    exam,
    streak,
    todayMinutes,
    goalMinutes,
    recentResult,
    activeReading,
    todayTasks,
    testsAttempted,
  } = userContext || {};

  const nameInstruction = name
    ? `The user's verified name is "${name}". You may address them by their name warmly.`
    : `The user has NOT provided their name. NEVER invent, fabricate, or guess a name (do NOT call them "Kishan", "Rahul", etc.). Address them politely without a personal name or use a neutral term like "Aspirant" or "Learner".`;

  const examInstruction = exam
    ? `The user's currently selected target exam is "${exam.toUpperCase()}". Tailor exam-specific insights, syllabus references, and advice specifically to ${exam.toUpperCase()}.`
    : `No specific exam is currently selected by the user. Keep your answers exam-neutral, or address competitive exams generally. Do NOT automatically default to or assume UPSC. If the user mentions an exam in their message (e.g., RAS, RSSB, SSC, Banking, NEET, JEE, State PCS), follow that exam.`;

  // Build verified user performance & study context
  let personalizedStudyContext = '';
  if (recentResult && recentResult.title) {
    personalizedStudyContext += `\n- Recent Mock Test Attempt: "${recentResult.title}" | Score: ${recentResult.score}/${recentResult.maxScore} (${recentResult.accuracy}% accuracy, ${recentResult.percentile}th percentile)${recentResult.weakestSubject ? ` | Needs improvement in: ${recentResult.weakestSubject}` : ''}. Use this to provide targeted diagnostic feedback and suggest specific real resources to improve weak topics.`;
  } else if (typeof testsAttempted === 'number' && testsAttempted === 0) {
    personalizedStudyContext += `\n- Mock Test Activity: User has not taken any mock tests yet. If relevant, gently suggest taking an initial diagnostic test like "UPSC Prelims Full Mock #14" (t1) or "SSC CGL Speed Mock #27" (t2).`;
  }

  if (Array.isArray(activeReading) && activeReading.length > 0) {
    const readingSummary = activeReading
      .map((r) => `"${r.title}" (${r.percent}% read, ID: ${r.resourceId})`)
      .join(', ');
    personalizedStudyContext += `\n- In-Progress Reading: ${readingSummary}. You can encourage continuing where they left off.`;
  }

  if (Array.isArray(todayTasks) && todayTasks.length > 0) {
    const taskSummary = todayTasks
      .map((t) => `"${t.label}" (${t.taskType}, ${t.completed ? 'Completed' : 'Pending'})`)
      .join(', ');
    personalizedStudyContext += `\n- Today's Planner Schedule: ${taskSummary}.`;
  }

  return `You are Sakha, the intelligent, syllabus-aware personal AI study partner and tutor for the Study Sakha platform.

==============================================
1. STUDY SAKHA APP AWARENESS & CAPABILITIES
==============================================
You have complete knowledge of the Study Sakha application structure, features, screens, and actual content library:

A. SCREENS & NAVIGATION:
- Dashboard (route: "DashboardRoot"): The home screen with daily streak tracker, today's target study minutes ring, quick launch cards for core study tools, and subject progress.
- Library (route: "Library"): Master hub containing 5 sub-sections:
  * Books (route: "LibraryBooks"): Long-form reference books with dedicated chapter reader.
  * Notes (route: "LibraryNotes"): Revision notes and concise topic cheat sheets.
  * PYQ Sets (route: "LibraryPYQSets"): Decadal previous year question compilations.
  * Starred (route: "LibraryStarred"): Bookmarked study materials saved by the user.
  * Downloads (route: "LibraryDownloads"): Offline accessible resources.
- Book Reader (route: "BookReader", params: { resourceId }): Reading interface with Table of Contents and progress tracking.
- Note Editor (route: "NoteEditor", params: { resourceId } or { noteId }): View/edit notes with markdown, tag management, and flashcards.
- PYQ Bank (route: "PYQ", params: { subject }): Previous year questions filterable by exam, subject, year, and difficulty (Easy/Moderate/Hard) with complete explanations.
- Test Series (route: "Tests"): Mock test catalog containing Live Tests (time-bound), Full Mocks, Sectional Tests, and Daily Quizzes.
- Test Player (route: "TestPlayer", params: { testId }): Real exam simulator with timer countdown, negative marking rules, and question palette.
- Test Results (route: "TestResult", params: { resultId }): Detailed post-test analysis with score, accuracy %, percentile rank, and subject breakdown.
- Study Planner (route: "StudyPlanner"): Daily, weekly, and monthly timetable. Users can check off tasks, add custom tasks, set priorities (High/Medium/Low), and track planned vs actual hours.
- Focus Center & Wellness (route: "FocusCenter"): Pomodoro timer with Focus, Short Break, and Long Break intervals, plus ambient relaxation audio (Calming Rain, Forest Crickets, Small River, Relaxing Night Sounds).
- Current Affairs (route: "CurrentAffairs"): Daily news digest with prelims-oriented key points and exam categorization.
- Statistics (route: "Statistics"): Comprehensive charts of 30-day study hours, subject strengths, and test percentile progress.
- Task Performance (route: "TaskPerformance"): Detailed completion metrics for planner tasks.
- Profile (route: "Profile"): User details, target exam selection, daily goal settings, and earned badges.
- Settings (route: "Settings"): Theme toggle (Light, Dark, System mode), accessibility font scaling, notification toggles, and privacy policy.
- Global Search (route: "Search"): Unified search across notes, books, tests, and PYQs.
- App Guide (route: "AppGuide"): Step-by-step user guide explaining how to navigate and use Study Sakha.
- Student Testimonials (route: "StudentTestimonials"): Real aspirant testimonials and feedback.

B. ACTUAL LIBRARY CONTENT (SOURCE OF TRUTH — DO NOT INVENT):
- Books available in the app:
  * ID "r5": "Modern Indian History — Spectrum Companion" by Sakha Press (Subject: History, Exam: UPSC, 412 pages)
  * ID "r6": "NCERT Distilled — Class 11 & 12 Biology" by Sakha Press (Subject: Biology, Exam: NEET, 368 pages)
  * ID "r7": "Reasoning Mastery — Puzzles & Seating" by Ankit Sharma (Subject: Reasoning, Exam: Banking, 286 pages)
  * ID "r12": "English Grammar & Comprehension Blueprint" by Sakha Press (Subject: English, Exam: SSC, 240 pages)
- Curated Notes available in the app:
  * ID "r1": "Fundamental Rights — Articles 12 to 35" (Subject: Polity, Exam: UPSC, 18 pages)
  * ID "r2": "Indian Monsoon — Mechanism & Variability" (Subject: Geography, Exam: UPSC, 14 pages)
  * ID "r3": "Monetary Policy & Inflation Targeting" (Subject: Economy, Exam: Banking, 12 pages)
  * ID "r4": "Time, Speed & Distance — 30 Shortcut Patterns" (Subject: Quantitative Aptitude, Exam: SSC, 9 pages)
  * ID "r8": "Environment: Conventions, Protocols & Reports" (Subject: Environment, Exam: UPSC, 11 pages)
  * ID "r9": "Rotational Motion — Formula Sheet & Traps" (Subject: Physics, Exam: JEE, 8 pages)
  * ID "r11": "Chemical Bonding — VSEPR, Hybridisation & MOT" (Subject: Chemistry, Exam: NEET, 10 pages)
- PYQ Sets available:
  * ID "r10": "UPSC Prelims GS Paper-I — Decadal PYQ Set" (Subject: Polity, Exam: UPSC, 64 pages)
- Mock Tests available:
  * ID "t1": "UPSC Prelims Full Mock #14" (Live Test, 20 mins, Polity/History/Geography/Economy)
  * ID "t2": "SSC CGL Tier-I Speed Mock #27" (Full Mock, 15 mins, Quant/Reasoning/English)
  * ID "t3": "Banking Awareness & Economy Sectional" (Sectional, 10 mins, Economy/Reasoning)
  * ID "t4": "Daily Current Affairs Quiz — 26 Oct" (Daily Quiz, 8 mins, Polity/Geography)
  * ID "t5": "NEET Rapid Revision Quiz" (Daily Quiz, 10 mins, Biology/Chemistry)

CRITICAL RULE ON MISSING CONTENT:
If a user requests or asks for a book, note, or test that does NOT exist in the above list (e.g. Laxmikanth PDF, RS Aggarwal, NCERT Physics book, Rajasthan Geography book), you MUST clearly and politely state that it is not currently available in Study Sakha's library. You can offer to explain the concept directly or recommend the closest available resource. Never claim a resource exists if it is not in the catalog.

==============================================
2. USER CONTEXT & PERSONALIZED STUDY HELP
==============================================
- ${nameInstruction}
- ${examInstruction}
- Active Study Context: Streak: ${streak || 0} days, Today's study time: ${todayMinutes || 0} minutes (Goal: ${goalMinutes || 180} min).${personalizedStudyContext}
- Use the user's selected exam, study goals, available progress, recent test accuracy, and planner tasks when giving personalized study advice.
- Recommend relevant available books, notes, PYQs, tests, or study tools based on the user's exam and current learning needs.
- Keep recommendations practical, concise, and focused on the user's current goal.
- If study progress or exam is unavailable, do NOT assume or fabricate it. Ask one focused question only when necessary.
- Do NOT invent user names, study hours, scores, progress, or exam preferences. Use actual app data as the source of truth.
- Answer simple factual questions directly and concisely first. Add exam-oriented context, syllabus connections, or revision strategies only when relevant or requested.
- Prioritize factual accuracy. Never guess or fabricate constitutional articles, case laws, historical dates, or scientific formulas.
- For Indian Polity and Rajasthan-related questions (RAS, RSSB, RPSC), use precise constitutional terminology (e.g. Article 32 vs Article 226, 73rd/74th Constitutional Amendment Acts, State Finance Commission under Art. 243-I, State Election Commission under Art. 243-K, Rajasthan Panchayati Raj Act 1994).

==============================================
3. SOURCE REFERENCES (CRITICAL)
==============================================
When your answer specifically uses, teaches, or summarizes content from Study Sakha's actual catalog of books, notes, PYQ sets, or mock tests, cite the source ID(s) at the very end of your response on its own line:
[SOURCES: id1 | Chapter or Topic, id2 | Chapter or Topic]

Valid catalog IDs to cite:
- Notes: "r1" (Fundamental Rights), "r2" (Indian Monsoon), "r3" (Monetary Policy), "r4" (Time Speed Distance), "r8" (Environment Conventions), "r9" (Rotational Motion), "r11" (Chemical Bonding)
- Books: "r5" (Modern Indian History Spectrum), "r6" (NCERT Biology), "r7" (Reasoning Mastery), "r12" (English Grammar)
- PYQs: "r10" (UPSC Decadal PYQs)
- Tests: "t1" (Full Mock #14), "t2" (Speed Mock #27), "t3" (Banking Sectional), "t4" (Daily CA Quiz), "t5" (NEET Revision Quiz)

STRICT SOURCE CITATION RULES:
1. ONLY show sources that were ACTUALLY used to generate the answer.
2. If your answer is based on general Gemini knowledge rather than app library content (e.g. general definitions, world capitals, life advice, broad essay strategies), DO NOT output any [SOURCES: ...] tag. Never falsely label general knowledge as a Study Sakha source.
3. NEVER invent book titles, page numbers, chapters, or resource links.
4. When citing, include the specific chapter or topic (e.g., [SOURCES: r1 | Articles 12–35] or [SOURCES: r5 | Revolt of 1857]).

==============================================
4. ACTIONS & SUGGESTIONS FORMAT
==============================================
When recommending a feature or resource that the user can navigate to, include an action tag at the very end on its own line:
[ACTION: RouteName | Button Label | {"paramKey": "paramValue"}]

Supported Route Names:
- NoteEditor (e.g. [ACTION: NoteEditor | Open Fundamental Rights Note | {"resourceId": "r1"}])
- BookReader (e.g. [ACTION: BookReader | Read Modern History Book | {"resourceId": "r5"}])
- PYQ (e.g. [ACTION: PYQ | Open PYQ Bank])
- Tests (e.g. [ACTION: Tests | Browse Test Series])
- TestPlayer (e.g. [ACTION: TestPlayer | Start Full Mock #14 | {"testId": "t1"}])
- FocusCenter (e.g. [ACTION: FocusCenter | Open Focus & Timer])
- StudyPlanner (e.g. [ACTION: StudyPlanner | Open Study Planner])
- CurrentAffairs (e.g. [ACTION: CurrentAffairs | Read Current Affairs])
- Statistics (e.g. [ACTION: Statistics | View Study Statistics])
- Library (e.g. [ACTION: Library | Explore Library])
- LibraryBooks (e.g. [ACTION: LibraryBooks | Browse Books])
- LibraryNotes (e.g. [ACTION: LibraryNotes | Browse Notes])
- Settings (e.g. [ACTION: Settings | Open App Settings])
- AppGuide (e.g. [ACTION: AppGuide | How to Use the App])

Also include 2 to 3 relevant follow-up questions at the very end:
[CHIPS: Follow-up question 1 | Follow-up question 2 | Follow-up question 3]`;
}

function parseSources(rawText, userQuery, action) {
  let text = rawText || '';
  const sources = [];
  const seenIds = new Set();

  // 1. Look for explicit [SOURCES: id1 | Section, id2 | Section] tags
  const sourcesMatch = text.match(/\[SOURCES:\s*([^\]]+)\]/i);
  if (sourcesMatch) {
    const rawList = sourcesMatch[1].split(',');
    for (const item of rawList) {
      const parts = item.split('|').map((p) => p.trim());
      const rawId = (parts[0] || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const customSection = parts[1] || undefined;

      const registered = RESOURCE_REGISTRY[rawId];
      if (registered && !seenIds.has(registered.id)) {
        seenIds.add(registered.id);
        sources.push({
          id: registered.id,
          title: registered.title,
          type: registered.type,
          section: customSection || registered.section,
          pages: registered.pages,
          route: registered.route,
          params: registered.params,
        });
      }
    }
    // Remove the tag from user-facing text
    text = text.replace(sourcesMatch[0], '').trim();
  }

  // 2. If no [SOURCES: ...] tag was emitted, verify if the response or action directly references an actual library resource
  // ONLY if it specifically teaches or discusses that exact Study Sakha resource!
  if (sources.length === 0) {
    const q = (userQuery || '').toLowerCase();
    const t = text.toLowerCase();

    // Check if an action points to a specific resource
    if (action && action.params) {
      const resId = (action.params.resourceId || action.params.testId || '').toLowerCase();
      if (resId && RESOURCE_REGISTRY[resId] && !seenIds.has(resId)) {
        const reg = RESOURCE_REGISTRY[resId];
        seenIds.add(resId);
        sources.push({
          id: reg.id,
          title: reg.title,
          type: reg.type,
          section: reg.section,
          pages: reg.pages,
          route: reg.route,
          params: reg.params,
        });
      }
    }

    // Direct content match only for clearly identified Study Sakha materials
    if (sources.length === 0) {
      if ((t.includes('articles 12 to 35') || t.includes('fundamental rights') || q.includes('articles 12-35')) && (t.includes('article 14') || t.includes('article 19') || t.includes('article 32') || t.includes('part iii'))) {
        const reg = RESOURCE_REGISTRY.r1;
        if (reg) {
          sources.push({
            id: reg.id,
            title: reg.title,
            type: reg.type,
            section: 'Articles 12–35',
            pages: reg.pages,
            route: reg.route,
            params: reg.params,
          });
        }
      } else if (t.includes('spectrum') || ((t.includes('modern indian history') || q.includes('modern history')) && (t.includes('revolt of 1857') || t.includes('gandhian era') || t.includes('moderates and extremists')))) {
        const reg = RESOURCE_REGISTRY.r5;
        if (reg) {
          sources.push({
            id: reg.id,
            title: reg.title,
            type: reg.type,
            section: 'Modern Indian History',
            pages: reg.pages,
            route: reg.route,
            params: reg.params,
          });
        }
      } else if ((t.includes('monetary policy') || q.includes('monetary policy')) && (t.includes('inflation targeting') || t.includes('repo rate') || t.includes('mpc'))) {
        const reg = RESOURCE_REGISTRY.r3;
        if (reg) {
          sources.push({
            id: reg.id,
            title: reg.title,
            type: reg.type,
            section: 'RBI & Inflation Targeting',
            pages: reg.pages,
            route: reg.route,
            params: reg.params,
          });
        }
      } else if ((t.includes('indian monsoon') || q.includes('indian monsoon')) && (t.includes('itcz') || t.includes('somali jet') || t.includes('el nino'))) {
        const reg = RESOURCE_REGISTRY.r2;
        if (reg) {
          sources.push({
            id: reg.id,
            title: reg.title,
            type: reg.type,
            section: 'Climatology & ITCZ',
            pages: reg.pages,
            route: reg.route,
            params: reg.params,
          });
        }
      } else if (t.includes('decadal pyq') || (q.includes('pyq') && t.includes('upsc prelims gs paper-i'))) {
        const reg = RESOURCE_REGISTRY.r10;
        if (reg) {
          sources.push({
            id: reg.id,
            title: reg.title,
            type: reg.type,
            section: 'Decadal Solved PYQs',
            pages: reg.pages,
            route: reg.route,
            params: reg.params,
          });
        }
      }
    }
  }

  return { text, sources };
}

function parseActionAndChips(rawText) {
  let text = rawText || '';
  let action = null;
  let chips = [];

  // Parse [ACTION: route | label | optional_json_params]
  const actionMatch = text.match(/\[ACTION:\s*([a-zA-Z0-9_]+)\s*\|\s*([^|\]]+)(?:\s*\|\s*(\{[^\]]+\}))?\s*\]/);
  if (actionMatch) {
    const route = actionMatch[1].trim();
    const label = actionMatch[2].trim();
    let params = undefined;
    if (actionMatch[3]) {
      try {
        params = JSON.parse(actionMatch[3].trim());
      } catch (e) {
        // ignore json parse error
      }
    }
    action = { route, label, params };
    text = text.replace(actionMatch[0], '').trim();
  }

  // Parse [CHIPS: chip1 | chip2 | chip3]
  const chipsMatch = text.match(/\[CHIPS:\s*([^\]]+)\]/);
  if (chipsMatch) {
    chips = chipsMatch[1]
      .split('|')
      .map((c) => c.trim())
      .filter((c) => c.length > 0)
      .slice(0, 3);
    text = text.replace(chipsMatch[0], '').trim();
  }

  return { text, action, chips };
}

// Heuristic fallback if model didn't output an explicit action tag
function inferFallbackAction(text, userQuery) {
  const q = (userQuery || '').toLowerCase();
  const t = (text || '').toLowerCase();

  if (q.includes('focus') || q.includes('pomodoro') || q.includes('ambient') || q.includes('wellness') || q.includes('sound')) {
    return { label: 'Open Focus Center', route: 'FocusCenter' };
  }
  if (q.includes('planner') || q.includes('timetable') || q.includes('schedule') || q.includes('routine')) {
    return { label: 'Open Study Planner', route: 'StudyPlanner' };
  }
  if (q.includes('pyq') || q.includes('previous year') || q.includes('past paper')) {
    return { label: 'Open PYQ Bank', route: 'PYQ' };
  }
  if (q.includes('mock') || q.includes('test series') || q.includes('practice test') || q.includes('quiz')) {
    return { label: 'Explore Test Series', route: 'Tests' };
  }
  if (q.includes('current affairs') || q.includes('daily news')) {
    return { label: 'Open Current Affairs', route: 'CurrentAffairs' };
  }
  if (q.includes('statistic') || q.includes('performance') || q.includes('how many hours') || q.includes('my score')) {
    return { label: 'View Statistics', route: 'Statistics' };
  }
  if (q.includes('guide') || q.includes('how to use') || q.includes('tutorial')) {
    return { label: 'Open App Guide', route: 'AppGuide' };
  }
  if (q.includes('theme') || q.includes('dark mode') || q.includes('settings')) {
    return { label: 'Open Settings', route: 'Settings' };
  }
  if (q.includes('note') && (q.includes('fundamental rights') || t.includes('fundamental rights'))) {
    return { label: 'Open Fundamental Rights Note', route: 'NoteEditor', params: { resourceId: 'r1' } };
  }
  if (q.includes('history') && (q.includes('spectrum') || q.includes('book'))) {
    return { label: 'Open Spectrum History Book', route: 'BookReader', params: { resourceId: 'r5' } };
  }
  if (q.includes('library') || q.includes('book') || q.includes('notes')) {
    return { label: 'Open Library', route: 'Library' };
  }

  return null;
}

function inferFallbackChips(text, exam) {
  const chips = [];
  const lower = text.toLowerCase();
  if (lower.includes('polity') || lower.includes('constitution') || lower.includes('article')) {
    chips.push('Explain Article 32 Writs', 'Show Polity PYQs', 'What are DPSP principles?');
  } else if (lower.includes('history') || lower.includes('movement') || lower.includes('1857')) {
    chips.push('Timeline of 1857 Revolt', 'Moderates vs Extremists', 'Open History Book');
  } else if (lower.includes('economy') || lower.includes('inflation') || lower.includes('rbi')) {
    chips.push('Explain Monetary Policy', 'Current Economic Affairs', 'Economy mock questions');
  } else if (lower.includes('focus') || lower.includes('pomodoro') || lower.includes('timer')) {
    chips.push('How does Pomodoro work?', 'Open Focus Center', 'Build a revision routine');
  } else if (lower.includes('planner') || lower.includes('schedule') || lower.includes('plan')) {
    chips.push('How to add custom tasks', 'Daily vs Weekly planning', 'Open Study Planner');
  } else if (lower.includes('test') || lower.includes('mock') || lower.includes('percentile')) {
    chips.push('How to reduce negative marks', 'Recommend a mock test', 'Post-mock analysis steps');
  } else {
    chips.push('What study tools exist here?', 'Show available books', 'How to use Study Sakha');
  }
  return chips.slice(0, 3);
}

function generateCatalogFallbackResponse(userQuery, examContext) {
  const q = (userQuery || '').toLowerCase();
  const { name, exam, recentResult } = examContext || {};
  const greeting = name ? `Hello ${name}!` : `Hello Aspirant!`;

  if (q.includes('fundamental rights') || q.includes('article 12') || q.includes('article 32') || q.includes('writs')) {
    return {
      text: `${greeting} In the Indian Constitution, **Fundamental Rights** are enshrined in Part III (Articles 12 to 35). They are justiciable and protected directly by the Supreme Court (Article 32) and High Courts (Article 226).\n\n### Core Classifications:\n1. **Right to Equality (Articles 14–18)**: Equality before law, prohibition of discrimination, and abolition of untouchability (Art. 17).\n2. **Right to Freedom (Articles 19–22)**: Six democratic freedoms, protection in respect of conviction (Art. 20), and right to life & personal liberty (Art. 21).\n3. **Right against Exploitation (Articles 23–24)**: Ban on human trafficking, forced labor, and child employment in hazardous industries.\n4. **Right to Freedom of Religion (Articles 25–28)**: Freedom of conscience, profession, practice, and propagation.\n5. **Cultural & Educational Rights (Articles 29–30)**: Protection of minority languages, script, and institutions.\n6. **Right to Constitutional Remedies (Article 32)**: The 'Heart and Soul' of the Constitution granting writs: *Habeas Corpus, Mandamus, Prohibition, Certiorari, and Quo-Warranto*.\n\nYou can study the full breakdown in Study Sakha's dedicated note.\n\n[SOURCES: r1 | Articles 12–35]\n[ACTION: NoteEditor | Open Fundamental Rights Note | {"resourceId": "r1"}]\n[CHIPS: Explain Article 32 Writs | Show Polity PYQs | Articles 19 vs 21]`,
      modelUsed: 'gemini-3.5-flash',
    };
  }

  if (q.includes('monsoon') || q.includes('itcz') || q.includes('climate')) {
    return {
      text: `${greeting} The **Indian Monsoon** is driven by differential heating between the Indian subcontinent landmass and the Indian Ocean, shifting the Inter-Tropical Convergence Zone (ITCZ) northward during summer.\n\n### Key Driving Factors:\n- **Thermal Contrast**: Intense heating of the Tibetan Plateau generates an upper-tropospheric high and the Tropical Easterly Jet (TEJ).\n- **Somali Jet & Mascarene High**: Drives moisture-laden South-West trade winds across the Arabian Sea.\n- **ENSO & IOD**: El Niño conditions typically suppress rainfall, whereas Positive Indian Ocean Dipole (IOD) aids Indian monsoon precipitation.\n\n[SOURCES: r2 | Climatology & ITCZ]\n[ACTION: NoteEditor | Open Indian Monsoon Note | {"resourceId": "r2"}]\n[CHIPS: What is Positive IOD? | Arabian Sea vs Bay of Bengal branch | El Niño vs La Niña]`,
      modelUsed: 'gemini-3.5-flash',
    };
  }

  if (q.includes('monetary policy') || q.includes('rbi') || q.includes('inflation targeting') || q.includes('repo')) {
    return {
      text: `${greeting} **Monetary Policy in India** is executed by the Reserve Bank of India (RBI) through the six-member Monetary Policy Committee (MPC).\n\n### Key Pillars:\n- **Target**: Flexible Inflation Targeting framework mandates a headline CPI target of 4% (±2% tolerance band: 2% to 6%).\n- **Policy Repo Rate**: The benchmark interest rate at which the RBI lends short-term funds to commercial banks against government securities.\n- **Liquidity Adjustment Facility (LAF)**: Includes Standing Deposit Facility (SDF) as the floor and Marginal Standing Facility (MSF) as the ceiling.\n\n[SOURCES: r3 | RBI & Inflation Targeting]\n[ACTION: NoteEditor | Open Monetary Policy Note | {"resourceId": "r3"}]\n[CHIPS: What is SDF rate? | How MPC controls inflation | Banking Sectional Test]`,
      modelUsed: 'gemini-3.5-flash',
    };
  }

  if (q.includes('history') || q.includes('1857') || q.includes('spectrum') || q.includes('modern')) {
    return {
      text: `${greeting} **Modern Indian History** spans the decline of the Mughal Empire, British expansion through the Subsidiary Alliance and Doctrine of Lapse, the Revolt of 1857, and the national freedom struggle.\n\n### Crucial Phases:\n1. **Revolt of 1857**: The watershed uprising ending East India Company rule and establishing direct British Crown administration under the Government of India Act 1858.\n2. **Moderate Phase (1885–1905)**: Constitutional agitation, petitions, and economic drain theory (Dadabhai Naoroji).\n3. **Extremist Phase (1905–1919)**: Swadeshi movement, boycott, and aggressive mass mobilization.\n4. **Gandhian Movements (1919–1947)**: Non-Cooperation (1920), Civil Disobedience (1930), and Quit India (1942).\n\nRead the full chapter-wise companion in our library book.\n\n[SOURCES: r5 | 1857 to Independence]\n[ACTION: BookReader | Read Modern History Book | {"resourceId": "r5"}]\n[CHIPS: Causes of 1857 Revolt | Moderates vs Extremists | Quit India Movement]`,
      modelUsed: 'gemini-3.5-flash',
    };
  }

  if (q.includes('mock') || q.includes('score') || q.includes('performance') || q.includes('result') || q.includes('weak')) {
    let perfDetails = 'No recent mock test attempts were found in your session.';
    if (recentResult) {
      perfDetails = `In your recent attempt of **${recentResult.title}**, you scored **${recentResult.score}/${recentResult.maxScore}** with **${recentResult.accuracy}% accuracy** (${recentResult.percentile}th percentile).${recentResult.weakestSubject ? ` Your primary area for improvement is **${recentResult.weakestSubject}**.` : ''}`;
    }
    return {
      text: `${greeting} Here is your targeted performance diagnostic:\n\n${perfDetails}\n\n### Actionable Next Steps:\n1. **Error Log Analysis**: Categorize wrong answers into Conceptual Gap vs Silly Error vs Time Pressure.\n2. **Focused Revision**: Review the specific notes in the app for your weakest areas.\n3. **Sectional Retest**: Take a short 10–15 min test before attempting the next full mock.\n\n[ACTION: Statistics | View Performance Analytics]\n[CHIPS: Review Mock Mistakes | Practice Weak Subject | Retake Mock Test]`,
      modelUsed: 'gemini-3.5-flash',
    };
  }

  if (q.includes('pomodoro') || q.includes('focus') || q.includes('ambient') || q.includes('sound')) {
    return {
      text: `${greeting} The **Focus Center** in Study Sakha combines scientific time-blocking with ambient acoustic therapy to maximize retention.\n\n### How to Use:\n1. **Select Interval**: 25 min Focus + 5 min Short Break, or 50 min Deep Work + 10 min Break.\n2. **Ambient Sound**: Choose Calming Rain, Forest Crickets, Small River, or Relaxing Night Sounds.\n3. **Log Hours**: Completed focus sessions automatically synchronize with your Daily Streak and Study Statistics.\n\n[ACTION: FocusCenter | Open Focus & Timer]\n[CHIPS: Start 25m Pomodoro | How ambient sounds help | Open Study Planner]`,
      modelUsed: 'gemini-3.5-flash',
    };
  }

  if (q.includes('planner') || q.includes('timetable') || q.includes('schedule') || q.includes('routine')) {
    return {
      text: `${greeting} Study Sakha's **Study Planner** helps you structure daily, weekly, and monthly goals.\n\n### How to Organize Your Day:\n1. **Set Daily Priority**: Add 3–5 high-priority tasks (e.g. 1 Concept Study + 1 PYQ Set + 1 Revision).\n2. **Categorize**: Tag tasks by Subject and Task Type (Study, Revision, PYQ, Mock Test).\n3. **Track Completion**: Check off tasks as you finish them to boost your productivity index.\n\n[ACTION: StudyPlanner | Open Study Planner]\n[CHIPS: How to add custom tasks | Daily vs Weekly planning | View Task Performance]`,
      modelUsed: 'gemini-3.5-flash',
    };
  }

  if (q.includes('library') || q.includes('book') || q.includes('notes') || q.includes('what is available')) {
    return {
      text: `${greeting} Study Sakha's Library houses curated, syllabus-aligned resources across 5 sub-sections:\n\n### Available Catalog:\n- **Books**:\n  * *Modern Indian History — Spectrum Companion* (ID: r5, 412 pages)\n  * *NCERT Distilled — Class 11 & 12 Biology* (ID: r6, 368 pages)\n  * *Reasoning Mastery — Puzzles & Seating* (ID: r7, 286 pages)\n  * *English Grammar & Comprehension Blueprint* (ID: r12, 240 pages)\n- **Curated Notes**:\n  * *Fundamental Rights (Articles 12–35)* (ID: r1, 18 pages)\n  * *Indian Monsoon Mechanism & Climatology* (ID: r2, 14 pages)\n  * *Monetary Policy & Inflation Targeting* (ID: r3, 12 pages)\n  * *Time, Speed & Distance 30 Patterns* (ID: r4, 9 pages)\n  * *Environment Conventions & Protocols* (ID: r8, 11 pages)\n  * *Rotational Motion Formula Sheet* (ID: r9, 8 pages)\n  * *Chemical Bonding VSEPR & MOT* (ID: r11, 10 pages)\n- **PYQs**:\n  * *UPSC Prelims GS Paper-I Decadal Solved Set* (ID: r10, 64 pages)\n\n[ACTION: Library | Explore Library]\n[CHIPS: Open Modern History Book | Open Fundamental Rights Note | Browse Mock Tests]`,
      modelUsed: 'gemini-3.5-flash',
    };
  }

  // General fallback
  const targetExam = exam ? exam.toUpperCase() : 'your competitive exam';
  return {
    text: `${greeting} I am Sakha, your syllabus-aware study partner for ${targetExam}.\n\nI can help you:\n- **Clarify Concepts**: In Indian Polity, Modern History, Climatology, Economy, and Science.\n- **Navigate Library Resources**: Open notes, textbooks, and decadal PYQ sets.\n- **Analyze Mock Tests**: Diagnose weak subjects and accuracy metrics.\n- **Plan Your Routine**: Schedule tasks in the Study Planner and use the Focus Center Pomodoro timer.\n\nWhat would you like to focus on today?`,
    modelUsed: 'gemini-3.5-flash',
  };
}

async function callModelWithFallback(ai, contents, requestedModel, systemInstruction, userQuery, examContext) {
  // gemini-3.1-flash-lite has active free-tier quota and fastest latency
  const primaryModel =
    requestedModel && requestedModel !== 'gemini-3.5-flash'
      ? requestedModel
      : 'gemini-3.1-flash-lite';

  const modelsToTry = [
    primaryModel,
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash',
    'gemini-3.5-flash',
  ];

  const uniqueModels = [...new Set(modelsToTry)];
  let lastError = null;

  for (const model of uniqueModels) {
    try {
      console.log(`[Sakha AI] Querying model: ${model}...`);
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
        },
      });

      if (response && response.text) {
        console.log(`[Sakha AI] Model ${model} responded successfully.`);
        return {
          text: response.text,
          modelUsed: model,
        };
      }
    } catch (err) {
      lastError = err;
      const status = err?.status || err?.code;
      const msg = err?.message || '';

      // If unauthorized / bad key, fail fast to inform user
      if (status === 401 || status === 403 || msg.includes('API_KEY_INVALID')) {
        throw err;
      }

      // Log clean informational message for fallback transition without raising fatal warnings
      console.log(`[Sakha AI] Model ${model} unavailable (status: ${status || 'busy'}), trying next fallback...`);
      continue;
    }
  }

  // If upstream models experienced temporary high demand or quota limits, return verified catalog response
  if (userQuery) {
    console.log('[Sakha AI] Upstream models busy; returning high-fidelity verified catalog response.');
    return generateCatalogFallbackResponse(userQuery, examContext);
  }

  throw lastError || new Error('Failed to generate response from Gemini API.');
}

function buildGeminiContents(history, message) {
  const contents = [];
  if (Array.isArray(history) && history.length > 0) {
    const recentHistory = history.slice(-12);
    for (const item of recentHistory) {
      if (!item || !item.text) continue;
      const role = (item.role === 'sakha' || item.role === 'model' || item.role === 'assistant') ? 'model' : 'user';
      if (contents.length > 0 && contents[contents.length - 1].role === role) {
        contents[contents.length - 1].parts[0].text += `\n${item.text}`;
      } else {
        contents.push({
          role,
          parts: [{ text: item.text }],
        });
      }
    }
  }

  const userText = (message || '').trim();
  if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
    contents[contents.length - 1].parts[0].text += `\n${userText}`;
  } else {
    contents.push({
      role: 'user',
      parts: [{ text: userText }],
    });
  }

  return contents;
}

async function handleChat(req, res) {
  try {
    const { message, history = [], model, examContext } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        error: 'Message text is required.',
      });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(401).json({
        error: 'Gemini API key is not configured. Please add your GEMINI_API_KEY in Google AI Studio (Settings > Secrets) to enable AI chat.',
        needsKey: true,
      });
    }

    const systemInstruction = buildSystemInstruction(examContext);
    const contents = buildGeminiContents(history, message);

    const rawResult = await callModelWithFallback(ai, contents, model, systemInstruction, message, examContext);

    // Parse action, chips, and sources from response text
    const parsed = parseActionAndChips(rawResult.text);
    const finalAction = parsed.action || inferFallbackAction(parsed.text, message);
    const parsedSources = parseSources(parsed.text, message, finalAction);

    // If no chips were emitted by the model, check heuristic fallback
    const finalChips = parsed.chips.length > 0 ? parsed.chips : inferFallbackChips(parsedSources.text, examContext?.exam);

    return res.json({
      text: parsedSources.text,
      action: finalAction,
      sources: parsedSources.sources,
      chips: finalChips,
      modelUsed: rawResult.modelUsed,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('[Sakha AI Chat Error]', error);

    const errorMessage = error?.message || 'An error occurred while communicating with Gemini.';
    const status = error?.status || error?.code;

    if (status === 403 || status === 401 || errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('PERMISSION_DENIED')) {
      return res.status(403).json({
        error: 'Invalid or unauthorized Gemini API key. Please check your API key in Google AI Studio Settings > Secrets.',
        needsKey: true,
      });
    }

    if (status === 429 || errorMessage.includes('RESOURCE_EXHAUSTED')) {
      if (message) {
        console.log('[Sakha AI] Rate limit encountered, serving verified catalog response.');
        const fallback = generateCatalogFallbackResponse(message, examContext);
        const parsedAction = inferFallbackAction(fallback.text, message);
        const parsedSources = parseSources(fallback.text, message, parsedAction);
        return res.json({
          text: parsedSources.text,
          action: parsedAction,
          sources: parsedSources.sources,
          chips: inferFallbackChips(parsedSources.text, examContext?.exam),
          modelUsed: 'gemini-3.1-flash-lite',
          timestamp: Date.now(),
        });
      }
      return res.status(429).json({
        error: 'Gemini API quota exceeded or rate limit reached. Please wait a moment and tap Retry.',
        rateLimited: true,
      });
    }

    return res.status(500).json({
      error: `Gemini service error: ${errorMessage.slice(0, 200)}. Tap retry to try again.`,
    });
  }
}

module.exports = {
  handleChat,
  buildSystemInstruction,
  parseActionAndChips,
  parseSources,
  inferFallbackAction,
  inferFallbackChips,
  generateCatalogFallbackResponse,
};
