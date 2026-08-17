/**
 * Airport simulation model
 * Wraps an airport data object with runtime state
 */
class Airport {
    constructor(data) {
        this.data = data;
        this.id = data.id;
        this.name = data.name;
        this.position = data.position;
        this.zoom = data.zoom;
        this.magVar = data.magVar;
        this.wind = { ...data.wind };

        this.taxiGraph = new TaxiwayGraph(data);
        this.gates = data.gates || {};
        this.runways = data.runways || {};
    }

    getTaxiGraph() {
        return this.taxiGraph;
    }

    getGate(gateId) {
        return this.gates[gateId];
    }

    getRunway(runwayId) {
        return this.runways[runwayId];
    }
}
