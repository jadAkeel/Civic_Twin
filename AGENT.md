# AGENT.md
# CityMind Tripoli - AI Assistant Operating Guide

## 1. Project Identity

Project name: CityMind Tripoli

CityMind Tripoli is an AI-powered Urban Digital Twin and municipal intelligence platform built specifically for Tripoli, Lebanon.

The project is not a generic smart city demo. It is a Tripoli-focused platform that starts from real city pain points and grows into a decision-support system for citizens, municipalities, planners, and judges in the Sustainable Cities & Mobility track.

Core sentence:

> CityMind Tripoli helps Tripoli understand, monitor, predict, and simulate urban problems before real-world decisions are made.

## 2. Non-Negotiable Rules For The AI Assistant

Any AI coding assistant working on this repository must follow these rules:

1. Always keep the project focused on Tripoli, Lebanon.
2. Do not turn the project into a generic smart city platform.
3. Build in waterfall phases, but keep the architecture ready for microservices.
4. Every feature must have: UI, API, database model, mock/real data, and acceptance criteria.
5. Start with working deterministic logic, then replace modules with AI, GIS, routing, and simulation engines.
6. The source of truth is PostgreSQL + PostGIS.
7. All map-based data must be geospatially modeled.
8. The assistant must not invent final real-world numbers. Demo seed values are allowed, but they must be marked as demo data.
9. Ask Your City must answer from platform data only, not from uncontrolled general chat.
10. Scenario Simulator is the main differentiator and must be designed carefully from the beginning.

## 3. Build Methodology: Waterfall With Expandable Services

This project must be built using a waterfall-style plan:

Phase 0 - Documentation and planning
Phase 1 - Foundation and infrastructure
Phase 2 - Core city data model
Phase 3 - Citizen reporting
Phase 4 - City dashboard and map
Phase 5 - Green Score and walkability
Phase 6 - Mobility and routing
Phase 7 - Scenario Simulator v1
Phase 8 - Prediction and City Guardian
Phase 9 - Ask Your City assistant
Phase 10 - Admin and municipal workflow
Phase 11 - Advanced simulation and digital twin
Phase 12 - Production hardening and demo polish

Important: The first implementation may be a modular monolith, but the code boundaries must match future microservices.

## 4. Main Product Modules

### 4.1 Smart Reporter
Citizen reporting for:
- Potholes
- Garbage accumulation
- Broken sidewalks
- Broken street lights
- Water leakage
- Illegal dumping
- Road obstacles
- Unsafe crossings
- Accessibility barriers

Must include:
- Image upload
- Location selection on map
- AI category suggestion
- Severity score
- Duplicate detection
- Ticket status tracking
- Municipality assignment

Reference:
https://github.com/mysociety/fixmystreet

### 4.2 City Pulse Dashboard
Municipal operations dashboard showing:
- Active issues
- Open vs resolved tickets
- Highest-risk neighborhoods
- Green Score by neighborhood
- Waste hotspots
- Traffic hotspots
- Walkability gaps
- Response time KPIs
- Scenario recommendations

Reference:
https://github.com/disit/snap4city

### 4.3 Interactive Tripoli Map
The central user interface for the city.

Layers:
- Reports
- Neighborhood boundaries
- Road segments
- Sidewalk quality
- Green Score
- Waste hotspots
- Traffic hotspots
- Air quality
- Heat risk
- Scenario changes

Reference data source:
https://www.openstreetmap.org

### 4.4 Green Score Engine
A neighborhood score from 0 to 100.

Initial formula:
- 30% air quality
- 25% green coverage
- 20% waste cleanliness
- 15% walkability
- 10% heat comfort

Each score must be explainable.

### 4.5 Smart Mobility
Mobility features:
- Fastest walking route
- Greenest route
- Safest route
- Accessible route
- Bike-friendly route
- School-safe route
- Least polluted route

References:
https://github.com/opentripplanner/OpenTripPlanner
https://github.com/AccessMap
https://github.com/OpenSidewalks/OpenSidewalks-Schema

