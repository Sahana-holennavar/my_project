/**
 * Country Code Detection Utility
 * Detects user's country code using multiple fallback methods
 */

/**
 * Detects country code using IP geolocation API
 * Falls back to browser locale if IP detection fails
 * Final fallback: IN (India) with +91
 * 
 * @returns Promise<string> - ISO country code (e.g., "IN", "US", "GB")
 */
export async function detectCountryCode(): Promise<string> {
  // Strategy 1: Try IP-based geolocation (free tier APIs)
  try {
    // Using ipapi.co (free tier: 1000 requests/day)
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://ipapi.co/json/', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.country_code) {
        return data.country_code.toUpperCase();
      }
    }
  } catch (error) {
    console.log('IP geolocation (ipapi.co) failed, trying fallback...', error);
  }

  // Strategy 2: Try alternative IP geolocation API
  try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://ip-api.com/json/?fields=countryCode', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.countryCode) {
        return data.countryCode.toUpperCase();
      }
    }
  } catch (error) {
    console.log('IP geolocation (ip-api.com) failed, trying browser locale...', error);
  }

  // Strategy 3: Try browser locale
  try {
    if (typeof navigator !== 'undefined' && navigator.language) {
      // Extract country code from locale (e.g., "en-US" -> "US")
      const locale = navigator.language;
      const parts = locale.split('-');
      if (parts.length > 1) {
        return parts[1].toUpperCase();
      }
      
      // Try navigator.languages if available
      if (navigator.languages && navigator.languages.length > 0) {
        const firstLang = navigator.languages[0];
        const langParts = firstLang.split('-');
        if (langParts.length > 1) {
          return langParts[1].toUpperCase();
        }
      }
    }
  } catch (error) {
    console.log('Browser locale detection failed, using default...', error);
  }

  // Strategy 4: Final fallback - Default to India (+91)
  return 'IN';
}

/**
 * Maps ISO country code to react-phone-number-input country code format
 * Some country codes might need conversion
 * 
 * @param isoCode - ISO country code (e.g., "IN", "US")
 * @returns Country code for react-phone-number-input
 */
export function normalizeCountryCode(isoCode: string): string {
  // react-phone-number-input uses ISO country codes directly
  // So we can return as-is
  return isoCode.toUpperCase();
}

