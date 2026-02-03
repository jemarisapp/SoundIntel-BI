# Supabase Setup Guide for SoundIntel

## Step 1: Create Supabase Account & Project

### 1.1 Sign Up
1. Go to [supabase.com](https://supabase.com)
2. Click **"Start your project"**
3. Sign in with GitHub (recommended) or email

### 1.2 Create New Project
1. Click **"New Project"**
2. Fill in project details:
   - **Name**: `SoundIntel` (or your preferred name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to you (e.g., `US East` or `US West`)
   - **Pricing Plan**: Select **Free** tier
3. Click **"Create new project"**
4. Wait 2-3 minutes for provisioning

---

## Step 2: Run Database Schema

### 2.1 Open SQL Editor
1. In your Supabase dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**

### 2.2 Execute Schema Script
1. Open the file `supabase/schema.sql` from this project
2. Copy the ENTIRE contents
3. Paste into the SQL Editor
4. Click **"Run"** (or press `Cmd/Ctrl + Enter`)
5. You should see: ✅ **"Success. No rows returned"**

### 2.3 Verify Tables Created
1. Click **"Table Editor"** in the left sidebar
2. You should see 4 tables:
   - `artists`
   - `songs`
   - `song_artists`
   - `chart_entries`

---

## Step 3: Seed Initial Data

### 3.1 Run Seed Script
1. Go back to **SQL Editor**
2. Click **"New query"**
3. Open `supabase/seed.sql`
4. Copy and paste the entire contents
5. Click **"Run"**
6. You should see a table showing:
   ```
   Artists: 14
   Songs: 100
   Song-Artist Links: 104
   Chart Entries: 100
   ```

### 3.2 Verify Data
1. Go to **Table Editor**
2. Click on `chart_entries` table
3. You should see 100 rows with chart data
4. Click on `songs` table
5. You should see your 10 real songs + 90 dummy songs

---

## Step 4: Get API Credentials

### 4.1 Find Your Project URL
1. Click **"Project Settings"** (gear icon in sidebar)
2. Click **"API"** tab
3. Copy the **"Project URL"**
   - Format: `https://xxxxxxxxxxxxx.supabase.co`

### 4.2 Get Anonymous Key
1. In the same **API** tab
2. Under **"Project API keys"**
3. Copy the **"anon public"** key
   - This is safe to use in your frontend

### 4.3 Get Service Role Key (Optional)
1. Still in **API** tab
2. Copy the **"service_role"** key
   - ⚠️ **NEVER** expose this in frontend code
   - Only use for admin scripts (like data upload)

---

## Step 5: Configure Your App

### 5.1 Update Environment Variables

Open your `.env.local` file and add:

```bash
# Existing Gemini API Key
GEMINI_API_KEY=your_existing_key_here

# Supabase Configuration
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_public_key_here

# Service key (only for upload scripts - DO NOT commit to git)
SUPABASE_SERVICE_KEY=your_service_role_key_here
```

### 5.2 Update .gitignore

Make sure your `.env.local` is ignored:

```bash
# Environment variables
.env.local
.env
```

---

## Step 6: Install Supabase Client

### 6.1 Install Package

```bash
npm install @supabase/supabase-js
```

### 6.2 Verify Installation

Check your `package.json`:

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.x.x",
    // ... other dependencies
  }
}
```

---

## Step 7: Test Connection

### 7.1 Create Test File

Create `test-supabase.ts` in your project root:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  
  // Test 1: Fetch artists
  const { data: artists, error: artistError } = await supabase
    .from('artists')
    .select('*')
    .limit(5);
  
  if (artistError) {
    console.error('❌ Error fetching artists:', artistError);
  } else {
    console.log('✅ Artists:', artists);
  }
  
  // Test 2: Fetch chart data
  const { data: chartData, error: chartError } = await supabase
    .from('chart_entries')
    .select(`
      *,
      songs (
        title,
        song_artists (
          display_order,
          artists (name)
        )
      )
    `)
    .eq('chart_week', '2024-08-16')
    .order('rank', { ascending: true })
    .limit(10);
  
  if (chartError) {
    console.error('❌ Error fetching chart:', chartError);
  } else {
    console.log('✅ Chart data:', chartData);
  }
}

testConnection();
```

### 7.2 Run Test

```bash
npx tsx test-supabase.ts
```

You should see:
```
✅ Artists: [ { id: '...', name: 'Shaboozey', ... }, ... ]
✅ Chart data: [ { rank: 1, ... }, ... ]
```

---

## Step 8: Verify in Dashboard

### 8.1 Check Table Data
1. Go to **Table Editor**
2. Click `chart_entries`
3. Filter by `chart_week = 2024-08-16`
4. You should see 100 entries ranked 1-100

### 8.2 Test SQL Function
1. Go to **SQL Editor**
2. Run this query:
   ```sql
   SELECT * FROM get_chart_data('2024-08-16') LIMIT 10;
   ```
3. You should see top 10 songs with full artist names

---

## Troubleshooting

### Issue: "relation does not exist"
**Solution**: You didn't run the schema.sql file. Go back to Step 2.

### Issue: "No rows returned" after seed
**Solution**: Check for errors in the seed.sql execution. Look for red error messages.

### Issue: "Invalid API key"
**Solution**: 
1. Double-check you copied the correct key from Supabase dashboard
2. Make sure there are no extra spaces in `.env.local`
3. Restart your dev server: `npm run dev`

### Issue: "CORS error"
**Solution**: Supabase allows all origins by default. If you see CORS errors:
1. Go to **Project Settings** → **API**
2. Scroll to **"CORS"**
3. Add `http://localhost:3000` to allowed origins

### Issue: "Row Level Security" blocking queries
**Solution**: The schema includes public read policies. If you still have issues:
1. Go to **Authentication** → **Policies**
2. Verify policies exist for all tables
3. Or temporarily disable RLS:
   ```sql
   ALTER TABLE chart_entries DISABLE ROW LEVEL SECURITY;
   ```

---

## Next Steps

Once your database is set up and tested:

1. ✅ **Integrate with React app** - Replace mock data imports
2. ✅ **Create data hooks** - Build `useChartData()` hook
3. ✅ **Test UI** - Verify dashboard loads from database
4. ✅ **Add weekly data** - Use upload script for new charts

See `implementation_plan.md` for detailed integration steps!

---

## Quick Reference

### Supabase Dashboard URLs
- **Project Dashboard**: `https://supabase.com/dashboard/project/[project-id]`
- **Table Editor**: `https://supabase.com/dashboard/project/[project-id]/editor`
- **SQL Editor**: `https://supabase.com/dashboard/project/[project-id]/sql`
- **API Docs**: `https://supabase.com/dashboard/project/[project-id]/api`

### Useful SQL Queries

```sql
-- Count all data
SELECT 
  (SELECT COUNT(*) FROM artists) as artists,
  (SELECT COUNT(*) FROM songs) as songs,
  (SELECT COUNT(*) FROM chart_entries) as chart_entries;

-- Get top 10 songs for a week
SELECT * FROM get_chart_data('2024-08-16') LIMIT 10;

-- Find a specific song
SELECT s.*, sd.full_artist_name 
FROM songs s
JOIN song_details sd ON s.id = sd.id
WHERE s.title ILIKE '%bar song%';

-- Get all weeks in database
SELECT DISTINCT chart_week 
FROM chart_entries 
ORDER BY chart_week DESC;
```

---

## Support

- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Discord**: [discord.supabase.com](https://discord.supabase.com)
- **GitHub Issues**: [github.com/supabase/supabase](https://github.com/supabase/supabase)
