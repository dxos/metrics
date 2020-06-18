//
// Copyright 2020 DxOS.
//

import debug from 'debug';

import metrics from './metrics';

const log = debug('test');

const testLoops = 100000;

// Function to stand in for performing some quick but non-zero CPU cost activity, not optimizable by clever JIT.
// From: https://gist.github.com/sqren/5083d73f184acae0c5b7
const workFunction = (input) => {
  let result = 0;
  for (let i = Math.pow(input, 7); i >= 0; i--) {
    result += Math.atan(i) * Math.tan(i);
  }
  return result;
};

// Note the body of these two functions must be the same for the test to be valid.

const testCodeUninstrumented = () => {
  let result = 0;
  for (let x = 0; x < testLoops; x++) {
    result += workFunction(2);
  }
  // Result returned to foil JIT optimizer, eventually gets output to the terminal.
  return result;
};

const testCodeInstrumented = (m) => {
  // Loop executing simulated activity, and counting iterations with metrics counter
  let result = 0;
  for (let x = 0; x < testLoops; x++) {
    result += workFunction(2);
    m.inc('loops');
  }
  // Result returned to foil JIT optimizer, eventually gets output to the terminal.
  return result;
};

test('Counters sampling overhead', async () => {
  metrics.reset();
  const m = metrics('test');

  const beginInstrumented = Date.now();
  // Output result to foil optimizer.
  log(`Result is: ${testCodeInstrumented(m)}`);
  const endInstrumented = Date.now();
  const beginUninstrumented = endInstrumented;
  log(`Result is: ${testCodeUninstrumented()}`);
  const endUninstrumented = Date.now();

  expect(m.values.loops).toEqual(testLoops);

  const instrumentedTime = endInstrumented - beginInstrumented;
  const uninstrumentedTime = endUninstrumented - beginUninstrumented;

  log(`Instrumented run time for ${testLoops} iterations: ${instrumentedTime}`);
  log(`Uninstrumented run time for ${testLoops} iterations: ${uninstrumentedTime}`);

  expect(instrumentedTime).toBeGreaterThan(uninstrumentedTime);

  const instrumentationOverhead = (instrumentedTime - uninstrumentedTime) / uninstrumentedTime;

  log(`Instrumentation overhead: ${(instrumentationOverhead * 100).toFixed(1)}% or ${((instrumentationOverhead / testLoops) * 1000000.0).toFixed(2)}us per count`);

  expect(instrumentationOverhead).toBeLessThanOrEqual(0.05);
});

// TODO(dboreham): Implement this:
test('Time-series sampling overhead', async () => {
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
