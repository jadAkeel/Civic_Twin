# PRODUCT.md
# CityMind Tripoli Product Specification

## 1. Product Vision

CityMind Tripoli is an AI-powered urban intelligence and digital twin platform for Tripoli, Lebanon.

It turns scattered city problems into structured geospatial data, then uses dashboards, scoring, prediction, and scenario simulation to support better municipal decisions.

The product must serve both immediate hackathon demonstration needs and a long-term municipality-grade roadmap.

## 2. Target Users

### 2.1 Citizens
Citizens report problems, track their status, and discover safer or greener routes.

Needs:
- Simple reporting
- Photo upload
- Location tagging
- Ticket tracking
- Transparency
- Safe walking guidance

### 2.2 Municipality Staff
Municipality teams manage reports and monitor city performance.

Needs:
- Ticket dashboard
- Assignment workflow
- Neighborhood KPIs
- Priority ranking
- Exportable reports

### 2.3 Urban Planners
Planners test interventions before implementation.

Needs:
- Scenario Simulator
- Before/after comparisons
- Green Score impact
- Traffic impact
- Cost and risk estimates

### 2.4 Decision Makers
Decision makers need explainable recommendations.

Needs:
- City-level summary
- Priority projects
- Budget impact
- Risk level
- Confidence level

### 2.5 Hackathon Judges
Judges need a clear story.

Needs:
- Tripoli-specific problem
- Strong demo
- Sustainable Cities & Mobility alignment
- Real GitHub references
- Expandable architecture

## 3. Product Scope

### 3.1 Immediate Build Scope
- Tripoli city map
- Seed neighborhoods
- Seed reports
- Citizen reporting
- Dashboard
- Green Score
- Scenario Simulator v1
- Ask Your City v1
- Admin workflow v1

### 3.2 Advanced Scope
- Computer vision classification
- Real OSM import
- Open311 compatibility
- NGSI-LD-compatible city model
- Smart routing
- SUMO traffic simulation
- MATSim demand simulation
- 3D viewer with Cesium
- IoT/sensor integration
- Public municipal portal

## 4. Feature Catalogue

## 4.1 Smart Reporter

### Basic Features
- Create issue report
- Select category
- Select severity
- Add description
- Add photo
- Select location on map
- Submit report
- View report on map
- View report details

### Intermediate Features
- AI category suggestion
- AI severity suggestion
- Duplicate report detection
- Neighborhood auto-detection
- Road segment auto-detection
- Ticket ID generation
- Status timeline
- Citizen notifications
- Admin assignment

### Advanced Features
- Computer vision detection from images
- Auto-routing to department
- SLA tracking
- Repeated issue detection
- Open311 API compatibility
- Cross-report clustering
- Fraud/spam detection
- Offline mobile reporting

### Report Statuses
- submitted
- verified
- assigned
- in_progress
- resolved
- rejected
- duplicate

### Report Categories
- pothole
- garbage
- broken_sidewalk
- street_light
- water_leakage
- road_obstacle
- unsafe_crossing
- accessibility_barrier
- illegal_dumping
- traffic_signal_issue
- green_space_issue

### Acceptance Criteria
- A user can submit a geotagged report.
- The report appears on the Tripoli map.
- The report appears in the dashboard.
- Admin can update the report status.
- The system stores photo URL and geospatial point.

## 4.2 Interactive Tripoli Map

### Basic Layers
- Neighborhoods
- Reports
- Green Score
- Traffic hotspots
- Waste hotspots

### Intermediate Layers
- Road segments
- Sidewalk condition
- Lighting coverage
- Heat risk
- Air quality
- City assets

### Advanced Layers
- Scenario before/after layers
- Predicted congestion
- Predicted waste accumulation
- Accessibility network
- 3D buildings
- Real-time sensors

### Map Interactions
- Click neighborhood
- Click report
- Draw scenario area
- Select road segment
- Filter by category
- Filter by severity
- Compare before/after

## 4.3 City Pulse Dashboard

### Core KPIs
- Total reports
- Open reports
- Resolved reports
- Average response time
- Highest-risk neighborhood
- Most common issue type
- Average Green Score
- Average walkability
- Number of urgent hotspots

