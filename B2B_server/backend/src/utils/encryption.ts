/**
 * Encryption Utilities for Private Info
 * Encrypts/decrypts sensitive fields at application level
 */

import crypto from 'crypto';
import { config } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

/**
 * Derive encryption key from environment variable
 */
const getEncryptionKey = (): Buffer => {
  const encryptionKey = process.env.PRIVATE_INFO_ENCRYPTION_KEY || config.PRIVATE_INFO_ENCRYPTION_KEY;
  
  if (!encryptionKey) {
    throw new Error('PRIVATE_INFO_ENCRYPTION_KEY is not configured');
  }

  if (encryptionKey.length < 32) {
    throw new Error('PRIVATE_INFO_ENCRYPTION_KEY must be at least 32 characters long');
  }

  // Use PBKDF2 to derive a consistent key from the environment variable
  return crypto.pbkdf2Sync(encryptionKey, 'private-info-salt', 100000, KEY_LENGTH, 'sha256');
};

/**
 * Encrypt sensitive field value
 * @param value - Plain text value to encrypt
 * @returns Encrypted value as base64 string
 */
export const encryptSensitiveField = (value: string): string => {
  if (!value || typeof value !== 'string') {
    throw new Error('Value must be a non-empty string');
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(value, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const tag = cipher.getAuthTag();
    
    // Combine IV + tag + encrypted data
    const combined = Buffer.concat([
      iv,
      tag,
      Buffer.from(encrypted, 'base64')
    ]);
    
    return combined.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt sensitive field');
  }
};

/**
 * Decrypt sensitive field value
 * @param encryptedValue - Base64 encrypted value
 * @returns Decrypted plain text value
 */
export const decryptSensitiveField = (encryptedValue: string): string => {
  if (!encryptedValue || typeof encryptedValue !== 'string') {
    throw new Error('Encrypted value must be a non-empty string');
  }

  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedValue, 'base64');
    
    // Extract IV, tag, and encrypted data
    const iv = combined.slice(0, IV_LENGTH);
    const tag = combined.slice(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.slice(IV_LENGTH + TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt sensitive field');
  }
};

/**
 * Encrypt private info object (encrypts sensitive fields only)
 */
export const encryptPrivateInfo = (privateInfo: any): any => {
  if (!privateInfo || typeof privateInfo !== 'object') {
    return privateInfo;
  }

  const encrypted = { ...privateInfo };

  // Encrypt taxId
  if (encrypted.taxId && typeof encrypted.taxId === 'string') {
    encrypted.taxId = encryptSensitiveField(encrypted.taxId);
  }

  // Encrypt ein
  if (encrypted.ein && typeof encrypted.ein === 'string') {
    encrypted.ein = encryptSensitiveField(encrypted.ein);
  }

  // Encrypt bank details if present
  if (encrypted.bankDetails && typeof encrypted.bankDetails === 'object') {
    encrypted.bankDetails = {
      ...encrypted.bankDetails,
      accountNumber: encrypted.bankDetails.accountNumber
        ? encryptSensitiveField(encrypted.bankDetails.accountNumber)
        : null,
      routingNumber: encrypted.bankDetails.routingNumber
        ? encryptSensitiveField(encrypted.bankDetails.routingNumber)
        : null,
      // bankName is not encrypted (not sensitive)
    };
  }

  return encrypted;
};

/**
 * Decrypt private info object (decrypts sensitive fields only)
 */
export const decryptPrivateInfo = (privateInfo: any): any => {
  if (!privateInfo || typeof privateInfo !== 'object') {
    return privateInfo;
  }

  const decrypted = { ...privateInfo };

  // Decrypt taxId
  if (decrypted.taxId && typeof decrypted.taxId === 'string') {
    try {
      decrypted.taxId = decryptSensitiveField(decrypted.taxId);
    } catch (error) {
      console.error('Failed to decrypt taxId:', error);
      // If decryption fails, keep encrypted value (might be already decrypted or invalid)
    }
  }

  // Decrypt ein
  if (decrypted.ein && typeof decrypted.ein === 'string') {
    try {
      decrypted.ein = decryptSensitiveField(decrypted.ein);
    } catch (error) {
      console.error('Failed to decrypt ein:', error);
    }
  }

  // Decrypt bank details if present
  if (decrypted.bankDetails && typeof decrypted.bankDetails === 'object') {
    decrypted.bankDetails = {
      ...decrypted.bankDetails,
      accountNumber: decrypted.bankDetails.accountNumber
        ? (() => {
            try {
              return decryptSensitiveField(decrypted.bankDetails.accountNumber);
            } catch {
              return decrypted.bankDetails.accountNumber;
            }
          })()
        : null,
      routingNumber: decrypted.bankDetails.routingNumber
        ? (() => {
            try {
              return decryptSensitiveField(decrypted.bankDetails.routingNumber);
            } catch {
              return decrypted.bankDetails.routingNumber;
            }
          })()
        : null,
    };
  }

  return decrypted;
};

export default {
  encryptSensitiveField,
  decryptSensitiveField,
  encryptPrivateInfo,
  decryptPrivateInfo,
};


