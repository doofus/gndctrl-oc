/**
 * Canvas renderer - handles all 2D drawing operations
 */
class Renderer {
    constructor(ctx) {
        this.ctx = ctx;
    }

    clear(ctx) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    /** Convert lat/lng to pixel coordinates using a simple equirectangular projection */
    latLngToPixel(lat, lng, mapCenter, pixelsPerDegree) {
        if (!mapCenter) {
            mapCenter = { lat: 0, lng: 0 };
            pixelsPerDegree = 1;
        }
        const x = (lng - mapCenter.lng) * pixelsPerDegree;
        const y = (mapCenter.lat - lat) * pixelsPerDegree; // Invert Y for screen coordinates
        return { x, y };
    }

    renderAircraft(aircraftList, ctx) {
        for (const aircraft of aircraftList) {
            if (!aircraft.isVisible()) continue;
            this._drawAircraft(aircraft, ctx);
        }
    }

    _drawAircraft(aircraft, ctx) {
        const screenPos = MapView.instance.worldToScreen(aircraft.position);
        const heading = aircraft.heading || 0;
        const scale = aircraft.scale || 1;

        const width = Math.max(8, aircraft.width || 20) * scale;
        const length = Math.max(12, aircraft.length || 40) * scale;

        ctx.save();
        ctx.translate(screenPos.x, screenPos.y);
        ctx.rotate(MathUtil.toRad(heading));

        // Draw aircraft body
        ctx.fillStyle = aircraft.getColor();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;

        // Fuselage
        ctx.beginPath();
        ctx.ellipse(0, 0, length / 2, width / 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Wings
        ctx.beginPath();
        ctx.moveTo(0, -width / 2);
        ctx.lineTo(0, width / 2);
        ctx.lineWidth = 2;
        ctx.stroke();

        // Wing tips
        ctx.beginPath();
        ctx.moveTo(-length / 3, -width / 2);
        ctx.bezierCurveTo(-length / 2.5, -width / 2, -length / 2.5, width / 2, -length / 3, width / 2);
        ctx.stroke();

        // Call sign
        ctx.fillStyle = '#ffffff';
        ctx.font = `${Math.max(8, 8 * scale)}px 'Courier New'`;
        ctx.textAlign = 'center';
        ctx.fillText(aircraft.callsign, 0, -width / 2 - 4);

        ctx.restore();

        // Status indicator
        ctx.fillStyle = aircraft.getStatusColor();
        ctx.beginPath();
        ctx.arc(screenPos.x + length / 2 * scale + 5, screenPos.y - width / 2 * scale, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    renderUI(selectedAircraft, canvas) {
        // Draw selection highlight
        if (selectedAircraft && selectedAircraft.isVisible()) {
            const screenPos = MapView.instance.worldToScreen(selectedAircraft.position);
            const radius = Math.max(selectedAircraft.width, selectedAircraft.length) * (selectedAircraft.scale || 1) / 2 + 6;

            this.ctx.save();
            this.ctx.strokeStyle = '#e94560';
            this.ctx.lineWidth = 3;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.restore();
        }
    }
}
