import React from 'react';
import { act, render } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import { Platform } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { NativeDatePicker } from '../components/NativeSchedulePickers';

jest.mock('@react-native-community/datetimepicker', () => ({
  DateTimePickerAndroid: { open: jest.fn() },
}));

describe('Android native calendar picker', () => {
  it('opens the Material calendar month view and saves a selected date across the year boundary', () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    const onSave = jest.fn();
    const onCancel = jest.fn();

    try {
      render(
        <NativeDatePicker
          visible
          value="2026-12-31"
          parseDate={(value) => {
            const [year, month, day] = value.split('-').map(Number);
            return new Date(year, month - 1, day);
          }}
          formatDate={(date) =>
            `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
          }
          onSave={onSave}
          onCancel={onCancel}
        />,
      );

      expect(DateTimePickerAndroid.open).toHaveBeenCalledWith(
        expect.objectContaining({
          value: new Date(2026, 11, 31),
          mode: 'date',
          design: 'material',
          initialInputMode: 'default',
          startOnYearSelection: false,
          positiveButton: { label: 'OK' },
          negativeButton: { label: 'Cancel' },
        }),
      );

      const options = jest.mocked(DateTimePickerAndroid.open).mock.calls[0][0];
      act(() =>
        options.onChange?.(
          { type: 'set', nativeEvent: { timestamp: new Date(2027, 0, 1).getTime(), utcOffset: 0 } },
          new Date(2027, 0, 1),
        ),
      );
      expect(onSave).toHaveBeenCalledWith('2027-01-01');
      expect(onCancel).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
    }
  });
});
