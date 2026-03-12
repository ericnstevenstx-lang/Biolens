# BioLens - Product Requirements Document

## Original Problem Statement
Build BioLens - a consumer-facing material intelligence tool connected to Supabase backend. Users search/scan products to see petrochemical dependency via petroload scores, material classification, and better alternatives.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI + @supabase/supabase-js
- **Backend**: FastAPI (barcode proxy + static materials for Explore page)
- **Database**: Supabase (search_biolens_scan RPC) + MongoDB (analytics)
- **Barcode**: react-zxing (ZXing) → Backend proxy → UPCitemdb/Open Food Facts
- **Share**: html2canvas (client-side) + Web Share API

## Core Requirements
1. Product search → Supabase search_biolens_scan() → material classification
2. Petroload score visualization (0-100 arc gauge)
3. Confidence labels (Verified/Strong Match/Likely Match/Needs Review)
4. Better alternatives with replacement reasons
5. Barcode scanning via phone camera
6. Shareable scan cards (PNG download + native share + Instagram Story format)
7. Explore Materials library with category filtering

## What's Been Implemented (Feb 2026)
### V1 (Static Rules)
- [x] Homepage, Results, How It Works, Explore Materials pages
- [x] Static rules database with 26 materials and 70+ product mappings
- [x] Premium Apple/Dyson aesthetic with Playfair Display + Inter fonts

### V2 (Supabase Integration)
- [x] Supabase RPC integration (search_biolens_scan)
- [x] Petroload arc gauge meter (0-100 scale, color-coded)
- [x] Confidence score → label conversion
- [x] Barcode scanner (ZXing react-zxing library)
- [x] Backend barcode lookup proxy (UPCitemdb → Open Food Facts fallback)
- [x] Share This Scan modal with html2canvas
- [x] Web Share API (mobile) + Download + Instagram Story format
- [x] Grouped alternatives with replacement reasons from Supabase
- [x] Scan Product button on homepage
- [x] Updated example searches (poly hoodie, bamboo sheets, pet bottle, etc.)

## Prioritized Backlog
### P0 - None (MVP complete)
### P1 (High)
- Purchase Impact Layer (future phase)
- Connect to FiberFoundry
- GS1 direct API integration (replace trial APIs)
### P2 (Medium)
- Search history / recent scans
- Material comparison tool
- SEO meta tags per result
- Progressive Web App (PWA) for mobile install

## Next Tasks
1. Purchase Impact Layer (economic impact of buying better materials)
2. Direct GS1 API key for production barcode lookups
3. Search autocomplete from Supabase
4. PWA configuration for mobile home screen install
