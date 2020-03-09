# Metrics

A simple, lightweight and extensible metrics gathering system.

## Install

```
$ npm install @dxos/metrics
```

## Usage

Metrics can either be submitted to the root object:

```javascript
import metrics from '@dxos/metrics';

metrics.inc('work.started');
```

or to a nested object:

```javascript
import metrics from '@dxos/metrics';

class Test {
  _metrics = metrics(Test);

  work() {
    this._metrics.inc('work.started');
  }
}
```

Nested Metrics objects are scoped and allow for filtering. 

```javascript
metrics.filter({ source: Test, key: 'work.started' });
```

All metrics are passed up to successive Metrics objects.

### Counters

```javascript
import metrics from '@dxos/metrics';

metrics.inc('counter');
metrics.inc('counter');
metrics.inc('counter');

expect(metrics.stats['counter']).toEqual(metrics.filter({ key: 'counter' }).length);
```

### Time Series

```javascript
import metrics from '@dxos/metrics';

const work = async () => {
  const period = metrics.start('work');
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));
  period.end();
};
```

## Contributing

PRs accepted.

## License

GPL-3.0 © dxos
