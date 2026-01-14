import { PoolClient } from 'pg';
import { config } from '../config/env';
import { database } from '../config/database';
import { ValidationError } from '../utils/response';
import { MediaItem } from '../models/Post';
import { contentService } from './contentService';
import { NotificationModel } from '../models/Notification';
import { socketService } from './SocketService';

export class BusinessProfileValidationError extends Error {
  constructor(public readonly validationErrors: ValidationError[]) {
    super('Company profile validation failed');
    this.name = 'BusinessProfileValidationError';
  }
}

export class DuplicateCompanyNameError extends Error {
  public readonly code = 'COMPANY_NAME_EXISTS';

  constructor() {
    super('Company name already exists');
    this.name = 'DuplicateCompanyNameError';
  }
}

export class BusinessProfileNotFoundError extends Error {
  constructor() {
    super('Business profile not found');
    this.name = 'BusinessProfileNotFoundError';
  }
}

export class BusinessProfilePrivacyError extends Error {
  constructor(message = 'About section is not accessible for this profile') {
    super(message);
    this.name = 'BusinessProfilePrivacyError';
  }
}

export class AboutSectionExistsError extends Error {
  constructor() {
    super('About section already exists for this business profile');
    this.name = 'AboutSectionExistsError';
  }
}

export class AboutSectionNotFoundError extends Error {
  constructor() {
    super('About section not found for this business profile');
    this.name = 'AboutSectionNotFoundError';
  }
}

export class ProjectNotFoundError extends Error {
  constructor() {
    super('Project not found for this business profile');
    this.name = 'ProjectNotFoundError';
  }
}

export class AchievementNotFoundError extends Error {
  constructor() {
    super('Achievement not found for this business profile');
    this.name = 'AchievementNotFoundError';
  }
}

export class PrivateInfoExistsError extends Error {
  constructor() {
    super('Private info already exists for this business profile');
    this.name = 'PrivateInfoExistsError';
  }
}

export class PrivateInfoNotFoundError extends Error {
  constructor() {
    super('Private info not found for this business profile');
    this.name = 'PrivateInfoNotFoundError';
  }
}

export class UserNotFoundError extends Error {
  constructor() {
    super('User not found with provided ID or email');
    this.name = 'UserNotFoundError';
  }
}

export class UserAlreadyMemberError extends Error {
  constructor() {
    super('User is already a member of this profile');
    this.name = 'UserAlreadyMemberError';
  }
}

export class PendingInvitationExistsError extends Error {
  constructor() {
    super('User already has a pending invitation for this profile');
    this.name = 'PendingInvitationExistsError';
  }
}

export class InvalidRoleError extends Error {
  constructor() {
    super('Role must be either admin or editor');
    this.name = 'InvalidRoleError';
  }
}

export class InvitationNotFoundError extends Error {
  constructor() {
    super('Invitation not found');
    this.name = 'InvitationNotFoundError';
  }
}

interface JsonObject {
  [key: string]: JsonValue;
}

type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;

interface ValidationRules extends JsonObject {
  type?: string;
  message?: string;
  min_length?: number;
  max_length?: number;
  pattern?: string;
  trim?: boolean;
  default?: JsonValue;
  required_keys?: string[];
  allowed_extensions?: string[];
  must_have_protocol?: boolean;
  max_items?: number;
  item_type?: string;
  values?: JsonValue[];
  min?: number | string;
  max?: number | string;
  no_future?: boolean;
}

interface CompanySchemaField {
  field_type: string;
  required: boolean;
  rules: ValidationRules;
}

type CompanySchema = Record<string, Record<string, CompanySchemaField>>;

type CompanyIntroductionVideo = JsonObject & {
  fileId: string;
  fileUrl: string;
  filename: string;
  uploadedAt: string | null;
};

