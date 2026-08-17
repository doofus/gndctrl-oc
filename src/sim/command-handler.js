/**
 * Command handler - processes user commands for aircraft
 */
class CommandHandler {
    constructor() {
        this.commands = {
            'taxi': this.cmdTaxi.bind(this),
            'pushback': this.cmdPushback.bind(this),
            'hold': this.cmdHold.bind(this),
            'go': this.cmdGo.bind(this),
            'speed': this.cmdSpeed.bind(this)
        };
    }

    /**
     * Execute a text command
     * @param {string} input - raw command text
     * @param {Object} context - { engine, airport, aircraftList }
     */
    execute(input, context) {
        const parts = input.trim().toLowerCase().split(/\s+/);
        const cmd = parts[0];
        const args = parts.slice(1);
        const handler = this.commands[cmd];

        if (!handler) {
            EventBus.emit('status.message', `Unknown command: ${cmd}`);
            return;
        }

        return handler(args, context);
    }

    cmdTaxi(args, context) {
        const { engine, selectedAircraft } = context;
        if (!selectedAircraft) {
            EventBus.emit('status.message', 'Select an aircraft first');
            return;
        }

        const target = args[0];
        if (!target) {
            EventBus.emit('ui.showTaxiTargets', selectedAircraft);
            return;
        }

        // Resolve target to a node
        let targetNode = target.toUpperCase();

        // If it's a runway name, find appropriate entry/exit node
        if (engine.airport.runways[targetNode]) {
            const rwy = engine.airport.runways[targetNode];
            targetNode = selectedAircraft.flightPhase === 'departure'
                ? `RWY${targetNode}_ENTRY`
                : `RWY${parseInt(targetNode) - 18}_EXIT`; // rough reverse
        }

        const path = engine.taxiGraph.findPath(selectedAircraft.currentNodeId, targetNode);
        if (!path) {
            EventBus.emit('status.message', `No taxi path to ${targetNode}`);
            return;
        }

        selectedAircraft.assignRoute(path, engine.airport);

        const nodeNames = path.map(n => n.substring(0, 8));
        EventBus.emit('status.message', `Taxi to ${target}: ${nodeNames.join(' → ')}`);
    }

    cmdPushback(args, context) {
        const { selectedAircraft, engine } = context;
        if (!selectedAircraft) {
            EventBus.emit('status.message', 'Select an aircraft first');
            return;
        }

        const [result, msg] = selectedAircraft.initiatePushback(engine.airport);
        EventBus.emit('status.message', `${selectedAircraft.callsign}: ${msg}`);
    }

    cmdHold(args, context) {
        const { selectedAircraft } = context;
        if (!selectedAircraft) {
            EventBus.emit('status.message', 'Select an aircraft first');
            return;
        }

        selectedAircraft.hold();
        EventBus.emit('status.message', `${selectedAircraft.callsign}: Holding`);
    }

    cmdGo(args, context) {
        const { selectedAircraft } = context;
        if (!selectedAircraft) {
            EventBus.emit('status.message', 'Select an aircraft first');
            return;
        }

        selectedAircraft.resumeTaxi();
        EventBus.emit('status.message', `${selectedAircraft.callsign}: Cleared to taxi`);
    }

    cmdSpeed(args, context) {
        const { selectedAircraft } = context;
        if (!selectedAircraft) {
            EventBus.emit('status.message', 'Select an aircraft first');
            return;
        }

        const speed = parseInt(args[0]);
        if (isNaN(speed) || speed < 0 || speed > 30) {
            EventBus.emit('status.message', 'Speed must be 0-30 knots');
            return;
        }

        selectedAircraft.maxSpeed = speed;
        EventBus.emit('status.message', `${selectedAircraft.callsign}: Taxi speed ${speed} knots`);
    }
}
