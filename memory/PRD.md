# BioLens — Product Requirements Document

## Problem Statement
BioLens helps consumers understand the material composition of everyday products, classifying them as petroleum-based, plant-based, etc., and providing a "Petroload" score. The experience is a material intelligence tool, not a shopping app.

## Tech Stack
- **Frontend:** React, Tailwind CSS, react-router-dom, Supabase JS client
- **Backend:** FastAPI (Python), MongoDB (analytics), Supabase (data source)
- **BaaS:** Supabase (RPC functions, views, tables)
- **Barcode:** @zxing/library, backend provider cascade
- **PWA:** Service Worker, Web App Manifest

## Design System
- **Style:** Industrial minimalism, Apple-meets-Bloomberg
- **Headlines/Metrics:** Manrope (400-800)
- **Body:** Inter (300-600)
- **Background:** Warm off-white (#F5F5F7)
- **Accent:** Burnt orange (#B45309)
- **Petroload Spectrum:** 0-25 green (#22C55E), 25-50 yellow (#EAB308), 50-75 orange (#F97316), 75-100 red (#EF4444)

## Pages & Layout

### Homepage
1. Hero headline + subheadline
2. Search bar + Scan Product button
3. Example search chips (clickable, auto-run)
4. Recent searches (localStorage)
5. Large example scan card (Polyester Hoodie, Petroload 95)
6. Trust counters (Products Analyzed / Materials Mapped / High Petro-Risk Flags)
7. 4-step "How BioLens Works" strip
8. Global Impact counters (Supabase live, if data > 0)
9. CTA to Explore Materials
10. Floating mobile scan button

### Results Page (7 Sections)
1. **Product Scanned** — Name, Material Classification, badges (category, risk, confidence tier)
2. **Petroload Score Panel** — Gauge + 3 supporting metrics (Petro Dependence, Microplastic Risk, Bio-Replacement Potential)
3. **Material DNA** — Animated donut chart (Petroleum/Natural/Semi-Synthetic segments with hover)
4. **Product Comparison** — "This Product vs Better Option" with bullet points
5. **Material Analysis** — Material Identified, Why It Matters, Common Concerns, Health Score, Risk Signals
6. **Better Material Paths** — Up to 3 alternative material tiles
7. **How BioLens Scored This** — Expandable trust section (Material Match, Petrochemical Dependency, Category Weighting, Replacement Pathway)
- Plus: Better Product Examples (FiberFoundry plumbing intact, "coming soon" UI), Purchase Impact

### Explore Materials
- Material library with Petroload/Health scores per card
- 6 category filters (All, Petro-Based, Plant-Based, Transition, Natural, Mineral)

### How It Works
- Step-by-step process explanation

## Confidence Tiers
- High Confidence (score >= 0.95)
- Moderate Confidence (score >= 0.85)
- Estimated Profile (score >= 0.70)
- Preliminary Match (score < 0.70)

## Material Classification Rules
- Petroleum-based: polyester, nylon, acrylic, polyurethane, PVC
- Semi-synthetic: rayon, viscose, lyocell, bamboo viscose
- Natural fibers: hemp, cotton, linen, wool
- Bamboo apparel → semi-synthetic unless verified mechanically processed
- Only verified hemp → fully bio-based and petro-free

## Supabase Functions (LIVE)
- `search_biolens_scan_enriched(user_query text)`
- `search_biolens_autocomplete(user_query text, p_limit integer)`
- `get_best_alternative_products_for_query(user_query text, p_limit integer)`
- `get_product_purchase_sources(p_product_id uuid)`
- `get_global_impact_counters()`

## Purchase Redirection Rules (plumbing intact, UI is "coming soon")
- FiberFoundry exclusive → external fallback (up to 3)
- No marketplace clutter

## What's Implemented
- [x] V1 MVP — static rules engine
- [x] V2 Supabase Integration
- [x] V3 Bug fixes + Scan History
- [x] V4 Purchase Impact, Autocomplete, PWA, Barcode abstraction
- [x] V5 FiberFoundry Integration (all Supabase RPCs live)
- [x] V6 UI/UX Overhaul — Manrope typography, petroload color spectrum, example scan card, split comparison card, material library
- [x] V7 Complete UI/UX Upgrade — Material DNA visualization, 7-section results layout, trust counters, recent searches, confidence tiers, product vs material name separation, How BioLens Works strip, expandable scoring explainer, comparison with bullet points, share card with DNA info

## Backlog
- P1: Activate FiberFoundry store UI when ready (plumbing exists)
- P1: Product comparison (side-by-side petroload scores, standalone page)
- P2: Offline material cache
- P2: Production GS1 barcode provider key swap
- P2: Update Supabase material aliases to map "vegan leather" → "Polyurethane"