### Advanced KPIs
- Service pressure index
- Neighborhood risk index
- Complaint recurrence rate
- Predicted issue growth
- Environmental stress index
- Mobility stress index
- SLA compliance

### Dashboard Cards
- City health summary
- Reports by category
- Reports by neighborhood
- Urgent issues
- Green Score ranking
- Scenario recommendations
- AI insights

## 4.4 Green Score Engine

### Goal
Score each neighborhood from 0 to 100 based on sustainability and livability.

### Initial Formula
Green Score =
- 30% Air Quality Score
- 25% Green Coverage Score
- 20% Waste Cleanliness Score
- 15% Walkability Score
- 10% Heat Comfort Score

### Inputs
- Air quality readings or demo proxy
- Green area ratio
- Waste reports per area
- Sidewalk and walkability indicators
- Heat risk

### Outputs
- score
- grade
- explanation
- top negative factor
- top improvement action

### Grade Bands
- 80 to 100: Excellent
- 65 to 79: Good
- 50 to 64: Moderate
- 35 to 49: Poor
- 0 to 34: Critical

### Advanced Features
- Time-series Green Score
- Forecasted Green Score
- Scenario-adjusted Green Score
- Compare neighborhoods
- Export neighborhood sustainability report

## 4.5 Walkability Score

### Formula Inputs
- Sidewalk quality
- Crossing safety
- Street lighting
- Shade/trees
- Slope/accessibility
- Traffic speed proxy
- Complaint density
- Distance to services

### Output
- Walkability score 0 to 100
- Accessible route rating
- Safety rating
- Main blocking factors

## 4.6 Smart Mobility

### Route Types
- fastest
- greenest
- safest
- accessible
- bike_friendly
- school_safe
- least_polluted

### v1 Logic
Use simplified graph or mocked routes from seed data.

### v2 Logic
Use OSM road network.

### v3 Logic
Use OpenTripPlanner, Valhalla, or GraphHopper.

### Route Cost Function
Route cost may include:
- distance
- travel time
- pollution exposure
- sidewalk quality penalty
- heat/shade penalty
- safety penalty
- accessibility penalty

## 4.7 City Guardian Prediction Engine

### Prediction Types
- traffic congestion risk
- waste accumulation risk
- infrastructure failure risk
- heat stress risk
- repeated issue risk
- municipal service pressure

### v1 Rule-Based Prediction
Examples:
- More unresolved waste reports in same area means higher waste risk.
- High report density plus low walkability means pedestrian safety risk.
- Peak hours plus known hotspot means congestion risk.

### v2 ML Prediction
Models may use:
- historical reports
- weather
- day of week
- hour of day
- neighborhood type
- road type
- nearby schools/markets

### v3 Advanced Prediction
- Graph neural networks for traffic
- Spatio-temporal forecasting
- Sensor fusion
- Incident prediction

## 4.8 Urban Digital Twin

### Goal
Create a unified model of Tripoli's urban entities.

### Entities
- Neighborhood
- RoadSegment
- SidewalkSegment
- Building
- Park
- WasteContainer
- StreetLight
- BusStop
- Sensor
- Report
- Scenario
- Prediction
- Recommendation

### Entity Requirements
Every entity should have:
- unique ID
- name or label
- geometry
- attributes
- status
- timestamps
- source
- confidence score

### Future Standards
- Open311 for service requests
- NGSI-LD for context entities
- CityGML and 3D Tiles for 3D city model

## 4.9 Urban Scenario Simulator

### Goal
Let planners test interventions before implementation.

### Scenario Flow
1. Select area or neighborhood.
2. Select intervention actions.
3. Set intensity and budget.
4. Run baseline.
5. Run scenario.
6. Compare KPIs.
7. Generate recommendation card.

### Supported Actions
- ADD_TREES
- ADD_BIKE_LANE
- ADD_BUS_STOP
- ADD_PARK
- IMPROVE_WASTE_COLLECTION
- PEDESTRIANIZE_STREET
- CHANGE_TRAFFIC_FLOW
- CLOSE_STREET
- ADD_STREET_LIGHTS
- IMPROVE_SIDEWALK
- ADD_SAFE_CROSSING
- ADD_SCHOOL_STREET
- OPTIMIZE_TRAFFIC_SIGNAL
- REMOVE_ROAD_OBSTACLE

