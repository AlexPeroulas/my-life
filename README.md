# My Life RPG

A life stat tracker that turns everyday activities into RPG-style stats. Log what you did, and an LLM decides which areas of your life it improves: Fitness, Mind, Nutrition, Nature, and more. Stats slowly decay over time, so staying balanced takes consistency.

**Live:** https://euphonious-pothos-4ef000.netlify.app


<img width="826" height="1210" alt="image" src="https://github.com/user-attachments/assets/9506064e-618c-48f8-8cca-0e22b51428bd" />
<img width="752" height="1418" alt="image" src="https://github.com/user-attachments/assets/dccfe623-f714-47d8-9944-17c5be901a55" />
<img width="830" height="1360" alt="image" src="https://github.com/user-attachments/assets/4912cefe-0fa6-47a8-be7b-1cce4f54156b" />
<img width="748" height="1198" alt="image" src="https://github.com/user-attachments/assets/f02a46ae-5194-48a5-8ba7-f53a938e56da" />


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
