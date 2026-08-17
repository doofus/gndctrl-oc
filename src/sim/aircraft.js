/**
 * Aircraft simulation model
 * Tracks position, heading, speed, state, and taxi route progress
 *
 * States:
 *   SPAWNING  - Just created, entering from gate
 *   TAXIING   - Moving along assigned route
 *   HOLDING   - Waiting (runway queue, conflict, etc.)
 *   PUSHBACK  - Pushback in progress
 *   FINISHED  - Left the airport / completed
 */
class Aircraft {
    constructor(data) {
        this.id = data.id || `AC_${Math.random().toString(36).substr(2, 9)}`;
        this.callsign = data.callsign;
        this.type = data.type; // e.g. 'B738'
        this.airline = data.airline || '';

        // Position
        this.position = {
            lat: data.startLat || 0,
            lng: data.startLng || 0
        };
        this.heading = data.heading || 0;
        this.targetHeading = this.heading;

        // Movement
        this.speed = 0; // knots
        this.maxSpeed = data.maxSpeed || 20;
        this.acceleration = data.acceleration || 1.5; // knots per second sim time
        this.deceleration = data.deceleration || 2.0;

        // Route
        this.route = null; // array of node IDs
        this.routeIndex = 0;
        this.currentTargetNode = null;
        this.currentNodeId = null;

        // State
        this.state = 'SPAWNING';
        this.flightPhase = data.flightPhase || 'departure'; // 'departure' or 'arrival'
        this.gateId = data.gateId || null;

        // Aircraft type info
        const typeInfo = AIRPORT_KSEA.aircraftTypes[this.type] || AIRPORT_KSEA.aircraftTypes['B738'];
        this.taxiSpeed = typeInfo.taxiSpeed || 20;
        this.width = typeInfo.width || 35;
        this.length = typeInfo.length || 38;
        this.scale = 0.5;

        // Timing
        this.spawnTime = data.spawnTime || 0;
        this.totalTaxiTime = 0;
        this.stateTime = 0;

        // Visual
        this.color = this._getColorForType();
    }

    _getColorForType() {
        const colors = {
            'A320': '#5cb85c',
            'A320neo': '#4cae4c',
            'B738': '#337ab7',
            'B777': '#9b59b6',
            'CRJ9': '#f0ad4e'
        };
        return colors[this.type] || '#5cb85c';
    }

    getColor() {
        return this.color;
    }

    getStatusColor() {
        const colors = {
            'SPAWNING': '#f0ad4e',
            'TAXIING': '#5cb85c',
            'HOLDING': '#e94560',
            'PUSHBACK': '#f0ad4e',
            'FINISHED': '#888888'
        };
        return colors[this.state] || '#888888';
    }

    isVisible() {
        return this.state !== 'FINISHED' && this.state !== 'REMOVED';
    }

    /**
     * Assign a taxi route (array of node IDs)
     * @param {string[]} path - ordered list of node IDs
     * @param {Object} airport - airport data
     */
    assignRoute(path, airport) {
        if (!path || path.length < 2) {
            EventBus.emit('status.message', 'No valid route to target');
            return false;
        }

        this.route = path;
        this.routeIndex = 0;
        this.currentNodeId = path[0];

        // Set position to first node
        const startNode = airport.taxiNodes[path[0]];
        if (startNode) {
            this.position.lat = startNode.lat;
            this.position.lng = startNode.lng;
        }

        // Set target to next node
        this._advanceToNextNode(airport);

        this.state = 'TAXIING';
        EventBus.emit('aircraft.routeAssigned', { aircraft: this, path });
        return true;
    }

    _advanceToNextNode(airport) {
        this.routeIndex++;
        if (this.routeIndex >= this.route.length) {
            // Reached destination
            this._onRouteComplete();
            return;
        }

        this.currentNodeId = this.route[this.routeIndex];
        this.currentTargetNode = airport.taxiNodes[this.currentNodeId];
        if (!this.currentTargetNode) {
            this._onRouteComplete();
            return;
        }

        // Calculate heading to next node
        this.targetHeading = MathUtil.bearing(
            this.position.lat, this.position.lng,
            this.currentTargetNode.lat, this.currentTargetNode.lng
        );

        // Calculate distance to next node
        const distance = MathUtil.haversine(
            this.position.lat, this.position.lng,
            this.currentTargetNode.lat, this.currentTargetNode.lng
        );
        this._distanceToNextNode = distance;
    }

    _onRouteComplete() {
        this.state = 'HOLDING';
        this.speed = 0;
        this.routeIndex = this.route.length;
        EventBus.emit('aircraft.reachedDestination', this);

        // For departures, this means at the runway - ready for takeoff
        if (this.flightPhase === 'departure') {
            this.state = 'FINISHED';
            EventBus.emit('aircraft.departed', this);
        }
    }

