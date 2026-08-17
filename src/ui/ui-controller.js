/**
 * UI Controller - manages strip views, command panel, and interactive elements
 */
class UIController {
    constructor(engine) {
        this.engine = engine;
        this.stripView = null;
        this._setupStripsContainer();
        this._setupEventListeners();
    }

    _setupStripsContainer() {
        const stripsEl = document.getElementById('strips');
        stripsEl.innerHTML = '';
        this._container = stripsEl;
        this._renderStrips();
    }

    _renderStrips() {
        this._container.innerHTML = '';
        for (const aircraft of this.engine.aircraftList) {
            const strip = this._createStrip(aircraft);
            this._container.appendChild(strip);
        }
    }

    _createStrip(aircraft) {
        const strip = document.createElement('div');
        strip.className = 'strip-item';
        strip.dataset.id = aircraft.id;

        if (this.engine.selectedAircraft && this.engine.selectedAircraft.id === aircraft.id) {
            strip.classList.add('selected');
        }

        const fields = [
            { label: 'Callsign', value: aircraft.callsign },
            { label: 'Type', value: aircraft.type },
            { label: 'State', value: aircraft.state },
            { label: 'Speed', value: `${Math.round(aircraft.speed)} kts` },
            { label: 'Route', value: aircraft.route ? aircraft.route.slice(-1)[0] : '-' }
        ];

        fields.forEach(f => {
            const row = document.createElement('div');
            row.className = 'strip-field';

            const label = document.createElement('span');
            label.className = 'strip-label';
            label.textContent = f.label;

            const value = document.createElement('span');
            value.className = 'strip-value';
            value.textContent = f.value;

            row.appendChild(label);
            row.appendChild(value);
            strip.appendChild(row);
        });

        strip.addEventListener('click', (e) => {
            e.stopPropagation();
            this._selectAircraft(aircraft.id);
        });

        return strip;
    }

    _selectAircraft(id) {
        this.engine._selectAircraft(id);
        this._renderStrips();
    }

    _setupEventListeners() {
        EventBus.on('engine.update', () => {
            this._renderStrips();
        });

        EventBus.on('aircraft.selected', () => {
            this._renderStrips();
        });

        EventBus.on('ui.showTaxiTargets', (aircraft) => {
            this._showTaxiTargets(aircraft);
        });
    }

    _showTaxiTargets(aircraft) {
        const targets = this.engine.airport.taxiGraph.getTargets(aircraft);
        let targetHtml = '<div style="margin-top:8px;font-size:11px"><b>Taxi to:</b><br>';
        targets.forEach(t => {
            targetHtml += `<div style="margin:2px 0">`;
            targetHtml += `<a href="#" onclick="window.ui.handleTaxiTarget('${t.nodeId}')" style="color:#4fc3f7">`;
            targetHtml += `${t.label} (${t.nodeId})`;
            targetHtml += `</a></div>`;
        });
        targetHtml += '</div>';

        const panel = document.getElementById('command-inputs');
        panel.innerHTML = targetHtml;
    }

    /**
     * Update command panel based on selected aircraft state
     */
    updateCommandPanel() {
        const panel = document.getElementById('command-inputs');
        if (!this.engine.selectedAircraft) {
            panel.innerHTML = '<p class="section-title">Select an aircraft to issue commands</p>';
            return;
        }

        const ac = this.engine.selectedAircraft;
        panel.innerHTML = '';

        const commands = this._getAvailableCommands(ac);
        commands.forEach(cmd => {
            const btn = document.createElement('button');
            btn.className = 'command-btn';
            btn.textContent = cmd.label;
            btn.onclick = () => this._runCommand(cmd, ac);
            panel.appendChild(btn);
        });
    }

    _getAvailableCommands(aircraft) {
        const cmds = [];

        if (aircraft.state === 'SPAWNING') {
            cmds.push({ label: 'Pushback', action: 'pushback' });
        }

        if (aircraft.state === 'TAXIING' || aircraft.state === 'SPAWNING') {
            cmds.push({ label: 'Taxi to Runway', action: 'taxi', arg: aircraft.flightPhase === 'departure' ? 'RUNWAY' : null });
            cmds.push({ label: 'Hold', action: 'hold' });
        }

        if (aircraft.state === 'HOLDING') {
            cmds.push({ label: 'Cleared to Go', action: 'go' });
        }

        cmds.push({ label: 'Set Speed', action: 'speed' });

        return cmds;
    }

    _runCommand(cmd, aircraft) {
        const inputMap = {
            'pushback': 'pushback',
            'hold': 'hold',
            'go': 'go'
        };

        if (inputMap[cmd.action]) {
            this.engine.commandHandler.execute(inputMap[cmd.action], {
                engine: this.engine,
                selectedAircraft: aircraft
            });
        }
    }
}
