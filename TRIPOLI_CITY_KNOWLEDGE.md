# TRIPOLI_CITY_KNOWLEDGE.md
# CityMind Tripoli Local City Knowledge Base

## 1. Purpose

This file keeps the project focused on Tripoli, Lebanon.

It defines the first city assumptions, demo neighborhoods, urban problems, scenario ideas, seed data, and validation plan.

Important: Unless a value is connected to verified local data, it must be treated as demo seed data or a planning hypothesis.

## 2. City Scope

Primary city:
- Tripoli, Lebanon

Initial urban focus:
- Dense neighborhoods
- Historic areas
- Mobility corridors
- Waste hotspots
- Walkability gaps
- Green space gaps
- Traffic and public transport weak points

Approximate city center for map initialization:
- latitude: 34.4367
- longitude: 35.8497

## 3. Priority Neighborhoods

The first version should include these Tripoli areas:

1. Al Mina
2. El Tal
3. Bab Al Tebbaneh
4. Jabal Mohsen
5. Qoubbeh
6. Abu Samra
7. Old Souks
8. Port Area
9. Al Zahriyeh
10. Tripoli center corridors

## 4. Neighborhood Hypotheses For Demo Seed Data

These are not final official facts. They are starting assumptions for the hackathon prototype and must be validated with local users, field visits, OSM data, municipality records, or citizen reports.

### 4.1 Al Mina
Possible issues:
- Coastal traffic pressure
- Air and noise exposure near busy roads
- Waste management pressure in commercial areas
- Need for pedestrian and cycling improvements

Demo scenario ideas:
- Add bike-friendly coastal route
- Improve waste collection points
- Add trees and shaded walking paths
- Improve pedestrian crossings

### 4.2 El Tal
Possible issues:
- High pedestrian activity
- Traffic congestion
- Public transport pressure
- Need for safer walking routes

Demo scenario ideas:
- Pedestrian priority zone
- Bus stop improvement
- Traffic signal optimization
- Safer crossings

### 4.3 Bab Al Tebbaneh
Possible issues:
- Waste accumulation risk
- Broken sidewalks
- Dense urban pressure
- Lower Green Score in demo model

Demo scenario ideas:
- Improve waste collection
- Add street lighting
- Add sidewalk repair program
- Add trees and pocket parks

### 4.4 Jabal Mohsen
Possible issues:
- Accessibility challenges
- Service pressure
- Walkability gaps
- Infrastructure monitoring needs

Demo scenario ideas:
- Improve stair/path accessibility
- Add lighting
- Improve pedestrian safety
- Add service response priority

### 4.5 Qoubbeh
Possible issues:
- Dense residential movement
- Traffic pressure near key roads
- Waste and road maintenance needs

Demo scenario ideas:
- Improve waste collection routes
- Repair sidewalks
- Add school-safe routes
- Add bus stop access improvements

### 4.6 Abu Samra
Possible issues:
- Residential density
- Parking and traffic pressure
- Lack of green pockets in some zones
- Walking comfort issues

Demo scenario ideas:
- Add pocket parks
- Add tree corridors
- Improve school walking routes
- Add bike lane pilot

### 4.7 Old Souks
Possible issues:
- Heritage-sensitive mobility
- Crowded pedestrian movement
- Waste pressure during commercial hours
- Need for car-light access strategies

Demo scenario ideas:
- Pedestrianize selected street
- Add waste collection schedule optimization
- Improve lighting
- Protect heritage paths with low-emission access

### 4.8 Port Area
Possible issues:
- Heavy vehicle movement
- Air quality exposure
- Mobility conflict between trucks, cars, and pedestrians

Demo scenario ideas:
- Truck route management
- Pollution exposure layer
- Safer pedestrian links
- Green buffer planning

## 5. City Problem Taxonomy

All reports and analytics should map to this taxonomy:

### Infrastructure
- pothole
- broken_sidewalk
- broken_street_light
- unsafe_crossing
- water_leakage
- drainage_issue
- road_obstacle

### Environment
- garbage
- illegal_dumping
- air_quality_issue
- noise_issue
- heat_risk
- lack_of_green_space

### Mobility
- traffic_congestion
- unsafe_walkability
- poor_accessibility
- lack_of_bus_stop
- bike_unfriendly_road
- parking_pressure

### Urban Services
- delayed_maintenance
- repeated_issue
- public_space_damage
- asset_failure

## 6. Demo Seed Neighborhood Scores

Use these only as demo seed data until verified.

Al Mina:
- green_score: 58
- walkability_score: 55
- traffic_risk: 68
- waste_risk: 52
- heat_risk: 57

El Tal:
- green_score: 52
- walkability_score: 61
- traffic_risk: 82
- waste_risk: 49
- heat_risk: 60

Bab Al Tebbaneh:
- green_score: 41
- walkability_score: 38
- traffic_risk: 76
- waste_risk: 81
- heat_risk: 72

