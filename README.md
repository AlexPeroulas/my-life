# My Life RPG

A life stat tracker that turns everyday activities into RPG-style stats. Log what you did, and an LLM decides which areas of your life it improves: Fitness, Mind, Nutrition, Nature, and more. Stats slowly decay over time, so staying balanced takes consistency.

**Live:** https://euphonious-pothos-4ef000.netlify.app

![Screenshot](screenshot.png)

## How it works
- Log an activity in plain English, like "went on a 10 mile hike"
- A Netlify serverless function sends it to an LLM (Groq), which maps it to the stats it affects (a hike restores Fitness and Nature)
- Stats are stored per user in Supabase and decay over time if you stop working on them

## Built with
- JavaScript, Vite
- Supabase (auth + Postgres)
- Netlify (hosting + serverless functions)
- Groq API (LLM activity classification)

## Running locally
1. `npm install`
2. Copy `.env.example` to `.env` and add your Supabase and Groq keys
3. Run `supabase-setup.sql` in your Supabase project
4. `npm run dev`
