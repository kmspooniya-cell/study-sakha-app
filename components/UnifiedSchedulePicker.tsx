import React from 'react';
import { Pressable, Text, View } from 'react-native';

export type ScheduleOccurrence = 'Once' | 'Repeating';
export type ScheduleDateRange = 'None' | 'Term' | 'Manual';

export interface ScheduleTimeSlot {
  id: string;
  days: string[];
  startTime: string;
  endTime: string;
}

export interface UnifiedSchedule {
  occurs: ScheduleOccurrence;
  date: string;
  startTime: string;
  endTime: string;
  timeSlots: ScheduleTimeSlot[];
  dateRange: ScheduleDateRange;
  fromDate: string;
  untilDate: string;
}

export interface SchedulePalette {
  card: string;
  field: string;
  text: string;
  muted: string;
  blue: string;
  softBlue: string;
  softBlueBorder: string;
  border: string;
}

interface UnifiedSchedulePickerProps {
  value: UnifiedSchedule;
  onChange: (value: UnifiedSchedule) => void;
  palette: SchedulePalette;
  showWhenLabel?: boolean;
  openDatePicker: (title: string, value: string, onSave: (value: string) => void) => void;
  openTimePicker: (
    title: string,
    value: string,
    onSave: (value: string) => void,
    onSaveRange?: (startTime: string, endTime: string) => void,
    range?: { startTime: string; endTime: string },
  ) => void;
}

export function createDefaultSchedule(date: string): UnifiedSchedule {
  return {
    occurs: 'Once',
    date,
    startTime: '09:00',
    endTime: '10:00',
    timeSlots: [{ id: 'slot-1', days: ['Mon'], startTime: '09:00', endTime: '10:00' }],
    dateRange: 'None',
    fromDate: date,
    untilDate: date,
  };
}