Jabal Mohsen:
- green_score: 45
- walkability_score: 42
- traffic_risk: 58
- waste_risk: 63
- heat_risk: 67

Qoubbeh:
- green_score: 49
- walkability_score: 47
- traffic_risk: 71
- waste_risk: 66
- heat_risk: 64

Abu Samra:
- green_score: 50
- walkability_score: 52
- traffic_risk: 69
- waste_risk: 57
- heat_risk: 61

Old Souks:
- green_score: 46
- walkability_score: 64
- traffic_risk: 74
- waste_risk: 68
- heat_risk: 66

## 7. Tripoli Scenario Library

### Scenario 1 - Bab Al Tebbaneh Waste and Green Recovery
Actions:
- IMPROVE_WASTE_COLLECTION
- ADD_TREES
- ADD_STREET_LIGHTS

Expected demo impact:
- Higher Green Score
- Lower waste risk
- Better walkability perception
- Lower heat risk

### Scenario 2 - El Tal Pedestrian Priority
Actions:
- PEDESTRIANIZE_STREET
- ADD_SAFE_CROSSING
- OPTIMIZE_TRAFFIC_SIGNAL
- ADD_BUS_STOP

Expected demo impact:
- Higher walkability
- Lower pedestrian risk
- Potential traffic redistribution

### Scenario 3 - Al Mina Coastal Green Mobility
Actions:
- ADD_BIKE_LANE
- ADD_TREES
- ADD_SAFE_CROSSING

Expected demo impact:
- Higher sustainable mobility
- Better air exposure score
- Better walking comfort

### Scenario 4 - Old Souks Heritage Walkability
Actions:
- PEDESTRIANIZE_STREET
- IMPROVE_WASTE_COLLECTION
- ADD_STREET_LIGHTS

Expected demo impact:
- Higher walkability
- Better waste cleanliness
- Lower vehicle presence in heritage area

### Scenario 5 - Abu Samra School-Safe Route
Actions:
- ADD_SCHOOL_STREET
- ADD_SAFE_CROSSING
- IMPROVE_SIDEWALK
- ADD_STREET_LIGHTS

Expected demo impact:
- Higher safety
- Higher accessibility
- Better walkability

### Scenario 6 - Qoubbeh Service Pressure Reduction
Actions:
- IMPROVE_WASTE_COLLECTION
- IMPROVE_SIDEWALK
- CHANGE_TRAFFIC_FLOW

Expected demo impact:
- Lower service pressure
- Better walkability
- Adjusted traffic risk

## 8. Data Sources To Explore

### OpenStreetMap
Use for:
- Roads
- Buildings
- POIs
- Parks
- Some sidewalks

Link:
https://www.openstreetmap.org

### Overpass API
Use for:
- Extracting OSM features
- Roads, amenities, buildings, parks

Link:
https://overpass-api.de

### OpenAQ
Use for:
- Air quality if stations or regional data are available

Link:
https://openaq.org

### Copernicus Data Space
Use for:
- Satellite imagery
- Heat proxies
- Green coverage indicators

Link:
https://dataspace.copernicus.eu

### Open Data Lebanon
Use for:
- Lebanon-related open datasets

Link:
https://opendatalebanon.org

### TripoliLabs
Use for:
- Local civic/air-quality related references if available

Link:
https://github.com/TripoliLabs

### Municipality Sources
Explore:
- Complaint portal
- Municipal departments
- Waste collection routes
- Street lighting assets
- Road maintenance records

## 9. Field Validation Plan

The prototype should eventually validate assumptions using:
- Walking audit
- Citizen survey
- Manual report collection
- Photos from selected streets
- OSM verification
- Interviews with local stakeholders
- Municipality workflow review

## 10. Local Data Collection Template

For each field observation:

- observation_id
- date
- observer_name
- neighborhood
- street_name
- latitude
- longitude
- category
- severity 1 to 5
- photo_url
- description
- confidence
- verified true/false

## 11. Demo Data Principles

For demo data:
- Always label as demo.
- Avoid claiming official municipal accuracy.
- Use realistic but not final numbers.
- Focus on explaining the methodology.
- Make the system ready to replace demo data with verified data later.

## 12. Tripoli First Demo Flow

Recommended demo sequence:

1. Open Tripoli city map.
2. Show neighborhoods and Green Score.
3. Click Bab Al Tebbaneh.
4. Show waste and walkability issues.
5. Submit a new citizen report.
6. See the report appear on the map and dashboard.
7. Run a scenario: improve waste collection + add trees.
8. Show before/after metrics.
9. Ask: Which intervention should Tripoli prioritize?
10. Show AI recommendation based on scenario results.

## 13. How To Avoid A Generic Project

Every screen should mention Tripoli or a Tripoli neighborhood.
Every dataset should be connected to a Tripoli area.
Every scenario should describe a local urban problem.
Every pitch sentence should say how this helps Tripoli specifically.
