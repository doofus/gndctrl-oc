/**
 * GndCtrl - Ground Traffic Control Simulator
 * Main application entry point
 */

// Store airport data globally for aircraft reference
window._airportData = AIRPORT_KSEA;

class App {
    constructor() {
        this.canvas = document.getElementById('map-canvas');
        this.engine = null;
        this.ui = null;
        this.airport = null;

        this._statusBar = document.getElementById('status-bar');
        this._airportSelect = document.getElementById('airport-select');

        this._init();
    }

    _init() {
        this._loadAirport(AIRPORT_KSEA.id);
        this._setupResize();
        this._setupAirportSelector();
        this._setupStatusBar();
        this._initDemoData();
    }

    _loadAirport(airportId) {
        const airportData = window[`AIRPORT_${airportId}`] || AIRPORT_KSEA;
        window._airportData = airportData;

        if (this.engine) {
            this.engine.stop();
        }

        this.airport = new Airport(airportData);

        this.engine = new GameEngine(this.canvas, this.airport);
        this.ui = new UIController(this.engine);
        this.engine.ui = this.ui;

        // Link command handler
        this.engine.commandHandler = new CommandHandler();

        // Set map center and zoom
        this.engine.mapView.setCenter(
            this.airport.position.lat,
            this.airport.position.lng,
            this.airport.zoom
        );
        this.engine.mapView.setCanvasDimensions(this.canvas.width, this.canvas.height);

        // Make UI globally accessible
        window.ui = this.ui;

        // Update pause button data attributes
        const btn1x = document.getElementById('btn-1x');
        const btn2x = document.getElementById('btn-2x');
        const btn5x = document.getElementById('btn-5x');
        if (btn1x) btn1x.dataset.speed = '1';
        if (btn2x) btn2x.dataset.speed = '2';
        if (btn5x) btn5x.dataset.speed = '5';

        EventBus.emit('airport.loaded', this.airport);
    }

    _setupResize() {
        const resize = () => {
            const displayWidth = this.canvas.offsetWidth;
            const displayHeight = this.canvas.offsetHeight;
            if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
                this.canvas.width = displayWidth;
                this.canvas.height = displayHeight;
            }
            if (this.engine) {
                this.engine.mapView.setCanvasDimensions(this.canvas.width, this.canvas.height);
                this.engine.resize();
            }
        };

        window.addEventListener('resize', resize);
        setTimeout(resize, 100);
    }

    _setupAirportSelector() {
        if (!this._airportSelect) return;

        this._airportSelect.addEventListener('change', (e) => {
            const newId = e.target.value;
            this._airportSelect.value = newId;
            this._loadAirport(newId);
            this._initDemoData();
            this.engine.start();
        });
    }

    _setupStatusBar() {
        EventBus.on('status.message', (msg) => {
            this._statusBar.textContent = msg;
            this._statusBar.className = 'status-message';
        });

        EventBus.on('engine.update', () => {
            const timeStr = this._formatSimTime();
            const acCount = this.engine.aircraftList.length;
            const simTimeEl = document.getElementById('sim-time');
            if (simTimeEl) simTimeEl.textContent = timeStr;
            this._statusBar.textContent = `Aircraft: ${acCount} | Selected: ${this.engine.selectedAircraft ? this.engine.selectedAircraft.callsign : '-'}`;
        });
    }

    _formatSimTime() {
        const totalSec = Math.floor(this.engine.clock.getSimTime());
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    _initDemoData() {
        // Clear existing aircraft
        this.engine.aircraftList = [];
        this.engine.aircraftById = {};
        this.engine.selectedAircraft = null;

        const gateIds = Object.keys(this.airport.gates);
        if (gateIds.length === 0) return;

        const acList = [];

        // Two departure aircraft
        if (gateIds[0] && AIRPORT_KSEA.gates) {
            const gate1 = gateIds[0];
            const ac1 = new Aircraft({
                id: 'AC001',
                callsign: 'AAL123',
                type: 'B738',
                startLat: this.airport.gates[gate1].lat,
                startLng: this.airport.gates[gate1].lng,
                heading: this.airport.gates[gate1].heading,
                gateId: gate1,
                flightPhase: 'departure',
                spawnTime: 0
            });
            acList.push(ac1);
        }

        if (gateIds[1] && AIRPORT_KSEA.gates) {
            const gate2 = gateIds[1];
            const ac2 = new Aircraft({
                id: 'AC002',
                callsign: 'UAL456',
                type: 'B777',
                startLat: this.airport.gates[gate2].lat,
                startLng: this.airport.gates[gate2].lng,
                heading: this.airport.gates[gate2].heading,
                gateId: gate2,
                flightPhase: 'departure',
                spawnTime: 5
            });
            acList.push(ac2);
        }

        if (gateIds[2] && AIRPORT_KSEA.gates) {
            const gate3 = gateIds[2];
            const ac3 = new Aircraft({
                id: 'AC003',
                callsign: 'DAL789',
                type: 'A320',
                startLat: this.airport.gates[gate3].lat,
                startLng: this.airport.gates[gate3].lng,
                heading: this.airport.gates[gate3].heading,
                gateId: gate3,
                flightPhase: 'arrival',
                spawnTime: 0
            });
            acList.push(ac3);
        }

        this.engine.aircraftList.push(...acList);
        acList.forEach(ac => {
            this.engine.aircraftById[ac.id] = ac;
        });

        // Auto-taxi departing aircraft
        setTimeout(() => {
            if (this.airport.taxiNodes['RWY16L_ENTRY'] && acList[0]) {
                const path = this.engine.taxiGraph.findPath(acList[0].currentNodeId || 'G1', 'RWY16L_ENTRY');
                if (path && acList[0]) acList[0].assignRoute(path, this.airport);
            }

            if (acList[1] && this.airport.taxiNodes['T5']) {
                const path2 = this.engine.taxiGraph.findPath(acList[1].currentNodeId || 'G2', 'T5');
                if (path2) acList[1].assignRoute(path2, this.airport);
            }

            if (acList[2] && this.airport.taxiNodes['RWY34L_EXIT']) {
                // Position arrival aircraft near runway exit, then taxi to gate
                acList[2].currentNodeId = 'RWY34L_EXIT';
                const path3 = this.engine.taxiGraph.findPath('RWY34L_EXIT', gateIds[2] || 'G3');
                if (path3) acList[2].assignRoute(path3, this.airport);
            }
        }, 500);
    }

    start() {
        if (this.engine) {
            this.engine.start();
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.app.start();
});
