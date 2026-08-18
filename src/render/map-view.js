/**
 * Map view - manages coordinate transformation (lat/lng <-> screen pixels)
 * and renders the airport ground layout (taxiways, runways, gates)
 */
class MapView {
    constructor(renderer) {
        this.renderer = renderer;
        this.center = { lat: 0, lng: 0 };
        this.zoom = 1;
        this.pixelsPerDegree = 1;
        this.canvasWidth = 0;
        this.canvasHeight = 0;
        MapView.instance = this;
    }

    /** Set the map center to an airport, with optional auto-fit to bounds */
    setCenter(lat, lng, zoom, airport) {
        this.center = { lat, lng };
        this.zoom = zoom;
        if (airport && airport.taxiNodes) {
            this.pixelsPerDegree = this._calculateFitScale(airport);
        } else {
            this.pixelsPerDegree = this._calculatePixelsPerDegree(zoom);
        }
    }

    /** Auto-fit all airport taxi nodes onto the canvas with 10% margin */
    _calculateFitScale(airport) {
        const nodes = airport.taxiNodes;
        let minLat = Infinity, maxLat = -Infinity;
        let minLng = Infinity, maxLng = -Infinity;

        for (const id in nodes) {
            const n = nodes[id];
            minLat = Math.min(minLat, n.lat);
            maxLat = Math.max(maxLat, n.lat);
            minLng = Math.min(minLng, n.lng);
            maxLng = Math.max(maxLng, n.lng);
        }

        const latSpan = maxLat - minLat;
        const lngSpan = maxLng - minLng;
        const maxSpan = Math.max(latSpan, lngSpan) || 0.001;

        // Fit with 15% margin on the smaller canvas dimension
        const margin = 0.85;
        const fitLat = (this.canvasHeight * margin) / latSpan;
        const fitLng = (this.canvasWidth * margin) / lngSpan;

        return Math.min(fitLat, fitLng);
    }

    _calculatePixelsPerDegree(zoom) {
        // Base: ~200 px/degree at zoom 1, doubles each level
        const base = 200;
        return base * Math.pow(2, zoom - 1);
    }

    /** Convert world lat/lng to screen pixel coordinates */
    worldToScreen(lat, lng) {
        const x = (lng - this.center.lng) * this.pixelsPerDegree + this.canvasWidth / 2;
        const y = (this.center.lat - lat) * this.pixelsPerDegree + this.canvasHeight / 2;
        return { x, y };
    }

    /** Convert screen pixel coordinate to world lat/lng */
    screenToWorld(x, y) {
        const lat = this.center.lat - (y - this.canvasHeight / 2) / this.pixelsPerDegree;
        const lng = this.center.lng + (x - this.canvasWidth / 2) / this.pixelsPerDegree;
        return { lat, lng };
    }

    setCanvasDimensions(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
    }

    /** Render the airport ground layout */
    render(airport, ctx) {
        if (!airport) return;

        ctx.save();

        // Draw background
        ctx.fillStyle = '#0c2340';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Draw range rings
        this._drawRangeRings(ctx);

        // Draw taxiways
        this._drawTaxiways(airport, ctx);

        // Draw runways
        this._drawRunways(airport, ctx);

        // Draw gates
        this._drawGates(airport, ctx);

        // Draw taxi node labels
        this._drawLabels(airport, ctx);

        ctx.restore();
    }

    _drawRangeRings(ctx) {
        const rings = [1, 2, 3, 4, 5];
        ctx.strokeStyle = '#1a3a5c';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.font = '10px Arial';
        ctx.fillStyle = '#556677';
        ctx.textAlign = 'center';

        for (const ring of rings) {
            const pxPerDeg = this.pixelsPerDegree;
            const radiusPx = ring * pxPerDeg * 0.014; // rough nm to degree conversion

            ctx.beginPath();
            ctx.arc(this.canvasWidth / 2, this.canvasHeight / 2, radiusPx, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillText(`${ring} NM`, this.canvasWidth / 2, this.canvasHeight / 2 - radiusPx - 5);
        }

        ctx.setLineDash([]);
    }

    _drawTaxiways(airport, ctx) {
        if (!airport.taxiEdges) return;

        const pxPerDeg = this.pixelsPerDegree;
        ctx.strokeStyle = '#3a5a78';
        ctx.lineWidth = Math.max(2, 6 * (pxPerDeg / 2000));
        ctx.lineCap = 'round';

        for (const fromNodeId in airport.taxiEdges) {
            const neighbors = airport.taxiEdges[fromNodeId];
            const fromNode = airport.taxiNodes[fromNodeId];
            if (!fromNode) continue;

            const fromScreen = this.worldToScreen(fromNode.lat, fromNode.lng);

            for (const toNodeId in neighbors) {
                const toNode = airport.taxiNodes[toNodeId];
                if (!toNode) continue;

                const toScreen = this.worldToScreen(toNode.lat, toNode.lng);

                ctx.beginPath();
                ctx.moveTo(fromScreen.x, fromScreen.y);
                ctx.lineTo(toScreen.x, toScreen.y);
                ctx.stroke();

                // Draw node circle
                ctx.fillStyle = '#556677';
                ctx.beginPath();
                ctx.arc(toScreen.x, toScreen.y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    _drawRunways(airport, ctx) {
        if (!airport.runways) return;

        for (const rwyId in airport.runways) {
            const rwy = airport.runways[rwyId];
            const threshold = this.worldToScreen(rwy.threshold.lat, rwy.threshold.lng);
            const end = this.worldToScreen(rwy.end.lat, rwy.end.lng);

            // Runway fill
            ctx.fillStyle = '#333333';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 10]);
            ctx.beginPath();
            ctx.moveTo(threshold.x, threshold.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();

            // Runway center line
            ctx.strokeStyle = '#ffffff';
            ctx.setLineDash([15, 10]);
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(threshold.x, threshold.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();

            // Runway label
            ctx.setLineDash([]);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(rwy.name, (threshold.x + end.x) / 2, (threshold.y + end.y) / 2 - 10);
        }
    }

    _drawGates(airport, ctx) {
        if (!airport.gates) return;

        for (const gateId in airport.gates) {
            const gate = airport.gates[gateId];
            const screen = this.worldToScreen(gate.lat, gate.lng);

            ctx.fillStyle = '#4488ff';
            ctx.fillRect(screen.x - 6, screen.y - 6, 12, 12);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.strokeRect(screen.x - 6, screen.y - 6, 12, 12);

            ctx.fillStyle = '#aaaaaa';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(gateId, screen.x, screen.y + 18);
        }
    }

    _drawLabels(airport, ctx) {
        if (!airport.taxiNodes) return;

        ctx.fillStyle = '#667788';
        ctx.font = '9px Arial';
        ctx.textAlign = 'left';

        for (const nodeId in airport.taxiNodes) {
            const node = airport.taxiNodes[nodeId];
            const screen = this.worldToScreen(node.lat, node.lng);

            if (node.type === 'runway_entry' || node.type === 'runway_exit') {
                ctx.fillStyle = '#e94560';
                ctx.font = 'bold 10px Arial';
            } else if (node.type === 'gate') {
                ctx.fillStyle = '#4488ff';
                ctx.font = 'bold 10px Arial';
            } else {
                ctx.fillStyle = '#667788';
                ctx.font = '9px Arial';
            }
            ctx.fillText(nodeId, screen.x + 6, screen.y - 6);
        }
    }
}
