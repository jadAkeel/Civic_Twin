# ARCHITECTURE.md
# CityMind Tripoli System Architecture

## 1. Architecture Philosophy

CityMind Tripoli should be built as a production-shaped prototype.

This means:
- Build quickly enough for a hackathon.
- Keep boundaries clean enough for real future expansion.
- Start as a modular monolith if needed.
- Design modules as future microservices.
- Use PostGIS as the source of truth for geospatial data.
- Use deterministic rule engines first, then replace internal engines with AI/simulation engines.

## 2. High-Level Architecture

Frontend:
- Next.js web app
- MapLibre map interface
- Dashboard UI
- Admin UI
- Ask Your City chat UI

Backend:
- FastAPI API Gateway / backend-for-frontend
- Modular services
- Background workers
- AI abstraction layer

Data:
- PostgreSQL + PostGIS
- Object storage for photos
- Redis for caching and jobs
- Optional vector database or pgvector

Advanced engines:
- OpenTripPlanner or Valhalla for routing
- SUMO for traffic simulation
- MATSim for transport demand simulation
- Cesium for 3D visualization

## 3. Recommended Initial Stack

Frontend:
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- MapLibre GL JS
- React Query or SWR
- Zustand for UI state

Backend:
- FastAPI
- Pydantic
- SQLAlchemy
- Alembic
- Uvicorn

Database:
- PostgreSQL
- PostGIS
- pgvector optional

Infrastructure:
- Docker Compose
- Redis
- MinIO or S3 compatible storage
- GitHub Actions

AI:
- OpenAI or Gemini provider abstraction
- local mock provider for demo
- YOLO later for vision

## 4. Repository Layout

citymind-tripoli/
  apps/
    web/
      app/
      components/
      lib/
      features/
    api/
      app/
        core/
        db/
        modules/
          auth/
          reports/
          media/
          neighborhoods/
          road_segments/
          city_assets/
          green_score/
          walkability/
          mobility/
          scenarios/
          predictions/
          assistant/
          admin/
  services/
    vision-service/
    routing-service/
    simulation-service/
    prediction-service/
    assistant-service/
  packages/
    shared/
  data/
    tripoli_seed.json
  docs/
    AGENT.md
    PRODUCT.md
    ARCHITECTURE.md
    TRIPOLI_CITY_KNOWLEDGE.md
  infra/
    docker-compose.yml
    nginx/
    migrations/
  scripts/
    seed_tripoli.py
    import_osm.py

## 5. Microservices Target Design

The first version may run as one FastAPI app, but these service boundaries must be respected.

### 5.1 API Gateway / BFF
Responsibilities:
- Public API entry point
- Authentication checks
- Aggregated responses for frontend
- Rate limiting
- Request validation

### 5.2 Auth Service
Responsibilities:
- Users
- Roles
- Permissions
- Sessions or JWT

### 5.3 Reporting Service
Responsibilities:
- Citizen reports
- Ticket workflow
- Status updates
- Duplicate detection
- Department assignment

### 5.4 Media and Vision Service
Responsibilities:
- Photo upload
- Image storage
- AI category detection
- Damage detection
- Image moderation

### 5.5 City Model Service
Responsibilities:
- Neighborhoods
- Road segments
- City assets
- Sensors
- Geospatial relationships
- NGSI-LD-compatible entities later

### 5.6 Analytics Service
Responsibilities:
- Dashboards
- KPIs
- Aggregations
- Heatmaps
- Trends

### 5.7 Green Score Service
Responsibilities:
- Neighborhood Green Score
- Score explanations
- Historical score calculation
- Scenario-adjusted score

### 5.8 Walkability Service
Responsibilities:
- Walkability calculation
- Accessibility scoring
- Sidewalk analysis

### 5.9 Mobility Routing Service
Responsibilities:
- Route planning
- Route scoring
- Fastest/greenest/safest route
- OTP/Valhalla/GraphHopper integration later

### 5.10 Scenario Service
Responsibilities:
- Scenario creation
- Rule-based impact engine
- Scenario comparison
- Recommendation cards
- SUMO/MATSim integration later

