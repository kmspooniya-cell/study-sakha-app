import React, { useEffect, useRef } from 'react';
import { Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { formatClockMinute, selectClockMinute, type ClockTime } from '../lib/clockTime';

type NativeDatePickerProps = {
  visible: boolean;
  value: string;
  onSave: (value: string) => void;
  onCancel: () => void;
  parseDate: (value: string) => Date | null;
  formatDate: (value: Date) => string;
};

export function NativeDatePicker({
  visible,
  value,
  onSave,
  onCancel,
  parseDate,
  formatDate,
}: NativeDatePickerProps) {
  const opened = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'android' || !visible || opened.current) return;
    opened.current = true;
    let handled = false;
    const handleChange = (event: DateTimePickerEvent, date?: Date) => {
      if (handled) return;
      handled = true;
      opened.current = false;
      if (event.type === 'set' && date) onSave(formatDate(date));
      else onCancel();
    };
    DateTimePickerAndroid.open({
      value: parseDate(value) ?? new Date(),
      mode: 'date',
      design: 'material',
      initialInputMode: 'default',
      startOnYearSelection: false,
      title: 'Select date',
      positiveButton: { label: 'OK' },
      negativeButton: { label: 'Cancel' },
      onChange: handleChange,
    });
  }, [formatDate, onCancel, onSave, parseDate, value, visible]);

  useEffect(() => {
    if (!visible) opened.current = false;
  }, [visible]);

  return null;
}

type NativeTimePickerProps = {
  visible: boolean;
  title: string;
  startTime: string;
  endTime?: string;
  range: boolean;
  onSave: (time: string) => void;
  onSaveRange?: (startTime: string, endTime: string) => void;
  onCancel: () => void;
  parseTime: (value: string) => Date;
  formatTime: (value: Date) => string;
};

export function NativeTimePicker({
  visible,
  title,
  startTime,
  endTime,
  range,
  onSave,
  onSaveRange,
  onCancel,
  parseTime,
  formatTime,
}: NativeTimePickerProps) {
  const opened = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'android' || !visible || opened.current) return;
    opened.current = true;
    const openEndPicker = (selectedStart: string) => {
      let handled = false;
      DateTimePickerAndroid.open({
        value: parseTime(endTime ?? selectedStart),
        mode: 'time',
        design: 'material',
        initialInputMode: 'default',
        title,
        is24Hour: false,
        positiveButton: { label: 'OK' },
        negativeButton: { label: 'Cancel' },
        onChange: (event, date) => {
          if (handled) return;
          handled = true;
          opened.current = false;
          if (event.type === 'set' && date) onSaveRange?.(selectedStart, formatTime(date));
          else onCancel();
        },
      });
    };
    let startHandled = false;
    DateTimePickerAndroid.open({
      value: parseTime(startTime),
      mode: 'time',
      design: 'material',
      initialInputMode: 'default',
      title,
      is24Hour: false,
      positiveButton: { label: 'OK' },
      negativeButton: { label: 'Cancel' },
      onChange: (event, date) => {
        if (startHandled) return;
        startHandled = true;
        if (event.type !== 'set' || !date) {
          opened.current = false;
          onCancel();
          return;
        }
        const selectedStart = formatTime(date);
        if (range) openEndPicker(selectedStart);
        else {
          opened.current = false;
          onSave(selectedStart);
        }
      },
    });
  }, [endTime, formatTime, onCancel, onSave, onSaveRange, parseTime, range, startTime, title, visible]);

  useEffect(() => {
    if (!visible) opened.current = false;
  }, [visible]);

  return null;
}

type WebPalette = {
  card: string;
  field: string;
  text: string;
  muted: string;
  blue: string;
  border: string;
};

type WebDatePickerProps = {
  visible: boolean;
  value: string;
  title: string;
  palette: WebPalette;
  onSave: (value: string) => void;
  onCancel: () => void;
  parseDate: (value: string) => Date | null;
  formatDate: (value: Date) => string;
};

const calendarDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function WebDatePicker({
  visible,
  value,
  title,
  palette,
  onSave,
  onCancel,
  parseDate,
  formatDate,
}: WebDatePickerProps) {
  const selected = parseDate(value) ?? new Date();
  const [month, setMonth] = React.useState(new Date(selected.getFullYear(), selected.getMonth(), 1));
  const [draft, setDraft] = React.useState(value);

  useEffect(() => {
    if (visible) {
      const next = parseDate(value) ?? new Date();
      setMonth(new Date(next.getFullYear(), next.getMonth(), 1));
      setDraft(value);
    }
  }, [parseDate, value, visible]);

  const firstDay = month.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - firstDay + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });
  const draftDate = parseDate(draft) ?? selected;
  const selectedDay = draftDate.getFullYear() === month.getFullYear() && draftDate.getMonth() === month.getMonth()
    ? draftDate.getDate()
    : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={webPickerStyles.overlay}>
        <View style={[webPickerStyles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[webPickerStyles.title, { color: palette.text }]}>{title}</Text>
          <View style={webPickerStyles.dateSummary}>
            <Text style={[webPickerStyles.summaryDate, { color: palette.text }]}>
              {draftDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={palette.muted}
              style={[webPickerStyles.keyboardInput, { color: palette.text, borderColor: palette.border }]}
              accessibilityLabel="Date keyboard entry"
            />
          </View>
          <View style={[webPickerStyles.divider, { backgroundColor: palette.border }]} />
          <View style={webPickerStyles.monthHeader}>
            <Pressable onPress={() => setMonth(new Date(month.getFullYear() - 1, month.getMonth(), 1))}>
              <Text style={[webPickerStyles.nav, { color: palette.muted }]}>‹</Text>
            </Pressable>
            <Text style={[webPickerStyles.month, { color: palette.text }]}>
              {monthNames[month.getMonth()]} {month.getFullYear()}
            </Text>
            <Pressable onPress={() => setMonth(new Date(month.getFullYear() + 1, month.getMonth(), 1))}>
              <Text style={[webPickerStyles.nav, { color: palette.muted }]}>›</Text>
            </Pressable>
          </View>
          <View style={webPickerStyles.calendarGrid}>
            {calendarDays.map((day, index) => (
              <Text key={`${day}-${index}`} style={[webPickerStyles.calendarCell, webPickerStyles.weekday, { color: palette.muted }]}>
                {day}
              </Text>
            ))}
            {cells.map((day, index) => (
              <Pressable
                key={`${month.getMonth()}-${index}`}
                disabled={day === null}
                onPress={() => {
                  if (day === null) return;
                  const next = new Date(month.getFullYear(), month.getMonth(), day);
                  setDraft(formatDate(next));
                }}
                style={[
                  webPickerStyles.calendarCell,
                  day === selectedDay && { backgroundColor: palette.blue, borderRadius: 24 },
                ]}
              >
                <Text style={{ color: day === selectedDay ? '#FFFFFF' : palette.text, fontSize: 16, fontWeight: '700' }}>
                  {day ?? ''}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={webPickerStyles.actions}>
            <Pressable onPress={onCancel}><Text style={[webPickerStyles.action, { color: palette.muted }]}>Cancel</Text></Pressable>
            <Pressable
              onPress={() => {
                if (parseDate(draft)) onSave(draft);
              }}
            >
              <Text style={[webPickerStyles.action, { color: palette.blue }]}>OK</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

type WebTimePickerProps = {
  visible: boolean;
  title: string;
  mode: 'single' | 'range';
  startTime: string;
  endTime: string;
  palette: WebPalette;
  onSave: (time: string) => void;
  onSaveRange?: (start: string, end: string) => void;
  onCancel: () => void;
  parseTime: (value: string) => Date;
  formatTime: (value: Date) => string;
};

function toClockParts(value: string) {
  const [hour = '09', minute = '00'] = value.split(':');
  const hour24 = Number(hour);
  return {
    hour: String(hour24 % 12 || 12),
    minute: Number(minute),
    period: hour24 >= 12 ? 'PM' as const : 'AM' as const,
  };
}

function fromClockParts(hour: string, minute: number, period: 'AM' | 'PM') {
  const hour12 = Number(hour);
  if (!Number.isInteger(hour12) || hour12 < 1 || hour12 > 12 || !Number.isInteger(minute) || minute < 0 || minute > 59) return null;
  return `${String((hour12 % 12) + (period === 'PM' ? 12 : 0)).padStart(2, '0')}:${formatClockMinute(minute)}`;
}

export function WebTimePicker({
  visible,
  title,
  mode,
  startTime,
  endTime,
  palette,
  onSave,
  onSaveRange,
  onCancel,
}: WebTimePickerProps) {
  const [active, setActive] = React.useState<'start' | 'end'>('start');
  const [clockPart, setClockPart] = React.useState<'hour' | 'minute'>('hour');
  const [start, setStart] = React.useState<ClockTime>(toClockParts(startTime));
  const [end, setEnd] = React.useState<ClockTime>(toClockParts(endTime));

  useEffect(() => {
    if (visible) {
      setStart(toClockParts(startTime));
      setEnd(toClockParts(endTime));
      setActive('start');
      setClockPart('hour');
    }
  }, [endTime, startTime, visible]);

  const current = active === 'start' ? start : end;
  const updateCurrent = (patch: Partial<ClockTime>) => {
    if (active === 'start') setStart((previous) => ({ ...previous, ...patch }));
    else setEnd((previous) => ({ ...previous, ...patch }));
  };
  const selectClock = (number: number) => {
    if (clockPart === 'hour') {
      updateCurrent({ hour: String(number) });
      setClockPart('minute');
    } else {
      if (active === 'start') {
        setStart((previous) => selectClockMinute(previous, number));
      } else {
        setEnd((previous) => selectClockMinute(previous, number));
      }
    }
  };
  const save = () => {
    const nextStart = fromClockParts(start.hour, start.minute, start.period);
    const nextEnd = fromClockParts(end.hour, end.minute, end.period);
    if (!nextStart || (mode === 'range' && (!nextEnd || nextEnd <= nextStart))) return;
    if (mode === 'range') onSaveRange?.(nextStart, nextEnd!);
    else onSave(nextStart);
  };
  const clockNumbers = clockPart === 'hour' ? Array.from({ length: 12 }, (_, i) => i + 1) : Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={webPickerStyles.overlay}>
        <View style={[webPickerStyles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[webPickerStyles.title, { color: palette.text }]}>{title}</Text>
          <View style={webPickerStyles.timeSummary}>
            <View style={webPickerStyles.timeInputs}>
              <TextInput
                value={current.hour}
                keyboardType="number-pad"
                onChangeText={(hour) => updateCurrent({ hour })}
                style={[webPickerStyles.largeInput, { color: palette.text, borderColor: clockPart === 'hour' ? palette.blue : palette.border }]}
              />
              <Text style={[webPickerStyles.colon, { color: palette.text }]}>:</Text>
              <TextInput
                value={formatClockMinute(current.minute)}
                keyboardType="number-pad"
                selectTextOnFocus
                onChangeText={(minuteText) => {
                  if (!/^\d{0,2}$/.test(minuteText)) return;
                  const minute = Number(minuteText);
                  if (minute <= 59) updateCurrent({ minute });
                }}
                style={[webPickerStyles.largeInput, { color: palette.text, borderColor: clockPart === 'minute' ? palette.blue : palette.border }]}
              />
            </View>
            <View>
              {(['AM', 'PM'] as const).map((period) => (
                <Pressable key={period} onPress={() => updateCurrent({ period })} style={[webPickerStyles.period, current.period === period && { backgroundColor: palette.blue }]}>
                  <Text style={{ color: current.period === period ? '#FFFFFF' : palette.text, fontWeight: '700' }}>{period}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          {mode === 'range' ? (
            <View style={webPickerStyles.rangeTabs}>
              {(['start', 'end'] as const).map((item) => (
                <Pressable key={item} onPress={() => { setActive(item); setClockPart('hour'); }} style={[webPickerStyles.rangeTab, active === item && { backgroundColor: palette.blue }]}>
                  <Text style={{ color: active === item ? '#FFFFFF' : palette.muted, fontWeight: '700' }}>{item === 'start' ? 'START' : 'END'}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <View style={[webPickerStyles.clock, { borderColor: palette.border }]}>
            <View
              style={[
                webPickerStyles.clockHand,
                {
                  backgroundColor: palette.blue,
                  transform: [{ rotate: `${(((clockPart === 'hour' ? Number(current.hour) : current.minute / 5) % 12) * 30) - 90}deg` }],
                },
              ]}
            />
            {clockNumbers.map((number, index) => {
              const angle = (index / 12) * Math.PI * 2 - Math.PI / 2;
              return (
                <Pressable
                  key={number}
                  onPress={() => selectClock(number)}
                  style={[webPickerStyles.clockNumber, {
                    left: 111 + Math.cos(angle) * 92,
                    top: 111 + Math.sin(angle) * 92,
                    backgroundColor: (clockPart === 'hour' && number === Number(current.hour)) || (clockPart === 'minute' && number === current.minute) ? palette.blue : 'transparent',
                  }]}
                >
                  <Text style={{ color: palette.text, fontSize: 16, fontWeight: '700' }}>{clockPart === 'minute' ? formatClockMinute(number) : number}</Text>
                </Pressable>
              );
            })}
            <View style={[webPickerStyles.clockCenter, { backgroundColor: palette.blue }]} />
          </View>
          <View style={webPickerStyles.actions}>
            <Pressable onPress={onCancel}><Text style={[webPickerStyles.action, { color: palette.muted }]}>Cancel</Text></Pressable>
            <Pressable onPress={save}><Text style={[webPickerStyles.action, { color: palette.blue }]}>OK</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const webPickerStyles = {
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' as const, alignItems: 'center' as const, padding: 20 },
  card: { width: '100%' as const, maxWidth: 430, borderRadius: 30, borderWidth: 1, padding: 28, gap: 18 },
  title: { fontSize: 20, fontWeight: '700' as const },
  dateSummary: { gap: 12 },
  summaryDate: { fontSize: 34, fontWeight: '500' as const },
  keyboardInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  divider: { height: 1 },
  monthHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const },
  month: { fontSize: 17, fontWeight: '700' as const },
  nav: { fontSize: 34, lineHeight: 34 },
  calendarGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const },
  calendarCell: { width: '14.2857%' as const, height: 42, alignItems: 'center' as const, justifyContent: 'center' as const },
  weekday: { fontWeight: '700' as const, fontSize: 14 },
  actions: { flexDirection: 'row' as const, justifyContent: 'flex-end' as const, gap: 30, marginTop: 6 },
  action: { fontSize: 16, fontWeight: '700' as const },
  timeSummary: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const },
  timeInputs: { flexDirection: 'row' as const, alignItems: 'center' as const },
  largeInput: { width: 70, borderWidth: 2, borderRadius: 8, padding: 4, fontSize: 38, textAlign: 'center' as const },
  colon: { fontSize: 36, marginHorizontal: 5 },
  period: { width: 58, height: 34, alignItems: 'center' as const, justifyContent: 'center' as const, borderWidth: 1, borderColor: '#CBD5E1' },
  rangeTabs: { flexDirection: 'row' as const, gap: 8 },
  rangeTab: { flex: 1, alignItems: 'center' as const, paddingVertical: 9, borderRadius: 10 },
  clock: { width: 250, height: 250, borderRadius: 125, borderWidth: 1, alignSelf: 'center' as const, position: 'relative' as const },
  clockHand: { position: 'absolute' as const, width: 88, height: 2, left: 125, top: 124, transformOrigin: 'left center' as const },
  clockNumber: { position: 'absolute' as const, width: 28, height: 28, marginLeft: -14, marginTop: -14, borderRadius: 14, alignItems: 'center' as const, justifyContent: 'center' as const },
  clockCenter: { position: 'absolute' as const, width: 10, height: 10, borderRadius: 5, left: 120, top: 120 },
};
