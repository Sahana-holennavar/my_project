import Joi from 'joi';
import type { NotificationPayload, B2BPayload } from '../types/notification.types';
import type { 
  LikeInteractionRequest, 
  DislikeInteractionRequest, 
  CommentInteractionRequest, 
  ReplyInteractionRequest, 
  ShareInteractionRequest, 
  SaveInteractionRequest, 
  UnsaveInteractionRequest, 
  ReportInteractionRequest 
} from '../models/Interaction';

export function validateNotificationJob(payload: NotificationPayload) {
  const schema = Joi.object({
    userId: Joi.string().required(),
    content: Joi.string().required().max(1000),
    type: Joi.string().required(),
    senderId: Joi.string().required(),
    companyId: Joi.string().optional(),
    recipientId: Joi.string().optional(),
    correlationId: Joi.string().optional(),
    // Add more fields as needed
  });
  return schema.validate(payload, { abortEarly: false });
}

export function validateB2BPayload(payload: B2BPayload) {
  const schema = Joi.object({
    senderId: Joi.string().required(),
    companyId: Joi.string().required(),
    recipientId: Joi.string().required(),
    recipientCompanyId: Joi.string().required(),
    type: Joi.string().required(),
    // Add more B2B-specific rules as needed
  });
  return schema.validate(payload, { abortEarly: false });
}

// Interaction validation schemas
export function validateLikeInteraction(payload: LikeInteractionRequest) {
  const schema = Joi.object({
    post_id: Joi.string().uuid().required().messages({
      'string.uuid': 'Post ID must be a valid UUID',
      'any.required': 'Post ID is required'
    })
  });
  return schema.validate(payload, { abortEarly: false });
}

export function validateDislikeInteraction(payload: DislikeInteractionRequest) {
  const schema = Joi.object({
    post_id: Joi.string().uuid().required().messages({
      'string.uuid': 'Post ID must be a valid UUID',
      'any.required': 'Post ID is required'
    })
  });
  return schema.validate(payload, { abortEarly: false });
}

export function validateCommentInteraction(payload: CommentInteractionRequest) {
  const schema = Joi.object({
    post_id: Joi.string().uuid().required().messages({
      'string.uuid': 'Post ID must be a valid UUID',
      'any.required': 'Post ID is required'
    }),
    comment_text: Joi.string().min(1).max(1000).required().messages({
      'string.min': 'Comment text is required and cannot be empty',
      'string.max': 'Comment text cannot exceed 1000 characters',
      'any.required': 'Comment text is required'
    })
  });
  return schema.validate(payload, { abortEarly: false });
}

export function validateReplyInteraction(payload: ReplyInteractionRequest) {
  const schema = Joi.object({
    post_id: Joi.string().uuid().required().messages({
      'string.uuid': 'Post ID must be a valid UUID',
      'any.required': 'Post ID is required'
    }),
    comment_id: Joi.string().uuid().required().messages({
      'string.uuid': 'Comment ID must be a valid UUID',
      'any.required': 'Comment ID is required'
    }),
    reply_text: Joi.string().min(1).max(1000).required().messages({
      'string.min': 'Reply text is required and cannot be empty',
      'string.max': 'Reply text cannot exceed 1000 characters',
      'any.required': 'Reply text is required'
    })
  });
  return schema.validate(payload, { abortEarly: false });
}

export function validateShareInteraction(payload: ShareInteractionRequest) {
  const schema = Joi.object({
    post_id: Joi.string().uuid().required().messages({
      'string.uuid': 'Post ID must be a valid UUID',
      'any.required': 'Post ID is required'
    }),
    share_userid: Joi.string().uuid().required().messages({
      'string.uuid': 'Share user ID must be a valid UUID',
      'any.required': 'Share user ID is required'
    })
  });
  return schema.validate(payload, { abortEarly: false });
}

export function validateSaveInteraction(payload: SaveInteractionRequest) {
  const schema = Joi.object({
    post_id: Joi.string().uuid().required().messages({
      'string.uuid': 'Post ID must be a valid UUID',
      'any.required': 'Post ID is required'
    })
  });
  return schema.validate(payload, { abortEarly: false });
}

export function validateUnsaveInteraction(payload: UnsaveInteractionRequest) {
  const schema = Joi.object({
    post_id: Joi.string().uuid().required().messages({
      'string.uuid': 'Post ID must be a valid UUID',
      'any.required': 'Post ID is required'
    })
  });
  return schema.validate(payload, { abortEarly: false });
}

