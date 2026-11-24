import { describe, expect, it } from '@jest/globals';
import { EXAMS } from '../lib/data';
import { EXAM_ID_BY_FOCUS } from '../lib/examCatalog';

describe('production backend catalog contracts', () => {
  it('maps every profile exam selector to a stable catalog ID', () => {
    const catalogIds = new Set(EXAMS.map((exam) => exam.id));
    expect(Object.values(EXAM_ID_BY_FOCUS)).toEqual(expect.arrayContaining(['upsc', 'ras', 'rpsc_rssb', 'ssc', 'banking', 'neet']));
    for (const examId of Object.values(EXAM_ID_BY_FOCUS)) {
      expect(catalogIds.has(examId)).toBe(true);
    }
  });
});
