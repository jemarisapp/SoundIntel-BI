
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  LineChart,
  Line
} from 'recharts';
import { useAvailableWeeks, useChartData } from './hooks/useChartData';
import {
  DashboardState,
  ChartEntry,
  Song,
  Message,
  AssistantState,
  VisualComponent
} from './types';
import { GoogleGenAI, Type } from '@google/genai';

// --- Global Constants (Dashboard Palette) ---
const GREEN = '#10b981'; // Streaming
const BLUE = '#0ea5e9';  // Airplay
const GOLD = '#f59e0b';  // Sales
const RED = '#f43f5e';   // Points / Projected

const formatValue = (val: number) => {
  if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
  if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
  return val.toString();
};

const formatPct = (val: number | null | undefined) => {
  if (val === null || val === undefined) return '--';
  return `${val}%`;
};

// --- Sub-components for Dashboard ---

const SyncBarRow: React.FC<{
  songId: string,
  label: string,
  value: number,
  max: number,
  color: string,
  isSelected: boolean,
  rank: number,
  rankColor?: string,
  onClick: () => void
}> = ({ songId, label, value, max, color, isSelected, rank, rankColor, onClick }) => {
  const percentage = (value / max) * 100;
  return (
    <div
      onClick={onClick}
      data-song-id={songId}
      className={`group flex items-center h-8 gap-3 px-2 cursor-pointer rounded-sm transition-all ${isSelected ? 'bg-white/10 active-song-row' : 'hover:bg-white/5'}`}
    >
      <div className="flex-1 h-3 bg-zinc-800/50 rounded-full overflow-hidden relative">
        <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${percentage}%`, backgroundColor: isSelected ? '#fff' : color }} />
      </div>
      <div className="w-44 flex justify-between items-center text-[10px]">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={`w-6 text-right font-bold shrink-0 ${isSelected ? 'text-white' : (rankColor || 'text-zinc-500')}`}>{rank}</span>
          <span className={`truncate ${isSelected ? 'text-white font-bold' : 'text-zinc-400 group-hover:text-zinc-200'}`}>{label}</span>
        </div>
        <span className={`font-mono ml-2 shrink-0 ${isSelected ? 'text-white' : 'text-zinc-500'}`}>{formatValue(value)}</span>
      </div>
    </div>
  );
};

const SyncStackedBarList: React.FC<{ entries: ChartEntry[], songs: Song[], selectedId: string, onSelect: (id: string) => void }> = ({ entries, songs, selectedId, onSelect }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && selectedId) {
      const activeItem = containerRef.current.querySelector(`[data-song-id="${selectedId}"]`);
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedId]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Unified List Header: Titles + Integrated Legend */}
      <div className="flex items-center h-10 px-2 text-[9px] font-black uppercase text-zinc-600 tracking-widest border-b border-zinc-800 mb-2">
        <div className="flex-1">Performance Mix</div>
        {/* Adjusted width to 360px to give bars more room */}
        <div className="w-[360px] flex items-center">
          <div className="flex-1 pl-12 text-zinc-500">Rank & Song</div>
          <div className="w-14 flex items-center justify-end gap-1.5 pl-2">
            <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: GREEN }} />
            <span className="truncate">STR</span>
          </div>
          <div className="w-14 flex items-center justify-end gap-1.5 pl-2">
            <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: BLUE }} />
            <span className="truncate">AIR</span>
          </div>
          <div className="w-14 flex items-center justify-end gap-1.5 pl-2">
            <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: GOLD }} />
            <span className="truncate">SAL</span>
          </div>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto pr-1 space-y-0.5 custom-scrollbar">
        {entries.map((entry) => {
          const song = songs.find((s: any) => s.id === entry.songId);
          const sPct = entry.streamingPct ?? 0;
          const aPct = entry.airplayPct ?? 0;
          const saPct = entry.salesPct ?? 0;
          const totalPct = sPct + aPct + saPct;
          const sWidth = totalPct > 0 ? (sPct / totalPct) * 100 : 0;
          const aWidth = totalPct > 0 ? (aPct / totalPct) * 100 : 0;
          const saWidth = totalPct > 0 ? (saPct / totalPct) * 100 : 0;

          return (
            <div
              key={entry.songId}
              data-song-id={entry.songId}
              onClick={() => onSelect(entry.songId)}
              className={`group flex items-center h-8 gap-3 px-2 cursor-pointer rounded-sm transition-all ${entry.songId === selectedId ? 'bg-white/10' : 'hover:bg-white/5'}`}
            >
              <div className="flex-1 h-3 bg-zinc-800/50 rounded-full overflow-hidden flex relative">
                <div style={{ width: `${sWidth}%`, backgroundColor: GREEN }} className="h-full" />
                <div style={{ width: `${aWidth}%`, backgroundColor: BLUE }} className="h-full" />
                <div style={{ width: `${saWidth}%`, backgroundColor: GOLD }} className="h-full" />
                {entry.songId === selectedId && <div className="absolute inset-0 border border-white/80 rounded-full" />}
              </div>
              <div className="w-[360px] flex items-center text-[10px]">
                <div className="flex items-center gap-4 min-w-0 flex-1 pl-2">
                  <span className="w-8 text-right font-bold text-zinc-600 shrink-0">{entry.rank}</span>
                  <span className={`truncate ${entry.songId === selectedId ? 'text-white font-bold' : 'text-zinc-400'}`}>{song?.title}</span>
                </div>
                <div className={`w-14 text-right font-mono transition-colors ${entry.songId === selectedId ? 'text-white font-bold' : 'text-zinc-500'}`}>{formatPct(entry.streamingPct)}</div>
                <div className={`w-14 text-right font-mono transition-colors ${entry.songId === selectedId ? 'text-white font-bold' : 'text-zinc-500'}`}>{formatPct(entry.airplayPct)}</div>
                <div className={`w-14 text-right font-mono transition-colors ${entry.songId === selectedId ? 'text-white font-bold' : 'text-zinc-500'}`}>{formatPct(entry.salesPct)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SyncBarList: React.FC<{ entries: ChartEntry[], songs: Song[], metric: any, color: string, selectedId: string, onSelect: (id: string) => void, useRank?: boolean }> = ({ entries, songs, metric, color, selectedId, onSelect, useRank = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const maxVal = useMemo(() => Math.max(...entries.map(e => e[metric] as number), 1), [entries, metric]);

  useEffect(() => {
    if (containerRef.current && selectedId) {
      const activeItem = containerRef.current.querySelector(`[data-song-id="${selectedId}"]`);
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedId]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto pr-1 space-y-0.5 custom-scrollbar">
      {entries.map((entry, idx) => (
        <SyncBarRow
          key={entry.songId}
          songId={entry.songId}
          label={songs.find((s: any) => s.id === entry.songId)?.title || ''}
          value={entry[metric] as number}
          max={maxVal}
          color={color}
          rank={useRank ? entry.rank : idx + 1}
          isSelected={entry.songId === selectedId}
          onClick={() => onSelect(entry.songId)}
        />
      ))}
    </div>
  );
};

// --- Assistant Content Renderers ---

const AssistantVisual = ({ visual }: { visual: VisualComponent }) => {
  if (visual.type === 'bar-chart') {
    return (
      <div className="w-full bg-zinc-900 border border-zinc-800 rounded p-3 mt-3 shadow-inner">
        {visual.title && <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3 border-b border-zinc-800 pb-2">{visual.title}</div>}
        <div className="h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={visual.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
              <XAxis dataKey="name" stroke="#555" fontSize={9} tickLine={false} axisLine={false} tick={{ fill: '#777', fontWeight: 600 }} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#0c0c0c', border: '1px solid #333', fontSize: '10px', borderRadius: '4px' }} />
              <Bar dataKey="value" radius={[2, 2, 0, 0]} barSize={32}>
                {visual.data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || BLUE} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (visual.type === 'table') {
    return (
      <div className="w-full bg-zinc-900 border border-zinc-800 rounded mt-3 overflow-hidden shadow-inner">
        {visual.title && <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 p-2 bg-zinc-800/50 border-b border-zinc-800">{visual.title}</div>}
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] text-left border-collapse">
            <thead className="bg-zinc-800/30 text-zinc-500 uppercase font-black tracking-wider">
              <tr>
                {Object.keys(visual.data[0] || {}).map(k => k !== 'color' && (
                  <th key={k} className="px-3 py-2 border-r border-zinc-800/50 last:border-0">{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visual.data.map((row, i) => (
                <tr key={i} className="border-b border-zinc-800 last:border-0 hover:bg-white/5">
                  {Object.entries(row).map(([k, v]: [string, any], j) => k !== 'color' && (
                    <td key={j} className="px-3 py-2 text-zinc-300 font-medium">
                      {typeof v === 'number' ? v.toLocaleString() : v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return null;
};

// --- Main App ---

// Loading spinner component
const LoadingSpinner = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-[#0c0c0c]">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
      <p className="text-zinc-400 text-sm">Loading chart data...</p>
    </div>
  </div>
);

// Empty state component
const EmptyState = ({ message }: { message: string }) => (
  <div className="flex h-full items-center justify-center">
    <div className="text-center p-8">
      <svg className="w-16 h-16 mx-auto mb-4 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
      <p className="text-zinc-500 text-sm font-medium">{message}</p>
      <p className="text-zinc-600 text-xs mt-2">Select a different week or add chart data</p>
    </div>
  </div>
);

const App: React.FC = () => {
  // Fetch available weeks from database
  const { weeks: availableWeeks, loading: weeksLoading } = useAvailableWeeks();

  // Initialize state with empty values, will update when data loads
  const [state, setState] = useState<DashboardState>({
    selectedWeek: '',
    selectedArtist: 'All',
    selectedSongId: '',
  });

  // Update selected week when available weeks load
  useEffect(() => {
    if (availableWeeks.length > 0 && !state.selectedWeek) {
      setState(prev => ({ ...prev, selectedWeek: availableWeeks[0] }));
    }
  }, [availableWeeks, state.selectedWeek]);

  // Fetch chart data for selected week
  const { entries: currentEntries, songs, artists, loading: dataLoading, error } = useChartData(state.selectedWeek);

  // Update selected song when entries load - but only if no song is explicitly selected
  // Empty string '' means "All" is selected, so don't override it
  useEffect(() => {
    // Only auto-select if selectedSongId is NOT intentionally set (initial load)
    // We detect initial load by checking if selectedSongId is '' AND we haven't loaded data yet
    // Once user explicitly selects "All" (sets to ''), we should NOT override it
  }, [currentEntries]);

  const [panelView, setPanelView] = useState<'hidden' | 'expanded'>('hidden');
  const [assistant, setAssistant] = useState<AssistantState>({
    messages: [],
    loading: false,
    error: null,
  });
  const [inputValue, setInputValue] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Filter entries by selected artist (must be declared before selectedEntry uses it)
  const filteredEntries = useMemo(() => {
    if (state.selectedArtist === 'All') return currentEntries;
    return currentEntries.filter(entry => {
      const song = songs.find(s => s.id === entry.songId);
      return song?.fullArtistName?.includes(state.selectedArtist);
    });
  }, [currentEntries, songs, state.selectedArtist]);

  // Filter songs dropdown by selected artist
  const filteredSongs = useMemo(() => {
    if (state.selectedArtist === 'All') return songs;
    return songs.filter(s => s.fullArtistName?.includes(state.selectedArtist));
  }, [songs, state.selectedArtist]);

  // When "All" songs selected (empty string), show first song from filtered list
  const selectedEntry = useMemo(() => {
    if (state.selectedSongId) {
      return currentEntries.find(e => e.songId === state.selectedSongId) || filteredEntries[0] || currentEntries[0];
    }
    return filteredEntries[0] || currentEntries[0];
  }, [currentEntries, filteredEntries, state.selectedSongId]);
  const selectedSong = useMemo(() => songs.find(s => s.id === selectedEntry?.songId), [songs, selectedEntry]);

  // Sorted arrays now use filteredEntries for charts
  const sortedByPoints = useMemo(() => [...filteredEntries].sort((a, b) => a.rank - b.rank), [filteredEntries]);
  const sortedByStreaming = useMemo(() => [...filteredEntries].sort((a, b) => b.streamingVol - a.streamingVol), [filteredEntries]);
  const sortedByAirplay = useMemo(() => [...filteredEntries].sort((a, b) => b.airplayVol - a.airplayVol), [filteredEntries]);
  const sortedBySales = useMemo(() => [...filteredEntries].sort((a, b) => b.salesVol - a.salesVol), [filteredEntries]);

  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { if (panelView === 'expanded') scrollToBottom(); }, [assistant.messages, panelView]);

  const handleAsk = async (question: string) => {
    if (!question.trim()) return;

    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: question,
      timestamp: new Date()
    };

    setAssistant(prev => ({ ...prev, messages: [...prev.messages, newUserMsg], loading: true, error: null }));
    setInputValue('');
    setPanelView('expanded');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // Build full chart context with all songs
      const allSongsContext = sortedByPoints.map(e => {
        const s = songs.find(song => song.id === e.songId);
        const strPct = e.streamingPct;
        const airPct = e.airplayPct;
        const salPct = e.salesPct;
        const pctValues = [strPct, airPct, salPct].filter((v): v is number => v !== null && v !== undefined);
        const hasAllPct = pctValues.length === 3;
        const dominantMetric = hasAllPct
          ? (strPct! >= airPct! && strPct! >= salPct! ? 'STREAMING' : airPct! >= salPct! ? 'AIRPLAY' : 'SALES')
          : 'UNKNOWN';
        return {
          rank: e.rank,
          title: s?.title || 'Unknown',
          artist: s?.fullArtistName || 'Unknown',
          points: e.points,
          streaming: e.streamingVol,
          streamingPct: strPct,
          streamingRank: sortedByStreaming.findIndex(x => x.songId === e.songId) + 1,
          airplay: e.airplayVol,
          airplayPct: airPct,
          airplayRank: sortedByAirplay.findIndex(x => x.songId === e.songId) + 1,
          sales: e.salesVol,
          salesPct: salPct,
          salesRank: sortedBySales.findIndex(x => x.songId === e.songId) + 1,
          prevRank: e.prevRank,
          woc: e.woc,
          peak: e.peak,
          dominantMetric
        };
      });

      // Selected song details
      const selectedSongData = allSongsContext.find(s => songs.find(song => song.id === selectedEntry?.songId)?.title === s.title);

      const systemPrompt = `
You are the Data Investigator for SoundIntel BI, a Hot 100 industry projections dashboard.
You provide data-driven analysis using ONLY the actual data provided below. Never guess or make up numbers.

=== QUERY DETECTION RULES ===
1. If the user mentions a SPECIFIC SONG TITLE (like "Ordinary", "The Subway", etc.), find that song in the FULL CHART DATA below and analyze IT
2. If the user uses vague terms like "it", "the song", "this track", use the SELECTED SONG context
3. If the user asks for comparisons or rankings, use the FULL CHART DATA

=== CURRENT CONTEXT ===
Week: ${state.selectedWeek}
Currently Selected Song: "${selectedSongData?.title || 'None'}" by ${selectedSongData?.artist || 'Unknown'}

=== SELECTED SONG SUMMARY ===
${selectedSongData ? `
Rank: #${selectedSongData.rank} | Projected Chart Points: ${selectedSongData.points}
Streaming: ${selectedSongData.streaming.toLocaleString()} (${formatPct(selectedSongData.streamingPct)}) - Rank #${selectedSongData.streamingRank}
Airplay: ${selectedSongData.airplay.toLocaleString()} (${formatPct(selectedSongData.airplayPct)}) - Rank #${selectedSongData.airplayRank}
Sales: ${selectedSongData.sales.toLocaleString()} (${formatPct(selectedSongData.salesPct)}) - Rank #${selectedSongData.salesRank}
DOMINANT METRIC: ${selectedSongData.dominantMetric}
Previous: ${selectedSongData.prevRank === 0 ? 'NEW' : '#' + selectedSongData.prevRank} | WoC: ${selectedSongData.woc} | Peak: #${selectedSongData.peak}
` : 'No song selected'}

=== FULL CHART DATA (All ${allSongsContext.length} Songs) ===
${JSON.stringify(allSongsContext, null, 1)}

=== ANALYSIS RULES ===
1. ALWAYS use the actual data above - never invent numbers
2. Dominant metric = HIGHEST percentage share (streaming/airplay/sales)
3. "Streaming-driven" = streaming% > 60% | "Airplay-driven" = airplay% > 40% | "Balanced" = otherwise (only if all three percentages are provided)
4. If any mix percentage is missing (null), explicitly note that mix percentages are not available and avoid mix-based labels
5. When comparing songs, cite specific numbers
6. Use terminology: delta, metric distribution, consumption profile, trajectory
7. Peak refers to the highest rank the song has achieved on the chart historically
8. WoC refers to the number of weeks the song has been on the chart
9. +X/-X refers to the change in rank from the previous week

=== RESPONSE FORMAT (JSON only) ===
{
  "text": "Based on final industry predictions for the week of ${state.selectedWeek}, your analysis citing actual numbers...",
  "visual": {
    "type": "bar-chart",
    "title": "Chart Title",
    "data": [
      { "name": "Streaming", "value": <actual_number>, "color": "${GREEN}" },
      { "name": "Airplay", "value": <actual_number>, "color": "${BLUE}" },
      { "name": "Sales", "value": <actual_number>, "color": "${GOLD}" }
    ]
  },
  "rationale": "The projection suggests ... (explain findings)..."
}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: question,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json"
        }
      });

      const result = JSON.parse(response.text);
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: result.text,
        visual: result.visual,
        rationale: result.rationale,
        timestamp: new Date()
      };

      setAssistant(prev => ({ ...prev, messages: [...prev.messages, assistantMsg], loading: false }));
    } catch (err) {
      console.error(err);
      setAssistant(prev => ({ ...prev, loading: false, error: "Investigation failed. Ensure query relates to song/artist metrics." }));
    }
  };

  // Show loading spinner while data loads
  if (weeksLoading || dataLoading) {
    return <LoadingSpinner />;
  }

  // Show empty state if no weeks available
  if (availableWeeks.length === 0) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0c0c0c]">
        <div className="text-center p-8">
          <svg className="w-16 h-16 mx-auto mb-4 text-zinc-700\" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <p className="text-zinc-500 text-lg font-medium">No Chart Data Available</p>
          <p className="text-zinc-600 text-sm mt-2">Run the seed.sql script in Supabase to add chart data</p>
        </div>
      </div>
    );
  }

  // Show empty state if no entries for selected week
  if (currentEntries.length === 0 || !selectedEntry) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0c0c0c]">
        <div className="text-center p-8">
          <svg className="w-16 h-16 mx-auto mb-4 text-zinc-700\" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <p className="text-zinc-500 text-lg font-medium">No Data for {state.selectedWeek}</p>
          <p className="text-zinc-600 text-sm mt-2">Select a different week or add chart data for this week</p>
          <div className="mt-4">
            <select
              value={state.selectedWeek}
              onChange={(e) => setState(p => ({ ...p, selectedWeek: e.target.value }))}
              className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded px-3 py-2"
            >
              {availableWeeks.map(week => (
                <option key={week} value={week}>{week}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0c0c0c] text-[13px] font-normal tracking-tight text-zinc-300">

      {/* --- Main Dashboard --- */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <div className="flex h-[40vh] w-full border-b border-[#262626]">
          <div className="w-1/2 flex flex-col border-r border-[#262626] p-4 gap-4 overflow-hidden">
            <div className="grid grid-cols-3 gap-3 h-[25%] items-center">
              <FilterDropdown label="Chart Week" options={availableWeeks} value={state.selectedWeek} onChange={(v) => setState(p => ({ ...p, selectedWeek: v }))} />
              <FilterDropdown label="Artists" options={['All', ...artists.map(a => a.name)]} value={state.selectedArtist} onChange={(v) => setState(p => ({ ...p, selectedArtist: v, selectedSongId: '' }))} />
              <FilterDropdown label="Songs" options={[{ label: 'All', value: '' }, ...filteredSongs.map(s => ({ label: s.title, value: s.id }))]} value={state.selectedSongId} onChange={(v) => setState(p => ({ ...p, selectedSongId: v }))} />
            </div>
            <div className="grid grid-cols-8 gap-2 h-[25%]">
              <div className="col-span-4 bg-zinc-900/40 p-3 rounded-md border border-zinc-800 flex flex-col justify-center">
                <h2 className="text-xl font-bold truncate text-white leading-none mb-1">{selectedSong?.title}</h2>
                <p className="text-zinc-400 text-xs truncate">{selectedSong?.fullArtistName}</p>
              </div>
              <SummaryTile label="+/-" value={(selectedEntry.prevRank - selectedEntry.rank).toString()} />
              <SummaryTile label="WoC" value={selectedEntry.woc.toString()} />
              <SummaryTile label="Peak" value={selectedEntry.peak.toString()} />
              <SummaryTile
                label="EST. Units"
                value={formatValue(selectedEntry.points * 1000)}
                color="text-purple-400"
              />
            </div>
            <div className="grid grid-cols-7 gap-2 h-[25%]">
              <MetricTile label="EST. POINTS" value={selectedEntry.points.toString()} size="large" color={RED} />
              <MetricTile label="EST. STREAMS" value={formatValue(selectedEntry.streamingVol)} color={GREEN} />
              <MetricTile label="Share %" value={formatPct(selectedEntry.streamingPct)} color={GREEN} variant="sub" />
              <MetricTile label="EST. AIRPLAY" value={formatValue(selectedEntry.airplayVol)} color={BLUE} />
              <MetricTile label="Share %" value={formatPct(selectedEntry.airplayPct)} color={BLUE} variant="sub" />
              <MetricTile label="EST. SALES" value={formatValue(selectedEntry.salesVol)} color={GOLD} />
              <MetricTile label="Share %" value={formatPct(selectedEntry.salesPct)} color={GOLD} variant="sub" />
            </div>
            <div className="grid grid-cols-4 gap-2 h-[25%]">
              <RankingTile label="Projected Rank" value={selectedEntry.rank} color={RED} />
              <RankingTile label="Streaming Ranking" value={sortedByStreaming.findIndex(e => e.songId === selectedEntry.songId) + 1} color={GREEN} />
              <RankingTile label="Airplay Ranking" value={sortedByAirplay.findIndex(e => e.songId === selectedEntry.songId) + 1} color={BLUE} />
              <RankingTile label="Sales Ranking" value={sortedBySales.findIndex(e => e.songId === selectedEntry.songId) + 1} color={GOLD} />
            </div>
          </div>
          <div className="w-1/2 flex flex-col p-4 bg-zinc-900/20 overflow-hidden relative">
            <div className="flex justify-between items-center mb-4">
              <div className="flex flex-col">
                <h1 className="text-xl font-black uppercase tracking-widest text-zinc-100">SoundIntel BI</h1>
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Source: Talk of the Charts (Estimates)</span>
              </div>
              <button
                onClick={() => setPanelView('expanded')}
                className="flex items-center gap-2 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-sm transition-all border border-indigo-500/30 active:scale-95 shadow-lg shadow-indigo-500/10 self-center"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2l2.45 7.55L22 12l-7.55 2.45L12 22l-2.45-7.55L2 12l7.55-2.45L12 2z" />
                </svg>
                Launch Investigator
              </button>
            </div>
            <div className="flex-1 border border-zinc-800 rounded-md bg-[#141414] p-4 flex flex-col min-h-0">
              <SyncStackedBarList entries={sortedByPoints} songs={songs} selectedId={state.selectedSongId} onSelect={(id) => setState(p => ({ ...p, selectedSongId: id }))} />
            </div>
          </div>
        </div>

        <div className="flex-1 h-[60vh] p-4 grid grid-cols-4 gap-4 overflow-hidden">
          <div className="flex flex-col h-full bg-[#141414] border border-zinc-800 rounded-md p-4 overflow-hidden">
            <PanelHeader title="Hot 100 Points" />
            <SyncBarList entries={sortedByPoints} songs={songs} metric="points" color={RED} selectedId={state.selectedSongId} onSelect={id => setState(p => ({ ...p, selectedSongId: id }))} />
          </div>
          <div className="flex flex-col gap-4 overflow-hidden">
            <div className="flex-1 bg-[#141414] border border-zinc-800 rounded-md p-4 flex flex-col overflow-hidden">
              <PanelHeader title="Hot 100 Streams" />
              <SyncBarList entries={sortedByPoints} songs={songs} metric="streamingVol" color={GREEN} selectedId={state.selectedSongId} onSelect={id => setState(p => ({ ...p, selectedSongId: id }))} />
            </div>
            <div className="flex-1 bg-[#141414] border border-zinc-800 rounded-md p-4 flex flex-col overflow-hidden">
              <PanelHeader title="Streaming Leaders" />
              <SyncBarList entries={sortedByStreaming} songs={songs} metric="streamingVol" color={GREEN} selectedId={state.selectedSongId} onSelect={id => setState(p => ({ ...p, selectedSongId: id }))} useRank={false} />
            </div>
          </div>
          <div className="flex flex-col gap-4 overflow-hidden">
            <div className="flex-1 bg-[#141414] border border-zinc-800 rounded-md p-4 flex flex-col overflow-hidden">
              <PanelHeader title="Hot 100 Airplay" />
              <SyncBarList entries={sortedByPoints} songs={songs} metric="airplayVol" color={BLUE} selectedId={state.selectedSongId} onSelect={id => setState(p => ({ ...p, selectedSongId: id }))} />
            </div>
            <div className="flex-1 bg-[#141414] border border-zinc-800 rounded-md p-4 flex flex-col overflow-hidden">
              <PanelHeader title="Airplay Leaders" />
              <SyncBarList entries={sortedByAirplay} songs={songs} metric="airplayVol" color={BLUE} selectedId={state.selectedSongId} onSelect={id => setState(p => ({ ...p, selectedSongId: id }))} useRank={false} />
            </div>
          </div>
          <div className="flex flex-col gap-4 overflow-hidden">
            <div className="flex-1 bg-[#141414] border border-zinc-800 rounded-md p-4 flex flex-col overflow-hidden">
              <PanelHeader title="Hot 100 Sales" />
              <SyncBarList entries={sortedByPoints} songs={songs} metric="salesVol" color={GOLD} selectedId={state.selectedSongId} onSelect={id => setState(p => ({ ...p, selectedSongId: id }))} />
            </div>
            <div className="flex-1 bg-[#141414] border border-zinc-800 rounded-md p-4 flex flex-col overflow-hidden">
              <PanelHeader title="Sales Leaders" />
              <SyncBarList entries={sortedBySales} songs={songs} metric="salesVol" color={GOLD} selectedId={state.selectedSongId} onSelect={id => setState(p => ({ ...p, selectedSongId: id }))} useRank={false} />
            </div>
          </div>
        </div>
      </div>

      {/* --- Ask the Data Side Panel --- */}
      <div
        className={`fixed top-0 right-0 h-full z-[100] flex transition-all duration-300 transform shadow-2xl 
          ${panelView === 'hidden' ? 'translate-x-full' : 'translate-x-0'}
          w-[35vw]`}
      >
        {/* We keep the panel structure mounted to ensure the slide-out animation is visible */}
        <div className="flex-1 flex flex-col bg-[#141414] border-l border-zinc-800 shadow-[-20px_0_50px_rgba(0,0,0,0.6)]">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 backdrop-blur-sm">
            <div className="flex flex-col">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Ask the Data Investigator</h2>
              <span className="text-[9px] text-zinc-500 font-bold uppercase truncate max-w-[20vw]">{state.selectedWeek} • {selectedSong?.title}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setPanelView('hidden')} className="p-1.5 hover:bg-white/5 text-zinc-500 rounded-sm" title="Hide Panel">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
            {assistant.messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                <svg className="w-12 h-12 mb-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Ready for Investigation</p>
                <p className="text-[10px] mt-2 italic max-w-xs">Query metric deltas, rank fluctuations, or global performance drivers.</p>
              </div>
            )}
            {assistant.messages.map(msg => (
              <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start animate-in fade-in slide-in-from-bottom-2 duration-300'}`}>
                <div className={`max-w-[90%] p-4 rounded-lg text-[12px] leading-relaxed shadow-lg ${msg.role === 'user' ? 'bg-indigo-600 text-white font-medium' : 'bg-zinc-800/80 border border-zinc-700/50 text-zinc-200'}`}>
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                  {msg.visual && <AssistantVisual visual={msg.visual} />}
                  {msg.rationale && (
                    <div className="mt-4 pt-4 border-t border-white/5 opacity-50 text-[10px] font-mono leading-tight italic">
                      <span className="font-bold uppercase tracking-wider block mb-1 text-indigo-400">Investigation Rationale</span>
                      {msg.rationale}
                    </div>
                  )}
                </div>
                <span className="text-[8px] mt-2 text-zinc-600 uppercase font-black tracking-widest">{msg.timestamp.toLocaleTimeString()}</span>
              </div>
            ))}
            {assistant.loading && (
              <div className="flex items-center gap-3 p-4 bg-zinc-800/30 rounded-lg w-max border border-zinc-800/50 animate-pulse">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                </div>
                <span className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em]">Consulting BI Engine...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="px-4 py-3 flex flex-wrap gap-2 border-t border-zinc-800 bg-zinc-900/30">
            {["Explain rank drop", "Top streaming climbers", "Metrics correlation", "Cross-artist comparison"].map(chip => (
              <button key={chip} onClick={() => handleAsk(chip)} className="text-[9px] font-black uppercase tracking-tight bg-zinc-800/50 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 px-3 py-1.5 rounded-sm border border-zinc-700 transition-all active:scale-95">
                {chip}
              </button>
            ))}
          </div>

          <div className="p-4 bg-zinc-900 border-t border-zinc-800 shadow-2xl">
            <div className="relative">
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAsk(inputValue)}
                placeholder="Ask about metric deltas or rank drivers..."
                className="w-full bg-[#0c0c0c] border border-zinc-800 rounded-sm py-3 px-4 pr-12 text-[12px] focus:outline-none focus:border-indigo-500 transition-all"
              />
              <button onClick={() => handleAsk(inputValue)} disabled={assistant.loading || !inputValue.trim()} className="absolute right-2 top-2 p-2 text-zinc-600 hover:text-indigo-400 disabled:opacity-30">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7-7 7M5 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-[50] border-t border-zinc-800 bg-[#0c0c0c]/95 px-4 py-1 text-[9px] text-zinc-500 tracking-wide">
        Data provided by Talk of the Charts industry estimates. This platform is a portfolio project for educational purposes and is not affiliated with Billboard or Luminate.
      </div>
    </div>
  );
};

