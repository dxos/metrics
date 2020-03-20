//
// Copyright 2020 DxOS.
//

import get from 'lodash.get';
import set from 'lodash.set';

/**
 * Settable properties.
 */
export class Properties {
  _properties = {};

  get values () {
    return this._properties;
  }

  clear () {
    this._properties = {};
    return this;
  }

  get (key) {
    return get(this._properties, key);
  }

  inc (key) {
    const value = get(this._properties, key, 0);
    set(this._properties, key, value + 1);
    return this;
  }

  dec (key) {
    const value = get(this._properties, key, 0);
    set(this._properties, key, value - 1);
    return this;
  }

  set (key, value) {
    set(this._properties, key, value);
  }

  push (key, value) {
    const values = get(this._properties, key, []);
    set(this._properties, key, [...values, value]);
  }
}
