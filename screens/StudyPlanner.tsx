import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Shell } from '../components/Shell';
import { useTheme } from '../lib/theme';

export type PlannerCategory = 'Tasks' | 'Classes' | 'Exams' | 'Vacations' | 'Activities';
type Occurrence = 'Once' | 'Repeating';
type DateRange = 'None' | 'Term' | 'Manual';
type LocationType = 'In Person' | 'Online';
type VacationPreset = '1 day' | '1 week' | '2 weeks' | 'Custom';

export interface PlannerItem {
  id: string;
  category: PlannerCategory;
  title: string;
  subject?: string;
  type?: string;
  teacher?: string;
  date?: string;
  time?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  occurs?: Occurrence;
  days?: string[];
  dateRange?: DateRange;
  whereType?: LocationType;
  room?: string;
  building?: string;
  seat?: string;
  notes?: string;
  daysCount?: number;
  hasCoverPhoto?: boolean;
  completed?: boolean;
}

interface TaskForm {
  title: string;
  subject: string;
  type: string;
  date: string;
  time: string;
  startTime: string;
  endTime: string;
  timeMode: 'single' | 'range';
  occurs: Occurrence;
  notes: string;
}

interface ClassForm {
  name: string;
  subject: string;
  teacher: string;
  occurs: Occurrence;
  date: string;
  days: string[];
  startTime: string;
  endTime: string;
  dateRange: DateRange;
  whereType: LocationType;
  room: string;
  building: string;
  notes: string;
}

interface ExamForm {
  name: string;
  subject: string;
  type: string;
  date: string;
  time: string;
  duration: number;
  whereType: LocationType;
  room: string;
  seat: string;
  notes: string;
}

interface VacationForm {
  name: string;
  preset: VacationPreset;
  startDate: string;
  endDate: string;
  notes: string;
  hasCoverPhoto: boolean;
}

interface ActivityForm {
  name: string;
  category: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
}

interface PickerModalState {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}

interface DateModalState {
  visible: boolean;
  title: string;
  value: string;
  error: string;
  onSave: (value: string) => void;
}

interface TimeModalState {
  visible: boolean;
  title: string;
  mode: 'single' | 'range';
  allowRange: boolean;
  startHour: string;
  startMinute: string;
  startPeriod: 'AM' | 'PM';
  endHour: string;
  endMinute: string;
  endPeriod: 'AM' | 'PM';
  error: string;
  onSave: (value: string) => void;
  onSaveRange?: (startTime: string, endTime: string) => void;
}

interface Palette {
  background: string;
  card: string;
  field: string;
  text: string;
  muted: string;
  placeholder: string;
  border: string;
  blue: string;
  softBlue: string;
  softBlueBorder: string;
  dark: boolean;
}

