
import { Artist, Song, ChartEntry } from './types';

export const WEEKS = [
  "Week of August 16th",
  "Week of August 9th",
  "Week of August 2nd",
  "Week of July 26th"
];

export const ARTISTS: Artist[] = [
  { id: '1', name: 'Andrew Choi' },
  { id: '2', name: 'Danny Chung' },
  { id: '3', name: 'Saja Boys' },
  { id: '4', name: 'Samuil Lee' },
  { id: '5', name: 'Luminate' },
  { id: '6', name: 'Chappell Roan' },
  { id: '7', name: 'Shaboozey' },
  { id: '8', name: 'Post Malone' },
  { id: '9', name: 'Morgan Wallen' },
];

export const SONGS: Song[] = [
  { id: 's1', title: 'Soda Pop', artistIds: ['1', '2', '3', '4'], fullArtistName: 'Andrew Choi, Danny Chung, Saja Boys, Samuil Lee', releaseDate: '2024-05-15' },
  { id: 's2', title: 'A Bar Song (Tipsy)', artistIds: ['7'], fullArtistName: 'Shaboozey', releaseDate: '2024-04-12' },
  { id: 's3', title: 'I Had Some Help', artistIds: ['8', '9'], fullArtistName: 'Post Malone feat. Morgan Wallen', releaseDate: '2024-05-10' },
  { id: 's4', title: 'Pink Pony Club', artistIds: ['6'], fullArtistName: 'Chappell Roan', releaseDate: '2020-04-03' },
  { id: 's5', title: 'Golden', artistIds: ['10'], fullArtistName: 'Harry Styles', releaseDate: '2019-12-13' },
  { id: 's6', title: 'Ordinary', artistIds: ['11'], fullArtistName: 'Lauv', releaseDate: '2023-01-20' },
  { id: 's7', title: 'The Subway', artistIds: ['12'], fullArtistName: 'The Lumineers', releaseDate: '2023-11-05' },
  { id: 's8', title: 'What I Want', artistIds: ['13'], fullArtistName: 'Muna', releaseDate: '2022-06-24' },
  { id: 's9', title: 'Daisies', artistIds: ['14'], fullArtistName: 'Katy Perry', releaseDate: '2020-05-15' },
  { id: 's10', title: 'Love Me Not', artistIds: ['15'], fullArtistName: 'Skepta', releaseDate: '2024-01-01' },
];

// Generate 50 entries
export const CHART_ENTRIES: ChartEntry[] = [
  { songId: 's1', chartWeek: WEEKS[0], rank: 14, points: 127, streamingVol: 16900000, streamingPct: null, airplayVol: 500000, airplayPct: null, salesVol: 2500, salesPct: null, prevRank: 16, woc: 6, peak: 14 },
  { songId: 's2', chartWeek: WEEKS[0], rank: 1, points: 340, streamingVol: 35000000, streamingPct: null, airplayVol: 82000000, airplayPct: null, salesVol: 12000, salesPct: null, prevRank: 1, woc: 18, peak: 1 },
  { songId: 's3', chartWeek: WEEKS[0], rank: 2, points: 310, streamingVol: 28000000, streamingPct: null, airplayVol: 75000000, airplayPct: null, salesVol: 8000, salesPct: null, prevRank: 2, woc: 14, peak: 1 },
  { songId: 's4', chartWeek: WEEKS[0], rank: 3, points: 285, streamingVol: 31000000, streamingPct: null, airplayVol: 12000000, airplayPct: null, salesVol: 5000, salesPct: null, prevRank: 5, woc: 22, peak: 3 },
  { songId: 's5', chartWeek: WEEKS[0], rank: 4, points: 260, streamingVol: 25000000, streamingPct: null, airplayVol: 45000000, airplayPct: null, salesVol: 4200, salesPct: null, prevRank: 3, woc: 40, peak: 1 },
  { songId: 's6', chartWeek: WEEKS[0], rank: 5, points: 245, streamingVol: 22000000, streamingPct: null, airplayVol: 38000000, airplayPct: null, salesVol: 3100, salesPct: null, prevRank: 4, woc: 12, peak: 4 },
  { songId: 's7', chartWeek: WEEKS[0], rank: 6, points: 230, streamingVol: 24000000, streamingPct: null, airplayVol: 32000000, airplayPct: null, salesVol: 2800, salesPct: null, prevRank: 7, woc: 8, peak: 6 },
  { songId: 's8', chartWeek: WEEKS[0], rank: 7, points: 215, streamingVol: 20000000, streamingPct: null, airplayVol: 28000000, airplayPct: null, salesVol: 2600, salesPct: null, prevRank: 6, woc: 5, peak: 6 },
  { songId: 's9', chartWeek: WEEKS[0], rank: 8, points: 200, streamingVol: 19000000, streamingPct: null, airplayVol: 24000000, airplayPct: null, salesVol: 2200, salesPct: null, prevRank: 9, woc: 3, peak: 8 },
  { songId: 's10', chartWeek: WEEKS[0], rank: 9, points: 190, streamingVol: 18000000, streamingPct: null, airplayVol: 21000000, airplayPct: null, salesVol: 1900, salesPct: null, prevRank: 8, woc: 10, peak: 5 },
];

// Add dummy entries for a full chart
for(let i=11; i<=100; i++) {
  CHART_ENTRIES.push({
    songId: `s${i}`,
    chartWeek: WEEKS[0],
    rank: i,
    points: 150 - i,
    streamingVol: Math.floor(Math.random() * 15000000) + 1000000,
    streamingPct: null,
    airplayVol: Math.floor(Math.random() * 20000000) + 100000,
    airplayPct: null,
    salesVol: Math.floor(Math.random() * 1000) + 100,
    salesPct: null,
    prevRank: i + (Math.random() > 0.5 ? 2 : -2),
    woc: Math.floor(Math.random() * 52) + 1,
    peak: Math.max(1, i - Math.floor(Math.random() * 10))
  });
}
