export type Lang = 'en' | 'hi';

const strings = {
  settings: { en: 'Settings', hi: 'सेटिंग्स' },
  appearance: { en: 'Appearance', hi: 'रूप' },
  theme: { en: 'Theme', hi: 'थीम' },
  light: { en: 'Light', hi: 'लाइट' },
  dark: { en: 'Dark', hi: 'डार्क' },
  system: { en: 'System', hi: 'सिस्टम' },
  textSize: { en: 'Text size', hi: 'पाठ का आकार' },
  language: { en: 'Language', hi: 'भाषा' },
  study: { en: 'Study preferences', hi: 'अध्ययन सेटिंग' },
  dailyGoal: { en: 'Daily study goal', hi: 'दैनिक लक्ष्य' },
  targetExam: { en: 'Target exam', hi: 'लक्ष्य परीक्षा' },
  notifications: { en: 'Notifications', hi: 'सूचनाएँ' },
  pushNotifications: { en: 'Push notifications', hi: 'पुश सूचनाएँ' },
  pushBody: { en: 'Live test reminders, streak alerts and library updates.', hi: 'लाइव टेस्ट रिमाइंडर, स्ट्रीक अलर्ट और लाइब्रेरी अपडेट।' },
  account: { en: 'Account', hi: 'खाता' },
  signOut: { en: 'Sign out', hi: 'साइन आउट' },
  resetData: { en: 'Reset local data', hi: 'स्थानीय डेटा रीसेट करें' },
  resetBody: { en: 'Clears notes, progress, streak and chat stored on this device.', hi: 'इस डिवाइस पर सहेजे गए नोट्स, प्रगति, स्ट्रीक और चैट हटाता है।' },
  about: { en: 'About', hi: 'परिचय' },
  preview: { en: 'Preview', hi: 'पूर्वावलोकन' },
  previewBody: {
    en: 'Study Sakha keeps every note, result and streak on your device. Nothing leaves this app.',
    hi: 'स्टडी सखा आपके सभी नोट्स, परिणाम और स्ट्रीक इसी डिवाइस पर रखता है। कुछ भी बाहर नहीं जाता।',
  },
};

export type StringKey = keyof typeof strings;

export const t = (key: StringKey, lang: Lang) => strings[key][lang];
