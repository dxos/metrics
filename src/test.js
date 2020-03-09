//
// Copyright 2020 DxOS.
//

import debug from 'debug';

import metrics from './index';

const log = debug('test');

class Demo {
  _metrics = metrics.register(this);

  async test () {
    await new Promise((resolve) => setTimeout(resolve, 10 + Math.random() * 100));
    this._metrics.inc('foo.test');
    return this;
  }
}

test('Basics', async () => {
  metrics.reset();

  {
    const demo = new Demo();
    const timer = metrics.start('foo.event');
    await demo.test();
    await demo.test();
    await demo.test();
    timer.end();
  }

  {
    const demo = new Demo();
    const timer = metrics.start('foo.event', { foo: 100 });
    await demo.test();
    timer.end({ bar: 200 });
  }

  log(JSON.stringify(metrics.stats, undefined, 2));
  log(metrics.filter());

  expect(metrics.filter({ source: Demo })).toHaveLength(4);
  expect(metrics.filter({ type: 'inc' })).toHaveLength(4);
  expect(metrics.filter({ key: 'foo.test' })).toHaveLength(4);
});

test('Counters', async () => {
  metrics.reset();

  metrics.inc('foo');
  metrics.inc('foo');
  metrics.dec('foo');

  expect(metrics.stats.foo).toEqual(1);
});

test('Values', async () => {
  metrics.reset();

  metrics.set('foo', 100);
  metrics.set('foo', 101);

  expect(metrics.stats.foo).toEqual(101);
  expect(metrics.filter({ key: 'foo' })).toHaveLength(2);
});

test('Time-series', async () => {
  metrics.reset();

  const work = async (i) => {
    const timer = metrics.start('work');
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));
    timer.end({ i });
  };

  for (let i = 0; i < 5; i++) {
    await work(i);
  }

  log(JSON.stringify(metrics.stats, undefined, 2));

  expect(metrics.stats.work[0].period).not.toBe(0);
});
