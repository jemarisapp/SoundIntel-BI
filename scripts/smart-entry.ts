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

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    // Writes need the service role key, which stays on your machine (see .env.example)
    process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

interface ExistingArtist {
    id: string;
    name: string;
}

interface ExistingSong {
    id: string;
    title: string;
    artists: string;
}

interface PreviousEntry {
    songId: string;
    title: string;
    artists: string;
    rank: number;
    points: number;
    streaming: number;
    streamingPct: number | null;
    airplay: number;
    airplayPct: number | null;
    sales: number;
    salesPct: number | null;
    weeksOnChart: number;
    peak: number;
}

// Fuzzy matching - calculate similarity between two strings
function similarity(a: string, b: string): number {
    const aLower = a.toLowerCase().trim();
    const bLower = b.toLowerCase().trim();

    if (aLower === bLower) return 1;
    if (aLower.includes(bLower) || bLower.includes(aLower)) return 0.8;

    // Simple character-based similarity
    const aSet = new Set(aLower.split(''));
    const bSet = new Set(bLower.split(''));
    const intersection = [...aSet].filter(x => bSet.has(x)).length;
    const union = new Set([...aSet, ...bSet]).size;

    return intersection / union;
}

// Find similar artists
function findSimilarArtists(input: string, existing: ExistingArtist[], threshold = 0.6): ExistingArtist[] {
    return existing
        .map(a => ({ ...a, score: similarity(input, a.name) }))
        .filter(a => a.score >= threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
}

// Find similar songs
function findSimilarSongs(input: string, existing: ExistingSong[], threshold = 0.6): ExistingSong[] {
    return existing
        .map(s => ({ ...s, score: similarity(input, s.title) }))
        .filter(s => s.score >= threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
}

// Fetch all existing artists
async function fetchExistingArtists(): Promise<ExistingArtist[]> {
    const { data, error } = await supabase
        .from('artists')
        .select('id, name')
        .order('name');

    if (error) throw error;
    return data || [];
}

// Fetch all existing songs with artists
async function fetchExistingSongs(): Promise<ExistingSong[]> {
    const { data, error } = await supabase
        .from('songs')
        .select(`
            id,
            title,
            song_artists (
                display_order,
                artists (name)
            )
        `)
        .order('title');

    if (error) throw error;

    return (data || []).map(song => ({
        id: song.id,
        title: song.title,
        artists: (song.song_artists as any[])
            .sort((a, b) => a.display_order - b.display_order)
            .map(sa => sa.artists.name)
            .join(', ')
    }));
}

// Fetch previous week's chart entries
async function fetchPreviousWeekEntries(previousWeek: string): Promise<PreviousEntry[]> {
    const { data, error } = await supabase
        .from('chart_entries')
        .select(`
            song_id,
            rank,
            points,
            streaming_vol,
            streaming_pct,
            airplay_vol,
            airplay_pct,
            sales_vol,
            sales_pct,
            weeks_on_chart,
            peak_position,
            songs (
                title,
                song_artists (
                    display_order,
                    artists (name)
                )
            )
        `)
        .eq('chart_week', previousWeek)
        .order('rank');

    if (error) throw error;

    return (data || []).map(entry => ({
        songId: entry.song_id,
        title: (entry.songs as any).title,
        artists: ((entry.songs as any).song_artists as any[])
            .sort((a: any, b: any) => a.display_order - b.display_order)
            .map((sa: any) => sa.artists.name)
            .join(', '),
        rank: entry.rank,
        points: entry.points,
        streaming: entry.streaming_vol,
        streamingPct: entry.streaming_pct,
        airplay: entry.airplay_vol,
        airplayPct: entry.airplay_pct,
        sales: entry.sales_vol,
        salesPct: entry.sales_pct,
        weeksOnChart: entry.weeks_on_chart,
        peak: entry.peak_position || entry.rank
    }));
}

// Generate CSV from previous week
async function generateFromPreviousWeek(previousWeek: string, newWeek: string, outputPath: string) {
    console.log(`\n📊 Fetching data from ${previousWeek}...`);

    const entries = await fetchPreviousWeekEntries(previousWeek);

    if (entries.length === 0) {
        console.error(`❌ No entries found for ${previousWeek}`);
        process.exit(1);
    }

    console.log(`✅ Found ${entries.length} entries\n`);

    // Generate CSV with previous week's data as template
    const header = 'rank,title,artist,points,streaming,streaming_pct,airplay,airplay_pct,sales,sales_pct,prevRank,weeksOnChart,peak';
    const rows = entries.map(entry => {
        // Increment weeks on chart, preserve previous rank
        const newWoc = entry.weeksOnChart + 1;
        return [
            entry.rank,  // Placeholder rank (user should update)
            `"${entry.title.replace(/"/g, '""')}"`,
            `"${entry.artists.replace(/"/g, '""')}"`,
            entry.points,  // Placeholder (user should update)
            entry.streaming,
            entry.streamingPct ?? '',
            entry.airplay,
            entry.airplayPct ?? '',
            entry.sales,
            entry.salesPct ?? '',
            entry.rank,  // Previous rank = last week's rank
            newWoc,
            entry.peak
        ].join(',');
    });

    const csv = [header, ...rows].join('\n');
    fs.writeFileSync(outputPath, csv);

    console.log(`✅ Generated template: ${outputPath}`);
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Open ${outputPath} in Excel/Google Sheets`);
    console.log(`   2. Update ranks, points, and metrics for ${newWeek}`);
    console.log(`   3. Add any new songs that debuted this week`);
    console.log(`   4. Remove any songs that dropped off the chart`);
    console.log(`   5. Import: npx tsx scripts/add-chart-data.ts csv ${outputPath} ${newWeek}`);
}

// Smart interactive mode with suggestions
async function smartInteractiveMode(chartWeek: string, previousWeek?: string) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (prompt: string): Promise<string> => {
        return new Promise(resolve => rl.question(prompt, resolve));
    };

    console.log('\n🔄 Loading existing data for duplicate detection...');
    const existingArtists = await fetchExistingArtists();
    const existingSongs = await fetchExistingSongs();

    let previousEntries: PreviousEntry[] = [];
    if (previousWeek) {
        previousEntries = await fetchPreviousWeekEntries(previousWeek);
        console.log(`📊 Loaded ${previousEntries.length} entries from ${previousWeek}`);
    }

    console.log(`✅ Loaded ${existingArtists.length} artists and ${existingSongs.length} songs\n`);
    console.log(`🎵 Adding songs for: ${chartWeek}`);
    console.log('Type "done" when finished, "list" to see previous week entries\n');

    let rank = 1;
    const output: string[] = ['rank,title,artist,points,streaming,streaming_pct,airplay,airplay_pct,sales,sales_pct,prevRank,weeksOnChart,peak'];

    while (true) {
        console.log(`\n--- Song #${rank} ---`);

        // Show suggestion from previous week
        const prevEntry = previousEntries.find(e => e.rank === rank);
        if (prevEntry) {
            console.log(`💡 Previous week #${rank}: "${prevEntry.title}" by ${prevEntry.artists}`);
            const usePrev = await question('Use this song? (y/n/skip): ');

            if (usePrev.toLowerCase() === 'skip') {
                continue;
            }

            if (usePrev.toLowerCase() === 'y') {
                const points = await question(`Points [${prevEntry.points}]: `) || String(prevEntry.points);
                const streaming = await question(`Streaming [${prevEntry.streaming}]: `) || String(prevEntry.streaming);
                const streamingPctInput = await question(`Streaming %${prevEntry.streamingPct !== null ? ` [${prevEntry.streamingPct}]` : ''}: `);
                const streamingPct = streamingPctInput || (prevEntry.streamingPct !== null ? String(prevEntry.streamingPct) : '');
                const airplay = await question(`Airplay [${prevEntry.airplay}]: `) || String(prevEntry.airplay);
                const airplayPctInput = await question(`Airplay %${prevEntry.airplayPct !== null ? ` [${prevEntry.airplayPct}]` : ''}: `);
                const airplayPct = airplayPctInput || (prevEntry.airplayPct !== null ? String(prevEntry.airplayPct) : '');
                const sales = await question(`Sales [${prevEntry.sales}]: `) || String(prevEntry.sales);
                const salesPctInput = await question(`Sales %${prevEntry.salesPct !== null ? ` [${prevEntry.salesPct}]` : ''}: `);
                const salesPct = salesPctInput || (prevEntry.salesPct !== null ? String(prevEntry.salesPct) : '');

                output.push([
                    rank,
                    `"${prevEntry.title}"`,
                    `"${prevEntry.artists}"`,
                    points,
                    streaming,
                    streamingPct,
                    airplay,
                    airplayPct,
                    sales,
                    salesPct,
                    prevEntry.rank,
                    prevEntry.weeksOnChart + 1,
                    Math.min(rank, prevEntry.peak)
                ].join(','));

                console.log(`✅ Added: "${prevEntry.title}"`);
                rank++;
                continue;
            }
        }

        const titleInput = await question('Song title (or "done"/"list"): ');

        if (titleInput.toLowerCase() === 'done') break;

        if (titleInput.toLowerCase() === 'list') {
            console.log('\n📋 Previous week entries:');
            previousEntries.slice(0, 20).forEach(e => {
                console.log(`   #${e.rank}: "${e.title}" by ${e.artists}`);
            });
            continue;
        }

        // Check for similar existing songs
        const similarSongs = findSimilarSongs(titleInput, existingSongs);
        if (similarSongs.length > 0) {
            console.log('\n🔍 Similar existing songs found:');
            similarSongs.forEach((s, i) => {
                console.log(`   [${i + 1}] "${s.title}" by ${s.artists}`);
            });
            const choice = await question('Select number to use, or press Enter for new: ');

            if (choice && parseInt(choice) > 0 && parseInt(choice) <= similarSongs.length) {
                const selected = similarSongs[parseInt(choice) - 1];
                const points = await question('Points: ');
                const streaming = await question('Streaming: ');
                const streamingPct = await question('Streaming % (0-100, optional): ');
                const airplay = await question('Airplay: ');
                const airplayPct = await question('Airplay % (0-100, optional): ');
                const sales = await question('Sales: ');
                const salesPct = await question('Sales % (0-100, optional): ');
                const prevRank = await question(`Previous rank [${rank}]: `) || String(rank);
                const woc = await question('Weeks on chart [1]: ') || '1';
                const peak = await question(`Peak [${rank}]: `) || String(rank);

                output.push([
                    rank,
                    `"${selected.title}"`,
                    `"${selected.artists}"`,
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
                ].join(','));

                console.log(`✅ Added: "${selected.title}"`);
                rank++;
                continue;
            }
        }

        // New song - check artist similarity
        const artistInput = await question('Artist(s): ');

        const similarArtists = findSimilarArtists(artistInput, existingArtists);
        let finalArtist = artistInput;

        if (similarArtists.length > 0) {
            console.log('\n🔍 Similar existing artists found:');
            similarArtists.forEach((a, i) => {
                console.log(`   [${i + 1}] ${a.name}`);
            });
            const choice = await question('Select number to use exact name, or Enter for new: ');

            if (choice && parseInt(choice) > 0 && parseInt(choice) <= similarArtists.length) {
                finalArtist = similarArtists[parseInt(choice) - 1].name;
            }
        }

        const points = await question('Points: ');
        const streaming = await question('Streaming: ');
        const streamingPct = await question('Streaming % (0-100, optional): ');
        const airplay = await question('Airplay: ');
        const airplayPct = await question('Airplay % (0-100, optional): ');
        const sales = await question('Sales: ');
        const salesPct = await question('Sales % (0-100, optional): ');
        const prevRank = await question(`Previous rank [${rank}]: `) || String(rank);
        const woc = await question('Weeks on chart [1]: ') || '1';
        const peak = await question(`Peak [${rank}]: `) || String(rank);

        output.push([
            rank,
            `"${titleInput}"`,
            `"${finalArtist}"`,
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
        ].join(','));

        console.log(`✅ Added: "${titleInput}" by ${finalArtist}`);
        rank++;
    }

    rl.close();

    // Save to CSV
    const outputPath = `data/chart-${chartWeek}.csv`;
    fs.mkdirSync('data', { recursive: true });
    fs.writeFileSync(outputPath, output.join('\n'));

    console.log(`\n🎉 Generated ${outputPath} with ${rank - 1} songs!`);
    console.log(`\n📤 To import: npx tsx scripts/add-chart-data.ts csv ${outputPath} ${chartWeek}`);
}

// Validate a CSV against existing data
async function validateCSV(filePath: string) {
    console.log('\n🔍 Validating CSV against existing database...\n');

    const existingArtists = await fetchExistingArtists();
    const existingSongs = await fetchExistingSongs();

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n').slice(1); // Skip header

    let warnings = 0;

    for (const line of lines) {
        const [rank, title, artist] = line.split(',').map(f => f.replace(/^"|"$/g, '').trim());

        // Check for similar songs
        const similarSongs = findSimilarSongs(title, existingSongs, 0.7);
        const exactMatch = existingSongs.find(s => s.title.toLowerCase() === title.toLowerCase());

        if (similarSongs.length > 0 && !exactMatch) {
            console.log(`⚠️ Row ${rank}: "${title}" similar to existing:`);
            similarSongs.forEach(s => console.log(`   → "${s.title}" by ${s.artists}`));
            warnings++;
        }

        // Check for similar artists
        const artistNames = artist.split(/,|feat\.|featuring|&|x/i).map(a => a.trim());
        for (const artistName of artistNames) {
            const similarArtists = findSimilarArtists(artistName, existingArtists, 0.7);
            const exactMatch = existingArtists.find(a => a.name.toLowerCase() === artistName.toLowerCase());

            if (similarArtists.length > 0 && !exactMatch) {
                console.log(`⚠️ Row ${rank}: "${artistName}" similar to existing:`);
                similarArtists.forEach(a => console.log(`   → "${a.name}"`));
                warnings++;
            }
        }
    }

    if (warnings === 0) {
        console.log('✅ No potential duplicates found!');
    } else {
        console.log(`\n⚠️ Found ${warnings} potential issues to review`);
    }
}

// Main
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log(`
📊 SoundIntelBI Smart Data Entry

Commands:
  generate <prev-week> <new-week> [output.csv]
    Generate a template CSV from previous week's chart
    
  smart <chart-week> [prev-week]
    Interactive entry with duplicate detection and suggestions
    
  validate <file.csv>
    Check CSV for potential duplicate artists/songs

Examples:
  npx tsx scripts/smart-entry.ts generate 2024-08-16 2024-08-23 data/week-8-23.csv
  npx tsx scripts/smart-entry.ts smart 2024-08-23 2024-08-16
  npx tsx scripts/smart-entry.ts validate data/chart.csv
        `);
        process.exit(0);
    }

    const [command, ...rest] = args;

    if (command === 'generate') {
        const [prevWeek, newWeek, output] = rest;
        const outputPath = output || `data/chart-${newWeek}.csv`;
        await generateFromPreviousWeek(prevWeek, newWeek, outputPath);
    } else if (command === 'smart') {
        const [chartWeek, prevWeek] = rest;
        await smartInteractiveMode(chartWeek, prevWeek);
    } else if (command === 'validate') {
        await validateCSV(rest[0]);
    } else {
        console.error('Unknown command');
        process.exit(1);
    }
}

main().catch(console.error);
