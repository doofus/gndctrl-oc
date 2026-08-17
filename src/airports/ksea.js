/**
 * Sample airport: Seattle-Tacoma (KSEA) simplified ground layout
 *
 * Coordinate system:
 *   - Lat/lng for real-world positions (used by Haversine for distances)
 *   - Each taxiway node has a lat/lng
 *   - Taxiways are edges between nodes with a weight (meters)
 *
 * Aircraft flow:
 *   GATE -> TAXI -> RWY (for departure)
 *   RWY -> TAXI -> GATE (for arrival)
 */
const AIRPORT_KSEA = {
    id: 'KSEA',
    name: 'Seattle-Tacoma International',
    position: { lat: 47.4502, lng: -122.3088 },
    zoom: 14,

    // Magnetic declination correction
    magVar: 16.3,

    wind: { direction: 160, speed: 9 },

    // Runways
    runways: {
        '16L': {
            name: '16L',
            threshold: { lat: 47.4525, lng: -122.3060 },
            end: { lat: 47.4740, lng: -122.3040 },
            angle: 164, // degrees magnetic
            length: 3600,
            heading: 164
        },
        '16R': {
            name: '16R',
            threshold: { lat: 47.4520, lng: -122.3025 },
            end: { lat: 47.4735, lng: -122.3005 },
            angle: 164,
            length: 3600,
            heading: 164
        },
        '34L': {
            name: '34L',
            threshold: { lat: 47.4283, lng: -122.3075 },
            end: { lat: 47.4070, lng: -122.3095 },
            angle: 344,
            length: 3600,
            heading: 344
        },
        '34R': {
            name: '34R',
            threshold: { lat: 47.4288, lng: -122.3058 },
            end: { lat: 47.4075, lng: -122.3038 },
            angle: 344,
            length: 3600,
            heading: 344
        }
    },

    // Taxiway nodes - form the graph for pathfinding
    // Each node has an id, lat/lng, and a type (node, turn, runway_end, gate)
    taxiNodes: {
        // Runway ends (entrances/exits)
        'RWY16L_ENTRY': { lat: 47.4525, lng: -122.3060, type: 'runway_entry', runway: '16L' },
        'RWY16R_ENTRY': { lat: 47.4520, lng: -122.3025, type: 'runway_entry', runway: '16R' },
        'RWY34L_EXIT': { lat: 47.4283, lng: -122.3075, type: 'runway_exit', runway: '34L' },
        'RWY34R_EXIT': { lat: 47.4288, lng: -122.3058, type: 'runway_exit', runway: '34R' },

        // Central terminal taxi loop
        'T1': { lat: 47.4492, lng: -122.3080, type: 'taxi' },
        'T2': { lat: 47.4495, lng: -122.3045, type: 'taxi' },
        'T3': { lat: 47.4495, lng: -122.3060, type: 'taxi' },
        'T4': { lat: 47.4495, lng: -122.3035, type: 'taxi' },
        'T5': { lat: 47.4500, lng: -122.3055, type: 'taxi' },
        'T6': { lat: 47.4500, lng: -122.3025, type: 'taxi' },
        'T7': { lat: 47.4505, lng: -122.3055, type: 'taxi' },
        'T8': { lat: 47.4485, lng: -122.3080, type: 'taxi' },
        'T9': { lat: 47.4485, lng: -122.3060, type: 'taxi' },

        // Apron / gate area
        'G1': { lat: 47.4475, lng: -122.3070, type: 'gate' },
        'G2': { lat: 47.4475, lng: -122.3090, type: 'gate' },
        'G3': { lat: 47.4470, lng: -122.3050, type: 'gate' },
        'G4': { lat: 47.4465, lng: -122.3030, type: 'gate' },
        'G5': { lat: 47.4465, lng: -122.3100, type: 'gate' },
    },

    // Taxiway edges - adjacency list with distances in meters
    // Note: distances are approximate; real values calculated from lat/lng
    taxiEdges: {
        'RWY16L_ENTRY': { 'T5': 300 },
        'RWY16R_ENTRY': { 'T6': 280 },
        'RWY34L_EXIT': { 'T9': 450 },
        'RWY34R_EXIT': { 'T8': 450 },

        'T1': { 'T5': 150, 'T9': 200, 'T8': 120 },
        'T2': { 'T6': 100, 'T4': 80 },
        'T3': { 'T5': 100, 'T9': 150, 'T1': 150 },
        'T4': { 'T6': 120, 'T2': 80 },
        'T5': { 'RWY16L_ENTRY': 300, 'T3': 100, 'T7': 100, 'T1': 150 },
        'T6': { 'RWY16R_ENTRY': 280, 'T2': 100, 'T4': 120 },
        'T7': { 'T5': 100 },
        'T8': { 'RWY34R_EXIT': 450, 'T1': 120 },
        'T9': { 'RWY34L_EXIT': 450, 'T1': 200, 'T3': 150 },

        'G1': { 'T1': 100 },
        'G2': { 'T1': 150 },
        'G3': { 'T1': 120, 'T3': 100 },
        'G4': { 'T2': 80 },
        'G5': { 'T8': 180 },
    },

    // Gate assignments for spawning aircraft
    gates: {
        'G1': { lat: 47.4475, lng: -122.3070, heading: 0 },
        'G2': { lat: 47.4475, lng: -122.3090, heading: 0 },
        'G3': { lat: 47.4470, lng: -122.3050, heading: 0 },
        'G4': { lat: 47.4465, lng: -122.3030, heading: 0 },
        'G5': { lat: 47.4465, lng: -122.3100, heading: 0 },
    },

    // Spawn patterns for departures
    spawnPatterns: [
        {
            type: 'departure',
            origin: 'KSEA',
            destinations: ['KPDX', 'KSFO', 'KLAX', 'KSEA'],
            rate: 8, // aircraft per hour
            runway: '16L'
        },
        {
            type: 'arrival',
            origin: 'KSFO',
            destinations: ['KSEA', 'KPDX', 'KLAX'],
            rate: 8,
            runway: '34L'
        },
        {
            type: 'arrival',
            origin: 'KPDX',
            destinations: ['KSEA', 'KSEA'],
            rate: 6,
            runway: '34R'
        }
    ],

    // Aircraft types and their taxi speeds (knots)
    aircraftTypes: {
        'A320': { name: 'Airbus A320', taxiSpeed: 20, length: 38, width: 36 },
        'B738': { name: 'Boeing 737-800', taxiSpeed: 20, length: 38, width: 35 },
        'B777': { name: 'Boeing 777-300ER', taxiSpeed: 18, length: 74, width: 65 },
        'A320neo': { name: 'Airbus A320neo', taxiSpeed: 20, length: 38, width: 36 },
        'CRJ9': { name: 'CRJ-900', taxiSpeed: 22, length: 29, width:29 }
    }
};
