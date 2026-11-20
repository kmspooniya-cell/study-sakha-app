import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import { formatClockMinute, selectClockMinute, type ClockTime } from '../lib/clockTime';
import { WebTimePicker } from '../components/NativeSchedulePickers';

jest.mock('@react-native-community/datetimepicker', () => ({
  DateTimePickerAndroid: { open: jest.fn() },
}));

describe('schedule clock minute selection', () => {
  it('replaces the selected minute for every clock tap', () => {
    let time: ClockTime = { hour: '1', minute: 0, period: 'PM' };

    for (const minute of [0, 5, 30, 45]) {
      time = selectClockMinute(time, minute);
    }

    expect(time.minute).toBe(45);
    expect(formatClockMinute(time.minute)).toBe('45');
  });

  it('maps all minute clock positions in five-minute increments', () => {
    const time: ClockTime = { hour: '9', minute: 0, period: 'AM' };
    const minutes = Array.from({ length: 12 }, (_, position) =>
      selectClockMinute(time, position * 5).minute,
    );

    expect(minutes).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
    expect(formatClockMinute(0)).toBe('00');
    expect(formatClockMinute(5)).toBe('05');
  });

  it('saves the last repeated minute tap instead of appending earlier values', () => {
    const onSave = jest.fn();
    const view = render(
      <WebTimePicker
        visible
        title="Select time"
        mode="single"
        startTime="13:00"
        endTime="14:00"
        palette={{ card: '#fff', field: '#eee', text: '#111', muted: '#777', blue: '#06f', border: '#ccc' }}
        onSave={onSave}
        onCancel={jest.fn()}
        parseTime={() => new Date(2026, 0, 1, 13, 0)}
        formatTime={() => '13:00'}
      />,
    );

    fireEvent.press(view.getByText('1'));
    for (const minute of ['00', '05', '30', '45']) {
      fireEvent.press(view.getByText(minute));
    }
    fireEvent.press(view.getByText('OK'));

    expect(onSave).toHaveBeenCalledWith('13:45');
  });
});
