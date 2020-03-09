//
// Copyright 2020 DxOS.
//

import assert from 'assert';
import filter from 'lodash.filter';
import get from 'lodash.get';
import matches from 'lodash.matches';
import set from 'lodash.set';

/**
 * Convenience method to convert class name into string.
 */
function typename (obj) {
  return typeof obj === 'string' ? obj : typeof obj === 'function' && obj.name;
}

/**
 * Aggregated values.
 */
export class Stats {
  _stats = {};

  get stats () {
    return this._stats;
  }

  reset () {
    this._stats = {};
  }

  inc (key) {
    const value = get(this._stats, key, 0);
    set(this._stats, key, value + 1);
    return this;
  }

  dec (key) {
    const value = get(this._stats, key, 0);
    set(this._stats, key, value - 1);
    return this;
  }

  set (key, value) {
    set(this._stats, key, value);
  }

  push (key, value) {
    const values = get(this._stats, key, []);
    set(this._stats, key, [...values, value]);
  }
}

/**
 * Hierarchical metrics gatherer.
 */
export class Metrics {
  static TYPE_INC = 'inc';
  static TYPE_DEC = 'dec';
  static TYPE_SET = 'set';
  static TYPE_PERIOD = 'period';

  // Map of listeners indexed by subscription object. */
  _listeners = new Map();

  /** type {Metrics[]} */
  _children = [];

  /** type {{ type, source, key }[]} */
  _metrics = [];

  constructor (name, parent) {
    this._name = name;
    this._parent = parent;
    this._stats = new Stats();
  }

  reset () {
    this._metrics = [];
    this._stats.reset();
  }

  /**
   * Creates a new metrics gatherer.
   * @param {Object|string} obj Either the owning instance or a given name for the gatherer.
   * @returns {Metrics}
   */
  extend (obj) {
    assert(obj);
    const metrics = new Metrics(typename(obj), this);
    this._children.push(metrics);
    return metrics;
  }

  //
  // Getters
  //

  get tags () {
    const getTags = (metrics, list) => {
      metrics._children.forEach(child => {
        list.add(child._name);
        getTags(child, list);
      });

      return list;
    };

    return getTags(this, new Set());
  }

  get stats () {
    return this._stats.stats;
  }

  /**
   * Filters the metrics log by object properties.
   * @param {Object} [match] Filter by properties (or return all if undefined).
   */
  filter (match) {
    if (match && match.source) {
      match.source = typename(match.source);
    }

    return filter(this._metrics, matches(match));
  }

  /**
   * Adds a listener for the given filter.
   * @param {object} match
   * @param {function} handler
   * @returns {function} Unregisters the handler.
   */
  on (match, handler) {
    this._listeners.set(match, handler);
    return () => this.off(match);
  }

  /**
   * Removes this listener.
   * @param {object} match
   */
  off (match) {
    this._listeners.delete(match);
  }

  _fireListeners (metric) {
    this._listeners.forEach((handler, filter) => {
      if (matches(filter)(metric)) {
        handler(metric);
      }
    });
  }

  //
  // Setters
  //

  /**
   * Increments the named counter.
   * @param {string} key
   */
  inc (key) {
    this._log({ type: Metrics.TYPE_INC, source: this._name, key, ts: Date.now() });
  }

  /**
   * Deccrements the named counter.
   * @param {string} key
   */
  dec (key) {
    this._log({ type: Metrics.TYPE_DEC, source: this._name, key, ts: Date.now() });
  }

  /**
   * Sets the value of the given key.
   * @param {string} key
   * @param {*} value
   */
  set (key, value) {
    this._log({ type: Metrics.TYPE_SET, source: this._name, key, ts: Date.now(), value });
  }

  /**
   * Creates a named timer.
   * @param {string} key
   * @param {Object} [customStart] Custom attributes for event.
   * @returns {{start: number, end: Function}}
   */
  start (key, customStart) {
    const start = Date.now();
    return {
      start,
      end: (customEnd) => {
        const end = Date.now();
        this._log({
          type: Metrics.TYPE_PERIOD,
          source: this._name,
          key,
          ts: start,
          period: end - start,
          ...(customStart || customEnd) && { custom: { ...customStart, ...customEnd } }
        });
      }
    };
  }

  _log (metric) {
    this._metrics.push(metric);

    const { type, key } = metric;
    switch (type) {
      case Metrics.TYPE_INC: {
        this._stats.inc(key);
        break;
      }

      case Metrics.TYPE_DEC: {
        this._stats.dec(key);
        break;
      }

      case Metrics.TYPE_SET: {
        this._stats.set(key, metric.value);
        break;
      }

      case Metrics.TYPE_PERIOD: {
        const { ts, period, custom } = metric;
        this._stats.push(key, { ts, period, ...custom && { custom } });
        break;
      }

      default:
        throw new Error('Unknown type:', type);
    }

    this._fireListeners(metric);

    if (this._parent) {
      this._parent._log(metric);
    }
  }
}

const root = new Metrics();

const f = (...args) => root.extend(...args);

// Clone the root object.
Object.setPrototypeOf(f, Object.getPrototypeOf(root));
Object.getOwnPropertyNames(root).forEach(key =>
  Object.defineProperty(f, key, Object.getOwnPropertyDescriptor(root, key))
);

export default f;
