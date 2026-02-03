-- SoundIntel Database Schema
-- Run this in Supabase SQL Editor after creating your project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Artists Table
CREATE TABLE artists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Songs Table
CREATE TABLE songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  release_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Song-Artist Junction Table (many-to-many)
CREATE TABLE song_artists (
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  PRIMARY KEY (song_id, artist_id)
);

-- Chart Entries (time-series data)
CREATE TABLE chart_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  chart_week DATE NOT NULL,
  rank INTEGER NOT NULL CHECK (rank > 0 AND rank <= 100),
  points INTEGER NOT NULL CHECK (points >= 0),
  streaming_vol BIGINT DEFAULT 0,
  streaming_pct SMALLINT CHECK (streaming_pct BETWEEN 0 AND 100),
  airplay_vol BIGINT DEFAULT 0,
  airplay_pct SMALLINT CHECK (airplay_pct BETWEEN 0 AND 100),
  sales_vol INTEGER DEFAULT 0,
  sales_pct SMALLINT CHECK (sales_pct BETWEEN 0 AND 100),
  prev_rank INTEGER,
  weeks_on_chart INTEGER DEFAULT 1,
  peak_position INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(song_id, chart_week)
);

-- ============================================
-- INDEXES
-- ============================================

-- Performance indexes
CREATE INDEX idx_chart_entries_week ON chart_entries(chart_week DESC);
CREATE INDEX idx_chart_entries_rank ON chart_entries(rank);
CREATE INDEX idx_chart_entries_song ON chart_entries(song_id);
CREATE INDEX idx_songs_title ON songs USING gin(to_tsvector('english', title));
CREATE INDEX idx_artists_name ON artists USING gin(to_tsvector('english', name));

-- ============================================
-- VIEWS
-- ============================================

-- View for full song details with artists
CREATE VIEW song_details AS
SELECT 
  s.id,
  s.title,
  s.release_date,
  ARRAY_AGG(a.name ORDER BY sa.display_order) as artist_names,
  STRING_AGG(a.name, ', ' ORDER BY sa.display_order) as full_artist_name
FROM songs s
LEFT JOIN song_artists sa ON s.id = sa.song_id
LEFT JOIN artists a ON sa.artist_id = a.id
GROUP BY s.id, s.title, s.release_date;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get chart data with song info for a specific week
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
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_entries ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can view data)
CREATE POLICY "Public read access" ON artists FOR SELECT USING (true);
CREATE POLICY "Public read access" ON songs FOR SELECT USING (true);
CREATE POLICY "Public read access" ON song_artists FOR SELECT USING (true);
CREATE POLICY "Public read access" ON chart_entries FOR SELECT USING (true);

-- Only authenticated users can insert/update/delete
-- (You can modify this based on your needs)
CREATE POLICY "Authenticated users can insert" ON artists FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert" ON songs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert" ON song_artists FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert" ON chart_entries FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_artists_updated_at BEFORE UPDATE ON artists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_songs_updated_at BEFORE UPDATE ON songs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE artists IS 'Master list of unique artists';
COMMENT ON TABLE songs IS 'Master list of unique songs';
COMMENT ON TABLE song_artists IS 'Junction table linking songs to artists (many-to-many)';
COMMENT ON TABLE chart_entries IS 'Weekly Billboard Hot 100 chart positions';

COMMENT ON COLUMN song_artists.display_order IS 'Order in which artists appear (1 = primary, 2+ = features)';
COMMENT ON COLUMN chart_entries.chart_week IS 'Date of the chart week (Monday)';
COMMENT ON COLUMN chart_entries.weeks_on_chart IS 'Total weeks on chart (not necessarily consecutive)';
