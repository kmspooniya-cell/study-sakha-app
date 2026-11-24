import type { ExamId } from './types';

export const EXAM_ID_BY_FOCUS: Record<string, ExamId> = {
  UPSC: 'upsc',
  RAS: 'ras',
  'RPSC/RSSB': 'rpsc_rssb',
  SSC: 'ssc',
  Banking: 'banking',
  NEET: 'neet',
};

export function examIdForFocus(focus: string) {
  return EXAM_ID_BY_FOCUS[focus];
}
