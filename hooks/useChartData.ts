import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { ChartEntry, Song, Artist } from '../types';

// Transform database entry to app ChartEntry type
interface DBChartEntry {
    id: string;
    song_id: string;
    chart_week: string;
    rank: number;
    points: number;
    streaming_vol: number;
    streaming_pct: number | null;
    airplay_vol: number;
    airplay_pct: number | null;
    sales_vol: number;
    sales_pct: number | null;
    prev_rank: number | null;
    weeks_on_chart: number;
    peak_position: number | null;
    songs: {
        id: string;
        title: string;
        song_artists: {
            display_order: number;
            artists: {
                id: string;
                name: string;
            };
        }[];
    };
}

// Hook to fetch available chart weeks from database
export function useAvailableWeeks() {
    const [weeks, setWeeks] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchWeeks() {
            try {
                setLoading(true);

                const { data, error: fetchError } = await supabase
                    .from('chart_entries')
                    .select('chart_week')
                    .order('chart_week', { ascending: false });

                if (fetchError) throw fetchError;

                // Get unique weeks and format them
                const uniqueWeeks = [...new Set(data?.map(d => d.chart_week) || [])];
                const formattedWeeks = uniqueWeeks.map(formatWeekString);

                setWeeks(formattedWeeks);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch weeks');
                setWeeks([]);
            } finally {
                setLoading(false);
            }
        }

        fetchWeeks();
    }, []);

    return { weeks, loading, error };
}

// Hook to fetch chart data for a specific week
export function useChartData(selectedWeek: string) {
    const [entries, setEntries] = useState<ChartEntry[]>([]);
    const [songs, setSongs] = useState<Song[]>([]);
    const [artists, setArtists] = useState<Artist[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchChartData = useCallback(async () => {
        if (!selectedWeek) {
            setEntries([]);
            setSongs([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Convert week string to date
            const weekDate = parseWeekString(selectedWeek);

            const { data, error: fetchError } = await supabase
                .from('chart_entries')
                .select(`
          id,
          song_id,
          chart_week,
          rank,
          points,
          streaming_vol,
          streaming_pct,
          airplay_vol,
          airplay_pct,
          sales_vol,
          sales_pct,
          prev_rank,
          weeks_on_chart,
          peak_position,
          songs (
            id,
            title,
            song_artists (
              display_order,
              artists (
                id,
                name
              )
            )
          )
        `)
                .eq('chart_week', weekDate)
                .order('rank', { ascending: true });

            if (fetchError) throw fetchError;

            // Process the data
            const chartEntries: ChartEntry[] = [];
            const songMap = new Map<string, Song>();
            const artistMap = new Map<string, Artist>();

            for (const entry of (data as unknown as DBChartEntry[]) || []) {
                // Build artist list for this song
                const sortedArtists = entry.songs.song_artists
                    .sort((a, b) => a.display_order - b.display_order)
                    .map(sa => sa.artists);

                const artistIds = sortedArtists.map(a => a.id);
                const fullArtistName = sortedArtists.map(a => a.name).join(', ');

                // Add to artist map
                sortedArtists.forEach(artist => {
                    if (!artistMap.has(artist.id)) {
                        artistMap.set(artist.id, { id: artist.id, name: artist.name });
                    }
                });

                // Add to song map
                if (!songMap.has(entry.song_id)) {
                    songMap.set(entry.song_id, {
                        id: entry.song_id,
                        title: entry.songs.title,
                        artistIds,
                        fullArtistName,
                        releaseDate: ''
                    });
                }

                // Add chart entry
                chartEntries.push({
                    songId: entry.song_id,
                    chartWeek: selectedWeek,
                    rank: entry.rank,
                    points: entry.points,
                    streamingVol: entry.streaming_vol,
                    streamingPct: entry.streaming_pct,
                    airplayVol: entry.airplay_vol,
                    airplayPct: entry.airplay_pct,
                    salesVol: entry.sales_vol,
                    salesPct: entry.sales_pct,
                    prevRank: entry.prev_rank || entry.rank,
                    woc: entry.weeks_on_chart,
                    peak: entry.peak_position || entry.rank
                });
            }

            setEntries(chartEntries);
            setSongs(Array.from(songMap.values()));
            setArtists(Array.from(artistMap.values()));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch chart data');
            setEntries([]);
            setSongs([]);
        } finally {
            setLoading(false);
        }
    }, [selectedWeek]);

    useEffect(() => {
        fetchChartData();
    }, [fetchChartData]);

    return { entries, songs, artists, loading, error, refetch: fetchChartData };
}

// Helper: Parse "Week of August 16th, 2025" to "2025-08-16"
export function parseWeekString(week: string): string {
    const match = week.match(/Week of (\w+) (\d+)(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/);
    if (!match) return new Date().toISOString().split('T')[0];

    const [, month, day, year] = match;
    const monthMap: Record<string, string> = {
        'January': '01', 'February': '02', 'March': '03', 'April': '04',
        'May': '05', 'June': '06', 'July': '07', 'August': '08',
        'September': '09', 'October': '10', 'November': '11', 'December': '12'
    };

    const parsedYear = year || new Date().getFullYear().toString();
    return `${parsedYear}-${monthMap[month]}-${day.padStart(2, '0')}`;
}

// Helper: Format "2025-08-16" to "Week of August 16th, 2025"
function formatWeekString(date: string): string {
    const d = new Date(date + 'T00:00:00');
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const day = d.getDate();
    const year = d.getFullYear();
    const suffix = day === 1 || day === 21 || day === 31 ? 'st' :
        day === 2 || day === 22 ? 'nd' :
            day === 3 || day === 23 ? 'rd' : 'th';

    return `Week of ${months[d.getMonth()]} ${day}${suffix}, ${year}`;
}
