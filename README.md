# GroundCtrl

**GndCtrl** is a 2D browser-based ground traffic control simulator written in pure JavaScript (no build step, no frameworks). Inspired by the complexity of real-world airport surface operations, it lets you coordinate aircraft as they taxi between gates, runways, and ramps.

## Features

- **Real-time simulation** with pause and variable speed (1x, 2x, 5x)
- **Taxiway pathfinding** using Dijkstra's shortest-path algorithm
- **Aircraft physics**: acceleration, turning, heading changes, realistic taxi speeds
- **Flight phases**: Spawning, Taxiing, Holding, Pushback, Finished
- **Text command system**: `taxi`, `pushback`, `hold`, `go`, `speed`
- **Responsive design** — playable on desktop and mobile
- **Multiple airports** with a selector dropdown
- **Airport strip view** showing aircraft callsign, state, speed, and route
- **No external dependencies** — runs in any modern browser

## Project Structure

```
gndctrl-oc/
├── index.html              # Entry point
├── assets/
│   └── css/
│       └── app.css         # All styles (responsive)
├── src/
│   ├── app.js              # Application entry point
│   ├── util/
│   │   ├── math.js         # Geospatial math (haversine, bearing, angles)
│   │   ├── dijkstra.js     # Pathfinding algorithm
│   │   └── event-bus.js    # Pub/sub messaging
│   ├── engine/
│   │   ├── game-engine.js  # Main game loop, engine
│   │   └── clock.js        # Sim clock with speed controls
│   ├── sim/
│   │   ├── aircraft.js     # Aircraft model + physics
│   │   ├── airport.js      # Airport wrapper
│   │   ├── taxiway-graph.js # Graph builder + pathfinding wrapper
│   │   └── command-handler.js # Text command parser
│   ├── render/
│   │   ├── renderer.js     # Canvas 2D renderer
│   │   └── map-view.js     # Lat/lng→pixel projection + map drawing
│   ├── ui/
│   │   ├── ui-controller.js # Strip list, command panel
│   │   └── strip-view.js    # Aircraft strip rendering
│   └── airports/
│       ├── ksea.js         # Seattle-Tacoma sample airport
│       ├── ksfo.js         # San Francisco (minimal)
│       └── metadata.js     # Airport registry
├── test/
│   └── tests.js            # Test suite (19 tests, no framework)
└── package.json
```

## Airport Data Format

Airfonts are plain JavaScript objects (`src/airports/<icao>.js`) with this structure:

```javascript
const AIRPORT_KSEA = {
    id: 'KSEA',
    name: 'Seattle-Tacoma International',
    position: { lat: 47.4502, lng: -122.3088 },
    zoom: 14,
    magVar: 16.3,
    wind: { direction: 160, speed: 9 },

    runways: {
        '16L': {
            name: '16L',
            threshold: { lat: 47.4525, lng: -122.3060 },
            end: { lat: 47.4740, lng: -122.3040 },
            angle: 164,
            length: 3600,
            heading: 164
        }
    },

    taxiNodes: {
        'RWY16L_ENTRY': { lat: 47.4525, lng: -122.3060, type: 'runway_entry', runway: '16L' },
        'T1': { lat: 47.4492, lng: -122.3080, type: 'taxi' },
        'G1': { lat: 47.4475, lng: -122.3070, type: 'gate' }
    },

    taxiEdges: {
        'RWY16L_ENTRY': { 'T5': 300 },
        'T1': { 'T5': 150, 'T9': 200 }
    },

    gates: {
        'G1': { lat: 47.4475, lng: -122.3070, heading: 0 }
    },

    spawnPatterns: [
        { type: 'departure', origin: 'KSEA', rate: 8, runway: '16L' }
    },

    aircraftTypes: {
        'B738': { name: 'Boeing 737-800', taxiSpeed: 20, length: 38, width: 35 }
    }
};
```

### Node Types
- `gate` — Aircraft starts here
- `taxi` — Regular taxiway node
- `runway_entry` — Where departing aircraft enter the runway
- `runway_exit` — Where arriving aircraft leave the runway

## Commands

| Command | Description |
|---------|-------------|
| `taxi \<target>` | Taxi to runway entry, exit, gate, or node |
| `pushback` | Initiates pushback from gate |
| `hold` | Stop aircraft in place |
| `go` | Resume taxi after holding |
| `speed \<n>` | Set max taxi speed (0-30 knots) |

## Running

```bash
# Serve locally
python3 -m http.server 8080
# Then open http://localhost:8080

# Tests
node test/tests.js
```

## Development Status

This is an early-stage project. Current capabilities:
- ✅ Taxiway graph + Dijkstra pathfinding
- ✅ Aircraft movement and physics
- ✅ Pause/resume with speed controls
- ✅ Airport selector (responsive layout)
- ✅ Text commands and strip view UI
- ✅ Tests for core algorithms

Future work:
- ✎ Ground service vehicle simulation (fuel trucks, baggage, catering)
- ✎ Aircraft conflict detection on taxiways
- ✎ Arrival sequencing and runway crossing management
- ✎ Scoring system (delays, conflicts, efficiency)
- ✎ Weather effects on ground operations
- ✎ Multi-touch support for mobile
