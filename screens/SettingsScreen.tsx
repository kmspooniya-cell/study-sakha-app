import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Modal,
  StyleSheet,
  StatusBar,
  useWindowDimensions,
  useColorScheme,
  Platform,
  KeyboardAvoidingView,
  Linking,
  Share,
  BackHandler,
  LayoutAnimation,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigation } from '../lib/navigation';
import { useStore, type User } from '../lib/store';
import { EXAMS } from '../lib/data';
import { focusLockNative } from '../lib/focusLockNative';
import { readFocusLockSnapshot } from '../lib/focusLockSnapshot';
import { requestNotificationPermission } from '../lib/notifications';
import { supabase, supabaseConfigured } from '../lib/supabase';
import appConfig from '../app.json';

/* ==========================================================================
   STUDY SAKHA — SETTINGS CONTROL CENTER (STRICT 1:1 REACT NATIVE CONVERSION)
   Single Source of Truth: index.html prototype
   - Complete 3-Level Navigation Hierarchy:
       Level 1: Settings Home (Profile, Quick Metrics, 4 Quick Controls, 12 Categories, 4 Special Areas)
       Level 2: All 12 Main Category Screens + All 4 Special Control Areas
       Level 3: All 13 Dedicated Detail Screens (zero placeholders)
   - Responsive Phone & Tablet/Desktop Layout (Persistent Left Rail at >= 1024px)
   - Live Theme Engine (Light / Dark / System via useColorScheme), 6 Accent Palettes + Custom Hex
   - Live Font Scaling, Display Scaling, Layout Density (Comfortable/Compact), High Contrast, Reduce Motion
   - Full Bilingual Support (English & हिन्दी) + 51-item Bilingual Search Index
   - Persistent State via @react-native-async-storage/async-storage with deep merge
   ========================================================================== */

const STORAGE_KEY = '@study_sakha_settings_control_center_v1';
const APP_VERSION = appConfig.expo.version;

/* --------------------------------------------------------------------------
   1. DESIGN TOKENS, PALETTES & DATA REGISTRIES
   -------------------------------------------------------------------------- */
interface ColorPalette {
  name: string;
  hi: string;
  50: string;
  100: string;
  500: string;
  600: string;
  700: string;
}

