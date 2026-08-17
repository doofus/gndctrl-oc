/**
 * Math utilities for distance, heading, and interpolation
 */
const MathUtil = {
    /** Degrees to radians */
    toRad(deg) {
        return deg * Math.PI / 180;
    },

    /** Radians to degrees */
    toDeg(rad) {
        return rad * 180 / Math.PI;
    },

    /** Distance between two lat/lng coordinates in meters (Haversine) */
    haversine(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Earth radius in meters
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    },

    /** Bearing from point A to point B in degrees (0 = north) */
    bearing(lat1, lon1, lat2, lon2) {
        const dLon = this.toRad(lon2 - lon1);
        const y = Math.sin(dLon) * Math.cos(this.toRad(lat2));
        const x = Math.cos(this.toRad(lat1)) * Math.sin(this.toRad(lat2)) -
                  Math.sin(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.cos(dLon);
        return (this.toDeg(Math.atan2(y, x)) + 360) % 360;
    },

    /** Normalize angle to [-180, 180] */
    normalizeAngle(angle) {
        let a = angle % 360;
        if (a > 180) a -= 360;
        if (a < -180) a += 360;
        return a;
    },

    /** Shortest angular difference */
    angleDiff(a, b) {
        return this.normalizeAngle(a - b);
    },

    /** Linear interpolation */
    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    /** Clamp value between min and max */
    clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    }
};