### 4.6 City Guardian Prediction Engine
Predictive engine for:
- Traffic congestion risk
- Waste accumulation risk
- Infrastructure failure risk
- Heat stress risk
- Repeated street issue risk
- Service pressure by neighborhood

Start with rule-based predictions, then add ML models.

### 4.7 Urban Digital Twin
Unified city model for:
- Neighborhoods
- Roads
- Road segments
- Buildings
- Sidewalks
- Parks
- Waste assets
- Lights
- Sensors
- Reports
- Scenarios
- Predictions

References:
https://github.com/FIWARE/context.Orion-LD
https://github.com/eclipse-ditto/ditto

### 4.8 Urban Scenario Simulator
The most important module.

Scenario actions:
- Add trees
- Add bike lane
- Add bus stop
- Improve waste collection
- Pedestrianize street
- Change traffic direction
- Close street temporarily
- Add public park
- Improve sidewalk
- Add lighting
- Add safe crossing
- Add school street

Outputs:
- Green Score delta
- Temperature delta
- Air quality delta
- Walkability delta
- Traffic delta
- Pollution delta
- Accessibility delta
- Cost estimate
- Implementation time
- Risk level
- Confidence level
- Recommendation card

References:
https://github.com/a-b-street/abstreet
https://github.com/eclipse-sumo/sumo
https://github.com/matsim-org/matsim-libs
https://github.com/UDST/urbansim

### 4.9 Ask Your City
AI assistant connected to the city database.

Example questions:
- Which neighborhood needs trees first?
- Where is waste accumulation most likely tomorrow?
- Which street should the municipality repair first?
- What is the best intervention for El Tal?
- What scenario improves Bab Al Tebbaneh the most?

Must be grounded in platform data.

### 4.10 Admin and Municipal Workflow
Admin features:
- Assign reports
- Update ticket status
- Manage departments
- Manage neighborhoods
- Manage city assets
- Review AI predictions
- Approve scenario recommendations
- Export reports

## 5. Tripoli Geographic Focus

Priority areas for the first dataset:
- Al Mina
- El Tal
- Bab Al Tebbaneh
- Jabal Mohsen
- Qoubbeh
- Abu Samra
- Old Souks
- Port Area
- Al Zahriyeh

All seed data must be marked as demo assumptions until verified with local data.

## 6. Recommended Stack

Frontend:
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- MapLibre GL JS

Backend:
- FastAPI
- Pydantic
- SQLAlchemy
- Alembic

Database:
- PostgreSQL
- PostGIS

Storage:
- Supabase Storage, S3, or MinIO

Async jobs:
- Redis
- Celery or RQ

AI:
- OpenAI or Gemini abstraction layer
- YOLOv8/YOLOv11 later for image classification

Routing and simulation later:
- OpenTripPlanner
- Valhalla or GraphHopper
- SUMO
- MATSim

Deployment:
- Docker Compose first
- Vercel for frontend
- Render/Railway/Fly.io for API
- Supabase or managed Postgres for database

## 7. Repository Structure

citymind-tripoli/
  apps/
    web/
    api/
  services/
    reporting-service/
    vision-service/
    city-model-service/
    analytics-service/
    routing-service/
    scenario-service/
    prediction-service/
    assistant-service/
    notification-service/
  packages/
    shared/
  docs/
    AGENT.md
    PRODUCT.md
    ARCHITECTURE.md
    TRIPOLI_CITY_KNOWLEDGE.md
  data/
    tripoli_seed.json
  infra/
    docker-compose.yml
    migrations/
  README.md

## 8. Definition of Done

A feature is done only when it has:
- Database schema
- API endpoint
- Frontend UI
- Demo seed data
- Error handling
- Basic tests
- Documentation update
- Clear next upgrade path

## 9. Final Product Positioning

CityMind Tripoli is not only a complaint app, a GIS dashboard, or a chatbot.

It is a city operating system for Tripoli that combines citizen reports, geospatial data, sustainability indicators, mobility intelligence, prediction, and scenario simulation.
