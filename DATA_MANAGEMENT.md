# Data Management Guide

## Running Seed Data (Now)

### Option 1: Via Supabase Dashboard (Easiest)
1. Go to your Supabase project
2. Click **SQL Editor** in sidebar
3. Click **New query**
4. Copy entire contents of `supabase/seed.sql`
5. Paste and click **Run**
6. Verify you see success message with counts

### Option 2: Via Command Line
```bash
# Run the test to verify data loaded
npx tsx test-supabase.ts
```

---

## Deleting Seed Data Later (When Ready for Real Data)

### Quick Delete - Truncate All Tables

Run this SQL in Supabase SQL Editor:

```sql
-- Delete all data but keep table structure
TRUNCATE TABLE chart_entries CASCADE;
TRUNCATE TABLE song_artists CASCADE;
TRUNCATE TABLE songs CASCADE;
TRUNCATE TABLE artists CASCADE;

-- Reset any sequences (optional)
-- This ensures IDs start fresh
SELECT setval(pg_get_serial_sequence('artists', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('songs', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('chart_entries', 'id'), 1, false);

-- Verify everything is empty
SELECT 
  (SELECT COUNT(*) FROM artists) as artists,
  (SELECT COUNT(*) FROM songs) as songs,
  (SELECT COUNT(*) FROM chart_entries) as chart_entries;
```

**Result**: All data deleted, tables ready for fresh data ✅

---

## Selective Delete - Keep Some Data

If you want to keep certain songs/artists and only delete chart entries:

```sql
-- Delete only chart entries (keep songs and artists)
DELETE FROM chart_entries;

-- Or delete specific week's data
DELETE FROM chart_entries WHERE chart_week = '2024-08-16';

-- Or delete dummy songs (keep the 10 real ones)
DELETE FROM chart_entries WHERE song_id IN (
  SELECT id FROM songs WHERE title LIKE 'Song %'
);
DELETE FROM song_artists WHERE song_id IN (
  SELECT id FROM songs WHERE title LIKE 'Song %'
);
DELETE FROM songs WHERE title LIKE 'Song %';
```

---

## Adding Real Data After Deletion

Once you've cleared the seed data, you have 3 options:

### Option 1: Manual CSV Upload
1. Prepare your real Billboard data as CSV
2. Use the upload script from `weekly_data_ingestion.md`
3. Run: `npm run upload data/real-chart.csv 2024-08-16`

### Option 2: SQL Insert
1. Create a new SQL file with your real data
2. Follow the same pattern as `seed.sql`
3. Run in SQL Editor

### Option 3: API/Script
1. Use the automated scraper (if you build one)
2. Fetch real Billboard data
3. Insert via Supabase client

---

## Best Practice Workflow

**For Development (Now)**:
```
1. Run seed.sql → Test with mock data
2. Build and test UI integration
3. Verify all features work
```

**For Production (Later)**:
```
1. TRUNCATE all tables
2. Upload first week of real data
3. Test thoroughly
4. Set up weekly automation
```

---

## Safety Tips

✅ **DO**:
- Run seed data in development
- Test thoroughly with mock data
- Keep backups before deleting
- Use transactions for bulk operations

❌ **DON'T**:
- Delete data in production without backup
- Mix mock and real data (confusing)
- Forget to update chart_week dates

---

## Quick Commands Reference

```sql
-- Check current data counts
SELECT 
  (SELECT COUNT(*) FROM artists) as artists,
  (SELECT COUNT(*) FROM songs) as songs,
  (SELECT COUNT(*) FROM chart_entries) as entries;

-- List all chart weeks
SELECT DISTINCT chart_week FROM chart_entries ORDER BY chart_week DESC;

-- Delete everything
TRUNCATE TABLE chart_entries, song_artists, songs, artists CASCADE;

-- Delete specific week
DELETE FROM chart_entries WHERE chart_week = '2024-08-16';
```

---

## Summary

**Right now**: Run `seed.sql` to populate your database with test data

**Later**: Run `TRUNCATE` commands to wipe everything clean

**Then**: Upload your real Billboard data using the upload script

The seed data is completely safe to use for development - it won't interfere with your ability to add real data later! 🚀
