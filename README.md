# Metrics

A simple, lightweight and extensible metrics gathering system.

## Install

```
$ npm install @dxos/metrics
```

## Usage

### Counters

```javascript
import Metrics from '@dxos/metrics';

Metrics.inc('foo');
Metrics.inc('foo');
Metrics.inc('foo');

expect(Metrics.stats['foo']).toEqual(Metrics.filter({ key: 'foo' }).length);
```

### Time Series

```javascript
import Metrics from '@dxos/metrics';

const work = async () => {
  const period = Metrics.start('bar');
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));
  period.end();
};

const test = async () => {
  await work();
  expect(Metrics.stats['bar'][0].period).not.toBe(0);
};

test();
```

## Contributing

PRs accepted.

## License

GPL-3.0 © dxos
