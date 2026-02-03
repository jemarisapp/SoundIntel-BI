-- SoundIntel: Add Percentage Columns Migration
-- Run this in Supabase SQL Editor BEFORE importing the updated CSV

-- ============================================
-- STEP 1: Add missing percentage columns
-- ============================================

-- Add streaming_pct column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'chart_entries' AND column_name = 'streaming_pct') THEN
        ALTER TABLE chart_entries ADD COLUMN streaming_pct SMALLINT CHECK (streaming_pct BETWEEN 0 AND 100);
    END IF;
END $$;

-- Add airplay_pct column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'chart_entries' AND column_name = 'airplay_pct') THEN
        ALTER TABLE chart_entries ADD COLUMN airplay_pct SMALLINT CHECK (airplay_pct BETWEEN 0 AND 100);
    END IF;
END $$;

-- Add sales_pct column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'chart_entries' AND column_name = 'sales_pct') THEN
        ALTER TABLE chart_entries ADD COLUMN sales_pct SMALLINT CHECK (sales_pct BETWEEN 0 AND 100);
    END IF;
END $$;

-- ============================================
-- STEP 2: Refresh Supabase schema cache
-- ============================================
-- After adding columns, you may need to refresh the PostgREST schema cache.
-- This can be done by:
-- 1. Going to Supabase Dashboard > Settings > API > "Reload Schema" button
-- OR run this (requires superuser):
-- NOTIFY pgrst, 'reload schema';

-- ============================================
-- STEP 3: Update the get_chart_data function to include new columns
-- ============================================

-- Drop the existing function first (required when changing return type)
DROP FUNCTION IF EXISTS get_chart_data(DATE);

CREATE OR REPLACE FUNCTION get_chart_data(week_date DATE)
RETURNS TABLE (
  entry_id UUID,
  song_id UUID,
  title TEXT,
  full_artist_name TEXT,
  rank INTEGER,
  points INTEGER,
  streaming_vol BIGINT,
  streaming_pct SMALLINT,
  airplay_vol BIGINT,
  airplay_pct SMALLINT,
  sales_vol INTEGER,
  sales_pct SMALLINT,
  prev_rank INTEGER,
  weeks_on_chart INTEGER,
  peak_position INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.id,
    ce.song_id,
    sd.title,
    sd.full_artist_name,
    ce.rank,
    ce.points,
    ce.streaming_vol,
    ce.streaming_pct,
    ce.airplay_vol,
    ce.airplay_pct,
    ce.sales_vol,
    ce.sales_pct,
    ce.prev_rank,
    ce.weeks_on_chart,
    ce.peak_position
  FROM chart_entries ce
  JOIN song_details sd ON ce.song_id = sd.id
  WHERE ce.chart_week = week_date
  ORDER BY ce.rank;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFY: Check columns exist
-- ============================================
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'chart_entries' 
AND column_name IN ('streaming_pct', 'airplay_pct', 'sales_pct');
