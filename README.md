# SoundIntel BI

## Overview

**SoundIntel BI** is a professional-grade music analytics dashboard that provides real-time industry projections for the Billboard Hot 100. Built as part of my **MS in Information Systems** at Georgia State University, the tool focuses on visualizing the **Performance Mix** of top-performing tracks and leverages an AI-powered **Investigator** to provide qualitative rationales for chart movement.

## Key Features

- **Predictive Analytics Engine:** Visualizes industry-standard estimates (Streaming, Airplay, and Sales) to project Hot 100 rankings before official publication.
- **Ask the Data Investigator:** A custom AI side-panel that analyzes song metrics to explain the “why” behind the numbers (e.g., why a song has a high Airplay-to-Streaming ratio).
- **100% Stacked Composition Charts:** “Performance Mix” visualizations that break down a song’s STR, AIR, and SAL shares.
- **Interactive BI Interface:** A high-contrast, dark-mode dashboard with vibrant purple/emerald accents for maximum data legibility.

## The Data Story

> **“Turning Estimates into Insights”**
> Due to the proprietary nature of official Luminate/Billboard data, SoundIntel BI utilizes a robust ETL pipeline to ingest publicly available industry estimates from sources like **@talkofthecharts**. This project demonstrates my ability to build high-fidelity BI tools using proxy data and predictive modeling.

## Technical Stack

- **Frontend:** React + Vite with Tailwind-style utility classes for the UI.
- **Intelligence:** Gemini API (or OpenAI) powering the Investigator persona.
- **Architecture:** Serverless-friendly setup optimized for high-density data visualizations.

## Portfolio Narrative

This project highlights my skills as a **Technical Product Manager** and **AI Engineer**. It showcases my capacity to:

1. Design complex Information Systems with a focus on user hierarchy.
2. Implement AI as a core functional feature rather than a gimmick.
3. Maintain data integrity and transparency through professional labeling and disclosures.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in `/.env.local`
3. Run the app:
   `npm run dev`
# SoundIntel-BI
