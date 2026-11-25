import React, { useState } from 'react';
import { Dimensions, Text, TextInput } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { afterEach, describe, expect, it } from '@jest/globals';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Popup } from '../components/Popup';

function PopupHarness() {
  const [value, setValue] = useState('');
  return (
    <Popup visible onClose={() => undefined} title="Edit schedule" actions={<Text>Save changes</Text>}>
      <TextInput accessibilityLabel="Schedule title" value={value} onChangeText={setValue} />
      <Text>{value}</Text>
    </Popup>
  );
}

describe('responsive popup keyboard layout', () => {
  const originalWindow = Dimensions.get('window');
  const originalScreen = Dimensions.get('screen');
  afterEach(() => {
    act(() => Dimensions.set({ window: originalWindow, screen: originalScreen }));
  });

  it.each([
    ['mobile portrait', 390, 844],
    ['tablet portrait', 900, 1200],
    ['tablet landscape with keyboard', 1180, 560],
  ])('keeps form state, header and actions mounted at %s dimensions', async (_label, width, height) => {
    Dimensions.set({ window: { ...originalWindow, width, height }, screen: { ...originalScreen, width, height } });
    const view = render(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width, height }, insets: { top: 24, right: 0, bottom: 20, left: 0 } }}><PopupHarness /></SafeAreaProvider>);
    fireEvent.changeText(view.getByLabelText('Schedule title'), 'Recovered entry');
    await waitFor(() => expect(view.getByText('Recovered entry')).toBeTruthy());

    // A keyboard resize changes usable window height while the same modal stays open.
    act(() => Dimensions.set({
      window: { ...originalWindow, width, height: Math.max(260, height - 330) },
      screen: { ...originalScreen, width, height: Math.max(260, height - 330) },
    }));
    expect(view.getByText('Edit schedule')).toBeTruthy();
    expect(view.getByText('Save changes')).toBeTruthy();
    expect(view.getByLabelText('Schedule title').props.value).toBe('Recovered entry');
  });
});
