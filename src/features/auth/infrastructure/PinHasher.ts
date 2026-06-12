import * as Crypto from 'expo-crypto';

const HASH_SEPARATOR = ':';

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashPin(pin: string, salt?: string): Promise<string> {
  const saltHex = salt ?? bytesToHex(Crypto.getRandomBytes(16));
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${saltHex}${HASH_SEPARATOR}${pin}`,
  );
  return `${saltHex}${HASH_SEPARATOR}${digest}`;
}

export async function verifyPinHash(pin: string, storedHash: string): Promise<boolean> {
  const separatorIndex = storedHash.indexOf(HASH_SEPARATOR);
  if (separatorIndex <= 0) {
    return false;
  }

  const salt = storedHash.slice(0, separatorIndex);
  const expectedDigest = storedHash.slice(separatorIndex + 1);
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}${HASH_SEPARATOR}${pin}`,
  );

  return digest === expectedDigest;
}
