//
// Copyright 2020 DxOS.
//

import debug from 'debug';

import metrics, { Metrics } from './metrics';

const log = debug('test');

class Demo {
  _m = metrics(Demo);

  async test () {
    await new Promise((resolve) => setTimeout(resolve, 10 + Math.random() * 100));
    this._m.inc('foo.test');
    return this;
  }
}

test('Subscriptions', async (done) => {
  metrics.reset();
  const m = metrics('test');

  let count = 0;
  const off = m.on(null, ({ key }) => {
    expect(key).toBe('test-1');
    count++;
    if (count === 3) {
      off();
      expect(m._listeners.size).toBe(0);
      done();
    }
  });

  m.inc('test-1');
  m.inc('test-1');
  m.inc('test-1');
});

test('Basics', async () => {
  metrics.reset();
  const m = metrics('test');

  let count = 0;
  const off = m.on({ type: Metrics.TYPE_PERIOD }, metric => {
    count++;
  });

  {
    const demo = new Demo();
    const timer = m.start('foo.event');
    await demo.test();
    await demo.test();
    await demo.test();
    timer.end();
  }

  {
    const demo = new Demo();
    const timer = m.start('foo.event', { foo: 100 });
    await demo.test();
    timer.end({ bar: 200 });
  }

  log(JSON.stringify(metrics.values, undefined, 2));
  log(metrics.tags);

  expect(metrics.filter({ source: Demo })).toHaveLength(4);
  expect(metrics.filter({ source: Demo, key: 'foo.test' })).toHaveLength(4);
  expect(metrics.filter({ type: Metrics.TYPE_INC })).toHaveLength(4);
  expect(metrics.filter({ type: Metrics.TYPE_PERIOD })).toHaveLength(count);

  off();

  expect(metrics._listeners.size).toBe(0);
});

test('Counters', async () => {
  metrics.reset();
  const m = metrics('test');

  m.inc('foo');
  m.inc('foo');
  m.dec('foo');

  expect(m.values.foo).toEqual(1);
});

test('Values', async () => {
  metrics.reset();
  const m = metrics('test');

  m.set('foo', 100);
  m.set('foo', 101);

  expect(m.values.foo).toEqual(101);
  expect(m.filter({ key: 'foo' })).toHaveLength(2);
});

test('Time-series', async () => {
  metrics.reset();
  const m = metrics('test');

  const work = async (i) => {
    const timer = m.start('work');
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));
    timer.end({ i });
  };

  for (let i = 0; i < 5; i++) {
    await work(i);
  }

  log(JSON.stringify(m.values, undefined, 2));

  expect(m.values.work[0].period).not.toBe(0);
});