// --- Dashboard Tiles ---

const FilterDropdown = ({ label, options, value, onChange }: { label: string, options: any[], value: string, onChange: (v: string) => void }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{label}</label>
    <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-[#1f1f1f] border border-[#333] text-zinc-300 text-xs rounded-sm p-1.5 focus:outline-none focus:border-indigo-500 w-full appearance-none transition-colors">
      {options.map((opt, i) => {
        const val = typeof opt === 'string' ? opt : opt.value;
        const lab = typeof opt === 'string' ? opt : opt.label;
        return <option key={i} value={val}>{lab}</option>;
      })}
    </select>
  </div>
);

const SummaryTile = ({
  label,
  value,
  color = "text-zinc-300"
}: {
  label: string,
  value: string,
  color?: string
}) => (
  <div className="bg-[#141414] border border-[#262626] rounded-md p-3 flex flex-col justify-center items-center text-center hover:bg-zinc-800/50 transition-colors">
    <span className="text-[9px] font-bold text-zinc-600 uppercase leading-tight mb-1">
      {label}
    </span>
    <span className={`text-xl font-black leading-none ${color}`}>{value}</span>
  </div>
);

const MetricTile = ({ label, value, size = "small", color, variant = "main" }: { label: string, value: string, size?: "small" | "large", color: string, variant?: "main" | "sub" }) => (
  <div className={`flex flex-col justify-center p-2 border-r border-[#262626] last:border-r-0 ${variant === 'sub' ? 'opacity-50' : ''} hover:bg-white/2 transition-colors`}>
    <span className={`text-[9px] font-bold uppercase leading-tight mb-0.5`} style={{ color: variant === 'main' ? '#525252' : color }}>{label}</span>
    <span className={`${size === 'large' ? 'text-3xl' : 'text-lg'} font-black leading-none`} style={{ color }}>{value}</span>
  </div>
);

const RankingTile = ({ label, value, color }: { label: string, value: number, color: string }) => (
  <div className="flex flex-col justify-center items-center p-3 rounded-md border transition-all hover:scale-105" style={{ backgroundColor: color + '10', borderColor: color + '30' }}>
    <span className="text-[28px] font-black leading-none mb-1" style={{ color }}>{value}</span>
    <span className="text-[9px] font-bold uppercase tracking-wider text-center" style={{ color: color + 'AA' }}>{label}</span>
  </div>
);

const PanelHeader = ({ title }: { title: string }) => (
  <h3 className="text-[10px] font-black uppercase text-zinc-500 border-b border-zinc-800 pb-2 mb-3 tracking-[0.2em]">{title}</h3>
);

export default App;
