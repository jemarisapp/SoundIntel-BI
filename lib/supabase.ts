import { createClient } from '@supabase/supabase-js';

// Support both Vite (import.meta.env) and Node.js (process.env)
const supabaseUrl = typeof import.meta !== 'undefined' && import.meta.env
  ? import.meta.env.VITE_SUPABASE_URL
  : process.env.VITE_SUPABASE_URL;

const supabaseAnonKey = typeof import.meta !== 'undefined' && import.meta.env
  ? import.meta.env.VITE_SUPABASE_ANON_KEY
  : process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // We're not using auth yet
  },
});

// Helper function to format chart week dates
export function formatChartWeek(weekString: string): string {
  // Convert "Week of August 16th" to "2024-08-16"
  const match = weekString.match(/Week of (\w+) (\d+)/);
  if (!match) return new Date().toISOString().split('T')[0];

  const [, month, day] = match;
  const monthMap: Record<string, string> = {
    'January': '01', 'February': '02', 'March': '03', 'April': '04',
    'May': '05', 'June': '06', 'July': '07', 'August': '08',
    'September': '09', 'October': '10', 'November': '11', 'December': '12'
  };

  return `2024-${monthMap[month]}-${day.padStart(2, '0')}`;
}

// Helper function to convert date back to week string
export function formatWeekString(date: string): string {
  const d = new Date(date);
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const day = d.getDate();
  const suffix = day === 1 || day === 21 || day === 31 ? 'st' :
    day === 2 || day === 22 ? 'nd' :
      day === 3 || day === 23 ? 'rd' : 'th';

  return `Week of ${months[d.getMonth()]} ${day}${suffix}`;
}
