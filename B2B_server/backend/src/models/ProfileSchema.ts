export interface ProfileSchema {
  id: string;
  role: string;
  field_name: string;
  field_type: 'text' | 'number' | 'boolean' | 'date' | 'email' | 'url' | 'json' | 'array';
  required: boolean;
  rules: ValidationRules;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface ValidationRules {
  min_length?: number;
  max_length?: number;
  min?: number;
  max?: number;
  pattern?: string;
  format?: string;
  values?: string[];
  default?: any;
  unique?: boolean;
  immutable?: boolean;
  no_future?: boolean;
  after?: string;
  after_birth_plus_14?: boolean;
  max_instances?: number;
  max_count?: number;
  max_items?: number;
  allow_html?: boolean;
  message?: string;
}

export interface SchemaValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}