export function validateReportInteraction(payload: ReportInteractionRequest) {
  const schema = Joi.object({
    post_id: Joi.string().uuid().required().messages({
      'string.uuid': 'Post ID must be a valid UUID',
      'any.required': 'Post ID is required'
    }),
    reason: Joi.string().min(1).max(500).required().messages({
      'string.min': 'Report reason is required and cannot be empty',
      'string.max': 'Report reason cannot exceed 500 characters',
      'any.required': 'Report reason is required'
    })
  });
  return schema.validate(payload, { abortEarly: false });
}

// Generic UUID validation
export function validateUUID(uuid: string, fieldName: string = 'ID') {
  const schema = Joi.string().uuid().required().messages({
    'string.uuid': `${fieldName} must be a valid UUID`,
    'any.required': `${fieldName} is required`
  });
  return schema.validate(uuid);
}

export function validateCreateJob(payload: any) {
  const schema = Joi.object({
    title: Joi.string().min(1).max(255).required().messages({
      'string.min': 'Title is required and cannot be empty',
      'string.max': 'Title cannot exceed 255 characters',
      'any.required': 'Title is required'
    }),
    job_description: Joi.string().min(1).required().messages({
      'string.min': 'Job description is required and cannot be empty',
      'any.required': 'Job description is required'
    }),
    employment_type: Joi.string().valid('full_time', 'part_time').required().messages({
      'any.only': 'Employment type must be either "full_time" or "part_time"',
      'any.required': 'Employment type is required'
    }),
    skills: Joi.array().items(Joi.string()).optional(),
    status: Joi.string().valid('active', 'inactive', 'closed').optional().default('active'),
    job_mode: Joi.string().valid('onsite', 'remote', 'hybrid').optional(),
    location: Joi.object({
      city: Joi.string().optional(),
      state: Joi.string().optional(),
      country: Joi.string().optional()
    }).optional(),
    experience_level: Joi.object({
      min: Joi.number().integer().min(0).optional(),
      max: Joi.number().integer().min(0).optional()
    }).or('min', 'max').optional()
  });
  return schema.validate(payload, { abortEarly: false });
}

export function validateUpdateJob(payload: any) {
  const schema = Joi.object({
    title: Joi.string().min(1).max(255).optional().messages({
      'string.min': 'Title cannot be empty',
      'string.max': 'Title cannot exceed 255 characters'
    }),
    job_description: Joi.string().min(1).optional().messages({
      'string.min': 'Job description cannot be empty'
    }),
    employment_type: Joi.string().valid('full_time', 'part_time').optional().messages({
      'any.only': 'Employment type must be either "full_time" or "part_time"'
    }),
    skills: Joi.array().items(Joi.string()).optional(),
    status: Joi.string().valid('active', 'inactive', 'closed').optional(),
    job_mode: Joi.string().valid('onsite', 'remote', 'hybrid').optional(),
    location: Joi.object({
      city: Joi.string().optional(),
      state: Joi.string().optional(),
      country: Joi.string().optional()
    }).optional(),
    experience_level: Joi.object({
      min: Joi.number().integer().min(0).optional(),
      max: Joi.number().integer().min(0).optional()
    }).optional()
  });
  return schema.validate(payload, { abortEarly: false });
}


// Contest validators
export function validateCreateContest(payload: any) {
  const schema = Joi.object({
    title: Joi.string().min(1).max(255).required().messages({
      'string.min': 'Title is required and cannot be empty',
      'string.max': 'Title cannot exceed 255 characters',
      'any.required': 'Title is required'
    }),
    description: Joi.string().min(1).max(2000).required().messages({
      'string.min': 'Description is required and cannot be empty',
      'string.max': 'Description cannot exceed 2000 characters',
      'any.required': 'Description is required'
    }),
    problem_statement: Joi.string().min(1).required().messages({
      'string.min': 'Problem statement is required and cannot be empty',
      'any.required': 'Problem statement is required'
    }),
    status: Joi.string().valid('draft', 'active', 'completed', 'cancelled').optional().default('draft').messages({
      'any.only': 'Status must be one of: draft, active, completed, cancelled'
    }),
    start_time: Joi.date().iso().optional().allow(null).messages({
      'date.base': 'Start time must be a valid ISO date',
      'date.format': 'Start time must be in ISO format'
    }),
    end_time: Joi.date().iso().optional().allow(null).messages({
      'date.base': 'End time must be a valid ISO date',
      'date.format': 'End time must be in ISO format'
    })
  });
  return schema.validate(payload, { abortEarly: false });
}
      export function validateApplicationData(payload: any) {
  const schema = Joi.object({
    full_name: Joi.string().min(1).max(255).required().messages({
      'string.min': 'Full name is required and cannot be empty',
      'string.max': 'Full name cannot exceed 255 characters',
      'any.required': 'Full name is required'
    }),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required().messages({
      'string.pattern.base': 'Phone number must be in international format (e.g., +1234567890 or 1234567890)',
      'any.required': 'Phone number is required'
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Email must be a valid email address',
      'any.required': 'Email is required'
    }),
    address: Joi.string().min(1).max(500).required().messages({
      'string.min': 'Address is required and cannot be empty',
      'string.max': 'Address cannot exceed 500 characters',
      'any.required': 'Address is required'
    })
  });
  return schema.validate(payload, { abortEarly: false });
}

