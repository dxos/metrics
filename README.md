# Metrics

A simple, lightweight and extensible metrics gathering system.

## Install

```
$ npm install @dxos/metrics
```

## Usage

Metrics can either be submitted to the root object:

```javascript
import Metrics from '@dxos/metrics';

Metrics.inc('work.started');
```

or to a nested object:

```javascript
import Metrics from '@dxos/metrics';

class Test {
  _metrics = Metrics.register(this);

  work() {
    this._metrics.inc('work.started');
  }
}
```

Nested Metrics objects are scoped and allow for filtering. 

```javascript
Metrics.filter({ source: Test, key: 'work.started' });
```

All metrics are passed up to successive Metrics objects.

### Counters

```javascript
import Metrics from '@dxos/metrics';

Metrics.inc('counter');
Metrics.inc('counter');
Metrics.inc('counter');

expect(Metrics.stats['counter']).toEqual(Metrics.filter({ key: 'counter' }).length);
```

### Time Series

```javascript
import Metrics from '@dxos/metrics';

const work = async () => {
  const period = Metrics.start('work');
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));
  period.end();
};
```

## Contributing

PRs accepted.

## License

GPL-3.0 © dxos
