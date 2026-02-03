import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as readline from 'readline';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Use service role key if available (bypasses RLS), otherwise use anon key
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey || supabaseKey === 'your_service_role_key_here') {
    console.error(`
❌ Service role key required for data import!

To fix this:
1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
2. Copy the "service_role" key (under "Project API keys")
3. Add to .env.local:
   SUPABASE_SERVICE_KEY=your_actual_service_key

⚠️ Never commit the service key to git!
    `);
    process.exit(1);
}

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    supabaseKey
);

interface ChartEntry {
    rank: number;
    title: string;
    artist: string;
    points: number;
    streaming: number;
    streamingPct?: number | null;
    airplay: number;
    airplayPct?: number | null;
    sales: number;
    salesPct?: number | null;
    prevRank: number;
    weeksOnChart: number;
    peak: number;
}

function cleanField(value: string | undefined): string {
    return (value ?? '').replace(/^["']|["']$/g, '').trim();
}

function parseOptionalInt(value: string | undefined): number | null {
    const cleaned = cleanField(value);
    if (!cleaned) return null;
    const parsed = parseInt(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
}

// Helper to parse artist string into individual artists
function parseArtists(artistString: string): string[] {
    return artistString
        .replace(/ feat\. | featuring | Featuring | & | x /gi, ',')
        .split(',')
        .map(a => a.trim())
        .filter(a => a.length > 0);
}

// Insert or get existing artist
async function getOrCreateArtist(name: string): Promise<string> {
    // Check if exists
    const { data: existing } = await supabase
        .from('artists')
        .select('id')
        .eq('name', name)
        .single();

    if (existing) return existing.id;

    // Create new
    const { data: created, error } = await supabase
        .from('artists')
        .insert({ name })
        .select('id')
        .single();

    if (error) throw error;
    return created.id;
}

// Insert or get existing song
async function getOrCreateSong(title: string, artistIds: string[]): Promise<string> {
    // Check if exists
    const { data: existing } = await supabase
        .from('songs')
        .select('id')
        .eq('title', title)
        .single();

    if (existing) return existing.id;

    // Create new song
    const { data: song, error } = await supabase
        .from('songs')
        .insert({ title })
        .select('id')
        .single();

    if (error) throw error;

    // Link artists to song
    for (let i = 0; i < artistIds.length; i++) {
        await supabase
            .from('song_artists')
            .upsert({
                song_id: song.id,
                artist_id: artistIds[i],
                display_order: i + 1
            });
    }

    return song.id;
}

// Add chart entry for a week
async function addChartEntry(songId: string, chartWeek: string, entry: ChartEntry) {
    const { error } = await supabase
        .from('chart_entries')
        .upsert({
            song_id: songId,
            chart_week: chartWeek,
            rank: entry.rank,
            points: entry.points,
            streaming_vol: entry.streaming,
            streaming_pct: entry.streamingPct ?? null,
            airplay_vol: entry.airplay,
            airplay_pct: entry.airplayPct ?? null,
            sales_vol: entry.sales,
            sales_pct: entry.salesPct ?? null,
            prev_rank: entry.prevRank,
            weeks_on_chart: entry.weeksOnChart,
            peak_position: entry.peak
        }, { onConflict: 'song_id,chart_week' });

    if (error) throw error;
}

// Interactive mode - add songs one by one
async function interactiveMode(chartWeek: string) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (prompt: string): Promise<string> => {
        return new Promise(resolve => rl.question(prompt, resolve));
    };

    console.log(`\n🎵 Adding songs for chart week: ${chartWeek}\n`);
    console.log('Enter song details (type "done" when finished)\n');

    let rank = 1;

    while (true) {
        console.log(`\n--- Song #${rank} ---`);

        const title = await question('Song title (or "done"): ');
        if (title.toLowerCase() === 'done') break;

        const artist = await question('Artist(s) (use commas for multiple): ');
        const points = parseInt(await question('Points: ') || '0');
        const streaming = parseInt(await question('Streaming volume: ') || '0');
        const streamingPct = parseOptionalInt(await question('Streaming % (0-100, optional): '));
        const airplay = parseInt(await question('Airplay volume: ') || '0');
        const airplayPct = parseOptionalInt(await question('Airplay % (0-100, optional): '));
        const sales = parseInt(await question('Sales: ') || '0');
        const salesPct = parseOptionalInt(await question('Sales % (0-100, optional): '));
        const prevRank = parseInt(await question(`Previous rank [${rank}]: `) || String(rank));
        const weeksOnChart = parseInt(await question('Weeks on chart [1]: ') || '1');
        const peak = parseInt(await question(`Peak position [${rank}]: `) || String(rank));

        try {
            // Parse and create artists
            const artistNames = parseArtists(artist);
            const artistIds = await Promise.all(artistNames.map(name => getOrCreateArtist(name)));

            // Create song
            const songId = await getOrCreateSong(title, artistIds);

            // Add chart entry
            await addChartEntry(songId, chartWeek, {
                rank,
                title,
                artist,
                points,
                streaming,
                streamingPct,
                airplay,
                airplayPct,
                sales,
                salesPct,
                prevRank,
                weeksOnChart,
                peak
            });

            console.log(`✅ Added #${rank}: "${title}" by ${artist}`);
            rank++;
        } catch (error) {
            console.error('❌ Error adding song:', error);
        }
    }

    rl.close();
    console.log(`\n🎉 Added ${rank - 1} songs for ${chartWeek}!`);
}

// Quick add mode - add a single song
async function quickAddSong(
    chartWeek: string,
    rank: number,
    title: string,
    artist: string,
    points: number,
    streaming: number,
    streamingPct: number | null,
    airplay: number,
    airplayPct: number | null,
    sales: number,
    salesPct: number | null,
    prevRank?: number,
    weeksOnChart?: number,
    peak?: number
) {
    const artistNames = parseArtists(artist);
    const artistIds = await Promise.all(artistNames.map(name => getOrCreateArtist(name)));
    const songId = await getOrCreateSong(title, artistIds);

    await addChartEntry(songId, chartWeek, {
        rank,
        title,
        artist,
        points,
        streaming,
        streamingPct,
        airplay,
        airplayPct,
        sales,
        salesPct,
        prevRank: prevRank || rank,
        weeksOnChart: weeksOnChart || 1,
        peak: peak || rank
    });

    console.log(`✅ Added #${rank}: "${title}" by ${artist}`);
}

// CSV Import - process a CSV file
async function importCSV(filePath: string, chartWeek: string) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.trim().split('\n');

    // Skip header row if present
    const header = lines[0].toLowerCase();
    const hasHeader = header.includes('rank') || header.includes('title');
    const hasPctCols = hasHeader && header.includes('streaming_pct');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    console.log(`\n📊 Importing ${dataLines.length} songs for ${chartWeek}...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const line of dataLines) {
        const fields = parseCSVLine(line);

        if (fields.length < 4) {
            console.log(`⚠️ Skipping invalid row: ${line.substring(0, 50)}...`);
            errorCount++;
            continue;
        }

        // Format (new):
        // rank,title,artist,points,streaming,streaming_pct,airplay,airplay_pct,sales,sales_pct,prevRank,weeksOnChart,peak
        // Format (legacy):
        // rank,title,artist,points,streaming,airplay,sales,prevRank,weeksOnChart,peak
        const [
            rank,
            title,
            artist,
            points,
            streaming,
            streamingPct,
            airplay,
            airplayPct,
            sales,
            salesPct,
            prevRank,
            woc,
            peak
        ] = hasPctCols
            ? fields
            : [
                fields[0],
                fields[1],
                fields[2],
                fields[3],
                fields[4],
                undefined,
                fields[5],
                undefined,
                fields[6],
                undefined,
                fields[7],
                fields[8],
                fields[9]
            ];

        try {
            await quickAddSong(
                chartWeek,
                parseInt(cleanField(rank)),
                cleanField(title),
                cleanField(artist),
                parseInt(cleanField(points)) || 0,
                parseInt(cleanField(streaming)) || 0,
                parseOptionalInt(streamingPct),
                parseInt(cleanField(airplay)) || 0,
                parseOptionalInt(airplayPct),
                parseInt(cleanField(sales)) || 0,
                parseOptionalInt(salesPct),
                prevRank ? parseInt(cleanField(prevRank)) : undefined,
                woc ? parseInt(cleanField(woc)) : undefined,
                peak ? parseInt(cleanField(peak)) : undefined
            );
            successCount++;
        } catch (error) {
            console.error(`❌ Error adding "${title}":`, error);
            errorCount++;
        }
    }

    console.log(`\n🎉 Import complete! ✅ ${successCount} added, ❌ ${errorCount} errors`);
}

// Parse CSV line handling quoted fields
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

// Main
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log(`
📊 SoundIntelBI Weekly Data Uploader

Usage:
  npx tsx scripts/add-chart-data.ts interactive YYYY-MM-DD
  npx tsx scripts/add-chart-data.ts csv <file.csv> YYYY-MM-DD
  npx tsx scripts/add-chart-data.ts csv data/chart-2025-08-16.csv 2025-08-16
  npx tsx scripts/add-chart-data.ts add YYYY-MM-DD <rank> "<title>" "<artist>" <points> <streaming> <streaming_pct> <airplay> <airplay_pct> <sales> <sales_pct>

CSV Format (with header row):
  rank,title,artist,points,streaming,streaming_pct,airplay,airplay_pct,sales,sales_pct,prevRank,weeksOnChart,peak
  1,"A Bar Song (Tipsy)","Shaboozey",340,35000000,93,82000000,4,12000,3,1,19,1

Examples:
  npx tsx scripts/add-chart-data.ts csv data/chart-2024-08-23.csv 2024-08-23
  npx tsx scripts/add-chart-data.ts interactive 2024-08-23
        `);
        process.exit(0);
    }

    const [command, ...rest] = args;

    if (command === 'interactive') {
        await interactiveMode(rest[0]);
    } else if (command === 'csv') {
        const [filePath, chartWeek] = rest;
        if (!filePath || !chartWeek) {
            console.error('Usage: npx tsx scripts/add-chart-data.ts csv <file.csv> YYYY-MM-DD');
            process.exit(1);
        }
        await importCSV(filePath, chartWeek);
    } else if (command === 'add') {
        const [chartWeek, rank, title, artist, points, streaming, streamingPct, airplay, airplayPct, sales, salesPct, prevRank, woc, peak] = rest;
        await quickAddSong(
            chartWeek,
            parseInt(rank),
            title,
            artist,
            parseInt(points),
            parseInt(streaming),
            parseOptionalInt(streamingPct),
            parseInt(airplay),
            parseOptionalInt(airplayPct),
            parseInt(sales),
            parseOptionalInt(salesPct),
            prevRank ? parseInt(prevRank) : undefined,
            woc ? parseInt(woc) : undefined,
            peak ? parseInt(peak) : undefined
        );
    } else {
        console.error('Unknown command. Use "interactive", "csv", or "add".');
        process.exit(1);
    }
}

main().catch(console.error);
