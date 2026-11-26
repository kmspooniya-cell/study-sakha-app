jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { shouldPromptToSaveFocusSession } from '../lib/focusTimerAccounting';

describe('Focus Completion 2-minute threshold & navigation priority', () => {
  it('enforces the 2-minute (120s) completion eligibility threshold', () => {
    expect(shouldPromptToSaveFocusSession(0)).toBe(false);
    expect(shouldPromptToSaveFocusSession(119)).toBe(false);
    expect(shouldPromptToSaveFocusSession(120)).toBe(true);
    expect(shouldPromptToSaveFocusSession(300)).toBe(true);
  });
});