### 5.11 Prediction Service
Responsibilities:
- Traffic risk
- Waste risk
- Heat risk
- Infrastructure risk
- ML model lifecycle later

### 5.12 Assistant Service
Responsibilities:
- Ask Your City
- Retrieval over city data
- SQL/tool calling
- Guardrails
- Explanation generation

### 5.13 Notification Service
Responsibilities:
- Citizen updates
- Admin alerts
- Email/SMS/push notifications

### 5.14 Integration Service
Responsibilities:
- Open311
- OSM imports
- OpenAQ
- Copernicus
- Municipality systems
- IoT data

## 6. Database Core Tables

### users
- id
- name
- email
- role
- phone
- created_at

### departments
- id
- name
- description
- contact_email

### neighborhoods
- id
- name
- slug
- geometry Polygon/MultiPolygon
- population_estimate optional
- area_sq_km
- city_zone
- created_at

### road_segments
- id
- osm_id
- name
- road_type
- geometry LineString
- speed_limit optional
- lane_count optional
- walkability_score
- traffic_risk_score
- pollution_score

### city_assets
- id
- type
- name
- status
- geometry Point/Line/Polygon
- neighborhood_id
- road_segment_id
- metadata JSONB

Asset types:
- waste_container
- street_light
- bus_stop
- park
- tree_cluster
- school
- hospital
- market
- crossing

### issue_reports
- id
- title
- description
- category
- severity
- status
- geometry Point
- latitude
- longitude
- image_url
- reporter_id
- neighborhood_id
- road_segment_id
- assigned_department_id
- ai_detected_category
- ai_confidence
- duplicate_of_report_id
- created_at
- updated_at
- resolved_at

### report_events
- id
- report_id
- event_type
- old_status
- new_status
- actor_id
- note
- created_at

### green_scores
- id
- neighborhood_id
- score
- air_quality_score
- green_coverage_score
- waste_cleanliness_score
- walkability_score
- heat_comfort_score
- explanation JSONB
- calculated_at

### walkability_scores
- id
- neighborhood_id
- road_segment_id optional
- score
- sidewalk_score
- crossing_score
- lighting_score
- shade_score
- accessibility_score
- safety_score
- calculated_at

### scenarios
- id
- name
- description
- target_type
- target_id
- geometry
- created_by
- status
- created_at

### scenario_actions
- id
- scenario_id
- action_type
- quantity
- intensity
- target_road_segment_id optional
- parameters JSONB

### scenario_results
- id
- scenario_id
- baseline_metrics JSONB
- predicted_metrics JSONB
- green_score_delta
- temperature_delta
- air_quality_delta
- walkability_delta
- traffic_delta
- pollution_delta
- accessibility_delta
- estimated_cost
- implementation_time_days
- risk_level
- confidence_level
- recommendation
- created_at

### predictions
- id
- prediction_type
- target_type
- target_id
- geometry
- score
- risk_level
- horizon_hours
- explanation JSONB
- created_at

### assistant_queries
- id
- user_id
- question
- answer
- referenced_entities JSONB
- confidence_level
- created_at

### observations
- id
- source
- observation_type
- target_type
- target_id
- geometry
- value
- unit
- metadata JSONB
- observed_at

## 7. API Endpoint Plan

### Health
GET /health

### Auth
POST /auth/login
POST /auth/register
GET /auth/me

### Neighborhoods
GET /neighborhoods
GET /neighborhoods/{id}
GET /neighborhoods/{id}/summary
GET /neighborhoods/{id}/green-score

### Reports
POST /reports
GET /reports
GET /reports/{id}
PATCH /reports/{id}/status
POST /reports/{id}/assign
GET /reports/heatmap
GET /reports/stats

### Media
POST /media/upload
POST /vision/classify-report-image

### City Assets
GET /assets
POST /assets
GET /assets/{id}
PATCH /assets/{id}

### Green Score
POST /green-score/recalculate
GET /green-score/neighborhoods
GET /green-score/neighborhoods/{id}/explanation

