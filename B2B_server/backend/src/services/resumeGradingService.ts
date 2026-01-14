import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env';
import { ParsedResumeData } from './resumeParseService';

export interface GradingScores {
  overall: number;
  ats: number;
  keyword: number;
  format: number;
  experience?: number;
}

export interface GradingSuggestion {
  id: string;
  title: string;
  description: string;
  example?: string;
  category: string;
  priority: number;
  status?: string;
}

export interface GradingResult {
  scores: GradingScores;
  reviewText: string;
  suggestions: GradingSuggestion[];
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildPrompt(parsedResumeData: ParsedResumeData, jobDescription: string, jobTitle?: string): string {
  const resumeSummary = {
    personalInfo: parsedResumeData.personalInfo || {},
    experience: parsedResumeData.experience || [],
    education: parsedResumeData.education || [],
    skills: parsedResumeData.skills || [],
    projects: parsedResumeData.projects || [],
    certifications: parsedResumeData.certifications || [],
    rawText: parsedResumeData.rawText?.substring(0, 2000) || ''
  };

  return `You are an expert resume evaluator. Analyze the following resume against the job description and provide a comprehensive evaluation.

JOB TITLE: ${jobTitle || 'Not specified'}

JOB DESCRIPTION:
${jobDescription}

RESUME DATA:
${JSON.stringify(resumeSummary, null, 2)}

Please provide a detailed evaluation in the following EXACT JSON format (no markdown, no code blocks, just valid JSON):

{
  "scores": {
    "overall": <number 0-100>,
    "ats": <number 0-100>,
    "keyword": <number 0-100>,
    "format": <number 0-100>,
    "experience": <number 0-100>
  },
  "reviewText": "<long multi-paragraph review explaining strengths, weaknesses, and how well the resume matches the role. Be specific and actionable. Minimum 3 paragraphs.>",
  "suggestions": [
    {
      "id": "s_001",
      "title": "<suggestion title>",
      "description": "<detailed description of the suggestion>",
      "example": "<optional example of how to implement>",
      "category": "<achievements|keywords|format|experience|skills|education>",
      "priority": <1-5 where 1 is highest>,
      "status": "pending"
    }
  ]
}

IMPORTANT:
- Return ONLY valid JSON, no additional text
- Scores must be integers between 0-100
- Provide 4-10 suggestions
- reviewText must be at least 500 characters
- Ensure all required fields are present
- Use proper JSON escaping for strings`;
}

function validateGradingResult(data: any): data is GradingResult {
  if (!data || typeof data !== 'object') return false;
  
  if (!data.scores || typeof data.scores !== 'object') return false;
  const scores = data.scores;
  if (typeof scores.overall !== 'number' || scores.overall < 0 || scores.overall > 100) return false;
  if (typeof scores.ats !== 'number' || scores.ats < 0 || scores.ats > 100) return false;
  if (typeof scores.keyword !== 'number' || scores.keyword < 0 || scores.keyword > 100) return false;
  if (typeof scores.format !== 'number' || scores.format < 0 || scores.format > 100) return false;
  
  if (!data.reviewText || typeof data.reviewText !== 'string' || data.reviewText.length < 100) return false;
  
  if (!Array.isArray(data.suggestions)) return false;
  for (const suggestion of data.suggestions) {
    if (!suggestion.id || !suggestion.title || !suggestion.description || 
        !suggestion.category || typeof suggestion.priority !== 'number') {
      return false;
    }
  }
  
  return true;
}

function normalizeScores(scores: any): GradingScores {
  const normalized: GradingScores = {
    overall: Math.round(Math.max(0, Math.min(100, scores.overall || 0))),
    ats: Math.round(Math.max(0, Math.min(100, scores.ats || 0))),
    keyword: Math.round(Math.max(0, Math.min(100, scores.keyword || 0))),
    format: Math.round(Math.max(0, Math.min(100, scores.format || 0)))
  };
  if (scores.experience !== undefined && scores.experience !== null) {
    normalized.experience = Math.round(Math.max(0, Math.min(100, scores.experience)));
  }
  return normalized;
}

function normalizeSuggestions(suggestions: any[]): GradingSuggestion[] {
  return suggestions.map((s, index) => ({
    id: s.id || `s_${String(index + 1).padStart(3, '0')}`,
    title: s.title || 'Improvement suggestion',
    description: s.description || '',
    example: s.example,
    category: s.category || 'general',
    priority: typeof s.priority === 'number' ? Math.max(1, Math.min(5, s.priority)) : 3,
    status: s.status || 'pending'
  }));
}

/**
 * Helper function to list available models (for debugging)
 */
async function listAvailableModels(apiKey: string): Promise<string[]> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
    if (!response.ok) {
      console.warn('[listAvailableModels] Failed to fetch models list');
      return [];
    }
    const data = await response.json() as { models?: Array<{ name?: string }> };
    const models = (data.models?.map((m: { name?: string }) => m.name?.replace('models/', '') || m.name) || [])
      .filter((name): name is string => typeof name === 'string' && name.length > 0);
    return models;
  } catch (error) {
    console.warn('[listAvailableModels] Error listing models:', error);
    return [];
  }
}