export function validateUpdateContest(payload: any) {
  const schema = Joi.object({
    title: Joi.string().min(1).max(255).optional().messages({
      'string.min': 'Title cannot be empty',
      'string.max': 'Title cannot exceed 255 characters'
    }),
    description: Joi.string().min(1).max(2000).optional().messages({
      'string.min': 'Description cannot be empty',
      'string.max': 'Description cannot exceed 2000 characters'
    }),
    problem_statement: Joi.string().min(1).optional().messages({
      'string.min': 'Problem statement cannot be empty'
    }),
    status: Joi.string().valid('draft', 'active', 'completed', 'cancelled').optional().messages({
      'any.only': 'Status must be one of: draft, active, completed, cancelled'
    }),
    start_time: Joi.date().iso().optional().allow(null).messages({
      'date.base': 'Start time must be a valid ISO date',
      'date.format': 'Start time must be in ISO format'
    }),
    end_time: Joi.date().iso().optional().allow(null).messages({
      'date.base': 'End time must be a valid ISO date',
      'date.format': 'End time must be in ISO format'
    })
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  });
  return schema.validate(payload, { abortEarly: false });
}
    export function validateUpdateApplicationData(payload: any) {
  const schema = Joi.object({
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional().messages({
      'string.pattern.base': 'Phone number must be in international format (e.g., +1234567890 or 1234567890)'
    }),
    email: Joi.string().email().optional().messages({
      'string.email': 'Invalid email format'
    }),
    resume: Joi.string().optional()
  });
  return schema.validate(payload, { abortEarly: false });
}

export function validateStartContest(payload: any) {
  const schema = Joi.object({
    start_time: Joi.date().iso().required().messages({
      'date.base': 'Start time must be a valid ISO date',
      'date.format': 'Start time must be in ISO format',
      'any.required': 'Start time is required'
    }),
    end_time: Joi.date().iso().greater(Joi.ref('start_time')).required().messages({
      'date.base': 'End time must be a valid ISO date',
      'date.format': 'End time must be in ISO format',
      'date.greater': 'End time must be after start time',
      'any.required': 'End time is required'
    })
  });
  return schema.validate(payload, { abortEarly: false });
}

export function validateSelectWinner(payload: any) {
  const schema = Joi.object({
    submission_id: Joi.string().uuid().required().messages({
      'string.uuid': 'Submission ID must be a valid UUID',
      'any.required': 'Submission ID is required'
    })
  });
  return schema.validate(payload, { abortEarly: false });
}

export function validateRegisterContest(payload: any) {
  const schema = Joi.object({
    firstName: Joi.string().min(1).max(100).optional().messages({
      'string.min': 'First name cannot be empty',
      'string.max': 'First name cannot exceed 100 characters'
    }),
    lastName: Joi.string().min(1).max(100).optional().messages({
      'string.min': 'Last name cannot be empty',
      'string.max': 'Last name cannot exceed 100 characters'
    }),
    phoneNumber: Joi.string().pattern(/^[0-9]{10,15}$/).optional().messages({
      'string.pattern.base': 'Phone number must be between 10-15 digits'
    })
  });
  return schema.validate(payload, { abortEarly: false });
}
  export function validateApplicationStatusUpdate(payload: any) {
  const schema = Joi.object({
    status: Joi.string().valid('selected', 'rejected').required().messages({
      'any.only': 'Status must be either "selected" or "rejected"',
      'any.required': 'Status is required'
    })
    });
  return schema.validate(payload, { abortEarly: false });
}