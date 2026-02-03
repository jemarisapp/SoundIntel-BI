
export interface Artist {
  id: string;
  name: string;
  metadata?: string;
}

export interface Song {
  id: string;
  title: string;
  artistIds: string[];
  fullArtistName: string;
  releaseDate: string;
}

export interface ChartEntry {
  songId: string;
  chartWeek: string;
  rank: number;
  points: number;
  streamingVol: number;
  streamingPct: number | null;
  airplayVol: number;
  airplayPct: number | null;
  salesVol: number;
  salesPct: number | null;
  prevRank: number;
  woc: number;
  peak: number;
}

export interface DashboardState {
  selectedWeek: string;
  selectedArtist: string;
  selectedSongId: string;
}

export interface VisualComponent {
  type: 'bar-chart' | 'table' | 'line-chart';
  data: any[];
  title?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  visual?: VisualComponent;
  rationale?: string;
  timestamp: Date;
}

export interface AssistantState {
  messages: Message[];
  loading: boolean;
  error: string | null;
}
