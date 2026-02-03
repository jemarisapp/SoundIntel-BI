// TypeScript types for Supabase database
// This file is auto-generated but can be manually maintained

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            artists: {
                Row: {
                    id: string
                    name: string
                    metadata: Json
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    metadata?: Json
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    metadata?: Json
                    created_at?: string
                    updated_at?: string
                }
            }
            songs: {
                Row: {
                    id: string
                    title: string
                    release_date: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    title: string
                    release_date?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    title?: string
                    release_date?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            song_artists: {
                Row: {
                    song_id: string
                    artist_id: string
                    display_order: number
                }
                Insert: {
                    song_id: string
                    artist_id: string
                    display_order?: number
                }
                Update: {
                    song_id?: string
                    artist_id?: string
                    display_order?: number
                }
            }
            chart_entries: {
                Row: {
                    id: string
                    song_id: string
                    chart_week: string
                    rank: number
                    points: number
                    streaming_vol: number
                    airplay_vol: number
                    sales_vol: number
                    prev_rank: number | null
                    weeks_on_chart: number
                    peak_position: number | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    song_id: string
                    chart_week: string
                    rank: number
                    points: number
                    streaming_vol?: number
                    airplay_vol?: number
                    sales_vol?: number
                    prev_rank?: number | null
                    weeks_on_chart?: number
                    peak_position?: number | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    song_id?: string
                    chart_week?: string
                    rank?: number
                    points?: number
                    streaming_vol?: number
                    airplay_vol?: number
                    sales_vol?: number
                    prev_rank?: number | null
                    weeks_on_chart?: number
                    peak_position?: number | null
                    created_at?: string
                }
            }
        }
        Views: {
            song_details: {
                Row: {
                    id: string
                    title: string
                    release_date: string | null
                    artist_names: string[]
                    full_artist_name: string
                }
            }
        }
        Functions: {
            get_chart_data: {
                Args: {
                    week_date: string
                }
                Returns: {
                    entry_id: string
                    song_id: string
                    title: string
                    full_artist_name: string
                    rank: number
                    points: number
                    streaming_vol: number
                    airplay_vol: number
                    sales_vol: number
                    prev_rank: number | null
                    weeks_on_chart: number
                    peak_position: number | null
                }[]
            }
        }
    }
}
