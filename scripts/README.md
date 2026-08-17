# CityMind Tripoli Scripts

This directory contains local development, seed, and import scripts.

Use `pnpm dev:local` from the repository root to start a matched API and web
pair without guessing ports. The script frees the preferred API and web ports
(`8100` and `3100`) by stopping whichever local process is listening there,
injects `NEXT_PUBLIC_API_URL` for the frontend, and prints the final URLs.

Phase 1 intentionally does not add OSM import, database seed, simulation, or AI
scripts. Those arrive in later Waterfall phases.
