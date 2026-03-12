# BioLens - Product Requirements Document

## Architecture
- **Frontend**: React + Tailwind + @supabase/supabase-js + html2canvas + react-zxing
- **Backend**: FastAPI (barcode provider proxy + static materials for Explore)
- **Database**: Supabase (search_biolens_scan_enriched RPC, materials, material_aliases) + MongoDB (analytics)
- **Barcode**: react-zxing → Backend GS1-ready proxy → UPCitemdb/OpenFoodFacts/GS1
- **Share**: html2canvas + Web Share API + Instagram Story download
- **History**: localStorage
- **PWA**: manifest.json + service worker + install prompt

## What's Implemented
### V1 - Static Rules MVP
- Homepage, Results, How It Works, Explore Materials
### V2 - Supabase + Barcode + Share
- search_biolens_scan RPC, Petroload gauge, barcode scanning, share cards
### V3 - Enriched + History
- search_biolens_scan_enriched(), Material Health Score, Scan History
### V4 - Full Feature Set (Current)
- Purchase Impact Layer (4 stats: petro cost, jobs multiplier, carbon proxy, microplastic shedding)
- GS1-ready barcode lookup with provider abstraction (env: BARCODE_PROVIDER, GS1_API_KEY, GS1_BASE_URL)
- Search autocomplete from Supabase materials + aliases tables (position:fixed dropdown, keyboard + click)
- PWA install (manifest.json, sw.js, install prompt, shell caching)

## Env Vars Added
- Frontend: REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_ANON_KEY
- Backend: BARCODE_PROVIDER, GS1_API_KEY, GS1_BASE_URL

## Files Changed (V4)
- `/app/frontend/src/lib/impact.js` (NEW)
- `/app/frontend/src/components/PurchaseImpact.js` (NEW)
- `/app/frontend/src/components/InstallPrompt.js` (NEW)
- `/app/frontend/public/manifest.json` (NEW)
- `/app/frontend/public/sw.js` (NEW)
- `/app/frontend/public/icon-192.png` (NEW)
- `/app/frontend/public/icon-512.png` (NEW)
- `/app/frontend/src/components/SearchBar.js` (UPDATED - autocomplete)
- `/app/frontend/src/pages/ResultsPage.js` (UPDATED - PurchaseImpact)
- `/app/frontend/src/App.js` (UPDATED - InstallPrompt)
- `/app/frontend/public/index.html` (UPDATED - PWA meta tags)
- `/app/backend/server.py` (UPDATED - GS1 provider abstraction)
- `/app/backend/.env` (UPDATED - new env vars)

## Backlog
### P1
- FiberFoundry integration
- Production GS1 API key
### P2
- Material comparison side-by-side
- SEO meta tags per result
- Offline search cache for common materials
