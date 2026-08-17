/**
 * Strip View - renders the aircraft strip list and updates
 */
class StripView {
    constructor(container, engine) {
        this.container = container;
        this.engine = engine;
    }

    render() {
        this.container.innerHTML = '';
        for (const aircraft of this.engine.aircraftList) {
            if (aircraft.state === 'FINISHED') continue;
            const strip = this._createStripElement(aircraft);
            this.container.appendChild(strip);
        }
    }

    _createStripElement(aircraft) {
        const div = document.createElement('div');
        div.className = 'strip-item';
        div.dataset.id = aircraft.id;
        div.textContent = `${aircraft.callsign} | ${aircraft.state} | ${Math.round(aircraft.speed)} kts`;
        div.addEventListener('click', () => {
            this.engine._selectAircraft(aircraft.id);
        });
        return div;
    }
}
