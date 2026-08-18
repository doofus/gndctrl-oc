/**
 * Core Game Engine
 * Manages the main game loop, state, and coordination between simulation and rendering
 */
class GameEngine {
    constructor(canvas, airport) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.clock = new GameClock();
        this.renderer = new Renderer(this.ctx);
        this.mapView = new MapView(this.renderer);
        this.commandHandler = new CommandHandler();

        this.airport = airport;
        this.aircraftList = [];
        this.aircraftById = {};
        this.selectedAircraft = null;

        this._running = false;
        this._rafId = null;
        this._initAirportGraph();
        this._spawnTimer = 0;
        this._setupEventListeners();
    }

    /** Build the taxiway graph from airport data */
    _initAirportGraph() {
        const graph = {};
        const nodes = this.airport.taxiNodes;
        const edges = this.airport.taxiEdges;

        // Build adjacency list with real distances
        for (const nodeId in edges) {
            if (!graph[nodeId]) graph[nodeId] = {};
            const neighbors = edges[nodeId];
            for (const neighborId in neighbors) {
                const dist = neighbors[neighborId];
                graph[nodeId][neighborId] = dist;

                // Add reverse edge if not present
                if (!graph[neighborId]) graph[neighborId] = {};
                if (graph[neighborId][nodeId] === undefined) {
                    graph[neighborId][nodeId] = dist;
                }
            }
        }

        this.taxiGraph = graph;
    }

    /** Set up event handlers */
    _setupEventListeners() {
        const self = this;

        // Speed control buttons
        document.getElementById('btn-pause').addEventListener('click', () => {
            self.clock.togglePause();
            self._updatePauseButton();
            if (self.clock.paused) {
                self.clock.pause();
            }
        });

        document.getElementById('btn-1x').addEventListener('click', () => self._setSpeed(1));
        document.getElementById('btn-2x').addEventListener('click', () => self._setSpeed(2));
        document.getElementById('btn-5x').addEventListener('click', () => self._setSpeed(5));

        // Canvas click for aircraft selection
        this.canvas.addEventListener('click', (e) => self._onCanvasClick(e));

        // Event bus listeners
        EventBus.on('aircraft.select', (id) => self._selectAircraft(id));
        EventBus.on('aircraft.taxi', (data) => self._assignTaxiRoute(data));
        EventBus.on('speed.change', (speed) => self.clock.speed = speed);
        EventBus.on('airport.select', (airportId) => self._switchAirport(airportId));
    }

    _setSpeed(speed) {
        this.clock.speed = speed;
        document.querySelectorAll('.control-btn[data-speed]').forEach(btn => {
            btn.classList.remove('active');
        });
        const btn = document.querySelector(`.control-btn[data-speed="${speed}"]`);
        if (btn) btn.classList.add('active');
    }

    _updatePauseButton() {
        const btn = document.getElementById('btn-pause');
        btn.textContent = this.clock.paused ? '▶' : '⏸';
    }

    /** Main game loop */
    _loop(timestamp) {
        if (!this._running) return;

        const dt = this.clock.update(timestamp);

        if (!this.clock.paused && dt > 0) {
            this._update(dt);
        }

        this._render();

        this._rafId = requestAnimationFrame((ts) => this._loop(ts));
    }

    /** Update simulation */
    _update(dt) {
        // Spawn new aircraft
        this._spawnTimer += dt;
        this._spawnAircraft();

        // Update all aircraft
        for (let i = 0; i < this.aircraftList.length; i++) {
            const aircraft = this.aircraftList[i];
            aircraft.update(dt);
        }

        // Clean up finished aircraft
        this._cleanupAircraft();

        EventBus.emit('engine.update', { dt });
    }

    /** Render everything */
    _render() {
        this.renderer.clear(this.ctx);
        this.mapView.render(this.airport, this.ctx);
        this.renderer.renderAircraft(this.aircraftList, this.ctx);
        this.renderer.renderUI(this.selectedAircraft, this.canvas);
    }

    /** Spawn aircraft based on spawn patterns */
    _spawnAircraft() {
        const simTimeHours = this.clock.getSimTime() / 3600;
        for (const pattern of this.airport.spawnPatterns) {
            // Simple spawn rate logic
            const expectedCount = simTimeHours * pattern.rate;
            // In a real implementation, this would spawn aircraft at gates/runways
        }
    }

    _cleanupAircraft() {
        this.aircraftList = this.aircraftList.filter(ac => {
            if (ac.state === 'finished' || ac.state === 'removed') {
                delete this.aircraftById[ac.id];
                return false;
            }
            return true;
        });
    }

    /** Handle click on canvas for aircraft selection */
    _onCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

        // Convert screen to world coordinates
        const worldPos = this.mapView.screenToWorld(x, y);

        // Find clicked aircraft
        const clicked = this.aircraftList.find(ac => {
            if (!ac.isVisible()) return false;
            const screenPos = this.mapView.worldToScreen(ac.position.lat, ac.position.lng);
            const dx = screenPos.x - x;
            const dy = screenPos.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            return dist < 25; // 25px hit box
        });

        if (clicked) {
            this._selectAircraft(clicked.id);
        }
    }

    _selectAircraft(id) {
        this.selectedAircraft = this.aircraftById[id] || null;
        EventBus.emit('aircraft.selected', this.selectedAircraft);
    }

    /** Assign a taxi route to an aircraft */
    _assignTaxiRoute({ aircraftId, target }) {
        const aircraft = this.aircraftById[aircraftId];
        if (!aircraft) return;

        let targetNode;
        if (target.type === 'runway') {
            // Find the closest runway entry node
            const entryNodeId = `RWY${target.runway}_${target.direction === 'dep' ? 'ENTRY' : 'EXIT'}`;
            targetNode = entryNodeId;
        } else {
            targetNode = target.nodeId;
        }

        if (!targetNode || !this.taxiGraph[targetNode]) {
            EventBus.emit('status.message', `Invalid taxi target: ${targetNode}`);
            return;
        }

        const path = Dijkstra.findPath(this.taxiGraph, aircraft.currentNodeId, targetNode);

        if (!path) {
            EventBus.emit('status.message', 'No valid taxi route to target');
            return;
        }

        aircraft.assignRoute(path, this.airport);
        EventBus.emit('status.message', `Taxi route assigned: ${path.join(' -> ')}`);
    }

    /** Start the game */
    start() {
        this.clock.resume();
        this._paused = false;
        this._updatePauseButton();
        this._running = true;
        this._rafId = requestAnimationFrame((ts) => this._loop(ts));
    }

    /** Stop the game */
    stop() {
        this._running = false;
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
        }
    }

    /** Resize handler */
    resize() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
        this.mapView.setCanvasDimensions(this.canvas.width, this.canvas.height);
        if (this.airport) {
            this.mapView.setCenter(
                this.airport.position.lat,
                this.airport.position.lng,
                this.airport.zoom,
                this.airport
            );
        }
        this._render();
    }

    _switchAirport(airportId) {
        // Load the airport module and rebuild
        const airportData = window[`AIRPORT_${airportId}`];
        if (!airportData) {
            console.error(`Airport ${airportId} not found`);
            return;
        }
        window._airportData = airportData;
        this.airport = airportData;
        this._initAirportGraph();
        this.aircraftList = [];
        this.aircraftById = {};
        this.selectedAircraft = null;
        window._airportData = window[`AIRPORT_${airportId}`];
        this._render();
    }
}
