# SoundIntel BI

## Overview

**SoundIntel BI** is a professional-grade music analytics dashboard that breaks down weekly industry projections for the Billboard Hot 100. Built as part of my **MS in Information Systems** at Georgia State University, the tool focuses on visualizing the **Performance Mix** of top-performing tracks and leverages an AI-powered **Investigator** to provide qualitative rationales for chart movement.

## Key Features

- **Predictive Analytics Engine:** Visualizes industry-standard estimates (Streaming, Airplay, and Sales) to project Hot 100 rankings before official publication.
- **Ask the Data Investigator:** A custom AI side-panel that analyzes song metrics to explain the “why” behind the numbers (e.g., why a song has a high Airplay-to-Streaming ratio).
- **100% Stacked Composition Charts:** “Performance Mix” visualizations that break down a song’s STR, AIR, and SAL shares.
- **Interactive BI Interface:** A high-contrast, dark-mode dashboard with vibrant purple/emerald accents for maximum data legibility.

## The Data Story

> **“Turning Estimates into Insights”**
> Due to the proprietary nature of official Luminate/Billboard data, SoundIntel BI loads publicly available weekly industry estimates from sources like **@talkofthecharts** through a CSV ingestion script that matches each new week to the artists and songs already in the database. This project demonstrates my ability to build high-fidelity BI tools using proxy data and predictive modeling.

## Technical Stack

- **Frontend:** React + Vite + TypeScript, with Recharts for the visualizations.
- **Data:** Supabase (PostgreSQL) with tables for artists, songs, song_artists (features) and weekly chart_entries. Row-level security allows public reads only.
- **Intelligence:** OpenAI (default model `gpt-6-luna`) powering the Data Investigator, called from a serverless function.
- **Hosting:** Vercel.

## Security

- The OpenAI key lives only in Vercel environment variables and is used by `api/investigate.ts`. It never reaches the browser.
- The Investigator endpoint loads chart data on the server and only accepts a question (up to 500 characters), a week, and an optional song, so it can't be used as a general AI proxy. It has a basic per-IP rate limit.
- The browser only has the Supabase anon key, which can read but not write.
- The data-entry scripts write with `SUPABASE_SERVICE_KEY`, which stays in your local `.env.local` and must never be added to Vercel or prefixed with `VITE_`.

## Portfolio Narrative

This project highlights my skills as a **Technical Product Manager** and **AI Engineer**. It showcases my capacity to:

1. Design complex Information Systems with a focus on user hierarchy.
2. Implement AI as a core functional feature rather than a gimmick.
3. Maintain data integrity and transparency through professional labeling and disclosures.

## Run Locally

**Prerequisites:** Node.js and the Vercel CLI (`npm i -g vercel`)

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and fill in your values
3. Run the app with the Investigator: `npm run dev:full` (this runs `vercel dev`, which serves both the site and `api/investigate.ts`)

`npm run dev` still works for the dashboard alone, but the Investigator needs `vercel dev` or a deployment.

## Deploy

In Vercel, set `OPENAI_API_KEY`, `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under Project Settings > Environment Variables, remove the old `GEMINI_API_KEY`, then redeploy.
