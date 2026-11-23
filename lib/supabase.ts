
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrlValue = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKeyValue = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabaseUrl = supabaseUrlValue?.trim();
const supabasePublishableKey = supabasePublishableKeyValue?.trim();

export const supabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = createClient(
  supabaseUrl || 'https://not-configured.invalid',
  supabasePublishableKey || 'not-configured',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

supabase.auth.onAuthStateChange((_event, session) => {
  void supabase.realtime.setAuth(session?.access_token ?? null);
});

export const STUDENT_CONTENT_BUCKET = 'Student-content';

export async function createStudentContentSignedUrl(objectPath: string) {
  const { data, error } = await supabase.storage
    .from(STUDENT_CONTENT_BUCKET)
    .createSignedUrl(objectPath, 300);
  if (error) throw error;
  return data.signedUrl;
}