const ACCENT_PALETTES: Record<string, ColorPalette> = {
  indigo:  { name: 'Scholar Indigo', hi: 'इंडिगो',  50: '#eef2ff', 100: '#e0e7ff', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca' },
  emerald: { name: 'Forest Sage',    hi: 'एमरल्ड',  50: '#ecfdf5', 100: '#d1fae5', 500: '#10b981', 600: '#059669', 700: '#047857' },
  amber:   { name: 'Saffron Gold',   hi: 'केसरिया', 50: '#fffbeb', 100: '#fef3c7', 500: '#f59e0b', 600: '#d97706', 700: '#b45309' },
  rose:    { name: 'Crimson Ink',    hi: 'रोज़',    50: '#fff1f2', 100: '#ffe4e6', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c' },
  teal:    { name: 'Oceanic Teal',   hi: 'टील',    50: '#f0fdfa', 100: '#ccfbf1', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e' },
  slate:   { name: 'Graphite Mono',  hi: 'ग्रेफाइट', 50: '#f8fafc', 100: '#e2e8f0', 500: '#475569', 600: '#334155', 700: '#1e293b' },
};

const FOCUS_THEMES = [
  { id: 'starry-sky',      name: 'Starry Sky',      hi: 'तारों भरा आकाश',    cat: 'Celestial', premium: false, bg: '#1e1b4b', accent: '#0f172a' },
  { id: 'northern-lights', name: 'Northern Lights', hi: 'उत्तरी रोशनी',      cat: 'Celestial', premium: true,  bg: '#134e4a', accent: '#064e3b' },
  { id: 'misty-forest',    name: 'Misty Forest',    hi: 'धुंधला जंगल',       cat: 'Nature',    premium: false, bg: '#064e3b', accent: '#052e16' },
  { id: 'deep-ocean',      name: 'Deep Ocean',      hi: 'गहरा महासागर',     cat: 'Nature',    premium: false, bg: '#0c4a6e', accent: '#082f49' },
  { id: 'snow-peaks',      name: 'Snow Peaks',      hi: 'बर्फीली चोटियाँ',    cat: 'Nature',    premium: false, bg: '#475569', accent: '#1e293b' },
  { id: 'tropical-leaves', name: 'Tropical Leaves', hi: 'उष्णकटिबंधीय पत्ते', cat: 'Nature',    premium: true,  bg: '#14532d', accent: '#065f46' },
  { id: 'cozy-study',      name: 'Cozy Study',      hi: 'आरामदायक अध्ययन',   cat: 'Cozy',      premium: false, bg: '#451a03', accent: '#1c1917' },
  { id: 'rainy-window',    name: 'Rainy Window',    hi: 'बारिश की खिड़की',    cat: 'Cozy',      premium: false, bg: '#164e63', accent: '#1e293b' },
  { id: 'vintage-library', name: 'Vintage Library', hi: 'पुरानी लाइब्रेरी',    cat: 'Cozy',      premium: true,  bg: '#78350f', accent: '#292524' },
  { id: 'fireplace',       name: 'Fireplace',       hi: 'अंगीठी',            cat: 'Cozy',      premium: true,  bg: '#7c2d12', accent: '#450a0a' },
  { id: 'study-cafe',      name: 'Study Cafe',      hi: 'स्टडी कैफे',         cat: 'Cozy',      premium: false, bg: '#44403c', accent: '#292524' },
  { id: 'reading-nook',    name: 'Reading Nook',    hi: 'रीडिंग कॉर्नर',      cat: 'Cozy',      premium: false, bg: '#422006', accent: '#292524' },
  { id: 'golden-sunset',   name: 'Golden Sunset',   hi: 'सुनहरा सूर्यास्त',    cat: 'Nature',    premium: false, bg: '#9a3412', accent: '#881337' },
  { id: 'cosmic-galaxy',   name: 'Cosmic Galaxy',   hi: 'ब्रह्मांडीय आकाशगंगा', cat: 'Celestial', premium: true,  bg: '#3b0764', accent: '#1e1b4b' },
  { id: 'desert-dusk',     name: 'Desert Dusk',     hi: 'रेगिस्तानी संध्या',   cat: 'Nature',    premium: false, bg: '#92400e', accent: '#431407' },
  { id: 'moonlit-lake',    name: 'Moonlit Lake',    hi: 'चांदनी झील',        cat: 'Celestial', premium: true,  bg: '#172554', accent: '#0f172a' },
  { id: 'night-cosmos',    name: 'Night Cosmos',    hi: 'रात्रि ब्रह्मांड',    cat: 'Celestial', premium: false, bg: '#18181b', accent: '#1e1b4b' },
  { id: 'ocean-horizon',   name: 'Ocean Horizon',   hi: 'समुद्र क्षितिज',     cat: 'Nature',    premium: false, bg: '#155e75', accent: '#0c4a6e' },
  { id: 'graphite',        name: 'Graphite',        hi: 'ग्रेफाइट',          cat: 'Minimal',   premium: false, bg: '#27272a', accent: '#18181b' },
  { id: 'midnight-blue',   name: 'Midnight Blue',   hi: 'मिडनाइट ब्लू',      cat: 'Minimal',   premium: false, bg: '#0f172a', accent: '#172554' },
  { id: 'obsidian',        name: 'Obsidian',        hi: 'ओब्सीडियन',         cat: 'Minimal',   premium: true,  bg: '#09090b', accent: '#000000' },
];

const FOCUS_THEME_IDS: Record<string, string> = {
  'starry-sky': 'obsidian',
  'misty-forest': 'misty-mountain',
  'deep-ocean': 'cosmic-road-trip',
  'snow-peaks': 'alpine-serenity',
  'cosmic-galaxy': 'enchanted-garden',
  'neon-tropical': 'neon-tropical-geometry',
  'cosmic-chakra': 'cosmic-chakra-meditation',
  'northern-lights': 'enchanted-garden',
  'tropical-leaves': 'enchanted-garden',
  'cozy-study': 'cosmic-road-trip',
  'rainy-window': 'misty-mountain',
  'study-cafe': 'cosmic-road-trip',
  'reading-nook': 'alpine-serenity',
  'golden-sunset': 'cosmic-road-trip',
  'desert-dusk': 'alpine-serenity',
  'moonlit-lake': 'enchanted-garden',
  'night-cosmos': 'obsidian',
  'ocean-horizon': 'cosmic-road-trip',
  'graphite': 'obsidian',
  'midnight-blue': 'obsidian',
  'obsidian': 'obsidian',
  'vintage-library': 'cosmic-chakra-meditation',
  fireplace: 'cosmic-chakra-meditation',
};
const FOCUS_THEME_ALIASES = Object.fromEntries(Object.entries(FOCUS_THEME_IDS).map(([key, value]) => [value, key]));

const BACKGROUND_LIBRARY = [
  { id: 'none',         name: 'Clean Solid',      hi: 'सादा बैकग्राउंड', premium: false, previewBg: '#f1f5f9', darkBg: '#0f172a' },
  { id: 'subtle-grid',  name: 'Notion Dot Grid',  hi: 'डॉट ग्रिड',       premium: false, previewBg: '#e2e8f0', darkBg: '#1e293b' },
  { id: 'warm-paper',   name: 'Warm Paper',       hi: 'वॉर्म पेपर',      premium: false, previewBg: '#fefce8', darkBg: '#292524' },
  { id: 'royal-jaipur', name: 'Sandstone Dusk',   hi: 'सैंडस्टोन डस्क',  premium: true,  previewBg: '#ffedd5', darkBg: '#431407' },
  { id: 'deep-aurora',  name: 'Deep Aurora',      hi: 'डीप ऑरोरा',       premium: true,  previewBg: '#1e1b4b', darkBg: '#064e3b' },
];

const MAIN_CATEGORIES = [
  { id: 'account',       num: '01', icon: '👤', bgLight: '#eef2ff', bgDark: '#1e1b4b', textLight: '#4f46e5', textDark: '#818cf8', en: 'Account & Profile',            hi: 'खाता और प्रोफ़ाइल',           descEn: 'Personal info, security, active sessions & account actions', descHi: 'व्यक्तिगत जानकारी, सुरक्षा और सक्रिय सत्र' },
  { id: 'appearance',    num: '02', icon: '🎨', bgLight: '#f5f3ff', bgDark: '#2e1065', textLight: '#7c3aed', textDark: '#a78bfa', en: 'Appearance & Personalization', hi: 'रूप और वैयक्तिकरण',            descEn: 'Theme, brand colors, backgrounds, typography & language',    descHi: 'थीम, ब्रांड रंग, फ़ॉन्ट, लेआउट और भाषा' },
  { id: 'learning',      num: '03', icon: '🎓', bgLight: '#f0f9ff', bgDark: '#082f49', textLight: '#0284c7', textDark: '#38bdf8', en: 'Learning & Study Preferences', hi: 'अध्ययन प्राथमिकताएँ',           descEn: 'Target exam, medium, subjects, notes style & presets',       descHi: 'लक्ष्य परीक्षा, माध्यम, विषय और प्रीसेट' },
  { id: 'planner',       num: '04', icon: '📅', bgLight: '#ecfdf5', bgDark: '#064e3b', textLight: '#059669', textDark: '#34d399', en: 'Study Planner & Goals',        hi: 'स्टडी प्लानर और लक्ष्य',        descEn: 'Daily/weekly study goals, tasks, timetable & reminders',     descHi: 'दैनिक लक्ष्य, कार्य प्रबंधन और समय-सारणी' },
  { id: 'focus',         num: '05', icon: '⏱️', bgLight: '#f0fdfa', bgDark: '#134e4a', textLight: '#0d9488', textDark: '#2dd4bf', en: 'Focus Centre & Wellbeing',     hi: 'फ़ोकस सेंटर और वेलबीइंग',       descEn: 'Pomodoro timers, meditation, 21 focus themes & ambient audio', descHi: 'फ़ोकस टाइमर, ध्यान, 21 थीम और संगीत' },
  { id: 'focuslock',     num: '06', icon: '🛡️', bgLight: '#fff1f2', bgDark: '#4c0519', textLight: '#e11d48', textDark: '#fb7185', en: 'Focus Lock & App Blocking',    hi: 'फ़ोकस लॉक और ऐप ब्लॉकिंग',      descEn: 'Block distracting apps, allowlist, schedules & OS status',   descHi: 'ध्यान भटकाने वाले ऐप ब्लॉक और नियम' },
  { id: 'ai',            num: '07', icon: '✨', bgLight: '#fffbeb', bgDark: '#451a03', textLight: '#d97706', textDark: '#fbbf24', en: 'Sakha AI',                     hi: 'सखा AI (जेमिनी सहायक)',        descEn: 'AI language, learning modes, explanations & chat privacy',   descHi: 'AI भाषा, शिक्षण मोड, व्याख्या और इतिहास' },
  { id: 'library',       num: '08', icon: '📖', bgLight: '#eff6ff', bgDark: '#172554', textLight: '#2563eb', textDark: '#60a5fa', en: 'Library & Learning Tools',     hi: 'लाइब्रेरी और शिक्षण उपकरण',     descEn: 'Notes, Books, PDF Reader, PYQ filters, Tests & downloads',   descHi: 'नोट्स, PDF रीडर, PYQ, टेस्ट और डाउनलोड' },
  { id: 'stats',         num: '09', icon: '📊', bgLight: '#ecfeff', bgDark: '#083344', textLight: '#0891b2', textDark: '#22d3ee', en: 'Progress & Statistics',        hi: 'प्रगति और आँकड़े',             descEn: 'Subject tracking, focus analytics, streaks & summaries',     descHi: 'विषयवार ट्रैकिंग, स्ट्रीक और प्रगति रिपोर्ट' },
  { id: 'community',     num: '10', icon: '👥', bgLight: '#fdf4ff', bgDark: '#4a044e', textLight: '#c026d3', textDark: '#e879f9', en: 'Groups & Community',           hi: 'समूह और समुदाय',               descEn: 'Profile visibility, study groups, chats & blocked users',    descHi: 'गोपनीयता, स्टडी ग्रुप और चैट सेटिंग्स' },
  { id: 'notifications', num: '11', icon: '🔔', bgLight: '#fff7ed', bgDark: '#431407', textLight: '#ea580c', textDark: '#fb923c', en: 'Notifications & Reminders',    hi: 'सूचनाएँ और रिमाइंडर',          descEn: 'Category alerts, quiet hours, DND, sounds & timing',         descHi: 'अलर्ट, शांत समय, ध्वनि और कंपन' },
  { id: 'data',          num: '12', icon: '💾', bgLight: '#f1f5f9', bgDark: '#1e293b', textLight: '#334155', textDark: '#94a3b8', en: 'Data, Privacy & Security',     hi: 'डेटा, गोपनीयता और सुरक्षा',     descEn: 'Cloud sync, local backup, storage, export & recovery',       descHi: 'बैकअप, क्लाउड सिंक, स्टोरेज और डेटा एक्सपोर्ट' },
];

const SPECIAL_AREAS = [
  { id: 'special_premium',     code: 'A', icon: '👑', bgLight: '#fffbeb', bgDark: '#451a03', textLight: '#d97706', textDark: '#fbbf24', en: 'Premium & Subscription', hi: 'प्रीमियम और सदस्यता',    descEn: 'Plan benefits, billing, renewal & Pro simulator',   descHi: 'प्लान लाभ, बिलिंग और नवीनीकरण' },
  { id: 'special_permissions', code: 'B', icon: '🛡️', bgLight: '#ecfdf5', bgDark: '#064e3b', textLight: '#059669', textDark: '#34d399', en: 'Permissions Centre',     hi: 'अनुमति केंद्र',           descEn: 'Android notifications, audio, app blocking & files', descHi: 'डिवाइस अनुमतियाँ और मार्गदर्शन' },
  { id: 'special_help',        code: 'C', icon: '🛟', bgLight: '#f0f9ff', bgDark: '#082f49', textLight: '#0284c7', textDark: '#38bdf8', en: 'Help & Support',         hi: 'सहायता और समर्थन',        descEn: 'App guide, FAQs, feedback, bug report & contact',   descHi: 'गाइड, अक्सर पूछे जाने वाले प्रश्न और संपर्क' },
  { id: 'special_about',       code: 'D', icon: 'ℹ️', bgLight: '#f1f5f9', bgDark: '#1e293b', textLight: '#475569', textDark: '#cbd5e1', en: 'About Study Sakha',      hi: 'स्टडी सखा के बारे में',    descEn: `Version ${APP_VERSION}, changelog, credits & legal`, descHi: 'संस्करण, नया क्या है और कानूनी जानकारी' },
];

// Full 51-entry bilingual search index matching index.html 1:1
const SEARCH_INDEX = [
  { cat: 'account', detail: 'edit_profile', en: 'Personal Information & Name', hi: 'व्यक्तिगत जानकारी और नाम', tags: 'profile photo email bio state' },
  { cat: 'account', detail: 'change_password', en: 'Change Password', hi: 'पासवर्ड बदलें', tags: 'security login' },
  { cat: 'account', detail: null, en: 'Biometric App Lock', hi: 'बायोमेट्रिक ऐप लॉक', tags: 'fingerprint face id security' },
  { cat: 'account', detail: 'active_sessions', en: 'Active Devices and Sessions', hi: 'सक्रिय डिवाइस और सत्र', tags: 'devices logout' },
  { cat: 'account', detail: null, en: 'Export Personal Account Data', hi: 'व्यक्तिगत डेटा एक्सपोर्ट करें', tags: 'download json' },
  { cat: 'account', detail: null, en: 'Delete Account', hi: 'खाता हटाएँ', tags: 'remove permanent danger' },
  { cat: 'appearance', detail: null, en: 'App Theme (Light / Dark / System)', hi: 'ऐप थीम (लाइट / डार्क / सिस्टम)', tags: 'dark mode light mode appearance' },
  { cat: 'appearance', detail: null, en: 'Accent Color & Brand Customization', hi: 'एक्सेंट रंग और ब्रांड अनुकूलन', tags: 'color hex indigo saffron' },
  { cat: 'appearance', detail: 'custom_bg', en: 'Custom Background & Image Upload', hi: 'कस्टम बैकग्राउंड और छवि अपलोड', tags: 'wallpaper opacity overlay' },
  { cat: 'appearance', detail: null, en: 'Font Size & Font Family', hi: 'फ़ॉन्ट आकार और फ़ॉन्ट शैली', tags: 'typography text scale reading' },
  { cat: 'appearance', detail: null, en: 'Compact & Comfortable Layout', hi: 'कॉम्पैक्ट और आरामदायक लेआउट', tags: 'density dashboard widgets' },
  { cat: 'appearance', detail: null, en: 'Reduce Motion & High Contrast', hi: 'मोशन कम करें और हाई कंट्रास्ट', tags: 'accessibility animation' },
  { cat: 'appearance', detail: null, en: 'App Language (Hindi / English)', hi: 'ऐप की भाषा (हिन्दी / अंग्रेज़ी)', tags: 'hindi english bhasha' },
  { cat: 'learning', detail: null, en: 'Target Exam (RAS, RSSB, UPSC, NET/JRF, SSC)', hi: 'लक्ष्य परीक्षा (RAS, RSSB, UPSC, SSC)', tags: 'pcs exam preference' },
  { cat: 'learning', detail: 'preferred_subjects', en: 'Preferred Subjects & Learning Style', hi: 'पसंदीदा विषय और अध्ययन शैली', tags: 'polity history geography' },
  { cat: 'learning', detail: null, en: 'Study Profile Presets', hi: 'स्टडी प्रोफ़ाइल प्रीसेट', tags: 'ras profile upsc profile' },
  { cat: 'learning', detail: null, en: 'Short Notes, Detailed Notes & Revision', hi: 'शॉर्ट नोट्स और रिवीजन प्राथमिकताएँ', tags: 'spaced repetition examples' },
  { cat: 'planner', detail: null, en: 'Daily & Weekly Study Goal', hi: 'दैनिक और साप्ताहिक अध्ययन लक्ष्य', tags: 'hours target goal' },
  { cat: 'planner', detail: null, en: 'Day Start Time & Default Task Duration', hi: 'दिन शुरू होने का समय और कार्य अवधि', tags: 'schedule morning' },
  { cat: 'planner', detail: null, en: 'Auto Carry Forward & Recurring Tasks', hi: 'ऑटो कैरी फ़ॉरवर्ड और आवर्ती कार्य', tags: 'tasks priority' },
  { cat: 'planner', detail: 'study_timetable', en: 'Study Timetable & Break Intervals', hi: 'अध्ययन समय-सारणी और ब्रेक अंतराल', tags: 'schedule routine' },
  { cat: 'focus', detail: null, en: 'Focus Timer, Short Break & Long Break', hi: 'फ़ोकस टाइमर और ब्रेक अवधि', tags: 'pomodoro duration auto start' },
  { cat: 'focus', detail: null, en: 'Meditation & Break Timer', hi: 'ध्यान और ब्रेक टाइमर', tags: 'wellbeing breathing bell' },
  { cat: 'focus', detail: 'focus_themes', en: 'Focus Theme Library (21 Themes)', hi: 'फ़ोकस थीम लाइब्रेरी (21 थीम)', tags: 'starry sky northern lights misty forest cozy study rainy window obsidian' },
  { cat: 'focus', detail: null, en: 'Music & Ambient Sounds (Lofi, Rain & Piano)', hi: 'संगीत और परिवेश ध्वनियाँ', tags: 'brown noise deep space volume audio' },
  { cat: 'focuslock', detail: null, en: 'Focus Lock Master Enable', hi: 'फ़ोकस लॉक चालू/बंद', tags: 'app blocker strict' },
  { cat: 'focuslock', detail: 'blocked_apps', en: 'Distracting App Selection & Allowlist', hi: 'ध्यान भटकाने वाले ऐप और अनुमति सूची', tags: 'instagram youtube whatsapp block' },
  { cat: 'focuslock', detail: null, en: 'Scheduled Blocking & Emergency Unlock', hi: 'निर्धारित ब्लॉकिंग और आपातकालीन अनलॉक', tags: 'rules cooldown' },
  { cat: 'focuslock', detail: null, en: 'Accessibility Service & Battery Guidance', hi: 'एक्सेसिबिलिटी सेवा और बैटरी मार्गदर्शन', tags: 'android permission native' },
  { cat: 'ai', detail: null, en: 'AI Response Language & Length', hi: 'AI उत्तर भाषा और लंबाई', tags: 'gemini hinglish hindi english' },
  { cat: 'ai', detail: null, en: 'AI Learning Modes (Teacher, Doubt, PYQ)', hi: 'AI शिक्षण मोड', tags: 'exam preparation' },
  { cat: 'ai', detail: null, en: 'Chat History & AI Privacy Controls', hi: 'चैट इतिहास और AI गोपनीयता', tags: 'clear history usage' },
  { cat: 'library', detail: null, en: 'Notes Editor & Auto Save', hi: 'नोट्स एडिटर और ऑटो सेव', tags: 'markdown formatting' },
  { cat: 'library', detail: 'pdf_reader', en: 'PDF Reader Preferences & Theme', hi: 'PDF रीडर प्राथमिकताएँ और थीम', tags: 'sepia text size page display comfort' },
  { cat: 'library', detail: null, en: 'PYQ Filters & Practice Preferences', hi: 'PYQ फ़िल्टर और अभ्यास प्राथमिकताएँ', tags: 'previous year questions' },
  { cat: 'library', detail: null, en: 'Tests, Mock Timer & Result Analysis', hi: 'टेस्ट टाइमर और परिणाम विश्लेषण', tags: 'submission warning explanations' },
  { cat: 'library', detail: null, en: 'Downloads & Offline Access', hi: 'डाउनलोड और ऑफ़लाइन एक्सेस', tags: 'wifi storage' },
  { cat: 'stats', detail: null, en: 'Subject-wise & Focus Time Tracking', hi: 'विषयवार और फ़ोकस समय ट्रैकिंग', tags: 'analytics progress' },
  { cat: 'stats', detail: null, en: 'Streak Preferences & Progress Summary', hi: 'स्ट्रीक प्राथमिकताएँ और प्रगति सारांश', tags: 'streak freeze weekly' },
  { cat: 'community', detail: null, en: 'Profile Visibility & Message Privacy', hi: 'प्रोफ़ाइल दृश्यता और संदेश गोपनीयता', tags: 'privacy' },
  { cat: 'community', detail: 'manage_groups', en: 'Group Management & Invitations', hi: 'समूह प्रबंधन और आमंत्रण', tags: 'leave group join requests' },
  { cat: 'community', detail: null, en: 'Blocked Users & Chat Preferences', hi: 'ब्लॉक किए गए उपयोगकर्ता', tags: 'chat' },
  { cat: 'notifications', detail: null, en: 'Global Notification Control & Categories', hi: 'सूचना नियंत्रण और श्रेणियाँ', tags: 'alerts planner focus test ai' },
  { cat: 'notifications', detail: null, en: 'Quiet Hours, DND, Sound & Vibration', hi: 'शांत समय, DND, ध्वनि और कंपन', tags: 'reminder timing' },
  { cat: 'data', detail: null, en: 'Local & Cloud Backup', hi: 'लोकल और क्लाउड बैकअप', tags: 'sync drive restore' },
  { cat: 'data', detail: 'storage_manager', en: 'Local Storage Usage & Cache', hi: 'स्टोरेज उपयोग और कैश प्रबंधन', tags: 'clear cache downloaded files' },
  { cat: 'data', detail: null, en: 'Data Export (Notes, Progress, Planner)', hi: 'डेटा एक्सपोर्ट', tags: 'json csv backup' },
  { cat: 'special_premium', detail: null, en: 'Premium & Subscription Plans', hi: 'प्रीमियम और सदस्यता प्लान', tags: 'pro upgrade billing renewal' },
  { cat: 'special_permissions', detail: null, en: 'Permissions Centre (Android OS)', hi: 'अनुमति केंद्र', tags: 'audio file access notifications' },
  { cat: 'special_help', detail: null, en: 'Help, FAQs, Feedback & Report Bug', hi: 'सहायता, FAQ और बग रिपोर्ट', tags: 'support contact guide' },
  { cat: 'special_about', detail: null, en: 'About Study Sakha, Changelog & Legal', hi: 'स्टडी सखा के बारे में और गोपनीयता नीति', tags: 'version credits terms' },
];

/* --------------------------------------------------------------------------
   2. DEFAULT SETTINGS STATE (SINGLE SOURCE OF TRUTH)
   -------------------------------------------------------------------------- */
function getDefaultSettings(user?: User | null) {
  const exam = EXAMS.find((item) => item.id === user?.exam);
  const name = user?.name?.trim() || 'Aspirant';
  const email = user?.email?.trim() || 'Unavailable';
  return {
    subscription: {
      isPremium: false,
      planName: 'Free Scholar',
      expiryDate: 'N/A',
      renewalCycle: 'Unavailable',
      billingEmail: email,
    },
    account: {
      name,
      email,
      joinedDate: user?.joined || 'Unavailable',
      bio: user?.examFocus || '',
      state: user?.currentCity || '',
      attemptYear: '',
      avatarInitials: name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
      avatarColor: 'indigo',
      biometricLock: false,
      twoFactorAuth: true,
      loginAlerts: true,
      activeSessions: user ? [{ id: 'current', device: 'This device', location: 'Unavailable', current: true, lastActive: 'Active now' }] : [],
    },
    appearance: {
      theme: 'system' as 'light' | 'dark' | 'system',
      accentColor: 'indigo',
      customBrandHex: '#4f46e5',
      useCustomHex: false,
      tintedSurfaces: true,
      backgroundId: 'none',
      customBgLabel: '',
      bgOpacity: 35,
      overlayIntensity: 20,
      fontSize: 'default' as 'small' | 'default' | 'large' | 'xl',
      fontFamily: 'Inter',
      readingTextScale: 105,
      layoutDensity: 'comfortable' as 'comfortable' | 'compact',
      dashboardWidgets: {
        streakCard: true,
        dailyGoalRing: true,
        quickRevision: true,
        sakhaAiPrompt: true,
        upcomingTests: true,
      },
      quickActions: ['Focus Timer', 'Sakha AI', 'Daily PYQ', 'Add Task'],
      reduceMotion: false,
      animationIntensity: 'balanced' as 'minimal' | 'balanced' | 'rich',
      highContrast: false,
      displayScaling: 100,
      language: 'en' as 'en' | 'hi',
    },
    learning: {
      targetExam: exam?.short || 'Unavailable',
      preferredContentLang: 'Bilingual (Hindi + English)',
      preferredMedium: 'English',
      defaultStudyMode: 'Concept + PYQ',
      preferredSubjects: [] as string[],
      learningStyle: 'Active Recall',
      shortNotes: true,
      detailedNotes: true,
      includeExamples: true,
      includeExplanations: true,
      revisionPreference: 'Spaced Repetition (1-3-7-21d)',
      activePreset: '',
    },
    planner: {
      dayStartTime: '05:30',
      defaultTaskDuration: 45,
      dailyStudyGoalHours: 3,
      weeklyStudyGoalHours: 10,
      autoCarryForward: true,
      completedTaskHandling: 'Move to Bottom',
      priorityDefault: 'Medium',
      recurringTasks: true,
      timetableTemplate: 'Balanced Morning + Evening',
      breakIntervals: 10,
      planningStyle: 'Energy-Based',
      smartSuggestions: true,
      taskReminders: true,
      plannerHistoryDays: '90',
      autoAdjustMissedGoals: false,
    },
    focus: {
      defaultFocusDuration: 50,
      shortBreakDuration: 10,
      longBreakDuration: 25,
      autoStartNextSession: false,
      meditationDuration: 10,
      meditationBell: 'Tibetan Singing Bowl',
      meditationBreathingCues: true,
      breakTimerDuration: 10,
      breakTimerBehaviour: 'Gentle Stretch Prompts',
      selectedTheme: 'starry-sky',
      themeCategoryFilter: 'All',
      themeAnimationIntensity: 'subtle',
      reduceFocusMotion: false,
      ambientSound: 'Rain & Piano',
      ambientVolume: 65,
      fadeOutAudio: true,
      pauseAudioOnBreak: true,
      keepScreenAwake: true,
      strictFocusFlow: true,
      sessionHistoryRetention: '1 Year',
      focusFlowIntegration: true,
    },
    focuslock: {
      masterEnabled: true,
      blockedApps: ['Instagram', 'YouTube', 'X (Twitter)', 'Snapchat', 'BGMI'],
      allowedApps: ['Phone', 'Messages', 'Calculator', 'Dictionary', 'Study Sakha'],
      blockDuringFocus: true,
      scheduledBlocking: false,
      scheduleStart: '06:00',
      scheduleEnd: '11:00',
      defaultBlockDuration: 60,
      emergencyUnlockMode: '60s Cooldown + Reason',
      simUsagePermission: true,
      simAccessibilityService: true,
      simBatteryUnrestricted: false,
      simBlockingServiceRunning: true,
    },
    ai: {
      responseLanguage: 'Bilingual (Hinglish)',
      responseLength: 'Balanced',
      detailLevel: 'Exam-Ready',
      defaultMode: 'Teacher Mode',
      includeExamples: true,
      stepByStep: true,
      revisionSummaries: true,
      saveChatHistory: true,
      chatRetentionDays: 60,
      allowModelImprovement: false,
      queriesUsedToday: 14,
      dailyFreeLimit: 25,
    },
    library: {
      notesEditorMode: 'Rich Markdown',
      notesAutoSave: true,
      notesFont: 'Inter',
      notesLineSpacing: '1.6',
      booksPageAnimation: 'Slide',
      booksAutoBookmark: true,
      booksDisplayLayout: 'Single Column',
      pdfTextSize: 100,
      pdfPageDisplay: 'Continuous Scroll',
      pdfReadingTheme: 'Warm Sepia',
      pdfBlueLightComfort: true,
      pyqExamFilter: 'RAS',
      pyqSubjectFilter: 'All Subjects',
      pyqInstantAnswer: false,
      testsDefaultCategory: 'RAS Prelims',
      testsShowCountdown: true,
      testsQuestionPalette: 'Grid Drawer',
      testsSubmissionWarning: true,
      testsShowExplanations: true,
      testsDetailedAnalysis: true,
      downloadsWifiOnly: true,
      downloadsOfflineAccess: true,
      searchFuzzyMatch: true,
      searchDefaultFilter: 'All Resources',
    },
    stats: {
      currentStreakDays: 0,
      subjectWiseTracking: true,
      focusTimeTracking: true,
      streakMinMinutes: 30,
      streakFreezeEnabled: true,
      weeklyProgressDigest: true,
      includeBreakTimeInChart: false,
    },
    community: {
      profileVisibility: 'Study Groups Only',
      messagePrivacy: 'Group Members',
      groupDiscovery: true,
      groupInvitations: 'Anyone from Target Exam',
      joinRequestHandling: 'Manual Approval',
      joinedGroups: [] as { id: string; name: string; members: number; role: string }[],
      chatReadReceipts: true,
      chatMediaAutoDownload: 'Wi-Fi Only',
      blockedUsers: [] as { id: string; name: string; date: string }[],
      communityMuteMentions: false,
    },
    notifications: {
      globalEnabled: true,
      studyPlannerAlerts: true,
      focusReminders: true,
      testReminders: true,
      sakhaAiNotifications: true,
      groupNotifications: true,
      chatNotifications: false,
      announcements: true,
      quietHoursEnabled: true,
      quietStart: '22:30',
      quietEnd: '05:30',
      dndSyncDuringFocus: true,
      sound: 'Soft Chime',
      vibration: true,
      reminderTiming: '15 min before',
    },
    data: {
      localBackupEnabled: true,
      lastLocalBackup: 'Unavailable',
      cloudBackupEnabled: false,
      cloudSyncEnabled: true,
      lastSyncTime: 'Unavailable',
      storageUsedMB: 0,
      cacheSizeMB: 0,
      downloadsSizeMB: 0,
      notesSizeMB: 0,
      shareCrashReports: true,
      shareUsageAnalytics: false,
    },
    permissions: {
      androidNotifications: 'Unavailable',
      audioAccess: 'Available in app',
      nativeAppBlocking: 'Unavailable',
      fileAccess: 'Available in app',
    },
  };
}

type SettingsState = ReturnType<typeof getDefaultSettings>;

function deepMerge(target: any, source: any): any {
  const output = Array.isArray(target) ? [...target] : { ...target };
  if (source && typeof source === 'object' && !Array.isArray(source)) {
    Object.keys(source).forEach((key) => {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) && target[key]) {
        output[key] = deepMerge(target[key], source[key]);
      } else {
        output[key] = source[key];
      }
    });
  }
  return output;
}

/* --------------------------------------------------------------------------
   3. MAIN APPLICATION COMPONENT
   -------------------------------------------------------------------------- */
export function SettingsScreen() {
  const navigation = useNavigation<AppNavigation>();
  const { state, dispatch, saveProfile, signOut, streak, todayMinutes } = useStore();
  const { width } = useWindowDimensions();
  const systemColorScheme = useColorScheme();
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;

  const [settings, setSettings] = useState<SettingsState>(() => getDefaultSettings(state.user));
  const [loaded, setLoaded] = useState(false);
  const appearanceSyncRef = useRef('');

  // 3-Level Navigation State
  const [navLevel, setNavLevel] = useState<1 | 2 | 3>(1);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollOffsetsRef = useRef<Record<string, number>>({});

  // Local Form States for Level 3 Screens & Modals
  const [profileForm, setProfileForm] = useState({ name: '', email: '', state: '', attemptYear: '', bio: '' });
  const [pwForm, setPwForm] = useState({ cur: '', nw: '' });
  const [hexDraft, setHexDraft] = useState('#4f46e5');
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const [feedbackModal, setFeedbackModal] = useState<{ visible: boolean; kind: 'feedback' | 'bug'; text: string }>({
    visible: false,
    kind: 'feedback',
    text: '',
  });

  // Native Dropdown Picker Modal State
  const [pickerModal, setPickerModal] = useState<{
    visible: boolean;
    title: string;
    options: { value: string; label: string }[];
    selected: string;
    onSelect: (val: string) => void;
  }>({ visible: false, title: '', options: [], selected: '', onSelect: () => {} });

  // Generic Confirmation / Info Modal State
  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    title: string;
    body: string;
    bullets?: string[];
    note?: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
    onConfirm?: () => void;
  }>({ visible: false, title: '', body: '' });

  // Toast State
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Load persisted state from AsyncStorage
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && mounted) {
          const merged = deepMerge(getDefaultSettings(state.user), JSON.parse(stored));
          setSettings(merged);
          setHexDraft(merged.appearance.customBrandHex || '#4f46e5');
        }
      } catch (e) {
        console.warn('Could not load settings from AsyncStorage:', e);
      } finally {
        if (mounted) setLoaded(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [state.user]);

  useEffect(() => {
    const exam = EXAMS.find((item) => item.id === state.user?.exam);
    setSettings((previous) => ({
      ...previous,
      account: {
        ...previous.account,
        name: state.user?.name || 'Aspirant',
        email: state.user?.email || 'Unavailable',
        joinedDate: state.user?.joined || 'Unavailable',
        bio: state.user?.examFocus || '',
        state: state.user?.currentCity || '',
        avatarInitials: (state.user?.name || 'A').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
      },
      appearance: {
        ...previous.appearance,
        theme: state.settings.themeMode,
        language: state.settings.language,
        readingTextScale: Math.round(state.settings.textScale * 100),
        accentColor: state.settings.accentColor,
        useCustomHex: Boolean(state.settings.customAccentHex),
        customBrandHex: state.settings.customAccentHex ?? previous.appearance.customBrandHex,
        highContrast: state.settings.highContrast,
        reduceMotion: state.settings.reduceMotion,
        animationIntensity: state.settings.animationIntensity,
        displayScaling: state.settings.displayScaling,
        layoutDensity: state.settings.layoutDensity,
        backgroundId: state.settings.backgroundId,
        bgOpacity: state.settings.backgroundOpacity,
        overlayIntensity: state.settings.overlayIntensity,
        dashboardWidgets: state.settings.dashboardWidgets ?? previous.appearance.dashboardWidgets,
        quickActions: state.settings.dashboardQuickActions ?? previous.appearance.quickActions,
      },
      learning: { ...previous.learning, targetExam: exam?.short || 'Unavailable' },
      planner: {
        ...previous.planner,
        dailyStudyGoalHours: state.plannerSettings.dailyTargetHours,
        weeklyStudyGoalHours: state.plannerSettings.weeklyTargetHours,
        defaultTaskDuration: state.plannerSettings.defaultTaskDurationMinutes,
        autoCarryForward: state.plannerSettings.autoCarryForward,
        recurringTasks: state.plannerSettings.recurringTasksEnabled,
        breakIntervals: state.plannerSettings.breakIntervalMinutes,
      },
      focus: {
        ...previous.focus,
        defaultFocusDuration: state.settings.focusDurationMinutes,
        shortBreakDuration: state.settings.shortBreakMinutes,
        longBreakDuration: state.settings.longBreakMinutes,
        autoStartNextSession: state.settings.focusAutoStartNextSession,
        meditationDuration: state.settings.meditationDurationMinutes,
        selectedTheme: FOCUS_THEME_ALIASES[state.settings.focusThemeId] || state.settings.focusThemeId,
        reduceFocusMotion: state.settings.reduceFocusMotion,
        ambientVolume: Math.round(state.settings.focusMusicVolume * 100),
      },
      ai: {
        ...previous.ai,
        responseLanguage: state.settings.aiResponseLanguage,
        responseLength: state.settings.aiResponseLength,
        detailLevel: state.settings.aiDetailLevel,
        defaultMode: state.settings.aiLearningMode,
        saveChatHistory: state.settings.aiSaveChatHistory,
      },
      stats: { ...previous.stats, currentStreakDays: streak },
      notifications: { ...previous.notifications, globalEnabled: state.settings.notifications },
    }));
  }, [state.plannerSettings.dailyTargetHours, state.plannerSettings.weeklyTargetHours, state.settings.accentColor, state.settings.animationIntensity, state.settings.backgroundId, state.settings.backgroundOpacity, state.settings.customAccentHex, state.settings.dashboardQuickActions, state.settings.dashboardWidgets, state.settings.displayScaling, state.settings.highContrast, state.settings.language, state.settings.layoutDensity, state.settings.notifications, state.settings.overlayIntensity, state.settings.reduceMotion, state.settings.textScale, state.settings.themeMode, state.user, streak, todayMinutes]);

  useEffect(() => {
    if (!loaded) return;
    const appearance = settings.appearance;
    const signature = JSON.stringify({
      accentColor: appearance.useCustomHex ? null : appearance.accentColor,
      customAccentHex: appearance.useCustomHex ? appearance.customBrandHex : null,
      highContrast: appearance.highContrast,
      reduceMotion: appearance.reduceMotion,
      animationIntensity: appearance.animationIntensity,
      displayScaling: appearance.displayScaling,
      layoutDensity: appearance.layoutDensity,
      backgroundId: appearance.backgroundId,
      backgroundOpacity: appearance.bgOpacity,
      overlayIntensity: appearance.overlayIntensity,
      dashboardWidgets: appearance.dashboardWidgets,
      quickActions: appearance.quickActions,
    });
    if (appearanceSyncRef.current === signature) return;
    appearanceSyncRef.current = signature;
    dispatch({
      type: 'settings',
      patch: {
        accentColor: appearance.accentColor,
        customAccentHex: appearance.useCustomHex ? appearance.customBrandHex : null,
        highContrast: appearance.highContrast,
        reduceMotion: appearance.reduceMotion,
        animationIntensity: appearance.animationIntensity,
        displayScaling: appearance.displayScaling,
        layoutDensity: appearance.layoutDensity,
        backgroundId: appearance.backgroundId,
        backgroundOpacity: appearance.bgOpacity,
        overlayIntensity: appearance.overlayIntensity,
        dashboardWidgets: appearance.dashboardWidgets,
        dashboardQuickActions: appearance.quickActions,
      },
    });
  }, [dispatch, loaded, settings.appearance]);

  useEffect(() => {
    let active = true;
    void Promise.all([
      readFocusLockSnapshot(state.user?.id),
      focusLockNative ? focusLockNative.getBlockingStatus() : Promise.resolve(null),
    ]).then(([snapshot, status]) => {
      if (!active) return;
      setSettings((previous) => ({
        ...previous,
        focuslock: {
          ...previous.focuslock,
          masterEnabled: Boolean(status?.serviceRunning || snapshot?.sessionState === 'active_focus' || snapshot?.sessionState === 'active_strict' || snapshot?.sessionState === 'scheduled_lock'),
          simUsagePermission: status?.usageAccessEnabled ?? false,
          simAccessibilityService: status?.accessibilityEnabled ?? false,
          simBlockingServiceRunning: status?.serviceRunning ?? false,
        },
        permissions: {
          ...previous.permissions,
          nativeAppBlocking: status
            ? status.accessibilityEnabled && status.usageAccessEnabled && status.serviceRunning ? 'Granted' : 'Needs setup'
            : 'Unavailable on this platform',
        },
      }));
    }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [state.user?.id]);

  const persistSettings = useCallback(async (next: SettingsState) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('Could not persist settings to AsyncStorage:', e);
    }
  }, []);

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => {
      setToast((prev) => (prev && prev.msg === msg ? null : prev));
    }, 2800);
  }, []);

  // Bilingual Helper
  const t = useCallback(
    (en: string, hi?: string) => (settings.appearance.language === 'hi' && hi ? hi : en),
    [settings.appearance.language]
  );

  // Live Theme & Typography Computation
  const isDark = useMemo(() => {
    if (settings.appearance.theme === 'dark') return true;
    if (settings.appearance.theme === 'light') return false;
    return systemColorScheme === 'dark';
  }, [settings.appearance.theme, systemColorScheme]);

  const activeAccent = useMemo<ColorPalette>(() => {
    const a = settings.appearance;
    if (a.useCustomHex && /^#[0-9A-Fa-f]{6}$/.test(a.customBrandHex)) {
      return {
        name: 'Custom',
        hi: 'कस्टम',
        50: a.customBrandHex + '18',
        100: a.customBrandHex + '28',
        500: a.customBrandHex,
        600: a.customBrandHex,
        700: a.customBrandHex,
      };
    }
    return ACCENT_PALETTES[a.accentColor] || ACCENT_PALETTES.indigo;
  }, [settings.appearance.accentColor, settings.appearance.useCustomHex, settings.appearance.customBrandHex]);

  const fontScale = useMemo(() => {
    const map = { small: 0.92, default: 1.0, large: 1.07, xl: 1.14 };
    return (map[settings.appearance.fontSize] || 1) * (settings.appearance.displayScaling / 100);
  }, [settings.appearance.fontSize, settings.appearance.displayScaling]);

  const fs = useCallback((base: number) => Math.round(base * fontScale * 10) / 10, [fontScale]);

  const fontFamilyStyle = useMemo(() => {
    const fam = settings.appearance.fontFamily;
    if (fam === 'Merriweather') return Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
    if (fam === 'System') return undefined;
    return Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' });
  }, [settings.appearance.fontFamily]);

  const isCompact = settings.appearance.layoutDensity === 'compact';
  const highContrast = settings.appearance.highContrast;
  const reduceMotion = settings.appearance.reduceMotion;

  const colors = useMemo(() => {
    const bgItem = BACKGROUND_LIBRARY.find((b) => b.id === settings.appearance.backgroundId);
    const customBgActive = Boolean(settings.appearance.backgroundId !== 'none' && bgItem);
    const baseBg = customBgActive
      ? isDark
        ? bgItem!.darkBg
        : bgItem!.previewBg
      : isDark
      ? '#020617'
      : '#f8fafc';

    return {
      bg: baseBg,
      surface: isDark ? '#0f172a' : '#ffffff',
      surfaceAlt: isDark ? '#1e293b' : '#f1f5f9',
      surfaceHover: isDark ? '#1e293b' : '#f8fafc',
      border: highContrast ? (isDark ? '#94a3b8' : '#334155') : isDark ? '#1e293b' : '#e2e8f0',
      divider: isDark ? '#1e293b' : '#f1f5f9',
      text: isDark ? '#f8fafc' : '#0f172a',
      textSecondary: isDark ? '#cbd5e1' : '#334155',
      textMuted: isDark ? '#94a3b8' : '#64748b',
      headerBg: isDark ? '#020617' : '#ffffff',
      danger: '#e11d48',
      dangerBg: isDark ? '#4c0519' : '#fff1f2',
      emerald: '#059669',
      emeraldBg: isDark ? '#064e3b' : '#ecfdf5',
      amber: '#d97706',
      amberBg: isDark ? '#451a03' : '#fffbeb',
      amberBorder: isDark ? '#92400e' : '#fde68a',
    };
  }, [isDark, highContrast, settings.appearance.backgroundId]);

  // State Mutation
  const updateSetting = useCallback(
    (path: string, val: any, toastMsg?: string) => {
      if (path === 'focuslock.masterEnabled' || path.startsWith('focuslock.sim') || path === 'account.biometricLock') {
        showToast(
          path === 'account.biometricLock'
            ? t('Biometric app lock is not available in the current application services.', 'वर्तमान ऐप सेवाओं में बायोमेट्रिक ऐप लॉक उपलब्ध नहीं है।')
            : focusLockNative
              ? t('Focus Lock is controlled by the active focus session and Android permissions.', 'फ़ोकस लॉक सक्रिय फ़ोकस सत्र और Android अनुमतियों द्वारा नियंत्रित है।')
              : t('Focus Lock is unavailable on this platform.', 'इस प्लेटफ़ॉर्म पर फ़ोकस लॉक उपलब्ध नहीं है।'),
          'info'
        );
        return;
      }
      setSettings((prev) => {
        const copy = JSON.parse(JSON.stringify(prev));
        const parts = path.split('.');
        let target = copy;
        for (let i = 0; i < parts.length - 1; i++) {
          target = target[parts[i]];
        }
        target[parts[parts.length - 1]] = val;
        persistSettings(copy);
        return copy;
      });
      if (path === 'appearance.theme') dispatch({ type: 'settings', patch: { themeMode: val } });
      if (path === 'appearance.language') dispatch({ type: 'settings', patch: { language: val } });
      if (path === 'appearance.readingTextScale') dispatch({ type: 'settings', patch: { textScale: Math.max(0.8, Math.min(1.4, Number(val) / 100)) } });
      if (path === 'planner.dailyStudyGoalHours') dispatch({ type: 'plannerSettings', patch: { dailyTargetHours: Number(val) } });
      if (path === 'planner.weeklyStudyGoalHours') dispatch({ type: 'plannerSettings', patch: { weeklyTargetHours: Number(val) } });
      if (path === 'planner.defaultTaskDuration') dispatch({ type: 'plannerSettings', patch: { defaultTaskDurationMinutes: Number(val) } });
      if (path === 'planner.autoCarryForward') dispatch({ type: 'plannerSettings', patch: { autoCarryForward: Boolean(val) } });
      if (path === 'planner.recurringTasks') dispatch({ type: 'plannerSettings', patch: { recurringTasksEnabled: Boolean(val) } });
      if (path === 'planner.breakIntervals') dispatch({ type: 'plannerSettings', patch: { breakIntervalMinutes: Number(val) } });
      if (path === 'planner.smartSuggestions') dispatch({ type: 'plannerSettings', patch: { aiSuggestions: Boolean(val) } });
      if (path === 'focus.defaultFocusDuration') dispatch({ type: 'settings', patch: { focusDurationMinutes: Number(val) } });
      if (path === 'focus.shortBreakDuration') dispatch({ type: 'settings', patch: { shortBreakMinutes: Number(val) } });
      if (path === 'focus.longBreakDuration') dispatch({ type: 'settings', patch: { longBreakMinutes: Number(val) } });
      if (path === 'focus.meditationDuration') dispatch({ type: 'settings', patch: { meditationDurationMinutes: Number(val) } });
      if (path === 'focus.autoStartNextSession') dispatch({ type: 'settings', patch: { focusAutoStartNextSession: Boolean(val) } });
      if (path === 'focus.selectedTheme') dispatch({ type: 'settings', patch: { focusThemeId: FOCUS_THEME_IDS[String(val)] || String(val) } });
      if (path === 'focus.reduceFocusMotion') dispatch({ type: 'settings', patch: { reduceFocusMotion: Boolean(val) } });
      if (path === 'focus.themeAnimationIntensity') dispatch({ type: 'settings', patch: { focusAnimationIntensity: val === 'minimal' ? 'minimal' : val === 'dynamic' ? 'rich' : 'balanced' } });
      if (path === 'focus.ambientVolume') dispatch({ type: 'settings', patch: { focusMusicVolume: Math.max(0, Math.min(1, Number(val) / 100)) } });
      if (path === 'focus.ambientSound') {
        const musicId = String(val).toLowerCase().includes('cosmic') ? 'pure_cosmic_waves' : 'deep_positive_energy';
        dispatch({ type: 'settings', patch: { focusMusicId: musicId } });
      }
      if (path === 'ai.responseLanguage') dispatch({ type: 'settings', patch: { aiResponseLanguage: String(val) } });
      if (path === 'ai.responseLength') dispatch({ type: 'settings', patch: { aiResponseLength: val } });
      if (path === 'ai.detailLevel') dispatch({ type: 'settings', patch: { aiDetailLevel: String(val) } });
      if (path === 'ai.defaultMode') dispatch({ type: 'settings', patch: { aiLearningMode: String(val) } });
      if (path === 'ai.saveChatHistory') dispatch({ type: 'settings', patch: { aiSaveChatHistory: Boolean(val) } });
      if (path === 'learning.targetExam') {
        const exam = EXAMS.find((item) => item.short === val || item.id === val);
        if (exam) {
          void saveProfile({ exam: exam.id }).then((result) => {
            if (!result.ok) showToast(result.error, 'error');
          });
        }
      }
      if (path === 'notifications.globalEnabled') {
        if (val) {
          void requestNotificationPermission().then((granted) => {
            dispatch({ type: 'settings', patch: { notifications: granted } });
            if (!granted) showToast(t('Notification permission was not granted', 'सूचना अनुमति नहीं दी गई'), 'error');
          });
        } else {
          dispatch({ type: 'settings', patch: { notifications: false } });
        }
      }
      if (toastMsg) showToast(toastMsg, 'success');
    },
    [dispatch, persistSettings, saveProfile, showToast]
  );

  const mutateSettings = useCallback(
    (updater: (draft: SettingsState) => void, toastMsg?: string, toastType: 'success' | 'error' | 'info' = 'success') => {
      setSettings((prev) => {
        const copy: SettingsState = JSON.parse(JSON.stringify(prev));
        updater(copy);
        persistSettings(copy);
        return copy;
      });
      if (toastMsg) showToast(toastMsg, toastType);
    },
    [persistSettings, showToast]
  );

  // Navigation Helpers
  const animateNavigation = useCallback(() => {
    if (!settings.appearance.reduceMotion && Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  }, [settings.appearance.reduceMotion]);

  const goHome = () => {
    animateNavigation();
    setNavLevel(1);
    setCategoryId(null);
    setDetailId(null);
    setSearchQuery('');
    navigation.popTo('DashboardRoot');
  };

  const shareExport = useCallback(async (label: string, value: unknown) => {
    try {
      await Share.share({ message: JSON.stringify(value, null, 2), title: label });
      showToast(t(`${label} ready to share`, `${label} साझा करने के लिए तैयार`), 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('Export unavailable', 'एक्सपोर्ट उपलब्ध नहीं'), 'error');
    }
  }, [showToast, t]);

  const openCategory = (cat: string) => {
    animateNavigation();
    setNavLevel(2);
    setCategoryId(cat);
    setDetailId(null);
    setSearchQuery('');
  };

  const openDetail = (cat: string, det: string) => {
    animateNavigation();
    if (det === 'edit_profile') {
      setProfileForm({
        name: settings.account.name,
        email: settings.account.email,
        state: settings.account.state,
        attemptYear: settings.account.attemptYear,
        bio: settings.account.bio,
      });
    } else if (det === 'change_password') {
      setPwForm({ cur: '', nw: '' });
    }
    setNavLevel(3);
    setCategoryId(cat);
    setDetailId(det);
    setSearchQuery('');
  };

  const goBack = () => {
    animateNavigation();
    if (navLevel === 3) {
      setNavLevel(2);
      setDetailId(null);
    } else {
      setNavLevel(1);
      setCategoryId(null);
    }
  };

  useEffect(() => {
    const handler = () => {
      if (modalConfig.visible) {
        setModalConfig((current) => ({ ...current, visible: false }));
        return true;
      }
      if (pickerModal.visible) {
        setPickerModal((current) => ({ ...current, visible: false }));
        return true;
      }
      if (feedbackModal.visible) {
        setFeedbackModal((current) => ({ ...current, visible: false }));
        return true;
      }
      if (navLevel > 1) {
        goBack();
        return true;
      }
      return false;
    };
    if (Platform.OS !== 'android') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', handler);
    return () => subscription.remove();
  }, [feedbackModal.visible, goBack, modalConfig.visible, navLevel, pickerModal.visible]);

  useEffect(() => {
    const addListener = (navigation as any).addListener as ((event: string, listener: (event: any) => void) => () => void) | undefined;
    if (!addListener) return undefined;
    return addListener('beforeRemove', (event) => {
      if (navLevel === 1) return;
      event.preventDefault();
      goBack();
    });
  }, [goBack, navLevel, navigation]);

  // Modals & Interactive Actions
  const openPremiumModal = (featureName = '') => {
    setModalConfig({
      visible: true,
      title: t('Study Sakha Pro — Premium Feature', 'स्टडी सखा प्रो — प्रीमियम सुविधा'),
      body: `${featureName ? featureName + '\n\n' : ''}${t(
        'Upgrade to Study Sakha Pro for unlimited Sakha AI queries, all 21 Focus Themes, Cloud Backup, Strict Focus Lock, and Premium Backgrounds.',
        'असीमित सखा AI, सभी 21 फ़ोकस थीम, क्लाउड बैकअप और स्ट्रिक्ट फ़ोकस लॉक के लिए स्टडी सखा प्रो में अपग्रेड करें।'
      )}`,
      bullets: [
        t('Unlimited Gemini-powered Sakha AI doubt solving & PYQ analysis', 'असीमित सखा AI डाउट सॉल्विंग और PYQ विश्लेषण'),
        t('All 21 Focus Themes & Premium Custom Backgrounds', 'सभी 21 फ़ोकस थीम और प्रीमियम बैकग्राउंड'),
        t('Automated Cloud Backup & Multi-Device Sync', 'ऑटोमैटिक क्लाउड बैकअप और मल्टी-डिवाइस सिंक'),
        t('Strict Focus Lock & Smart Planner Suggestions', 'स्ट्रिक्ट फ़ोकस लॉक और स्मार्ट प्लानर सुझाव'),
      ],
      note: t(
        supabaseConfigured
          ? 'Premium entitlement is managed by the configured account service. This client does not alter billing status.'
          : 'Premium entitlement is unavailable because no account billing service is configured.',
        supabaseConfigured
          ? 'प्रीमियम सदस्यता कॉन्फ़िगर की गई खाता सेवा से प्रबंधित होती है। यह ऐप बिलिंग स्थिति नहीं बदलता।'
          : 'प्रीमियम सदस्यता उपलब्ध नहीं है क्योंकि खाता बिलिंग सेवा कॉन्फ़िगर नहीं है।'
      ),
      confirmText: t('Close', 'बंद करें'),
      cancelText: t('Cancel', 'रद्द करें'),
      onConfirm: () => {
        showToast(
          supabaseConfigured
            ? t('Manage billing from the supported account portal.', 'बिलिंग समर्थित खाता पोर्टल से प्रबंधित करें।')
            : t('Premium billing is unavailable in this build.', 'इस बिल्ड में प्रीमियम बिलिंग उपलब्ध नहीं है।'),
          'info'
        );
      },
    });
  };

  const resetCategory = (catKey: keyof SettingsState) => {
    const defaults = getDefaultSettings();
    if (!defaults[catKey]) return;
    setModalConfig({
      visible: true,
      title: t('Reset Category to Defaults?', 'श्रेणी को डिफ़ॉल्ट पर रीसेट करें?'),
      body: t(
        'All settings inside this category will be restored to their factory Study Sakha defaults.',
        'इस श्रेणी की सभी सेटिंग्स डिफ़ॉल्ट मानों पर वापस आ जाएँगी।'
      ),
      confirmText: t('Reset Defaults', 'रीसेट करें'),
      cancelText: t('Cancel', 'रद्द करें'),
      danger: true,
      onConfirm: () => {
        mutateSettings(
          (d) => {
            (d as any)[catKey] = JSON.parse(JSON.stringify(defaults[catKey]));
          },
          t('Category reset to defaults', 'श्रेणी डिफ़ॉल्ट पर रीसेट हो गई')
        );
      },
    });
  };

  const applyStudyPreset = (preset: string) => {
    mutateSettings(
      (d) => {
        d.learning.activePreset = preset;
        if (preset === 'RAS Profile') {
          d.learning.targetExam = 'RAS';
          d.learning.preferredSubjects = ['Rajasthan History & Culture', 'Indian Polity', 'Current Affairs', 'Indian Economy'];
          d.library.pyqExamFilter = 'RAS';
        } else if (preset === 'UPSC Profile') {
          d.learning.targetExam = 'UPSC';
          d.learning.preferredSubjects = ['Indian Polity', 'Indian Economy', 'Current Affairs', 'Ethics & Public Admin'];
          d.library.pyqExamFilter = 'UPSC';
        } else if (preset === 'RSSB Profile') {
          d.learning.targetExam = 'RSSB';
          d.learning.preferredSubjects = ['Rajasthan History & Culture', 'Rajasthan Geography', 'Hindi & English Grammar'];
          d.library.pyqExamFilter = 'RSSB';
        } else if (preset === 'NET/JRF Profile') {
          d.learning.targetExam = 'NET/JRF';
          d.learning.preferredSubjects = ['Reasoning & Mental Ability', 'Current Affairs'];
          d.library.pyqExamFilter = 'NET/JRF';
        }
      },
      t(`Applied ${preset}`, `${preset} लागू किया गया`)
    );
  };

  const simulateExport = (filename: string) => {
    const value = filename.includes('notes')
      ? state.notes
      : filename.includes('progress')
        ? { studyLog: state.studyLog, results: state.results, focusSessions: state.recordedFocusSessionIds }
        : filename.includes('planner')
          ? { tasks: state.plannerTasks, schedule: state.plannerScheduleItems, settings: state.plannerSettings }
          : { profile: state.user, settings: state.settings };
    void shareExport(filename, value);
  };

  const simulateSyncNow = () => {
    showToast(
      supabaseConfigured
        ? t('Cloud sync is managed automatically by the account store.', 'क्लाउड सिंक अकाउंट स्टोर द्वारा स्वचालित रूप से प्रबंधित है।')
        : t('Cloud sync is unavailable because Supabase is not configured.', 'Supabase कॉन्फ़िगर नहीं है, इसलिए क्लाउड सिंक उपलब्ध नहीं है।'),
      supabaseConfigured ? 'info' : 'error'
    );
  };

  const openLegalModal = (type: 'changelog' | 'credits' | 'privacy' | 'terms') => {
    const titles = {
      changelog: t('Changelog', 'चेंजलॉग'),
      credits: t('Credits', 'क्रेडिट'),
      privacy: t('Privacy Policy', 'गोपनीयता नीति'),
      terms: t('Terms of Service', 'सेवा की शर्तें'),
    };
    const bodies = {
      changelog:
        `${APP_VERSION}\n• Settings preferences are connected to available Study Sakha state\n• Hindi and English interface support\n• Existing learning, planner and focus workflows preserved`,
      credits:
        'Designed & engineered for Indian competitive exam aspirants (RAS, RSSB, UPSC, NET/JRF, SSC). Built with accessible typography and clean iconography.',
      privacy:
        'Study Sakha respects student privacy. Your study notes, planner schedules, and PYQ performance are never sold to third parties. AI model improvement sharing is disabled by default.',
      terms:
        'By using Study Sakha, you agree to use study materials, mock tests, and Sakha AI responsibly for personal educational preparation.',
    };
    setModalConfig({
      visible: true,
      title: titles[type],
      body: bodies[type],
      cancelText: t('Close', 'बंद करें'),
    });
  };

  if (!loaded) return null;

  /* --------------------------------------------------------------------------
     4. REUSABLE UI PRIMITIVES (MATCHING index.html 1:1)
     -------------------------------------------------------------------------- */
  const BadgePro = () => (
    <View style={[styles.badgePro, { backgroundColor: colors.amberBg, borderColor: colors.amberBorder }]}>
      <Text style={[styles.badgeProText, { color: colors.amber, fontSize: fs(10) }]}>
        {settings.subscription.isPremium ? '👑 PRO' : `🔒 ${t('PRO', 'प्रो')}`}
      </Text>
    </View>
  );

  const BadgeSimulated = () => (
    <View style={[styles.badgeSim, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      <Text style={[styles.badgeSimText, { color: colors.textMuted, fontSize: fs(10) }]}>
        {t('Unavailable', 'अनुपलब्ध')}
      </Text>
    </View>
  );

  const Section = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
    <View style={{ marginBottom: isCompact ? 14 : 20 }}>
      <View style={{ paddingHorizontal: 4, marginBottom: 8 }}>
        <Text
          style={{
            fontSize: fs(11),
            fontWeight: '700',
            letterSpacing: 0.7,
            color: colors.textMuted,
            fontFamily: fontFamilyStyle,
          }}
        >
          {title.toUpperCase()}
        </Text>
        {subtitle ? (
          <Text style={{ fontSize: fs(11.5), color: colors.textMuted, marginTop: 2, fontFamily: fontFamilyStyle }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: highContrast ? 1.5 : 1,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );

  const ToggleRow = ({
    label,
    desc,
    value,
    path,
    premium = false,
    simulated = false,
    available = true,
    toastMsg,
    last = false,
  }: {
    label: string;
    desc?: string;
    value: boolean;
    path: string;
    premium?: boolean;
    simulated?: boolean;
    available?: boolean;
    toastMsg?: string;
    last?: boolean;
  }) => {
    const isLocked = premium && !settings.subscription.isPremium;
    return (
      <View
        style={[
          styles.row,
          {
            paddingVertical: isCompact ? 10 : 14,
            borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
            borderBottomColor: colors.divider,
            opacity: available ? 1 : 0.62,
          },
        ]}
      >
        <View style={{ flex: 1, marginRight: 12 }}>
          <View style={styles.badgeWrap}>
            <Text style={{ fontSize: fs(13.5), fontWeight: '500', color: colors.text, fontFamily: fontFamilyStyle }}>
              {label}
            </Text>
            {premium ? <BadgePro /> : null}
            {simulated ? <BadgeSimulated /> : null}
          </View>
          {desc ? (
            <Text style={{ fontSize: fs(11.5), color: colors.textMuted, marginTop: 3, lineHeight: fs(16), fontFamily: fontFamilyStyle }}>
              {desc}
            </Text>
          ) : null}
        </View>
        <Switch
          value={available && (isLocked ? false : value)}
          disabled={!available}
          onValueChange={(next) => {
            if (isLocked) openPremiumModal(label);
            else updateSetting(path, next, toastMsg);
          }}
          trackColor={{ false: isDark ? '#334155' : '#cbd5e1', true: activeAccent[600] }}
          thumbColor="#ffffff"
        />
      </View>
    );
  };

  const SelectRow = ({
    label,
    desc,
    value,
    options,
    path,
    premium = false,
    last = false,
  }: {
    label: string;
    desc?: string;
    value: string;
    options: (string | { value: string; label: string })[];
    path: string;
    premium?: boolean;
    last?: boolean;
  }) => {
    const isLocked = premium && !settings.subscription.isPremium;
    const normalized = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
    const currentLabel = normalized.find((o) => o.value === value)?.label || value;

    return (
      <View
        style={[
          styles.row,
          {
            paddingVertical: isCompact ? 10 : 14,
            borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
            borderBottomColor: colors.divider,
          },
        ]}
      >
        <View style={{ flex: 1, marginRight: 12 }}>
          <View style={styles.badgeWrap}>
            <Text style={{ fontSize: fs(13.5), fontWeight: '500', color: colors.text, fontFamily: fontFamilyStyle }}>
              {label}
            </Text>
            {premium ? <BadgePro /> : null}
          </View>
          {desc ? (
            <Text style={{ fontSize: fs(11.5), color: colors.textMuted, marginTop: 2, fontFamily: fontFamilyStyle }}>
              {desc}
            </Text>
          ) : null}
        </View>
        {isLocked ? (
          <TouchableOpacity
            onPress={() => openPremiumModal(label)}
            style={[styles.selectPill, { backgroundColor: colors.amberBg, borderColor: colors.amberBorder }]}
          >
            <Text style={{ fontSize: fs(11.5), fontWeight: '600', color: colors.amber }}>
              🔒 {t('Unlock with Pro', 'प्रो से अनलॉक करें')}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() =>
              setPickerModal({
                visible: true,
                title: label,
                options: normalized,
                selected: value,
                onSelect: (val) => updateSetting(path, val),
              })
            }
            style={[styles.selectPill, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
          >
            <Text
              style={{ fontSize: fs(12), fontWeight: '600', color: colors.text, maxWidth: 150, fontFamily: fontFamilyStyle }}
              numberOfLines={1}
            >
              {currentLabel}
            </Text>
            <Text style={{ fontSize: fs(11), color: colors.textMuted, marginLeft: 6 }}>▾</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const SegmentRow = ({
    label,
    desc,
    value,
    options,
    path,
    last = false,
  }: {
    label: string;
    desc?: string;
    value: string;
    options: { value: string; label: string }[];
    path: string;
    last?: boolean;
  }) => (
    <View
      style={[
        styles.rowColumn,
        {
          paddingVertical: isCompact ? 10 : 14,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: colors.divider,
        },
      ]}
    >
      <View style={{ marginBottom: 8 }}>
        <Text style={{ fontSize: fs(13.5), fontWeight: '500', color: colors.text, fontFamily: fontFamilyStyle }}>
          {label}
        </Text>
        {desc ? (
          <Text style={{ fontSize: fs(11.5), color: colors.textMuted, marginTop: 2, fontFamily: fontFamilyStyle }}>
            {desc}
          </Text>
        ) : null}
      </View>
      <View style={[styles.segmentContainer, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => updateSetting(path, opt.value)}
              style={[
                styles.segmentItem,
                active && {
                  backgroundColor: isDark ? '#334155' : '#ffffff',
                  shadowColor: '#000',
                  shadowOpacity: 0.08,
                  shadowRadius: 2,
                  elevation: 1,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: fs(11.5),
                  fontWeight: '600',
                  color: active ? (isDark ? '#ffffff' : activeAccent[600]) : colors.textMuted,
                  fontFamily: fontFamilyStyle,
                }}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const SliderRow = ({
    label,
    desc,
    value,
    min,
    max,
    step = 1,
    unit = '',
    path,
    last = false,
  }: {
    label: string;
    desc?: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    path: string;
    last?: boolean;
  }) => {
    const pct = Math.max(0, Math.min(100, ((value - min) / Math.max(1, max - min)) * 100));
    return (
      <View
        style={[
          styles.rowColumn,
          {
            paddingVertical: isCompact ? 10 : 14,
            borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
            borderBottomColor: colors.divider,
          },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={{ fontSize: fs(13.5), fontWeight: '500', color: colors.text, fontFamily: fontFamilyStyle }}>
              {label}
            </Text>
            {desc ? (
              <Text style={{ fontSize: fs(11.5), color: colors.textMuted, marginTop: 2, fontFamily: fontFamilyStyle }}>
                {desc}
              </Text>
            ) : null}
          </View>
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor: isDark ? '#1e293b' : activeAccent[50],
              borderWidth: 1,
              borderColor: isDark ? '#334155' : activeAccent[100],
            }}
          >
            <Text style={{ fontSize: fs(11.5), fontWeight: '700', color: isDark ? '#f8fafc' : activeAccent[700] }}>
              {value}
              {unit}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            onPress={() => updateSetting(path, Math.max(min, value - step))}
            style={[styles.stepBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
          >
            <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.text }}>−</Text>
          </TouchableOpacity>
          <View style={[styles.sliderTrack, { backgroundColor: isDark ? '#334155' : '#cbd5e1' }]}>
            <View style={[styles.sliderFill, { width: `${pct}%`, backgroundColor: activeAccent[600] }]} />
          </View>
          <TouchableOpacity
            onPress={() => updateSetting(path, Math.min(max, value + step))}
            style={[styles.stepBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
          >
            <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.text }}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const NavRow = ({
    label,
    desc,
    valueText,
    icon,
    onPress,
    premium = false,
    danger = false,
    simulated = false,
    last = false,
  }: {
    label: string;
    desc?: string;
    valueText?: string;
    icon?: string;
    onPress: () => void;
    premium?: boolean;
    danger?: boolean;
    simulated?: boolean;
    last?: boolean;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.row,
        {
          paddingVertical: isCompact ? 10 : 14,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: colors.divider,
        },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }}>
        {icon ? (
          <View
            style={[
              styles.navIconBox,
              { backgroundColor: danger ? colors.dangerBg : colors.surfaceAlt },
            ]}
          >
            <Text style={{ fontSize: 15 }}>{icon}</Text>
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <View style={styles.badgeWrap}>
            <Text
              style={{
                fontSize: fs(13.5),
                fontWeight: '500',
                color: danger ? colors.danger : colors.text,
                fontFamily: fontFamilyStyle,
              }}
            >
              {label}
            </Text>
            {premium ? <BadgePro /> : null}
            {simulated ? <BadgeSimulated /> : null}
          </View>
          {desc ? (
            <Text
              style={{ fontSize: fs(11.5), color: colors.textMuted, marginTop: 2, fontFamily: fontFamilyStyle }}
              numberOfLines={1}
            >
              {desc}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {valueText ? (
          <Text
            style={{ fontSize: fs(11.5), fontWeight: '500', color: colors.textMuted, maxWidth: 125, marginRight: 6 }}
            numberOfLines={1}
          >
            {valueText}
          </Text>
        ) : null}
        <Text style={{ fontSize: 18, color: colors.textMuted, fontWeight: '500' }}>›</Text>
      </View>
    </TouchableOpacity>
  );

  /* --------------------------------------------------------------------------
     5. LEVEL 1: SETTINGS HOME SCREEN
     -------------------------------------------------------------------------- */
  const renderHome = () => {
    const a = settings.appearance;
    const p = settings.planner;
    const fl = settings.focuslock;
    const sub = settings.subscription;
    const acc = settings.account;

    const metricWidth = isTablet ? '23.8%' : '48.2%';
    const quickWidth = isTablet ? '23.8%' : '48.2%';
    const catWidth = isDesktop ? '32%' : isTablet ? '48.5%' : '100%';
    const specialWidth = isTablet ? '48.5%' : '100%';

    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        contentOffset={{ x: 0, y: scrollOffsetsRef.current.home ?? 0 }}
        onScroll={(event) => {
          scrollOffsetsRef.current.home = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        {/* Student Profile Summary Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: highContrast ? 1.5 : 1,
              padding: 18,
              marginBottom: 22,
            },
          ]}
        >
          <View style={{ flexDirection: isTablet ? 'row' : 'column', justifyContent: 'space-between', gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={[styles.avatarBox, { backgroundColor: activeAccent[600] }]}>
                <Text style={{ color: '#ffffff', fontSize: fs(18), fontWeight: '700' }}>{acc.avatarInitials}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <View style={styles.badgeWrap}>
                  <Text style={{ fontSize: fs(17), fontWeight: '700', color: colors.text, fontFamily: fontFamilyStyle }}>
                    {acc.name}
                  </Text>
                  <View
                    style={[
                      styles.planPill,
                      {
                        backgroundColor: sub.isPremium ? colors.amberBg : colors.surfaceAlt,
                        borderColor: sub.isPremium ? colors.amberBorder : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: fs(10.5), fontWeight: '700', color: sub.isPremium ? colors.amber : colors.textSecondary }}>
                      {sub.isPremium ? '👑 ' : ''}
                      {sub.planName}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: fs(11.5), color: colors.textMuted, marginTop: 4, fontFamily: fontFamilyStyle }}>
                  🎯 {t('Target:', 'लक्ष्य:')} <Text style={{ fontWeight: '700', color: colors.textSecondary }}>{settings.learning.targetExam}</Text> •{' '}
                  {t('Joined', 'जुड़े')}: {acc.joinedDate}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={() => openCategory('account')}
                style={[styles.smallActionBtn, { backgroundColor: colors.surfaceAlt }]}
              >
                <Text style={{ fontSize: fs(11.5), fontWeight: '600', color: colors.text }}>
                  {t('Manage Account', 'खाता प्रबंधित करें')}
                </Text>
              </TouchableOpacity>
              {!sub.isPremium && (
                <TouchableOpacity
                  onPress={() => openCategory('special_premium')}
                  style={[styles.smallActionBtn, { backgroundColor: activeAccent[600] }]}
                >
                  <Text style={{ fontSize: fs(11.5), fontWeight: '700', color: '#ffffff' }}>
                    👑 {t('Upgrade Pro', 'प्रो बनें')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Quick Overview Metrics Strip */}
          <View style={[styles.flexWrapGrid, { marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.divider }]}>
            <TouchableOpacity
              onPress={() => openCategory('planner')}
              style={[styles.metricTile, { width: metricWidth, backgroundColor: colors.surfaceAlt }]}
            >
              <Text style={{ fontSize: fs(10.5), fontWeight: '600', color: colors.textMuted }}>
                ⏱ {t('Daily Study Goal', 'दैनिक अध्ययन लक्ष्य')}
              </Text>
              <Text style={{ fontSize: fs(15), fontWeight: '700', color: colors.text, marginTop: 4 }}>
                {p.dailyStudyGoalHours}h 00m
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => openCategory('stats')}
              style={[styles.metricTile, { width: metricWidth, backgroundColor: colors.surfaceAlt }]}
            >
              <Text style={{ fontSize: fs(10.5), fontWeight: '600', color: colors.textMuted }}>
                🔥 {t('Study Streak', 'अध्ययन स्ट्रीक')}
              </Text>
              <Text style={{ fontSize: fs(15), fontWeight: '700', color: colors.text, marginTop: 4 }}>
                {settings.stats.currentStreakDays} {t('Days', 'दिन')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => openCategory('learning')}
              style={[styles.metricTile, { width: metricWidth, backgroundColor: colors.surfaceAlt }]}
            >
              <Text style={{ fontSize: fs(10.5), fontWeight: '600', color: colors.textMuted }}>
                🎓 {t('Target Exam', 'लक्ष्य परीक्षा')}
              </Text>
              <Text style={{ fontSize: fs(15), fontWeight: '700', color: colors.text, marginTop: 4 }}>
                {settings.learning.targetExam}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => openCategory('focuslock')}
              style={[styles.metricTile, { width: metricWidth, backgroundColor: colors.surfaceAlt }]}
            >
              <Text style={{ fontSize: fs(10.5), fontWeight: '600', color: colors.textMuted }}>
                🛡️ {t('Focus Lock', 'फ़ोकस लॉक')}
              </Text>
              <Text
                style={{
                  fontSize: fs(15),
                  fontWeight: '700',
                  color: fl.masterEnabled ? colors.emerald : colors.textMuted,
                  marginTop: 4,
                }}
              >
                {fl.masterEnabled ? t('Armed', 'सक्रिय') : t('Paused', 'बंद')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* All 4 Quick Controls */}
        <View style={{ marginBottom: 22 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 4 }}>
            <Text style={{ fontSize: fs(11), fontWeight: '700', letterSpacing: 0.7, color: colors.textMuted }}>
              {t('QUICK CONTROLS', 'त्वरित नियंत्रण')}
            </Text>
            <Text style={{ fontSize: fs(10.5), color: colors.textMuted }}>
              {t('Synced with primary categories', 'प्राथमिक श्रेणियों के साथ सिंक')}
            </Text>
          </View>

          <View style={styles.flexWrapGrid}>
            {/* QC 1: App Appearance */}
            <View style={[styles.quickCard, { width: quickWidth, backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.quickHeader}>
                <Text style={{ fontSize: fs(12), fontWeight: '600', color: colors.text }}>🌓 {t('Appearance', 'थीम')}</Text>
                <TouchableOpacity onPress={() => openCategory('appearance')}>
                  <Text style={{ fontSize: fs(11), fontWeight: '600', color: activeAccent[600] }}>{t('More', 'अधिक')}</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.segmentContainer, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                {(['light', 'dark', 'system'] as const).map((m) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => updateSetting('appearance.theme', m)}
                    style={[styles.segmentItem, a.theme === m && { backgroundColor: isDark ? '#334155' : '#ffffff' }]}
                  >
                    <Text style={{ fontSize: fs(10.5), fontWeight: '600', color: a.theme === m ? (isDark ? '#fff' : activeAccent[600]) : colors.textMuted }}>
                      {m === 'light' ? t('Light', 'लाइट') : m === 'dark' ? t('Dark', 'डार्क') : t('Auto', 'ऑटो')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* QC 2: App Language */}
            <View style={[styles.quickCard, { width: quickWidth, backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.quickHeader}>
                <Text style={{ fontSize: fs(12), fontWeight: '600', color: colors.text }}>🌐 {t('App Language', 'ऐप भाषा')}</Text>
                <TouchableOpacity onPress={() => openCategory('appearance')}>
                  <Text style={{ fontSize: fs(11), fontWeight: '600', color: activeAccent[600] }}>{t('Owner', 'सेटिंग')}</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.segmentContainer, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <TouchableOpacity
                  onPress={() => updateSetting('appearance.language', 'en', 'Switched to English')}
                  style={[styles.segmentItem, a.language === 'en' && { backgroundColor: isDark ? '#334155' : '#ffffff' }]}
                >
                  <Text style={{ fontSize: fs(11), fontWeight: '600', color: a.language === 'en' ? (isDark ? '#fff' : activeAccent[600]) : colors.textMuted }}>
                    English
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => updateSetting('appearance.language', 'hi', 'हिन्दी भाषा चुनी गई')}
                  style={[styles.segmentItem, a.language === 'hi' && { backgroundColor: isDark ? '#334155' : '#ffffff' }]}
                >
                  <Text style={{ fontSize: fs(11), fontWeight: '600', color: a.language === 'hi' ? (isDark ? '#fff' : activeAccent[600]) : colors.textMuted }}>
                    हिन्दी
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* QC 3: Daily Study Goal */}
            <View style={[styles.quickCard, { width: quickWidth, backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.quickHeader}>
                <Text style={{ fontSize: fs(12), fontWeight: '600', color: colors.text }}>🎯 {t('Daily Goal', 'दैनिक लक्ष्य')}</Text>
                <Text style={{ fontSize: fs(12), fontWeight: '700', color: colors.emerald }}>{p.dailyStudyGoalHours}h</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <TouchableOpacity
                  onPress={() => updateSetting('planner.dailyStudyGoalHours', Math.max(1, p.dailyStudyGoalHours - 1))}
                  style={[styles.stepBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                >
                  <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.text }}>−</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: fs(11), color: colors.textMuted }}>
                  {p.dailyStudyGoalHours * 7}h / {t('wk', 'सप्ताह')}
                </Text>
                <TouchableOpacity
                  onPress={() => updateSetting('planner.dailyStudyGoalHours', Math.min(16, p.dailyStudyGoalHours + 1))}
                  style={[styles.stepBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                >
                  <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.text }}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* QC 4: Focus Lock */}
            <View style={[styles.quickCard, { width: quickWidth, backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.quickHeader}>
                <Text style={{ fontSize: fs(12), fontWeight: '600', color: colors.text }}>🛡️ {t('Focus Lock', 'फ़ोकस लॉक')}</Text>
                <TouchableOpacity onPress={() => openCategory('focuslock')}>
                  <Text style={{ fontSize: fs(11), fontWeight: '600', color: activeAccent[600] }}>{t('Rules', 'नियम')}</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: fs(11), color: colors.textMuted }}>
                  {fl.blockedApps.length} {t('apps blocked', 'ऐप ब्लॉक')}
                </Text>
                <Switch
                  value={fl.masterEnabled}
                  onValueChange={(next) =>
                    updateSetting(
                      'focuslock.masterEnabled',
                      next,
                      next ? t('Focus Lock armed', 'फ़ोकस लॉक सक्रिय') : t('Focus Lock paused', 'फ़ोकस लॉक बंद')
                    )
                  }
                  trackColor={{ false: isDark ? '#334155' : '#cbd5e1', true: activeAccent[600] }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>
          </View>
        </View>

        {/* 12 Main Settings Categories */}
        <View style={{ marginBottom: 22 }}>
          <Text style={{ fontSize: fs(11), fontWeight: '700', letterSpacing: 0.7, color: colors.textMuted, marginBottom: 10, paddingHorizontal: 4 }}>
            {t('ALL SETTINGS CATEGORIES (12)', 'सभी सेटिंग्स श्रेणियाँ (12)')}
          </Text>
          <View style={styles.flexWrapGrid}>
            {MAIN_CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c.id}
                onPress={() => openCategory(c.id)}
                activeOpacity={0.75}
                style={[
                  styles.categoryCard,
                  {
                    width: catWidth,
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: highContrast ? 1.5 : 1,
                  },
                ]}
              >
                <View style={[styles.catIconBox, { backgroundColor: isDark ? c.bgDark : c.bgLight }]}>
                  <Text style={{ fontSize: 18 }}>{c.icon}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text
                      style={{ fontSize: fs(13.5), fontWeight: '600', color: colors.text, flex: 1, fontFamily: fontFamilyStyle }}
                      numberOfLines={1}
                    >
                      {t(c.en, c.hi)}
                    </Text>
                    <Text style={{ fontSize: fs(10), color: colors.textMuted, marginLeft: 6 }}>{c.num}</Text>
                  </View>
                  <Text
                    style={{ fontSize: fs(11.5), color: colors.textMuted, marginTop: 3, lineHeight: fs(16), fontFamily: fontFamilyStyle }}
                    numberOfLines={2}
                  >
                    {t(c.descEn, c.descHi)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 4 Special Control Areas */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: fs(11), fontWeight: '700', letterSpacing: 0.7, color: colors.textMuted, marginBottom: 10, paddingHorizontal: 4 }}>
            {t('SPECIAL CONTROL AREAS (4)', 'विशेष नियंत्रण क्षेत्र (4)')}
          </Text>
          <View style={styles.flexWrapGrid}>
            {SPECIAL_AREAS.map((s) => (
              <TouchableOpacity
                key={s.id}
                onPress={() => openCategory(s.id)}
                activeOpacity={0.75}
                style={[
                  styles.categoryCard,
                  {
                    width: specialWidth,
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: highContrast ? 1.5 : 1,
                  },
                ]}
              >
                <View style={[styles.catIconBox, { width: 34, height: 34, backgroundColor: isDark ? s.bgDark : s.bgLight }]}>
                  <Text style={{ fontSize: 16 }}>{s.icon}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ fontSize: fs(13), fontWeight: '600', color: colors.text, fontFamily: fontFamilyStyle }}>
                    {t(s.en, s.hi)}
                  </Text>
                  <Text style={{ fontSize: fs(11), color: colors.textMuted, marginTop: 2, fontFamily: fontFamilyStyle }} numberOfLines={2}>
                    {t(s.descEn, s.descHi)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    );
  };

  /* --------------------------------------------------------------------------
     6. LEVEL 2: ALL 12 MAIN CATEGORIES + 4 SPECIAL CONTROL AREAS
     -------------------------------------------------------------------------- */
  const renderCategoryScreen = () => {
    const mainMeta = MAIN_CATEGORIES.find((c) => c.id === categoryId);
    const specialMeta = SPECIAL_AREAS.find((s) => s.id === categoryId);
    const meta = mainMeta || specialMeta;
    if (!meta) return renderHome();

    let content: React.ReactNode = null;

    switch (categoryId) {
      /* 01. ACCOUNT & PROFILE */
      case 'account': {
        const acc = settings.account;
        const sub = settings.subscription;
        content = (
          <>
            <Section title={t('Personal Information', 'व्यक्तिगत जानकारी')}>
              <NavRow
                label={t('Profile Details & Photo', 'प्रोफ़ाइल विवरण और फ़ोटो')}
                desc={`${acc.name} • ${acc.email}`}
                valueText={t('Edit', 'संपादित करें')}
                icon="👤"
                onPress={() => openDetail('account', 'edit_profile')}
              />
              <NavRow
                label={t('Joined Date', 'जुड़ने की तिथि')}
                desc={t('Account creation timestamp', 'खाता बनने की तारीख')}
                valueText={acc.joinedDate}
                icon="📅"
                onPress={() => showToast(`Member since ${acc.joinedDate}`)}
              />
              <NavRow
                label={t('Target Exam & Medium', 'लक्ष्य परीक्षा और माध्यम')}
                desc={t('Managed primarily in Learning Preferences', 'अध्ययन प्राथमिकताओं में प्रबंधित')}
                valueText={`${settings.learning.targetExam} • ${settings.learning.preferredMedium}`}
                icon="🎓"
                onPress={() => openCategory('learning')}
                last
              />
            </Section>

            <Section title={t('Account Security', 'खाता सुरक्षा')}>
              <NavRow
                label={t('Change Password', 'पासवर्ड बदलें')}
                desc={t('Update your Study Sakha password', 'अपना पासवर्ड अपडेट करें')}
                icon="🔑"
                onPress={() => openDetail('account', 'change_password')}
              />
              <ToggleRow
                label={t('Biometric App Lock', 'बायोमेट्रिक ऐप लॉक')}
                desc={t('Require fingerprint or face unlock on app launch (Prototype simulation)', 'ऐप खोलते समय फिंगरप्रिंट या फेस लॉक आवश्यक')}
                value={acc.biometricLock}
                path="account.biometricLock"
                simulated
              />
              <NavRow
                label={t('Active Devices and Sessions', 'सक्रिय डिवाइस और सत्र')}
                desc={t('Review and revoke signed-in devices', 'लॉग-इन डिवाइस प्रबंधित करें')}
                valueText={`${acc.activeSessions.length} ${t('devices', 'डिवाइस')}`}
                icon="📱"
                onPress={() => openDetail('account', 'active_sessions')}
              />
              <ToggleRow
                label={t('Two-Factor Authentication (2FA)', 'दो-चरणीय प्रमाणीकरण')}
                desc={t('Extra verification code on new sign-ins', 'नए लॉग-इन पर अतिरिक्त सुरक्षा कोड')}
                value={acc.twoFactorAuth}
                path="account.twoFactorAuth"
              />
              <ToggleRow
                label={t('Security Login Alerts', 'सुरक्षा लॉग-इन अलर्ट')}
                desc={t('Email alert when a new device signs in', 'नए डिवाइस से लॉग-इन पर ईमेल सूचना')}
                value={acc.loginAlerts}
                path="account.loginAlerts"
                last
              />
            </Section>

            <Section title={t('Subscription Overview', 'सदस्यता अवलोकन')}>
              <NavRow
                label={t('Current Plan & Benefits', 'वर्तमान प्लान और लाभ')}
                desc={sub.isPremium ? `${t('Expires', 'समाप्ति')}: ${sub.expiryDate}` : t('Free Scholar tier — Upgrade for Pro features', 'मुफ़्त प्लान — प्रो सुविधाओं के लिए अपग्रेड करें')}
                valueText={sub.planName}
                icon="👑"
                onPress={() => openCategory('special_premium')}
                last
              />
            </Section>

            <Section title={t('Account Management', 'खाता प्रबंधन')}>
              <NavRow
                label={t('Export Personal Account Data', 'व्यक्तिगत खाता डेटा एक्सपोर्ट करें')}
                desc={t('Download a JSON copy of your profile & metadata', 'प्रोफ़ाइल डेटा की JSON प्रति डाउनलोड करें')}
                icon="⬇️"
                onPress={() => simulateExport('study-sakha-account-data.json')}
              />
              <NavRow
                label={t('Logout', 'लॉग आउट')}
                desc={t('Sign out of this device', 'इस डिवाइस से साइन आउट करें')}
                icon="🚪"
                onPress={() =>
                  setModalConfig({
                    visible: true,
                    title: t('Logout of Study Sakha?', 'स्टडी सखा से लॉग आउट करें?'),
                    body: t('Your locally saved notes and settings will remain safe on this device.', 'आपके लोकल नोट्स और सेटिंग्स इस डिवाइस पर सुरक्षित रहेंगे।'),
                    confirmText: t('Logout', 'लॉग आउट'),
                    cancelText: t('Cancel', 'रद्द करें'),
                    danger: true,
                    onConfirm: () => {
                      void signOut().then((result) => {
                        if (!result.ok) showToast(result.error || t('Unable to log out', 'लॉग आउट नहीं हो सका'), 'error');
                      });
                    },
                  })
                }
              />
              <NavRow
                label={t('Delete Account', 'खाता स्थायी रूप से हटाएँ')}
                desc={t('Permanently erase account, notes and progress', 'खाता, नोट्स और प्रगति स्थायी रूप से मिटाएँ')}
                icon="🗑️"
                danger
                last
                onPress={() =>
                  setModalConfig({
                    visible: true,
                    title: t('Delete Account Permanently?', 'खाता स्थायी रूप से हटाएँ?'),
                    body: `${t('This action cannot be undone.', 'यह क्रिया वापस नहीं ली जा सकती।')}\n\n${t(
                      'All notes, PYQ bookmarks, study streaks, and subscription entitlements would be permanently deleted in production.',
                      'सभी नोट्स, बुकमार्क और प्रगति स्थायी रूप से मिट जाएँगे।'
                    )}`,
                    confirmText: t('Permanently Delete', 'स्थायी रूप से हटाएँ'),
                    cancelText: t('Cancel', 'रद्द करें'),
                    danger: true,
                    onConfirm: () =>
                      showToast(t('Account deletion is not available in this client. Contact support to request deletion.', 'इस ऐप में खाता हटाना उपलब्ध नहीं है। हटाने के लिए सहायता से संपर्क करें।'), 'error'),
                  })
                }
              />
            </Section>
          </>
        );
        break;
      }

      /* 02. APPEARANCE & PERSONALIZATION */
      case 'appearance': {
        const a = settings.appearance;
        content = (
          <>
            <Section
              title={t('App Appearance (Primary Owner)', 'ऐप थीम')}
              subtitle={t('Controls the global Study Sakha light and dark interface.', 'संपूर्ण स्टडी सखा के लाइट और डार्क मोड को नियंत्रित करता है।')}
            >
              <SegmentRow
                label={t('Theme Mode', 'थीम मोड')}
                value={a.theme}
                path="appearance.theme"
                options={[
                  { value: 'light', label: t('Light', 'लाइट') },
                  { value: 'dark', label: t('Dark', 'डार्क') },
                  { value: 'system', label: t('System Default', 'सिस्टम') },
                ]}
                last
              />
            </Section>

            <Section title={t('Brand Customization', 'ब्रांड अनुकूलन')}>
              <View style={[styles.rowColumn, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }]}>
                <Text style={{ fontSize: fs(13.5), fontWeight: '500', color: colors.text }}>{t('Accent Color', 'एक्सेंट रंग')}</Text>
                <Text style={{ fontSize: fs(11.5), color: colors.textMuted, marginTop: 2, marginBottom: 10 }}>
                  {t('Personalize buttons, highlights and active states', 'बटन और हाइलाइट्स का रंग चुनें')}
                </Text>
                <View style={styles.chipWrap}>
                  {Object.entries(ACCENT_PALETTES).map(([key, pal]) => {
                    const active = !a.useCustomHex && a.accentColor === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        onPress={() =>
                          mutateSettings((d) => {
                            d.appearance.useCustomHex = false;
                            d.appearance.accentColor = key;
                          })
                        }
                        style={[
                          styles.colorChip,
                          {
                            backgroundColor: active ? colors.surfaceAlt : 'transparent',
                            borderColor: active ? colors.text : colors.border,
                          },
                        ]}
                      >
                        <View style={[styles.colorDot, { backgroundColor: pal[600] }]} />
                        <Text style={{ fontSize: fs(11.5), fontWeight: '600', color: colors.text }}>{t(pal.name, pal.hi)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Custom Hex Input */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
                  <View style={[styles.colorDot, { width: 22, height: 22, backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(hexDraft) ? hexDraft : activeAccent[600] }]} />
                  <TextInput
                    value={hexDraft}
                    onChangeText={setHexDraft}
                    placeholder="#4f46e5"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    style={[styles.inlineInput, { color: colors.text, backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      if (!/^#[0-9A-Fa-f]{6}$/.test(hexDraft)) {
                        showToast(t('Enter a valid 6-digit hex color (e.g. #4f46e5)', 'मान्य हेक्स रंग दर्ज करें'), 'error');
                        return;
                      }
                      mutateSettings(
                        (d) => {
                          d.appearance.useCustomHex = true;
                          d.appearance.customBrandHex = hexDraft;
                        },
                        t('Custom brand color applied', 'कस्टम ब्रांड रंग लागू')
                      );
                    }}
                    style={[styles.smallActionBtn, { backgroundColor: activeAccent[600] }]}
                  >
                    <Text style={{ color: '#fff', fontSize: fs(11.5), fontWeight: '600' }}>{t('Apply Hex', 'लागू करें')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <ToggleRow
                label={t('Tinted Surfaces', 'टिंटेड सरफेस')}
                desc={t('Subtly infuse brand tint into cards and headers', 'कार्ड और हेडर में हल्का ब्रांड रंग जोड़ें')}
                value={a.tintedSurfaces}
                path="appearance.tintedSurfaces"
                last
              />
            </Section>

            <Section title={t('Custom Background', 'कस्टम बैकग्राउंड')}>
              <NavRow
                label={t('Background Library & Custom Upload', 'बैकग्राउंड लाइब्रेरी और अपलोड')}
                desc={t('Choose preset textures, upload image, adjust opacity & overlay', 'प्रीसेट चुनें, छवि अपलोड करें और अपारदर्शिता समायोजित करें')}
                valueText={a.customBgLabel || BACKGROUND_LIBRARY.find((b) => b.id === a.backgroundId)?.name || 'Clean Solid'}
                icon="🖼️"
                onPress={() => openDetail('appearance', 'custom_bg')}
                last
              />
            </Section>

            <Section title={t('Typography', 'टाइपोग्राफी')}>
              <SegmentRow
                label={t('Font Size', 'फ़ॉन्ट आकार')}
                value={a.fontSize}
                path="appearance.fontSize"
                options={[
                  { value: 'small', label: t('Small', 'छोटा') },
                  { value: 'default', label: t('Default', 'डिफ़ॉल्ट') },
                  { value: 'large', label: t('Large', 'बड़ा') },
                  { value: 'xl', label: 'XL' },
                ]}
              />
              <SelectRow
                label={t('Font Family', 'फ़ॉन्ट शैली')}
                value={a.fontFamily}
                path="appearance.fontFamily"
                options={['Inter', 'Plus Jakarta Sans', 'Merriweather', 'System']}
              />
              <SliderRow
                label={t('Reading Text Scale', 'रीडिंग टेक्स्ट स्केल')}
                desc={t('Applies to long-form notes and explanations', 'नोट्स और व्याख्याओं के लिए लागू')}
                value={a.readingTextScale}
                min={85}
                max={135}
                step={5}
                unit="%"
                path="appearance.readingTextScale"
                last
              />
            </Section>

            <Section title={t('Layout & Dashboard', 'लेआउट और डैशबोर्ड')}>
              <SegmentRow
                label={t('Layout Density', 'लेआउट घनत्व')}
                desc={t('Switch between spacious or information-dense lists', 'आरामदायक या कॉम्पैक्ट लेआउट चुनें')}
                value={a.layoutDensity}
                path="appearance.layoutDensity"
                options={[
                  { value: 'comfortable', label: t('Comfortable', 'आरामदायक') },
                  { value: 'compact', label: t('Compact', 'कॉम्पैक्ट') },
                ]}
              />
              <NavRow
                label={t('Dashboard Customization & Quick Actions', 'डैशबोर्ड और त्वरित क्रियाएँ')}
                desc={t('Choose visible dashboard widgets and action order', 'डैशबोर्ड विजेट और क्रम प्रबंधित करें')}
                valueText={`${Object.values(a.dashboardWidgets).filter(Boolean).length}/5 ${t('active', 'सक्रिय')}`}
                icon="🧩"
                onPress={() => openDetail('appearance', 'dashboard_layout')}
                last
              />
            </Section>

            <Section title={t('Accessibility', 'सुलभता')}>
              <ToggleRow
                label={t('Reduce Motion', 'मोशन कम करें')}
                desc={t('Minimize transitions and micro-animations across the app', 'ऐप में एनिमेशन और ट्रांज़िशन कम करें')}
                value={a.reduceMotion}
                path="appearance.reduceMotion"
              />
              <SegmentRow
                label={t('Animation Intensity', 'एनिमेशन तीव्रता')}
                value={a.animationIntensity}
                path="appearance.animationIntensity"
                options={[
                  { value: 'minimal', label: t('Minimal', 'न्यूनतम') },
                  { value: 'balanced', label: t('Balanced', 'संतुलित') },
                  { value: 'rich', label: t('Rich', 'समृद्ध') },
                ]}
              />
              <ToggleRow
                label={t('High Contrast Borders', 'हाई कंट्रास्ट')}
                desc={t('Sharpen card outlines and control boundaries', 'कार्ड और नियंत्रण की सीमाएँ स्पष्ट करें')}
                value={a.highContrast}
                path="appearance.highContrast"
              />
              <SliderRow
                label={t('Display Scaling', 'डिस्प्ले स्केलिंग')}
                value={a.displayScaling}
                min={90}
                max={115}
                step={5}
                unit="%"
                path="appearance.displayScaling"
                last
              />
            </Section>

            <Section title={t('App Language (Primary Owner)', 'ऐप की भाषा')}>
              <SegmentRow
                label={t('Interface Language', 'इंटरफ़ेस भाषा')}
                desc={t('Changes menus, labels and settings across Study Sakha', 'स्टडी सखा की संपूर्ण इंटरफ़ेस भाषा बदलता है')}
                value={a.language}
                path="appearance.language"
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'hi', label: 'हिन्दी (Hindi)' },
                ]}
                last
              />
            </Section>
          </>
        );
        break;
      }

      /* 03. LEARNING & STUDY PREFERENCES */
      case 'learning': {
        const l = settings.learning;
        const presets = ['RAS Profile', 'RSSB Profile', 'UPSC Profile', 'NET/JRF Profile', 'Custom Profile'];
        content = (
          <>
            <Section
              title={t('Study Profile Presets', 'स्टडी प्रोफ़ाइल प्रीसेट')}
              subtitle={t('One-tap exam presets tailor subjects, content depth and revision cadence.', 'एक क्लिक में अपनी परीक्षा के अनुसार सेटिंग्स लागू करें।')}
            >
              <View style={{ padding: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {presets.map((pr) => {
                  const active = l.activePreset === pr;
                  return (
                    <TouchableOpacity
                      key={pr}
                      onPress={() => applyStudyPreset(pr)}
                      style={[
                        styles.chipBtn,
                        {
                          backgroundColor: active ? activeAccent[600] : colors.surfaceAlt,
                          borderColor: active ? activeAccent[600] : colors.border,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: fs(11.5), fontWeight: '600', color: active ? '#ffffff' : colors.text }}>{pr}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Section>

            <Section title={t('Exam Preferences', 'परीक्षा प्राथमिकताएँ')}>
              <SelectRow
                label={t('Primary Target Exam', 'मुख्य लक्ष्य परीक्षा')}
                value={l.targetExam}
                path="learning.targetExam"
                options={['RAS', 'RSSB', 'UPSC', 'NET/JRF', 'Other State PCS', 'SSC']}
                last
              />
            </Section>

            <Section title={t('Learning Preferences', 'अध्ययन प्राथमिकताएँ')}>
              <SelectRow
                label={t('Preferred Study Content Language', 'अध्ययन सामग्री भाषा')}
                value={l.preferredContentLang}
                path="learning.preferredContentLang"
                options={['English', 'Hindi', 'Bilingual (Hindi + English)']}
              />
              <SegmentRow
                label={t('Preferred Exam Medium', 'परीक्षा माध्यम')}
                value={l.preferredMedium}
                path="learning.preferredMedium"
                options={[
                  { value: 'English', label: 'English' },
                  { value: 'Hindi', label: 'हिन्दी' },
                  { value: 'Bilingual', label: t('Bilingual', 'द्विभाषी') },
                ]}
              />
              <SelectRow
                label={t('Default Study Mode', 'डिफ़ॉल्ट अध्ययन मोड')}
                value={l.defaultStudyMode}
                path="learning.defaultStudyMode"
                options={['Concept + PYQ', 'Concept Deep Dive', 'MCQ Practice', 'Rapid Revision']}
              />
              <NavRow
                label={t('Preferred Subjects', 'पसंदीदा विषय')}
                desc={l.preferredSubjects.join(', ')}
                valueText={`${l.preferredSubjects.length} ${t('selected', 'चयनित')}`}
                icon="📚"
                onPress={() => openDetail('learning', 'preferred_subjects')}
              />
              <SelectRow
                label={t('Learning Style', 'सीखने की शैली')}
                value={l.learningStyle}
                path="learning.learningStyle"
                options={['Active Recall', 'Visual & Mind Maps', 'Structured Reading', 'Mixed']}
                last
              />
            </Section>

            <Section title={t('Content Preferences', 'सामग्री प्राथमिकताएँ')}>
              <ToggleRow
                label={t('Short Notes', 'शॉर्ट नोट्स')}
                desc={t('Prioritize crisp revision bullets before detailed chapters', 'अध्यायों से पहले संक्षिप्त बुलेट नोट्स दिखाएँ')}
                value={l.shortNotes}
                path="learning.shortNotes"
              />
              <ToggleRow
                label={t('Detailed Notes', 'विस्तृत नोट्स')}
                desc={t('Include full Mains-ready analytical coverage', 'मुख्य परीक्षा हेतु विस्तृत विश्लेषण शामिल करें')}
                value={l.detailedNotes}
                path="learning.detailedNotes"
              />
              <ToggleRow
                label={t('Real-world Examples', 'व्यावहारिक उदाहरण')}
                desc={t('Show Rajasthan & national case studies in notes', 'नोट्स में प्रासंगिक उदाहरण और केस स्टडी दिखाएँ')}
                value={l.includeExamples}
                path="learning.includeExamples"
              />
              <ToggleRow
                label={t('Detailed Explanations', 'विस्तृत व्याख्या')}
                desc={t('Expand concept rationale for every PYQ & topic', 'हर प्रश्न और विषय की विस्तृत व्याख्या दिखाएँ')}
                value={l.includeExplanations}
                path="learning.includeExplanations"
              />
              <SelectRow
                label={t('Revision Preferences', 'रिवीजन प्राथमिकता')}
                value={l.revisionPreference}
                path="learning.revisionPreference"
                options={['Spaced Repetition (1-3-7-21d)', 'Weekly Weekend Review', 'Exam-Countdown Intensive', 'Manual Revision']}
                last
              />
            </Section>
          </>
        );
        break;
      }

      /* 04. STUDY PLANNER & GOALS */
      case 'planner': {
        const p = settings.planner;
        content = (
          <>
            <Section
              title={t('Planning Preferences & Goals (Primary Owner)', 'योजना और लक्ष्य')}
              subtitle={t('Daily and Weekly Study Goals defined here automatically sync to Home and Statistics.', 'यहाँ निर्धारित लक्ष्य होम और आँकड़ों के साथ स्वतः सिंक होते हैं।')}
            >
              <SelectRow
                label={t('Day Start Time', 'दिन शुरू होने का समय')}
                desc={t('When your daily study log and streak roll over', 'जब आपका दैनिक अध्ययन लॉग शुरू होता है')}
                value={p.dayStartTime}
                path="planner.dayStartTime"
                options={['04:00', '04:30', '05:00', '05:30', '06:00', '06:30', '07:00']}
              />
              <SliderRow
                label={t('Default Task Duration', 'डिफ़ॉल्ट कार्य अवधि')}
                value={p.defaultTaskDuration}
                min={15}
                max={120}
                step={5}
                unit=" min"
                path="planner.defaultTaskDuration"
              />
              <SliderRow
                label={t('Daily Study Goal', 'दैनिक अध्ययन लक्ष्य')}
                value={p.dailyStudyGoalHours}
                min={1}
                max={16}
                step={1}
                unit=" hrs"
                path="planner.dailyStudyGoalHours"
              />
              <SliderRow
                label={t('Weekly Study Goal', 'साप्ताहिक अध्ययन लक्ष्य')}
                value={p.weeklyStudyGoalHours}
                min={7}
                max={100}
                step={1}
                unit=" hrs"
                path="planner.weeklyStudyGoalHours"
                last
              />
            </Section>

            <Section title={t('Task Management', 'कार्य प्रबंधन')}>
              <ToggleRow
                label={t('Auto Carry Forward', 'ऑटो कैरी फ़ॉरवर्ड')}
                desc={t('Move unfinished tasks automatically to the next morning', 'अधूरे कार्यों को स्वतः अगले दिन ले जाएँ')}
                value={p.autoCarryForward}
                path="planner.autoCarryForward"
              />
              <SelectRow
                label={t('Completed Task Handling', 'पूर्ण कार्य प्रबंधन')}
                value={p.completedTaskHandling}
                path="planner.completedTaskHandling"
                options={['Keep in Place', 'Move to Bottom', 'Auto Archive']}
              />
              <SegmentRow
                label={t('Priority Default', 'डिफ़ॉल्ट प्राथमिकता')}
                value={p.priorityDefault}
                path="planner.priorityDefault"
                options={[
                  { value: 'High', label: t('High', 'उच्च') },
                  { value: 'Medium', label: t('Medium', 'मध्यम') },
                  { value: 'Low', label: t('Low', 'निम्न') },
                ]}
              />
              <ToggleRow
                label={t('Recurring Tasks', 'आवर्ती कार्य')}
                desc={t('Enable daily current affairs & newspaper routines', 'दैनिक करंट अफेयर्स और रिवीजन रूटीन सक्षम करें')}
                value={p.recurringTasks}
                path="planner.recurringTasks"
                last
              />
            </Section>

            <Section title={t('Scheduling', 'शेड्यूलिंग')}>
              <NavRow
                label={t('Study Timetable', 'अध्ययन समय-सारणी')}
                desc={t('Configure morning, afternoon & evening study blocks', 'सुबह, दोपहर और शाम के अध्ययन ब्लॉक सेट करें')}
                valueText={p.timetableTemplate}
                icon="🕒"
                onPress={() => openDetail('planner', 'study_timetable')}
              />
              <SliderRow
                label={t('Break Intervals', 'ब्रेक अंतराल')}
                value={p.breakIntervals}
                min={5}
                max={30}
                step={5}
                unit=" min"
                path="planner.breakIntervals"
              />
              <SelectRow
                label={t('Planning Rhythm', 'योजना शैली')}
                value={p.planningStyle}
                path="planner.planningStyle"
                options={['Energy-Based', 'Fixed Time-Blocking', 'Flexible Checklist']}
                last
              />
            </Section>

            <Section title={t('Additional Controls', 'अतिरिक्त नियंत्रण')}>
              <ToggleRow
                label={t('Smart Suggestions', 'स्मार्ट सुझाव')}
                desc={t('AI-assisted backlog rebalancing based on exam date', 'परीक्षा तिथि के अनुसार स्मार्ट शेड्यूल सुझाव')}
                value={p.smartSuggestions}
                path="planner.smartSuggestions"
                premium
              />
              <ToggleRow
                label={t('Task Reminders', 'कार्य रिमाइंडर')}
                desc={t('Prompt before scheduled tasks begin', 'निर्धारित कार्य शुरू होने से पहले याद दिलाएँ')}
                value={p.taskReminders}
                path="planner.taskReminders"
              />
              <SelectRow
                label={t('Planner History Retention', 'प्लानर इतिहास')}
                value={String(p.plannerHistoryDays)}
                path="planner.plannerHistoryDays"
                options={[
                  { value: '30', label: '30 Days' },
                  { value: '90', label: '90 Days' },
                  { value: '365', label: '1 Year' },
                  { value: '9999', label: 'Forever' },
                ]}
              />
              <ToggleRow
                label={t('Auto-Adjust Missed Goals', 'छूटे लक्ष्य स्वतः समायोजित करें')}
                desc={t('Redistribute missed study hours across remaining week', 'छूटे हुए घंटों को सप्ताह के शेष दिनों में बाँटें')}
                value={p.autoAdjustMissedGoals}
                path="planner.autoAdjustMissedGoals"
                last
              />
            </Section>
          </>
        );
        break;
      }

      /* 05. FOCUS CENTRE & WELLBEING */
      case 'focus': {
        const f = settings.focus;
        const activeTheme = FOCUS_THEMES.find((th) => th.id === f.selectedTheme) || FOCUS_THEMES[0];
        content = (
          <>
            <Section title={t('Focus Timer', 'फ़ोकस टाइमर')}>
              <SliderRow label={t('Default Focus Duration', 'डिफ़ॉल्ट फ़ोकस अवधि')} value={f.defaultFocusDuration} min={15} max={120} step={5} unit=" min" path="focus.defaultFocusDuration" />
              <SliderRow label={t('Short Break Duration', 'शॉर्ट ब्रेक अवधि')} value={f.shortBreakDuration} min={3} max={20} step={1} unit=" min" path="focus.shortBreakDuration" />
              <SliderRow label={t('Long Break Duration', 'लॉन्ग ब्रेक अवधि')} value={f.longBreakDuration} min={15} max={45} step={5} unit=" min" path="focus.longBreakDuration" />
              <ToggleRow
                label={t('Auto Start Next Session', 'अगला सत्र स्वतः शुरू करें')}
                desc={t('Seamlessly transition from break back into focus', 'ब्रेक के बाद अगला फ़ोकस सत्र स्वतः शुरू करें')}
                value={f.autoStartNextSession}
                path="focus.autoStartNextSession"
                last
              />
            </Section>

            <Section title={t('Meditation & Break Timer', 'ध्यान और ब्रेक टाइमर')}>
              <SliderRow label={t('Default Meditation Duration', 'डिफ़ॉल्ट ध्यान अवधि')} value={f.meditationDuration} min={3} max={45} step={1} unit=" min" path="focus.meditationDuration" />
              <SelectRow
                label={t('Meditation Bell Sound', 'ध्यान घंटी ध्वनि')}
                value={f.meditationBell}
                path="focus.meditationBell"
                options={['Tibetan Singing Bowl', 'Soft Temple Chime', 'Gentle Gong', 'Silent']}
              />
              <ToggleRow
                label={t('Breathing Cadence Cues', 'श्वास मार्गदर्शन संकेत')}
                desc={t('Visual 4-4-4 box breathing ring during meditation', 'ध्यान के दौरान शांत श्वास मार्गदर्शन')}
                value={f.meditationBreathingCues}
                path="focus.meditationBreathingCues"
              />
              <SliderRow label={t('Default Break Timer Duration', 'ब्रेक टाइमर अवधि')} value={f.breakTimerDuration} min={5} max={30} step={5} unit=" min" path="focus.breakTimerDuration" />
              <SelectRow
                label={t('Break Timer Behaviour', 'ब्रेक टाइमर व्यवहार')}
                value={f.breakTimerBehaviour}
                path="focus.breakTimerBehaviour"
                options={['Gentle Stretch Prompts', 'Eye Rest (20-20-20)', 'Hydration Reminder', 'Minimal Countdown']}
                last
              />
            </Section>

            <Section
              title={t('Focus Theme Library (Primary Owner)', 'फ़ोकस थीम लाइब्रेरी')}
              subtitle={t('21 curated ambient environments for deep study sessions.', 'गहन अध्ययन के लिए 21 विशेष फ़ोकस थीम।')}
            >
              <NavRow
                label={t('Browse All 21 Focus Themes', 'सभी 21 फ़ोकस थीम देखें')}
                desc={t('Nature, Cozy, Celestial & Minimal categories', 'प्रकृति, कोज़ी, ब्रह्मांड और मिनिमल श्रेणियाँ')}
                valueText={t(activeTheme.name, activeTheme.hi)}
                icon="✨"
                onPress={() => openDetail('focus', 'focus_themes')}
              />
              <SegmentRow
                label={t('Theme Animation Intensity', 'थीम एनिमेशन तीव्रता')}
                value={f.themeAnimationIntensity}
                path="focus.themeAnimationIntensity"
                options={[
                  { value: 'off', label: t('Off', 'बंद') },
                  { value: 'subtle', label: t('Subtle', 'हल्का') },
                  { value: 'immersive', label: t('Immersive', 'गहन') },
                ]}
              />
              <ToggleRow
                label={t('Reduce Focus Motion', 'फ़ोकस मोशन कम करें')}
                desc={t('Use static ambient backdrops during focus sessions', 'फ़ोकस सत्र में स्थिर बैकड्रॉप उपयोग करें')}
                value={f.reduceFocusMotion}
                path="focus.reduceFocusMotion"
                last
              />
            </Section>

            <Section title={t('Music and Ambient Sounds', 'संगीत और परिवेश ध्वनियाँ')}>
              <SelectRow
                label={t('Default Ambient Track', 'डिफ़ॉल्ट परिवेश ध्वनि')}
                value={f.ambientSound}
                path="focus.ambientSound"
                options={['Lofi Beats', 'Rain & Piano', 'Deep Space', 'Brown Noise', 'Silent']}
              />
              <SliderRow label={t('Audio Volume', 'ऑडियो वॉल्यूम')} value={f.ambientVolume} min={0} max={100} step={5} unit="%" path="focus.ambientVolume" />
              <ToggleRow label={t('Smooth Fade-Out at Session End', 'सत्र समाप्ति पर स्मूथ फ़ेड-आउट')} value={f.fadeOutAudio} path="focus.fadeOutAudio" />
              <ToggleRow label={t('Pause Ambient Audio on Break', 'ब्रेक के दौरान ऑडियो रोकें')} value={f.pauseAudioOnBreak} path="focus.pauseAudioOnBreak" last />
            </Section>

            <Section title={t('Additional Focus Controls', 'अतिरिक्त फ़ोकस नियंत्रण')}>
              <ToggleRow
                label={t('Keep Screen Awake', 'स्क्रीन चालू रखें')}
                desc={t('Prevent display sleep while focus timer is running', 'टाइमर चलने के दौरान स्क्रीन बंद न होने दें')}
                value={f.keepScreenAwake}
                path="focus.keepScreenAwake"
              />
              <ToggleRow
                label={t('Focus Flow Integration', 'फ़ोकस फ़्लो एकीकरण')}
                desc={t('Auto-log completed focus minutes to Planner & Statistics', 'पूर्ण फ़ोकस मिनट स्वतः प्लानर और आँकड़ों में जोड़ें')}
                value={f.focusFlowIntegration}
                path="focus.focusFlowIntegration"
              />
              <SelectRow
                label={t('Session History Retention', 'सत्र इतिहास अवधि')}
                value={f.sessionHistoryRetention}
                path="focus.sessionHistoryRetention"
                options={['30 Days', '6 Months', '1 Year', 'Forever']}
                last
              />
            </Section>
          </>
        );
        break;
      }

      /* 06. FOCUS LOCK & APP BLOCKING */
      case 'focuslock': {
        const fl = settings.focuslock;
        content = (
          <>
            <View style={[styles.noticeBanner, { backgroundColor: isDark ? '#082f49' : '#f0f9ff', borderColor: isDark ? '#0369a1' : '#bae6fd' }]}>
              <Text style={{ fontSize: fs(11.5), color: isDark ? '#bae6fd' : '#0c4a6e', lineHeight: fs(17) }}>
                <Text style={{ fontWeight: '700' }}>{t('Native capability status: ', 'नेटिव सुविधा स्थिति: ')}</Text>
                {t(
                  focusLockNative
                    ? 'Android Accessibility Service and Usage Access status are read from the installed native module. Session controls remain owned by Focus Centre.'
                    : 'Android Accessibility Service, Usage Access, and OS-level app blocking are unavailable on this platform.',
                  focusLockNative
                    ? 'Android एक्सेसिबिलिटी सेवा और Usage Access की स्थिति इंस्टॉल किए गए नेटिव मॉड्यूल से पढ़ी जाती है। सत्र नियंत्रण Focus Centre के पास रहते हैं।'
                    : 'Android एक्सेसिबिलिटी सेवा, Usage Access और OS ऐप ब्लॉकिंग इस प्लेटफ़ॉर्म पर उपलब्ध नहीं हैं।'
                )}
              </Text>
            </View>

            <Section title={t('Blocking Controls (Primary Owner)', 'ब्लॉकिंग नियंत्रण')}>
              <ToggleRow
                label={t('Master Focus Lock', 'मास्टर फ़ोकस लॉक')}
                desc={t('Enable or pause all distracting app blocking rules', 'सभी ऐप ब्लॉकिंग नियम चालू या बंद करें')}
                value={fl.masterEnabled}
                path="focuslock.masterEnabled"
                simulated
              />
              <NavRow
                label={t('Distracting Apps & Allowlist', 'ध्यान भटकाने वाले ऐप और अनुमति सूची')}
                desc={`${t('Blocked:', 'ब्लॉक:')} ${fl.blockedApps.join(', ')}`}
                valueText={`${fl.blockedApps.length} ${t('blocked', 'ब्लॉक')}`}
                icon="📱"
                onPress={() => openDetail('focuslock', 'blocked_apps')}
                last
              />
            </Section>

            <Section title={t('Blocking Rules', 'ब्लॉकिंग नियम')}>
              <ToggleRow
                label={t('Block During Focus Sessions', 'फ़ोकस सत्र के दौरान ब्लॉक करें')}
                desc={t('Automatically engage Focus Lock whenever Focus Timer starts', 'फ़ोकस टाइमर शुरू होते ही ब्लॉकिंग स्वतः चालू करें')}
                value={fl.blockDuringFocus}
                path="focuslock.blockDuringFocus"
              />
              <ToggleRow
                label={t('Scheduled Daily Blocking', 'निर्धारित दैनिक ब्लॉकिंग')}
                desc={`${fl.scheduleStart} — ${fl.scheduleEnd}`}
                value={fl.scheduledBlocking}
                path="focuslock.scheduledBlocking"
              />
              <SliderRow
                label={t('Default Quick-Block Duration', 'त्वरित-ब्लॉक अवधि')}
                value={fl.defaultBlockDuration}
                min={15}
                max={240}
                step={15}
                unit=" min"
                path="focuslock.defaultBlockDuration"
              />
              <SelectRow
                label={t('Emergency Unlock Behaviour', 'आपातकालीन अनलॉक')}
                value={fl.emergencyUnlockMode}
                path="focuslock.emergencyUnlockMode"
                options={['Instant Unlock', '60s Cooldown + Reason', 'Strict (No Unlock)']}
                premium
                last
              />
            </Section>

            <Section title={t('Native Android Controls', 'नेटिव एंड्रॉइड नियंत्रण')}>
              <ToggleRow
                label={t('Usage Access Permission', 'उपयोग एक्सेस अनुमति')}
                desc={t('Required to detect foreground distracting apps', 'अग्रभूमि ऐप पहचानने के लिए आवश्यक')}
                value={fl.simUsagePermission}
                path="focuslock.simUsagePermission"
                simulated
              />
              <ToggleRow
                label={t('Accessibility Service Status', 'एक्सेसिबिलिटी सेवा स्थिति')}
                desc={t('Displays Study Sakha Focus Shield overlay', 'स्टडी सखा फ़ोकस शील्ड दिखाने के लिए')}
                value={fl.simAccessibilityService}
                path="focuslock.simAccessibilityService"
                simulated
              />
              <ToggleRow
                label={t('Battery Optimization Unrestricted', 'बैटरी ऑप्टिमाइज़ेशन अनरिस्ट्रिक्टेड')}
                desc={t('Prevents MIUI / OneUI / ColorOS from killing Focus Lock', 'बैकग्राउंड में फ़ोकस लॉक को बंद होने से रोकता है')}
                value={fl.simBatteryUnrestricted}
                path="focuslock.simBatteryUnrestricted"
                simulated
              />
              <NavRow
                label={t('Open Permissions Centre', 'अनुमति केंद्र खोलें')}
                desc={t('Full OS permission diagnostics and guidance', 'सभी डिवाइस अनुमतियों का निदान और मार्गदर्शन')}
                icon="🛡️"
                onPress={() => openCategory('special_permissions')}
                last
              />
            </Section>
          </>
        );
        break;
      }

      /* 07. SAKHA AI */
      case 'ai': {
        const ai = settings.ai;
        const aiModes = [
          { id: 'Teacher Mode', icon: '🧑‍🏫', desc: t('Structured concept teaching with checks', 'संरचित अवधारणा शिक्षण') },
          { id: 'Doubt Solving', icon: '❓', desc: t('Direct, crisp answers to tough doubts', 'संदेहों का सीधा समाधान') },
          { id: 'PYQ Analysis', icon: '🔎', desc: t('Trend mapping & option elimination', 'पिछले वर्षों के प्रश्नों का विश्लेषण') },
          { id: 'Exam Preparation', icon: '🏆', desc: t('RAS/UPSC Mains answer structuring', 'मुख्य परीक्षा उत्तर लेखन रणनीति') },
        ];

        content = (
          <>
            <Section title={t('AI Response Preferences (Primary Owner)', 'AI उत्तर प्राथमिकताएँ')}>
              <SelectRow
                label={t('AI Response Language', 'AI उत्तर भाषा')}
                desc={t('Independent from App UI language', 'ऐप इंटरफ़ेस भाषा से स्वतंत्र')}
                value={ai.responseLanguage}
                path="ai.responseLanguage"
                options={['English', 'Hindi', 'Bilingual (Hinglish)']}
              />
              <SegmentRow
                label={t('Response Length', 'उत्तर की लंबाई')}
                value={ai.responseLength}
                path="ai.responseLength"
                options={[
                  { value: 'Concise', label: t('Concise', 'संक्षिप्त') },
                  { value: 'Balanced', label: t('Balanced', 'संतुलित') },
                  { value: 'Detailed', label: t('Detailed', 'विस्तृत') },
                ]}
              />
              <SelectRow
                label={t('Detail Level', 'विस्तार स्तर')}
                value={ai.detailLevel}
                path="ai.detailLevel"
                options={['Beginner Friendly', 'Exam-Ready', 'Deep Analytical (Mains)']}
                last
              />
            </Section>

            <Section title={t('AI Learning Modes', 'AI शिक्षण मोड')}>
              <View style={{ padding: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {aiModes.map((m) => {
                  const active = ai.defaultMode === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => updateSetting('ai.defaultMode', m.id)}
                      style={[
                        styles.aiModeCard,
                        {
                          width: isTablet ? '48.5%' : '100%',
                          backgroundColor: active ? (isDark ? '#1e1b4b' : activeAccent[50]) : colors.surfaceAlt,
                          borderColor: active ? activeAccent[600] : colors.border,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 18, marginRight: 10 }}>{m.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: fs(12.5), fontWeight: '700', color: colors.text }}>{m.id}</Text>
                        <Text style={{ fontSize: fs(11), color: colors.textMuted, marginTop: 2 }}>{m.desc}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Section>

            <Section title={t('Explanation Preferences', 'व्याख्या प्राथमिकताएँ')}>
              <ToggleRow label={t('Include Exam Examples', 'परीक्षा उदाहरण शामिल करें')} value={ai.includeExamples} path="ai.includeExamples" />
              <ToggleRow label={t('Step-by-Step Explanations', 'चरण-दर-चरण व्याख्या')} value={ai.stepByStep} path="ai.stepByStep" />
              <ToggleRow label={t('End-of-Answer Revision Summaries', 'उत्तर के अंत में रिवीजन सारांश')} value={ai.revisionSummaries} path="ai.revisionSummaries" last />
            </Section>

            <Section title={t('Chat History, Privacy & Usage', 'चैट इतिहास, गोपनीयता और उपयोग')}>
              <View style={[styles.rowColumn, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: fs(12), fontWeight: '600', color: colors.text }}>
                    {t('Daily Sakha AI Usage (Gemini)', 'दैनिक सखा AI उपयोग')}
                  </Text>
                  <Text style={{ fontSize: fs(12), fontWeight: '700', color: colors.textMuted }}>
                    {t('Unavailable', 'अनुपलब्ध')}
                  </Text>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceAlt }]}>
                  <View style={[styles.progressBarFill, { width: '0%', backgroundColor: activeAccent[600] }]} />
                </View>
              </View>
              <ToggleRow label={t('Save Sakha AI Chat History', 'चैट इतिहास सहेजें')} value={ai.saveChatHistory} path="ai.saveChatHistory" />
              <ToggleRow
                label={t('Allow Anonymized Quality Improvement', 'गुणवत्ता सुधार हेतु डेटा साझा करें')}
                desc={t('Off by default to protect your personal study notes', 'आपकी गोपनीयता के लिए डिफ़ॉल्ट रूप से बंद')}
                value={ai.allowModelImprovement}
                path="ai.allowModelImprovement"
              />
              <NavRow
                label={t('Clear All AI Chat History', 'संपूर्ण AI चैट इतिहास मिटाएँ')}
                desc={t('Permanently delete saved Sakha AI conversations', 'सहेजे गए सभी AI संवाद हटाएँ')}
                icon="🗑️"
                danger
                last
                onPress={() =>
                  setModalConfig({
                    visible: true,
                    title: t('Clear Sakha AI Chat History?', 'सखा AI चैट इतिहास मिटाएँ?'),
                    body: t('All saved doubt-solving threads and PYQ analyses will be removed.', 'सभी सहेजे गए AI संवाद हटा दिए जाएँगे।'),
                    confirmText: t('Clear History', 'इतिहास मिटाएँ'),
                    cancelText: t('Cancel', 'रद्द करें'),
                    danger: true,
                    onConfirm: () => showToast(t('Sakha AI chat history cleared', 'सखा AI चैट इतिहास साफ़ हो गया'), 'success'),
                  })
                }
              />
            </Section>
          </>
        );
        break;
      }

      /* 08. LIBRARY & LEARNING TOOLS */
      case 'library': {
        const lib = settings.library;
        content = (
          <>
            <Section title={t('Notes', 'नोट्स')}>
              <SelectRow label={t('Editor Mode', 'एडिटर मोड')} value={lib.notesEditorMode} path="library.notesEditorMode" options={['Rich Markdown', 'Plain Text', 'Outline Blocks']} />
              <ToggleRow
                label={t('Auto Save Notes', 'ऑटो सेव नोट्स')}
                desc={t('Save changes continuously as you type', 'लिखते समय बदलाव स्वतः सहेजें')}
                value={lib.notesAutoSave}
                path="library.notesAutoSave"
              />
              <SelectRow label={t('Notes Font', 'नोट्स फ़ॉन्ट')} value={lib.notesFont} path="library.notesFont" options={['Inter', 'Merriweather', 'Monospace']} />
              <SelectRow label={t('Line Formatting', 'लाइन स्पेसिंग')} value={lib.notesLineSpacing} path="library.notesLineSpacing" options={['1.4', '1.6', '1.8']} last />
            </Section>

            <Section title={t('Books & PDF Reader (Primary Owner)', 'पुस्तकें और PDF रीडर')}>
              <NavRow
                label={t('PDF Reader Display & Comfort', 'PDF रीडर डिस्प्ले और आराम')}
                desc={`${lib.pdfReadingTheme} • ${lib.pdfPageDisplay} • ${lib.pdfTextSize}%`}
                valueText={t('Configure', 'सेट करें')}
                icon="📄"
                onPress={() => openDetail('library', 'pdf_reader')}
              />
              <SelectRow label={t('Books Page Transition', 'पेज ट्रांज़िशन')} value={lib.booksPageAnimation} path="library.booksPageAnimation" options={['Slide', 'Fade', 'Instant']} />
              <ToggleRow label={t('Auto-Sync Bookmarks', 'बुकमार्क ऑटो-सिंक')} value={lib.booksAutoBookmark} path="library.booksAutoBookmark" />
              <SelectRow label={t('Books Display Layout', 'पुस्तक डिस्प्ले लेआउट')} value={lib.booksDisplayLayout} path="library.booksDisplayLayout" options={['Single Column', 'Two Column (Tablet)']} last />
            </Section>

            <Section title={t('PYQ & Mock Tests', 'PYQ और मॉक टेस्ट')}>
              <SelectRow label={t('Default PYQ Exam Filter', 'डिफ़ॉल्ट PYQ परीक्षा फ़िल्टर')} value={lib.pyqExamFilter} path="library.pyqExamFilter" options={['RAS', 'RSSB', 'UPSC', 'NET/JRF', 'SSC', 'All Exams']} />
              <SelectRow
                label={t('Default PYQ Subject Filter', 'डिफ़ॉल्ट PYQ विषय फ़िल्टर')}
                value={lib.pyqSubjectFilter}
                path="library.pyqSubjectFilter"
                options={['All Subjects', 'Rajasthan History', 'Indian Polity', 'Geography', 'Economy', 'Science']}
              />
              <ToggleRow
                label={t('Reveal PYQ Answer Immediately', 'PYQ उत्तर तुरंत दिखाएँ')}
                desc={t('Show solution right after tapping an option', 'विकल्प चुनते ही समाधान दिखाएँ')}
                value={lib.pyqInstantAnswer}
                path="library.pyqInstantAnswer"
              />
              <SelectRow label={t('Default Test Category', 'डिफ़ॉल्ट टेस्ट श्रेणी')} value={lib.testsDefaultCategory} path="library.testsDefaultCategory" options={['RAS Prelims', 'RAS Mains', 'RSSB CET', 'UPSC CSE', 'SSC CGL']} />
              <ToggleRow label={t('Show Live Countdown Timer', 'लाइव काउंटडाउन टाइमर दिखाएँ')} value={lib.testsShowCountdown} path="library.testsShowCountdown" />
              <ToggleRow
                label={t('Test Submission Warning', 'टेस्ट सबमिशन चेतावनी')}
                desc={t('Warn if unanswered questions remain before submit', 'सबमिट करने से पहले अनुत्तरित प्रश्नों की चेतावनी')}
                value={lib.testsSubmissionWarning}
                path="library.testsSubmissionWarning"
              />
              <ToggleRow label={t('Show Answer Explanations & Result Analysis', 'उत्तर व्याख्या और परिणाम विश्लेषण')} value={lib.testsDetailedAnalysis} path="library.testsDetailedAnalysis" last />
            </Section>

            <Section title={t('Downloads & Search', 'डाउनलोड और खोज')}>
              <ToggleRow label={t('Download Over Wi-Fi Only', 'केवल Wi-Fi पर डाउनलोड करें')} value={lib.downloadsWifiOnly} path="library.downloadsWifiOnly" />
              <ToggleRow label={t('Enable Offline Library Access', 'ऑफ़लाइन लाइब्रेरी एक्सेस')} value={lib.downloadsOfflineAccess} path="library.downloadsOfflineAccess" />
              <ToggleRow
                label={t('Smart Fuzzy Search', 'स्मार्ट फ़ज़ी खोज')}
                desc={t('Match spelling variations across Hindi & English notes', 'हिन्दी और अंग्रेज़ी नोट्स में वर्तनी भिन्नता का मिलान')}
                value={lib.searchFuzzyMatch}
                path="library.searchFuzzyMatch"
              />
              <SelectRow label={t('Default Search Filter', 'डिफ़ॉल्ट खोज फ़िल्टर')} value={lib.searchDefaultFilter} path="library.searchDefaultFilter" options={['All Resources', 'Notes', 'Books & PDFs', 'PYQ Bank']} last />
            </Section>
          </>
        );
        break;
      }

      /* 09. PROGRESS & STATISTICS */
      case 'stats': {
        const st = settings.stats;
        content = (
          <>
            <Section
              title={t('Study Tracking', 'अध्ययन ट्रैकिंग')}
              subtitle={t('Daily and Weekly targets are owned by Study Planner & Goals.', 'दैनिक और साप्ताहिक लक्ष्य स्टडी प्लानर से सिंक हैं।')}
            >
              <NavRow
                label={t('Daily & Weekly Study Targets', 'दैनिक और साप्ताहिक लक्ष्य')}
                desc={t('Edit target hours inside Study Planner', 'स्टडी प्लानर में लक्ष्य घंटे बदलें')}
                valueText={`${settings.planner.dailyStudyGoalHours}h/d • ${settings.planner.weeklyStudyGoalHours}h/w`}
                icon="📅"
                onPress={() => openCategory('planner')}
              />
              <ToggleRow
                label={t('Subject-wise Tracking', 'विषयवार ट्रैकिंग')}
                desc={t('Break down study hours across RAS/UPSC syllabus subjects', 'पाठ्यक्रम के विषयों के अनुसार अध्ययन समय ट्रैक करें')}
                value={st.subjectWiseTracking}
                path="stats.subjectWiseTracking"
              />
              <ToggleRow
                label={t('Focus Time Tracking', 'फ़ोकस समय ट्रैकिंग')}
                desc={t('Include Focus Centre timer logs in analytics', 'फ़ोकस टाइमर लॉग को आँकड़ों में शामिल करें')}
                value={st.focusTimeTracking}
                path="stats.focusTimeTracking"
              />
              <ToggleRow label={t('Include Break Time in Charts', 'चार्ट में ब्रेक समय शामिल करें')} value={st.includeBreakTimeInChart} path="stats.includeBreakTimeInChart" last />
            </Section>

            <Section title={t('Streaks & Progress Summary', 'स्ट्रीक और प्रगति सारांश')}>
              <SliderRow label={t('Minimum Daily Minutes for Streak', 'स्ट्रीक के लिए न्यूनतम दैनिक मिनट')} value={st.streakMinMinutes} min={15} max={120} step={15} unit=" min" path="stats.streakMinMinutes" />
              <ToggleRow
                label={t('Streak Freeze Protection', 'स्ट्रीक फ़्रीज़ सुरक्षा')}
                desc={t('Protect your streak for 1 missed exam/travel day per week', 'सप्ताह में 1 दिन चूकने पर भी स्ट्रीक सुरक्षित रखें')}
                value={st.streakFreezeEnabled}
                path="stats.streakFreezeEnabled"
                premium
              />
              <ToggleRow
                label={t('Weekly Progress Digest', 'साप्ताहिक प्रगति सारांश')}
                desc={t('Sunday evening summary of hours, accuracy & streaks', 'रविवार शाम अध्ययन और सटीकता की रिपोर्ट')}
                value={st.weeklyProgressDigest}
                path="stats.weeklyProgressDigest"
              />
              <NavRow
                label={t('Export Study Analytics (JSON)', 'अध्ययन आँकड़े एक्सपोर्ट करें')}
                icon="⬇️"
                onPress={() => simulateExport('study-sakha-analytics.json')}
                last
              />
            </Section>
          </>
        );
        break;
      }

      /* 10. GROUPS & COMMUNITY */
      case 'community': {
        const com = settings.community;
        content = (
          <>
            <Section title={t('Community Privacy', 'समुदाय गोपनीयता')}>
              <SelectRow label={t('Profile Visibility', 'प्रोफ़ाइल दृश्यता')} value={com.profileVisibility} path="community.profileVisibility" options={['Everyone', 'Study Groups Only', 'Private']} />
              <SelectRow label={t('Message Privacy', 'संदेश गोपनीयता')} value={com.messagePrivacy} path="community.messagePrivacy" options={['Everyone', 'Group Members', 'Nobody']} last />
            </Section>

            <Section title={t('Group Management', 'समूह प्रबंधन')}>
              <ToggleRow
                label={t('Group Discovery', 'समूह खोज')}
                desc={t('Suggest local & exam-specific study circles', 'अपनी परीक्षा से जुड़े स्टडी ग्रुप सुझाएँ')}
                value={com.groupDiscovery}
                path="community.groupDiscovery"
              />
              <SelectRow label={t('Group Invitations', 'समूह आमंत्रण')} value={com.groupInvitations} path="community.groupInvitations" options={['Anyone from Target Exam', 'Connections Only', 'Nobody']} />
              <SelectRow label={t('Join Request Handling', 'जॉइन अनुरोध')} value={com.joinRequestHandling} path="community.joinRequestHandling" options={['Manual Approval', 'Auto-Approve Verified Students']} />
              <NavRow
                label={t('Joined Study Groups & Leave Controls', 'जुड़े हुए समूह और प्रबंधन')}
                desc={`${com.joinedGroups.length} ${t('active groups', 'सक्रिय समूह')}`}
                valueText={t('Manage', 'प्रबंधित करें')}
                icon="👥"
                onPress={() => openDetail('community', 'manage_groups')}
                last
              />
            </Section>

            <Section title={t('Communication', 'संचार')}>
              <ToggleRow label={t('Chat Read Receipts', 'चैट रीड रिसीट्स')} value={com.chatReadReceipts} path="community.chatReadReceipts" />
              <SelectRow label={t('Chat Media Auto-Download', 'मीडिया ऑटो-डाउनलोड')} value={com.chatMediaAutoDownload} path="community.chatMediaAutoDownload" options={['Wi-Fi Only', 'Always', 'Never']} />
              <NavRow
                label={t('Blocked Users', 'ब्लॉक किए गए उपयोगकर्ता')}
                valueText={`${com.blockedUsers.length} ${t('blocked', 'ब्लॉक')}`}
                icon="🚫"
                onPress={() => openDetail('community', 'blocked_users')}
              />
              <NavRow
                label={t('Community Notification Settings', 'समुदाय सूचना सेटिंग्स')}
                desc={t('Managed centrally inside Notifications & Reminders', 'सूचनाएँ और रिमाइंडर श्रेणी में प्रबंधित')}
                icon="🔔"
                onPress={() => openCategory('notifications')}
                last
              />
            </Section>
          </>
        );
        break;
      }

      /* 11. NOTIFICATIONS & REMINDERS */
      case 'notifications': {
        const n = settings.notifications;
        content = (
          <>
            <Section title={t('Global Notification Control (Primary Owner)', 'मुख्य सूचना नियंत्रण')}>
              <ToggleRow
                label={t('Enable All Notifications', 'सभी सूचनाएँ चालू करें')}
                desc={t('Master switch for all Study Sakha alerts & reminders', 'स्टडी सखा की सभी सूचनाओं का मुख्य स्विच')}
                value={n.globalEnabled}
                path="notifications.globalEnabled"
                last
              />
            </Section>

            <View style={{ opacity: n.globalEnabled ? 1 : 0.45 }} pointerEvents={n.globalEnabled ? 'auto' : 'none'}>
              <Section title={t('Notification Categories', 'सूचना श्रेणियाँ')}>
                <ToggleRow label={t('Study Planner Alerts', 'स्टडी प्लानर अलर्ट')} value={n.studyPlannerAlerts} path="notifications.studyPlannerAlerts" />
                <ToggleRow label={t('Focus Reminders', 'फ़ोकस रिमाइंडर')} value={n.focusReminders} path="notifications.focusReminders" />
                <ToggleRow label={t('Test & Mock Reminders', 'टेस्ट और मॉक रिमाइंडर')} value={n.testReminders} path="notifications.testReminders" />
                <ToggleRow label={t('Sakha AI Notifications', 'सखा AI सूचनाएँ')} value={n.sakhaAiNotifications} path="notifications.sakhaAiNotifications" />
                <ToggleRow label={t('Group Notifications', 'समूह सूचनाएँ')} value={n.groupNotifications} path="notifications.groupNotifications" />
                <ToggleRow label={t('Chat Notifications', 'चैट सूचनाएँ')} value={n.chatNotifications} path="notifications.chatNotifications" />
                <ToggleRow label={t('Exam Announcements', 'परीक्षा घोषणाएँ')} value={n.announcements} path="notifications.announcements" last />
              </Section>

              <Section title={t('Quiet Hours & Delivery', 'शांत समय और डिलीवरी')}>
                <ToggleRow label={t('Quiet Hours', 'शांत समय')} desc={`${n.quietStart} — ${n.quietEnd}`} value={n.quietHoursEnabled} path="notifications.quietHoursEnabled" />
                <ToggleRow label={t('Auto Do Not Disturb During Focus', 'फ़ोकस के दौरान स्वतः DND')} value={n.dndSyncDuringFocus} path="notifications.dndSyncDuringFocus" />
                <SelectRow label={t('Notification Sound', 'सूचना ध्वनि')} value={n.sound} path="notifications.sound" options={['Soft Chime', 'Scholar Bell', 'Subtle Pop', 'Silent']} />
                <ToggleRow label={t('Vibration', 'कंपन')} value={n.vibration} path="notifications.vibration" />
                <SelectRow
                  label={t('Default Reminder Timing', 'रिमाइंडर समय')}
                  value={n.reminderTiming}
                  path="notifications.reminderTiming"
                  options={['At time of event', '5 min before', '15 min before', '30 min before']}
                  last
                />
              </Section>
            </View>
          </>
        );
        break;
      }

      /* 12. DATA, PRIVACY & SECURITY */
      case 'data': {
        const d = settings.data;
        content = (
          <>
            <Section title={t('Backup & Synchronization (Primary Owner)', 'बैकअप और सिंक्रनाइज़ेशन')}>
              <ToggleRow
                label={t('Automated Local Backup', 'स्वचालित लोकल बैकअप')}
                desc={`${t('Last backup:', 'अंतिम बैकअप:')} ${d.lastLocalBackup}`}
                value={d.localBackupEnabled}
                path="data.localBackupEnabled"
                simulated
              />
              <ToggleRow
                label={t('Encrypted Cloud Backup', 'एन्क्रिप्टेड क्लाउड बैकअप')}
                desc={t('Back up notes, bookmarks & planner to Study Sakha Cloud', 'नोट्स और प्लानर का सुरक्षित क्लाउड बैकअप')}
                value={d.cloudBackupEnabled}
                path="data.cloudBackupEnabled"
                premium
                simulated
              />
              <ToggleRow
                label={t('Multi-Device Cloud Sync', 'मल्टी-डिवाइस क्लाउड सिंक')}
                desc={`${t('Last synced:', 'अंतिम सिंक:')} ${d.lastSyncTime}`}
                value={d.cloudSyncEnabled}
                path="data.cloudSyncEnabled"
                simulated
              />
              <NavRow
                label={t('Sync & Backup Now', 'अभी सिंक और बैकअप करें')}
                desc={t('Cloud backup and recovery are not configured in this build.', 'इस बिल्ड में क्लाउड बैकअप और पुनर्स्थापना कॉन्फ़िगर नहीं हैं।')}
                icon="🔄"
                onPress={simulateSyncNow}
                last
              />
            </Section>

            <Section title={t('Storage & Cache', 'स्टोरेज और कैश')}>
              <NavRow
                label={t('Local Storage Usage & Downloads', 'लोकल स्टोरेज और डाउनलोड')}
                desc={`${d.storageUsedMB} MB ${t('used', 'उपयोग')} (${d.cacheSizeMB} MB ${t('cache', 'कैश')})`}
                valueText={t('Manage', 'प्रबंधित करें')}
                icon="💾"
                onPress={() => openDetail('data', 'storage_manager')}
                last
              />
            </Section>

            <Section title={t('Data Export & Recovery', 'डेटा एक्सपोर्ट और रिकवरी')}>
              <NavRow label={t('Export Notes (JSON)', 'नोट्स एक्सपोर्ट करें')} icon="📝" onPress={() => simulateExport('study-sakha-notes.json')} />
              <NavRow label={t('Export Study Progress', 'अध्ययन प्रगति एक्सपोर्ट करें')} icon="📊" onPress={() => simulateExport('study-sakha-progress.json')} />
              <NavRow label={t('Export Planner Data', 'प्लानर डेटा एक्सपोर्ट करें')} icon="📅" onPress={() => simulateExport('study-sakha-planner.json')} />
              <NavRow
                label={t('Restore Data from Backup', 'बैकअप से डेटा पुनर्स्थापित करें')}
                desc={t('No supported restore snapshot is available in this client.', 'इस ऐप में समर्थित पुनर्स्थापना स्नैपशॉट उपलब्ध नहीं है।')}
                icon="↩️"
                simulated
                last
                onPress={() =>
                  setModalConfig({
                    visible: true,
                    title: t('Restore unavailable', 'पुनर्स्थापना उपलब्ध नहीं'),
                    body: t('This build does not provide a restore workflow. Existing local data was not changed.', 'इस बिल्ड में पुनर्स्थापना सुविधा उपलब्ध नहीं है। मौजूदा स्थानीय डेटा नहीं बदला गया।'),
                    confirmText: t('Close', 'बंद करें'),
                    cancelText: t('Cancel', 'रद्द करें'),
                    onConfirm: () => showToast(t('No restore operation was performed.', 'कोई पुनर्स्थापना नहीं की गई।'), 'info'),
                  })
                }
              />
            </Section>

            <Section title={t('Privacy Controls', 'गोपनीयता नियंत्रण')}>
              <ToggleRow
                label={t('Crash Diagnostics', 'क्रैश डायग्नोस्टिक्स')}
                desc={t('Help improve stability with anonymous crash logs', 'ऐप स्थिरता सुधारने हेतु अनाम क्रैश लॉग')}
                value={d.shareCrashReports}
                path="data.shareCrashReports"
              />
              <ToggleRow label={t('Usage Analytics', 'उपयोग विश्लेषण')} value={d.shareUsageAnalytics} path="data.shareUsageAnalytics" />
              <NavRow
                label={t('Reset All App Settings to Default', 'सभी सेटिंग्स डिफ़ॉल्ट पर रीसेट करें')}
                desc={t('Restores entire Settings Control Center to initial state', 'सभी सेटिंग्स को प्रारंभिक स्थिति में वापस लाएँ')}
                icon="⚠️"
                danger
                last
                onPress={() =>
                  setModalConfig({
                    visible: true,
                    title: t('Reset Entire Settings Control Center?', 'संपूर्ण सेटिंग्स रीसेट करें?'),
                    body: t('Every setting across all 12 categories will return to its factory default.', 'सभी 12 श्रेणियों की सेटिंग्स डिफ़ॉल्ट हो जाएँगी।'),
                    confirmText: t('Reset Everything', 'सब कुछ रीसेट करें'),
                    cancelText: t('Cancel', 'रद्द करें'),
                    danger: true,
                    onConfirm: () => {
                      const def = getDefaultSettings();
                      setSettings(def);
                      persistSettings(def);
                      setNavLevel(1);
                      setCategoryId(null);
                      setDetailId(null);
                      showToast(t('All settings restored to factory defaults', 'सभी सेटिंग्स डिफ़ॉल्ट पर रीसेट हो गईं'), 'success');
                    },
                  })
                }
              />
            </Section>
          </>
        );
        break;
      }

      /* SPECIAL AREA A: PREMIUM & SUBSCRIPTION */
      case 'special_premium': {
        const sub = settings.subscription;
        const benefits = [
          [t('Unlimited Sakha AI (Gemini)', 'असीमित सखा AI'), t('No daily 25-query cap for RAS/UPSC doubts', 'कोई दैनिक सीमा नहीं')],
          [t('All 21 Focus Themes & Pro Backgrounds', 'सभी 21 फ़ोकस थीम'), t('Unlock Northern Lights, Vintage Library, Obsidian & more', 'सभी प्रीमियम थीम अनलॉक')],
          [t('Encrypted Cloud Backup', 'एन्क्रिप्टेड क्लाउड बैकअप'), t('Automatic multi-device sync & recovery', 'स्वचालित बैकअप और रिकवरी')],
          [t('Strict Focus Lock & Streak Freeze', 'स्ट्रिक्ट फ़ोकस लॉक और स्ट्रीक फ़्रीज़'), t('Unbreakable study sessions & weekly grace day', 'अटूट फ़ोकस सत्र और साप्ताहिक स्ट्रीक सुरक्षा')],
        ];
        content = (
          <>
            <View
              style={[
                styles.card,
                {
                  padding: 18,
                  marginBottom: 20,
                  backgroundColor: sub.isPremium ? colors.amberBg : colors.surface,
                  borderColor: sub.isPremium ? colors.amberBorder : colors.border,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                <View style={[styles.catIconBox, { width: 46, height: 46, backgroundColor: sub.isPremium ? '#f59e0b' : colors.surfaceAlt }]}>
                  <Text style={{ fontSize: 22 }}>👑</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: fs(10.5), fontWeight: '700', color: colors.textMuted, letterSpacing: 0.6 }}>
                    {t('CURRENT ENTITLEMENT', 'वर्तमान सदस्यता')}
                  </Text>
                  <Text style={{ fontSize: fs(18), fontWeight: '700', color: colors.text, marginTop: 2 }}>{sub.planName}</Text>
                  <Text style={{ fontSize: fs(11.5), color: colors.textMuted, marginTop: 2 }}>
                    {sub.isPremium
                      ? `${t('Active until', 'सक्रिय अवधि')}: ${sub.expiryDate} • ${sub.renewalCycle}`
                      : t('Upgrade for unlimited Sakha AI, Cloud Backup & Pro Themes', 'असीमित सखा AI, क्लाउड बैकअप और प्रो थीम के लिए अपग्रेड करें')}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => openPremiumModal(t('Premium entitlement', 'प्रीमियम सदस्यता'))}
                style={[styles.primaryBtn, { backgroundColor: sub.isPremium ? colors.surfaceAlt : activeAccent[600] }]}
              >
                <Text style={{ fontSize: fs(13), fontWeight: '700', color: sub.isPremium ? colors.text : '#ffffff' }}>
                  {t('Manage subscription', 'सदस्यता प्रबंधित करें')}
                </Text>
              </TouchableOpacity>
            </View>

            <Section title={t('Premium Benefits Comparison', 'प्रीमियम लाभ')}>
              <View style={{ padding: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {benefits.map(([title, desc], idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.benefitTile,
                      { width: isTablet ? '48.5%' : '100%', backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                    ]}
                  >
                    <Text style={{ fontSize: 15, marginRight: 8 }}>✅</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: fs(12.5), fontWeight: '700', color: colors.text }}>{title}</Text>
                      <Text style={{ fontSize: fs(11.5), color: colors.textMuted, marginTop: 2 }}>{desc}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </Section>

            <Section title={t('Billing & Renewal Details', 'बिलिंग और नवीनीकरण')}>
              <NavRow
                label={t('Billing Email', 'बिलिंग ईमेल')}
                valueText={sub.billingEmail}
                icon="✉️"
                onPress={() => showToast(`Billing receipts sent to ${sub.billingEmail}`)}
              />
              <NavRow
                label={t('Renewal Cycle', 'नवीनीकरण चक्र')}
                valueText={sub.isPremium ? sub.renewalCycle : t('No active billing', 'कोई सक्रिय बिलिंग नहीं')}
                icon="💳"
                onPress={() => showToast('Managed via Google Play / Razorpay in production')}
                last
              />
            </Section>
          </>
        );
        break;
      }

      /* SPECIAL AREA B: PERMISSIONS CENTRE */
      case 'special_permissions': {
        const pm = settings.permissions;
        const permList = [
          { key: 'androidNotifications', icon: '🔔', label: t('Android Notifications', 'एंड्रॉइड सूचनाएँ'), desc: t('Required for study reminders, focus bells and exam alerts', 'रिमाइंडर और फ़ोकस अलर्ट के लिए आवश्यक') },
          { key: 'audioAccess', icon: '🔊', label: t('Audio & Media Playback', 'ऑडियो एक्सेस'), desc: t('Required for ambient focus tracks and meditation chimes', 'फ़ोकस संगीत और ध्यान ध्वनि के लिए') },
          { key: 'nativeAppBlocking', icon: '🛡️', label: t('Native App Blocking (Accessibility)', 'नेटिव ऐप ब्लॉकिंग'), desc: t('Required for Focus Lock to shield distracting apps', 'फ़ोकस लॉक द्वारा ऐप ब्लॉक करने के लिए') },
          { key: 'fileAccess', icon: '📁', label: t('Local File & PDF Access', 'फ़ाइल और PDF एक्सेस'), desc: t('Required for offline books, PDF reader and local backup', 'ऑफ़लाइन पुस्तकें और बैकअप के लिए') },
        ] as const;

        content = (
          <>
            <View style={[styles.noticeBanner, { backgroundColor: colors.amberBg, borderColor: colors.amberBorder }]}>
              <Text style={{ fontSize: fs(11.5), color: isDark ? '#fde68a' : '#78350f', lineHeight: fs(17) }}>
                <Text style={{ fontWeight: '700' }}>{t('Live device status: ', 'लाइव डिवाइस स्थिति: ')}</Text>
                {t('Permission values are read from supported platform APIs. Unsupported capabilities are shown as unavailable.', 'अनुमति मान समर्थित प्लेटफ़ॉर्म API से पढ़े जाते हैं। असमर्थित सुविधाएँ अनुपलब्ध दिखाई जाती हैं।')}
              </Text>
            </View>

            <Section title={t('Device Permissions Status', 'डिवाइस अनुमति स्थिति')}>
              {permList.map((item) => {
                const granted = pm[item.key] !== 'Denied';
                return (
                  <View
                    key={item.key}
                    style={[styles.rowColumn, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
                      <View style={[styles.navIconBox, { backgroundColor: colors.surfaceAlt }]}>
                        <Text style={{ fontSize: 15 }}>{item.icon}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.badgeWrap}>
                          <Text style={{ fontSize: fs(13.5), fontWeight: '600', color: colors.text }}>{item.label}</Text>
                          <Text style={{ fontSize: fs(10), color: colors.textMuted }}>{item.key === 'androidNotifications' ? pm[item.key] : t('Unavailable / app-managed', 'अनुपलब्ध / ऐप द्वारा प्रबंधित')}</Text>
                        </View>
                        <Text style={{ fontSize: fs(11.5), color: colors.textMuted, marginTop: 2 }}>{item.desc}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        if (item.key === 'androidNotifications') {
                          void requestNotificationPermission().then((allowed) => {
                            updateSetting('permissions.androidNotifications', allowed ? 'Granted' : 'Denied', allowed ? t('Notifications granted', 'सूचना अनुमति दी गई') : t('Notification permission was not granted', 'सूचना अनुमति नहीं दी गई'));
                          });
                        } else if (item.key === 'nativeAppBlocking' && focusLockNative) {
                          void focusLockNative.openAccessibilitySettings().catch(() => showToast(t('Unable to open accessibility settings', 'एक्सेसिबिलिटी सेटिंग्स नहीं खुल सकीं'), 'error'));
                        } else {
                          showToast(t('This permission is managed by the platform or is unavailable in this build.', 'यह अनुमति प्लेटफ़ॉर्म द्वारा प्रबंधित है या इस बिल्ड में उपलब्ध नहीं है।'), 'info');
                        }
                      }}
                      style={[
                        styles.permPill,
                        {
                          backgroundColor: granted ? colors.emeraldBg : colors.dangerBg,
                          borderColor: granted ? colors.emerald : colors.danger,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: fs(11.5), fontWeight: '700', color: granted ? colors.emerald : colors.danger }}>
                        {granted ? t('Granted', 'स्वीकृत') : t('Denied — Tap to Grant', 'अस्वीकृत — अनुमति दें')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
              <NavRow
                label={t('Open Device Settings', 'डिवाइस सेटिंग्स खोलें')}
                desc={t('Launches Android App Info screen on mobile devices', 'मोबाइल डिवाइस पर Android ऐप जानकारी खोलता है')}
                icon="↗️"
                last
                onPress={() => void Linking.openSettings().catch(() => showToast(t('Device settings are unavailable on this platform', 'इस प्लेटफ़ॉर्म पर डिवाइस सेटिंग्स उपलब्ध नहीं हैं'), 'error'))}
              />
            </Section>
          </>
        );
        break;
      }

      /* SPECIAL AREA C: HELP & SUPPORT */
      case 'special_help': {
        const faqs = [
          [
            t('How do Study Profile Presets work?', 'स्टडी प्रोफ़ाइल प्रीसेट कैसे काम करते हैं?'),
            t(
              'Go to Learning & Study Preferences and select RAS, UPSC, RSSB or NET/JRF to auto-configure syllabus subjects, PYQ filters and revision cadence.',
              'अध्ययन प्राथमिकताओं में जाकर RAS, UPSC या RSSB प्रीसेट चुनें।'
            ),
          ],
          [
            t('Why is Focus Lock unavailable here?', 'फ़ोकस लॉक यहाँ अनुपलब्ध क्यों है?'),
            t(
              focusLockNative
                ? 'The installed native module provides permission status; Focus Centre owns starting and ending blocking sessions.'
                : 'This build does not include the Android accessibility and usage-access services required for OS-level blocking.',
              focusLockNative
                ? 'नेटिव मॉड्यूल अनुमति स्थिति देता है; ब्लॉकिंग सत्र शुरू और समाप्त करना Focus Centre के पास है।'
                : 'इस बिल्ड में OS स्तर की ब्लॉकिंग के लिए आवश्यक Android सेवाएँ शामिल नहीं हैं।'
            ),
          ],
          [
            t('Can I use English UI with Hindi Sakha AI?', 'क्या मैं अंग्रेज़ी ऐप के साथ हिन्दी सखा AI उपयोग कर सकता हूँ?'),
            t(
              'Yes! App UI Language lives in Appearance, while AI Response Language is independently controlled in Sakha AI.',
              'हाँ! ऐप भाषा और सखा AI की भाषा स्वतंत्र रूप से सेट की जा सकती है।'
            ),
          ],
        ];

        content = (
          <>
            <Section title={t('App Guide & FAQs', 'ऐप गाइड और सामान्य प्रश्न')}>
              {faqs.map(([q, ans], idx) => {
                const open = openFaqIdx === idx;
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setOpenFaqIdx(open ? null : idx)}
                    activeOpacity={0.75}
                    style={[
                      styles.rowColumn,
                      { borderBottomWidth: idx === faqs.length - 1 ? 0 : StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: fs(13.5), fontWeight: '600', color: colors.text, flex: 1, marginRight: 8 }}>{q}</Text>
                      <Text style={{ fontSize: fs(13), color: colors.textMuted }}>{open ? '▴' : '▾'}</Text>
                    </View>
                    {open ? (
                      <Text style={{ fontSize: fs(12), color: colors.textMuted, marginTop: 8, lineHeight: fs(18) }}>{ans}</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </Section>

            <Section title={t('Feedback, Bug Report & Support', 'फ़ीडबैक, बग रिपोर्ट और सहायता')}>
              <NavRow
                label={t('Submit Feedback', 'फ़ीडबैक भेजें')}
                desc={t('Share feature ideas for RAS/UPSC preparation', 'नई सुविधाओं के सुझाव भेजें')}
                icon="💬"
                onPress={() => setFeedbackModal({ visible: true, kind: 'feedback', text: '' })}
              />
              <NavRow
                label={t('Report a Bug', 'बग रिपोर्ट करें')}
                desc={t('Send diagnostics & issue details to engineering', 'तकनीकी समस्या की रिपोर्ट करें')}
                icon="🐛"
                onPress={() => setFeedbackModal({ visible: true, kind: 'bug', text: '' })}
              />
              <NavRow
                label={t('Contact Support', 'सहायता टीम से संपर्क करें')}
                desc="support@studysakha.in • Mon–Sat, 9 AM – 7 PM IST"
                icon="🎧"
                onPress={() => showToast('Support email: support@studysakha.in')}
                last
              />
            </Section>
          </>
        );
        break;
      }

      /* SPECIAL AREA D: ABOUT STUDY SAKHA */
      case 'special_about': {
        content = (
          <>
            <View style={[styles.card, { padding: 24, alignItems: 'center', marginBottom: 20, backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.avatarBox, { backgroundColor: activeAccent[600], marginBottom: 10 }]}>
                <Text style={{ fontSize: 24 }}>📘</Text>
              </View>
              <Text style={{ fontSize: fs(18), fontWeight: '700', color: colors.text }}>Study Sakha</Text>
              <Text style={{ fontSize: fs(11.5), color: colors.textMuted, textAlign: 'center', marginTop: 4 }}>
                {t('Version 3.4.2 (Build 2026.11) • Built for Indian Competitive Exam Aspirants', 'संस्करण 3.4.2 • भारतीय प्रतियोगी परीक्षाओं के विद्यार्थियों के लिए निर्मित')}
              </Text>
            </View>

            <Section title={t('Release & Legal Information', 'रिलीज़ और कानूनी जानकारी')}>
              <NavRow label={t("What's New & Changelog", 'नया क्या है और चेंजलॉग')} valueText={APP_VERSION} icon="✨" onPress={() => openLegalModal('changelog')} />
              <NavRow label={t('Credits & Open Source', 'क्रेडिट और ओपन सोर्स')} icon="❤️" onPress={() => openLegalModal('credits')} />
              <NavRow label={t('Privacy Policy', 'गोपनीयता नीति')} icon="🛡️" onPress={() => openLegalModal('privacy')} />
              <NavRow label={t('Terms of Service', 'सेवा की शर्तें')} icon="📄" onPress={() => openLegalModal('terms')} last />
            </Section>
          </>
        );
        break;
      }
    }

    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        contentOffset={{ x: 0, y: scrollOffsetsRef.current[`category:${categoryId}`] ?? 0 }}
        onScroll={(event) => {
          scrollOffsetsRef.current[`category:${categoryId}`] = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        {/* Category Header with Breadcrumb & Reset Defaults */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <TouchableOpacity
              onPress={goHome}
              style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>←</Text>
            </TouchableOpacity>
            <View style={[styles.catIconBox, { width: 38, height: 38, marginLeft: 10, backgroundColor: isDark ? meta.bgDark : meta.bgLight }]}>
              <Text style={{ fontSize: 17 }}>{meta.icon}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ fontSize: fs(10.5), color: colors.textMuted }}>
                {t('Settings', 'सेटिंग्स')} › {mainMeta ? `${t('Category', 'श्रेणी')} ${mainMeta.num}` : `${t('Special Area', 'विशेष क्षेत्र')} ${specialMeta?.code}`}
              </Text>
              <Text style={{ fontSize: fs(17), fontWeight: '700', color: colors.text, fontFamily: fontFamilyStyle }} numberOfLines={1}>
                {t(meta.en, meta.hi)}
              </Text>
            </View>
          </View>
          {mainMeta ? (
            <TouchableOpacity
              onPress={() => resetCategory(categoryId as keyof SettingsState)}
              style={[styles.resetBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={{ fontSize: fs(11), fontWeight: '600', color: colors.textSecondary }}>↺ {t('Reset', 'रीसेट')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={{ fontSize: fs(11.5), color: colors.textMuted, marginBottom: 18, fontFamily: fontFamilyStyle }}>
          {t(meta.descEn, meta.descHi)}
        </Text>

        {content}
      </ScrollView>
    );
  };

  /* --------------------------------------------------------------------------
     7. LEVEL 3: ALL 13 DEDICATED DETAIL SCREENS (ZERO PLACEHOLDERS)
     -------------------------------------------------------------------------- */
  const renderDetailScreen = () => {
    const catMeta = MAIN_CATEGORIES.find((c) => c.id === categoryId) || SPECIAL_AREAS.find((s) => s.id === categoryId);
    let title = '';
    let subtitle = '';
    let body: React.ReactNode = null;

    if (detailId === 'edit_profile') {
      title = t('Personal Information', 'व्यक्तिगत जानकारी');
      subtitle = t('Update your student identity displayed on Study Sakha.', 'स्टडी सखा पर अपनी विद्यार्थी जानकारी अपडेट करें।');
      body = (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, padding: 16, gap: 12 }]}>
          {[
            { key: 'name', label: t('Full Name', 'पूरा नाम') },
            { key: 'email', label: t('Email Address', 'ईमेल पता') },
            { key: 'state', label: t('State / Region', 'राज्य') },
            { key: 'attemptYear', label: t('Target Attempt Year', 'लक्ष्य प्रयास वर्ष') },
          ].map((f) => (
            <View key={f.key}>
              <Text style={{ fontSize: fs(11.5), fontWeight: '600', color: colors.textSecondary, marginBottom: 5 }}>{f.label}</Text>
              <TextInput
                value={(profileForm as any)[f.key]}
                onChangeText={(val) => setProfileForm((p) => ({ ...p, [f.key]: val }))}
                style={[styles.formInput, { color: colors.text, backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
              />
            </View>
          ))}
          <View>
            <Text style={{ fontSize: fs(11.5), fontWeight: '600', color: colors.textSecondary, marginBottom: 5 }}>{t('Student Bio', 'परिचय')}</Text>
            <TextInput
              value={profileForm.bio}
              onChangeText={(val) => setProfileForm((p) => ({ ...p, bio: val }))}
              multiline
              numberOfLines={3}
              style={[styles.formInput, { height: 76, textAlignVertical: 'top', color: colors.text, backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
            />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
            <TouchableOpacity onPress={goBack} style={[styles.smallActionBtn, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={{ fontSize: fs(12.5), fontWeight: '600', color: colors.text }}>{t('Cancel', 'रद्द करें')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (!profileForm.name.trim() || !profileForm.email.trim()) {
                  showToast(t('Name and email are required', 'नाम और ईमेल आवश्यक हैं'), 'error');
                  return;
                }
                void saveProfile({
                  name: profileForm.name.trim(),
                  email: profileForm.email.trim(),
                  currentCity: profileForm.state.trim(),
                  examFocus: profileForm.bio.trim(),
                }).then((result) => {
                  if (!result.ok) {
                    showToast(result.error, 'error');
                    return;
                  }
                  mutateSettings((d) => {
                    d.account.name = profileForm.name.trim();
                    d.account.email = profileForm.email.trim();
                    d.account.state = profileForm.state.trim();
                    d.account.attemptYear = profileForm.attemptYear.trim();
                    d.account.bio = profileForm.bio.trim();
                  }, t('Profile updated', 'प्रोफ़ाइल अपडेट हो गई'));
                  goBack();
                });
              }}
              style={[styles.smallActionBtn, { backgroundColor: activeAccent[600] }]}
            >
              <Text style={{ fontSize: fs(12.5), fontWeight: '700', color: '#ffffff' }}>{t('Save Changes', 'बदलाव सहेजें')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    } else if (detailId === 'change_password') {
      title = t('Change Password', 'पासवर्ड बदलें');
      subtitle = t('Use a strong password of at least 8 characters.', 'कम से कम 8 अक्षरों का मज़बूत पासवर्ड उपयोग करें।');
      body = (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, padding: 16, gap: 12 }]}>
          <View>
            <Text style={{ fontSize: fs(11.5), fontWeight: '600', color: colors.textSecondary, marginBottom: 5 }}>{t('Current Password', 'वर्तमान पासवर्ड')}</Text>
            <TextInput
              value={pwForm.cur}
              onChangeText={(val) => setPwForm((p) => ({ ...p, cur: val }))}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              style={[styles.formInput, { color: colors.text, backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
            />
          </View>
          <View>
            <Text style={{ fontSize: fs(11.5), fontWeight: '600', color: colors.textSecondary, marginBottom: 5 }}>{t('New Password', 'नया पासवर्ड')}</Text>
            <TextInput
              value={pwForm.nw}
              onChangeText={(val) => setPwForm((p) => ({ ...p, nw: val }))}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              style={[styles.formInput, { color: colors.text, backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
            />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
            <TouchableOpacity onPress={goBack} style={[styles.smallActionBtn, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={{ fontSize: fs(12.5), fontWeight: '600', color: colors.text }}>{t('Cancel', 'रद्द करें')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (pwForm.nw.length < 8) {
                  showToast(t('New password must be at least 8 characters', 'नया पासवर्ड कम से कम 8 अक्षरों का होना चाहिए'), 'error');
                  return;
                }
                if (!pwForm.cur) {
                  showToast(t('Enter your current password', 'अपना वर्तमान पासवर्ड दर्ज करें'), 'error');
                  return;
                }
                if (!supabaseConfigured || !state.user) {
                  showToast(t('Password management is unavailable while authentication is not configured.', 'प्रमाणीकरण कॉन्फ़िगर नहीं है, इसलिए पासवर्ड प्रबंधन उपलब्ध नहीं है।'), 'error');
                  return;
                }
                void supabase.auth.signInWithPassword({ email: state.user.email, password: pwForm.cur }).then(async ({ error }) => {
                  if (error) {
                    showToast(error.message, 'error');
                    return;
                  }
                  const result = await supabase.auth.updateUser({ password: pwForm.nw });
                  if (result.error) {
                    showToast(result.error.message, 'error');
                    return;
                  }
                  goBack();
                  showToast(t('Password updated', 'पासवर्ड अपडेट हो गया'), 'success');
                });
              }}
              style={[styles.smallActionBtn, { backgroundColor: activeAccent[600] }]}
            >
              <Text style={{ fontSize: fs(12.5), fontWeight: '700', color: '#ffffff' }}>{t('Update Password', 'पासवर्ड अपडेट करें')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    } else if (detailId === 'active_sessions') {
      title = t('Active Devices & Sessions', 'सक्रिय डिवाइस और सत्र');
      subtitle = t('Devices currently signed into your Study Sakha account.', 'आपके खाते में वर्तमान में लॉग-इन डिवाइस।');
      body = (
        <Section title={t('Signed-in Devices', 'लॉग-इन डिवाइस')}>
          {settings.account.activeSessions.map((s, idx) => (
            <View
              key={s.id}
              style={[
                styles.row,
                { borderBottomWidth: idx === settings.account.activeSessions.length - 1 ? 0 : StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }}>
                <View style={[styles.navIconBox, { backgroundColor: colors.surfaceAlt }]}>
                  <Text style={{ fontSize: 15 }}>📱</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.badgeWrap}>
                    <Text style={{ fontSize: fs(13), fontWeight: '600', color: colors.text }}>{s.device}</Text>
                    {s.current ? (
                      <View style={[styles.badgeSim, { backgroundColor: colors.emeraldBg, borderColor: colors.emerald }]}>
                        <Text style={{ fontSize: fs(9.5), fontWeight: '700', color: colors.emerald }}>{t('This device', 'यह डिवाइस')}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ fontSize: fs(11.5), color: colors.textMuted, marginTop: 2 }}>
                    {s.location} • {s.lastActive}
                  </Text>
                </View>
              </View>
              {!s.current ? (
                <TouchableOpacity
                  onPress={() =>
                    mutateSettings(
                      (d) => {
                        d.account.activeSessions = d.account.activeSessions.filter((item) => item.id !== s.id);
                      },
                      t('Device session revoked', 'डिवाइस सत्र हटाया गया')
                    )
                  }
                  style={[styles.smallActionBtn, { backgroundColor: colors.dangerBg }]}
                >
                  <Text style={{ fontSize: fs(11.5), fontWeight: '700', color: colors.danger }}>{t('Revoke', 'हटाएँ')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))}
        </Section>
      );
    } else if (detailId === 'custom_bg') {
      const a = settings.appearance;
      title = t('Custom Background', 'कस्टम बैकग्राउंड');
      subtitle = t('Choose a subtle backdrop, upload your own image, and tune readability.', 'प्रीसेट चुनें या अपनी छवि अपलोड करें।');
      body = (
        <>
          <Section title={t('Background Library', 'बैकग्राउंड लाइब्रेरी')}>
            <View style={{ padding: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {BACKGROUND_LIBRARY.map((bg) => {
                const locked = bg.premium && !settings.subscription.isPremium;
                const active = !a.customBgLabel && a.backgroundId === bg.id;
                return (
                  <TouchableOpacity
                    key={bg.id}
                    onPress={() => {
                      if (locked) openPremiumModal(bg.name);
                      else {
                        mutateSettings(
                          (d) => {
                            d.appearance.customBgLabel = '';
                            d.appearance.backgroundId = bg.id;
                          },
                          t('Background updated', 'बैकग्राउंड अपडेट हुआ')
                        );
                      }
                    }}
                    style={[
                      styles.bgCard,
                      {
                        width: isTablet ? '31.5%' : '47.8%',
                        borderColor: active ? activeAccent[600] : colors.border,
                        borderWidth: active ? 2 : 1,
                      },
                    ]}
                  >
                    <View style={[styles.bgPreviewSwatch, { backgroundColor: isDark ? bg.darkBg : bg.previewBg, borderColor: colors.border }]}>
                      {locked ? <Text style={{ fontSize: 16 }}>🔒</Text> : active ? <Text style={{ fontSize: 15 }}>✓</Text> : null}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                      <Text style={{ fontSize: fs(11.5), fontWeight: '600', color: colors.text, flex: 1 }} numberOfLines={1}>
                        {t(bg.name, bg.hi)}
                      </Text>
                      {bg.premium ? <BadgePro /> : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Section>

          <Section title={t('Custom Image Upload & Blending', 'कस्टम छवि अपलोड और ब्लेंडिंग')}>
            <View style={[styles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }]}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={{ fontSize: fs(13.5), fontWeight: '500', color: colors.text }}>{t('Upload Local Image', 'लोकल छवि अपलोड करें')}</Text>
                <Text style={{ fontSize: fs(11.5), color: colors.textMuted, marginTop: 2 }}>
                  {t('Image selection is managed from the Profile screen.', 'छवि चयन प्रोफ़ाइल स्क्रीन से प्रबंधित करें।')}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity
                  onPress={() => showToast(t('Custom backgrounds are not supported by the current ThemeProvider.', 'वर्तमान ThemeProvider कस्टम बैकग्राउंड समर्थित नहीं करता।'), 'info')}
                  style={[styles.smallActionBtn, { backgroundColor: activeAccent[600] }]}
                >
                  <Text style={{ fontSize: fs(11), fontWeight: '700', color: '#fff' }}>{t('Choose', 'चुनें')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    mutateSettings(
                      (d) => {
                        d.appearance.customBgLabel = '';
                        d.appearance.backgroundId = 'none';
                      },
                      t('Background reset', 'बैकग्राउंड रीसेट')
                    )
                  }
                  style={[styles.smallActionBtn, { backgroundColor: colors.surfaceAlt }]}
                >
                  <Text style={{ fontSize: fs(11), fontWeight: '600', color: colors.text }}>{t('Reset', 'रीसेट')}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <SliderRow label={t('Background Opacity', 'बैकग्राउंड अपारदर्शिता')} value={a.bgOpacity} min={10} max={100} step={5} unit="%" path="appearance.bgOpacity" />
            <SliderRow label={t('Overlay Intensity', 'ओवरले तीव्रता')} value={a.overlayIntensity} min={0} max={85} step={5} unit="%" path="appearance.overlayIntensity" last />
          </Section>
        </>
      );
    } else if (detailId === 'dashboard_layout') {
      const w = settings.appearance.dashboardWidgets;
      title = t('Dashboard Customization', 'डैशबोर्ड अनुकूलन');
      subtitle = t('Choose which widgets appear on your Study Sakha Dashboard.', 'डैशबोर्ड पर दिखने वाले विजेट चुनें।');
      body = (
        <Section title={t('Visible Dashboard Modules', 'दृश्यमान डैशबोर्ड मॉड्यूल')}>
          <ToggleRow label={t('Study Streak Card', 'अध्ययन स्ट्रीक कार्ड')} value={w.streakCard} path="appearance.dashboardWidgets.streakCard" />
          <ToggleRow label={t('Daily Goal Progress Ring', 'दैनिक लक्ष्य रिंग')} value={w.dailyGoalRing} path="appearance.dashboardWidgets.dailyGoalRing" />
          <ToggleRow label={t('Quick Revision Deck', 'त्वरित रिवीजन डेक')} value={w.quickRevision} path="appearance.dashboardWidgets.quickRevision" simulated available={false} />
          <ToggleRow label={t('Sakha AI Quick Prompt', 'सखा AI त्वरित प्रॉम्प्ट')} value={w.sakhaAiPrompt} path="appearance.dashboardWidgets.sakhaAiPrompt" simulated available={false} />
          <ToggleRow label={t('Upcoming Mock Tests', 'आगामी मॉक टेस्ट')} value={w.upcomingTests} path="appearance.dashboardWidgets.upcomingTests" simulated available={false} last />
        </Section>
      );
    } else if (detailId === 'preferred_subjects') {
      const allSubjects = [
        'Rajasthan History & Culture',
        'Rajasthan Geography',
        'Indian Polity',
        'Indian Economy',
        'Current Affairs',
        'Science & Tech',
        'Reasoning & Mental Ability',
        'Hindi & English Grammar',
        'Ethics & Public Admin',
      ];
      title = t('Preferred Subjects', 'पसंदीदा विषय');
      subtitle = t('Select subjects to prioritize in Library, PYQ, and Planner suggestions.', 'लाइब्रेरी और PYQ के लिए प्राथमिकता वाले विषय चुनें।');
      body = (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, padding: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }]}>
          {allSubjects.map((sub) => {
            const selected = settings.learning.preferredSubjects.includes(sub);
            return (
              <TouchableOpacity
                key={sub}
                onPress={() =>
                  mutateSettings((d) => {
                    const idx = d.learning.preferredSubjects.indexOf(sub);
                    if (idx > -1) d.learning.preferredSubjects.splice(idx, 1);
                    else d.learning.preferredSubjects.push(sub);
                  })
                }
                style={[
                  styles.chipBtn,
                  {
                    backgroundColor: selected ? activeAccent[600] : colors.surfaceAlt,
                    borderColor: selected ? activeAccent[600] : colors.border,
                  },
                ]}
              >
                <Text style={{ fontSize: fs(12), fontWeight: '600', color: selected ? '#fff' : colors.text }}>
                  {selected ? `✓ ${sub}` : `+ ${sub}`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    } else if (detailId === 'study_timetable') {
      const templates = [
        { name: 'Balanced Morning + Evening', blocks: '05:30–08:30 Core Concept • 11:00–13:00 PYQ • 17:00–19:30 Revision' },
        { name: 'Early Bird RAS Intensive', blocks: '05:00–09:00 GS Mains • 10:30–13:30 Rajasthan GK • 16:00–18:00 Answer Writing' },
        { name: 'Working Aspirant Schedule', blocks: '05:30–07:30 Core • 19:30–22:00 Practice & Current Affairs' },
        { name: 'Night Owl Deep Focus', blocks: '10:00–13:00 Reading • 16:00–19:00 Mock Test • 21:30–00:30 Deep Revision' },
      ];
      title = t('Study Timetable Templates', 'अध्ययन समय-सारणी');
      subtitle = t('Choose a structured daily rhythm for your competitive exam preparation.', 'अपनी परीक्षा तैयारी के लिए दैनिक समय-सारणी चुनें।');
      body = (
        <Section title={t('Timetable Presets', 'समय-सारणी प्रीसेट')}>
          {templates.map((tp, idx) => {
            const active = settings.planner.timetableTemplate === tp.name;
            return (
              <TouchableOpacity
                key={tp.name}
                onPress={() => updateSetting('planner.timetableTemplate', tp.name, t('Timetable updated', 'समय-सारणी अपडेट हुई'))}
                style={[
                  styles.row,
                  { borderBottomWidth: idx === templates.length - 1 ? 0 : StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
                ]}
              >
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={{ fontSize: fs(13.5), fontWeight: '600', color: colors.text }}>{tp.name}</Text>
                  <Text style={{ fontSize: fs(11.5), color: colors.textMuted, marginTop: 3 }}>{tp.blocks}</Text>
                </View>
                {active ? <Text style={{ fontSize: 16, fontWeight: '700', color: activeAccent[600] }}>✓</Text> : null}
              </TouchableOpacity>
            );
          })}
        </Section>
      );
    } else if (detailId === 'focus_themes') {
      const f = settings.focus;
      const cats = ['All', 'Nature', 'Cozy', 'Celestial', 'Minimal'];
      const filtered = f.themeCategoryFilter === 'All' ? FOCUS_THEMES : FOCUS_THEMES.filter((th) => th.cat === f.themeCategoryFilter);
      title = t('Focus Theme Library (21 Themes)', 'फ़ोकस थीम लाइब्रेरी (21 थीम)');
      subtitle = t('Select an immersive backdrop for Focus Centre sessions.', 'फ़ोकस सत्रों के लिए शांतिपूर्ण थीम चुनें।');
      body = (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {cats.map((c) => {
              const active = f.themeCategoryFilter === c;
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => updateSetting('focus.themeCategoryFilter', c)}
                  style={[
                    styles.chipBtn,
                    {
                      backgroundColor: active ? activeAccent[600] : colors.surface,
                      borderColor: active ? activeAccent[600] : colors.border,
                    },
                  ]}
                >
                  <Text style={{ fontSize: fs(11.5), fontWeight: '600', color: active ? '#fff' : colors.text }}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.flexWrapGrid}>
            {filtered.map((th) => {
              const active = f.selectedTheme === th.id;
              const locked = th.premium && !settings.subscription.isPremium;
              return (
                <TouchableOpacity
                  key={th.id}
                  onPress={() => {
                    if (locked) openPremiumModal(`${th.name} Focus Theme`);
                    else updateSetting('focus.selectedTheme', th.id, `Focus Theme: ${th.name}`);
                  }}
                  style={[
                    styles.themeCard,
                    {
                      width: isTablet ? '31.8%' : '48%',
                      backgroundColor: th.bg,
                      borderColor: active ? activeAccent[500] : colors.border,
                      borderWidth: active ? 2.5 : 1,
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={styles.themeCatPill}>
                      <Text style={{ fontSize: fs(9.5), fontWeight: '600', color: '#f8fafc' }}>{th.cat}</Text>
                    </View>
                    {active ? (
                      <View style={styles.themeStatusCircle}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: activeAccent[600] }}>✓</Text>
                      </View>
                    ) : locked ? (
                      <View style={[styles.themeStatusCircle, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
                        <Text style={{ fontSize: 10 }}>🔒</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ color: '#ffffff', fontSize: fs(12), fontWeight: '700' }}>{t(th.name, th.hi)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      );
    } else if (detailId === 'blocked_apps') {
      const allApps = ['Instagram', 'YouTube', 'WhatsApp', 'X (Twitter)', 'Snapchat', 'BGMI', 'Telegram', 'Chrome', 'Netflix', 'Reddit'];
      const allowCandidates = ['Phone', 'Messages', 'Calculator', 'Dictionary', 'Study Sakha', 'UPI / Payments', 'Clock'];
      title = t('Distracting Apps & Allowlist', 'ब्लॉक ऐप और अनुमति सूची');
      subtitle = t('Toggle which apps are shielded when Focus Lock is active.', 'फ़ोकस लॉक सक्रिय होने पर ब्लॉक किए जाने वाले ऐप चुनें।');
      body = (
        <>
          <Section title={t('Blocked Distracting Apps', 'ब्लॉक किए गए ऐप')}>
            <View style={{ padding: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {allApps.map((app) => {
                const blocked = settings.focuslock.blockedApps.includes(app);
                return (
                  <TouchableOpacity
                    key={app}
                    onPress={() =>
                      mutateSettings((d) => {
                        const idx = d.focuslock.blockedApps.indexOf(app);
                        if (idx > -1) d.focuslock.blockedApps.splice(idx, 1);
                        else d.focuslock.blockedApps.push(app);
                      })
                    }
                    style={[
                      styles.chipBtn,
                      {
                        backgroundColor: blocked ? colors.danger : colors.surfaceAlt,
                        borderColor: blocked ? colors.danger : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: fs(11.5), fontWeight: '600', color: blocked ? '#fff' : colors.text }}>
                      {blocked ? `🚫 ${app}` : `+ ${app}`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Section>

          <Section title={t('Always Allowed (Allowlist)', 'हमेशा अनुमत ऐप')}>
            <View style={{ padding: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {allowCandidates.map((app) => {
                const allowed = settings.focuslock.allowedApps.includes(app);
                return (
                  <TouchableOpacity
                    key={app}
                    onPress={() =>
                      mutateSettings((d) => {
                        const idx = d.focuslock.allowedApps.indexOf(app);
                        if (idx > -1) d.focuslock.allowedApps.splice(idx, 1);
                        else d.focuslock.allowedApps.push(app);
                      })
                    }
                    style={[
                      styles.chipBtn,
                      {
                        backgroundColor: allowed ? colors.emerald : colors.surfaceAlt,
                        borderColor: allowed ? colors.emerald : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: fs(11.5), fontWeight: '600', color: allowed ? '#fff' : colors.text }}>
                      {allowed ? `✓ ${app}` : `+ ${app}`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Section>
        </>
      );
    } else if (detailId === 'pdf_reader') {
      const lib = settings.library;
      title = t('PDF Reader Preferences', 'PDF रीडर प्राथमिकताएँ');
      subtitle = t('Customize long-duration NCERT, standard book & notes PDF reading comfort.', 'लंबे समय तक PDF पढ़ने के लिए आरामदायक सेटिंग्स।');
      const previewBg = lib.pdfReadingTheme === 'Warm Sepia' ? '#f8f1e3' : lib.pdfReadingTheme === 'Dark' ? '#0f172a' : '#ffffff';
      const previewText = lib.pdfReadingTheme === 'Warm Sepia' ? '#3d3124' : lib.pdfReadingTheme === 'Dark' ? '#e2e8f0' : '#0f172a';
      const previewBorder = lib.pdfReadingTheme === 'Warm Sepia' ? '#e6d8be' : lib.pdfReadingTheme === 'Dark' ? '#334155' : '#e2e8f0';

      body = (
        <>
          <View style={[styles.card, { padding: 18, marginBottom: 18, backgroundColor: previewBg, borderColor: previewBorder }]}>
            <Text style={{ fontSize: fs(10.5), fontWeight: '700', letterSpacing: 0.7, color: previewText, opacity: 0.6, marginBottom: 6 }}>
              {t('LIVE PDF READING PREVIEW', 'लाइव PDF प्रीव्यू')}
            </Text>
            <Text style={{ fontSize: (14 * lib.pdfTextSize) / 100, color: previewText, lineHeight: (22 * lib.pdfTextSize) / 100 }}>
              {t(
                'Article 153 of the Constitution of India states that there shall be a Governor for each State. The executive power of the State is vested in the Governor.',
                'भारत के संविधान के अनुच्छेद 153 के अनुसार प्रत्येक राज्य के लिए एक राज्यपाल होगा। राज्य की कार्यपालिका शक्ति राज्यपाल में निहित होती है।'
              )}
            </Text>
          </View>
          <Section title={t('Reader Controls', 'रीडर नियंत्रण')}>
            <SliderRow label={t('PDF Text Zoom', 'PDF टेक्स्ट आकार')} value={lib.pdfTextSize} min={80} max={140} step={5} unit="%" path="library.pdfTextSize" />
            <SelectRow label={t('Page Display Mode', 'पेज डिस्प्ले मोड')} value={lib.pdfPageDisplay} path="library.pdfPageDisplay" options={['Continuous Scroll', 'Single Page', 'Fit Width']} />
            <SelectRow label={t('Reading Theme', 'रीडिंग थीम')} value={lib.pdfReadingTheme} path="library.pdfReadingTheme" options={['Light', 'Warm Sepia', 'Dark', 'High Contrast Paper']} />
            <ToggleRow label={t('Eye Comfort Blue-Light Filter', 'आँखों की सुरक्षा (ब्लू-लाइट फ़िल्टर)')} value={lib.pdfBlueLightComfort} path="library.pdfBlueLightComfort" last />
          </Section>
        </>
      );
    } else if (detailId === 'manage_groups') {
      title = t('Joined Study Groups', 'जुड़े हुए स्टडी ग्रुप');
      subtitle = t('Manage your memberships or leave inactive circles.', 'अपनी समूह सदस्यता प्रबंधित करें।');
      body = (
        <Section title={t('Active Memberships', 'सक्रिय सदस्यताएँ')}>
          {settings.community.joinedGroups.length > 0 ? (
            settings.community.joinedGroups.map((g, idx) => (
              <View
                key={g.id}
                style={[
                  styles.row,
                  { borderBottomWidth: idx === settings.community.joinedGroups.length - 1 ? 0 : StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
                ]}
              >
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={{ fontSize: fs(13.5), fontWeight: '600', color: colors.text }}>{g.name}</Text>
                  <Text style={{ fontSize: fs(11.5), color: colors.textMuted, marginTop: 2 }}>
                    {g.members} {t('members', 'सदस्य')} • {g.role}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    setModalConfig({
                      visible: true,
                      title: t('Leave Study Group?', 'स्टडी ग्रुप छोड़ें?'),
                      body: t('You will no longer receive group discussions or daily tests from this circle.', 'आप इस समूह की चर्चाओं से बाहर हो जाएँगे।'),
                      confirmText: t('Leave Group', 'समूह छोड़ें'),
                      cancelText: t('Cancel', 'रद्द करें'),
                      danger: true,
                      onConfirm: () =>
                        mutateSettings(
                          (d) => {
                            d.community.joinedGroups = d.community.joinedGroups.filter((item) => item.id !== g.id);
                          },
                          t('Left study group', 'समूह छोड़ दिया गया'),
                          'info'
                        ),
                    })
                  }
                  style={[styles.smallActionBtn, { backgroundColor: colors.dangerBg }]}
                >
                  <Text style={{ fontSize: fs(11.5), fontWeight: '700', color: colors.danger }}>{t('Leave', 'छोड़ें')}</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ fontSize: fs(12), color: colors.textMuted }}>{t('You have not joined any study groups yet.', 'आप अभी किसी समूह में नहीं हैं।')}</Text>
            </View>
          )}
        </Section>
      );
    } else if (detailId === 'blocked_users') {
      title = t('Blocked Users', 'ब्लॉक किए गए उपयोगकर्ता');
      subtitle = t('Blocked users cannot message you or invite you to groups.', 'ब्लॉक उपयोगकर्ता आपको संदेश नहीं भेज सकते।');
      body = (
        <Section title={t('Blocked Accounts', 'ब्लॉक खाते')}>
          {settings.community.blockedUsers.length > 0 ? (
            settings.community.blockedUsers.map((u, idx) => (
              <View
                key={u.id}
                style={[
                  styles.row,
                  { borderBottomWidth: idx === settings.community.blockedUsers.length - 1 ? 0 : StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: fs(13.5), fontWeight: '600', color: colors.text }}>{u.name}</Text>
                  <Text style={{ fontSize: fs(11.5), color: colors.textMuted, marginTop: 2 }}>
                    {t('Blocked on', 'ब्लॉक तिथि')}: {u.date}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    mutateSettings(
                      (d) => {
                        d.community.blockedUsers = d.community.blockedUsers.filter((item) => item.id !== u.id);
                      },
                      t('User unblocked', 'उपयोगकर्ता अनलॉक हो गया')
                    )
                  }
                  style={[styles.smallActionBtn, { backgroundColor: colors.surfaceAlt }]}
                >
                  <Text style={{ fontSize: fs(11.5), fontWeight: '600', color: colors.text }}>{t('Unblock', 'अनलॉक करें')}</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ fontSize: fs(12), color: colors.textMuted }}>{t('No blocked users.', 'कोई ब्लॉक उपयोगकर्ता नहीं।')}</Text>
            </View>
          )}
        </Section>
      );
    } else if (detailId === 'storage_manager') {
      const d = settings.data;
      const total = Math.max(1, d.storageUsedMB);
      title = t('Storage & Cache Management', 'स्टोरेज और कैश प्रबंधन');
      subtitle = t('Inspect offline books, notes and temporary cache footprint.', 'ऑफ़लाइन पुस्तकों और कैश का विवरण देखें।');
      body = (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, padding: 18, gap: 14 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View>
              <Text style={{ fontSize: fs(11.5), color: colors.textMuted }}>{t('Total Local Storage Used', 'कुल लोकल स्टोरेज उपयोग')}</Text>
              <Text style={{ fontSize: fs(24), fontWeight: '800', color: colors.text, marginTop: 2 }}>{d.storageUsedMB} MB</Text>
            </View>
            <Text style={{ fontSize: fs(11), color: colors.textMuted }}>{t('Device Cache + Offline Files', 'कैश + ऑफ़लाइन फ़ाइलें')}</Text>
          </View>

          <View style={[styles.storageBar, { backgroundColor: colors.surfaceAlt }]}>
            <View style={{ width: `${Math.round((d.downloadsSizeMB / total) * 100)}%`, backgroundColor: activeAccent[600], height: '100%' }} />
            <View style={{ width: `${Math.round((d.notesSizeMB / total) * 100)}%`, backgroundColor: '#10b981', height: '100%' }} />
            <View style={{ width: `${Math.round((d.cacheSizeMB / total) * 100)}%`, backgroundColor: '#fbbf24', height: '100%' }} />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[styles.legendDot, { backgroundColor: activeAccent[600] }]} />
              <Text style={{ fontSize: fs(11.5), color: colors.textSecondary }}>{t('PDFs', 'PDF')}: {d.downloadsSizeMB} MB</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
              <Text style={{ fontSize: fs(11.5), color: colors.textSecondary }}>{t('Notes', 'नोट्स')}: {d.notesSizeMB} MB</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[styles.legendDot, { backgroundColor: '#fbbf24' }]} />
              <Text style={{ fontSize: fs(11.5), color: colors.textSecondary }}>{t('Cache', 'कैश')}: {d.cacheSizeMB} MB</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => {
              showToast(t('Cache management is unavailable because no cache owner is exposed by the current services.', 'कैश प्रबंधन उपलब्ध नहीं है क्योंकि वर्तमान सेवाएँ कैश स्वामी उपलब्ध नहीं करातीं।'), 'info');
            }}
            style={[styles.primaryBtn, { backgroundColor: activeAccent[600] }]}
          >
            <Text style={{ color: '#ffffff', fontSize: fs(12.5), fontWeight: '700' }}>
              {t('Clear Temporary Cache (Unavailable)', 'अस्थायी कैश साफ़ करें (अनुपलब्ध)')} ({d.cacheSizeMB} MB)
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        contentOffset={{ x: 0, y: scrollOffsetsRef.current[`detail:${categoryId}:${detailId}`] ?? 0 }}
        onScroll={(event) => {
          scrollOffsetsRef.current[`detail:${categoryId}:${detailId}`] = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <TouchableOpacity onPress={goBack} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontSize: fs(10.5), color: colors.textMuted }} numberOfLines={1}>
              {t('Settings', 'सेटिंग्स')} › {catMeta ? t(catMeta.en, catMeta.hi) : ''} › {title}
            </Text>
            <Text style={{ fontSize: fs(17), fontWeight: '700', color: colors.text, fontFamily: fontFamilyStyle }}>{title}</Text>
          </View>
        </View>
        {subtitle ? <Text style={{ fontSize: fs(11.5), color: colors.textMuted, marginBottom: 16 }}>{subtitle}</Text> : null}
        {body}
      </ScrollView>
    );
  };

  /* --------------------------------------------------------------------------
     8. BILINGUAL SEARCH RESULTS VIEW
     -------------------------------------------------------------------------- */
  const renderSearchResults = () => {
    const q = searchQuery.trim().toLowerCase();
    const matches = SEARCH_INDEX.filter(
      (item) =>
        item.en.toLowerCase().includes(q) ||
        item.hi.toLowerCase().includes(q) ||
        item.tags.toLowerCase().includes(q)
    );

    if (!matches.length) {
      return (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, padding: 32, alignItems: 'center' }]}>
            <Text style={{ fontSize: 28, marginBottom: 8 }}>🔍</Text>
            <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.text }}>
              {t('No matching settings found', 'कोई मिलती-जुलती सेटिंग नहीं मिली')}
            </Text>
            <Text style={{ fontSize: fs(11.5), color: colors.textMuted, textAlign: 'center', marginTop: 6 }}>
              {t('Try searching for "Theme", "RAS", "PDF", "Focus", "AI", or "हिन्दी".', '"थीम", "RAS", "PDF", "फ़ोकस", या "भाषा" खोजने का प्रयास करें।')}
            </Text>
          </View>
        </ScrollView>
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={{ fontSize: fs(11), fontWeight: '700', color: colors.textMuted, marginBottom: 10, paddingHorizontal: 4 }}>
          {matches.length} {t('matching settings', 'परिणाम मिले')}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {matches.map((m, idx) => {
            const meta = MAIN_CATEGORIES.find((c) => c.id === m.cat) || SPECIAL_AREAS.find((s) => s.id === m.cat);
            return (
              <TouchableOpacity
                key={`${m.cat}-${idx}`}
                onPress={() => {
                  if (m.detail) openDetail(m.cat, m.detail);
                  else openCategory(m.cat);
                }}
                style={[
                  styles.row,
                  { borderBottomWidth: idx === matches.length - 1 ? 0 : StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }}>
                  {meta ? (
                    <View style={[styles.navIconBox, { backgroundColor: isDark ? meta.bgDark : meta.bgLight }]}>
                      <Text style={{ fontSize: 15 }}>{meta.icon}</Text>
                    </View>
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: fs(13.5), fontWeight: '600', color: colors.text }} numberOfLines={1}>
                      {t(m.en, m.hi)}
                    </Text>
                    <Text style={{ fontSize: fs(11.5), color: colors.textMuted, marginTop: 2 }}>
                      {meta ? t(meta.en, meta.hi) : m.cat}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 15, color: colors.textMuted }}>↗</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  /* --------------------------------------------------------------------------
     9. RESPONSIVE SHELL (STICKY HEADER + DESKTOP SIDEBAR + VIEWPORT + MODALS)
     -------------------------------------------------------------------------- */
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.headerBg} />

      {/* Sticky Top Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        {navLevel > 1 ? (
          <TouchableOpacity
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel={t('Back to previous Settings screen', 'पिछली सेटिंग्स स्क्रीन पर जाएँ')}
            hitSlop={8}
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: 2 }}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity onPress={goHome} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
          <View style={[styles.brandIcon, { backgroundColor: activeAccent[600] }]}>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>⚙</Text>
          </View>
          {isTablet ? (
            <View style={{ marginLeft: 10 }}>
              <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.text }}>{t('Settings', 'सेटिंग्स')}</Text>
              <Text style={{ fontSize: fs(10.5), color: colors.textMuted }}>
                {t('Your complete Study Sakha Control Center.', 'आपका संपूर्ण स्टडी सखा कंट्रोल सेंटर।')}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>

        {/* Bilingual Global Search Bar */}
        <View style={[styles.searchBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Text style={{ fontSize: 13, marginRight: 6 }}>🔍</Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('Search settings (English / हिन्दी)...', 'सेटिंग्स खोजें (हिन्दी / English)...')}
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text, fontSize: fs(12.5) }]}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Profile & Account Shortcut */}
        <TouchableOpacity onPress={() => openCategory('account')} style={styles.profileShortcut}>
          <View style={[styles.miniAvatar, { backgroundColor: activeAccent[600] }]}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{settings.account.avatarInitials}</Text>
          </View>
          {isTablet ? (
            <Text style={{ fontSize: fs(12), fontWeight: '600', color: colors.text, marginLeft: 8 }} numberOfLines={1}>
              {settings.account.name.split(' ')[0]}
            </Text>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* Main Responsive Workspace */}
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* Persistent Desktop/Tablet Landscape Left Rail */}
        {isDesktop ? (
          <ScrollView
            style={[styles.sidebar, { backgroundColor: colors.surface, borderRightColor: colors.border }]}
            contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
          >
            <TouchableOpacity
              onPress={goHome}
              style={[
                styles.railItem,
                navLevel === 1 && !searchQuery && { backgroundColor: isDark ? '#1e293b' : activeAccent[50] },
              ]}
            >
              <Text style={{ fontSize: 14, marginRight: 8 }}>🏠</Text>
              <Text
                style={{
                  fontSize: fs(12),
                  fontWeight: navLevel === 1 && !searchQuery ? '700' : '500',
                  color: navLevel === 1 && !searchQuery ? (isDark ? '#fff' : activeAccent[700]) : colors.textSecondary,
                }}
              >
                {t('Settings Home', 'सेटिंग्स होम')}
              </Text>
            </TouchableOpacity>

            <Text style={[styles.railHeading, { color: colors.textMuted }]}>{t('CATEGORIES', 'श्रेणियाँ')}</Text>
            {MAIN_CATEGORIES.map((c) => {
              const active = categoryId === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => openCategory(c.id)}
                  style={[styles.railItem, active && { backgroundColor: isDark ? '#1e293b' : activeAccent[50] }]}
                >
                  <Text style={{ fontSize: 14, marginRight: 8 }}>{c.icon}</Text>
                  <Text
                    style={{
                      fontSize: fs(12),
                      fontWeight: active ? '700' : '500',
                      color: active ? (isDark ? '#fff' : activeAccent[700]) : colors.textSecondary,
                      flex: 1,
                    }}
                    numberOfLines={1}
                  >
                    {t(c.en, c.hi)}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <Text style={[styles.railHeading, { color: colors.textMuted, marginTop: 14 }]}>{t('SPECIAL AREAS', 'विशेष क्षेत्र')}</Text>
            {SPECIAL_AREAS.map((s) => {
              const active = categoryId === s.id;
              return (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => openCategory(s.id)}
                  style={[styles.railItem, active && { backgroundColor: isDark ? '#1e293b' : activeAccent[50] }]}
                >
                  <Text style={{ fontSize: 14, marginRight: 8 }}>{s.icon}</Text>
                  <Text
                    style={{
                      fontSize: fs(12),
                      fontWeight: active ? '700' : '500',
                      color: active ? (isDark ? '#fff' : activeAccent[700]) : colors.textSecondary,
                      flex: 1,
                    }}
                    numberOfLines={1}
                  >
                    {t(s.en, s.hi)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}

        {/* Primary Content Area */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          {searchQuery.trim().length > 0
            ? renderSearchResults()
            : navLevel === 3
            ? renderDetailScreen()
            : navLevel === 2
            ? renderCategoryScreen()
            : renderHome()}
        </KeyboardAvoidingView>
      </View>

      {/* Toast Notification */}
      {toast ? (
        <View
          style={[
            styles.toast,
            {
              backgroundColor: toast.type === 'error' ? colors.danger : isDark ? '#f8fafc' : '#0f172a',
            },
          ]}
        >
          <Text
            style={{
              fontSize: fs(12.5),
              fontWeight: '600',
              color: toast.type === 'error' ? '#ffffff' : isDark ? '#0f172a' : '#ffffff',
            }}
          >
            {toast.type === 'success' ? '✓ ' : toast.type === 'error' ? '⚠ ' : 'ℹ '}
            {toast.msg}
          </Text>
        </View>
      ) : null}

      {/* Native Select / Dropdown Picker Modal */}
      <Modal visible={pickerModal.visible} transparent animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={() => setPickerModal((p) => ({ ...p, visible: false }))}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setPickerModal((p) => ({ ...p, visible: false }))}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ fontSize: fs(15), fontWeight: '700', color: colors.text, marginBottom: 12 }}>{pickerModal.title}</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {pickerModal.options.map((opt) => {
                const active = opt.value === pickerModal.selected;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => {
                      pickerModal.onSelect(opt.value);
                      setPickerModal((p) => ({ ...p, visible: false }));
                    }}
                    style={[
                      styles.pickerOption,
                      {
                        backgroundColor: active ? (isDark ? '#1e293b' : activeAccent[50]) : 'transparent',
                        borderBottomColor: colors.divider,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: fs(13.5), fontWeight: active ? '700' : '500', color: active ? (isDark ? '#fff' : activeAccent[700]) : colors.text }}>
                      {opt.label}
                    </Text>
                    {active ? <Text style={{ color: activeAccent[600], fontWeight: '800' }}>✓</Text> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Feedback / Bug Report Modal */}
      <Modal visible={feedbackModal.visible} transparent animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={() => setFeedbackModal((p) => ({ ...p, visible: false }))}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ fontSize: fs(15.5), fontWeight: '700', color: colors.text, marginBottom: 10 }}>
              {feedbackModal.kind === 'bug' ? t('Report a Bug', 'बग रिपोर्ट करें') : t('Submit Feedback', 'फ़ीडबैक भेजें')}
            </Text>
            <TextInput
              value={feedbackModal.text}
              onChangeText={(txt) => setFeedbackModal((p) => ({ ...p, text: txt }))}
              multiline
              numberOfLines={4}
              placeholder={
                feedbackModal.kind === 'bug'
                  ? t('Describe steps to reproduce the issue...', 'समस्या का विवरण लिखें...')
                  : t('Share your suggestion for Study Sakha...', 'अपना सुझाव लिखें...')
              }
              placeholderTextColor={colors.textMuted}
              style={[styles.formInput, { height: 96, textAlignVertical: 'top', color: colors.text, backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
            />
            <Text style={{ fontSize: fs(10.5), color: colors.textMuted, marginTop: 8, marginBottom: 14 }}>
              {t(`App Version: ${APP_VERSION} • Exam Profile:`, `संस्करण: ${APP_VERSION} • परीक्षा:`)} {settings.learning.targetExam}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
              <TouchableOpacity
                onPress={() => setFeedbackModal((p) => ({ ...p, visible: false }))}
                style={[styles.smallActionBtn, { backgroundColor: colors.surfaceAlt }]}
              >
                <Text style={{ fontSize: fs(12), fontWeight: '600', color: colors.text }}>{t('Cancel', 'रद्द करें')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setFeedbackModal((p) => ({ ...p, visible: false }));
                  showToast(t('Support submission is unavailable in this build; your text was not sent.', 'इस बिल्ड में सहायता सबमिशन उपलब्ध नहीं है; आपका संदेश नहीं भेजा गया।'), 'info');
                }}
                style={[styles.smallActionBtn, { backgroundColor: activeAccent[600] }]}
              >
                <Text style={{ fontSize: fs(12), fontWeight: '700', color: '#ffffff' }}>{t('Submit', 'भेजें')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Generic Confirmation / Premium / Legal Modal */}
      <Modal visible={modalConfig.visible} transparent animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={() => setModalConfig((p) => ({ ...p, visible: false }))}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ fontSize: fs(15.5), fontWeight: '700', color: colors.text, marginBottom: 10 }}>{modalConfig.title}</Text>
            <ScrollView style={{ maxHeight: 340 }}>
              <Text style={{ fontSize: fs(12.5), color: colors.textSecondary, lineHeight: fs(19) }}>{modalConfig.body}</Text>
              {modalConfig.bullets ? (
                <View style={{ marginTop: 12, gap: 6 }}>
                  {modalConfig.bullets.map((b, i) => (
                    <Text key={i} style={{ fontSize: fs(11.5), color: colors.textSecondary }}>
                      ✓ {b}
                    </Text>
                  ))}
                </View>
              ) : null}
              {modalConfig.note ? (
                <Text style={{ fontSize: fs(10.5), color: colors.textMuted, fontStyle: 'italic', marginTop: 12 }}>{modalConfig.note}</Text>
              ) : null}
            </ScrollView>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <TouchableOpacity
                onPress={() => setModalConfig((p) => ({ ...p, visible: false }))}
                style={[styles.smallActionBtn, { backgroundColor: colors.surfaceAlt }]}
              >
                <Text style={{ fontSize: fs(12.5), fontWeight: '600', color: colors.text }}>
                  {modalConfig.cancelText || t('Cancel', 'रद्द करें')}
                </Text>
              </TouchableOpacity>
              {modalConfig.confirmText ? (
                <TouchableOpacity
                  onPress={() => {
                    const cb = modalConfig.onConfirm;
                    setModalConfig((p) => ({ ...p, visible: false }));
                    if (cb) cb();
                  }}
                  style={[styles.smallActionBtn, { backgroundColor: modalConfig.danger ? colors.danger : activeAccent[600] }]}
                >
                  <Text style={{ fontSize: fs(12.5), fontWeight: '700', color: '#ffffff' }}>{modalConfig.confirmText}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* --------------------------------------------------------------------------
   10. STYLESHEET
   -------------------------------------------------------------------------- */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  brandIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flex: 1,
    maxWidth: 440,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 38,
    marginHorizontal: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
  },
  profileShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
  },
  miniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebar: {
    width: 256,
    borderRightWidth: 1,
  },
  railItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
    marginBottom: 2,
  },
  railHeading: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
    paddingHorizontal: 10,
    marginTop: 10,
    marginBottom: 6,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 56,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  avatarBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    marginLeft: 8,
  },
  smallActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexWrapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  metricTile: {
    borderRadius: 12,
    padding: 12,
  },
  quickCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
    justifyContent: 'space-between',
    gap: 10,
  },
  quickHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryCard: {
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  catIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  rowColumn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  badgePro: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeProText: {
    fontWeight: '700',
  },
  badgeSim: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeSimText: {
    fontWeight: '600',
  },
  selectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 11,
    borderWidth: 1,
    padding: 3,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderTrack: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 999,
  },
  navIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtn: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
  },
  inlineInput: {
    flex: 1,
    maxWidth: 130,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 12,
  },
  chipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  noticeBanner: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 18,
  },
  aiModeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  primaryBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTile: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  permPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  formInput: {
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
  },
  bgCard: {
    borderRadius: 12,
    padding: 8,
  },
  bgPreviewSwatch: {
    height: 58,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeCard: {
    height: 92,
    borderRadius: 14,
    padding: 11,
    justifyContent: 'space-between',
  },
  themeCatPill: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  themeStatusCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storageBar: {
    height: 12,
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  toast: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.62)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

export default SettingsScreen;
