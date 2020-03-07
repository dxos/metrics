//
// Copyright 2020 DxOS.
//

import EventEmitter from 'events';
import filter from 'lodash.filter';
import get from 'lodash.get';
import matches from 'lodash.matches';
import set from 'lodash.set';

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

  push(key, value) {
    const values = get(this._stats, key, []);
    set(this._stats, key, [...values, value]);
  }
}

const TYPE_INC = 'inc';
const TYPE_DEC = 'dec';
const TYPE_PERIOD = 'period';

/**
 * Hierarchical metrics gatherer.
 */
export class Metrics extends EventEmitter {

  static root = new Metrics();

  _metrics = [];

  constructor(name, parent) {
    super();
    this._name = name;
    this._parent = parent;
    this._stats = new Stats();
  }

  reset() {
    this._stats.reset();
  }

  register(obj) {
    const name = typeof obj === 'string' ? obj : obj.constructor.name;
    return new Metrics(name, this);
  }

  // Getters

  get stats() {
    return this._stats.stats;
  }

  /**
   * Filter by object properties.
   * @param {Object} object
   */
  filter(object) {
    return filter(this._metrics, matches(object));
  }

  // Setters

  /**
   * Increment the named counter.
   * @param {string} key
   */
  inc(key) {
    this._log({ type: TYPE_INC, name: this._name, key, ts: Date.now() });
  }

  /**
   * Deccrement the named counter.
   * @param {string} key
   */
  dec(key) {
    this._log({ type: TYPE_DEC, name: this._name, key, ts: Date.now() });
  }

  /**
   * Create a named timer.
   * @param {string} key
   * @returns {{start: number, end: Function}}
   */
  start(key) {
    const start = Date.now();
    return {
      start,
      end: () => {
        const end = Date.now();
        this._log({
          type: TYPE_PERIOD,
          name: this._name,
          key,
          start,
          end,
          period: end - start
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

      case TYPE_PERIOD: {
        this._stats.push(key, metric);
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