export async function gradeResumeWithGeminiEmbeddingGapAnalysis(
  parsedResumeData: ParsedResumeData,
  jobDescription: string,
  jobTitle?: string
): Promise<GradingResult> {
  if (!config.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  if (!parsedResumeData || !jobDescription) {
    throw new Error('parsedResumeData and jobDescription are required');
  }

  const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  const modelNames = [
    'gemini-2.5-flash-lite', // Lightweight - works with free tier (proven to work)
    'gemini-2.0-flash-lite', // Alternative lite option
    'gemini-2.0-flash-lite-001', // Specific lite version
    'gemini-2.5-flash',      // Fast and efficient (may be overloaded)
    'gemini-2.0-flash',      // Alternative flash model
    'gemini-2.0-flash-001',  // Specific version
    'gemini-2.5-pro',        // Most capable (quota limited on free tier)
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-pro'
  ];

  const prompt = buildPrompt(parsedResumeData, jobDescription, jobTitle);

  let lastError: Error | null = null;
  let lastModelName: string = '';

  // Try each model name
  for (const modelName of modelNames) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      lastModelName = modelName;

      // Retry logic for each model
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();

          let jsonText = text.trim();
          
          if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }

          let parsedData: any;
          try {
            parsedData = JSON.parse(jsonText);
          } catch (parseError) {
            throw new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
          }

          if (!validateGradingResult(parsedData)) {
            throw new Error('Response does not match expected structure');
          }

          const normalizedResult: GradingResult = {
            scores: normalizeScores(parsedData.scores),
            reviewText: parsedData.reviewText.trim(),
            suggestions: normalizeSuggestions(parsedData.suggestions)
          };

          return normalizedResult;

        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          const errorMsg = lastError.message;
          
          // If it's a 404 error (model not found), try next model immediately
          if (errorMsg.includes('404') && errorMsg.includes('not found')) {
            console.warn(`[gradeResume] Model ${modelName} not found, trying next model...`);
            break; // Break out of retry loop, try next model
          }
          
          // If it's a 429 error (quota exceeded), skip this model immediately
          if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('Quota exceeded')) {
            console.warn(`[gradeResume] Model ${modelName} quota exceeded, trying next model...`);
            break; // Break out of retry loop, try next model
          }
          
          // If it's a 503 error (overloaded), retry with backoff
          if (errorMsg.includes('503') || errorMsg.includes('overloaded')) {
            if (attempt < MAX_RETRIES) {
              const delay = RETRY_DELAY_MS * attempt;
              console.warn(`[gradeResume] Model ${modelName} overloaded (attempt ${attempt}), retrying in ${delay}ms...`);
              await sleep(delay);
            }
            continue;
          }
          
          // For other errors, retry with backoff
          if (attempt < MAX_RETRIES) {
            const delay = RETRY_DELAY_MS * attempt;
            console.warn(`[gradeResume] Attempt ${attempt} failed with model ${modelName}, retrying in ${delay}ms...`, lastError.message);
            await sleep(delay);
          }
        }
      }
    } catch (error) {
      // If model initialization fails, try next model
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      if (errorMsg.includes('404') || errorMsg.includes('not found')) {
        console.warn(`[gradeResume] Model ${modelName} not available, trying next model...`);
        continue;
      }
      lastError = error instanceof Error ? error : new Error('Unknown error');
    }
  }

  throw new Error(`Failed to grade resume after trying ${modelNames.length} models: ${lastError?.message || 'Unknown error'}. Last attempted model: ${lastModelName || 'none'}`);
}

