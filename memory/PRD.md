# BioLens — Product Requirements Document

## Problem Statement
BioLens helps consumers understand the material composition of everyday products, classifying them as petroleum-based, plant-based, etc., and providing a "Petroload" score.

## Tech Stack
- **Frontend:** React, Tailwind CSS, react-router-dom, Supabase JS client
- **Backend:** FastAPI (Python), MongoDB (analytics), Supabase (data source)
- **BaaS:** Supabase (RPC functions, views, tables)
- **Barcode:** @zxing/library, backend provider cascade
- **PWA:** Service Worker, Web App Manifest

## Design System
- **Headlines/Metrics:** Manrope (400-800)
- **Body:** Inter (300-600)
- **Background:** Warm off-white (#F5F5F7)
- **Accent:** Burnt orange (#B45309)
- **Petroload Spectrum:** 0-25 green (#22C55E), 25-50 yellow (#EAB308), 50-75 orange (#F97316), 75-100 red (#EF4444)
- **Hero:** 48-60px, Section titles: 24px, Body: 16px, Metrics: 36-48px

## Pages & Layout
1. **Homepage:** Hero + search + example scan card + global impact counters + scan history + explainer cards + CTA + floating mobile scan button
2. **Results Page:** 3-layer layout: Product Scanned (gauge) → Material Analysis (health/risk) → Split Comparison Card → Better Materials → Better Product Examples (placeholder) → Purchase Impact
3. **Explore Materials:** Material library with petroload/health scores, category filters
4. **How It Works:** Step-by-step process explanation

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
- [x] V6 UI/UX Overhaul — Manrope typography, petroload color spectrum, example scan card, split comparison card, material library, floating mobile scan button

## Backlog
- P1: Activate FiberFoundry store UI when ready (plumbing exists)
- P1: Product comparison (side-by-side petroload scores)
- P2: Offline material cache
- P2: Production GS1 barcode provider key swap
