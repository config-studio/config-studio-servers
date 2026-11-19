import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  base32Decode,
  generateTOTPWebCrypto,
  cleanBase32,
  isValidBase32,
  generateRandomBase32,
  generateRandomKeyId
} from '../src/crypto';

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

  it('should clean and validate Base32 secrets', () => {
    assert.equal(cleanBase32('jbsw y3dp ee==='), 'JBSWY3DPEE');
    assert.equal(isValidBase32('JBSWY3DPEHPK3PXP'), true);
    assert.equal(isValidBase32('JBSWY3'), false); // Too short (< 16 chars)
    assert.equal(isValidBase32(''), false);
  });

  it('should generate valid random Base32 secret', () => {
    const sec24 = generateRandomBase32(24);
    assert.equal(sec24.length, 24);
    assert.equal(isValidBase32(sec24), true);
    assert.match(sec24, /^[A-Z2-7]{24}$/);
  });

  it('should generate valid random Key ID', () => {
    const key = generateRandomKeyId('cs_master');
    assert.match(key, /^cs_master_[a-z0-9]+$/);
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
