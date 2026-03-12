# BioLens — Product Requirements Document

## Problem Statement
Build a public web app called **BioLens** that helps consumers understand the material composition of everyday products, classifying them as petroleum-based, plant-based, etc., and providing a "Petroload" score. The app integrates with a live **FiberFoundry** demo catalog to recommend verified, sustainable alternatives.

## Tech Stack
- **Frontend:** React, Tailwind CSS, react-router-dom, Supabase JS client
- **Backend:** FastAPI (Python), MongoDB (analytics), Supabase (data source)
- **BaaS:** Supabase (RPC functions, views, tables)
- **Barcode:** @zxing/library, backend provider cascade (UPCitemdb, Open Food Facts, GS1)
- **PWA:** Service Worker, Web App Manifest

## Core Features
1. Search/Scan products → Material analysis via `search_biolens_scan_enriched()`
2. Petroload Score + Material Health Score
3. Risk Signals (pesticide, herbicide, fertilizer, processing chemicals)
4. Better Alternatives (material-level)
5. Where to Buy (FiberFoundry-first product cards with transparency/trust/petroload scores)
6. Purchase Impact (estimated metrics)
7. Global Impact Counters on homepage
8. Search Autocomplete via `search_biolens_autocomplete()` RPC
9. Barcode Scanning with 3-step cache cascade
10. Scan History (localStorage)
11. Shareable Scan Card (html2canvas)
12. PWA installability

## Architecture
```
Frontend (React) → Supabase (RPC/views) for all business logic
Frontend (React) → Backend (FastAPI) only for barcode resolution
Backend → Supabase (product_barcodes, product_barcode_cache) → External providers
```

## Supabase Functions Used (LIVE)
- `search_biolens_scan_enriched(user_query text)` — Primary scan
- `search_biolens_autocomplete(user_query text, p_limit integer)` — Autocomplete
- `get_best_alternative_products_for_query(user_query text, p_limit integer)` — Product alternatives
- `get_product_purchase_sources(p_product_id uuid)` — Purchase links
- `get_global_impact_counters()` — Sitewide stats

## Purchase Redirection Rules
- If FiberFoundry has matching alternative → show ONLY FiberFoundry products (exclusive placement)
- If no FiberFoundry match → show up to 3 trusted external sources
- No price hunting, comparison shopping, or marketplace clutter

## What's Implemented (as of March 12, 2026)
- [x] V1 MVP — static rules engine
- [x] V2 Supabase Integration — search_biolens_scan_enriched
- [x] V3 Bug fixes + Scan History
- [x] V4 Purchase Impact, Autocomplete, PWA, Barcode abstraction
- [x] V5 Final FiberFoundry Integration — all Supabase RPCs live, Where to Buy section, Risk Signals, Global Impact Counters, autocomplete via RPC, barcode cascade with Supabase cache

## Backlog
- P1: Product comparison (side-by-side petroload scores)
- P2: Offline material cache for common queries
- P2: Production GS1 barcode provider key swap
