import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ymhkdcizaurcnybkyxdm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltaGtkY2l6YXVyY255Ymt5eGRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNjE2MzQsImV4cCI6MjA4MTYzNzYzNH0.Hg_Do0d0rqbCmiBBrgmI9n70-kFdS0y1hR_3vRi6PRI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
