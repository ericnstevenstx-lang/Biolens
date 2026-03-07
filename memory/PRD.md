# BioLens - Product Requirements Document

## Original Problem Statement
Build a public web app called BioLens. A consumer-facing tool that helps people understand what everyday products are made from and whether those products are petroleum-based, plant-based, or transition materials.

## Architecture
- **Backend**: FastAPI (Python) with static rules-based material database
- **Frontend**: React with Tailwind CSS + Shadcn UI components
- **Database**: MongoDB (search analytics tracking)
- **No authentication** - fully public app

## User Personas
- General consumers wanting to understand product materials
- Eco-conscious shoppers seeking material transparency
- Educators teaching about materials and sustainability

## Core Requirements (Static)
1. Product search → material classification
2. Petro-risk level assessment (High/Medium/Low)
3. Material explanation in plain language
4. Better material alternatives suggestions
5. Explore Materials library with filtering
6. How It Works educational page

## What's Been Implemented (Feb 2026)
- [x] Homepage with hero, search bar, rotating placeholders, example chips, 3 explainer cards, dark CTA section
- [x] Results page with material classification, risk badges, explanation, alternatives, "Find Better Materials" CTA
- [x] How It Works page with 4-step visual process
- [x] Explore Materials page with bento grid, category filters (6 filters), 26 materials
- [x] Glassmorphism navbar with mobile hamburger menu
- [x] Dark footer with navigation and about sections
- [x] Backend: 26 materials database, 70+ product-to-material mappings, search analytics
- [x] API endpoints: POST /api/search, GET /api/materials, GET /api/materials/{slug}, GET /api/search/popular
- [x] Bamboo rayon correctly classified as Transition Material (not plant-based)
- [x] Premium Apple/Dyson aesthetic with Playfair Display + Inter fonts
- [x] Color scheme: off-white bg, charcoal text, copper accent, graphite dark panels

## Prioritized Backlog
### P0 (Critical)
- None - MVP complete

### P1 (High)
- Connect to FiberFoundry when ready
- Add more product-to-material mappings
- Search autocomplete/suggestions dropdown

### P2 (Medium)
- Material detail pages (dedicated routes per material)
- Search history / popular searches display
- Share results functionality
- SEO meta tags per page

## Next Tasks
1. Expand product mapping database (more consumer products)
2. Add material detail pages with deeper content
3. Implement search autocomplete
4. Add social sharing for results
5. Connect FiberFoundry CTA when API is available
