const EventEmitter = require('events');

class Clock extends EventEmitter {
  constructor() {
    super();
    this.startTime = 0;
    this.stopped = true;
    this._intervals = new Map();
  }
  start() {
    this.startTime = this.lastTime = Date.now();
    this.stopped = false;
    if (this._timerID) {
      clearInterval(this._timerID);
    }
    // fire every 1/10s
    this._timerID = setInterval(() => this.tick(), 100);
  }
  tick() {
    if (this.stopped) return;
    let now = Date.now();
    let elapsed;
    // check to see if any of the registered intervals have elapsed
    for (let [duration, previousMs] of this._intervals) {
      elapsed = now - previousMs;
      if (elapsed >= duration) {
        this.emit("interval-" + duration, now, elapsed);
        this._intervals.set(duration, now);
      }
    }
    this.lastTime = now;
  }
  registerInterval(ms) {
    if (this._intervals.has(ms)) {
      return;
    }
    this._intervals.set(ms, this.lastTime);
  }
}

module.exports = new Clock();
