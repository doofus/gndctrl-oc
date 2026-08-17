/**
 * A simplified airport for KSFO is already defined in metadata.js
 * (real KSFO layout would be added here)
 */
const AIRPORT_KSFO = {
    id: 'KSFO',
    name: 'San Francisco International',
    position: { lat: 37.6213, lng: -122.3790 },
    zoom: 14,
    magVar: 14.5,
    wind: { direction: 280, speed: 8 },
    runways: {
        '1L': { name: '1L', threshold: { lat: 37.6205, lng: -122.3810 }, heading: 1 },
        '10': { name: '10', threshold: { lat: 37.6180, lng: -122.3700 }, heading: 10 }
    },
    taxiNodes: {},
    taxiEdges: {},
    gates: {},
    spawnPatterns: [],
    aircraftTypes: {}
};
