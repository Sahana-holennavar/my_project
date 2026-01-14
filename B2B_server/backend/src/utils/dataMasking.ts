/**
 * Data Masking Utilities
 * Masks sensitive information in private info responses
 */

/**
 * Mask Tax ID (SSN format: XXX-XX-XXXX)
 * Shows only last 4 digits: ***-**-1234
 */
export const maskTaxId = (taxId: string | null | undefined): string | null => {
  if (!taxId || typeof taxId !== 'string') {
    return null;
  }

  const cleaned = taxId.replace(/-/g, '');
  if (cleaned.length < 4) {
    return '***-**-****';
  }

  const last4 = cleaned.slice(-4);
  return `***-**-${last4}`;
};

/**
 * Mask EIN (format: XX-XXXXXXX)
 * Shows only last 4 digits: **-***5678
 */
export const maskEin = (ein: string | null | undefined): string | null => {
  if (!ein || typeof ein !== 'string') {
    return null;
  }

  const cleaned = ein.replace(/-/g, '');
  if (cleaned.length < 4) {
    return '**-*******';
  }

  const last4 = cleaned.slice(-4);
  return `**-***${last4}`;
};

/**
 * Mask Account Number
 * Shows only last 4 digits: ****1234
 */
export const maskAccountNumber = (accountNumber: string | null | undefined): string | null => {
  if (!accountNumber || typeof accountNumber !== 'string') {
    return null;
  }

  if (accountNumber.length < 4) {
    return '****';
  }

  const last4 = accountNumber.slice(-4);
  return `****${last4}`;
};

/**
 * Mask Routing Number
 * Shows only last 4 digits: ****5678
 */
export const maskRoutingNumber = (routingNumber: string | null | undefined): string | null => {
  if (!routingNumber || typeof routingNumber !== 'string') {
    return null;
  }

  if (routingNumber.length < 4) {
    return '****';
  }

  const last4 = routingNumber.slice(-4);
  return `****${last4}`;
};

/**
 * Mask entire private info object
 * Applies masking to all sensitive fields
 */
export const maskPrivateInfo = (privateInfo: any): any => {
  if (!privateInfo || typeof privateInfo !== 'object') {
    return privateInfo;
  }

  const masked = { ...privateInfo };

  // Mask taxId
  if (masked.taxId) {
    masked.taxId = maskTaxId(masked.taxId);
  }

  // Mask ein
  if (masked.ein) {
    masked.ein = maskEin(masked.ein);
  }

  // Mask bank details if present
  if (masked.bankDetails && typeof masked.bankDetails === 'object') {
    masked.bankDetails = {
      ...masked.bankDetails,
      accountNumber: maskAccountNumber(masked.bankDetails.accountNumber),
      routingNumber: maskRoutingNumber(masked.bankDetails.routingNumber),
      // bankName is not masked (not sensitive)
    };
  }

  return masked;
};

export default {
  maskTaxId,
  maskEin,
  maskAccountNumber,
  maskRoutingNumber,
  maskPrivateInfo,
};


