import { ValidationError } from './response';

/**
 * Reusable validation helper functions for profile data validation
 * These functions are designed to be reused across different profile sections
 */

export class ValidationHelpers {
  /**
   * Validate text length and pattern
   */
  static validateText(value: any, minLength: number, maxLength: number, pattern?: string, fieldName: string = 'field'): ValidationError[] {
    const errors: ValidationError[] = [];

    // Type validation
    if (typeof value !== 'string') {
      return [{ field: fieldName, message: `${fieldName} must be a string` }];
    }

    // Consolidated validation rules
    const validations = [
      { condition: value.length < minLength, message: `${fieldName} must be at least ${minLength} characters` },
      { condition: value.length > maxLength, message: `${fieldName} must be no more than ${maxLength} characters` },
      { condition: pattern && !new RegExp(pattern).test(value), message: `${fieldName} format is invalid` }
    ];

    validations.forEach(({ condition, message }) => condition && errors.push({ field: fieldName, message }));
    return errors;
  }

  /**
   * Validate name fields (first name, last name, company name, etc.)
   */
  static validateName(value: any, fieldName: string = 'name'): ValidationError[] {
    return this.validateText(value, 2, 50, "^[a-zA-Z\\s\\-']+$", fieldName);
  }

  /**
   * Validate professional text (job titles, award names, etc.)
   */
  static validateProfessionalText(value: any, minLength: number, maxLength: number, fieldName: string = 'field'): ValidationError[] {
    return this.validateText(value, minLength, maxLength, "^[a-zA-Z0-9\\s\\-\\&\\.]+$", fieldName);
  }

  /**
   * Validate email format
   */
  static validateEmail(value: any, fieldName: string = 'email'): ValidationError[] {
    if (typeof value !== 'string') {
      return [{ field: fieldName, message: `${fieldName} must be a string` }];
    }

    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const validations = [
      { condition: value.length > 254, message: `${fieldName} must be no more than 254 characters` },
      { condition: !emailPattern.test(value), message: `${fieldName} must be a valid email format` }
    ];

    return validations
      .filter(({ condition }) => condition)
      .map(({ message }) => ({ field: fieldName, message }));
  }

  /**
   * Validate phone number format
   */
  static validatePhoneNumber(value: any, fieldName: string = 'phone_number'): ValidationError[] {
    if (typeof value !== 'string') {
      return [{ field: fieldName, message: `${fieldName} must be a string` }];
    }

    const phonePattern = /^\+?[1-9]\d{1,14}$/;
    return !phonePattern.test(value) 
      ? [{ field: fieldName, message: `${fieldName} must be in international format` }]
      : [];
  }

  /**
   * Validate URL format
   */
  static validateURL(value: any, fieldName: string = 'url'): ValidationError[] {
    if (typeof value !== 'string') {
      return [{ field: fieldName, message: `${fieldName} must be a string` }];
    }

    try {
      new URL(value);
      return [];
    } catch {
      return [{ field: fieldName, message: `${fieldName} must be a valid URL format` }];
    }
  }

  /**
   * Validate date format and constraints
   */
  static validateDate(value: any, format: string, fieldName: string = 'date'): ValidationError[] {
    if (typeof value !== 'string') {
      return [{ field: fieldName, message: `${fieldName} must be a string` }];
    }

    const datePatterns = {
      'YYYY-MM-DD': { pattern: /^\d{4}-\d{2}-\d{2}$/, message: `${fieldName} must be in YYYY-MM-DD format` },
      'MM/YYYY': { pattern: /^\d{2}\/\d{4}$/, message: `${fieldName} must be in MM/YYYY format` }
    };

    const pattern = datePatterns[format as keyof typeof datePatterns];
    return pattern && !pattern.pattern.test(value) 
      ? [{ field: fieldName, message: pattern.message }]
      : [];
  }

  /**
   * Validate age range
   */
  static validateAgeRange(dateOfBirth: string, minAge: number, maxAge: number, fieldName: string = 'date_of_birth'): ValidationError[] {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();

    const validations = [
      { condition: age < minAge, message: `Must be at least ${minAge} years old` },
      { condition: age > maxAge, message: `Must be no more than ${maxAge} years old` }
    ];

    return validations
      .filter(({ condition }) => condition)
      .map(({ message }) => ({ field: fieldName, message }));
  }

