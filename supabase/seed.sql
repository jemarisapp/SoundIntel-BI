-- Seed data for SoundIntel
-- This imports your existing mock data into the database

-- ============================================
-- INSERT ARTISTS
-- ============================================

INSERT INTO artists (name) VALUES
  ('Andrew Choi'),
  ('Danny Chung'),
  ('Saja Boys'),
  ('Samuil Lee'),
  ('Luminate'),
  ('Chappell Roan'),
  ('Shaboozey'),
  ('Post Malone'),
  ('Morgan Wallen'),
  ('Harry Styles'),
  ('Lauv'),
  ('The Lumineers'),
  ('Muna'),
  ('Katy Perry'),
  ('Skepta')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- INSERT SONGS
-- ============================================

-- Get artist IDs for linking
DO $$
DECLARE
  v_andrew_id UUID;
  v_danny_id UUID;
  v_saja_id UUID;
  v_samuil_id UUID;
  v_chappell_id UUID;
  v_shaboozey_id UUID;
  v_post_id UUID;
  v_morgan_id UUID;
  v_harry_id UUID;
  v_lauv_id UUID;
  v_lumineers_id UUID;
  v_muna_id UUID;
  v_katy_id UUID;
  v_skepta_id UUID;
  
  v_song_id UUID;
BEGIN
  -- Get artist IDs
  SELECT id INTO v_andrew_id FROM artists WHERE name = 'Andrew Choi';
  SELECT id INTO v_danny_id FROM artists WHERE name = 'Danny Chung';
  SELECT id INTO v_saja_id FROM artists WHERE name = 'Saja Boys';
  SELECT id INTO v_samuil_id FROM artists WHERE name = 'Samuil Lee';
  SELECT id INTO v_chappell_id FROM artists WHERE name = 'Chappell Roan';
  SELECT id INTO v_shaboozey_id FROM artists WHERE name = 'Shaboozey';
  SELECT id INTO v_post_id FROM artists WHERE name = 'Post Malone';
  SELECT id INTO v_morgan_id FROM artists WHERE name = 'Morgan Wallen';
  SELECT id INTO v_harry_id FROM artists WHERE name = 'Harry Styles';
  SELECT id INTO v_lauv_id FROM artists WHERE name = 'Lauv';
  SELECT id INTO v_lumineers_id FROM artists WHERE name = 'The Lumineers';
  SELECT id INTO v_muna_id FROM artists WHERE name = 'Muna';
  SELECT id INTO v_katy_id FROM artists WHERE name = 'Katy Perry';
  SELECT id INTO v_skepta_id FROM artists WHERE name = 'Skepta';
  
  -- Song 1: Soda Pop (4 artists)
  INSERT INTO songs (title, release_date) 
  VALUES ('Soda Pop', '2024-05-15') 
  RETURNING id INTO v_song_id;
  
  INSERT INTO song_artists (song_id, artist_id, display_order) VALUES
    (v_song_id, v_andrew_id, 1),
    (v_song_id, v_danny_id, 2),
    (v_song_id, v_saja_id, 3),
    (v_song_id, v_samuil_id, 4);
  
  -- Song 2: A Bar Song (Tipsy)
  INSERT INTO songs (title, release_date) 
  VALUES ('A Bar Song (Tipsy)', '2024-04-12') 
  RETURNING id INTO v_song_id;
  
  INSERT INTO song_artists (song_id, artist_id, display_order) VALUES
    (v_song_id, v_shaboozey_id, 1);
  
  -- Song 3: I Had Some Help
  INSERT INTO songs (title, release_date) 
  VALUES ('I Had Some Help', '2024-05-10') 
  RETURNING id INTO v_song_id;
  
  INSERT INTO song_artists (song_id, artist_id, display_order) VALUES
    (v_song_id, v_post_id, 1),
    (v_song_id, v_morgan_id, 2);
  
  -- Song 4: Pink Pony Club
  INSERT INTO songs (title, release_date) 
  VALUES ('Pink Pony Club', '2020-04-03') 
  RETURNING id INTO v_song_id;
  
  INSERT INTO song_artists (song_id, artist_id, display_order) VALUES
    (v_song_id, v_chappell_id, 1);
  
  -- Song 5: Golden
  INSERT INTO songs (title, release_date) 
  VALUES ('Golden', '2019-12-13') 
  RETURNING id INTO v_song_id;
  
  INSERT INTO song_artists (song_id, artist_id, display_order) VALUES
    (v_song_id, v_harry_id, 1);
  
  -- Song 6: Ordinary
  INSERT INTO songs (title, release_date) 
  VALUES ('Ordinary', '2023-01-20') 
  RETURNING id INTO v_song_id;
  
  INSERT INTO song_artists (song_id, artist_id, display_order) VALUES
    (v_song_id, v_lauv_id, 1);
  
  -- Song 7: The Subway
  INSERT INTO songs (title, release_date) 
  VALUES ('The Subway', '2023-11-05') 
  RETURNING id INTO v_song_id;
  
  INSERT INTO song_artists (song_id, artist_id, display_order) VALUES
    (v_song_id, v_lumineers_id, 1);
  
  -- Song 8: What I Want
  INSERT INTO songs (title, release_date) 
  VALUES ('What I Want', '2022-06-24') 
  RETURNING id INTO v_song_id;
  
  INSERT INTO song_artists (song_id, artist_id, display_order) VALUES
    (v_song_id, v_muna_id, 1);
  
  -- Song 9: Daisies
  INSERT INTO songs (title, release_date) 
  VALUES ('Daisies', '2020-05-15') 
  RETURNING id INTO v_song_id;
  
  INSERT INTO song_artists (song_id, artist_id, display_order) VALUES
    (v_song_id, v_katy_id, 1);
  
  -- Song 10: Love Me Not
  INSERT INTO songs (title, release_date) 
  VALUES ('Love Me Not', '2024-01-01') 
  RETURNING id INTO v_song_id;
  
  INSERT INTO song_artists (song_id, artist_id, display_order) VALUES
    (v_song_id, v_skepta_id, 1);
