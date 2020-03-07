//
// Copyright 2020 DxOS.
//

import assert from 'assert';
import EventEmitter from 'events';
import filter from 'lodash.filter';
import get from 'lodash.get';
import matches from 'lodash.matches';
import set from 'lodash.set';

function typename(obj) {
  return typeof obj === 'string' ? obj :
    typeof obj === 'function' ? `type:${obj.name}` :
      `type:${obj.constructor.name}`;
}

/**
 * Aggregated values.
 */
export class Stats {

  _stats = {};

  get stats() {
    return this._stats;
  }

  reset() {
    this._stats = {};
  }

  inc(key) {
    const value = get(this._stats, key, 0);
    set(this._stats, key, value + 1);
    return this;
  }

  dec(key) {
    const value = get(this._stats, key, 0);
    set(this._stats, key, value - 1);
    return this;
  }

  set(key, value) {
    set(this._stats, key, value);
  }

  push(key, value) {
    const values = get(this._stats, key, []);
    set(this._stats, key, [...values, value]);
  }
}

const TYPE_INC = 'inc';
const TYPE_DEC = 'dec';
const TYPE_SET = 'set';
const TYPE_PERIOD = 'period';

/**
 * Hierarchical metrics gatherer.
 */
export class Metrics extends EventEmitter {

  static root = new Metrics();

  // Ordered list of metrics.
  _metrics = [];

  constructor(name, parent) {
    super();
    this._name = name;
    this._parent = parent;
    this._stats = new Stats();
  }

  reset() {
    this._metrics = [];
    this._stats.reset();
  }

  /**
   * Creates a new metrics gatherer.
   * @param {Object|string} obj Either the owning instance or a given name for the gatherer.
   * @returns {Metrics}
   */
  register(obj) {
    assert(obj);
    return new Metrics(typename(obj), this);
  }

  //
  // Getters
  //

  get stats() {
    return this._stats.stats;
  }

  /**
   * Filters the metrics log by object properties.
   * @param {Object} [object] Filter by properties (or return all if undefined).
   */
  filter(object) {
    if (object && object.source) {
      object.source = typename(object.source);
    }

    return filter(this._metrics, matches(object));
  }

  //
  // Setters
  //

  /**
   * Increments the named counter.
   * @param {string} key
   */
  inc(key) {
    this._log({ type: TYPE_INC, source: this._name, key, ts: Date.now() });
  }

  /**
   * Deccrements the named counter.
   * @param {string} key
   */
  dec(key) {
    this._log({ type: TYPE_DEC, source: this._name, key, ts: Date.now() });
  }

  /**
   * Sets the value of the given key.
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    this._log({ type: TYPE_SET, source: this._name, key, ts: Date.now(), value });
  }

  /**
   * Creates a named timer.
   * @param {string} key
   * @param {Object} [customStart] Custom attributes for event.
   * @returns {{start: number, end: Function}}
   */
  start(key, customStart) {
    const start = Date.now();
    return {
      start,
      end: (customEnd) => {
        const end = Date.now();
        this._log({
          type: TYPE_PERIOD,
          source: this._name,
          key,
          ts: start,
          period: end - start,
          ...(customStart || customEnd) && { custom: { ...customStart, ...customEnd } }
        });
      }
    }
  }

  _log(metric) {
    this._metrics.push(metric);

    const { type, key } = metric;
    switch (type) {
      case TYPE_INC: {
        this._stats.inc(key);
        break;
      }

      case TYPE_DEC: {
        this._stats.dec(key);
        break;
      }

      case TYPE_SET: {
        this._stats.set(key, metric.value);
        break;
      }

      case TYPE_PERIOD: {
        const { ts, period, custom } = metric;
        this._stats.push(key, { ts, period, ...custom && { custom } });
        break;
      }

      default:
        throw new Error(`Unknown type: ${type}`);
    }

    this.emit('update', this.stats);
    if (this._parent) {
      this._parent._log(metric);
    }
  }
}

export default Metrics.root;
