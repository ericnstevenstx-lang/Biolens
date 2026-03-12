# BioLens - Product Requirements Document

## Original Problem Statement
Build BioLens - a consumer-facing material intelligence tool connected to Supabase backend using search_biolens_scan_enriched() RPC.

## Architecture
- **Frontend**: React + Tailwind + @supabase/supabase-js (direct RPC calls)
- **Backend**: FastAPI (barcode proxy + static materials for Explore)
- **Database**: Supabase (search_biolens_scan_enriched RPC) + MongoDB (analytics)
- **Barcode**: react-zxing → Backend proxy → UPCitemdb/Open Food Facts
- **Share**: html2canvas + Web Share API
- **History**: localStorage (client-side)

## What's Been Implemented (Feb-Mar 2026)
### V1 - Static Rules MVP
- Homepage, Results, How It Works, Explore Materials
- Static rules DB (26 materials, 70+ product mappings)

### V2 - Supabase Integration
- search_biolens_scan RPC integration
- Petroload arc gauge, confidence labels, barcode scanning
- Shareable scan cards (png/story download)

### V3 - Bug Fix + Enriched + History (Current)
- Fixed body-stream-already-read error (single response read pattern)
- Switched to search_biolens_scan_enriched() RPC
- Rows grouped by material_id before rendering
- Added overall_material_health_score display (progress bar)
- Added Scan History (localStorage, max 20 items, horizontal scroll)
- History shows material class badge, petroload, timestamp
- Clear history button

## Backlog
### P1
- Purchase Impact Layer (economic impact)
- FiberFoundry connection
- Production GS1 API key
### P2
- Search autocomplete
- Material comparison tool
- PWA for mobile install
- SEO meta tags per result