const SUBJECTS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'CS',
  'English',
  'Computer Science',
  'English Literature',
  'History & Civics',
  'Geography',
  'Economics',
];
const TASK_TYPES = ['Assignment', 'Homework', 'Revision', 'Project', 'Reading', 'Lab Work'];
const EXAM_TYPES = ['Exam', 'Quiz', 'Midterm', 'Final', 'Unit Test', 'Practical'];
const ACTIVITY_TYPES = [
  'Sports & Fitness',
  'Music & Arts',
  'Coding Club',
  'Volunteering',
  'Personal Hobby',
];
const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TABS: { id: PlannerCategory; label: string; pro?: boolean }[] = [
  { id: 'Tasks', label: 'Tasks' },
  { id: 'Classes', label: 'Classes' },
  { id: 'Exams', label: 'Exams' },
  { id: 'Vacations', label: 'Vacations' },
  { id: 'Activities', label: 'Activities', pro: true },
];

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function addDays(value: string, days: number): string {
  const date = parseLocalDate(value) ?? new Date();
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

function formatDate(value: string): string {
  const date = parseLocalDate(value);
  if (!date) return 'Select date';
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatTime(value: string): string {
  const [hourText, minuteText = '00'] = value.split(':');
  const hour = Number(hourText);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return 'Add time';
  const period = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${minuteText} ${period}`;
}

function timeToMinutes(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function to24HourTime(hourText: string, minuteText: string, period: 'AM' | 'PM'): string | null {
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (
    !Number.isInteger(hour) ||
    hour < 1 ||
    hour > 12 ||
    !Number.isInteger(minute) ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }
  const hour24 = (hour % 12) + (period === 'PM' ? 12 : 0);
  return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function getTimeParts(value: string) {
  const [hourText = '09', minuteText = '00'] = value.split(':');
  const hour24 = Number(hourText);
  return {
    hour: String(hour24 % 12 || 12).padStart(2, '0'),
    minute: minuteText,
    period: hour24 >= 12 ? 'PM' as const : 'AM' as const,
  };
}

function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

function getQuickDates() {
  const today = formatLocalDate(new Date());
  const daysUntilMonday = ((8 - new Date().getDay()) % 7) || 7;
  return [
    { label: 'Today', value: today },
    { label: 'Tomorrow', value: addDays(today, 1) },
    { label: 'Next Mon', value: addDays(today, daysUntilMonday) },
    { label: 'Next Week', value: addDays(today, 7) },
  ];
}

function FieldLabel({ children, palette }: { children: React.ReactNode; palette: Palette }) {
  return <Text style={[styles.fieldLabel, { color: palette.muted }]}>{children}</Text>;
}

function SoftInput({
  value,
  onChangeText,
  placeholder,
  palette,
  multiline = false,
  accessibilityLabel,
  keyboardType,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  palette: Palette;
  multiline?: boolean;
  accessibilityLabel?: string;
  keyboardType?: 'default' | 'number-pad';
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={palette.placeholder}
      accessibilityLabel={accessibilityLabel}
      keyboardType={keyboardType}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      style={[
        multiline ? styles.textArea : styles.textInput,
        { backgroundColor: palette.field, color: palette.text },
      ]}
    />
  );
}

function PlannerSelect({
  value,
  placeholder = 'Select',
  palette,
  onPress,
}: {
  value: string;
  placeholder?: string;
  palette: Palette;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.select, { backgroundColor: palette.field }]}
    >
      <Text
        numberOfLines={1}
        style={[styles.inputText, { color: value ? palette.text : palette.placeholder }]}
      >
        {value || placeholder}
      </Text>
      <Ionicons name="chevron-down" size={18} color={palette.muted} />
    </Pressable>
  );
}

function DateButton({
  value,
  palette,
  onPress,
  soft = false,
}: {
  value: string;
  palette: Palette;
  onPress: () => void;
  soft?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.dateButton,
        {
          backgroundColor: soft ? palette.softBlue : palette.field,
          borderColor: soft ? palette.softBlueBorder : 'transparent',
        },
      ]}
    >
      <Text style={[styles.inputText, { color: soft ? palette.blue : palette.text }]}>
        {formatDate(value)}
      </Text>
    </Pressable>
  );
}

function TimeButton({
  value,
  displayValue,
  palette,
  onPress,
  icon = false,
}: {
  value: string;
  displayValue?: string;
  palette: Palette;
  onPress: () => void;
  icon?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.dateButton, styles.timeButton, { backgroundColor: palette.field }]}
    >
      {icon ? <Ionicons name="time-outline" size={17} color={palette.muted} /> : null}
      <Text style={[styles.inputText, { color: palette.text }]}>
        {displayValue || (value ? formatTime(value) : 'Add time')}
      </Text>
    </Pressable>
  );
}

function TimeEntryGroup({
  label,
  hour,
  minute,
  period,
  palette,
  onHourChange,
  onMinuteChange,
  onPeriodChange,
}: {
  label: string;
  hour: string;
  minute: string;
  period: 'AM' | 'PM';
  palette: Palette;
  onHourChange: (value: string) => void;
  onMinuteChange: (value: string) => void;
  onPeriodChange: (value: 'AM' | 'PM') => void;
}) {
  return (
    <View style={styles.timeEntryGroup}>
      <FieldLabel palette={palette}>{label}</FieldLabel>
      <View style={styles.timeEntryRow}>
        <View style={styles.timeEntry}>
          <SoftInput
            value={hour}
            onChangeText={(value) => onHourChange(value.replace(/\D/g, '').slice(0, 2))}
            palette={palette}
            keyboardType="number-pad"
            accessibilityLabel={`${label} hour`}
          />
        </View>
        <View style={styles.timeEntry}>
          <SoftInput
            value={minute}
            onChangeText={(value) => onMinuteChange(value.replace(/\D/g, '').slice(0, 2))}
            palette={palette}
            keyboardType="number-pad"
            accessibilityLabel={`${label} minute`}
          />
        </View>
        <View style={styles.periodPicker}>
          {(['AM', 'PM'] as const).map((value) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: period === value }}
              onPress={() => onPeriodChange(value)}
              style={[
                styles.periodButton,
                { backgroundColor: period === value ? palette.blue : palette.field },
              ]}
            >
              <Text style={[styles.periodText, { color: period === value ? '#FFFFFF' : palette.muted }]}>
                {value}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

function ChoicePill({
  label,
  selected,
  palette,
  onPress,
  variant = 'blue',
  crown = false,
}: {
  label: string;
  selected: boolean;
  palette: Palette;
  onPress: () => void;
  variant?: 'blue' | 'soft' | 'outline';
  crown?: boolean;
}) {
  const selectedStyle =
    variant === 'soft'
      ? { backgroundColor: palette.softBlue, borderColor: palette.softBlueBorder }
      : variant === 'outline'
        ? { backgroundColor: palette.card, borderColor: palette.blue }
        : { backgroundColor: palette.blue, borderColor: palette.blue };
  const unselectedStyle =
    variant === 'soft'
      ? { backgroundColor: palette.field, borderColor: 'transparent' }
      : variant === 'outline'
        ? { backgroundColor: palette.card, borderColor: palette.blue }
        : { backgroundColor: palette.field, borderColor: 'transparent' };
  const color =
    selected && variant === 'blue'
      ? '#FFFFFF'
      : variant === 'outline' || (selected && variant === 'soft')
        ? palette.blue
        : palette.muted;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.choicePill,
        selected ? selectedStyle : unselectedStyle,
        variant === 'outline' && styles.outlineChoice,
      ]}
    >
      <Text style={[styles.choiceText, { color }]}>{label}</Text>
      {crown ? (
        <MaterialCommunityIcons
          name="crown"
          size={13}
          color={selected && variant === 'blue' ? '#FFFFFF' : palette.blue}
        />
      ) : null}
    </Pressable>
  );
}

function SectionCard({
  title,
  children,
  palette,
}: {
  title: string;
  children: React.ReactNode;
  palette: Palette;
}) {
  return (
    <View style={[styles.sectionCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <FieldLabel palette={palette}>{title}</FieldLabel>
      {children}
    </View>
  );
}

export default function StudyPlanner() {
  const { colors: themeColors, scheme } = useTheme();
  const { width } = useWindowDimensions();
  const today = useMemo(() => formatLocalDate(new Date()), []);
  const isDark = scheme === 'dark';
  const palette: Palette = {
    background: isDark ? themeColors.bg : width >= 768 ? '#F8FAFC' : '#FFFFFF',
    card: isDark ? themeColors.surface : '#FFFFFF',
    field: isDark ? themeColors.surfaceAlt : '#F2F4F7',
    text: isDark ? themeColors.text : '#1E293B',
    muted: isDark ? themeColors.textMuted : '#717E95',
    placeholder: isDark ? themeColors.textFaint : '#9CA3AF',
    border: isDark ? themeColors.border : '#E6E9EE',
    blue: '#3B82F6',
    softBlue: isDark ? 'rgba(59,130,246,0.18)' : '#EBF4FE',
    softBlueBorder: isDark ? 'rgba(59,130,246,0.5)' : '#99C7F7',
    dark: isDark,
  };

  const [activeTab, setActiveTab] = useState<PlannerCategory>('Tasks');
  const [currentScreen, setCurrentScreen] = useState<'create' | 'schedule'>('create');
  const [freeTasksRemaining, setFreeTasksRemaining] = useState(6);
  const [isPremium, setIsPremium] = useState(false);
  const [savedItems, setSavedItems] = useState<PlannerItem[]>([]);
  const [taskForm, setTaskForm] = useState<TaskForm>({
    title: '',
    subject: '',
    type: '',
    date: today,
    time: '',
    startTime: '',
    endTime: '',
    timeMode: 'single',
    occurs: 'Once',
    notes: '',
  });
  const [classForm, setClassForm] = useState<ClassForm>({
    name: '',
    subject: '',
    teacher: '',
    occurs: 'Once',
    date: today,
    days: ['Mon', 'Wed', 'Fri'],
    startTime: '13:30',
    endTime: '14:30',
    dateRange: 'None',
    whereType: 'In Person',
    room: '',
    building: '',
    notes: '',
  });
  const [examForm, setExamForm] = useState<ExamForm>({
    name: '',
    subject: '',
    type: 'Exam',
    date: today,
    time: '10:00',
    duration: 60,
    whereType: 'In Person',
    room: '',
    seat: '',
    notes: '',
  });
  const [vacationForm, setVacationForm] = useState<VacationForm>({
    name: '',
    preset: '1 day',
    startDate: today,
    endDate: today,
    notes: '',
    hasCoverPhoto: false,
  });
  const [activityForm, setActivityForm] = useState<ActivityForm>({
    name: '',
    category: ACTIVITY_TYPES[0],
    date: today,
    startTime: '16:00',
    endTime: '17:00',
    notes: '',
  });
  const [pickerModal, setPickerModal] = useState<PickerModalState>({
    visible: false,
    title: '',
    options: [],
    selected: '',
    onSelect: () => undefined,
  });
  const [dateModal, setDateModal] = useState<DateModalState>({
    visible: false,
    title: '',
    value: today,
    error: '',
    onSave: () => undefined,
  });
  const [timeModal, setTimeModal] = useState<TimeModalState>({
    visible: false,
    title: '',
    mode: 'single',
    allowRange: false,
    startHour: '09',
    startMinute: '00',
    startPeriod: 'AM',
    endHour: '10',
    endMinute: '00',
    endPeriod: 'AM',
    error: '',
    onSave: () => undefined,
  });
  const [proModal, setProModal] = useState({ visible: false, feature: '' });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idCounter = useRef(0);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  const showStatus = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setStatusMessage(message);
    toastTimer.current = setTimeout(() => setStatusMessage(null), 2600);
  };

  const newId = () => {
    idCounter.current += 1;
    return `planner-${Date.now()}-${idCounter.current}`;
  };

  const openPicker = (
    title: string,
    options: string[],
    selected: string,
    onSelect: (value: string) => void
  ) => setPickerModal({ visible: true, title, options, selected, onSelect });

  const openDatePicker = (title: string, value: string, onSave: (value: string) => void) => {
    setDateModal({ visible: true, title, value, error: '', onSave });
  };

  const openTimePicker = (
    title: string,
    value: string,
    onSave: (value: string) => void,
    onSaveRange?: (startTime: string, endTime: string) => void,
    range?: { startTime: string; endTime: string }
  ) => {
    const startParts = getTimeParts(range?.startTime || value);
    const endParts = getTimeParts(
      range?.endTime ||
        (() => {
          const startMinutes = timeToMinutes(range?.startTime || value) ?? 16 * 60;
          const suggestedEnd = Math.min(startMinutes + 60, 23 * 60 + 59);
          return `${String(Math.floor(suggestedEnd / 60)).padStart(2, '0')}:${String(suggestedEnd % 60).padStart(2, '0')}`;
        })()
    );
    setTimeModal({
      visible: true,
      title,
      mode: range?.startTime && range.endTime ? 'range' : 'single',
      allowRange: Boolean(onSaveRange),
      startHour: startParts.hour,
      startMinute: startParts.minute,
      startPeriod: startParts.period,
      endHour: endParts.hour,
      endMinute: endParts.minute,
      endPeriod: endParts.period,
      error: '',
      onSave,
      onSaveRange,
    });
  };

  const daysInVacation = useMemo(() => {
    const start = parseLocalDate(vacationForm.startDate);
    const end = parseLocalDate(vacationForm.endDate);
    if (!start || !end || end < start) return 0;
    const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
    return Math.floor((endUtc - startUtc) / 86400000) + 1;
  }, [vacationForm.startDate, vacationForm.endDate]);

  const selectVacationPreset = (preset: VacationPreset) => {
    if (preset === 'Custom') {
      setVacationForm((current) => ({ ...current, preset }));
      return;
    }
    const duration = preset === '1 day' ? 1 : preset === '1 week' ? 7 : 14;
    setVacationForm((current) => ({
      ...current,
      preset,
      endDate: addDays(current.startDate, duration - 1),
    }));
  };

  const clearActiveForm = () => {
    if (activeTab === 'Tasks') {
      setTaskForm({
        title: '',
        subject: '',
        type: '',
        date: today,
        time: '',
        startTime: '',
        endTime: '',
        timeMode: 'single',
        occurs: 'Once',
        notes: '',
      });
    } else if (activeTab === 'Classes') {
      setClassForm({
        name: '',
        subject: '',
        teacher: '',
        occurs: 'Once',
        date: today,
        days: [],
        startTime: '13:30',
        endTime: '14:30',
        dateRange: 'None',
        whereType: 'In Person',
        room: '',
        building: '',
        notes: '',
      });
    } else if (activeTab === 'Exams') {
      setExamForm({
        name: '',
        subject: '',
        type: 'Exam',
        date: today,
        time: '10:00',
        duration: 60,
        whereType: 'In Person',
        room: '',
        seat: '',
        notes: '',
      });
    } else if (activeTab === 'Vacations') {
      setVacationForm({
        name: '',
        preset: '1 day',
        startDate: today,
        endDate: today,
        notes: '',
        hasCoverPhoto: false,
      });
    } else {
      setActivityForm({
        name: '',
        category: ACTIVITY_TYPES[0],
        date: today,
        startTime: '16:00',
        endTime: '17:00',
        notes: '',
      });
    }
  };

  const saveItem = () => {
    let item: PlannerItem;
    let successMessage: string;

    if (activeTab === 'Tasks') {
      if (!taskForm.title.trim()) {
        showStatus('Please enter a task title.');
        return;
      }
      if (!parseLocalDate(taskForm.date)) {
        showStatus('Choose a valid due date.');
        return;
      }
      if (!isPremium && freeTasksRemaining <= 0) {
        setProModal({ visible: true, feature: 'Unlimited Tasks' });
        return;
      }
      item = {
        id: newId(),
        category: 'Tasks',
        title: taskForm.title.trim(),
        subject: taskForm.subject || 'General',
        type: taskForm.type || 'Task',
        date: taskForm.date,
        time: taskForm.timeMode === 'single' ? taskForm.time || undefined : undefined,
        startTime: taskForm.timeMode === 'range' ? taskForm.startTime : undefined,
        endTime: taskForm.timeMode === 'range' ? taskForm.endTime : undefined,
        occurs: taskForm.occurs,
        notes: taskForm.notes.trim(),
        completed: false,
      };
      successMessage = 'Task saved successfully.';
    } else if (activeTab === 'Classes') {
      if (!classForm.name.trim()) {
        showStatus('Please enter a class name.');
        return;
      }
      if (!parseLocalDate(classForm.date)) {
        showStatus('Choose a valid class date.');
        return;
      }
      item = {
        id: newId(),
        category: 'Classes',
        title: classForm.name.trim(),
        subject: classForm.subject || 'General',
        teacher: classForm.teacher.trim(),
        occurs: classForm.occurs,
        date: classForm.date,
        days: classForm.occurs === 'Repeating' ? classForm.days : undefined,
        startTime: classForm.startTime,
        endTime: classForm.endTime || undefined,
        dateRange: classForm.dateRange,
        whereType: classForm.whereType,
        room: classForm.whereType === 'In Person' ? classForm.room.trim() : undefined,
        building: classForm.whereType === 'In Person' ? classForm.building.trim() : undefined,
        notes: classForm.notes.trim(),
      };
      successMessage = 'Class saved successfully.';
    } else if (activeTab === 'Exams') {
      if (!examForm.name.trim()) {
        showStatus('Please enter an exam name.');
        return;
      }
      if (!parseLocalDate(examForm.date)) {
        showStatus('Choose a valid exam date.');
        return;
      }
      item = {
        id: newId(),
        category: 'Exams',
        title: examForm.name.trim(),
        subject: examForm.subject || 'General',
        type: examForm.type,
        date: examForm.date,
        time: examForm.time,
        duration: examForm.duration,
        whereType: examForm.whereType,
        room: examForm.whereType === 'In Person' ? examForm.room.trim() : undefined,
        seat: examForm.whereType === 'In Person' ? examForm.seat.trim() : undefined,
        notes: examForm.notes.trim(),
      };
      successMessage = 'Exam saved successfully.';
    } else if (activeTab === 'Vacations') {
      const start = parseLocalDate(vacationForm.startDate);
      const end = parseLocalDate(vacationForm.endDate);
      if (!vacationForm.name.trim()) {
        showStatus('Please enter a vacation name.');
        return;
      }
      if (!start || !end || end < start) {
        showStatus('Choose a valid vacation date range.');
        return;
      }
      item = {
        id: newId(),
        category: 'Vacations',
        title: vacationForm.name.trim(),
        date: vacationForm.startDate,
        endDate: vacationForm.endDate,
        daysCount: daysInVacation,
        notes: vacationForm.notes.trim(),
        hasCoverPhoto: vacationForm.hasCoverPhoto,
      };
      successMessage = 'Vacation saved successfully.';
    } else {
      if (!activityForm.name.trim()) {
        showStatus('Please enter an activity name.');
        return;
      }
      if (!parseLocalDate(activityForm.date)) {
        showStatus('Choose a valid activity date.');
        return;
      }
      item = {
        id: newId(),
        category: 'Activities',
        title: activityForm.name.trim(),
        type: activityForm.category,
        date: activityForm.date,
        startTime: activityForm.startTime,
        endTime: activityForm.endTime || undefined,
        notes: activityForm.notes.trim(),
      };
      successMessage = 'Activity saved successfully.';
    }

    setSavedItems((items) => [item, ...items]);
    if (activeTab === 'Tasks' && !isPremium) {
      setFreeTasksRemaining((remaining) => Math.max(0, remaining - 1));
    }
    clearActiveForm();
    showStatus(successMessage);
  };

  const title =
    activeTab === 'Tasks'
      ? 'New Task'
      : activeTab === 'Classes'
        ? 'New Class'
        : activeTab === 'Exams'
          ? 'New Exam'
          : activeTab === 'Vacations'
            ? 'New Vacation'
            : 'New Activity';

  const dateOptions = getQuickDates();
  const rangeStartValue = to24HourTime(
    timeModal.startHour,
    timeModal.startMinute,
    timeModal.startPeriod
  );
  const rangeEndValue = to24HourTime(
    timeModal.endHour,
    timeModal.endMinute,
    timeModal.endPeriod
  );
  const rangeValidationError =
    timeModal.mode === 'range' &&
    rangeStartValue &&
    rangeEndValue &&
    (timeToMinutes(rangeEndValue) ?? 0) <= (timeToMinutes(rangeStartValue) ?? 0)
      ? 'End time must be after start time.'
      : '';

  const renderLocationToggles = (value: LocationType, setValue: (value: LocationType) => void) => (
    <View style={styles.pillRow}>
      {(['In Person', 'Online'] as const).map((option) => (
        <ChoicePill
          key={option}
          label={option}
          selected={value === option}
          palette={palette}
          variant="outline"
          onPress={() => setValue(option)}
        />
      ))}
    </View>
  );

  return (
    <Shell
      active="StudyPlanner"
      title="Study Planner"
      subtitle="Plan your tasks, classes, exams and activities"
      scroll={false}
      contentPadding={0}
    >
      <View style={[styles.root, { backgroundColor: palette.background }]}>
        <ScrollView
          contentContainerStyle={[
            styles.page,
            width >= 768 && styles.desktopPage,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ width: '100%', maxWidth: 620, flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setCurrentScreen('create')}
              style={({ pressed }) => ({
                minHeight: 40,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                borderRadius: 12,
                paddingHorizontal: 10,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons name="add-circle-outline" size={17} color={palette.blue} />
              <Text style={{ color: palette.blue, fontSize: 13, fontWeight: '700' }}>Add New</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setCurrentScreen('schedule')}
              style={({ pressed }) => ({
                minHeight: 40,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                borderRadius: 12,
                paddingHorizontal: 10,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons name="calendar-outline" size={16} color={palette.muted} />
              <Text style={{ color: palette.muted, fontSize: 13, fontWeight: '700' }}>
                Schedule ({savedItems.length})
              </Text>
            </Pressable>
          </View>

          {currentScreen === 'create' ? (
          <View
            style={[
              styles.formSheet,
              {
                backgroundColor: palette.card,
                borderColor: width >= 768 ? palette.border : 'transparent',
              },
              width >= 768 && styles.desktopSheet,
            ]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabBar}
              style={[styles.tabBarOuter, { backgroundColor: palette.field }]}
            >
              {TABS.map((tab) => {
                const selected = activeTab === tab.id;
                return (
                  <Pressable
                    key={tab.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      if (tab.pro && !isPremium) {
                        setProModal({
                          visible: true,
                          feature: 'Activities & Extracurriculars Planner',
                        });
                      } else {
                        setActiveTab(tab.id);
                      }
                    }}
                    style={[
                      styles.tab,
                      selected && styles.activeTab,
                      selected && {
                        shadowColor: '#000000',
                        shadowOpacity: 0.08,
                        shadowRadius: 4,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: 2,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        { color: selected ? palette.text : palette.muted },
                        selected && styles.activeTabText,
                      ]}
                    >
                      {tab.label}
                    </Text>
                    {tab.pro ? <MaterialCommunityIcons name="crown" size={13} color={palette.blue} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={[styles.screenTitle, { color: palette.text }]}>{title}</Text>

            {activeTab === 'Tasks' ? (
              <View style={styles.form}>
                <SoftInput
                  value={taskForm.title}
                  onChangeText={(value) => setTaskForm((form) => ({ ...form, title: value }))}
                  placeholder="Task Title"
                  palette={palette}
                  accessibilityLabel="Task title"
                />
                <View>
                  <FieldLabel palette={palette}>SUBJECT</FieldLabel>
                  <PlannerSelect
                    value={taskForm.subject}
                    placeholder="Select subject"
                    palette={palette}
                    onPress={() =>
                      openPicker('Select Subject', SUBJECTS, taskForm.subject, (subject) =>
                        setTaskForm((form) => ({ ...form, subject }))
                      )
                    }
                  />
                </View>
                <View>
                  <FieldLabel palette={palette}>TYPE (OPTIONAL)</FieldLabel>
                  <PlannerSelect
                    value={taskForm.type}
                    placeholder="Task type"
                    palette={palette}
                    onPress={() =>
                      openPicker('Select Task Type', TASK_TYPES, taskForm.type, (type) =>
                        setTaskForm((form) => ({ ...form, type }))
                      )
                    }
                  />
                </View>
                <View>
                  <FieldLabel palette={palette}>DUE DATE</FieldLabel>
                  <View style={styles.pillRow}>
                    <DateButton
                      value={taskForm.date}
                      palette={palette}
                      onPress={() =>
                        openDatePicker('Select Due Date', taskForm.date, (date) =>
                          setTaskForm((form) => ({ ...form, date }))
                        )
                      }
                    />
                    <TimeButton
                      value={taskForm.time}
                      displayValue={
                        taskForm.timeMode === 'range' && taskForm.startTime && taskForm.endTime
                          ? formatTimeRange(taskForm.startTime, taskForm.endTime)
                          : undefined
                      }
                      palette={palette}
                      icon
                      onPress={() => {
                        openTimePicker(
                          'Add Due Time',
                          taskForm.time || taskForm.startTime || '17:00',
                          (time) => {
                            setTaskForm((form) => ({
                              ...form,
                              time,
                              startTime: '',
                              endTime: '',
                              timeMode: 'single',
                            }));
                          },
                          (startTime, endTime) =>
                            setTaskForm((form) => ({
                              ...form,
                              time: '',
                              startTime,
                              endTime,
                              timeMode: 'range',
                            })),
                          taskForm.timeMode === 'range'
                            ? { startTime: taskForm.startTime, endTime: taskForm.endTime }
                            : undefined
                        );
                      }}
                    />
                  </View>
                </View>
                <View>
                  <FieldLabel palette={palette}>OCCURS</FieldLabel>
                  <View style={styles.pillRow}>
                    <ChoicePill
                      label="Once"
                      selected={taskForm.occurs === 'Once'}
                      palette={palette}
                      onPress={() => setTaskForm((form) => ({ ...form, occurs: 'Once' }))}
                    />
                    <ChoicePill
                      label="Repeating"
                      selected={taskForm.occurs === 'Repeating'}
                      palette={palette}
                      crown
                      onPress={() => {
                        if (!isPremium) {
                          setProModal({ visible: true, feature: 'Repeating Tasks' });
                        } else {
                          setTaskForm((form) => ({ ...form, occurs: 'Repeating' }));
                        }
                      }}
                    />
                  </View>
                </View>
                <View>
                  <FieldLabel palette={palette}>DETAILS</FieldLabel>
                  <SoftInput
                    value={taskForm.notes}
                    onChangeText={(value) => setTaskForm((form) => ({ ...form, notes: value }))}
                    placeholder="Add notes..."
                    palette={palette}
                    multiline
                    accessibilityLabel="Task details"
                  />
                </View>
              </View>
            ) : null}

            {activeTab === 'Classes' ? (
              <View style={styles.form}>
                <View>
                  <FieldLabel palette={palette}>CLASS NAME</FieldLabel>
                  <SoftInput
                    value={classForm.name}
                    onChangeText={(value) => setClassForm((form) => ({ ...form, name: value }))}
                    placeholder="Class Name"
                    palette={palette}
                    accessibilityLabel="Class name"
                  />
                </View>
                <View style={styles.columns}>
                  <View style={styles.column}>
                    <FieldLabel palette={palette}>SUBJECT</FieldLabel>
                    <PlannerSelect
                      value={classForm.subject}
                      placeholder="Select subject"
                      palette={palette}
                      onPress={() =>
                        openPicker('Select Subject', SUBJECTS, classForm.subject, (subject) =>
                          setClassForm((form) => ({ ...form, subject }))
                        )
                      }
                    />
                  </View>
                  <View style={styles.column}>
                    <FieldLabel palette={palette}>TEACHER</FieldLabel>
                    <SoftInput
                      value={classForm.teacher}
                      onChangeText={(value) => setClassForm((form) => ({ ...form, teacher: value }))}
                      placeholder="Teacher"
                      palette={palette}
                    />
                  </View>
                </View>

                <SectionCard title="WHEN" palette={palette}>
                  <View style={styles.pillRow}>
                    {(['Once', 'Repeating'] as const).map((option) => (
                      <ChoicePill
                        key={option}
                        label={option}
                        selected={classForm.occurs === option}
                        palette={palette}
                        variant="soft"
                        onPress={() =>
                          setClassForm((form) => ({ ...form, occurs: option }))
                        }
                      />
                    ))}
                  </View>
                  {classForm.occurs === 'Repeating' ? (
                    <View style={styles.dayRow}>
                      {DAYS_OF_WEEK.map((day) => {
                        const selected = classForm.days.includes(day);
                        return (
                          <Pressable
                            key={day}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            onPress={() =>
                              setClassForm((form) => ({
                                ...form,
                                days: selected
                                  ? form.days.filter((item) => item !== day)
                                  : [...form.days, day],
                              }))
                            }
                            style={[
                              styles.dayButton,
                              {
                                backgroundColor: selected ? palette.softBlue : palette.field,
                                borderColor: selected ? palette.softBlueBorder : 'transparent',
                              },
                            ]}
                          >
                            <Text style={[styles.smallChoiceText, { color: selected ? palette.blue : palette.muted }]}>
                              {day}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
                  <View>
                    <FieldLabel palette={palette}>DATE &amp; TIME</FieldLabel>
                    <View style={styles.pillRow}>
                      <DateButton
                        value={classForm.date}
                        palette={palette}
                        onPress={() =>
                          openDatePicker('Select Class Date', classForm.date, (date) =>
                            setClassForm((form) => ({ ...form, date }))
                          )
                        }
                      />
                      <TimeButton
                        value={classForm.startTime}
                        displayValue={
                          classForm.endTime
                            ? formatTimeRange(classForm.startTime, classForm.endTime)
                            : undefined
                        }
                        palette={palette}
                        icon
                        onPress={() =>
                          openTimePicker(
                            'Select Class Time',
                            classForm.startTime,
                            (startTime) =>
                              setClassForm((form) => ({ ...form, startTime, endTime: '' })),
                            (startTime, endTime) =>
                              setClassForm((form) => ({ ...form, startTime, endTime })),
                            classForm.endTime
                              ? { startTime: classForm.startTime, endTime: classForm.endTime }
                              : undefined
                          )
                        }
                      />
                    </View>
                  </View>
                  <View>
                    <FieldLabel palette={palette}>DATE RANGE</FieldLabel>
                    <View style={styles.threeColumns}>
                      {(['None', 'Term', 'Manual'] as const).map((option) => (
                        <ChoicePill
                          key={option}
                          label={option}
                          selected={classForm.dateRange === option}
                          palette={palette}
                          variant="soft"
                          onPress={() =>
                            setClassForm((form) => ({ ...form, dateRange: option }))
                          }
                        />
                      ))}
                    </View>
                  </View>
                </SectionCard>

                <SectionCard title="WHERE" palette={palette}>
                  {renderLocationToggles(classForm.whereType, (whereType) =>
                    setClassForm((form) => ({ ...form, whereType }))
                  )}
                  {classForm.whereType === 'In Person' ? (
                    <>
                      <View>
                        <FieldLabel palette={palette}>ROOM</FieldLabel>
                        <SoftInput
                          value={classForm.room}
                          onChangeText={(value) => setClassForm((form) => ({ ...form, room: value }))}
                          placeholder="Room 204, Building A"
                          palette={palette}
                        />
                      </View>
                      <View>
                        <FieldLabel palette={palette}>BUILDING</FieldLabel>
                        <SoftInput
                          value={classForm.building}
                          onChangeText={(value) =>
                            setClassForm((form) => ({ ...form, building: value }))
                          }
                          placeholder="Building"
                          palette={palette}
                        />
                      </View>
                    </>
                  ) : null}
                </SectionCard>
                <View>
                  <FieldLabel palette={palette}>NOTES</FieldLabel>
                  <SoftInput
                    value={classForm.notes}
                    onChangeText={(value) => setClassForm((form) => ({ ...form, notes: value }))}
                    placeholder="Add a reminder..."
                    palette={palette}
                    multiline
                    accessibilityLabel="Class notes"
                  />
                </View>
              </View>
            ) : null}

            {activeTab === 'Exams' ? (
              <View style={styles.form}>
                <View>
                  <FieldLabel palette={palette}>EXAM NAME</FieldLabel>
                  <SoftInput
                    value={examForm.name}
                    onChangeText={(value) => setExamForm((form) => ({ ...form, name: value }))}
                    placeholder="Exam Name"
                    palette={palette}
                    accessibilityLabel="Exam name"
                  />
                </View>
                <View style={styles.columns}>
                  <View style={styles.column}>
                    <FieldLabel palette={palette}>SUBJECT</FieldLabel>
                    <PlannerSelect
                      value={examForm.subject}
                      placeholder="Select subject"
                      palette={palette}
                      onPress={() =>
                        openPicker('Select Subject', SUBJECTS, examForm.subject, (subject) =>
                          setExamForm((form) => ({ ...form, subject }))
                        )
                      }
                    />
                  </View>
                  <View style={styles.column}>
                    <FieldLabel palette={palette}>TYPE</FieldLabel>
                    <PlannerSelect
                      value={examForm.type}
                      palette={palette}
                      onPress={() =>
                        openPicker('Select Exam Type', EXAM_TYPES, examForm.type, (type) =>
                          setExamForm((form) => ({ ...form, type }))
                        )
                      }
                    />
                  </View>
                </View>
                <SectionCard title="WHEN" palette={palette}>
                  <View style={styles.columns}>
                    <View style={styles.column}>
                      <FieldLabel palette={palette}>DATE</FieldLabel>
                      <DateButton
                        value={examForm.date}
                        palette={palette}
                        onPress={() =>
                          openDatePicker('Select Exam Date', examForm.date, (date) =>
                            setExamForm((form) => ({ ...form, date }))
                          )
                        }
                      />
                    </View>
                    <View style={styles.column}>
                      <FieldLabel palette={palette}>TIME</FieldLabel>
                      <TimeButton
                        value={examForm.time}
                        palette={palette}
                        onPress={() =>
                          openTimePicker('Select Exam Time', examForm.time, (time) =>
                            setExamForm((form) => ({ ...form, time }))
                          )
                        }
                      />
                    </View>
                  </View>
                  <View>
                    <FieldLabel palette={palette}>DURATION</FieldLabel>
                    <View style={styles.stepperRow}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Decrease duration"
                        onPress={() =>
                          setExamForm((form) => ({
                            ...form,
                            duration: Math.max(15, form.duration - 15),
                          }))
                        }
                        style={[styles.stepperButton, { backgroundColor: '#15192C' }]}
                      >
                        <Ionicons name="remove" size={20} color="#FFFFFF" />
                      </Pressable>
                      <Text style={[styles.durationText, { color: palette.text }]}>
                        {examForm.duration} min
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Increase duration"
                        onPress={() =>
                          setExamForm((form) => ({ ...form, duration: form.duration + 15 }))
                        }
                        style={[styles.stepperButton, { backgroundColor: palette.field }]}
                      >
                        <Ionicons name="add" size={20} color={palette.text} />
                      </Pressable>
                    </View>
                  </View>
                </SectionCard>
                <SectionCard title="WHERE" palette={palette}>
                  {renderLocationToggles(examForm.whereType, (whereType) =>
                    setExamForm((form) => ({ ...form, whereType }))
                  )}
                  {examForm.whereType === 'In Person' ? (
                    <View style={styles.columns}>
                      <View style={styles.column}>
                        <FieldLabel palette={palette}>ROOM</FieldLabel>
                        <SoftInput
                          value={examForm.room}
                          onChangeText={(value) => setExamForm((form) => ({ ...form, room: value }))}
                          placeholder="Room"
                          palette={palette}
                        />
                      </View>
                      <View style={styles.column}>
                        <FieldLabel palette={palette}>SEAT #</FieldLabel>
                        <SoftInput
                          value={examForm.seat}
                          onChangeText={(value) => setExamForm((form) => ({ ...form, seat: value }))}
                          placeholder="Seat #"
                          palette={palette}
                        />
                      </View>
                    </View>
                  ) : null}
                </SectionCard>
                <View>
                  <FieldLabel palette={palette}>NOTES</FieldLabel>
                  <SoftInput
                    value={examForm.notes}
                    onChangeText={(value) => setExamForm((form) => ({ ...form, notes: value }))}
                    placeholder="Add notes..."
                    palette={palette}
                    multiline
                    accessibilityLabel="Exam notes"
                  />
                </View>
              </View>
            ) : null}

            {activeTab === 'Vacations' ? (
              <View style={styles.form}>
                <View>
                  <FieldLabel palette={palette}>NAME</FieldLabel>
                  <SoftInput
                    value={vacationForm.name}
                    onChangeText={(value) => setVacationForm((form) => ({ ...form, name: value }))}
                    placeholder="Vacation Name"
                    palette={palette}
                    accessibilityLabel="Vacation name"
                  />
                </View>
                <SectionCard title="DATES" palette={palette}>
                  <View style={styles.presetRow}>
                    {(['1 day', '1 week', '2 weeks', 'Custom'] as const).map((preset) => (
                      <ChoicePill
                        key={preset}
                        label={preset}
                        selected={vacationForm.preset === preset}
                        palette={palette}
                        onPress={() => selectVacationPreset(preset)}
                      />
                    ))}
                  </View>
                  <View style={styles.columns}>
                    <View style={styles.column}>
                      <FieldLabel palette={palette}>START</FieldLabel>
                      <DateButton
                        value={vacationForm.startDate}
                        palette={palette}
                        soft
                        onPress={() =>
                          openDatePicker('Select Start Date', vacationForm.startDate, (startDate) =>
                            setVacationForm((form) => ({
                              ...form,
                              preset: 'Custom',
                              startDate,
                              endDate:
                                parseLocalDate(form.endDate) &&
                                parseLocalDate(form.endDate)! >= (parseLocalDate(startDate) ?? new Date(0))
                                  ? form.endDate
                                  : startDate,
                            }))
                          )
                        }
                      />
                    </View>
                    <View style={styles.column}>
                      <FieldLabel palette={palette}>END</FieldLabel>
                      <DateButton
                        value={vacationForm.endDate}
                        palette={palette}
                        soft
                        onPress={() =>
                          openDatePicker('Select End Date', vacationForm.endDate, (endDate) =>
                            setVacationForm((form) => ({
                              ...form,
                              preset: 'Custom',
                              endDate,
                            }))
                          )
                        }
                      />
                    </View>
                  </View>
                  <Text style={[styles.durationSummary, { color: palette.blue }]}>
                    {daysInVacation} {daysInVacation === 1 ? 'day' : 'days'}
                  </Text>
                </SectionCard>
                <View>
                  <FieldLabel palette={palette}>NOTES</FieldLabel>
                  <SoftInput
                    value={vacationForm.notes}
                    onChangeText={(value) => setVacationForm((form) => ({ ...form, notes: value }))}
                    placeholder="Vacation notes"
                    palette={palette}
                    multiline
                    accessibilityLabel="Vacation notes"
                  />
                </View>
                <View>
                  <View style={styles.labelWithCrown}>
                    <FieldLabel palette={palette}>COVER PHOTO</FieldLabel>
                    <MaterialCommunityIcons name="crown" size={13} color={palette.blue} />
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      if (!isPremium) {
                        setProModal({ visible: true, feature: 'Custom Vacation Cover Photos' });
                      } else {
                        setVacationForm((form) => ({
                          ...form,
                          hasCoverPhoto: !form.hasCoverPhoto,
                        }));
                        showStatus(vacationForm.hasCoverPhoto ? 'Photo removed.' : 'Photo added.');
                      }
                    }}
                    style={[styles.uploadCard, { backgroundColor: palette.field }]}
                  >
                    <View style={styles.uploadLeft}>
                      <View style={[styles.imageBadge, { backgroundColor: palette.card }]}>
                        <Ionicons name="image-outline" size={20} color={palette.muted} />
                      </View>
                      <Text style={[styles.uploadText, { color: palette.muted }]}>
                        {vacationForm.hasCoverPhoto ? 'Photo added' : 'Add a photo'}
                      </Text>
                    </View>
                    <Text style={[styles.uploadAction, { color: palette.blue }]}>Upload</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {activeTab === 'Activities' ? (
              <View style={styles.form}>
                <View>
                  <FieldLabel palette={palette}>ACTIVITY NAME</FieldLabel>
                  <SoftInput
                    value={activityForm.name}
                    onChangeText={(value) => setActivityForm((form) => ({ ...form, name: value }))}
                    placeholder="Activity Name"
                    palette={palette}
                    accessibilityLabel="Activity name"
                  />
                </View>
                <View>
                  <FieldLabel palette={palette}>CATEGORY</FieldLabel>
                  <PlannerSelect
                    value={activityForm.category}
                    palette={palette}
                    onPress={() =>
                      openPicker('Select Activity Category', ACTIVITY_TYPES, activityForm.category, (category) =>
                        setActivityForm((form) => ({ ...form, category }))
                      )
                    }
                  />
                </View>
                <View>
                  <FieldLabel palette={palette}>DATE &amp; TIME</FieldLabel>
                  <View style={styles.pillRow}>
                    <DateButton
                      value={activityForm.date}
                      palette={palette}
                      onPress={() =>
                        openDatePicker('Select Activity Date', activityForm.date, (date) =>
                          setActivityForm((form) => ({ ...form, date }))
                        )
                      }
                    />
                    <TimeButton
                      value={activityForm.startTime}
                      displayValue={
                        activityForm.endTime
                          ? formatTimeRange(activityForm.startTime, activityForm.endTime)
                          : undefined
                      }
                      palette={palette}
                      icon
                      onPress={() =>
                        openTimePicker(
                          'Select Activity Time',
                          activityForm.startTime,
                          (startTime) =>
                            setActivityForm((form) => ({ ...form, startTime, endTime: '' })),
                          (startTime, endTime) =>
                            setActivityForm((form) => ({ ...form, startTime, endTime })),
                          activityForm.endTime
                            ? { startTime: activityForm.startTime, endTime: activityForm.endTime }
                            : undefined
                        )
                      }
                    />
                  </View>
                </View>
                <View>
                  <FieldLabel palette={palette}>NOTES</FieldLabel>
                  <SoftInput
                    value={activityForm.notes}
                    onChangeText={(value) => setActivityForm((form) => ({ ...form, notes: value }))}
                    placeholder="Add notes..."
                    palette={palette}
                    multiline
                  />
                </View>
              </View>
            ) : null}

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={saveItem}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: palette.blue, opacity: pressed ? 0.88 : 1 },
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  {activeTab === 'Tasks' && !isPremium
                    ? `Save (${freeTasksRemaining} free tasks remaining)`
                    : activeTab === 'Tasks'
                      ? 'Save Task'
                      : `Save ${activeTab === 'Classes' ? 'Class' : activeTab === 'Exams' ? 'Exam' : activeTab === 'Vacations' ? 'Vacation' : 'Activity'}`}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  clearActiveForm();
                  showStatus('Form cleared.');
                }}
                style={({ pressed }) => [
                  styles.cancelButton,
                  { borderColor: palette.blue, opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <Text style={[styles.cancelButtonText, { color: palette.blue }]}>Cancel</Text>
              </Pressable>
            </View>
            {savedItems.length > 0 ? (
              <Text style={[styles.savedCount, { color: palette.muted }]}>
                {savedItems.length} saved {savedItems.length === 1 ? 'item' : 'items'}
              </Text>
            ) : null}
          </View>
          ) : (
            <View
              style={[
                styles.formSheet,
                {
                  backgroundColor: palette.card,
                  borderColor: width >= 768 ? palette.border : 'transparent',
                },
                width >= 768 && styles.desktopSheet,
              ]}
            >
              <Text style={{ color: palette.text, fontSize: 22, fontWeight: '700', marginBottom: 16 }}>
                My Schedule
              </Text>
              {savedItems.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 36 }}>
                  <Ionicons name="calendar-outline" size={28} color={palette.muted} />
                  <Text style={{ color: palette.text, fontSize: 14, fontWeight: '700', marginTop: 10 }}>
                    No schedule items found
                  </Text>
                  <Text style={{ color: palette.muted, fontSize: 12, marginTop: 4 }}>
                    Add a task or another planner item to see it here.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {savedItems.map((item) => (
                    <View
                      key={item.id}
                      style={{
                        borderWidth: 1,
                        borderColor: palette.border,
                        borderRadius: 14,
                        padding: 14,
                        backgroundColor: palette.card,
                      }}
                    >
                      <Text style={{ color: palette.muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>
                        {item.category}{item.subject ? ` · ${item.subject}` : ''}
                      </Text>
                      <Text style={{ color: palette.text, fontSize: 15, fontWeight: '700', marginTop: 5 }}>
                        {item.title}
                      </Text>
                      {item.date ? (
                        <Text style={{ color: palette.muted, fontSize: 12, marginTop: 5 }}>
                          {formatDate(item.date)}
                          {item.time ? ` · ${formatTime(item.time)}` : ''}
                          {item.startTime ? ` · ${formatTimeRange(item.startTime, item.endTime ?? '')}` : ''}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {statusMessage ? (
          <View style={[styles.toast, { backgroundColor: palette.text }]}>
            <Ionicons name="checkmark-circle" size={18} color="#34D399" />
            <Text style={styles.toastText}>{statusMessage}</Text>
          </View>
        ) : null}

        <Modal
          visible={pickerModal.visible}
          transparent
          animationType="fade"
          onRequestClose={() => setPickerModal((modal) => ({ ...modal, visible: false }))}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: palette.text }]}>{pickerModal.title}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  onPress={() => setPickerModal((modal) => ({ ...modal, visible: false }))}
                >
                  <Ionicons name="close" size={22} color={palette.muted} />
                </Pressable>
              </View>
              <ScrollView style={styles.modalOptions} showsVerticalScrollIndicator={false}>
                {pickerModal.options.map((option) => {
                  const selected = pickerModal.selected === option;
                  return (
                    <Pressable
                      key={option}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => {
                        pickerModal.onSelect(option);
                        setPickerModal((modal) => ({ ...modal, visible: false }));
                      }}
                      style={[
                        styles.optionRow,
                        { backgroundColor: selected ? palette.softBlue : 'transparent' },
                      ]}
                    >
                      <Text style={[styles.optionText, { color: selected ? palette.blue : palette.text }]}>
                        {option}
                      </Text>
                      {selected ? <Ionicons name="checkmark" size={18} color={palette.blue} /> : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={dateModal.visible}
          transparent
          animationType="fade"
          onRequestClose={() => setDateModal((modal) => ({ ...modal, visible: false }))}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: palette.text }]}>{dateModal.title}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  onPress={() => setDateModal((modal) => ({ ...modal, visible: false }))}
                >
                  <Ionicons name="close" size={22} color={palette.muted} />
                </Pressable>
              </View>
              <Text style={[styles.modalHint, { color: palette.muted }]}>Enter a date as YYYY-MM-DD or choose a quick date.</Text>
              <SoftInput
                value={dateModal.value}
                onChangeText={(value) => setDateModal((modal) => ({ ...modal, value, error: '' }))}
                placeholder="YYYY-MM-DD"
                palette={palette}
                accessibilityLabel="Date"
              />
              {dateModal.error ? (
                <Text accessibilityRole="alert" style={styles.errorText}>{dateModal.error}</Text>
              ) : null}
              <View style={styles.quickDateRow}>
                {dateOptions.map((option) => (
                  <Pressable
                    key={option.label}
                    accessibilityRole="button"
                    onPress={() => setDateModal((modal) => ({ ...modal, value: option.value, error: '' }))}
                    style={[styles.quickDate, { backgroundColor: palette.field }]}
                  >
                    <Text style={[styles.quickDateTitle, { color: palette.text }]}>{option.label}</Text>
                    <Text style={[styles.quickDateValue, { color: palette.blue }]}>{formatDate(option.value)}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (!parseLocalDate(dateModal.value)) {
                    setDateModal((modal) => ({ ...modal, error: 'Enter a valid date in YYYY-MM-DD format.' }));
                    return;
                  }
                  dateModal.onSave(dateModal.value);
                  setDateModal((modal) => ({ ...modal, visible: false, error: '' }));
                }}
                style={[styles.primaryButton, { backgroundColor: palette.blue }]}
              >
                <Text style={styles.primaryButtonText}>Confirm Date</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal
          visible={timeModal.visible}
          transparent
          animationType="fade"
          onRequestClose={() => setTimeModal((modal) => ({ ...modal, visible: false }))}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: palette.text }]}>{timeModal.title}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  onPress={() => setTimeModal((modal) => ({ ...modal, visible: false }))}
                >
                  <Ionicons name="close" size={22} color={palette.muted} />
                </Pressable>
              </View>
              {timeModal.allowRange ? (
                <View style={styles.timeModeToggle}>
                  {([
                    { mode: 'single', label: 'Single Time' },
                    { mode: 'range', label: 'Timeframe / Range' },
                  ] as const).map(({ mode, label }) => (
                    <Pressable
                      key={mode}
                      accessibilityRole="button"
                      accessibilityState={{ selected: timeModal.mode === mode }}
                      onPress={() => setTimeModal((modal) => ({ ...modal, mode, error: '' }))}
                      style={[
                        styles.timeModeButton,
                        {
                          backgroundColor: timeModal.mode === mode ? palette.blue : palette.field,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.timeModeText,
                          { color: timeModal.mode === mode ? '#FFFFFF' : palette.muted },
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <Text style={[styles.modalHint, { color: palette.muted }]}>
                {timeModal.mode === 'range'
                  ? 'Choose a start and end time.'
                  : 'Choose a time or enter it below.'}
              </Text>
              <TimeEntryGroup
                label={timeModal.mode === 'range' ? 'START TIME' : 'TIME'}
                hour={timeModal.startHour}
                minute={timeModal.startMinute}
                period={timeModal.startPeriod}
                palette={palette}
                onHourChange={(startHour) =>
                  setTimeModal((modal) => ({ ...modal, startHour, error: '' }))
                }
                onMinuteChange={(startMinute) =>
                  setTimeModal((modal) => ({ ...modal, startMinute, error: '' }))
                }
                onPeriodChange={(startPeriod) =>
                  setTimeModal((modal) => ({ ...modal, startPeriod, error: '' }))
                }
              />
              {timeModal.mode === 'range' ? (
                <TimeEntryGroup
                  label="END TIME"
                  hour={timeModal.endHour}
                  minute={timeModal.endMinute}
                  period={timeModal.endPeriod}
                  palette={palette}
                  onHourChange={(endHour) =>
                    setTimeModal((modal) => ({ ...modal, endHour, error: '' }))
                  }
                  onMinuteChange={(endMinute) =>
                    setTimeModal((modal) => ({ ...modal, endMinute, error: '' }))
                  }
                  onPeriodChange={(endPeriod) =>
                    setTimeModal((modal) => ({ ...modal, endPeriod, error: '' }))
                  }
                />
              ) : null}
              {timeModal.error || rangeValidationError ? (
                <Text accessibilityRole="alert" style={styles.errorText}>
                  {timeModal.error || rangeValidationError}
                </Text>
              ) : null}
              <View style={styles.quickTimeRow}>
                {timeModal.mode === 'range'
                  ? [
                      { start: '18:00', end: '20:00' },
                      { start: '09:00', end: '11:00' },
                      { start: '16:00', end: '18:00' },
                    ].map(({ start, end }) => (
                      <Pressable
                        key={`${start}-${end}`}
                        accessibilityRole="button"
                        onPress={() => {
                          timeModal.onSaveRange?.(start, end);
                          setTimeModal((modal) => ({ ...modal, visible: false, error: '' }));
                        }}
                        style={[styles.quickTime, { backgroundColor: palette.field }]}
                      >
                        <Text style={[styles.quickTimeText, { color: palette.text }]}>
                          {formatTimeRange(start, end)}
                        </Text>
                      </Pressable>
                    ))
                  : ['09:00', '10:30', '13:30', '17:00', '19:00', '20:30'].map((time) => (
                      <Pressable
                        key={time}
                        accessibilityRole="button"
                        onPress={() => {
                          timeModal.onSave(time);
                          setTimeModal((modal) => ({ ...modal, visible: false, error: '' }));
                        }}
                        style={[styles.quickTime, { backgroundColor: palette.field }]}
                      >
                        <Text style={[styles.quickTimeText, { color: palette.text }]}>
                          {formatTime(time)}
                        </Text>
                      </Pressable>
                    ))}
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  const startTime = to24HourTime(
                    timeModal.startHour,
                    timeModal.startMinute,
                    timeModal.startPeriod
                  );
                  if (!startTime) {
                    setTimeModal((modal) => ({
                      ...modal,
                      error: 'Enter valid hours from 1–12 and minutes from 00–59.',
                    }));
                    return;
                  }
                  if (timeModal.mode === 'range') {
                    const endTime = to24HourTime(
                      timeModal.endHour,
                      timeModal.endMinute,
                      timeModal.endPeriod
                    );
                    if (!endTime) {
                      setTimeModal((modal) => ({
                        ...modal,
                        error: 'Enter valid hours from 1–12 and minutes from 00–59.',
                      }));
                      return;
                    }
                    if ((timeToMinutes(endTime) ?? 0) <= (timeToMinutes(startTime) ?? 0)) {
                      setTimeModal((modal) => ({
                        ...modal,
                        error: 'End time must be after start time.',
                      }));
                      return;
                    }
                    timeModal.onSaveRange?.(startTime, endTime);
                  } else {
                    timeModal.onSave(startTime);
                  }
                  setTimeModal((modal) => ({ ...modal, visible: false, error: '' }));
                }}
                style={[styles.primaryButton, { backgroundColor: palette.blue }]}
              >
                <Text style={styles.primaryButtonText}>
                  {timeModal.mode === 'range' ? 'Set Timeframe' : 'Set Time'}
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal
          visible={proModal.visible}
          transparent
          animationType="fade"
          onRequestClose={() => setProModal({ visible: false, feature: '' })}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <View style={[styles.proIcon, { backgroundColor: palette.softBlue }]}>
                <MaterialCommunityIcons name="crown" size={24} color={palette.blue} />
              </View>
              <Text style={[styles.proEyebrow, { color: palette.blue }]}>STUDY SAKHA PRO</Text>
              <Text style={[styles.proTitle, { color: palette.text }]}>Unlock {proModal.feature}</Text>
              <Text style={[styles.proDescription, { color: palette.muted }]}>
                Get repeating schedules, activities, custom covers, unlimited saved tasks, and more.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setIsPremium(true);
                  setProModal({ visible: false, feature: '' });
                  showStatus('Sakha Pro mode enabled.');
                }}
                style={[styles.primaryButton, { backgroundColor: palette.blue }]}
              >
                <Text style={styles.primaryButtonText}>Activate Sakha Pro (Demo)</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setProModal({ visible: false, feature: '' })}
                style={styles.maybeLater}
              >
                <Text style={[styles.cancelButtonText, { color: palette.muted }]}>Maybe Later</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </Shell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
  },
  page: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 36,
    alignItems: 'center',
  },
  desktopPage: {
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  formSheet: {
    width: '100%',
    maxWidth: 620,
    borderRadius: 24,
  },
  desktopSheet: {
    padding: 24,
    borderWidth: 1,
  },
  tabBarOuter: {
    alignSelf: 'stretch',
    borderRadius: 30,
  },
  tabBar: {
    alignItems: 'center',
    padding: 4,
    gap: 2,
  },
  tab: {
    minHeight: 40,
    paddingHorizontal: 11,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabText: {
    fontWeight: '700',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 22,
    marginBottom: 22,
  },
  form: {
    gap: 18,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  textInput: {
    minHeight: 52,
    borderWidth: 0,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    fontWeight: '500',
  },
  textArea: {
    minHeight: 104,
    borderWidth: 0,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '500',
  },
  inputText: {
    fontSize: 15,
    fontWeight: '500',
    flexShrink: 1,
  },
  select: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  dateButton: {
    minHeight: 46,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  timeButton: {
    flexDirection: 'row',
    gap: 8,
  },
  choicePill: {
    minHeight: 40,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  outlineChoice: {
    minWidth: 100,
  },
  choiceText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    gap: 16,
  },
  columns: {
    flexDirection: 'row',
    gap: 12,
  },
  column: {
    flex: 1,
    minWidth: 0,
  },
  threeColumns: {
    flexDirection: 'row',
    gap: 8,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  dayButton: {
    minWidth: 35,
    minHeight: 36,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallChoiceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  stepperRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
  },
  stepperButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationText: {
    minWidth: 75,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationSummary: {
    fontSize: 13,
    fontWeight: '700',
  },
  labelWithCrown: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
  },
  uploadCard: {
    minHeight: 68,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  uploadLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  imageBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '500',
  },
  uploadAction: {
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  actions: {
    gap: 10,
    marginTop: 24,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  cancelButton: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  savedCount: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 12,
  },
  toast: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 5,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    paddingRight: 12,
  },
  modalHint: {
    fontSize: 13,
    lineHeight: 18,
  },
  timeModeToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  timeModeButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 13,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeModeText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalOptions: {
    maxHeight: 340,
  },
  optionRow: {
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
  },
  quickDateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickDate: {
    flexGrow: 1,
    minWidth: '46%',
    padding: 10,
    borderRadius: 12,
  },
  quickDateTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  quickDateValue: {
    fontSize: 11,
    marginTop: 3,
  },
  timeEntryGroup: {
    gap: 8,
  },
  timeEntryRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  timeEntry: {
    flex: 1,
    minWidth: 0,
  },
  periodPicker: {
    gap: 6,
    paddingBottom: 1,
  },
  periodButton: {
    minWidth: 50,
    height: 25,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodText: {
    fontSize: 11,
    fontWeight: '700',
  },
  quickTimeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickTime: {
    minWidth: '30%',
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
  },
  quickTimeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  proIcon: {
    width: 52,
    height: 52,
    alignSelf: 'center',
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proEyebrow: {
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  proTitle: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
  },
  proDescription: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
  },
  maybeLater: {
    alignItems: 'center',
    paddingVertical: 6,
  },
});
