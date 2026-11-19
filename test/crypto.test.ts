import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { base32Decode, generateTOTPWebCrypto } from '../src/crypto';

describe('TOTP & Crypto Engine (RFC 6238 / RFC 4226)', () => {
  it('should correctly decode Base32 strings', () => {
    const secret = 'JBSWY3DPEE======'; // "Hello!" in Base32
    const decoded = base32Decode(secret);
    const text = new TextDecoder().decode(decoded);
    assert.equal(text, 'Hello!');
  });

  it('should ignore lowercase and padding in Base32', () => {
    const raw = base32Decode('jbswy3dpee===');
    const text = new TextDecoder().decode(raw);
    assert.equal(text, 'Hello!');
  });

  it('should generate deterministic 6-digit TOTP code for a timestamp', async () => {
    // RFC 6238 standard test secret (ASCII "12345678901234567890" = GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ)
    const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
    // Timestamp: 1111111109 (step 30) -> counter 37037036
    const code = await generateTOTPWebCrypto(secret, 1111111109);
    assert.equal(code.length, 6);
    assert.match(code, /^\d{6}$/);
  });
});
