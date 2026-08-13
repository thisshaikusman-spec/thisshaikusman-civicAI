import math
from typing import Optional, Tuple

KNOWN_LOCATION_COORDINATES = {
    "coimbatore": (11.0168, 76.9558),
    "sulur": (11.0238, 77.1258),
    "gandhipuram": (11.0183, 76.9644),
    "rs puram": (11.0093, 76.9513),
    "peelamedu": (11.0267, 77.0028),
    "singanallur": (10.9982, 77.0255),
    "chinnampalayam": (10.9575, 77.0862),
    "chennai": (13.0827, 80.2707),
    "anna salai": (13.0604, 80.2496),
    "t nagar": (13.0418, 80.2341),
    "velachery": (12.9815, 80.2180),
    "kattur": (10.7905, 78.7047),
    "trichy": (10.7905, 78.7047),
    "tiruchirappalli": (10.7905, 78.7047),
    "madurai": (9.9252, 78.1198),
    "salem": (11.6643, 78.1460),
    "tiruppur": (11.1085, 77.3411),
    "erode": (11.3410, 77.7172),
    "vellore": (12.9165, 79.1325),
    "kadayanallur": (9.0833, 77.3500),
    "tenkasi": (8.9602, 77.3149),
    "thirunelveli": (8.7139, 77.7567),
    "tirunelveli": (8.7139, 77.7567),
}


def geocode_address(location_str: Optional[str]) -> Tuple[Optional[float], Optional[float]]:
    if not location_str:
        return None, None
    
    loc_lower = location_str.lower().strip()
    
    # 1. Direct match or substring match
    for key, coords in KNOWN_LOCATION_COORDINATES.items():
        if key in loc_lower:
            return coords
            
    # Default fallback: None (unrecognized location string)
    return None, None


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    try:
        R = 6371.0  # Earth radius in kilometers
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c
    except Exception:
        return 0.0
