//
// Copyright 2020 DxOS.
//

import assert from 'assert';
import filter from 'lodash.filter';
import matches from 'lodash.matches';

import { Properties } from './properties';

/**
 * Convenience method to convert class name into string.
 */
function typename (obj) {
  return typeof obj === 'string' ? obj : typeof obj === 'function' && obj.name;
}

/**
 * Hierarchical metrics gatherer.
 */
export class Metrics {
  static TYPE_INC = 'inc';
  static TYPE_DEC = 'dec';
  static TYPE_SET = 'set';
  static TYPE_DELETE = 'delete';
  static TYPE_PERIOD = 'period';

  /**
   * Map of listeners indexed by subscription object.
   * @type {Map<Number, { match, handler }>}
   */
  _listeners = new Map();

  /** type {Metrics[]} */
  _children = [];

  /** type {{ type, source, key }[]} */
  _metrics = [];

  _properties = new Properties();

  constructor (name, parent = root) {
    assert(name);
    this._name = typename(name);
    this._parent = parent;
  }

  reset () {
    // Keep existing object (due to reference).
    this._metrics.length = 0;
    this._properties.clear();
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

  get values () {
    return this._properties.values;
  }

  get (key) {
    return this._properties.get(key);
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
    const handle = Math.random();
    this._listeners.set(handle, { match, handler });
    return () => this.off(handle);
  }

  /**
   * Removes this listener.
   * @param {Number} handle
   */
  off (handle) {
    this._listeners.delete(handle);
  }

  _fireListeners (metric) {
    this._listeners.forEach(({ handler, filter }) => {
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
   * Deletes the given key.
   * @param {string} key
   */
  delete (key) {
    this._log({ type: Metrics.TYPE_DELETE, source: this._name, key, ts: Date.now() });
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
        this._properties.inc(key);
        break;
      }

      case Metrics.TYPE_DEC: {
        this._properties.dec(key);
        break;
      }

      case Metrics.TYPE_SET: {
        this._properties.set(key, metric.value);
        break;
      }

      case Metrics.TYPE_DELETE: {
        this._properties.delete(key);
        break;
      }

      case Metrics.TYPE_PERIOD: {
        const { ts, period, custom } = metric;
        this._properties.push(key, { ts, period, ...custom && { custom } });
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

const root = new Metrics('__ROOT__', null);

/**
 * Metrics factory.
 * @param args
 * @returns {Metrics}
 */
function metrics (...args) {
  return new Metrics(...args);
}

// Clone the root object's properties.
Object.setPrototypeOf(metrics, Object.getPrototypeOf(root));
Object.getOwnPropertyNames(root).forEach(key => {
  Object.defineProperty(metrics, key, Object.getOwnPropertyDescriptor(root, key));
});

export default metrics;
