import React, { useState, useMemo } from 'react';
import { 
  Crown, 
  ChevronDown, 
  Clock, 
  Calendar as CalendarIcon, 
  Plus, 
  Minus, 
  ArrowRight, 
  Image as ImageIcon, 
  CheckCircle2, 
  BookOpen, 
  GraduationCap, 
  Palmtree, 
  Sparkles, 
  MapPin, 
  Trash2, 
  X, 
  LayoutList,
  PlusCircle,
  AlertCircle,
  User
} from 'lucide-react';

// Predefined subjects and task types
const SUBJECTS = [
  'Mathematics', 
  'Physics', 
  'Chemistry', 
  'Biology', 
  'Computer Science', 
  'English Literature', 
  'History & Civics', 
  'Geography', 
  'Economics'
];

const TASK_TYPES = ['Assignment', 'Homework', 'Revision', 'Project', 'Reading', 'Lab Work'];
const EXAM_TYPES = ['Exam', 'Quiz', 'Midterm', 'Final', 'Unit Test', 'Practical'];
const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function StudySakhaPlanner() {
  // Main navigation state: 'create' (Form Screen) or 'dashboard' (Schedule List)
  const [currentScreen, setCurrentScreen] = useState('create');
  const [activeTab, setActiveTab] = useState('Tasks');
  const [freeTasksRemaining, setFreeTasksRemaining] = useState(6);
  const [isPremium, setIsPremium] = useState(false);
  
  // Toast notification and Premium modal state
  const [toast, setToast] = useState(null);
  const [premiumModal, setPremiumModal] = useState({ open: false, feature: '' });

  // Initial demo schedule items
  const [savedItems, setSavedItems] = useState([
    {
      id: '1',
      category: 'Tasks',
      title: 'Complete Calculus Exercise 4.2',
      subject: 'Mathematics',
      type: 'Homework',
      date: '2026-11-20',
      time: '18:00',
      occurs: 'Once',
      notes: 'Solve questions 1 to 15 with step-by-step graphs.',
      completed: false
    },
    {
      id: '2',
      category: 'Classes',
      title: 'Quantum Mechanics Lecture',
      subject: 'Physics',
      teacher: 'Dr. H.C. Verma',
      whenType: 'Repeating',
      days: ['Mon', 'Wed', 'Fri'],
      startTime: '13:30',
      endTime: '14:30',
      whereType: 'In Person',
      room: 'Room 204, Building A',
      building: 'Science Block',
      notes: 'Bring scientific calculator.'
    },
    {
      id: '3',
      category: 'Exams',
      title: 'Organic Chemistry Mid-Term',
      subject: 'Chemistry',
      type: 'Midterm',
      date: '2026-11-25',
      time: '10:00',
      duration: 90,
      whereType: 'In Person',
      room: 'Exam Hall B',
      seat: 'A-42',
      notes: 'Revise Aldehydes, Ketones and Carboxylic Acids.'
    }
  ]);

  // ==================== 1. NEW TASK FORM STATE ====================
  const [taskForm, setTaskForm] = useState({
    title: '',
    subject: '',
    type: '',
    date: '2026-11-18',
    time: '17:00',
    occurs: 'Once',
    repeatDays: ['Mon', 'Wed'],
    notes: ''
  });

  // ==================== 2. NEW CLASS FORM STATE ====================
  const [classForm, setClassForm] = useState({
    name: '',
    subject: '',
    teacher: '',
    whenType: 'Once', // 'Once' | 'Repeating'
    date: '2026-11-18',
    repeatDays: ['Mon', 'Wed', 'Fri'],
    startTime: '13:30',
    endTime: '14:30',
    dateRange: 'None', // 'None' | 'Term' | 'Manual'
    whereType: 'In Person', // 'In Person' | 'Online'
    room: '',
    building: '',
    onlineLink: '',
    notes: ''
  });

  // ==================== 3. NEW EXAM FORM STATE ====================
  const [examForm, setExamForm] = useState({
    name: '',
    subject: '',
    type: 'Exam',
    date: '2026-11-20',
    time: '09:30',
    duration: 60, // Duration in minutes
    whereType: 'In Person', // 'In Person' | 'Online'
    room: '',
    seat: '',
    onlineLink: '',
    notes: ''
  });

  // ==================== 4. NEW VACATION FORM STATE ====================
  const [vacationForm, setVacationForm] = useState({
    name: '',
    preset: '1 day', // '1 day' | '1 week' | '2 weeks' | 'Custom'
    startDate: '2026-11-18',
    endDate: '2026-11-18',
    notes: '',
    coverPhoto: null
  });

  // ==================== 5. NEW ACTIVITY FORM STATE ====================
  const [activityForm, setActivityForm] = useState({
    name: '',
    category: 'Sports & Fitness',
    date: '2026-11-18',
    startTime: '16:00',
    endTime: '17:00',
    notes: ''
  });

  // Helper to trigger toast notification
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  // Handler for premium-gated features
  const handlePremiumFeature = (featureName, callback) => {
    if (isPremium) {
      callback();
    } else {
      setPremiumModal({ open: true, feature: featureName });
    }
  };

  // Calculate end date based on selected vacation preset
  const handleVacationPreset = (preset) => {
    const start = new Date(vacationForm.startDate || '2026-11-18');
    let end = new Date(start);

    if (preset === '1 day') {
      end = new Date(start);
    } else if (preset === '1 week') {
      end.setDate(start.getDate() + 6);
    } else if (preset === '2 weeks') {
      end.setDate(start.getDate() + 13);
    }

    const endFormatted = end.toISOString().split('T')[0];
    setVacationForm({ ...vacationForm, preset, endDate: endFormatted });
  };

  // Format date string into readable format (e.g., Wed, 18 Nov)
  const formatNiceDate = (dateStr) => {
    if (!dateStr) return 'Select date';
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  // Convert 24-hour time string into 12-hour format (e.g., 1.30 PM)
  const formatNiceTime = (timeStr) => {
    if (!timeStr) return 'Add time';
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}.${m} ${ampm}`;
  };

  // Compute total number of vacation days
  const vacationDaysCount = useMemo(() => {
    const s = new Date(vacationForm.startDate);
    const e = new Date(vacationForm.endDate);
    const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  }, [vacationForm.startDate, vacationForm.endDate]);

  // Primary handler to save form data across all tabs
  const handleSave = () => {
    if (activeTab === 'Tasks') {
      if (!taskForm.title.trim()) {
        showToast('Please enter a Task Title!', 'error');
        return;
      }
      if (!isPremium && freeTasksRemaining <= 0) {
        setPremiumModal({ open: true, feature: 'Unlimited Tasks' });
        return;
      }
      const newItem = {
        id: Date.now().toString(),
        category: 'Tasks',
        title: taskForm.title,
        subject: taskForm.subject || 'General',
        type: taskForm.type || 'Task',
        date: taskForm.date,
        time: taskForm.time,
        occurs: taskForm.occurs,
        notes: taskForm.notes,
        completed: false
      };
      setSavedItems([newItem, ...savedItems]);
      if (!isPremium) setFreeTasksRemaining((prev) => Math.max(0, prev - 1));
      setTaskForm({ ...taskForm, title: '', notes: '' });
      showToast('Task saved successfully!');
      setCurrentScreen('dashboard');
    } 
    else if (activeTab === 'Classes') {
      if (!classForm.name.trim()) {
        showToast('Please enter a Class Name!', 'error');
        return;
      }
      const newItem = {
        id: Date.now().toString(),
        category: 'Classes',
        title: classForm.name,
        subject: classForm.subject || 'General',
        teacher: classForm.teacher,
        whenType: classForm.whenType,
        date: classForm.date,
        days: classForm.repeatDays,
        startTime: classForm.startTime,
        endTime: classForm.endTime,
        dateRange: classForm.dateRange,
        whereType: classForm.whereType,
        room: classForm.room,
        building: classForm.building,
        notes: classForm.notes
      };
      setSavedItems([newItem, ...savedItems]);
      setClassForm({ ...classForm, name: '', room: '', building: '', notes: '' });
      showToast('Class saved successfully!');
      setCurrentScreen('dashboard');
    } 
    else if (activeTab === 'Exams') {
      if (!examForm.name.trim()) {
        showToast('Please enter an Exam Name!', 'error');
        return;
      }
      const newItem = {
        id: Date.now().toString(),
        category: 'Exams',
        title: examForm.name,
        subject: examForm.subject || 'General',
        type: examForm.type,
        date: examForm.date,
        time: examForm.time,
        duration: examForm.duration,
        whereType: examForm.whereType,
        room: examForm.room,
        seat: examForm.seat,
        notes: examForm.notes
      };
      setSavedItems([newItem, ...savedItems]);
      setExamForm({ ...examForm, name: '', room: '', seat: '', notes: '' });
      showToast('Exam saved successfully!');
      setCurrentScreen('dashboard');
    } 
    else if (activeTab === 'Vacations') {
      if (!vacationForm.name.trim()) {
        showToast('Please enter a Vacation Name!', 'error');
        return;
      }
      const newItem = {
        id: Date.now().toString(),
        category: 'Vacations',
        title: vacationForm.name,
        startDate: vacationForm.startDate,
        endDate: vacationForm.endDate,
        daysCount: vacationDaysCount,
        notes: vacationForm.notes,
        coverPhoto: vacationForm.coverPhoto
      };
      setSavedItems([newItem, ...savedItems]);
      setVacationForm({ ...vacationForm, name: '', notes: '' });
      showToast('Vacation saved successfully!');
      setCurrentScreen('dashboard');
    } 
    else if (activeTab === 'Activities') {
      if (!activityForm.name.trim()) {
        showToast('Please enter an Activity Name!', 'error');
        return;
      }
      const newItem = {
        id: Date.now().toString(),
        category: 'Activities',
        title: activityForm.name,
        subCategory: activityForm.category,
        date: activityForm.date,
        startTime: activityForm.startTime,
        endTime: activityForm.endTime,
        notes: activityForm.notes
      };
      setSavedItems([newItem, ...savedItems]);
      setActivityForm({ ...activityForm, name: '', notes: '' });
      showToast('Activity saved successfully!');
      setCurrentScreen('dashboard');
    }
  };

  // Dynamic header title based on active tab
  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'Tasks': return 'New Task';
      case 'Classes': return 'New Class';
      case 'Exams': return 'New Exam';
      case 'Vacations': return 'New Vacation';
      case 'Activities': return 'New Activity';
      default: return 'New Entry';
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-start py-0 sm:py-6 font-sans text-slate-800 select-none">
      
      {/* Top App Switcher Bar for Study Sakha Branding */}
      <div className="w-full max-w-md bg-white sm:rounded-t-3xl border-b border-slate-100 px-5 py-3 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#4A90E2] flex items-center justify-center text-white font-bold text-lg shadow-sm">
            S
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight flex items-center gap-1.5">
              Study Sakha
              {isPremium && (
                <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-0.5">
                  <Crown className="w-3 h-3 fill-amber-500 text-amber-500" /> PRO
                </span>
              )}
            </h1>
            <p className="text-[11px] text-slate-400">Student Smart Planner</p>
          </div>
        </div>

        {/* Screen Switcher Buttons: Create Form vs My Schedule */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setCurrentScreen('create')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentScreen === 'create'
                ? 'bg-white text-[#4A90E2] shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Add New
          </button>
          <button
            onClick={() => setCurrentScreen('dashboard')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentScreen === 'dashboard'
                ? 'bg-white text-[#4A90E2] shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutList className="w-3.5 h-3.5" />
            Schedule ({savedItems.length})
          </button>
        </div>
      </div>

      {/* Main Mobile Container */}
      <div className="w-full max-w-md bg-white sm:rounded-b-3xl shadow-xl min-h-[88vh] flex flex-col justify-between relative overflow-hidden">
        
        {/* Toast Notification */}
        {toast && (
          <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl shadow-lg flex items-center gap-2 text-sm font-medium transition-all animate-bounce ${
            toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white'
          }`}>
            {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            <span>{toast.message}</span>
          </div>
        )}

        {currentScreen === 'create' ? (
          <div className="p-5 pb-10 flex-1 overflow-y-auto">
            {/* Screen Header Title (New Task / New Class / New Exam / New Vacation) */}
            <h2 className="text-[26px] font-bold text-center text-slate-900 tracking-tight mt-1 mb-5">
              {getHeaderTitle()}
            </h2>

            {/* Segmented Navigation Tab Bar */}
            <div className="bg-[#F4F6F9] p-1.5 rounded-full flex items-center justify-between mb-6 overflow-x-auto no-scrollbar">
              {[
                { id: 'Tasks', label: 'Tasks', pro: false },
                { id: 'Classes', label: 'Classes', pro: false },
                { id: 'Exams', label: 'Exams', pro: false },
                { id: 'Vacations', label: 'Vacations', pro: false },
                { id: 'Activities', label: 'Activities', pro: true }
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (tab.pro && !isPremium) {
                        handlePremiumFeature('Activities Planner', () => setActiveTab(tab.id));
                      } else {
                        setActiveTab(tab.id);
                      }
                    }}
                    className={`px-3.5 py-2 rounded-full text-[13px] font-semibold transition-all flex items-center gap-1 whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-[#68768A] hover:text-slate-900'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.pro && (
                      <Crown className="w-3.5 h-3.5 text-[#2B99FF] stroke-[2.2]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* ==================== TAB 1: NEW TASK UI ==================== */}
            {activeTab === 'Tasks' && (
              <div className="space-y-5 animate-fadeIn">
                {/* Task Title Input */}
                <div>
                  <input
                    type="text"
                    placeholder="Task Title"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    className="w-full bg-[#F4F6F9] text-slate-800 placeholder-[#8E9BAE] text-[15px] rounded-2xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40 transition-all"
                  />
                </div>

                {/* SUBJECT Dropdown */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68768A] mb-2">
                    SUBJECT
                  </label>
                  <div className="relative">
                    <select
                      value={taskForm.subject}
                      onChange={(e) => setTaskForm({ ...taskForm, subject: e.target.value })}
                      className="w-full appearance-none bg-[#F4F6F9] text-slate-800 text-[15px] rounded-2xl px-4 py-4 pr-10 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40 transition-all"
                    >
                      <option value="" className="text-[#8E9BAE]">Select subject</option>
                      {SUBJECTS.map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-5 h-5 text-slate-600 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* TYPE (OPTIONAL) Dropdown */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68768A] mb-2">
                    TYPE (OPTIONAL)
                  </label>
                  <div className="relative">
                    <select
                      value={taskForm.type}
                      onChange={(e) => setTaskForm({ ...taskForm, type: e.target.value })}
                      className="w-full appearance-none bg-[#F4F6F9] text-slate-800 text-[15px] rounded-2xl px-4 py-4 pr-10 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40 transition-all"
                    >
                      <option value="">Task type</option>
                      {TASK_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-5 h-5 text-slate-600 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* DUE DATE Pill Buttons */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68768A] mb-2">
                    DUE DATE
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="relative cursor-pointer bg-[#F4F6F9] hover:bg-slate-200/70 transition-colors rounded-3xl px-5 py-3.5 flex items-center justify-center min-w-[130px]">
                      <span className="text-[14px] font-medium text-[#7A889B]">
                        {taskForm.date ? formatNiceDate(taskForm.date) : 'Select date'}
                      </span>
                      <input
                        type="date"
                        value={taskForm.date}
                        onChange={(e) => setTaskForm({ ...taskForm, date: e.target.value })}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </label>

                    <label className="relative cursor-pointer bg-[#F4F6F9] hover:bg-slate-200/70 transition-colors rounded-3xl px-5 py-3.5 flex items-center gap-2 min-w-[135px]">
                      <Clock className="w-5 h-5 text-[#7A889B]" />
                      <span className="text-[14px] font-medium text-[#7A889B]">
                        {taskForm.time ? formatNiceTime(taskForm.time) : 'Add time'}
                      </span>
                      <input
                        type="time"
                        value={taskForm.time}
                        onChange={(e) => setTaskForm({ ...taskForm, time: e.target.value })}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </label>
                  </div>
                </div>

                {/* OCCURS Section (Once / Repeating with Crown) */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68768A] mb-2">
                    OCCURS
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setTaskForm({ ...taskForm, occurs: 'Once' })}
                      className={`px-6 py-3 rounded-full text-[15px] font-semibold transition-all ${
                        taskForm.occurs === 'Once'
                          ? 'bg-[#4A90E2] text-white shadow-sm'
                          : 'bg-[#F4F6F9] text-[#7A889B]'
                      }`}
                    >
                      Once
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handlePremiumFeature('Repeating Tasks', () =>
                          setTaskForm({ ...taskForm, occurs: 'Repeating' })
                        )
                      }
                      className={`px-6 py-3 rounded-full text-[15px] font-semibold flex items-center gap-2 transition-all ${
                        taskForm.occurs === 'Repeating'
                          ? 'bg-[#4A90E2] text-white shadow-sm'
                          : 'bg-[#F4F6F9] text-[#7A889B]'
                      }`}
                    >
                      <span>Repeating</span>
                      <Crown className={`w-4 h-4 ${taskForm.occurs === 'Repeating' ? 'text-white' : 'text-[#2B99FF]'}`} />
                    </button>
                  </div>
                </div>

                {/* DETAILS Textarea */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68768A] mb-2">
                    DETAILS
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Add notes..."
                    value={taskForm.notes}
                    onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
                    className="w-full bg-[#F4F6F9] text-slate-800 placeholder-[#8E9BAE] text-[15px] rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40 resize-none"
                  />
                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-2 space-y-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    className="w-full bg-[#4A90E2] hover:bg-[#357ABD] active:scale-[0.99] text-white font-semibold text-[16px] py-4 rounded-2xl shadow-sm transition-all"
                  >
                    {isPremium
                      ? 'Save Task'
                      : `Save (${freeTasksRemaining} free tasks remaining)`}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentScreen('dashboard')}
                    className="w-full bg-white border-[1.5px] border-[#2B99FF] text-[#0088FF] font-semibold text-[16px] py-3.5 rounded-2xl hover:bg-blue-50/40 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* ==================== TAB 2: NEW CLASS UI ==================== */}
            {activeTab === 'Classes' && (
              <div className="space-y-5 animate-fadeIn">
                {/* CLASS NAME */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68768A] mb-2">
                    CLASS NAME
                  </label>
                  <input
                    type="text"
                    placeholder="Class Name"
                    value={classForm.name}
                    onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                    className="w-full bg-[#F4F6F9] text-slate-800 placeholder-[#8E9BAE] text-[15px] rounded-2xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40"
                  />
                </div>

                {/* SUBJECT & Teacher Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68768A] mb-2">
                      SUBJECT
                    </label>
                    <div className="relative">
                      <select
                        value={classForm.subject}
                        onChange={(e) => setClassForm({ ...classForm, subject: e.target.value })}
                        className="w-full appearance-none bg-[#F4F6F9] text-slate-800 text-[14px] rounded-2xl px-3.5 py-4 pr-8 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40"
                      >
                        <option value="">Select subject</option>
                        {SUBJECTS.map((sub) => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-600 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-semibold text-[#68768A] mb-2">
                      Teacher
                    </label>
                    <input
                      type="text"
                      placeholder="Teacher Name"
                      value={classForm.teacher}
                      onChange={(e) => setClassForm({ ...classForm, teacher: e.target.value })}
                      className="w-full bg-[#F4F6F9] text-slate-800 placeholder-[#8E9BAE] text-[14px] rounded-2xl px-3.5 py-4 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40"
                    />
                  </div>
                </div>

                {/* WHEN Outlined Card */}
                <div className="border border-slate-200/90 rounded-3xl p-4 space-y-4">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68768A]">
                    WHEN
                  </label>

                  {/* Once / Repeating Toggle */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setClassForm({ ...classForm, whenType: 'Once' })}
                      className={`py-3 rounded-full text-[14px] font-semibold transition-all border ${
                        classForm.whenType === 'Once'
                          ? 'bg-[#EAF3FC] border-[#99C7F7] text-[#2B85E4]'
                          : 'bg-[#F4F6F9] border-transparent text-[#7A889B]'
                      }`}
                    >
                      Once
                    </button>
                    <button
                      type="button"
                      onClick={() => setClassForm({ ...classForm, whenType: 'Repeating' })}
                      className={`py-3 rounded-full text-[14px] font-semibold transition-all border ${
                        classForm.whenType === 'Repeating'
                          ? 'bg-[#EAF3FC] border-[#99C7F7] text-[#2B85E4]'
                          : 'bg-[#F4F6F9] border-transparent text-[#7A889B]'
                      }`}
                    >
                      Repeating
                    </button>
                  </div>

                  {/* DATE or Repeat Days */}
                  {classForm.whenType === 'Once' ? (
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68768A] mb-2">
                        DATE
                      </label>
                      <label className="relative block w-full bg-[#F4F6F9] rounded-2xl px-4 py-3.5 cursor-pointer">
                        <span className="text-[14px] text-[#7A889B]">
                          {classForm.date ? formatNiceDate(classForm.date) : 'Select date'}
                        </span>
                        <input
                          type="date"
                          value={classForm.date}
                          onChange={(e) => setClassForm({ ...classForm, date: e.target.value })}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </label>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68768A] mb-2">
                        REPEAT DAYS
                      </label>
                      <div className="flex justify-between gap-1">
                        {DAYS_OF_WEEK.map((day) => {
                          const selected = classForm.repeatDays.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                const exists = classForm.repeatDays.includes(day);
                                setClassForm({
                                  ...classForm,
                                  repeatDays: exists
                                    ? classForm.repeatDays.filter((d) => d !== day)
                                    : [...classForm.repeatDays, day]
                                });
                              }}
                              className={`w-10 h-10 rounded-full text-xs font-bold transition-all ${
                                selected
                                  ? 'bg-[#4A90E2] text-white'
                                  : 'bg-[#F4F6F9] text-[#7A889B]'
                              }`}
                            >
                              {day.slice(0, 2)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* STARTS & ENDS */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68768A] mb-2">
                        STARTS
                      </label>
                      <label className="relative block bg-[#F4F6F9] rounded-2xl px-4 py-4 cursor-pointer">
                        <span className="text-[16px] font-medium text-slate-900">
                          {formatNiceTime(classForm.startTime)}
                        </span>
                        <input
                          type="time"
                          value={classForm.startTime}
                          onChange={(e) => setClassForm({ ...classForm, startTime: e.target.value })}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </label>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68768A] mb-2">
                        ENDS
                      </label>
                      <label className="relative block bg-[#F4F6F9] rounded-2xl px-4 py-4 cursor-pointer">
                        <span className="text-[16px] font-medium text-slate-900">
                          {formatNiceTime(classForm.endTime)}
                        </span>
                        <input
                          type="time"
                          value={classForm.endTime}
                          onChange={(e) => setClassForm({ ...classForm, endTime: e.target.value })}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </label>
                    </div>
                  </div>

                  {/* DATE RANGE (None / Term / Manual) */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68768A] mb-2">
                      DATE RANGE
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {['None', 'Term', 'Manual'].map((range) => {
                        const active = classForm.dateRange === range;
                        return (
                          <button
                            key={range}
                            type="button"
                            onClick={() => setClassForm({ ...classForm, dateRange: range })}
                            className={`py-3 rounded-full text-[14px] font-semibold transition-all border ${
                              active
                                ? 'bg-[#EAF3FC] border-[#99C7F7] text-[#2B85E4]'
                                : 'bg-[#F4F6F9] border-transparent text-[#7A889B]'
                            }`}
                          >
                            {range}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* WHERE Outlined Card */}
                <div className="border border-slate-200/90 rounded-3xl p-4 space-y-4">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68768A]">
                    WHERE
                  </label>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setClassForm({ ...classForm, whereType: 'In Person' })}
                      className={`px-5 py-2.5 rounded-full text-[14px] font-semibold transition-all border ${
                        classForm.whereType === 'In Person'
                          ? 'bg-[#4A90E2] border-[#4A90E2] text-white shadow-sm'
                          : 'bg-white border-[#4A90E2] text-[#4A90E2]'
                      }`}
                    >
                      In Person
                    </button>

                    <button
                      type="button"
                      onClick={() => setClassForm({ ...classForm, whereType: 'Online' })}
                      className={`px-5 py-2.5 rounded-full text-[14px] font-semibold transition-all border ${
                        classForm.whereType === 'Online'
                          ? 'bg-[#4A90E2] border-[#4A90E2] text-white shadow-sm'
                          : 'bg-white border-[#4A90E2] text-[#4A90E2]'
                      }`}
                    >
                      Online
                    </button>
                  </div>

                  {classForm.whereType === 'In Person' ? (
                    <>
                      <div>
                        <label className="block text-[12px] font-semibold text-[#68768A] mb-2">
                          Room
                        </label>
                        <input
                          type="text"
                          placeholder="Room 204, Building A"
                          value={classForm.room}
                          onChange={(e) => setClassForm({ ...classForm, room: e.target.value })}
                          className="w-full bg-[#F4F6F9] text-slate-800 placeholder-[#8E9BAE] text-[15px] rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40"
                        />
                      </div>

                      <div>
                        <label className="block text-[12px] font-semibold text-[#68768A] mb-2">
                          Building
                        </label>
                        <input
                          type="text"
                          placeholder="Building"
                          value={classForm.building}
                          onChange={(e) => setClassForm({ ...classForm, building: e.target.value })}
                          className="w-full bg-[#F4F6F9] text-slate-800 placeholder-[#8E9BAE] text-[15px] rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40"
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-[12px] font-semibold text-[#68768A] mb-2">
                        Meeting Link
                      </label>
                      <input
                        type="url"
                        placeholder="https://meet.google.com/..."
                        value={classForm.onlineLink}
                        onChange={(e) => setClassForm({ ...classForm, onlineLink: e.target.value })}
                        className="w-full bg-[#F4F6F9] text-slate-800 placeholder-[#8E9BAE] text-[15px] rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40"
                      />
                    </div>
                  )}
                </div>

                {/* NOTES */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68768A] mb-2">
                    NOTES
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Add a reminder..."
                    value={classForm.notes}
                    onChange={(e) => setClassForm({ ...classForm, notes: e.target.value })}
                    className="w-full bg-[#F4F6F9] text-slate-800 placeholder-[#8E9BAE] text-[15px] rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40 resize-none"
                  />
                </div>

                {/* Save Class & Cancel Buttons */}
                <div className="pt-2 space-y-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    className="w-full bg-[#4A90E2] hover:bg-[#357ABD] active:scale-[0.99] text-white font-semibold text-[16px] py-4 rounded-2xl shadow-sm transition-all"
                  >
                    Save Class
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentScreen('dashboard')}
                    className="w-full bg-white border-[1.5px] border-[#2B99FF] text-[#0088FF] font-semibold text-[16px] py-3.5 rounded-2xl hover:bg-blue-50/40 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* ==================== TAB 3: NEW EXAM UI ==================== */}
            {activeTab === 'Exams' && (
              <div className="space-y-5 animate-fadeIn">
                {/* EXAM NAME */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68768A] mb-2">
                    EXAM NAME
                  </label>
                  <input
                    type="text"
                    placeholder="Exam Name"
                    value={examForm.name}
                    onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
                    className="w-full bg-[#F4F6F9] text-slate-800 placeholder-[#8E9BAE] text-[15px] rounded-2xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40"
                  />
                </div>

                {/* SUBJECT & TYPE */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68768A] mb-2">
                      SUBJECT
                    </label>
                    <div className="relative">
                      <select
                        value={examForm.subject}
                        onChange={(e) => setExamForm({ ...examForm, subject: e.target.value })}
                        className="w-full appearance-none bg-[#F4F6F9] text-slate-800 text-[14px] rounded-2xl px-3.5 py-4 pr-8 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40"
                      >
                        <option value="">Select subject</option>
                        {SUBJECTS.map((sub) => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-600 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68768A] mb-2">
                      TYPE
                    </label>
                    <div className="relative">
                      <select
                        value={examForm.type}
                        onChange={(e) => setExamForm({ ...examForm, type: e.target.value })}
                        className="w-full appearance-none bg-[#F4F6F9] text-slate-900 font-medium text-[15px] rounded-2xl px-3.5 py-4 pr-8 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40"
                      >
                        {EXAM_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-600 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* WHEN Card with Duration Stepper */}
                <div className="border border-slate-200/90 rounded-3xl p-4 space-y-4">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68768A]">
                    WHEN
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] uppercase text-[#7A889B] mb-1.5">
                        DATE
                      </label>
                      <label className="relative block bg-[#F4F6F9] rounded-2xl px-4 py-3.5 cursor-pointer">
                        <span className="text-[14px] text-[#7A889B]">
                          {examForm.date ? formatNiceDate(examForm.date) : 'Select date'}
                        </span>
                        <input
                          type="date"
                          value={examForm.date}
                          onChange={(e) => setExamForm({ ...examForm, date: e.target.value })}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </label>
                    </div>

                    <div>
                      <label className="block text-[11px] text-[#7A889B] mb-1.5">
                        Time
                      </label>
                      <label className="relative block bg-[#F4F6F9] rounded-2xl px-4 py-3.5 cursor-pointer">
                        <span className="text-[14px] text-[#7A889B]">
                          {examForm.time ? formatNiceTime(examForm.time) : 'Select time'}
                        </span>
                        <input
                          type="time"
                          value={examForm.time}
                          onChange={(e) => setExamForm({ ...examForm, time: e.target.value })}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </label>
                    </div>
                  </div>

                  {/* DURATION Stepper (- 60 min +) */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68768A] mb-3">
                      DURATION
                    </label>
                    <div className="flex items-center justify-between px-6 py-1">
                      <button
                        type="button"
                        onClick={() =>
                          setExamForm({
                            ...examForm,
                            duration: Math.max(15, examForm.duration - 15)
                          })
                        }
                        className="w-12 h-12 rounded-full bg-[#15192C] text-white flex items-center justify-center active:scale-95 transition-transform shadow-sm"
                      >
                        <Minus className="w-5 h-5 stroke-[2.5]" />
                      </button>

                      <span className="text-[16px] font-medium text-[#68768A]">
                        {examForm.duration} min
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setExamForm({
                            ...examForm,
                            duration: examForm.duration + 15
                          })
                        }
                        className="w-12 h-12 rounded-full bg-[#F4F6F9] text-slate-900 flex items-center justify-center hover:bg-slate-200 active:scale-95 transition-all"
                      >
                        <Plus className="w-5 h-5 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* WHERE Outlined Card (In Person / Online + Room & Seat #) */}
                <div className="border border-slate-200/90 rounded-3xl p-4 space-y-4">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68768A]">
                    WHERE
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setExamForm({ ...examForm, whereType: 'In Person' })}
                      className={`py-3 rounded-full text-[14px] font-semibold transition-all border ${
                        examForm.whereType === 'In Person'
                          ? 'bg-[#EAF3FC] border-[#99C7F7] text-[#2B85E4]'
                          : 'bg-[#F4F6F9] border-transparent text-[#68768A]'
                      }`}
                    >
                      In Person
                    </button>

                    <button
                      type="button"
                      onClick={() => setExamForm({ ...examForm, whereType: 'Online' })}
                      className={`py-3 rounded-full text-[14px] font-semibold transition-all border ${
                        examForm.whereType === 'Online'
                          ? 'bg-[#EAF3FC] border-[#99C7F7] text-[#2B85E4]'
                          : 'bg-[#F4F6F9] border-transparent text-[#68768A]'
                      }`}
                    >
                      Online
                    </button>
                  </div>

                  {examForm.whereType === 'In Person' ? (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <input
                        type="text"
                        placeholder="Room"
                        value={examForm.room}
                        onChange={(e) => setExamForm({ ...examForm, room: e.target.value })}
                        className="w-full bg-[#F4F6F9] text-slate-800 placeholder-[#8E9BAE] text-[15px] rounded-2xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40"
                      />
                      <input
                        type="text"
                        placeholder="Seat #"
                        value={examForm.seat}
                        onChange={(e) => setExamForm({ ...examForm, seat: e.target.value })}
                        className="w-full bg-[#F4F6F9] text-slate-800 placeholder-[#8E9BAE] text-[15px] rounded-2xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40"
                      />
                    </div>
                  ) : (
                    <input
                      type="url"
                      placeholder="Online Exam Portal Link"
                      value={examForm.onlineLink}
                      onChange={(e) => setExamForm({ ...examForm, onlineLink: e.target.value })}
                      className="w-full bg-[#F4F6F9] text-slate-800 placeholder-[#8E9BAE] text-[15px] rounded-2xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40"
                    />
                  )}
                </div>

                {/* NOTES */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68768A] mb-2">
                    NOTES
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Add notes..."
                    value={examForm.notes}
                    onChange={(e) => setExamForm({ ...examForm, notes: e.target.value })}
                    className="w-full bg-[#F4F6F9] text-slate-800 placeholder-[#8E9BAE] text-[15px] rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40 resize-none"
                  />
                </div>

                {/* Save Exam & Cancel Buttons */}
                <div className="pt-2 space-y-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    className="w-full bg-[#4A90E2] hover:bg-[#357ABD] active:scale-[0.99] text-white font-semibold text-[16px] py-4 rounded-2xl shadow-sm transition-all"
                  >
                    Save Exam
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentScreen('dashboard')}
                    className="w-full bg-white border-[1.5px] border-[#2B99FF] text-[#0088FF] font-semibold text-[16px] py-3.5 rounded-2xl hover:bg-blue-50/40 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* ==================== TAB 4: NEW VACATION UI ==================== */}
            {activeTab === 'Vacations' && (
              <div className="space-y-5 animate-fadeIn">
                {/* NAME */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68768A] mb-2">
                    NAME
                  </label>
                  <input
                    type="text"
                    placeholder="Vacation Name"
                    value={vacationForm.name}
                    onChange={(e) => setVacationForm({ ...vacationForm, name: e.target.value })}
                    className="w-full bg-[#F4F6F9] text-slate-800 placeholder-[#8E9BAE] text-[15px] rounded-2xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40"
                  />
                </div>

                {/* DATES Card */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68768A] mb-2">
                    DATES
                  </label>
                  <div className="border border-slate-200/90 rounded-3xl p-4 space-y-4">
                    {/* Duration Preset Pills (1 day, 1 week, 2 weeks, Custom) */}
                    <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                      {['1 day', '1 week', '2 weeks', 'Custom'].map((preset) => {
                        const isSelected = vacationForm.preset === preset;
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleVacationPreset(preset)}
                            className={`px-4 py-2.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all ${
                              isSelected
                                ? 'bg-[#4A90E2] text-white shadow-sm'
                                : 'bg-[#F4F6F9] text-[#5A687C] hover:bg-slate-200/70'
                            }`}
                          >
                            {preset}
                          </button>
                        );
                      })}
                    </div>

                    {/* START -> END Date Selector */}
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68768A] mb-2">
                          START
                        </label>
                        <label className="relative block bg-[#EAF3FC] border border-[#BFDDFB] rounded-full py-3.5 px-3 text-center cursor-pointer">
                          <span className="text-[14px] font-semibold text-[#2B85E4]">
                            {formatNiceDate(vacationForm.startDate)}
                          </span>
                          <input
                            type="date"
                            value={vacationForm.startDate}
                            onChange={(e) =>
                              setVacationForm({
                                ...vacationForm,
                                preset: 'Custom',
                                startDate: e.target.value
                              })
                            }
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                        </label>
                      </div>

                      <div className="pt-5 text-slate-400">
                        <ArrowRight className="w-5 h-5" />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68768A] mb-2">
                          END
                        </label>
                        <label className="relative block bg-[#EAF3FC] border border-[#BFDDFB] rounded-full py-3.5 px-3 text-center cursor-pointer">
                          <span className="text-[14px] font-semibold text-[#2B85E4]">
                            {formatNiceDate(vacationForm.endDate)}
                          </span>
                          <input
                            type="date"
                            value={vacationForm.endDate}
                            min={vacationForm.startDate}
                            onChange={(e) =>
                              setVacationForm({
                                ...vacationForm,
                                preset: 'Custom',
                                endDate: e.target.value
                              })
                            }
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Count summary */}
                    <div className="text-[13px] font-semibold text-[#2B85E4]">
                      {vacationDaysCount} {vacationDaysCount === 1 ? 'day' : 'days'}
                    </div>
                  </div>
                </div>

                {/* NOTES */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68768A] mb-2">
                    NOTES
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Vacation notes"
                    value={vacationForm.notes}
                    onChange={(e) => setVacationForm({ ...vacationForm, notes: e.target.value })}
                    className="w-full bg-[#F4F6F9] text-slate-800 placeholder-[#8E9BAE] text-[15px] rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40 resize-none"
                  />
                </div>

                {/* COVER PHOTO with Crown */}
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#68768A] mb-2">
                    <span>COVER PHOTO</span>
                    <Crown className="w-3.5 h-3.5 text-[#2B99FF]" />
                  </label>
                  <div
                    onClick={() =>
                      handlePremiumFeature('Custom Vacation Cover Photo', () => {
                        setVacationForm({
                          ...vacationForm,
                          coverPhoto: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80'
                        });
                        showToast('Cover photo added!');
                      })
                    }
                    className="bg-[#F4F6F9] rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-slate-200/60 transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <span className="text-[15px] text-[#8E9BAE]">
                        {vacationForm.coverPhoto ? 'Beach_Holiday_Cover.jpg' : 'Add a photo'}
                      </span>
                    </div>
                    <span className="text-[14px] font-semibold text-[#2B85E4] pr-2">
                      {vacationForm.coverPhoto ? 'Change' : 'Upload'}
                    </span>
                  </div>
                </div>

                {/* Save Vacation & Cancel */}
                <div className="pt-2 space-y-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    className="w-full bg-[#4A90E2] hover:bg-[#357ABD] active:scale-[0.99] text-white font-semibold text-[16px] py-4 rounded-2xl shadow-sm transition-all"
                  >
                    Save Vacation
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentScreen('dashboard')}
                    className="w-full bg-white border-[1.5px] border-[#2B99FF] text-[#0088FF] font-semibold text-[16px] py-3.5 rounded-2xl hover:bg-blue-50/40 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* ==================== TAB 5: NEW ACTIVITY UI (PRO) ==================== */}
            {activeTab === 'Activities' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-3.5 flex items-center gap-2.5 text-xs text-blue-800">
                  <Sparkles className="w-4 h-4 text-[#2B99FF] shrink-0" />
                  <span>Track extracurriculars, sports, music, or gym sessions in Study Sakha Pro!</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68768A] mb-2">
                    ACTIVITY NAME
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Evening Cricket Practice / Guitar Club"
                    value={activityForm.name}
                    onChange={(e) => setActivityForm({ ...activityForm, name: e.target.value })}
                    className="w-full bg-[#F4F6F9] text-slate-800 placeholder-[#8E9BAE] text-[15px] rounded-2xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68768A] mb-2">
                    CATEGORY
                  </label>
                  <div className="relative">
                    <select
                      value={activityForm.category}
                      onChange={(e) => setActivityForm({ ...activityForm, category: e.target.value })}
                      className="w-full appearance-none bg-[#F4F6F9] text-slate-800 text-[15px] rounded-2xl px-4 py-4 pr-10 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40"
                    >
                      <option>Sports & Fitness</option>
                      <option>Music & Arts</option>
                      <option>Coding Club</option>
                      <option>Volunteering</option>
                      <option>Personal Hobby</option>
                    </select>
                    <ChevronDown className="w-5 h-5 text-slate-600 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68768A] mb-2">
                      STARTS
                    </label>
                    <input
                      type="time"
                      value={activityForm.startTime}
                      onChange={(e) => setActivityForm({ ...activityForm, startTime: e.target.value })}
                      className="w-full bg-[#F4F6F9] text-slate-800 text-[15px] rounded-2xl px-4 py-3.5"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68768A] mb-2">
                      ENDS
                    </label>
                    <input
                      type="time"
                      value={activityForm.endTime}
                      onChange={(e) => setActivityForm({ ...activityForm, endTime: e.target.value })}
                      className="w-full bg-[#F4F6F9] text-slate-800 text-[15px] rounded-2xl px-4 py-3.5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68768A] mb-2">
                    NOTES
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Activity notes..."
                    value={activityForm.notes}
                    onChange={(e) => setActivityForm({ ...activityForm, notes: e.target.value })}
                    className="w-full bg-[#F4F6F9] text-slate-800 placeholder-[#8E9BAE] text-[15px] rounded-2xl p-4 focus:outline-none resize-none"
                  />
                </div>

                <div className="pt-2 space-y-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    className="w-full bg-[#4A90E2] hover:bg-[#357ABD] text-white font-semibold text-[16px] py-4 rounded-2xl shadow-sm transition-all"
                  >
                    Save Activity
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentScreen('dashboard')}
                    className="w-full bg-white border-[1.5px] border-[#2B99FF] text-[#0088FF] font-semibold text-[16px] py-3.5 rounded-2xl"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ==================== MY SCHEDULE DASHBOARD SCREEN ==================== */
          <div className="p-5 flex-1 overflow-y-auto space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">My Planner</h2>
                <p className="text-xs text-slate-500">All your upcoming tasks, classes & exams</p>
              </div>
              <button
                onClick={() => setCurrentScreen('create')}
                className="bg-[#4A90E2] text-white px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:bg-[#357ABD]"
              >
                <Plus className="w-4 h-4" /> New Entry
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {['All', 'Tasks', 'Classes', 'Exams', 'Vacations', 'Activities'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    if (cat !== 'All') setActiveTab(cat);
                  }}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#F4F6F9] text-slate-700 hover:bg-blue-50 hover:text-[#4A90E2] whitespace-nowrap"
                >
                  {cat} (
                  {cat === 'All'
                    ? savedItems.length
                    : savedItems.filter((i) => i.category === cat).length}
                  )
                </button>
              ))}
            </div>

            {/* Saved Items List */}
            {savedItems.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-14 h-14 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
                  <CalendarIcon className="w-6 h-6" />
                </div>
                <p className="text-slate-600 font-semibold">No schedule items found</p>
                <p className="text-xs text-slate-400">Tap the New Entry button to add a task or class.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedItems.map((item) => (
                  <div
                    key={item.id}
                    className="border border-slate-200/80 rounded-2xl p-4 bg-white hover:shadow-md transition-all flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        item.category === 'Tasks' ? 'bg-blue-50 text-[#4A90E2]' :
                        item.category === 'Classes' ? 'bg-indigo-50 text-indigo-600' :
                        item.category === 'Exams' ? 'bg-rose-50 text-rose-600' :
                        'bg-emerald-50 text-emerald-600'
                      }`}>
                        {item.category === 'Tasks' && <CheckCircle2 className="w-5 h-5" />}
                        {item.category === 'Classes' && <BookOpen className="w-5 h-5" />}
                        {item.category === 'Exams' && <GraduationCap className="w-5 h-5" />}
                        {item.category === 'Vacations' && <Palmtree className="w-5 h-5" />}
                        {item.category === 'Activities' && <Sparkles className="w-5 h-5" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            {item.category}
                          </span>
                          {item.subject && (
                            <span className="text-[11px] font-semibold text-[#4A90E2]">
                              • {item.subject}
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-slate-900 text-[15px]">
                          {item.title}
                        </h3>

                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                          {item.date && (
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                              {formatNiceDate(item.date)}
                            </span>
                          )}
                          {item.time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {formatNiceTime(item.time)}
                            </span>
                          )}
                          {item.startTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {formatNiceTime(item.startTime)} - {formatNiceTime(item.endTime)}
                            </span>
                          )}
                          {item.room && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              {item.room} {item.seat ? `(Seat ${item.seat})` : ''}
                            </span>
                          )}
                          {item.teacher && (
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              {item.teacher}
                            </span>
                          )}
                        </div>

                        {item.notes && (
                          <p className="text-xs text-slate-400 pt-1 line-clamp-2">
                            {item.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSavedItems(savedItems.filter((i) => i.id !== item.id));
                        showToast('Item deleted');
                      }}
                      className="text-slate-300 hover:text-rose-500 p-1 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Home Indicator Bar */}
        <div className="py-2.5 flex justify-center bg-white">
          <div className="w-32 h-1 rounded-full bg-slate-300" />
        </div>

        {/* ==================== STUDY SAKHA PRO MODAL ==================== */}
        {premiumModal.open && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-fadeIn">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-[#2B99FF]">
                  <Crown className="w-6 h-6" />
                </div>
                <button
                  onClick={() => setPremiumModal({ open: false, feature: '' })}
                  className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#2B99FF]">
                  Study Sakha Pro Feature
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                  Unlock {premiumModal.feature}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Upgrade to Study Sakha Pro to unlock repeating tasks, extracurricular activity tracking, cover photos, and unlimited task storage.
                </p>
              </div>

              <div className="bg-[#F4F6F9] rounded-2xl p-3.5 space-y-2 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#4A90E2]" />
                  <span>Unlimited Tasks, Classes & Exams</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#4A90E2]" />
                  <span>Repeating Schedules & Activities Tab</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#4A90E2]" />
                  <span>Custom Vacation Cover Photos</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsPremium(true);
                  setPremiumModal({ open: false, feature: '' });
                  showToast('Study Sakha PRO unlocked!');
                }}
                className="w-full bg-[#4A90E2] hover:bg-[#357ABD] text-white font-semibold py-3.5 rounded-2xl shadow-sm transition-all text-sm"
              >
                Enable Pro Mode (Free Demo)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}