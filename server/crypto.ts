import crypto from 'crypto';

// A stable 32-byte key derived from a secret.
// In a production app, this would be loaded from an environment variable.
const SECRET = process.env.ENCRYPTION_SECRET || 'antigravity-stable-default-encryption-secret-key-32bytes';
// Derive a 32-byte key using sha256
const ENCRYPTION_KEY = crypto.createHash('sha256').update(SECRET).digest(); 
const IV_LENGTH = 12; // For AES-GCM, 12 bytes IV is standard

export function encrypt(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(cipherText: string): string {
  if (!cipherText) return '';
  try {
    const parts = cipherText.split(':');
    if (parts.length !== 3) {
      // If it doesn't match the encrypted pattern, return it as-is
      // (this protects against breaking existing unencrypted settings or incorrect values)
      return cipherText;
    }
    const [ivHex, authTagHex, encryptedHex] = parts;
    // AES-GCM IV must be exactly 12 bytes = 24 hex chars
    // Auth tag must be exactly 16 bytes = 32 hex chars
    if (ivHex.length !== 24 || authTagHex.length !== 32) {
      return cipherText; // Not a valid encrypted value, treat as plaintext
    }
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encryptedText = Buffer.from(encryptedHex, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    // Silently return the original value instead of logging a noisy error
    return cipherText;
  }
}