END $$;

-- ============================================
-- INSERT CHART ENTRIES (Week of August 16th)
-- ============================================

DO $$
DECLARE
  v_chart_week DATE := '2024-08-16';
  v_song_id UUID;
BEGIN
  -- Entry 1: Soda Pop
  SELECT id INTO v_song_id FROM songs WHERE title = 'Soda Pop';
  INSERT INTO chart_entries (song_id, chart_week, rank, points, streaming_vol, streaming_pct, airplay_vol, airplay_pct, sales_vol, sales_pct, prev_rank, weeks_on_chart, peak_position)
  VALUES (v_song_id, v_chart_week, 14, 127, 16900000, NULL, 500000, NULL, 2500, NULL, 16, 6, 14);
  
  -- Entry 2: A Bar Song (Tipsy)
  SELECT id INTO v_song_id FROM songs WHERE title = 'A Bar Song (Tipsy)';
  INSERT INTO chart_entries (song_id, chart_week, rank, points, streaming_vol, streaming_pct, airplay_vol, airplay_pct, sales_vol, sales_pct, prev_rank, weeks_on_chart, peak_position)
  VALUES (v_song_id, v_chart_week, 1, 340, 35000000, NULL, 82000000, NULL, 12000, NULL, 1, 18, 1);
  
  -- Entry 3: I Had Some Help
  SELECT id INTO v_song_id FROM songs WHERE title = 'I Had Some Help';
  INSERT INTO chart_entries (song_id, chart_week, rank, points, streaming_vol, streaming_pct, airplay_vol, airplay_pct, sales_vol, sales_pct, prev_rank, weeks_on_chart, peak_position)
  VALUES (v_song_id, v_chart_week, 2, 310, 28000000, NULL, 75000000, NULL, 8000, NULL, 2, 14, 1);
  
  -- Entry 4: Pink Pony Club
  SELECT id INTO v_song_id FROM songs WHERE title = 'Pink Pony Club';
  INSERT INTO chart_entries (song_id, chart_week, rank, points, streaming_vol, streaming_pct, airplay_vol, airplay_pct, sales_vol, sales_pct, prev_rank, weeks_on_chart, peak_position)
  VALUES (v_song_id, v_chart_week, 3, 285, 31000000, NULL, 12000000, NULL, 5000, NULL, 5, 22, 3);
  
  -- Entry 5: Golden
  SELECT id INTO v_song_id FROM songs WHERE title = 'Golden';
  INSERT INTO chart_entries (song_id, chart_week, rank, points, streaming_vol, streaming_pct, airplay_vol, airplay_pct, sales_vol, sales_pct, prev_rank, weeks_on_chart, peak_position)
  VALUES (v_song_id, v_chart_week, 4, 260, 25000000, NULL, 45000000, NULL, 4200, NULL, 3, 40, 1);
  
  -- Entry 6: Ordinary
  SELECT id INTO v_song_id FROM songs WHERE title = 'Ordinary';
  INSERT INTO chart_entries (song_id, chart_week, rank, points, streaming_vol, streaming_pct, airplay_vol, airplay_pct, sales_vol, sales_pct, prev_rank, weeks_on_chart, peak_position)
  VALUES (v_song_id, v_chart_week, 5, 245, 22000000, NULL, 38000000, NULL, 3100, NULL, 4, 12, 4);
  
  -- Entry 7: The Subway
  SELECT id INTO v_song_id FROM songs WHERE title = 'The Subway';
  INSERT INTO chart_entries (song_id, chart_week, rank, points, streaming_vol, streaming_pct, airplay_vol, airplay_pct, sales_vol, sales_pct, prev_rank, weeks_on_chart, peak_position)
  VALUES (v_song_id, v_chart_week, 6, 230, 24000000, NULL, 32000000, NULL, 2800, NULL, 7, 8, 6);
  
  -- Entry 8: What I Want
  SELECT id INTO v_song_id FROM songs WHERE title = 'What I Want';
  INSERT INTO chart_entries (song_id, chart_week, rank, points, streaming_vol, streaming_pct, airplay_vol, airplay_pct, sales_vol, sales_pct, prev_rank, weeks_on_chart, peak_position)
  VALUES (v_song_id, v_chart_week, 7, 215, 20000000, NULL, 28000000, NULL, 2600, NULL, 6, 5, 6);
  
  -- Entry 9: Daisies
  SELECT id INTO v_song_id FROM songs WHERE title = 'Daisies';
  INSERT INTO chart_entries (song_id, chart_week, rank, points, streaming_vol, streaming_pct, airplay_vol, airplay_pct, sales_vol, sales_pct, prev_rank, weeks_on_chart, peak_position)
  VALUES (v_song_id, v_chart_week, 8, 200, 19000000, NULL, 24000000, NULL, 2200, NULL, 9, 3, 8);
  
  -- Entry 10: Love Me Not
  SELECT id INTO v_song_id FROM songs WHERE title = 'Love Me Not';
  INSERT INTO chart_entries (song_id, chart_week, rank, points, streaming_vol, streaming_pct, airplay_vol, airplay_pct, sales_vol, sales_pct, prev_rank, weeks_on_chart, peak_position)
  VALUES (v_song_id, v_chart_week, 9, 190, 18000000, NULL, 21000000, NULL, 1900, NULL, 8, 10, 5);
  
  -- Add dummy entries for positions 10-100
  FOR i IN 10..100 LOOP
    -- Create a dummy song for each position
    INSERT INTO songs (title, release_date) 
    VALUES ('Song ' || i, '2024-01-01') 
    RETURNING id INTO v_song_id;
    
    -- Link to a random existing artist (just for completeness)
    INSERT INTO song_artists (song_id, artist_id, display_order)
    SELECT v_song_id, id, 1 FROM artists ORDER BY RANDOM() LIMIT 1;
    
    -- Insert chart entry
    INSERT INTO chart_entries (song_id, chart_week, rank, points, streaming_vol, streaming_pct, airplay_vol, airplay_pct, sales_vol, sales_pct, prev_rank, weeks_on_chart, peak_position)
    VALUES (
      v_song_id, 
      v_chart_week, 
      i, 
      150 - i,
      FLOOR(RANDOM() * 15000000 + 1000000)::BIGINT,
      NULL,
      FLOOR(RANDOM() * 20000000 + 100000)::BIGINT,
      NULL,
      FLOOR(RANDOM() * 1000 + 100)::INTEGER,
      NULL,
      i + CASE WHEN RANDOM() > 0.5 THEN 2 ELSE -2 END,
      FLOOR(RANDOM() * 52 + 1)::INTEGER,
      GREATEST(1, i - FLOOR(RANDOM() * 10)::INTEGER)
    );
  END LOOP;
  
END $$;

-- ============================================
-- VERIFY DATA
-- ============================================

-- Check counts
SELECT 'Artists' as table_name, COUNT(*) as count FROM artists
UNION ALL
SELECT 'Songs', COUNT(*) FROM songs
UNION ALL
SELECT 'Song-Artist Links', COUNT(*) FROM song_artists
UNION ALL
SELECT 'Chart Entries', COUNT(*) FROM chart_entries;

-- Test the view
SELECT * FROM song_details LIMIT 5;

-- Test the function
SELECT * FROM get_chart_data('2024-08-16') LIMIT 10;