function Choice({
  label,
  selected,
  palette,
  onPress,
}: {
  label: string;
  selected: boolean;
  palette: SchedulePalette;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 42,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: selected ? palette.softBlueBorder : 'transparent',
        backgroundColor: selected ? palette.softBlue : palette.field,
        paddingHorizontal: 10,
      }}
    >
      <Text style={{ color: selected ? palette.blue : palette.muted, fontSize: 13, fontWeight: '700' }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function UnifiedSchedulePicker({
  value,
  onChange,
  palette,
  showWhenLabel = true,
  openDatePicker,
  openTimePicker,
}: UnifiedSchedulePickerProps) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const updateSlot = (id: string, patch: Partial<ScheduleTimeSlot>) =>
    onChange({
      ...value,
      timeSlots: value.timeSlots.map((slot) => (slot.id === id ? { ...slot, ...patch } : slot)),
    });

  const editTime = (slot: ScheduleTimeSlot, title: string) =>
    openTimePicker(
      title,
      slot.startTime,
      (startTime) => updateSlot(slot.id, { startTime }),
      (startTime, endTime) => updateSlot(slot.id, { startTime, endTime }),
      { startTime: slot.startTime, endTime: slot.endTime },
    );

  return (
    <View style={{ gap: 12 }}>
      <View>
        {showWhenLabel ? (
          <Text style={{ color: palette.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 }}>
            WHEN
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['Once', 'Repeating'] as const).map((occurs) => (
            <Choice
              key={occurs}
              label={occurs}
              selected={value.occurs === occurs}
              palette={palette}
              onPress={() => onChange({ ...value, occurs })}
            />
          ))}
        </View>
      </View>

      {value.occurs === 'Once' ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: palette.muted, fontSize: 11, fontWeight: '700' }}>DATE</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => openDatePicker('Select date', value.date, (date) => onChange({ ...value, date }))}
            style={{ minHeight: 44, justifyContent: 'center', borderRadius: 12, backgroundColor: palette.field, paddingHorizontal: 12 }}
          >
            <Text style={{ color: palette.text, fontSize: 14 }}>{value.date || 'Select date'}</Text>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['startTime', 'endTime'] as const).map((field) => (
              <View key={field} style={{ flex: 1, gap: 6 }}>
                <Text style={{ color: palette.muted, fontSize: 11, fontWeight: '700' }}>
                  {field === 'startTime' ? 'STARTS' : 'ENDS'}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    openTimePicker(
                      field === 'startTime' ? 'Select start time' : 'Select end time',
                      value[field],
                      (time) => onChange({ ...value, [field]: time }),
                    )
                  }
                  style={{ minHeight: 44, justifyContent: 'center', borderRadius: 12, backgroundColor: palette.field, paddingHorizontal: 12 }}
                >
                  <Text style={{ color: palette.text, fontSize: 14 }}>{value[field] || 'Add time'}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {value.timeSlots.map((slot, index) => (
            <View key={slot.id} style={{ gap: 8, borderRadius: 14, borderWidth: 1, borderColor: palette.border, padding: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ flex: 1, color: palette.text, fontSize: 13, fontWeight: '700' }}>
                  Time Slot {index + 1}
                </Text>
                {index > 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove time slot ${index + 1}`}
                    onPress={() => onChange({ ...value, timeSlots: value.timeSlots.filter((item) => item.id !== slot.id) })}
                  >
                    <Text style={{ color: palette.muted, fontSize: 12, fontWeight: '700' }}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {days.map((day) => {
                  const selected = slot.days.includes(day);
                  return (
                    <Pressable
                      key={day}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() =>
                        updateSlot(slot.id, {
                          days: selected ? slot.days.filter((item) => item !== day) : [...slot.days, day],
                        })
                      }
                      style={{
                        minWidth: 38,
                        alignItems: 'center',
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: selected ? palette.softBlueBorder : 'transparent',
                        backgroundColor: selected ? palette.softBlue : palette.field,
                        paddingVertical: 6,
                      }}
                    >
                      <Text style={{ color: selected ? palette.blue : palette.muted, fontSize: 11, fontWeight: '700' }}>{day}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => editTime(slot, `Select time slot ${index + 1}`)}
                style={{ minHeight: 42, justifyContent: 'center', borderRadius: 12, backgroundColor: palette.field, paddingHorizontal: 12 }}
              >
                <Text style={{ color: palette.text, fontSize: 14 }}>
                  {slot.startTime || 'Starts'} - {slot.endTime || 'Ends'}
                </Text>
              </Pressable>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              onChange({
                ...value,
                timeSlots: [
                  ...value.timeSlots,
                  { id: `slot-${Date.now()}`, days: [], startTime: '09:00', endTime: '10:00' },
                ],
              })
            }
            style={{ minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: palette.softBlueBorder, backgroundColor: palette.softBlue }}
          >
            <Text style={{ color: palette.blue, fontSize: 13, fontWeight: '800' }}>+ Add Time Slot</Text>
          </Pressable>
        </View>
      )}

      <View>
        <Text style={{ color: palette.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 }}>
          DATE RANGE
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['None', 'Term', 'Manual'] as const).map((dateRange) => (
            <Choice
              key={dateRange}
              label={dateRange}
              selected={value.dateRange === dateRange}
              palette={palette}
              onPress={() => onChange({ ...value, dateRange })}
            />
          ))}
        </View>
      </View>
      {value.dateRange === 'Manual' ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['fromDate', 'untilDate'] as const).map((field) => (
            <View key={field} style={{ flex: 1, gap: 6 }}>
              <Text style={{ color: palette.muted, fontSize: 11, fontWeight: '700' }}>
                {field === 'fromDate' ? 'FROM' : 'UNTIL'}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => openDatePicker(field === 'fromDate' ? 'Select from date' : 'Select until date', value[field], (date) => onChange({ ...value, [field]: date }))}
                style={{ minHeight: 44, justifyContent: 'center', borderRadius: 12, backgroundColor: palette.field, paddingHorizontal: 10 }}
              >
                <Text style={{ color: palette.text, fontSize: 13 }}>{value[field] || 'Select date'}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
