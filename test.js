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
    const period = Metrics.start('foo.period');
    await demo.test();
    await demo.test();
    await demo.test();
    period.end();
  }

  {
    const demo = new Demo();
    const period = Metrics.start('foo.period');
    await demo.test();
    period.end();
  }

  log(JSON.stringify(Metrics.stats, undefined, 2));
  log(Metrics.filter({ type: 'inc' }));
  log(Metrics.filter({ key: 'foo.test' }));
});

test('counter', async () => {
  Metrics.reset();

  Metrics.inc('foo');
  Metrics.inc('foo');
  Metrics.inc('foo');

  expect(Metrics.stats['foo']).toEqual(Metrics.filter({ key: 'foo' }).length);
});

test('time-series', async () => {
  Metrics.reset();

  const work = async () => {
    const period = Metrics.start('bar');
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));
    period.end();
  };

  await work();
  expect(Metrics.stats['bar'][0].period).not.toBe(0);
});
