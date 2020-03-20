//
// Copyright 2020 DxOS.
//

import { Properties } from './properties';

test('Basics', () => {
  const properties = new Properties();

  properties.inc('foo.bar');
  properties.inc('foo.bar');
  properties.inc('foo.bar');
  properties.dec('foo.bar');

  properties.set('thing');
  properties.delete('thing');

  expect(properties.values).toEqual({ foo: { bar: 2 } });
});
