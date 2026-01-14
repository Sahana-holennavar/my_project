import { z } from 'zod'
import type { UserType } from '@/types/auth'

// Base validation schemas
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email format')

export const phoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .regex(/^\+?[1-9]\d{1,14}$/, 'Phone number must be in international format (e.g., +919876543211 or 919876543211)')

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number')

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must not exceed 100 characters')

// Profile data schemas
export const baseProfileSchema = z.object({
  projects: z.string().optional(),
  experience: z.string().optional(),
})

export const companyProfileSchema = baseProfileSchema.extend({
  company_name: z.string().min(1, 'Company name is required'),
  industry: z.string().min(1, 'Industry is required'),
  company_size: z.string().min(1, 'Company size is required'),
})

export const professionalProfileSchema = baseProfileSchema.extend({
  job_title: z.string().min(1, 'Job title is required'),
  company: z.string().min(1, 'Company is required'),
  years_experience: z.number().min(0, 'Years of experience must be 0 or more'),
})

export const studentProfileSchema = baseProfileSchema.extend({
  university: z.string().min(1, 'University is required'),
  degree: z.string().min(1, 'Degree is required'),
  field_of_study: z.string().min(1, 'Field of study is required'),
  graduation_year: z.string().min(1, 'Graduation year is required'),
  gpa: z.number().min(0).max(4).optional(),
})

// Account creation schema
export const accountSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
})

// Dynamic profile schema based on user type
export const getProfileSchema = (userType: UserType) => {
  switch (userType) {
    case 'company':
      return companyProfileSchema
    case 'professional':
      return professionalProfileSchema
    case 'student':
      return studentProfileSchema
    default:
      return z.object({})
  }
}

// Complete registration schema
export const createRegisterSchema = (userType: UserType) => {
  return z.object({
    user_type: z.literal(userType),
    name: nameSchema,
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    profile_data: getProfileSchema(userType),
  })
}

// Login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

// Updated login schema with remember_me (required boolean)
export const loginSchemaWithRemember = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  remember_me: z.boolean(),
})

// Form validation helpers
export const validateAccountData = (data: unknown) => {
  return accountSchema.safeParse(data)
}

export const validateProfileData = (data: unknown, userType: UserType) => {
  const schema = getProfileSchema(userType)
  return schema.safeParse(data)
}

export const validateRegisterData = (data: unknown, userType: UserType) => {
  const schema = createRegisterSchema(userType)
  return schema.safeParse(data)
}

// Login validation helper
export const validateLoginData = (data: unknown) => {
  return loginSchemaWithRemember.safeParse(data)
}
