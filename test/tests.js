/**
 * Simple test runner for GndCtrl
 * Run with: node test/tests.js
 *
 * These tests verify core algorithms (math, pathfinding, event bus)
 * independently of the DOM.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
let failures = [];

function assertEqual(actual, expected, message = '') {
    if (actual !== expected) {
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

function assertApprox(actual, expected, tolerance = 0.001, message = '') {
    if (Math.abs(actual - expected) > tolerance) {
        throw new Error(`${message}: expected ~${expected}, got ${actual} (tol=${tolerance})`);
    }
}

function assertTruthy(value, message = '') {
    if (!value) {
        throw new Error(`${message}: expected truthy, got ${value}`);
    }
}

function it(name, fn) {
    try {
        fn();
        passed++;
        console.log(`  \u2713 ${name}`);
    } catch (e) {
        failed++;
        failures.push({ name, error: e.message });
        console.log(`  \u2717 ${name}`);
        console.log(`    ${e.message}`);
    }
}

// ---- Inline implementations for testing (mirrors src/ files) ----

const MathUtil = {
    toRad(deg) { return deg * Math.PI / 180; },
    toDeg(rad) { return rad * 180 / Math.PI; },
    haversine(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 +
                  Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                  Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    },
    bearing(lat1, lon1, lat2, lon2) {
        const dLon = this.toRad(lon2 - lon1);
        const y = Math.sin(dLon) * Math.cos(this.toRad(lat2));
        const x = Math.cos(this.toRad(lat1)) * Math.sin(this.toRad(lat2)) -
                  Math.sin(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.cos(dLon);
        return (this.toDeg(Math.atan2(y, x)) + 360) % 360;
    },
    normalizeAngle(angle) {
        let a = angle % 360;
        if (a > 180) a -= 360;
        if (a < -180) a += 360;
        return a;
    },
    angleDiff(a, b) { return this.normalizeAngle(a - b); },
    clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
};

const Dijkstra = {
    findPath(graph, start, end) {
        if (start === end) return [start];
        const distances = {};
        const previous = {};
        const visited = new Set();
        const queue = [];
        for (const node in graph) distances[node] = Infinity;
        distances[start] = 0;
        queue.push({ id: start, dist: 0 });
        while (queue.length > 0) {
            queue.sort((a, b) => a.dist - b.dist);
            const current = queue.shift();
            if (visited.has(current.id)) continue;
            visited.add(current.id);
            if (current.id === end) return this._reconstructPath(previous, end);
            const neighbors = graph[current.id];
            if (!neighbors) continue;
            for (const neighborId in neighbors) {
                const weight = neighbors[neighborId];
                const dist = distances[current.id] + weight;
                if (dist < distances[neighborId]) {
                    distances[neighborId] = dist;
                    previous[neighborId] = current.id;
                    queue.push({ id: neighborId, dist });
                }
            }
        }
        return null;
    },
    _reconstructPath(previous, node) {
        const path = [node];
        let current = node;
        while (previous[current] !== undefined) {
            current = previous[current];
            path.unshift(current);
        }
        return path;
    }
};

const EventBus = {
    _events: {},
    on(event, callback) {
        if (!this._events[event]) this._events[event] = [];
        this._events[event].push(callback);
    },
    off(event, callback) {
        if (!this._events[event]) return;
        this._events[event] = this._events[event].filter(cb => cb !== callback);
    },
    emit(event, data) {
        if (!this._events[event]) return;
        this._events[event].forEach(callback => callback(data));
    }
};

// Load airport data
const kseaPath = path.join(__dirname, '..', 'src', 'airports', 'ksea.js');
const kseaSrc = fs.readFileSync(kseaPath, 'utf8');
const AIRPORT_KSEA = eval(`(function() { ${kseaSrc} return AIRPORT_KSEA; })()`);

function describe(name, fn) {
    console.log(`\n  ${name}`);
    fn();
}

// ---- Run Tests ----
console.log('\n========================================');
console.log('  GndCtrl Test Suite');
console.log('========================================\n');

describe('Math Utilities', () => {
    it('should convert degrees to radians', () => {
        assertApprox(MathUtil.toRad(180), Math.PI, 0.0001);
    });

    it('should convert radians to degrees', () => {
        assertApprox(MathUtil.toDeg(Math.PI), 180, 0.0001);
    });

    it('should calculate haversine distance', () => {
        // Seattle to SF ~1090 km
        const d = MathUtil.haversine(47.4502, -122.3088, 37.6213, -122.3790);
        assertApprox(d, 1090000, 50000);
    });

    it('should calculate bearing (south)', () => {
        const b = MathUtil.bearing(47.5, -122.3, 47.0, -122.3);
        assertApprox(b, 180, 2);
    });

    it('should normalize angles', () => {
        assertEqual(MathUtil.normalizeAngle(370), 10);
        assertEqual(MathUtil.normalizeAngle(-190), 170);
    });

    it('should clamp values', () => {
        assertEqual(MathUtil.clamp(5, 0, 10), 5);
        assertEqual(MathUtil.clamp(-5, 0, 10), 0);
        assertEqual(MathUtil.clamp(15, 0, 10), 10);
    });

    it('should compute angle differences', () => {
        assertEqual(MathUtil.angleDiff(10, 350), 20);
        assertEqual(MathUtil.angleDiff(350, 10), -20);
    });
});

describe('Dijkstra Pathfinding', () => {
    it('should find shortest path', () => {
        const graph = {
            A: { B: 1, C: 4 },
            B: { C: 2, D: 5 },
            C: { D: 1 },
            D: {}
        };
        const path = Dijkstra.findPath(graph, 'A', 'D');
        assertEqual(path.length, 4);
        assertEqual(path[0], 'A');
        assertEqual(path[3], 'D');
    });

    it('should find path through optimal route', () => {
        const graph = {
            A: { B: 1, C: 4 },
            B: { A: 1, C: 2, D: 5 },
            C: { A: 4, B: 2, D: 1 },
            D: { B: 5, C: 1 }
        };
        const path = Dijkstra.findPath(graph, 'A', 'D');
        // Should go A -> B -> C -> D (total 4) not A -> C -> D (total 5)
        assertEqual(path[1], 'B');
        assertEqual(path[2], 'C');
    });

    it('should return same node for identical start/end', () => {
        const path = Dijkstra.findPath({ A: {} }, 'A', 'A');
        assertEqual(path.length, 1);
        assertEqual(path[0], 'A');
    });

    it('should return null for disconnected graph', () => {
        const path = Dijkstra.findPath({ A: {}, B: {} }, 'A', 'B');
        assertEqual(path, null);
    });
});

describe('EventBus', () => {
    it('should emit to registered listeners', () => {
        let received = null;
        EventBus.on('test.event', (data) => { received = data; });
        EventBus.emit('test.event', { value: 42 });
        assertEqual(received.value, 42);
        EventBus.off('test.event');
    });

    it('should support multiple listeners', () => {
        let count = 0;
        const cb1 = () => { count++; };
        const cb2 = () => { count++; };
        EventBus._events = {};
        EventBus.on('multi', cb1);
        EventBus.on('multi', cb2);
        EventBus.emit('multi');
        assertEqual(count, 2);
        EventBus.off('multi');
    });
});

describe('Airport Data (KSEA)', () => {
    it('should have valid airport structure', () => {
        assertEqual(AIRPORT_KSEA.id, 'KSEA');
        assertEqual(AIRPORT_KSEA.name, 'Seattle-Tacoma International');
        assertTruthy(AIRPORT_KSEA.runways);
        assertTruthy(AIRPORT_KSEA.taxiNodes);
        assertTruthy(AIRPORT_KSEA.taxiEdges);
        assertTruthy(AIRPORT_KSEA.gates);
    });

    it('should have runway entry/exit nodes', () => {
        assertTruthy(AIRPORT_KSEA.taxiNodes['RWY16L_ENTRY']);
        assertTruthy(AIRPORT_KSEA.taxiNodes['RWY16R_ENTRY']);
        assertTruthy(AIRPORT_KSEA.taxiNodes['RWY34L_EXIT']);
    });

    it('should have gates', () => {
        const gateCount = Object.keys(AIRPORT_KSEA.gates).length;
        assertTruthy(gateCount >= 3, `Expected >=3 gates, got ${gateCount}`);
    });

    it('should have aircraft type definitions', () => {
        assertTruthy(AIRPORT_KSEA.aircraftTypes['B738']);
        assertTruthy(AIRPORT_KSEA.aircraftTypes['A320']);
    });
});

describe('Airport JSON Schema Validation', () => {
    it('every edge node should be a defined taxiNode', () => {
        const allNodes = new Set(Object.keys(AIRPORT_KSEA.taxiNodes));
        const errors = [];
        for (const fromId in AIRPORT_KSEA.taxiEdges) {
            if (!allNodes.has(fromId)) errors.push(`Unknown node: ${fromId}`);
            for (const toId in AIRPORT_KSEA.taxiEdges[fromId]) {
                if (!allNodes.has(toId)) errors.push(`Unknown neighbor: ${toId} (from ${fromId})`);
            }
        }
        assertEqual(errors.length, 0, `Found edge errors: ${errors.join(', ')}`);
    });

    it('every gate should be a defined taxiNode key', () => {
        for (const gateId in AIRPORT_KSEA.gates) {
            assertTruthy(AIRPORT_KSEA.taxiNodes[gateId], `Gate ${gateId} should be a taxiNode`);
        }
    });
});

// ---- Summary ----
console.log('\n========================================');
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

if (failures.length > 0) {
    console.log('Failures:');
    failures.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
}

process.exit(failed > 0 ? 1 : 0);