### Scenario Inputs
- target area
- action type
- action quantity
- affected road segment
- implementation intensity
- cost profile
- time horizon

### Scenario Outputs
- green_score_delta
- air_quality_delta
- heat_delta
- walkability_delta
- traffic_delta
- accessibility_delta
- pollution_delta
- safety_delta
- estimated_cost
- implementation_time
- risk_level
- confidence_level
- recommendation

### v1 Rule Examples
- Adding trees improves green score, heat comfort, and walkability.
- Improving waste collection improves cleanliness and reduces waste risk.
- Adding bike lane improves sustainable mobility but may slightly affect car traffic.
- Pedestrianizing a street improves walkability and safety but may increase nearby traffic.

### v2 Simulation
- Use A/B Street-style lightweight street changes.
- Compare before/after visually.

### v3 Simulation
- Use SUMO for microscopic traffic simulation.

### v4 Simulation
- Use MATSim for demand-level transport simulation.

### v5 Urban Planning Simulation
- Use UrbanSim for land use and long-term development impact.

## 4.10 Ask Your City

### Goal
A grounded AI assistant for Tripoli city data.

### Must Answer From
- Reports
- Neighborhood scores
- Scenario results
- Predictions
- City assets
- Mobility data

### Must Not Do
- Hallucinate unsupported facts
- Give final municipal claims from demo data without disclaimer
- Answer outside the platform data unless explicitly labeled as general knowledge

### Example Questions
- Which neighborhood has the most urgent issues?
- Where should trees be planted first?
- What intervention improves Al Mina the most?
- Which reports are unresolved for more than seven days?
- Which road segment has the highest traffic risk?

## 4.11 Municipality Admin Panel

### Features
- User management
- Role management
- Report management
- Department assignment
- Status workflow
- Neighborhood management
- City asset management
- Scenario review
- Data export
- Audit logs

### Roles
- citizen
- municipality_staff
- municipality_admin
- planner
- decision_maker
- system_admin

## 5. Waterfall Implementation Plan

### Phase 0 - Documentation
Deliverables:
- AGENT.md
- PRODUCT.md
- ARCHITECTURE.md
- TRIPOLI_CITY_KNOWLEDGE.md

Exit criteria:
- AI assistant can read docs and generate project structure.

### Phase 1 - Foundation
Deliverables:
- Monorepo
- Docker Compose
- Frontend app
- Backend app
- Database
- Health checks
- Basic auth placeholder

### Phase 2 - City Data Model
Deliverables:
- Neighborhoods
- Road segments
- City assets
- Seed data
- Map display

### Phase 3 - Smart Reporter
Deliverables:
- Submit report
- Upload photo placeholder
- Report list
- Report detail
- Admin status update

### Phase 4 - Dashboard
Deliverables:
- KPI cards
- Charts
- Heatmap
- Filters

### Phase 5 - Green Score and Walkability
Deliverables:
- Score engine
- Explanation engine
- Neighborhood ranking

### Phase 6 - Mobility
Deliverables:
- Route planner UI
- Mock route engine
- OSM-ready abstraction

### Phase 7 - Scenario Simulator v1
Deliverables:
- Scenario form
- Rule engine
- Before/after comparison
- Recommendation card

### Phase 8 - Prediction
Deliverables:
- Rule-based predictions
- Risk cards
- Prediction map layer

### Phase 9 - Ask Your City
Deliverables:
- Chat UI
- Query tools
- Grounded answers

### Phase 10 - Admin Workflow
Deliverables:
- Users
- Departments
- Assignment
- Audit trail

### Phase 11 - Advanced Engines
Deliverables:
- Computer vision
- SUMO integration
- OTP integration
- 3D digital twin viewer

### Phase 12 - Production and Demo
Deliverables:
- Final UI polish
- Demo data
- Pitch flow
- Tests
- Deployment

## 6. Demo Story

The demo should tell this story:

1. A citizen reports a waste or sidewalk problem in Tripoli.
2. The issue appears on the city map.
3. The dashboard shows the affected neighborhood becoming more stressed.
4. Green Score explains why the neighborhood is weak.
5. The planner opens Scenario Simulator.
6. The planner tests trees, waste collection improvement, and bike lane.
7. The system compares before and after.
8. Ask Your City explains which intervention is best.
9. The municipality gets an actionable recommendation.