export type BusinessAboutSection = JsonObject & {
  description: string;
  mission?: string;
  vision?: string;
  core_values?: string;
  company_introduction_video?: CompanyIntroductionVideo | null;
  founder_message?: string;
  founded?: string;
  employees?: string;
  headquarters?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Project = JsonObject & {
  projectId: string;
  title: string;
  description: string;
  startDate: string;
  endDate?: string | null;
  status?: string | null;
  technologies?: string[] | null;
  client?: string | null;
  project_url?: string | null;
  createdAt: string;
  updatedAt: string;
};

type PrivateInfoFile = JsonObject & {
  fileId: string;
  fileUrl: string;
  filename: string;
  uploadedAt: string | null;
};

type BankDetails = JsonObject & {
  accountNumber?: string;
  routingNumber?: string;
  bankName?: string;
};

export type BusinessPrivateInfo = JsonObject & {
  taxId: string;
  ein: string;
  legalName: string;
  bankDetails?: BankDetails | null;
  registration_certificate?: PrivateInfoFile | null;
  business_license?: PrivateInfoFile | null;
  createdAt?: string;
  updatedAt?: string;
};

interface CompanyPageRecord {
  id: string;
  owner_id: string;
  company_profile_data: JsonObject;
  privacy_settings: JsonObject;
  is_active: boolean;
}

type AboutPayload = Partial<Omit<BusinessAboutSection, 'createdAt' | 'updatedAt'>>;

type PrivateInfoPayload = Partial<Omit<BusinessPrivateInfo, 'createdAt' | 'updatedAt'>>;

class BusinessProfileService {
  private companySchemaCache: CompanySchema | null = null;
  private companySchemaCacheTimestamp = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private async loadCompanyProfileSchemaFromDB(): Promise<CompanySchema> {
    try {
      const now = Date.now();
      if (this.companySchemaCache && (now - this.companySchemaCacheTimestamp) < this.CACHE_TTL) {
        return this.companySchemaCache;
      }

      interface CompanySchemaRow {
        section: string;
        field_name: string;
        field_type: string;
        required: boolean;
        rules: unknown;
      }

      const query = `
        SELECT section, field_name, field_type, required, rules, display_order
        FROM "${config.DB_SCHEMA}".company_profile_schema
        ORDER BY display_order ASC
      `;

      const result = await database.query(query) as { rows: CompanySchemaRow[] };

      if (!result.rows.length) {
        throw new Error('No company profile schema found in database. Please populate company_profile_schema.');
      }

      const schema: CompanySchema = {};

      for (const row of result.rows) {
        const sectionKey = row.section;
        if (!schema[sectionKey]) {
          schema[sectionKey] = {};
        }

        const parsedRules: ValidationRules = typeof row.rules === 'string'
          ? (JSON.parse(row.rules) as ValidationRules)
          : (row.rules as ValidationRules);

        const sectionBucket = schema[sectionKey]!;
        sectionBucket[row.field_name] = {
          field_type: row.field_type,
          required: row.required,
          rules: parsedRules
        };
      }

      this.companySchemaCache = schema;
      this.companySchemaCacheTimestamp = now;
      return schema;
    } catch (error) {
      console.error('Error loading company profile schema from database:', error);
      throw new Error('Failed to load company profile schema from database. Please ensure the schema is populated.');
    }
  }

  public clearCompanySchemaCache(): void {
    this.companySchemaCache = null;
    this.companySchemaCacheTimestamp = 0;
  }

  public async createBusinessProfile(ownerId: string, businessProfileData: unknown): Promise<JsonObject> {
    const validationResult = await this.validateBusinessProfileData(businessProfileData);

    if (!validationResult.valid) {
      throw new BusinessProfileValidationError(validationResult.errors);
    }

    const sanitizedProfileData = validationResult.sanitizedData;
    const sanitizedPrivacySettings = validationResult.privacySettings;

    const companyName = sanitizedProfileData.companyName;
    if (typeof companyName !== 'string' || !companyName.trim()) {
      throw new Error('Company name is required');
    }

    const client = await database.getClient();

    try {
      await client.query('BEGIN');

      const nameExists = await this.isCompanyNameTaken(companyName, client);
      if (nameExists) {
        throw new DuplicateCompanyNameError();
      }

      const insertQuery = `
        INSERT INTO "${config.DB_SCHEMA}".company_pages (
          owner_id,
          company_profile_data,
          privacy_settings,
          is_active,
          created_at,
          updated_at
        ) VALUES ($1, $2::jsonb, $3::jsonb, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, owner_id, company_profile_data, privacy_settings, is_active, created_at, updated_at
      `;

      const insertResult = await client.query(insertQuery, [
        ownerId,
        JSON.stringify(sanitizedProfileData),
        JSON.stringify(sanitizedPrivacySettings)
      ]);

      await client.query('COMMIT');

      const createdProfile = insertResult.rows[0];

      return {
        profile_id: createdProfile.id,
        owner_id: createdProfile.owner_id,
        role: 'owner',
        profile_data: createdProfile.company_profile_data,
        privacy_settings: createdProfile.privacy_settings,
        is_active: createdProfile.is_active,
        created_at: createdProfile.created_at instanceof Date
          ? createdProfile.created_at.toISOString()
          : createdProfile.created_at,
        updated_at: createdProfile.updated_at instanceof Date
          ? createdProfile.updated_at.toISOString()
          : createdProfile.updated_at
      };
    } catch (error) {
      await client.query('ROLLBACK');

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Company profile creation failed');
    } finally {
      client.release();
    }
  }

  public async validateBusinessProfileData(businessProfileData: unknown): Promise<{
    valid: boolean;
    errors: ValidationError[];
    sanitizedData: JsonObject;
    privacySettings: JsonObject;
  }> {
    const schema = await this.loadCompanyProfileSchemaFromDB();
    const errors: ValidationError[] = [];

    const sourceData: JsonObject = (businessProfileData && typeof businessProfileData === 'object')
      ? (businessProfileData as JsonObject)
      : {};
    const sourcePrivacy: JsonObject = (sourceData.privacy_settings && typeof sourceData.privacy_settings === 'object')
      ? (sourceData.privacy_settings as JsonObject)
      : {};

    const sanitizedProfileData: JsonObject = {};
    const sanitizedPrivacySettings: JsonObject = {};

    for (const [section, fields] of Object.entries(schema)) {
      for (const [fieldName, definition] of Object.entries(fields)) {
        const fieldRules: ValidationRules = { ...definition.rules };
        fieldRules.type = fieldRules.type ?? definition.field_type;
        const isRequired = Boolean(definition.required);
        const fieldPath = section === 'privacy_settings'
          ? `privacy_settings.${fieldName}`
          : fieldName;

        const rawValue = section === 'privacy_settings'
          ? (sourcePrivacy[fieldName] as JsonValue | undefined)
          : (sourceData[fieldName] as JsonValue | undefined);

        const hasValue = !this.isEmptyValue(rawValue);

        if (!hasValue) {
          if (fieldRules.default !== undefined) {
            if (section === 'privacy_settings') {
              sanitizedPrivacySettings[fieldName] = fieldRules.default;
            } else {
              sanitizedProfileData[fieldName] = fieldRules.default;
            }
            continue;
          }

          if (isRequired) {
            errors.push({
              field: fieldPath,
              message: fieldRules.message || `${fieldName} is required`
            });
          }
          continue;
        }

        const valueToValidate = rawValue as JsonValue;
        const { errors: fieldErrors, sanitizedValue } = this.validateCompanyField(valueToValidate, fieldRules, fieldPath);

        if (fieldErrors.length) {
          errors.push(...fieldErrors);
          continue;
        }

        if (sanitizedValue !== undefined) {
          if (section === 'privacy_settings') {
            sanitizedPrivacySettings[fieldName] = sanitizedValue;
          } else {
            sanitizedProfileData[fieldName] = sanitizedValue;
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitizedData: sanitizedProfileData,
      privacySettings: sanitizedPrivacySettings
    };
  }

  private validateCompanyField(value: JsonValue, fieldRules: ValidationRules, fieldPath: string): { errors: ValidationError[]; sanitizedValue: JsonValue | undefined } {
    const errors: ValidationError[] = [];
    const ruleType = fieldRules.type;
    let sanitizedValue: JsonValue | undefined = value;

    switch (ruleType) {
      case 'text':
      case 'enum': {
        if (sanitizedValue !== undefined && sanitizedValue !== null) {
          const textValue = String(sanitizedValue);
          sanitizedValue = fieldRules.trim === false ? textValue : textValue.trim();
        }
        break;
      }
      case 'email': {
        sanitizedValue = typeof value === 'string' ? value.trim().toLowerCase() : '';
        break;
      }
      case 'url': {
        sanitizedValue = typeof value === 'string' ? value.trim() : '';
        break;
      }
      case 'phone': {
        if (typeof value === 'number') {
          sanitizedValue = value.toString();
        } else if (typeof value === 'string') {
          sanitizedValue = value.replace(/\s+/g, '').trim();
        } else {
          sanitizedValue = String(value ?? '');
        }
        break;
      }
      case 'number': {
        let numericValue: number;
        if (typeof value === 'string') {
          const trimmed = value.trim();
          numericValue = trimmed === '' ? Number.NaN : Number(trimmed);
        } else {
          numericValue = Number(value);
        }

        if (Number.isNaN(numericValue)) {
          errors.push({ field: fieldPath, message: fieldRules.message || `${fieldPath} must be a number` });
          return { errors, sanitizedValue: undefined };
        }
        sanitizedValue = numericValue;
        break;
      }
      case 'array': {
        const arrayResult = this.sanitizeArrayField(value, fieldRules, fieldPath);
        errors.push(...arrayResult.errors);
        sanitizedValue = arrayResult.sanitizedValue as JsonValue;
        return { errors, sanitizedValue };
      }
      case 'json': {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
          errors.push({ field: fieldPath, message: fieldRules.message || `${fieldPath} must be an object` });
          return { errors, sanitizedValue: undefined };
        }

        const requiredKeys = fieldRules.required_keys ?? [];
        const rawLogo = value as JsonObject;
        for (const key of requiredKeys) {
          if (key === 'fileName') {
            const hasFileName = !this.isEmptyValue(rawLogo.fileName) || !this.isEmptyValue(rawLogo.filename);
            if (!hasFileName) {
              errors.push({ field: `${fieldPath}.${key}`, message: `${key} is required` });
            }
          } else if (this.isEmptyValue(rawLogo[key])) {
            errors.push({ field: `${fieldPath}.${key}`, message: `${key} is required` });
          }
        }

        if (errors.length) {
          return { errors, sanitizedValue: undefined };
        }

        const fileNameValue = (rawLogo.fileName ?? rawLogo.filename ?? '').toString().trim();
        const fileUrlValue = typeof rawLogo.fileUrl === 'string' ? rawLogo.fileUrl.trim() : rawLogo.fileUrl;

        const allowedExtensions = fieldRules.allowed_extensions ?? [];
        if (allowedExtensions.length && fileNameValue) {
          const extension = fileNameValue.split('.').pop()?.toLowerCase();
          if (extension && !allowedExtensions.includes(extension)) {
            errors.push({
              field: `${fieldPath}.fileName`,
              message: fieldRules.message || `File extension .${extension} is not allowed`
            });
          }
        }

        if (fileUrlValue) {
          const urlErrors = this.validateField(fileUrlValue as JsonValue, { type: 'url', must_have_protocol: true }, `${fieldPath}.fileUrl`);
          if (urlErrors.length) {
            errors.push(...urlErrors);
          }
        }

        if (errors.length) {
          return { errors, sanitizedValue: undefined };
        }

        const uploadedAtValue = rawLogo.uploadedAt ?? rawLogo.uploaded_at ?? null;

        sanitizedValue = {
          fileId: (rawLogo.fileId ?? rawLogo.fileID ?? '').toString().trim(),
          fileUrl: fileUrlValue as JsonValue,
          fileName: fileNameValue,
          filename: fileNameValue,
          uploadedAt: uploadedAtValue !== null && uploadedAtValue !== undefined
            ? uploadedAtValue.toString()
            : null
        };

        return { errors, sanitizedValue };
      }
      default:
        break;
    }

    const validationErrors = this.validateField(sanitizedValue, fieldRules, fieldPath);
    if (validationErrors.length) {
      errors.push(...validationErrors);
    }

    return { errors, sanitizedValue };
  }

  private sanitizeArrayField(value: JsonValue, fieldRules: ValidationRules, fieldPath: string): { errors: ValidationError[]; sanitizedValue: JsonValue } {
    const errors: ValidationError[] = [];

    if (!Array.isArray(value)) {
      errors.push({ field: fieldPath, message: fieldRules.message || `${fieldPath} must be an array` });
      return { errors, sanitizedValue: [] };
    }

    if (fieldRules.max_items && value.length > fieldRules.max_items) {
      errors.push({ field: fieldPath, message: fieldRules.message || `${fieldPath} must contain at most ${fieldRules.max_items} items` });
    }

    const sanitizedItems: JsonValue[] = [];
    const itemType = fieldRules.item_type;

    if (!itemType) {
      return { errors, sanitizedValue: value };
    }

    const emailPattern = '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$';

    value.forEach((item, index) => {
      if (itemType === 'email') {
        const emailValue = typeof item === 'string' ? item : (item as JsonObject)?.email;
        if (this.isEmptyValue(emailValue)) {
          errors.push({ field: `${fieldPath}[${index}]`, message: 'Email is required' });
          return;
        }

        const sanitizedEmail = (emailValue as string).trim().toLowerCase();
        const emailErrors = this.validateField(sanitizedEmail, { type: 'email', pattern: emailPattern }, `${fieldPath}[${index}]`);
        if (emailErrors.length) {
          errors.push(...emailErrors);
          return;
        }

        sanitizedItems.push({ email: sanitizedEmail });
      } else if (itemType === 'phone') {
        const phoneValue = typeof item === 'string'
          ? item
          : (item as JsonObject)?.phone_number ?? (item as JsonObject)?.phone;
        if (this.isEmptyValue(phoneValue)) {
          errors.push({ field: `${fieldPath}[${index}]`, message: 'Phone number is required' });
          return;
        }

        const sanitizedPhone = typeof phoneValue === 'string'
          ? phoneValue.replace(/\s+/g, '').trim()
          : String(phoneValue);
        const phoneErrors = this.validateField(sanitizedPhone, { type: 'phone' }, `${fieldPath}[${index}]`);
        if (phoneErrors.length) {
          errors.push(...phoneErrors);
          return;
        }

        sanitizedItems.push({ phone_number: sanitizedPhone });
      } else {
        sanitizedItems.push(item as JsonValue);
      }
    });

    return { errors, sanitizedValue: sanitizedItems };
  }

  private validateField(value: JsonValue | undefined, rules: ValidationRules, fieldPath: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const ruleType = rules.type;

    switch (ruleType) {
      case 'text': {
        if (typeof value !== 'string') {
          errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be text` });
          break;
        }
        if (rules.min_length && value.length < rules.min_length) {
          errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be at least ${rules.min_length} characters` });
        }
        if (rules.max_length && value.length > rules.max_length) {
          errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be at most ${rules.max_length} characters` });
        }
        if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
          errors.push({ field: fieldPath, message: rules.message || `${fieldPath} format is invalid` });
        }
        break;
      }
      case 'email': {
        if (typeof value !== 'string') {
          errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be an email` });
          break;
        }
        if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
          errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be a valid email` });
        }
        break;
      }
      case 'number': {
        if (typeof value !== 'number') {
          errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be a number` });
          break;
        }
        let minValue = rules.min;
        let maxValue = rules.max;
        if (typeof minValue === 'string' && minValue === 'current_year') {
          minValue = new Date().getFullYear();
        }
        if (typeof maxValue === 'string') {
          if (maxValue === 'current_year') {
            maxValue = new Date().getFullYear();
          } else if (maxValue === 'current_year_plus_10') {
            maxValue = new Date().getFullYear() + 10;
          }
        }
        if (typeof minValue === 'number' && value < minValue) {
          errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be at least ${minValue}` });
        }
        if (typeof maxValue === 'number' && value > maxValue) {
          errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be at most ${maxValue}` });
        }
        break;
      }
      case 'boolean': {
        if (typeof value !== 'boolean') {
          errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be a boolean` });
        }
        break;
      }
      case 'date': {
        if (rules.no_future) {
          const dateValue = new Date(value as string);
          if (Number.isNaN(dateValue.valueOf()) || dateValue > new Date()) {
            errors.push({ field: fieldPath, message: rules.message || `${fieldPath} cannot be in the future` });
          }
        }
        break;
      }
      case 'url': {
        if (typeof value !== 'string') {
          errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be a URL` });
          break;
        }
        if (rules.must_have_protocol && !/^https?:\/\//i.test(value)) {
          errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must start with http:// or https://` });
          break;
        }
        try {
          new URL(value);
        } catch {
          errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be a valid URL` });
        }
        break;
      }
      case 'enum': {
        if (rules.values) {
          const normalizedValue = typeof value === 'string' ? value.trim() : value;
          const normalizedRules = (rules.values ?? []).map((v) =>
            typeof v === 'string' ? v.trim() : v
          );
          const valueFound = normalizedRules.some((allowedValue) =>
            String(allowedValue).toLowerCase() === String(normalizedValue).toLowerCase()
          );

          if (!valueFound) {
            const allowedValues = (rules.values ?? []).join(', ');
            const receivedValue = value !== null && value !== undefined ? String(value) : 'null/undefined';
            errors.push({
              field: fieldPath,
              message: `${rules.message || fieldPath + ' validation failed'}. Allowed values: [${allowedValues}]. Received: "${receivedValue}"`
            });
          }
        }
        break;
      }
      case 'array': {
        if (!Array.isArray(value)) {
          errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be an array` });
        } else if (rules.max_items && value.length > rules.max_items) {
          errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must have at most ${rules.max_items} items` });
        }
        break;
      }
      case 'rich_text': {
        if (typeof value !== 'string') {
          errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be text` });
          break;
        }
        if (rules.min_length && value.length < rules.min_length) {
          errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be at least ${rules.min_length} characters` });
        }
        if (rules.max_length && value.length > rules.max_length) {
          errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be at most ${rules.max_length} characters` });
        }
        break;
      }
      case 'country_code': {
        if (typeof value !== 'string') {
          errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be a string` });
          break;
        }
        const countryCodePattern = /^[A-Z]{2}$/;
        if (!countryCodePattern.test(value)) {
          errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be a valid ISO 3166-1 country code` });
        }
        break;
      }
      case 'phone': {
        if (typeof value !== 'string') {
          errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be a string` });
          break;
        }
        const phonePattern = /^\+?[1-9]\d{1,14}$/;
        if (!phonePattern.test(value)) {
          errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be in international format` });
        }
        break;
      }
      default:
        break;
    }

    return errors;
  }

  private isEmptyValue(value: JsonValue | undefined): boolean {
    if (value === undefined || value === null) {
      return true;
    }

    if (typeof value === 'string') {
      return value.trim() === '';
    }

    return false;
  }

  private async isCompanyNameTaken(companyName: string, client?: PoolClient): Promise<boolean> {
    const normalizedName = companyName.trim().toLowerCase();
    const query = `
      SELECT 1
      FROM "${config.DB_SCHEMA}".company_pages
      WHERE LOWER(company_profile_data->>'companyName') = $1
      LIMIT 1
    `;

    if (client) {
      const result = await client.query(query, [normalizedName]);
      return result.rows.length > 0;
    }

    const result = await database.query(query, [normalizedName]) as { rows: unknown[] };
    return result.rows.length > 0;
  }

  private async fetchCompanyPage(profileId: string, client?: PoolClient): Promise<CompanyPageRecord | null> {
    const query = `
      SELECT id, owner_id, company_profile_data, privacy_settings, is_active
      FROM "${config.DB_SCHEMA}".company_pages
      WHERE id = $1
      LIMIT 1
    `;

    const executor = client ?? database;
    const result = await executor.query(query, [profileId]) as { rows: CompanyPageRecord[] };

    if (!result.rows.length) {
      return null;
    }

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    const companyProfileData =
      typeof row.company_profile_data === 'string'
        ? (JSON.parse(row.company_profile_data) as JsonObject)
        : (row.company_profile_data as JsonObject);

    const privacySettings =
      typeof row.privacy_settings === 'string'
        ? (JSON.parse(row.privacy_settings) as JsonObject)
        : (row.privacy_settings as JsonObject);

    return {
      id: row.id,
      owner_id: row.owner_id,
      company_profile_data: companyProfileData,
      privacy_settings: privacySettings,
      is_active: row.is_active,
    };
  }

  private determineAboutVisibility(privacySettings: JsonObject): 'public' | 'private' | 'connections_only' | 'owner_only' {
    const rawVisibility =
      (privacySettings?.about_visibility as string | undefined) ??
      (privacySettings?.aboutVisibility as string | undefined) ??
      (privacySettings?.about as JsonObject | undefined)?.visibility ??
      (privacySettings?.sections as JsonObject | undefined)?.about;

    if (!rawVisibility || typeof rawVisibility !== 'string') {
      return 'public';
    }

    const normalized = rawVisibility.toLowerCase();

    if (['public', 'private', 'connections_only', 'connections-only', 'owner_only', 'owner-only'].includes(normalized)) {
      if (normalized === 'connections-only') return 'connections_only';
      if (normalized === 'owner-only') return 'owner_only';
      return normalized as 'public' | 'private' | 'connections_only' | 'owner_only';
    }

    return 'public';
  }

  private isValidUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return Boolean(url.protocol && url.host);
    } catch {
      return false;
    }
  }

  private normalizeToString(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'string') {
      return value.trim();
    }
    return String(value).trim();
  }

  private validateAboutPayload(payload: unknown, options: { allowPartial?: boolean } = {}): {
    sanitized: AboutPayload;
    errors: ValidationError[];
  } {
    const { allowPartial = false } = options;
    const errors: ValidationError[] = [];
    const sanitized: AboutPayload = {};

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      errors.push({ field: 'about', message: 'About section data must be provided as an object' });
      return { sanitized, errors };
    }

    const data = payload as Record<string, unknown>;
    let processedFields = 0;

    const handleOptionalStringField = (key: keyof AboutPayload, maxLength = 1000) => {
      if (data[key as string] === undefined) {
        return;
      }
      processedFields += 1;
      const value = this.normalizeToString(data[key as string]);

      if (!value && !allowPartial) {
        errors.push({ field: String(key), message: `${String(key)} cannot be empty` });
        return;
      }

      if (value && maxLength && value.length > maxLength) {
        errors.push({ field: String(key), message: `${String(key)} must be at most ${maxLength} characters` });
        return;
      }

      if (value) {
        sanitized[key] = value as never;
      } else {
        sanitized[key] = '' as never;
      }
    };

    // Description handling (required for create)
    if (!allowPartial || data.description !== undefined) {
      processedFields += 1;
      const description = this.normalizeToString(data.description);

      if (!description) {
        errors.push({ field: 'description', message: 'Description is required' });
      } else if (description.length > 2000) {
        errors.push({ field: 'description', message: 'Description must be at most 2000 characters' });
      } else {
        sanitized.description = description;
      }
    }

    handleOptionalStringField('mission', 1000);
    handleOptionalStringField('vision', 1000);
    handleOptionalStringField('core_values', 1000);
    handleOptionalStringField('founder_message', 1500);
    handleOptionalStringField('employees', 100);
    handleOptionalStringField('headquarters', 200);

    if (data.founded !== undefined) {
      processedFields += 1;
      const founded = this.normalizeToString(data.founded);
      if (!/^\d{4}$/.test(founded)) {
        errors.push({ field: 'founded', message: 'Founded must be a four digit year' });
      } else {
        const year = Number(founded);
        const currentYear = new Date().getFullYear();
        if (year < 1000 || year > currentYear) {
          errors.push({ field: 'founded', message: `Founded year must be between 1000 and ${currentYear}` });
        } else {
          sanitized.founded = founded;
        }
      }
    }

    if (data.company_introduction_video !== undefined) {
      processedFields += 1;
      const rawVideo = data.company_introduction_video;

      if (rawVideo === null) {
        sanitized.company_introduction_video = null;
      } else if (typeof rawVideo !== 'object' || Array.isArray(rawVideo)) {
        errors.push({
          field: 'company_introduction_video',
          message: 'Company introduction video must be an object',
        });
      } else {
        const errorCountBefore = errors.length;
        const video = rawVideo as Record<string, unknown>;
        const fileId = this.normalizeToString(video.fileId ?? video.fileID);
        const fileUrl = this.normalizeToString(video.fileUrl);
        const filename = this.normalizeToString(video.filename ?? video.fileName);
        const uploadedAtRaw = video.uploadedAt ?? video.uploaded_at;
        const uploadedAt =
          uploadedAtRaw === null || uploadedAtRaw === undefined
            ? null
            : this.normalizeToString(uploadedAtRaw);

        if (!fileId) {
          errors.push({ field: 'company_introduction_video.fileId', message: 'fileId is required' });
        }

        if (!filename) {
          errors.push({ field: 'company_introduction_video.filename', message: 'filename is required' });
        }

        if (!fileUrl) {
          errors.push({ field: 'company_introduction_video.fileUrl', message: 'fileUrl is required' });
        } else if (!this.isValidUrl(fileUrl)) {
          errors.push({ field: 'company_introduction_video.fileUrl', message: 'fileUrl must be a valid URL' });
        }

        if (errors.length === errorCountBefore) {
          sanitized.company_introduction_video = {
            fileId,
            fileUrl,
            filename,
            uploadedAt,
          };
        }
      }
    }

    if (allowPartial && processedFields === 0) {
      errors.push({ field: 'about', message: 'At least one field must be provided for update' });
    }

    if (!allowPartial && sanitized.description === undefined) {
      errors.push({ field: 'description', message: 'Description is required' });
    }

    return { sanitized, errors };
  }

  private validatePrivateInfoPayload(payload: unknown, options: { allowPartial?: boolean } = {}): {
    sanitized: PrivateInfoPayload;
    errors: ValidationError[];
  } {
    const { allowPartial = false } = options;
    const errors: ValidationError[] = [];
    const sanitized: PrivateInfoPayload = {};

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      errors.push({ field: 'privateInfo', message: 'Private info data must be provided as an object' });
      return { sanitized, errors };
    }

    const data = payload as Record<string, unknown>;
    let processedFields = 0;
    if (!allowPartial || data.taxId !== undefined) {
      processedFields += 1;
      const taxId = this.normalizeToString(data.taxId);

      if (!taxId) {
        errors.push({ field: 'taxId', message: 'Tax ID is required' });
      } else {
        const taxIdPattern = /^\d{3}-\d{2}-\d{4}$/;
        if (!taxIdPattern.test(taxId)) {
          errors.push({ field: 'taxId', message: 'Tax ID must be in format XXX-XX-XXXX' });
        } else {
          sanitized.taxId = taxId;
        }
      }
    }

    if (!allowPartial || data.ein !== undefined) {
      processedFields += 1;
      const ein = this.normalizeToString(data.ein);

      if (!ein) {
        errors.push({ field: 'ein', message: 'EIN is required' });
      } else {
        const einPattern = /^\d{2}-\d{7}$/;
        if (!einPattern.test(ein)) {
          errors.push({ field: 'ein', message: 'EIN must be in format XX-XXXXXXX' });
        } else {
          sanitized.ein = ein;
        }
      }
    }

    if (!allowPartial || data.legalName !== undefined) {
      processedFields += 1;
      const legalName = this.normalizeToString(data.legalName);

      if (!legalName) {
        errors.push({ field: 'legalName', message: 'Legal name is required' });
      } else {
        sanitized.legalName = legalName;
      }
    }
    if (data.bankDetails !== undefined) {
      processedFields += 1;
      if (data.bankDetails === null) {
        sanitized.bankDetails = null;
      } else if (typeof data.bankDetails !== 'object' || Array.isArray(data.bankDetails)) {
        errors.push({ field: 'bankDetails', message: 'Bank details must be an object or null' });
      } else {
        const bankDetails = data.bankDetails as Record<string, unknown>;
        const bankDetailsObj: BankDetails = {};
        if (bankDetails.accountNumber !== undefined) {
          const accountNumber = this.normalizeToString(bankDetails.accountNumber);
          if (accountNumber) {
            bankDetailsObj.accountNumber = accountNumber;
          }
        }

        if (bankDetails.routingNumber !== undefined) {
          const routingNumber = this.normalizeToString(bankDetails.routingNumber);
          if (routingNumber) {
            bankDetailsObj.routingNumber = routingNumber;
          }
        }

        if (bankDetails.bankName !== undefined) {
          const bankName = this.normalizeToString(bankDetails.bankName);
          if (bankName) {
            bankDetailsObj.bankName = bankName;
          }
        }

        sanitized.bankDetails = bankDetailsObj;
      }
    }
    if (data.registration_certificate !== undefined) {
      processedFields += 1;
      if (data.registration_certificate === null) {
        sanitized.registration_certificate = null;
      } else if (typeof data.registration_certificate !== 'object' || Array.isArray(data.registration_certificate)) {
        errors.push({ field: 'registration_certificate', message: 'Registration certificate must be an object or null' });
      } else {
        const errorCountBefore = errors.length;
        const file = data.registration_certificate as Record<string, unknown>;
        const fileId = this.normalizeToString(file.fileId ?? file.fileID);
        const fileUrl = this.normalizeToString(file.fileUrl);
        const filename = this.normalizeToString(file.filename ?? file.fileName);
        const uploadedAtRaw = file.uploadedAt ?? file.uploaded_at;
        const uploadedAt =
          uploadedAtRaw === null || uploadedAtRaw === undefined
            ? null
            : this.normalizeToString(uploadedAtRaw);
        if (!fileId) {
          errors.push({ field: 'registration_certificate.fileId', message: 'fileId is required' });
        }
        if (!filename) {
          errors.push({ field: 'registration_certificate.filename', message: 'filename is required' });
        }
        if (!fileUrl) {
          errors.push({ field: 'registration_certificate.fileUrl', message: 'fileUrl is required' });
        } else if (!this.isValidUrl(fileUrl)) {
          errors.push({ field: 'registration_certificate.fileUrl', message: 'fileUrl must be a valid URL' });
        }
        if (errors.length === errorCountBefore) {
          sanitized.registration_certificate = {
            fileId,
            fileUrl,
            filename,
            uploadedAt,
          };
        }
      }
    }
    if (data.business_license !== undefined) {
      processedFields += 1;
      if (data.business_license === null) {
        sanitized.business_license = null;
      } else if (typeof data.business_license !== 'object' || Array.isArray(data.business_license)) {
        errors.push({ field: 'business_license', message: 'Business license must be an object or null' });
      } else {
        const errorCountBefore = errors.length;
        const file = data.business_license as Record<string, unknown>;
        const fileId = this.normalizeToString(file.fileId ?? file.fileID);
        const fileUrl = this.normalizeToString(file.fileUrl);
        const filename = this.normalizeToString(file.filename ?? file.fileName);
        const uploadedAtRaw = file.uploadedAt ?? file.uploaded_at;
        const uploadedAt =
          uploadedAtRaw === null || uploadedAtRaw === undefined
            ? null
            : this.normalizeToString(uploadedAtRaw);

        if (!fileId) {
          errors.push({ field: 'business_license.fileId', message: 'fileId is required' });
        }

        if (!filename) {
          errors.push({ field: 'business_license.filename', message: 'filename is required' });
        }

        if (!fileUrl) {
          errors.push({ field: 'business_license.fileUrl', message: 'fileUrl is required' });
        } else if (!this.isValidUrl(fileUrl)) {
          errors.push({ field: 'business_license.fileUrl', message: 'fileUrl must be a valid URL' });
        }

        if (errors.length === errorCountBefore) {
          sanitized.business_license = {
            fileId,
            fileUrl,
            filename,
            uploadedAt,
          };
        }
      }
    }

    if (allowPartial && processedFields === 0) {
      errors.push({ field: 'privateInfo', message: 'At least one field must be provided for update' });
    }

    if (!allowPartial) {
      if (sanitized.taxId === undefined) {
        errors.push({ field: 'taxId', message: 'Tax ID is required' });
      }
      if (sanitized.ein === undefined) {
        errors.push({ field: 'ein', message: 'EIN is required' });
      }
      if (sanitized.legalName === undefined) {
        errors.push({ field: 'legalName', message: 'Legal name is required' });
      }
    }

    return { sanitized, errors };
  }

  public async createAboutService(
    profileId: string,
    payload: unknown
  ): Promise<{ profileId: string; about: BusinessAboutSection }> {
    const record = await this.fetchCompanyPage(profileId);

    if (!record) {
      throw new BusinessProfileNotFoundError();
    }

    if (record.company_profile_data?.about) {
      throw new AboutSectionExistsError();
    }

    const { sanitized, errors } = this.validateAboutPayload(payload, { allowPartial: false });
    if (errors.length) {
      throw new BusinessProfileValidationError(errors);
    }

    const timestamp = new Date().toISOString();
    const about: BusinessAboutSection = {
      ...(sanitized as BusinessAboutSection),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const updatedProfileData: JsonObject = {
      ...record.company_profile_data,
      about,
    };

    const updateQuery = `
      UPDATE "${config.DB_SCHEMA}".company_pages
      SET company_profile_data = $2::jsonb, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING company_profile_data->'about' AS about
    `;

    const updateResult = await database.query(updateQuery, [
      profileId,
      JSON.stringify(updatedProfileData),
    ]) as { rows: Array<{ about: BusinessAboutSection }> };

    const persistedAbout = updateResult.rows[0]?.about ?? about;

    return {
      profileId: record.id,
      about: persistedAbout,
    };
  }

  public async getAboutService(
    profileId: string,
    requesterId?: string
  ): Promise<{ profileId: string; about: BusinessAboutSection }> {
    const record = await this.fetchCompanyPage(profileId);

    if (!record) {
      throw new BusinessProfileNotFoundError();
    }

    const about = record.company_profile_data?.about as BusinessAboutSection | undefined;
    if (!about) {
      throw new AboutSectionNotFoundError();
    }

    const isOwner = requesterId ? record.owner_id === requesterId : false;
    const visibility = this.determineAboutVisibility(record.privacy_settings);

    if (!isOwner) {
      if (visibility === 'private' || visibility === 'owner_only') {
        throw new BusinessProfilePrivacyError();
      }
      if (visibility === 'connections_only') {
        throw new BusinessProfilePrivacyError('About section is limited to connections');
      }
    }

    return {
      profileId: record.id,
      about,
    };
  }

  public async updateAboutService(
    profileId: string,
    payload: unknown
  ): Promise<{ profileId: string; about: BusinessAboutSection }> {
    const record = await this.fetchCompanyPage(profileId);

    if (!record) {
      throw new BusinessProfileNotFoundError();
    }

    const existingAbout = record.company_profile_data?.about as BusinessAboutSection | undefined;
    if (!existingAbout) {
      throw new AboutSectionNotFoundError();
    }

    const { sanitized, errors } = this.validateAboutPayload(payload, { allowPartial: true });
    if (errors.length) {
      throw new BusinessProfileValidationError(errors);
    }

    if (!Object.keys(sanitized).length) {
      throw new BusinessProfileValidationError([
        { field: 'about', message: 'At least one field must be provided for update' },
      ]);
    }

    const timestamp = new Date().toISOString();
    const updatedAbout: BusinessAboutSection = {
      ...existingAbout,
      ...(sanitized as BusinessAboutSection),
      updatedAt: timestamp,
    };

    if (!updatedAbout.createdAt) {
      updatedAbout.createdAt = existingAbout.createdAt ?? timestamp;
    }

    if (sanitized.company_introduction_video === null) {
      updatedAbout.company_introduction_video = null;
    }

    const updatedProfileData: JsonObject = {
      ...record.company_profile_data,
      about: updatedAbout,
    };

    const updateQuery = `
      UPDATE "${config.DB_SCHEMA}".company_pages
      SET company_profile_data = $2::jsonb, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING company_profile_data->'about' AS about
    `;

    const updateResult = await database.query(updateQuery, [
      profileId,
      JSON.stringify(updatedProfileData),
    ]) as { rows: Array<{ about: BusinessAboutSection }> };

    const persistedAbout = updateResult.rows[0]?.about ?? updatedAbout;

    return {
      profileId: record.id,
      about: persistedAbout,
    };
  }

  public async deleteAboutService(profileId: string): Promise<void> {
    const record = await this.fetchCompanyPage(profileId);

    if (!record) {
      throw new BusinessProfileNotFoundError();
    }

    if (!record.company_profile_data?.about) {
      throw new AboutSectionNotFoundError();
    }

    const updatedProfileData: JsonObject = {
      ...record.company_profile_data,
    };

    delete updatedProfileData.about;

    const deleteQuery = `
      UPDATE "${config.DB_SCHEMA}".company_pages
      SET company_profile_data = $2::jsonb, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await database.query(deleteQuery, [
      profileId,
      JSON.stringify(updatedProfileData),
    ]);
  }

  public async createPrivateInfoService(
    profileId: string,
    payload: unknown
  ): Promise<{ profileId: string; privateInfo: BusinessPrivateInfo }> {
    const record = await this.fetchCompanyPage(profileId);

    if (!record) {
      throw new BusinessProfileNotFoundError();
    }

    if (record.company_profile_data?.private_info) {
      throw new PrivateInfoExistsError();
    }

    const { sanitized, errors } = this.validatePrivateInfoPayload(payload, { allowPartial: false });
    if (errors.length) {
      throw new BusinessProfileValidationError(errors);
    }
    const { encryptPrivateInfo } = await import('../utils/encryption');
    const encryptedData = encryptPrivateInfo(sanitized);

    const timestamp = new Date().toISOString();
    const privateInfo: BusinessPrivateInfo = {
      ...(encryptedData as BusinessPrivateInfo),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const updatedProfileData: JsonObject = {
      ...record.company_profile_data,
      private_info: privateInfo,
    };

    const updateQuery = `
      UPDATE "${config.DB_SCHEMA}".company_pages
      SET company_profile_data = $2::jsonb, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING company_profile_data->'private_info' AS private_info
    `;

    const updateResult = await database.query(updateQuery, [
      profileId,
      JSON.stringify(updatedProfileData),
    ]) as { rows: Array<{ private_info: BusinessPrivateInfo }> };

    const persistedPrivateInfo = updateResult.rows[0]?.private_info ?? privateInfo;
    const { decryptPrivateInfo } = await import('../utils/encryption');
    const { maskPrivateInfo } = await import('../utils/dataMasking');
    const decrypted = decryptPrivateInfo(persistedPrivateInfo);
    const masked = maskPrivateInfo(decrypted);

    return {
      profileId: record.id,
      privateInfo: masked as BusinessPrivateInfo,
    };
  }

  public async getPrivateInfoService(
    profileId: string,
    requesterId: string
  ): Promise<{ profileId: string; privateInfo: BusinessPrivateInfo }> {
    const record = await this.fetchCompanyPage(profileId);

    if (!record) {
      throw new BusinessProfileNotFoundError();
    }
    if (record.owner_id !== requesterId) {
      throw new BusinessProfilePrivacyError('Forbidden. Only profile owner can access private information');
    }

    const privateInfo = record.company_profile_data?.private_info as BusinessPrivateInfo | undefined;
    if (!privateInfo) {
      throw new PrivateInfoNotFoundError();
    }
    const { decryptPrivateInfo } = await import('../utils/encryption');
    const { maskPrivateInfo } = await import('../utils/dataMasking');
    const decrypted = decryptPrivateInfo(privateInfo);
    const masked = maskPrivateInfo(decrypted);

    return {
      profileId: record.id,
      privateInfo: masked as BusinessPrivateInfo,
    };
  }

  public async updatePrivateInfoService(
    profileId: string,
    payload: unknown
  ): Promise<{ profileId: string; privateInfo: BusinessPrivateInfo }> {
    const record = await this.fetchCompanyPage(profileId);

    if (!record) {
      throw new BusinessProfileNotFoundError();
    }

    const existingPrivateInfo = record.company_profile_data?.private_info as BusinessPrivateInfo | undefined;
    if (!existingPrivateInfo) {
      throw new PrivateInfoNotFoundError();
    }

    const { sanitized, errors } = this.validatePrivateInfoPayload(payload, { allowPartial: true });
    if (errors.length) {
      throw new BusinessProfileValidationError(errors);
    }

    if (!Object.keys(sanitized).length) {
      throw new BusinessProfileValidationError([
        { field: 'privateInfo', message: 'At least one field must be provided for update' },
      ]);
    }

    const { decryptPrivateInfo, encryptPrivateInfo } = await import('../utils/encryption');
    const decryptedExisting = decryptPrivateInfo(existingPrivateInfo);

    const mergedData: any = { ...decryptedExisting };
    
    if (sanitized.taxId !== undefined) {
      mergedData.taxId = sanitized.taxId;
    }
    if (sanitized.ein !== undefined) {
      mergedData.ein = sanitized.ein;
    }
    if (sanitized.legalName !== undefined) {
      mergedData.legalName = sanitized.legalName;
    }
    if (sanitized.bankDetails !== undefined) {
      mergedData.bankDetails = sanitized.bankDetails;
    }
    if (sanitized.registration_certificate !== undefined) {
      mergedData.registration_certificate = sanitized.registration_certificate;
    }
    if (sanitized.business_license !== undefined) {
      mergedData.business_license = sanitized.business_license;
    }

    const encryptedData = encryptPrivateInfo(mergedData);

    const timestamp = new Date().toISOString();
    const updatedPrivateInfo: BusinessPrivateInfo = {
      ...(encryptedData as BusinessPrivateInfo),
      createdAt: existingPrivateInfo.createdAt ?? timestamp,
      updatedAt: timestamp,
    };

    const updatedProfileData: JsonObject = {
      ...record.company_profile_data,
      private_info: updatedPrivateInfo,
    };

    const updateQuery = `
      UPDATE "${config.DB_SCHEMA}".company_pages
      SET company_profile_data = $2::jsonb, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING company_profile_data->'private_info' AS private_info
    `;

    const updateResult = await database.query(updateQuery, [
      profileId,
      JSON.stringify(updatedProfileData),
    ]) as { rows: Array<{ private_info: BusinessPrivateInfo }> };

    const persistedPrivateInfo = updateResult.rows[0]?.private_info ?? updatedPrivateInfo;
    const { maskPrivateInfo } = await import('../utils/dataMasking');
    const decrypted = decryptPrivateInfo(persistedPrivateInfo);
    const masked = maskPrivateInfo(decrypted);

    return {
      profileId: record.id,
      privateInfo: masked as BusinessPrivateInfo,
    };
  }

  public async deletePrivateInfoService(profileId: string): Promise<void> {
    const record = await this.fetchCompanyPage(profileId);

    if (!record) {
      throw new BusinessProfileNotFoundError();
    }

    if (!record.company_profile_data?.private_info) {
      throw new PrivateInfoNotFoundError();
    }

    const updatedProfileData: JsonObject = {
      ...record.company_profile_data,
    };

    delete updatedProfileData.private_info;

    const deleteQuery = `
      UPDATE "${config.DB_SCHEMA}".company_pages
      SET company_profile_data = $2::jsonb, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await database.query(deleteQuery, [
      profileId,
      JSON.stringify(updatedProfileData),
    ]);
  }

  public async isProfileOwner(profileId: string, userId: string): Promise<boolean> {
    const record = await this.fetchCompanyPage(profileId);
    if (!record) {
      return false;
    }

    return record.owner_id === userId;
  }

  /**
   * Validate project payload
   */
  private validateProjectPayload(
    payload: unknown,
    options: { allowPartial: boolean } = { allowPartial: false }
  ): { sanitized: Partial<Project>; errors: ValidationError[] } {
    const errors: ValidationError[] = [];
    const sanitized: Partial<Project> = {};
    if (!payload || typeof payload !== 'object') {
      errors.push({ field: 'payload', message: 'Project data must be an object' });
      return { sanitized, errors };
    }
    const data = payload as Record<string, unknown>;
    if (!options.allowPartial || 'title' in data) {
      if (!data.title || typeof data.title !== 'string') {
        errors.push({ field: 'title', message: 'Title is required and must be a string' });
      } else {
        const title = data.title.trim();
        if (title.length < 5 || title.length > 100) {
          errors.push({ field: 'title', message: 'Title must be between 5 and 100 characters' });
        } else {
          sanitized.title = title;
        }
      }
    }
    if (!options.allowPartial || 'description' in data) {
      if (!data.description || typeof data.description !== 'string') {
        errors.push({ field: 'description', message: 'Description is required and must be a string' });
      } else {
        const description = data.description.trim();
        if (description.length < 10 || description.length > 2000) {
          errors.push({ field: 'description', message: 'Description must be between 10 and 2000 characters' });
        } else {
          sanitized.description = description;
        }
      }
    }
    if (!options.allowPartial || 'startDate' in data) {
      if (!data.startDate || typeof data.startDate !== 'string') {
        errors.push({ field: 'startDate', message: 'Start date is required and must be a string (YYYY-MM-DD)' });
      } else {
        const startDate = data.startDate.trim();
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(startDate)) {
          errors.push({ field: 'startDate', message: 'Start date must be in YYYY-MM-DD format' });
        } else {
          const date = new Date(startDate);
          if (isNaN(date.getTime())) {
            errors.push({ field: 'startDate', message: 'Start date must be a valid date' });
          } else {
            sanitized.startDate = startDate;
          }
        }
      }
    }
    if ('endDate' in data && data.endDate !== null && data.endDate !== undefined) {
      if (typeof data.endDate !== 'string') {
        errors.push({ field: 'endDate', message: 'End date must be a string (YYYY-MM-DD) or null' });
      } else {
        const endDate = data.endDate.trim();
        if (endDate) {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(endDate)) {
            errors.push({ field: 'endDate', message: 'End date must be in YYYY-MM-DD format' });
          } else {
            const endDateObj = new Date(endDate);
            if (isNaN(endDateObj.getTime())) {
              errors.push({ field: 'endDate', message: 'End date must be a valid date' });
            } else {
              if (sanitized.startDate) {
                const startDateObj = new Date(sanitized.startDate);
                if (endDateObj < startDateObj) {
                  errors.push({ field: 'endDate', message: 'End date must be after start date' });
                } else {
                  sanitized.endDate = endDate;
                }
              } else {
                sanitized.endDate = endDate;
              }
            }
          }
        } else {
          sanitized.endDate = null;
        }
      }
    } else if ('endDate' in data && data.endDate === null) {
      sanitized.endDate = null;
    }
    if ('status' in data) {
      if (data.status === null || data.status === undefined) {
        sanitized.status = null;
      } else if (typeof data.status === 'string') {
        sanitized.status = data.status.trim() || null;
      } else {
        errors.push({ field: 'status', message: 'Status must be a string or null' });
      }
    }
    if ('technologies' in data) {
      if (data.technologies === null || data.technologies === undefined) {
        sanitized.technologies = null;
      } else if (Array.isArray(data.technologies)) {
        if (data.technologies.length > 15) {
          errors.push({ field: 'technologies', message: 'Maximum 15 technologies allowed' });
        } else {
          const techArray: string[] = [];
          for (let i = 0; i < data.technologies.length; i++) {
            const tech = data.technologies[i];
            if (typeof tech === 'string' && tech.trim()) {
              techArray.push(tech.trim());
            } else {
              errors.push({ field: `technologies[${i}]`, message: 'Each technology must be a non-empty string' });
            }
          }
          sanitized.technologies = techArray.length > 0 ? techArray : null;
        }
      } else {
        errors.push({ field: 'technologies', message: 'Technologies must be an array or null' });
      }
    }
    if ('client' in data) {
      if (data.client === null || data.client === undefined) {
        sanitized.client = null;
      } else if (typeof data.client === 'string') {
        const client = data.client.trim();
        if (client.length > 150) {
          errors.push({ field: 'client', message: 'Client name must not exceed 150 characters' });
        } else {
          sanitized.client = client || null;
        }
      } else {
        errors.push({ field: 'client', message: 'Client must be a string or null' });
      }
    }
    if ('project_url' in data) {
      if (data.project_url === null || data.project_url === undefined) {
        sanitized.project_url = null;
      } else if (typeof data.project_url === 'string') {
        const url = data.project_url.trim();
        if (url) {
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            errors.push({ field: 'project_url', message: 'Project URL must include http:// or https://' });
          } else {
            try {
              new URL(url);
              sanitized.project_url = url;
            } catch {
              errors.push({ field: 'project_url', message: 'Project URL must be a valid URL' });
            }
          }
        } else {
          sanitized.project_url = null;
        }
      } else {
        errors.push({ field: 'project_url', message: 'Project URL must be a string or null' });
      }
    }
    return { sanitized, errors };
  }
  /**
   * Create a new project
   */
  public async createProjectService(
    profileId: string,
    payload: unknown
  ): Promise<{ profileId: string; project: Project }> {
    const record = await this.fetchCompanyPage(profileId);
    if (!record) {
      throw new BusinessProfileNotFoundError();
    }
    const { sanitized, errors } = this.validateProjectPayload(payload, { allowPartial: false });
    if (errors.length) {
      throw new BusinessProfileValidationError(errors);
    }
    const { randomUUID } = await import('crypto');
    const projectId = randomUUID();
    const timestamp = new Date().toISOString();
    const project: Project = {
      projectId,
      title: sanitized.title!,
      description: sanitized.description!,
      startDate: sanitized.startDate!,
      endDate: sanitized.endDate ?? null,
      status: sanitized.status ?? null,
      technologies: sanitized.technologies ?? null,
      client: sanitized.client ?? null,
      project_url: sanitized.project_url ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const existingProjects = (record.company_profile_data?.projects as Project[] | undefined) || [];
    const updatedProjects = [...existingProjects, project];
    const updatedProfileData: JsonObject = {
      ...record.company_profile_data,
      projects: updatedProjects,
    };
    const updateQuery = `
      UPDATE "${config.DB_SCHEMA}".company_pages
      SET company_profile_data = $2::jsonb, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING company_profile_data->'projects' AS projects
    `;
    const updateResult = await database.query(updateQuery, [
      profileId,
      JSON.stringify(updatedProfileData),
    ]) as { rows: Array<{ projects: Project[] }> };
    const persistedProjects = updateResult.rows[0]?.projects ?? updatedProjects;
    const createdProject = persistedProjects.find((p) => p.projectId === projectId) ?? project;
    return {
      profileId: record.id,
      project: createdProject,
    };
  }
  /**
   * Get all projects with pagination
   */
  public async getProjectsService(
    profileId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ profileId: string; projects: Project[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const record = await this.fetchCompanyPage(profileId);
    if (!record) {
      throw new BusinessProfileNotFoundError();
    }
    const projects = (record.company_profile_data?.projects as Project[] | undefined) || [];
    const sortedProjects = [...projects].sort((a, b) => {
      const dateA = new Date(a.startDate).getTime();
      const dateB = new Date(b.startDate).getTime();
      return dateB - dateA;
    });
    const total = sortedProjects.length;
    const totalPages = Math.ceil(total / limit);
    const pageNumber = Math.max(1, page);
    const limitNumber = Math.max(1, Math.min(limit, 100)); // Max 100 per page
    const startIndex = (pageNumber - 1) * limitNumber;
    const endIndex = startIndex + limitNumber;
    const paginatedProjects = sortedProjects.slice(startIndex, endIndex);
    return {
      profileId: record.id,
      projects: paginatedProjects,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages,
      },
    };
  }

  /**
   * Update a project
   */
  public async updateProjectService(
    profileId: string,
    projectId: string,
    payload: unknown
  ): Promise<{ profileId: string; project: Project }> {
    const record = await this.fetchCompanyPage(profileId);
    if (!record) {
      throw new BusinessProfileNotFoundError();
    }
    const projects = (record.company_profile_data?.projects as Project[] | undefined) || [];
    const existingProject = projects.find((p) => p.projectId === projectId);
    if (!existingProject) {
      throw new ProjectNotFoundError();
    }
    const mergedPayload: Record<string, unknown> = Object.assign({}, existingProject, payload);
    const { sanitized, errors } = this.validateProjectPayload(mergedPayload, { allowPartial: true });
    if (errors.length) {
      throw new BusinessProfileValidationError(errors);
    }
    const updatedProject: Project = {
      projectId: existingProject.projectId,
      title: (sanitized.title ?? existingProject.title) as string,
      description: (sanitized.description ?? existingProject.description) as string,
      startDate: (sanitized.startDate ?? existingProject.startDate) as string,
      endDate: sanitized.endDate !== undefined ? (sanitized.endDate ?? null) : (existingProject.endDate ?? null),
      status: sanitized.status !== undefined ? (sanitized.status ?? null) : (existingProject.status ?? null),
      technologies: sanitized.technologies !== undefined ? (sanitized.technologies ?? null) : (existingProject.technologies ?? null),
      client: sanitized.client !== undefined ? (sanitized.client ?? null) : (existingProject.client ?? null),
      project_url: sanitized.project_url !== undefined ? (sanitized.project_url ?? null) : (existingProject.project_url ?? null),
      createdAt: existingProject.createdAt,
      updatedAt: new Date().toISOString(),
    };
    const updatedProjects = projects.map((p) =>
      p.projectId === projectId ? updatedProject : p
    );
    const updatedProfileData: JsonObject = {
      ...record.company_profile_data,
      projects: updatedProjects,
    };
    const updateQuery = `
      UPDATE "${config.DB_SCHEMA}".company_pages
      SET company_profile_data = $2::jsonb, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING company_profile_data->'projects' AS projects
    `;
    const updateResult = await database.query(updateQuery, [
      profileId,
      JSON.stringify(updatedProfileData),
    ]) as { rows: Array<{ projects: Project[] }> };
    const persistedProjects = updateResult.rows[0]?.projects ?? updatedProjects;
    const updatedProjectFromDb = persistedProjects.find((p) => p.projectId === projectId) ?? updatedProject;
    return {
      profileId: record.id,
      project: updatedProjectFromDb,
    };
  }

  /**
   * Delete a project
   */
  public async deleteProjectService(
    profileId: string,
    projectId: string
  ): Promise<void> {
    const record = await this.fetchCompanyPage(profileId);
    if (!record) {
      throw new BusinessProfileNotFoundError();
    }
    const projects = (record.company_profile_data?.projects as Project[] | undefined) || [];
    const projectIndex = projects.findIndex((p) => p.projectId === projectId);
    if (projectIndex === -1) {
      throw new ProjectNotFoundError();
    }
    const updatedProjects = projects.filter((p) => p.projectId !== projectId);
    const updatedProfileData: JsonObject = {
      ...record.company_profile_data,
      projects: updatedProjects,
    };
    const updateQuery = `
      UPDATE "${config.DB_SCHEMA}".company_pages
      SET company_profile_data = $2::jsonb, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await database.query(updateQuery, [
      profileId,
      JSON.stringify(updatedProfileData),
    ]);
  }

  public async uploadBannerService(
    profileId: string,
    bannerData: {
      fileId: string;
      fileUrl: string;
      filename: string;
      uploadedAt: string;
    }
  ): Promise<{ profileId: string; banner: JsonObject }> {
    const record = await this.fetchCompanyPage(profileId);
    if (!record) {
      throw new BusinessProfileNotFoundError();
    }

    const banner: JsonObject = {
      fileId: bannerData.fileId,
      fileUrl: bannerData.fileUrl,
      filename: bannerData.filename,
      uploadedAt: bannerData.uploadedAt,
    };

    const updatedProfileData: JsonObject = {
      ...record.company_profile_data,
      banner,
    };

    const updateQuery = `
      UPDATE "${config.DB_SCHEMA}".company_pages
      SET company_profile_data = $2::jsonb, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING company_profile_data->'banner' AS banner
    `;

    const updateResult = await database.query(updateQuery, [
      profileId,
      JSON.stringify(updatedProfileData),
    ]) as { rows: Array<{ banner: JsonObject }> };

    const persistedBanner = updateResult.rows[0]?.banner ?? banner;

    return {
      profileId: record.id,
      banner: persistedBanner,
    };
  }

  public async getBannerService(
    profileId: string
  ): Promise<{ profileId: string; banner: JsonObject | null }> {
    const record = await this.fetchCompanyPage(profileId);
    if (!record) {
      throw new BusinessProfileNotFoundError();
    }

    const banner = record.company_profile_data?.banner as JsonObject | undefined;

    return {
      profileId: record.id,
      banner: banner || null,
    };
  }

  public async updateBannerService(
    profileId: string,
    bannerData: {
      fileId: string;
      fileUrl: string;
      filename: string;
      uploadedAt: string;
    }
  ): Promise<{ profileId: string; banner: JsonObject }> {
    const record = await this.fetchCompanyPage(profileId);
    if (!record) {
      throw new BusinessProfileNotFoundError();
    }

    const banner: JsonObject = {
      fileId: bannerData.fileId,
      fileUrl: bannerData.fileUrl,
      filename: bannerData.filename,
      uploadedAt: bannerData.uploadedAt,
    };

    const updatedProfileData: JsonObject = {
      ...record.company_profile_data,
      banner,
    };

    const updateQuery = `
      UPDATE "${config.DB_SCHEMA}".company_pages
      SET company_profile_data = $2::jsonb, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING company_profile_data->'banner' AS banner
    `;

    const updateResult = await database.query(updateQuery, [
      profileId,
      JSON.stringify(updatedProfileData),
    ]) as { rows: Array<{ banner: JsonObject }> };

    const persistedBanner = updateResult.rows[0]?.banner ?? banner;

    return {
      profileId: record.id,
      banner: persistedBanner,
    };
  }

  public async deleteBannerService(profileId: string): Promise<void> {
    const record = await this.fetchCompanyPage(profileId);
    if (!record) {
      throw new BusinessProfileNotFoundError();
    }

    const updatedProfileData: JsonObject = {
      ...record.company_profile_data,
    };

    delete updatedProfileData.banner;

    const deleteQuery = `
      UPDATE "${config.DB_SCHEMA}".company_pages
      SET company_profile_data = $2::jsonb, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await database.query(deleteQuery, [
      profileId,
      JSON.stringify(updatedProfileData),
    ]);
  }

  public async createAchievementService(
    profileId: string,
    achievementData: {
      achievementId?: string;
      award_name: string;
      awarding_organization?: string;
      category?: string;
      date_received: string;
      description?: string;
      issuer?: string;
      certificateUrl?: Array<{file_url: string}>;
      icon?: string;
    }
  ): Promise<{ profileId: string; achievement: JsonObject }> {
    const record = await this.fetchCompanyPage(profileId);
    if (!record) {
      throw new BusinessProfileNotFoundError();
    }

    if (!achievementData.award_name || !achievementData.date_received) {
      throw new BusinessProfileValidationError([
        { field: 'award_name', message: 'Award name is required' },
        { field: 'date_received', message: 'Date received is required' },
      ]);
    }

    const dateReceived = new Date(achievementData.date_received);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (dateReceived > today) {
      throw new BusinessProfileValidationError([
        { field: 'date_received', message: 'Date received cannot be in the future' },
      ]);
    }

    const { randomUUID } = await import('crypto');
    const achievementId = achievementData.achievementId || randomUUID();
    const timestamp = new Date().toISOString();

    const achievement: JsonObject = {
      achievementId,
      award_name: achievementData.award_name,
      date_received: achievementData.date_received,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    if (achievementData.awarding_organization) {
      achievement.awarding_organization = achievementData.awarding_organization;
    }
    if (achievementData.category) {
      achievement.category = achievementData.category;
    }
    if (achievementData.description) {
      achievement.description = achievementData.description;
    }
    if (achievementData.issuer) {
      achievement.issuer = achievementData.issuer;
    }
    if (achievementData.certificateUrl && achievementData.certificateUrl.length > 0) {
      achievement.certificateUrl = achievementData.certificateUrl;
    }
    if (achievementData.icon) {
      achievement.icon = achievementData.icon;
    }

    const existingAchievements = (record.company_profile_data?.achievements as JsonObject[] | undefined) || [];
    const updatedAchievements = [...existingAchievements, achievement];

    const updatedProfileData: JsonObject = {
      ...record.company_profile_data,
      achievements: updatedAchievements,
    };

    const updateQuery = `
      UPDATE "${config.DB_SCHEMA}".company_pages
      SET company_profile_data = $2::jsonb, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING company_profile_data->'achievements' AS achievements
    `;

    const updateResult = await database.query(updateQuery, [
      profileId,
      JSON.stringify(updatedProfileData),
    ]) as { rows: Array<{ achievements: JsonObject[] }> };

    const persistedAchievements = updateResult.rows[0]?.achievements || updatedAchievements;
    const createdAchievement = persistedAchievements.find((a: JsonObject) => a.achievementId === achievementId);

    return {
      profileId: record.id,
      achievement: createdAchievement || achievement,
    };
  }

  public async uploadAvatarService(
    profileId: string,
    avatarData: {
      fileId: string;
      fileUrl: string;
      filename: string;
      uploadedAt: string;
    }
  ): Promise<{ profileId: string; avatar: JsonObject }> {
    const record = await this.fetchCompanyPage(profileId);
    if (!record) {
      throw new BusinessProfileNotFoundError();
    }

    const avatar: JsonObject = {
      fileId: avatarData.fileId,
      fileUrl: avatarData.fileUrl,
      filename: avatarData.filename,
      uploadedAt: avatarData.uploadedAt,
    };

    const updatedProfileData: JsonObject = {
      ...record.company_profile_data,
      avatar,
    };

    const updateQuery = `
      UPDATE "${config.DB_SCHEMA}".company_pages
      SET company_profile_data = $2::jsonb, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING company_profile_data->'avatar' AS avatar
    `;

    const updateResult = await database.query(updateQuery, [
      profileId,
      JSON.stringify(updatedProfileData),
    ]) as { rows: Array<{ avatar: JsonObject }> };

    const persistedAvatar = updateResult.rows[0]?.avatar ?? avatar;

    return {
      profileId: record.id,
      avatar: persistedAvatar,
    };
  }

  public async getAchievementsService(
    profileId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    profileId: string;
    achievements: JsonObject[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const record = await this.fetchCompanyPage(profileId);
    if (!record) {
      throw new BusinessProfileNotFoundError();
    }

    const achievements = (record.company_profile_data?.achievements as JsonObject[] | undefined) || [];
    const sortedAchievements = [...achievements].sort((a, b) => {
      const dateA = new Date(a.date_received as string).getTime();
      const dateB = new Date(b.date_received as string).getTime();
      return dateB - dateA;
    });

    const total = sortedAchievements.length;
    const totalPages = Math.ceil(total / limit);
    const pageNumber = Math.max(1, page);
    const limitNumber = Math.max(1, Math.min(limit, 100));
    const startIndex = (pageNumber - 1) * limitNumber;
    const endIndex = startIndex + limitNumber;
    const paginatedAchievements = sortedAchievements.slice(startIndex, endIndex);

    return {
      profileId: record.id,
      achievements: paginatedAchievements,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages,
      },
    };
  }

  public async getAchievementService(
    profileId: string,
    achievementId: string
  ): Promise<{ profileId: string; achievement: JsonObject }> {
    const record = await this.fetchCompanyPage(profileId);
    if (!record) {
      throw new BusinessProfileNotFoundError();
    }

    const achievements = (record.company_profile_data?.achievements as JsonObject[] | undefined) || [];
    const achievement = achievements.find((a: JsonObject) => a.achievementId === achievementId);

    if (!achievement) {
      throw new AchievementNotFoundError();
    }

    return {
      profileId: record.id,
      achievement,
    };
  }

  public async getAvatarService(
    profileId: string
  ): Promise<{ profileId: string; avatar: JsonObject | null }> {
    const record = await this.fetchCompanyPage(profileId);
    if (!record) {
      throw new BusinessProfileNotFoundError();
    }

    const avatar = record.company_profile_data?.avatar as JsonObject | undefined;

    return {
      profileId: record.id,
      avatar: avatar || null,
    };
  }

  public async updateAvatarService(
    profileId: string,
    avatarData: {
      fileId: string;
      fileUrl: string;
      filename: string;
      uploadedAt: string;
    }
  ): Promise<{ profileId: string; avatar: JsonObject }> {
    const record = await this.fetchCompanyPage(profileId);
    if (!record) {
      throw new BusinessProfileNotFoundError();
    }

    const avatar: JsonObject = {
      fileId: avatarData.fileId,
      fileUrl: avatarData.fileUrl,
      filename: avatarData.filename,
      uploadedAt: avatarData.uploadedAt,
    };

    const updatedProfileData: JsonObject = {
      ...record.company_profile_data,
      avatar,
    };

    const updateQuery = `
      UPDATE "${config.DB_SCHEMA}".company_pages
      SET company_profile_data = $2::jsonb, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING company_profile_data->'avatar' AS avatar
    `;

    const updateResult = await database.query(updateQuery, [
      profileId,
      JSON.stringify(updatedProfileData),
    ]) as { rows: Array<{ avatar: JsonObject }> };

    const persistedAvatar = updateResult.rows[0]?.avatar ?? avatar;

    return {
      profileId: record.id,
      avatar: persistedAvatar,
    };
  }

  public async updateAchievementService(
    profileId: string,
    achievementId: string,
    updateData: {
      award_name?: string;
      awarding_organization?: string;
      category?: string;
      date_received?: string;
      description?: string;
      issuer?: string;
      certificateUrl?: Array<{file_url: string}>;
      icon?: string;
    }
  ): Promise<{ profileId: string; achievement: JsonObject }> {
    const record = await this.fetchCompanyPage(profileId);
    if (!record) {
      throw new BusinessProfileNotFoundError();
    }

    const achievements = (record.company_profile_data?.achievements as JsonObject[] | undefined) || [];
    const achievementIndex = achievements.findIndex((a: JsonObject) => a.achievementId === achievementId);

    if (achievementIndex === -1) {
      throw new AchievementNotFoundError();
    }

    if (updateData.date_received) {
      const dateReceived = new Date(updateData.date_received);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (dateReceived > today) {
        throw new BusinessProfileValidationError([
          { field: 'date_received', message: 'Date received cannot be in the future' },
        ]);
      }
    }

    const existingAchievement = achievements[achievementIndex] as JsonObject;
    const timestamp = new Date().toISOString();

    const updatedAchievement: JsonObject = {
      ...existingAchievement,
      ...updateData,
      updatedAt: timestamp,
    };

    achievements[achievementIndex] = updatedAchievement;

    const updatedProfileData: JsonObject = {
      ...record.company_profile_data,
      achievements,
    };

    const updateQuery = `
      UPDATE "${config.DB_SCHEMA}".company_pages
      SET company_profile_data = $2::jsonb, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING company_profile_data->'achievements' AS achievements
    `;

    const updateResult = await database.query(updateQuery, [
      profileId,
      JSON.stringify(updatedProfileData),
    ]) as { rows: Array<{ achievements: JsonObject[] }> };

    const persistedAchievements = updateResult.rows[0]?.achievements || achievements;
    const updatedAchievementFromDb = persistedAchievements.find((a: JsonObject) => a.achievementId === achievementId);

    return {
      profileId: record.id,
      achievement: updatedAchievementFromDb || updatedAchievement,
    };
  }

  public async deleteAchievementService(profileId: string, achievementId: string): Promise<void> {
    const record = await this.fetchCompanyPage(profileId);
    if (!record) {
      throw new BusinessProfileNotFoundError();
    }

    const achievements = (record.company_profile_data?.achievements as JsonObject[] | undefined) || [];
    const achievementIndex = achievements.findIndex((a: JsonObject) => a.achievementId === achievementId);

    if (achievementIndex === -1) {
      throw new AchievementNotFoundError();
    }

    const updatedAchievements = achievements.filter((a: JsonObject) => a.achievementId !== achievementId);

    const updatedProfileData: JsonObject = {
      ...record.company_profile_data,
      achievements: updatedAchievements,
    };

    const deleteQuery = `
      UPDATE "${config.DB_SCHEMA}".company_pages
      SET company_profile_data = $2::jsonb, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await database.query(deleteQuery, [
      profileId,
      JSON.stringify(updatedProfileData),
    ]);
  }

  public async deleteAvatarService(profileId: string): Promise<void> {
    const record = await this.fetchCompanyPage(profileId);
    if (!record) {
      throw new BusinessProfileNotFoundError();
    }

    const updatedProfileData: JsonObject = {
      ...record.company_profile_data,
    };

    delete updatedProfileData.avatar;

    const deleteQuery = `
      UPDATE "${config.DB_SCHEMA}".company_pages
      SET company_profile_data = $2::jsonb, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await database.query(deleteQuery, [
      profileId,
      JSON.stringify(updatedProfileData),
    ]);
  }

  /**
   * =========================
   * Business Posts (posts table)
   * =========================
   */

  /**
   * Ensure business profile exists before operating on posts
   */
  private async assertBusinessProfileExists(profileId: string): Promise<void> {
    const record = await this.fetchCompanyPage(profileId);
    if (!record) {
      throw new BusinessProfileNotFoundError();
    }
  }

  /**
   * Create a business post backed by the shared posts table.
   * The business profile id is stored in posts.user_id.
   */
  public async createBusinessPost(
    profileId: string,
    payload: {
      title: string;
      content: string;
      tags?: string[];
      mediaItems?: MediaItem[];
    }
  ): Promise<{
    postId: string;
    profileId: string;
    title: string;
    content: string;
    status: 'published';
    createdAt: string;
    tags: string[];
    media: MediaItem[] | null;
  }> {
    await this.assertBusinessProfileExists(profileId);

    const errors: ValidationError[] = [];

    const title = this.normalizeToString(payload.title);
    const body = this.normalizeToString(payload.content);

    if (!title) {
      errors.push({ field: 'title', message: 'Title is required' });
    }

    if (!body) {
      errors.push({ field: 'content', message: 'Content is required' });
    }

    const contentValidation = contentService.validateContentLength(body);
    if (!contentValidation.isValid) {
      errors.push({ field: 'content', message: contentValidation.message || 'Content validation failed' });
    }

    const moderationResult = contentService.moderateContent(body);
    if (!moderationResult.isAppropriate) {
      errors.push({ field: 'content', message: moderationResult.reason || 'Content contains inappropriate language' });
    }

    if (errors.length) {
      throw new BusinessProfileValidationError(errors);
    }

    const { hashtags, mentions } = contentService.processContent(body);

    const allTags = Array.isArray(payload.tags) && payload.tags.length
      ? Array.from(new Set([...(payload.tags || []), ...hashtags]))
      : hashtags;

    const mediaItems = payload.mediaItems && payload.mediaItems.length > 0 ? payload.mediaItems : null;

    const now = new Date().toISOString();

    const contentJson: JsonObject = {
      title,
      text: body,
      // Store combined tags as hashtags so DB content matches logical tags
      hashtags: allTags,
      mentions,
    };

    const insertQuery = `
      INSERT INTO "${config.DB_SCHEMA}".company_posts (
        company_page_id, content, media, audience,
        tags, likes, comments, shares, saves, reposts,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3::jsonb, $4,
        $5::jsonb, 0, 0, 0, 0, 0,
        $6, $7
      )
      RETURNING id, company_page_id, content, created_at
    `;

    const values = [
      profileId,
      JSON.stringify(contentJson),
      mediaItems ? JSON.stringify(mediaItems) : null,
      'public',
      JSON.stringify(allTags),
      now,
      now,
    ];

    const result = await database.query(insertQuery, values) as {
      rows: Array<{ id: string; company_page_id: string; content: any; created_at: Date | string }>;
    };

    if (!result.rows.length) {
      throw new Error('Failed to create business post');
    }

    const row = result.rows[0]!;

    const createdAt =
      row.created_at instanceof Date ? row.created_at.toISOString() : (row.created_at as string);

    // content may come back as a JSON string from pg, so normalize
    const rawContent = (row as any).content;
    let storedContent: any = contentJson;
    if (rawContent) {
      if (typeof rawContent === 'string') {
        try {
          storedContent = JSON.parse(rawContent);
        } catch {
          storedContent = contentJson;
        }
      } else {
        storedContent = rawContent;
      }
    }

    return {
      postId: row.id,
      profileId: row.company_page_id,
      title: storedContent.title ?? title,
      content: storedContent.text ?? body,
      status: 'published',
      createdAt,
      tags: allTags,
      media: mediaItems,
    };
  }

  /**
   * Get paginated business posts for a profile.
   */
  public async getBusinessPosts(
    profileId: string,
    page: number,
    limit: number
  ): Promise<{
    posts: Array<{
      postId: string;
      profileId: string;
      title: string;
      content: string;
      tags: string[];
      media: MediaItem[] | null;
      createdAt: string;
      updatedAt: string;
    }>;
    pagination: { total: number; page: number; limit: number };
  }> {
    await this.assertBusinessProfileExists(profileId);

    const pageNumber = Math.max(1, page || 1);
    const pageLimit = Math.max(1, Math.min(limit || 10, 100));
    const offset = (pageNumber - 1) * pageLimit;

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM "${config.DB_SCHEMA}".company_posts
      WHERE company_page_id = $1
    `;

    const countResult = await database.query(countQuery, [profileId]) as { rows: Array<{ total: number }> };
    const total = countResult.rows[0]?.total ?? 0;

    const listQuery = `
      SELECT id, company_page_id, content, media, tags, created_at, updated_at
      FROM "${config.DB_SCHEMA}".company_posts
      WHERE company_page_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const listResult = await database.query(listQuery, [profileId, pageLimit, offset]) as {
      rows: Array<{
        id: string;
        company_page_id: string;
        content: any;
        media: any;
        tags: any;
        created_at: Date | string;
        updated_at: Date | string;
      }>;
    };

    const posts = listResult.rows.map((row) => {
      const rawContent = row.content;
      let content: any = {};
      if (rawContent) {
        if (typeof rawContent === 'string') {
          try {
            content = JSON.parse(rawContent);
          } catch {
            content = {};
          }
        } else {
          content = rawContent;
        }
      }

      const text: string = typeof content.text === 'string' ? content.text : '';
      const title: string =
        typeof content.title === 'string' && content.title.trim().length > 0
          ? content.title
          : (text || '').slice(0, 80);
      const createdAt =
        row.created_at instanceof Date ? row.created_at.toISOString() : (row.created_at as string);
      const updatedAt =
        row.updated_at instanceof Date ? row.updated_at.toISOString() : (row.updated_at as string);
      const tags: string[] = Array.isArray(row.tags) ? (row.tags as string[]) : [];
      const media: MediaItem[] | null = Array.isArray(row.media) ? (row.media as MediaItem[]) : null;

      return {
        postId: row.id,
        profileId: row.company_page_id,
        title,
        content: text,
        tags,
        media,
        createdAt,
        updatedAt,
      };
    });

    return {
      posts,
      pagination: {
        total,
        page: pageNumber,
        limit: pageLimit,
      },
    };
  }

  /**
   * Get a single business post.
   */
  public async getBusinessPost(
    profileId: string,
    postId: string
  ): Promise<{
    postId: string;
    profileId: string;
    title: string;
    content: string;
    tags: string[];
    media: MediaItem[] | null;
    createdAt: string;
    updatedAt: string;
  }> {
    await this.assertBusinessProfileExists(profileId);

    const query = `
      SELECT id, company_page_id, content, media, tags, created_at, updated_at
      FROM "${config.DB_SCHEMA}".company_posts
      WHERE id = $1 AND company_page_id = $2
      LIMIT 1
    `;

    const result = await database.query(query, [postId, profileId]) as {
      rows: Array<{
        id: string;
        company_page_id: string;
        content: any;
        media: any;
        tags: any;
        created_at: Date | string;
        updated_at: Date | string;
      }>;
    };

    if (!result.rows.length) {
      throw new ProjectNotFoundError(); // Reuse not-found error for section-style resources
    }

    const row = result.rows[0]!;

    const rawContent = (row as any).content;
    let content: any = {};
    if (rawContent) {
      if (typeof rawContent === 'string') {
        try {
          content = JSON.parse(rawContent);
        } catch {
          content = {};
        }
      } else {
        content = rawContent;
      }
    }

    const createdAt =
      row.created_at instanceof Date ? row.created_at.toISOString() : (row.created_at as string);
    const updatedAt =
      row.updated_at instanceof Date ? row.updated_at.toISOString() : (row.updated_at as string);

    const tags: string[] = Array.isArray(row.tags) ? (row.tags as string[]) : [];
    const media: MediaItem[] | null = Array.isArray(row.media) ? (row.media as MediaItem[]) : null;

    return {
      postId: row.id,
      profileId: row.company_page_id,
      title: typeof content.title === 'string' ? content.title : '',
      content: typeof content.text === 'string' ? content.text : '',
      tags,
      media,
      createdAt,
      updatedAt,
    };
  }

  /**
   * Update a business post.
   */
  public async updateBusinessPost(
    profileId: string,
    postId: string,
    payload: {
      title?: string;
      content?: string;
      tags?: string[];
      mediaItems?: MediaItem[];
    }
  ): Promise<{
    postId: string;
    title: string;
    updatedAt: string;
  }> {
    await this.assertBusinessProfileExists(profileId);

    const selectQuery = `
      SELECT id, company_page_id, content, tags, media
      FROM "${config.DB_SCHEMA}".company_posts
      WHERE id = $1 AND company_page_id = $2
      LIMIT 1
    `;

    const selectResult = await database.query(selectQuery, [postId, profileId]) as {
      rows: Array<{ id: string; user_id: string; content: any; tags: any; media: any }>;
    };

    if (!selectResult.rows.length) {
      throw new ProjectNotFoundError();
    }

    const existing = selectResult.rows[0]!;
    const existingContent = (existing as any).content || {};
    const existingMedia = (existing as any).media;

    const errors: ValidationError[] = [];

    let title = payload.title !== undefined
      ? this.normalizeToString(payload.title)
      : existingContent.title || '';

    let body = payload.content !== undefined
      ? this.normalizeToString(payload.content)
      : existingContent.text || '';

    if (!title) {
      errors.push({ field: 'title', message: 'Title is required' });
    }

    if (!body) {
      errors.push({ field: 'content', message: 'Content is required' });
    }

    const contentValidation = contentService.validateContentLength(body);
    if (!contentValidation.isValid) {
      errors.push({ field: 'content', message: contentValidation.message || 'Content validation failed' });
    }

    const moderationResult = contentService.moderateContent(body);
    if (!moderationResult.isAppropriate) {
      errors.push({ field: 'content', message: moderationResult.reason || 'Content contains inappropriate language' });
    }

    if (errors.length) {
      throw new BusinessProfileValidationError(errors);
    }

    const { hashtags, mentions } = contentService.processContent(body);

    const incomingTags = Array.isArray(payload.tags) ? payload.tags : ((existing as any).tags || []);
    const allTags = incomingTags.length
      ? Array.from(new Set([...(incomingTags || []), ...hashtags]))
      : hashtags;

      // Only update media if explicitly provided in payload, otherwise keep existing media
    let mediaItems: MediaItem[] | null;
    if (payload.mediaItems !== undefined) {
      // User explicitly provided mediaItems (could be empty array or populated array)
      mediaItems = payload.mediaItems && payload.mediaItems.length > 0 ? payload.mediaItems : null;
    } else {
      // User didn't provide mediaItems, keep existing media
      mediaItems = existingMedia;
    }

    const now = new Date().toISOString();

    const contentJson: JsonObject = {
      title,
      text: body,
      hashtags: allTags,
      mentions,
    };

    const updateQuery = `
      UPDATE "${config.DB_SCHEMA}".company_posts
      SET content = $1,
          media = $2::jsonb,
          tags = $3::jsonb,
          updated_at = $4
      WHERE id = $5 AND company_page_id = $6
      RETURNING id, content, updated_at
    `;

    const updateResult = await database.query(updateQuery, [
      JSON.stringify(contentJson),
      mediaItems ? JSON.stringify(mediaItems) : null,
      JSON.stringify(allTags),
      now,
      postId,
      profileId,
    ]) as {
      rows: Array<{ id: string; content: any; updated_at: Date | string }>;
    };

    if (!updateResult.rows.length) {
      throw new ProjectNotFoundError();
    }

    const row = updateResult.rows[0]!;

    const updatedAt =
      row.updated_at instanceof Date ? row.updated_at.toISOString() : (row.updated_at as string);

    const storedContent = (row as any).content || contentJson;

    return {
      postId: row.id,
      title: storedContent.title || title,
      updatedAt,
    };
  }

  /**
   * Delete a business post (DB only).
   * Media deletion is handled at controller layer.
   */
  public async deleteBusinessPost(
    profileId: string,
    postId: string
  ): Promise<void> {
    await this.assertBusinessProfileExists(profileId);

    const deleteQuery = `
      DELETE FROM "${config.DB_SCHEMA}".company_posts
      WHERE id = $1 AND company_page_id = $2
    `;

    const result = await database.query(deleteQuery, [postId, profileId]) as { rowCount: number };

    if (!result.rowCount) {
      throw new ProjectNotFoundError();
    }
  }

  private getDefaultPrivacySettings(): JsonObject {
    return {
      profile_visibility: 'public',
      contact_visibility: 'connections',
      projects_visibility: 'public',
      posts_visibility: 'public',
      achievements_visibility: 'public',
      show_email: false,
      show_phone: false,
      allow_messages: true,
      allow_connection_requests: true,
    };
  }

  private validatePrivacySettings(updateData: JsonObject): ValidationError[] {
    const errors: ValidationError[] = [];
    const validVisibilityValues = ['public', 'private', 'connections'];

    const visibilityFields = [
      'profile_visibility',
      'contact_visibility',
      'projects_visibility',
      'posts_visibility',
      'achievements_visibility',
    ];

    const booleanFields = [
      'show_email',
      'show_phone',
      'allow_messages',
      'allow_connection_requests',
    ];

    for (const field of visibilityFields) {
      if (field in updateData) {
        const value = updateData[field];
        if (typeof value !== 'string' || !validVisibilityValues.includes(value)) {
          errors.push({
            field,
            message: `Must be one of: ${validVisibilityValues.join(', ')}`,
          });
        }
      }
    }

    for (const field of booleanFields) {
      if (field in updateData) {
        const value = updateData[field];
        if (typeof value !== 'boolean') {
          errors.push({
            field,
            message: 'Must be a boolean (true or false)',
          });
        }
      }
    }

    return errors;
  }

  public async getPrivacySettings(profileId: string, requesterId?: string): Promise<JsonObject> {
    const companyPage = await this.fetchCompanyPage(profileId);

    if (!companyPage) {
      throw new BusinessProfileNotFoundError();
    }

    const existingSettings = companyPage.privacy_settings || {};
    const defaults = this.getDefaultPrivacySettings();

    const mergedSettings: JsonObject = {
      profile_visibility: (existingSettings.profile_visibility as string | undefined) ?? (defaults.profile_visibility as string),
      contact_visibility: (existingSettings.contact_visibility as string | undefined) ?? (defaults.contact_visibility as string),
      projects_visibility: (existingSettings.projects_visibility as string | undefined) ?? (defaults.projects_visibility as string),
      posts_visibility: (existingSettings.posts_visibility as string | undefined) ?? (defaults.posts_visibility as string),
      achievements_visibility: (existingSettings.achievements_visibility as string | undefined) ?? (defaults.achievements_visibility as string),
      show_email: (existingSettings.show_email as boolean | undefined) ?? (defaults.show_email as boolean),
      show_phone: (existingSettings.show_phone as boolean | undefined) ?? (defaults.show_phone as boolean),
      allow_messages: (existingSettings.allow_messages as boolean | undefined) ?? (defaults.allow_messages as boolean),
      allow_connection_requests: (existingSettings.allow_connection_requests as boolean | undefined) ?? (defaults.allow_connection_requests as boolean),
    };

    return mergedSettings;
  }

  public async updatePrivacySettings(profileId: string, updateData: JsonObject): Promise<JsonObject> {
    await this.assertBusinessProfileExists(profileId);

    const validationErrors = this.validatePrivacySettings(updateData);
    if (validationErrors.length > 0) {
      throw new BusinessProfileValidationError(validationErrors);
    }

    const companyPage = await this.fetchCompanyPage(profileId);
    if (!companyPage) {
      throw new BusinessProfileNotFoundError();
    }

    const existingSettings = companyPage.privacy_settings || {};
    const defaults = this.getDefaultPrivacySettings();

    const currentSettings: JsonObject = {
      profile_visibility: (existingSettings.profile_visibility as string | undefined) ?? (defaults.profile_visibility as string),
      contact_visibility: (existingSettings.contact_visibility as string | undefined) ?? (defaults.contact_visibility as string),
      projects_visibility: (existingSettings.projects_visibility as string | undefined) ?? (defaults.projects_visibility as string),
      posts_visibility: (existingSettings.posts_visibility as string | undefined) ?? (defaults.posts_visibility as string),
      achievements_visibility: (existingSettings.achievements_visibility as string | undefined) ?? (defaults.achievements_visibility as string),
      show_email: (existingSettings.show_email as boolean | undefined) ?? (defaults.show_email as boolean),
      show_phone: (existingSettings.show_phone as boolean | undefined) ?? (defaults.show_phone as boolean),
      allow_messages: (existingSettings.allow_messages as boolean | undefined) ?? (defaults.allow_messages as boolean),
      allow_connection_requests: (existingSettings.allow_connection_requests as boolean | undefined) ?? (defaults.allow_connection_requests as boolean),
    };

    const updatedSettings: JsonObject = {
      ...currentSettings,
      ...updateData,
    };

    const updateQuery = `
      UPDATE "${config.DB_SCHEMA}".company_pages
      SET privacy_settings = $1::jsonb,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING privacy_settings
    `;

    const result = await database.query(updateQuery, [
      JSON.stringify(updatedSettings),
      profileId,
    ]) as {
      rows: Array<{ privacy_settings: JsonObject | string }>;
    };

    if (!result.rows.length) {
      throw new BusinessProfileNotFoundError();
    }

    const row = result.rows[0]!;
    const returnedSettings =
      typeof row.privacy_settings === 'string'
        ? (JSON.parse(row.privacy_settings) as JsonObject)
        : (row.privacy_settings as JsonObject);

    return returnedSettings;
  }

  public async deletePrivacySettings(profileId: string): Promise<void> {
    await this.assertBusinessProfileExists(profileId);

    const defaultSettings = this.getDefaultPrivacySettings();

    const updateQuery = `
      UPDATE "${config.DB_SCHEMA}".company_pages
      SET privacy_settings = $1::jsonb,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;

    const result = await database.query(updateQuery, [
      JSON.stringify(defaultSettings),
      profileId,
    ]) as { rowCount: number };

    if (!result.rowCount) {
      throw new BusinessProfileNotFoundError();
    }
  }

  private async findUserByIdOrEmail(identifier: string): Promise<{ id: string; email: string; profile_data?: any } | null> {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isUUID = uuidRegex.test(identifier);

    let query: string;
    let params: string[];

    if (isUUID) {
      query = `
        SELECT u.id, u.email, up.profile_data
        FROM "${config.DB_SCHEMA}".users u
        LEFT JOIN "${config.DB_SCHEMA}".user_profiles up ON u.id = up.user_id
        WHERE u.id = $1
        LIMIT 1
      `;
      params = [identifier];
    } else {
      query = `
        SELECT u.id, u.email, up.profile_data
        FROM "${config.DB_SCHEMA}".users u
        LEFT JOIN "${config.DB_SCHEMA}".user_profiles up ON u.id = up.user_id
        WHERE LOWER(u.email) = LOWER($1)
        LIMIT 1
      `;
      params = [identifier];
    }

    const result = await database.query(query, params) as {
      rows: Array<{ id: string; email: string; profile_data?: any }>;
    };

    if (result.rows.length > 0) {
      return result.rows[0]!;
    }

    return null;
  }

  private async getUserProfileInfo(userId: string): Promise<{ name: string; email: string; avatar?: string } | null> {
    const query = `
      SELECT u.email, up.profile_data
      FROM "${config.DB_SCHEMA}".users u
      LEFT JOIN "${config.DB_SCHEMA}".user_profiles up ON u.id = up.user_id
      WHERE u.id = $1
      LIMIT 1
    `;

    const result = await database.query(query, [userId]) as {
      rows: Array<{ email: string; profile_data?: any }>;
    };

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0]!;
    const profileData = row.profile_data || {};
    const firstName = profileData.personal_information?.first_name || profileData.first_name || '';
    const lastName = profileData.personal_information?.last_name || profileData.last_name || '';
    const name = `${firstName} ${lastName}`.trim() || row.email;
    const avatar = profileData.avatar || profileData.profilePicture || profileData.profile_picture || undefined;

    return {
      name,
      email: row.email,
      avatar,
    };
  }

  private async getCompanyProfileInfo(profileId: string): Promise<{ name: string; logo?: string } | null> {
    const query = `
      SELECT company_profile_data
      FROM "${config.DB_SCHEMA}".company_pages
      WHERE id = $1
      LIMIT 1
    `;

    const result = await database.query(query, [profileId]) as {
      rows: Array<{ company_profile_data: any }>;
    };

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0]!;
    const companyData = typeof row.company_profile_data === 'string'
      ? JSON.parse(row.company_profile_data)
      : row.company_profile_data;

    const name = companyData.companyName || companyData.company_name || 'Unknown Company';
    const logo = companyData.company_logo?.fileUrl || companyData.companyLogo?.fileUrl || undefined;

    return { name, logo };
  }

  public async sendInvitationService(
    profileId: string,
    inviteeIdOrEmail: string,
    role: string,
    ownerId: string
  ): Promise<any> {
    await this.assertBusinessProfileExists(profileId);

    if (role !== 'admin' && role !== 'editor') {
      throw new InvalidRoleError();
    }

    const invitee = await this.findUserByIdOrEmail(inviteeIdOrEmail);
    if (!invitee) {
      throw new UserNotFoundError();
    }

    const memberCheckQuery = `
      SELECT id
      FROM "${config.DB_SCHEMA}".company_pages_members
      WHERE company_page_id = $1 AND user_id = $2
      LIMIT 1
    `;

    const memberResult = await database.query(memberCheckQuery, [profileId, invitee.id]) as { rows: Array<{ id: string }> };
    if (memberResult.rows.length > 0) {
      throw new UserAlreadyMemberError();
    }

    const pendingInvitationQuery = `
      SELECT id
      FROM "${config.DB_SCHEMA}".notifications
      WHERE user_id = $1
        AND type = 'business_profile_invitation'
        AND payload->>'profileId' = $2
        AND payload->>'status' = 'pending'
      LIMIT 1
    `;

    const pendingResult = await database.query(pendingInvitationQuery, [invitee.id, profileId]) as { rows: Array<{ id: string }> };
    if (pendingResult.rows.length > 0) {
      throw new PendingInvitationExistsError();
    }

    const ownerInfo = await this.getUserProfileInfo(ownerId);
    const companyInfo = await this.getCompanyProfileInfo(profileId);

    if (!ownerInfo || !companyInfo) {
      throw new Error('Failed to retrieve owner or company information');
    }

    const notificationPayload = {
      status: 'pending',
      profileId,
      profileName: companyInfo.name,
      profileLogo: companyInfo.logo,
      role,
      invitedBy: {
        userId: ownerId,
        name: ownerInfo.name,
        email: ownerInfo.email,
        avatar: ownerInfo.avatar,
      },
    };

    const notificationContent = `${ownerInfo.name} invited you to join ${companyInfo.name} as an ${role === 'admin' ? 'Admin' : 'Editor'}`;

    const notificationModel = new NotificationModel(database.getPool());
    const notification = await notificationModel.create({
      user_id: invitee.id,
      content: notificationContent,
      payload: notificationPayload,
      type: 'business_profile_invitation',
      read: false,
      delivery_method: 'in_app',
    });

    const socketPayload = {
      invitationId: notification.id,
      notificationId: notification.id,
      profileId,
      profileName: companyInfo.name,
      profileLogo: companyInfo.logo,
      role,
      invitedBy: {
        userId: ownerId,
        name: ownerInfo.name,
        email: ownerInfo.email,
        avatar: ownerInfo.avatar,
      },
      message: notificationContent,
      createdAt: notification.created_at.toISOString(),
    };

    socketService.sendToUser(invitee.id, 'invitation_received', socketPayload);

    const inviteeInfo = await this.getUserProfileInfo(invitee.id);

    return {
      invitationId: notification.id,
      profileId,
      profileName: companyInfo.name,
      inviteeId: invitee.id,
      inviteeEmail: invitee.email,
      inviteeName: inviteeInfo?.name || invitee.email,
      role,
      status: 'pending',
      invitedBy: {
        userId: ownerId,
        name: ownerInfo.name,
        email: ownerInfo.email,
      },
      createdAt: notification.created_at.toISOString(),
    };
  }

  public async cancelInvitationService(invitationId: string, profileId: string, userId: string): Promise<void> {
    await this.assertBusinessProfileExists(profileId);

    const query = `
      SELECT user_id, payload
      FROM "${config.DB_SCHEMA}".notifications
      WHERE id = $1
        AND type = 'business_profile_invitation'
        AND payload->>'profileId' = $2
      LIMIT 1
    `;

    const result = await database.query(query, [invitationId, profileId]) as {
      rows: Array<{ user_id: string; payload: any }>;
    };

    if (result.rows.length === 0) {
      throw new InvitationNotFoundError();
    }

    const row = result.rows[0]!;
    const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;

    if (payload.status !== 'pending') {
      throw new Error('Invitation is not pending and cannot be cancelled');
    }

    const updatedPayload = {
      ...payload,
      status: 'cancelled',
    };

    const updateQuery = `
      UPDATE "${config.DB_SCHEMA}".notifications
      SET payload = $1::jsonb
      WHERE id = $2
      RETURNING id
    `;

    const updateResult = await database.query(updateQuery, [JSON.stringify(updatedPayload), invitationId]) as {
      rows: Array<{ id: string }>;
    };

    if (updateResult.rows.length === 0) {
      throw new Error('Failed to cancel invitation');
    }

    const socketPayload = {
      invitationId,
      profileId,
      cancelledAt: new Date().toISOString(),
    };

    socketService.sendToUser(row.user_id, 'invitation_cancelled', socketPayload);
  }

  public async getInvitationsByProfile(
    profileId: string,
    status: string = 'all',
    page: number = 1,
    limit: number = 10
  ): Promise<any> {
    await this.assertBusinessProfileExists(profileId);

    const offset = (page - 1) * limit;
    const validStatuses = ['pending', 'accepted', 'declined', 'cancelled'];

    let statusFilter = '';
    const queryParams: any[] = [profileId];

    if (status !== 'all' && validStatuses.includes(status)) {
      statusFilter = `AND payload->>'status' = $${queryParams.length + 1}`;
      queryParams.push(status);
    }

    const countQuery = `
      SELECT COUNT(*) as total
      FROM "${config.DB_SCHEMA}".notifications n
      WHERE n.type = 'business_profile_invitation'
        AND n.payload->>'profileId' = $1
        ${statusFilter}
    `;

    const countResult = await database.query(countQuery, queryParams) as {
      rows: Array<{ total: string }>;
    };
    const total = parseInt(countResult.rows[0]!.total, 10);

    const dataQuery = `
      SELECT 
        n.id as invitation_id,
        n.user_id as invitee_id,
        n.payload,
        n.created_at,
        u.email as invitee_email,
        up.profile_data
      FROM "${config.DB_SCHEMA}".notifications n
      INNER JOIN "${config.DB_SCHEMA}".users u ON n.user_id = u.id
      LEFT JOIN "${config.DB_SCHEMA}".user_profiles up ON u.id = up.user_id
      WHERE n.type = 'business_profile_invitation'
        AND n.payload->>'profileId' = $1
        ${statusFilter}
      ORDER BY n.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    queryParams.push(limit, offset);
    const dataResult = await database.query(dataQuery, queryParams) as {
      rows: Array<{
        invitation_id: string;
        invitee_id: string;
        invitee_email: string;
        payload: any;
        created_at: Date;
        profile_data?: any;
      }>;
    };

    const invitations = dataResult.rows.map((row) => {
      const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
      const profileData = row.profile_data || {};
      const firstName = profileData.personal_information?.first_name || profileData.first_name || '';
      const lastName = profileData.personal_information?.last_name || profileData.last_name || '';
      const name = `${firstName} ${lastName}`.trim() || row.invitee_email;
      const avatar = profileData.avatar?.fileUrl || profileData.profilePicture || profileData.profile_picture || undefined;

      return {
        invitationId: row.invitation_id,
        inviteeId: row.invitee_id,
        inviteeEmail: row.invitee_email,
        inviteeName: name,
        inviteeAvatar: avatar,
        role: payload.role,
        status: payload.status,
        createdAt: row.created_at.toISOString(),
      };
    });

    const summaryQuery = `
      SELECT 
        payload->>'status' as status,
        COUNT(*) as count
      FROM "${config.DB_SCHEMA}".notifications
      WHERE type = 'business_profile_invitation'
        AND payload->>'profileId' = $1
      GROUP BY payload->>'status'
    `;

    const summaryResult = await database.query(summaryQuery, [profileId]) as {
      rows: Array<{ status: string; count: string }>;
    };

    const summary: Record<string, number> = {
      pending: 0,
      accepted: 0,
      declined: 0,
      cancelled: 0,
    };

    summaryResult.rows.forEach((row) => {
      if (row.status && summary.hasOwnProperty(row.status)) {
        summary[row.status] = parseInt(row.count, 10);
      }
    });

    const totalPages = Math.ceil(total / limit);

    return {
      invitations,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      summary,
    };
  }
}

export const businessProfileService = new BusinessProfileService();
export default businessProfileService;
