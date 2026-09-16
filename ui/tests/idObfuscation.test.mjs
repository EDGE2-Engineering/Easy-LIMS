import assert from 'node:assert';
import { encodeId, decodeId, isEncodedId } from '../src/lib/idObfuscation.js';

console.log('Running idObfuscation tests...');

// 1. User's exact example: 430 -> NDMw -> 430
assert.strictEqual(encodeId(430), 'NDMw', '430 must encode to NDMw');
assert.strictEqual(encodeId('430'), 'NDMw', '"430" must encode to NDMw');
assert.strictEqual(decodeId('NDMw'), '430', 'NDMw must decode to 430');

// 2. Backward compatibility: raw numbers decode to themselves
assert.strictEqual(decodeId(430), '430', 'numeric 430 decodes to "430"');
assert.strictEqual(decodeId('430'), '430', '"430" decodes to "430"');
assert.strictEqual(decodeId('1'), '1');
assert.strictEqual(decodeId('99999'), '99999');

// 3. Idempotency: encodeId on already-encoded ID does not re-encode
assert.strictEqual(encodeId('NDMw'), 'NDMw', 'encodeId("NDMw") should remain "NDMw"');
assert.strictEqual(isEncodedId('NDMw'), true);
assert.strictEqual(isEncodedId('430'), false);
assert.strictEqual(isEncodedId(430), false);
assert.strictEqual(isEncodedId(''), false);
assert.strictEqual(isEncodedId(null), false);

// 4. Edge cases: different lengths and padding
const testCases = [1, 12, 123, 1234, 12345, 987654];
for (const num of testCases) {
  const enc = encodeId(num);
  const dec = decodeId(enc);
  assert.strictEqual(dec, String(num), `Failed roundtrip for ${num}: encoded=${enc}, decoded=${dec}`);
}

// 5. Unpadded base64 compatibility
assert.strictEqual(decodeId('MQ'), '1', 'Unpadded "MQ" should decode to "1"');
assert.strictEqual(decodeId('MTI'), '12', 'Unpadded "MTI" should decode to "12"');

// 6. Null and empty handling
assert.strictEqual(encodeId(null), '');
assert.strictEqual(encodeId(undefined), '');
assert.strictEqual(encodeId(''), '');
assert.strictEqual(decodeId(null), '');
assert.strictEqual(decodeId(undefined), '');
assert.strictEqual(decodeId(''), '');

console.log('All idObfuscation tests passed successfully!');