  /**
   * Validate future date constraint
   */
  static validateNoFutureDate(value: string, fieldName: string = 'date'): ValidationError[] {
    const inputDate = new Date(value);
    const today = new Date();

    return inputDate > today 
      ? [{ field: fieldName, message: `${fieldName} cannot be a future date` }]
      : [];
  }

  /**
   * Validate date range (end date after start date)
   */
  static validateDateRange(startDate: string, endDate: string, startField: string = 'start_date', endField: string = 'end_date'): ValidationError[] {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return end <= start 
      ? [{ field: endField, message: `${endField} must be after ${startField}` }]
      : [];
  }

  /**
   * Validate enum values
   */
  static validateEnum(value: any, allowedValues: string[], fieldName: string = 'field'): ValidationError[] {
    return !allowedValues.includes(value) 
      ? [{ field: fieldName, message: `${fieldName} must be one of: ${allowedValues.join(', ')}` }]
      : [];
  }

  /**
   * Validate number range
   */
  static validateNumberRange(value: any, min: number, max: number, fieldName: string = 'field'): ValidationError[] {
    if (typeof value !== 'number') {
      return [{ field: fieldName, message: `${fieldName} must be a number` }];
    }

    const validations = [
      { condition: value < min, message: `${fieldName} must be at least ${min}` },
      { condition: value > max, message: `${fieldName} must be no more than ${max}` }
    ];

    return validations
      .filter(({ condition }) => condition)
      .map(({ message }) => ({ field: fieldName, message }));
  }

  /**
   * Validate array length
   */
  static validateArrayLength(value: any, maxItems: number, fieldName: string = 'array'): ValidationError[] {
    if (!Array.isArray(value)) {
      return [{ field: fieldName, message: `${fieldName} must be an array` }];
    }

    return value.length > maxItems 
      ? [{ field: fieldName, message: `${fieldName} cannot have more than ${maxItems} items` }]
      : [];
  }

  /**
   * Validate unique values in array
   */
  static validateUniqueInArray(value: any, fieldName: string = 'array'): ValidationError[] {
    if (!Array.isArray(value)) {
      return [{ field: fieldName, message: `${fieldName} must be an array` }];
    }

    const uniqueValues = new Set(value);
    return uniqueValues.size !== value.length 
      ? [{ field: fieldName, message: `${fieldName} must contain unique values` }]
      : [];
  }

  /**
   * Validate boolean values
   */
  static validateBoolean(value: any, fieldName: string = 'field'): ValidationError[] {
    return typeof value !== 'boolean' 
      ? [{ field: fieldName, message: `${fieldName} must be a boolean value` }]
      : [];
  }

  /**
   * Validate required fields
   */
  static validateRequired(value: any, fieldName: string = 'field'): ValidationError[] {
    return (value === undefined || value === null || value === '') 
      ? [{ field: fieldName, message: `${fieldName} is required` }]
      : [];
  }

  /**
   * Validate rich text content
   */
  static validateRichText(value: any, minLength: number, maxLength: number, fieldName: string = 'text'): ValidationError[] {
    if (typeof value !== 'string') {
      return [{ field: fieldName, message: `${fieldName} must be a string` }];
    }

    const validations = [
      { condition: value.length < minLength, message: `${fieldName} must be at least ${minLength} characters` },
      { condition: value.length > maxLength, message: `${fieldName} must be no more than ${maxLength} characters` },
      { condition: value.includes('<script'), message: `${fieldName} cannot contain script tags` }
    ];

    return validations
      .filter(({ condition }) => condition)
      .map(({ message }) => ({ field: fieldName, message }));
  }

  /**
   * Validate country code
   */
  static validateCountryCode(value: any, fieldName: string = 'country'): ValidationError[] {
    if (typeof value !== 'string') {
      return [{ field: fieldName, message: `${fieldName} must be a string` }];
    }

    const countryCodePattern = /^[A-Z]{2}$/;
    return !countryCodePattern.test(value) 
      ? [{ field: fieldName, message: `${fieldName} must be a valid ISO 3166-1 country code` }]
      : [];
  }

  /**
   * Validate alphanumeric values
   */
  static validateAlphanumeric(value: any, fieldName: string = 'field'): ValidationError[] {
    if (typeof value !== 'string') {
      return [{ field: fieldName, message: `${fieldName} must be a string` }];
    }

    const alphanumericPattern = /^[a-zA-Z0-9]+$/;
    return !alphanumericPattern.test(value) 
      ? [{ field: fieldName, message: `${fieldName} must contain only alphanumeric characters` }]
      : [];
  }
}

export default ValidationHelpers;
