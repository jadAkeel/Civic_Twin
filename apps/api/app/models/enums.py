USER_ROLES = (
    "owner",
    "citizen",
    "municipality_admin",
    "decision_maker",
    "analyst",
    "police",
    "red_cross",
    "civil_defense",
)

REPORT_CATEGORIES = (
    "traffic_congestion",
    "pothole",
    "waste",
    "security_incident",
    "medical_emergency",
    "fire_hazard",
    "other",
    "garbage",
    "broken_sidewalk",
    "street_lighting",
    "water_leakage",
    "traffic_obstruction",
    "accessibility_issue",
    "pollution",
    "public_safety",
)
REPORT_SEVERITIES = ("low", "medium", "high", "critical")
REPORT_STATUSES = ("submitted", "validated", "in_progress", "resolved", "rejected", "duplicate")
REPORT_SOURCES = ("citizen", "municipality", "sensor", "demo_seed")

ASSET_TYPES = (
    "road",
    "sidewalk",
    "street_light",
    "waste_container",
    "park",
    "tree",
    "bus_stop",
    "school",
    "hospital",
    "municipal_facility",
    "heritage_site",
    "sensor",
)
ASSET_STATUSES = ("active", "needs_maintenance", "inactive", "planned")

MOBILITY_EDGE_TYPES = ("road", "pedestrian_path", "bike_lane", "bus_route", "informal_route")

SCENARIO_TYPES = (
    "add_trees",
    "add_bike_lane",
    "add_park",
    "add_bus_stop",
    "improve_waste_collection",
    "pedestrianize_street",
    "change_traffic_flow",
    "improve_sidewalks",
    "improve_lighting",
)
SCENARIO_STATUSES = ("draft", "simulated", "approved", "rejected", "archived")
RISK_LEVELS = ("low", "medium", "high", "critical")

PREDICTION_TYPES = (
    "congestion_risk",
    "waste_accumulation_risk",
    "infrastructure_failure_risk",
    "heat_risk",
    "service_pressure_risk",
)
