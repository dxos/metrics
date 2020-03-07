//
// Copyright 2020 DxOS.
//

import debug from 'debug';

import Metrics from './index';

const log = debug('test');
debug.enable('*');

class Demo {
  _metrics = Metrics.register(this);

  async test() {
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));
    this._metrics.inc('foo.test');
    return this;
  }
}

test('Basics', async () => {
  Metrics.reset();

  {
    const demo = new Demo();
    const period = Metrics.start('foo.event');
    await demo.test();
    await demo.test();
    await demo.test();
    period.end();
  }

  {
    const demo = new Demo();
    const period = Metrics.start('foo.event', { foo: 100 });
    await demo.test();
    period.end({ bar: 200 });
  }

  log(JSON.stringify(Metrics.stats, undefined, 2));

  expect(Metrics.filter({ type: 'inc' })).toHaveLength(4);
  expect(Metrics.filter({ key: 'foo.test' })).toHaveLength(4);
});

test('Counters', async () => {
  Metrics.reset();

  Metrics.inc('foo');
  Metrics.inc('foo');
  Metrics.dec('foo');

  expect(Metrics.stats['foo']).toEqual(1);
});

test('Values', async () => {
  Metrics.reset();

  Metrics.set('foo', 100);
  Metrics.set('foo', 101);

  expect(Metrics.stats['foo']).toEqual(101);
  expect(Metrics.filter({ key: 'foo' })).toHaveLength(2);
});

test('Time-series', async () => {
  Metrics.reset();

  const work = async () => {
    const period = Metrics.start('bar');
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));
    period.end();
  };

  await work();
  expect(Metrics.stats['bar'][0].period).not.toBe(0);
});
