import { describe, expect, it } from '@jest/globals';
import { EXAMS } from '../lib/data';
import { EXAM_ID_BY_FOCUS } from '../lib/examCatalog';
const { FEATURE_REGISTRY, retrieveAppKnowledge, retrieveStudyResources } = require('../server/appKnowledge');
const { buildSystemInstruction, parseActionAndChips } = require('../server/gemini');

describe('production backend catalog contracts', () => {
  it('maps every profile exam selector to a stable catalog ID', () => {
    const catalogIds = new Set(EXAMS.map((exam) => exam.id));
    expect(Object.values(EXAM_ID_BY_FOCUS)).toEqual(expect.arrayContaining(['upsc', 'ras', 'rpsc_rssb', 'ssc', 'banking', 'neet']));
    for (const examId of Object.values(EXAM_ID_BY_FOCUS)) {
      expect(catalogIds.has(examId)).toBe(true);
    }
  });

  it('retrieves grounded app instructions for Hindi feature questions', () => {
    const planner = retrieveAppKnowledge('Study Sakha में Study Planner कहाँ है?');
    expect(planner[0]).toMatchObject({ name: 'Study Planner', route: 'StudyPlanner' });
    expect(planner[0].path).toContain('Study Planner');
    expect(planner[0]).toEqual(expect.objectContaining({ settings: expect.any(Array), actions: expect.any(Array), platforms: expect.any(Array), permissions: expect.any(Array) }));
    expect(buildSystemInstruction({}, 'Focus Lock कैसे शुरू करें?')).toContain('Android requires the user');
  });

  it('marks partial group features and does not invent undocumented integrations', () => {
    const group = retrieveAppKnowledge('How do I join Study Group Hall?');
    expect(group[0]).toMatchObject({ name: 'Study Groups and Study Hall', status: 'partially implemented' });
    expect(group[0].limitations).toContain('demo');
    expect(retrieveAppKnowledge('Does it sync with my smartwatch biometric cloud?')).toEqual([]);
    expect(FEATURE_REGISTRY.some((feature: { name: string }) => feature.name === 'Student Testimonials')).toBe(false);
  });

  it('retrieves only matching repository catalog resources', () => {
    expect(retrieveStudyResources('Fundamental Rights Articles 12 to 35')[0]).toMatchObject({ id: 'r1', route: 'NoteEditor' });
    expect(retrieveStudyResources('Laxmikanth book')).toEqual([]);
    expect(buildSystemInstruction({}, 'Is Laxmikanth available?')).toContain('not listed as currently available');
  });

  it('parses multiple allowlisted actions and never leaks action syntax into display text', () => {
    const parsed = parseActionAndChips('Open your plan.\n[ACTION: StudyPlanner | Open Study Planner]\n[ACTION: Statistics | View Statistics]\n[ACTION: UnknownRoute | Unsafe action]\n[CHIPS: Show tasks | View progress]');
    expect(parsed.text).toBe('Open your plan.');
    expect(parsed.actions).toHaveLength(2);
    expect(parsed.actions.map((action: { route: string }) => action.route)).toEqual(['StudyPlanner', 'Statistics']);
    expect(parsed.action.route).toBe('StudyPlanner');
    expect(parsed.chips).toEqual(['Show tasks', 'View progress']);
    expect(parsed.text).not.toContain('[ACTION:');
  });
});
