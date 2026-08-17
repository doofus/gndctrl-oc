/**
 * Taxiway graph manager
 * Wraps the airport's taxiway data into a graph for pathfinding
 */
class TaxiwayGraph {
    constructor(airport) {
        this.airport = airport;
        this.adjacencyList = {};
        this._build();
    }

    _build() {
        const nodes = this.airport.taxiNodes || {};
        const edges = this.airport.taxiEdges || {};

        // Initialize adjacency list for every node
        for (const nodeId in nodes) {
            if (!this.adjacencyList[nodeId]) {
                this.adjacencyList[nodeId] = {};
            }
        }

        // Add bidirectional edges with real distances
        for (const fromId in edges) {
            const neighbors = edges[fromId];
            for (const toId in neighbors) {
                const fromNode = nodes[fromId];
                const toNode = nodes[toId];
                if (!fromNode || !toNode) continue;

                const distance = MathUtil.haversine(
                    fromNode.lat, fromNode.lng,
                    toNode.lat, toNode.lng
                );

                this.adjacencyList[fromId][toId] = distance;
                if (!this.adjacencyList[toId]) this.adjacencyList[toId] = {};
                if (!this.adjacencyList[toId][fromId]) {
                    this.adjacencyList[toId][fromId] = distance;
                }
            }
        }
    }

    /**
     * Find shortest path between two nodes
     * @param {string} start - node ID
     * @param {string} end - node ID
     * @returns {string[]|null} - ordered list of node IDs, or null
     */
    findPath(start, end) {
        return Dijkstra.findPath(this.adjacencyList, start, end);
    }

    /**
     * Find the nearest node to a given lat/lng
     */
    findNearestNode(lat, lng) {
        let nearest = null;
        let minDist = Infinity;

        for (const nodeId in this.airport.taxiNodes) {
            const node = this.airport.taxiNodes[nodeId];
            const dist = MathUtil.haversine(lat, lng, node.lat, node.lng);
            if (dist < minDist) {
                minDist = dist;
                nearest = { nodeId, node, distance: dist };
            }
        }
        return nearest;
    }

    /**
     * Get all available taxi targets for an aircraft
     * Returns gates, runway entries, runway exits
     */
    getTargets(aircraft) {
        const targets = [];

        // Runway entries (for departures)
        if (aircraft.flightPhase === 'departure') {
            for (const nodeId in this.airport.taxiNodes) {
                const node = this.airport.taxiNodes[nodeId];
                if (node.type === 'runway_entry') {
                    targets.push({
                        type: 'runway',
                        nodeId,
                        label: `RWY ${node.runway} Entry`,
                        runway: node.runway
                    });
                }
            }
        }

        // Gates (for arrivals)
        if (aircraft.flightPhase === 'arrival') {
            for (const gateId in this.airport.gates) {
                const gate = this.airport.gates[gateId];
                targets.push({
                    type: 'gate',
                    nodeId: gateId,
                    label: `Gate ${gateId}`,
                    gateId
                });
            }
        }

        return targets;
    }

    getNode(nodeId) {
        return this.airport.taxiNodes[nodeId];
    }
}