### Walkability
GET /walkability/neighborhoods
GET /walkability/road-segments/{id}
POST /walkability/recalculate

### Mobility
POST /mobility/routes
GET /mobility/hotspots
GET /mobility/route-options

### Scenarios
POST /scenarios
GET /scenarios
GET /scenarios/{id}
POST /scenarios/{id}/run
GET /scenarios/{id}/results
POST /scenarios/compare

### Predictions
POST /predictions/run
GET /predictions
GET /predictions/hotspots

### Assistant
POST /assistant/ask
GET /assistant/history

### Admin
GET /admin/overview
GET /admin/users
GET /admin/departments
POST /admin/departments
GET /admin/audit-log

## 8. Event Flow Examples

### 8.1 Citizen Report Flow
1. Citizen submits report.
2. API stores report in PostGIS.
3. Media service stores photo.
4. Vision service suggests category.
5. Reporting service detects duplicates.
6. City Model service links report to neighborhood and road segment.
7. Analytics service updates dashboard aggregates.
8. Notification service sends update.

### 8.2 Scenario Flow
1. Planner selects neighborhood or road.
2. Planner selects actions.
3. Scenario service creates scenario.
4. Scenario engine loads baseline metrics.
5. Rule engine or simulation engine calculates impact.
6. Scenario result is stored.
7. Green Score service computes adjusted score.
8. Assistant service can explain result.

### 8.3 Ask Your City Flow
1. User asks question.
2. Assistant classifies intent.
3. Assistant fetches data through approved tools/queries.
4. Assistant answers with referenced entities.
5. Query and answer are stored.

## 9. Scenario Engine v1 Rule Model

### ADD_TREES
Effects:
- increase green coverage
- improve heat comfort
- improve walkability
- slightly improve air quality

### IMPROVE_WASTE_COLLECTION
Effects:
- improve waste cleanliness
- reduce waste risk
- improve Green Score

### ADD_BIKE_LANE
Effects:
- improve sustainable mobility
- improve bike score
- may slightly increase car congestion if road capacity decreases

### PEDESTRIANIZE_STREET
Effects:
- improve walkability
- improve safety
- reduce local vehicle pollution
- may increase nearby traffic risk

### ADD_BUS_STOP
Effects:
- improve mobility access
- reduce car dependency proxy
- may increase local stop delay

### CHANGE_TRAFFIC_FLOW
Effects:
- adjust congestion score
- affect nearby road segments
- require higher uncertainty

## 10. Deployment Evolution

### Stage 1 - Local Prototype
- Docker Compose
- FastAPI
- Next.js
- Postgres/PostGIS
- Redis
- MinIO

### Stage 2 - Hackathon Demo
- Vercel frontend
- Render/Railway API
- Supabase Postgres/PostGIS
- Supabase Storage

### Stage 3 - Production Pilot
- Separate services
- Managed database
- Background workers
- Observability
- API gateway

### Stage 4 - City-Scale Platform
- Event bus
- Microservices
- Dedicated routing/simulation workers
- Sensor ingestion
- 3D tile server
- ML model registry

## 11. Security and Governance

Must include:
- Role-based access control
- Audit logs
- Data source labels
- Demo data labels
- Personally identifiable information minimization
- Upload validation
- Rate limiting
- Admin-only scenario approval

## 12. Testing Plan

### Unit Tests
- Green Score calculation
- Walkability calculation
- Scenario rules
- Prediction rules

### API Tests
- Reports CRUD
- Scenario run
- Assistant query
- Dashboard stats

### UI Tests
- Map renders
- Report submission works
- Dashboard filters work
- Scenario comparison displays

### Data Tests
- Geometry validity
- Report belongs to neighborhood
- Scenario target exists

## 13. Build Order For AI Assistant

1. Create monorepo.
2. Create API skeleton.
3. Create database schema.
4. Create seed data.
5. Create frontend layout.
6. Implement map.
7. Implement reports.
8. Implement dashboard.
9. Implement Green Score.
10. Implement Scenario Simulator.
11. Implement predictions.
12. Implement Ask Your City.
13. Implement admin.
14. Polish demo.
