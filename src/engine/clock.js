/**
 * Game clock - tracks simulated game time
 * Real-time with variable speed and pause capability
 */
class GameClock {
    constructor() {
        this._lastTimestamp = 0;
        this._simTime = 0; // seconds of simulated time since start
        this._speed = 1; // 1x, 2x, 5x
        this._paused = true;
    }

    get speed() {
        return this._speed;
    }

    set speed(value) {
        this._speed = value;
    }

    get paused() {
        return this._paused;
    }

    pause() {
        this._paused = true;
    }

    resume() {
        this._paused = false;
    }

    togglePause() {
        this._paused = !this._paused;
        this._lastTimestamp = performance.now();
    }

    getSimTime() {
        return this._simTime;
    }

    /**
     * Called each animation frame
     * @param {number} timestamp - from requestAnimationFrame
     * @returns {number} - delta simulated seconds since last call
     */
    update(timestamp) {
        if (this._paused) {
            this._lastTimestamp = timestamp;
            return 0;
        }

        const realDelta = timestamp - this._lastTimestamp;
        this._lastTimestamp = timestamp;

        // Convert real ms to simulated seconds
        const realSeconds = realDelta / 1000;
        const simSeconds = realSeconds * this._speed;
        this._simTime += simSeconds;

        return simSeconds;
    }
}