    /**
     * Main update method - called every frame by the engine
     * @param {number} dt - delta time in simulated seconds
     */
    update(dt) {
        this.stateTime += dt;
        this.totalTaxiTime += dt;

        if (this.state === 'SPAWNING') {
            this._updateSpawning(dt);
        } else if (this.state === 'TAXIING') {
            this._updateTaxiing(dt);
        } else if (this.state === 'HOLDING') {
            // No movement
        } else if (this.state === 'PUSHBACK') {
            this._updatePushback(dt);
        }
    }

    _updateSpawning(dt) {
        // Fade in or just mark as taxiing after spawn delay
        if (this.stateTime > 2) {
            // Start moving toward gate exit node if no route assigned
            if (!this.route) {
                this.state = 'TAXIING';
            }
        }
    }

    _updateTaxiing(dt) {
        if (!this.route || !this.currentTargetNode) return;

        const nextNode = this.currentTargetNode;
        const distance = MathUtil.haversine(
            this.position.lat, this.position.lng,
            nextNode.lat, nextNode.lng
        );

        if (distance < 2) {
            // Near target node, advance to next
            this._advanceToNextNode(window._airportData || AIRPORT_KSEA);
            if (this.state === 'HOLDING' || this.state === 'FINISHED') return;
        }

        // Accelerate toward target speed
        if (this.speed < this.taxiSpeed) {
            this.speed = Math.min(this.speed + this.acceleration * dt, this.taxiSpeed);
        }

        // Turn toward target heading
        const headingDiff = MathUtil.angleDiff(this.targetHeading, this.heading);
        const turnRate = 30; // degrees per second (sim time)
        if (Math.abs(headingDiff) > 1) {
            this.heading += Math.sign(headingDiff) * Math.min(Math.abs(headingDiff), turnRate * dt);
        }

        // Move forward based on heading and speed
        // speed is in knots, convert to m/s, then to lat/lng deltas
        const speedMps = this.speed * 0.514444; // knots to m/s
        const distanceThisFrame = speedMps * dt; // meters

        // Convert bearing/distance to lat/lng delta
        const bearingRad = MathUtil.toRad(this.heading);
        const earthRadius = 6371000; // meters
        const deltaLat = (distanceThisFrame / earthRadius) * (180 / Math.PI) / Math.cos(MathUtil.toRad(this.position.lng));
        const deltaLng = (distanceThisFrame / earthRadius) * (180 / Math.PI) / Math.cos(MathUtil.toRad(this.position.lat));

        // Note: this is approximate for small distances
        this.position.lat += deltaLat * Math.cos(bearingRad);
        this.position.lng += deltaLng * Math.sin(bearingRad);

        this.targetHeading = this.heading;
    }

    _updatePushback(dt) {
        // Pushback moves aircraft backward at fixed speed
        const pushbackSpeed = 2; // knots
        const bearingRad = MathUtil.toRad(this.heading + 180);
        const speedMps = pushbackSpeed * 0.514444;
        const distanceThisFrame = speedMps * dt;

        const earthRadius = 6371000;
        const deltaLat = (distanceThisFrame / earthRadius) * (180 / Math.PI) / Math.cos(MathUtil.toRad(this.position.lng));
        const deltaLng = (distanceThisFrame / earthRadius) * (180 / Math.PI) / Math.cos(MathUtil.toRad(this.position.lat));

        this.position.lat += deltaLat * Math.cos(bearingRad);
        this.position.lng += deltaLng * Math.sin(bearingRad);

        if (this.stateTime > 30) { // 30 second pushback
            this.state = 'TAXIING';
        }
    }

    initiatePushback(airport) {
        if (this.state !== 'SPAWNING' && this.state !== 'HOLDING') {
            return [false, 'Aircraft is not at the gate'];
        }

        this.state = 'PUSHBACK';
        this.stateTime = 0;
        this.speed = 2;
        EventBus.emit('aircraft.pushback', this);
        return [true, 'Commencing pushback'];
    }

    hold() {
        this.speed = 0;
        this.state = 'HOLDING';
    }

    resumeTaxi() {
        if (this.state === 'HOLDING' && this.route) {
            this.state = 'TAXIING';
        }
    }

    /**
     * Check for conflicts (proximity to other aircraft)
     * @param {Aircraft[]} allAircraft
     */
    checkConflicts(allAircraft) {
        for (const other of allAircraft) {
            if (other.id === this.id) continue;
            if (other.state === 'FINISHED' || !other.isVisible()) continue;

            const distance = MathUtil.haversine(
                this.position.lat, this.position.lng,
                other.position.lat, other.position.lng
            );

            // Conflict if within 50 meters
            if (distance < 50) {
                return other;
            }
        }
        return null;
    }
}
