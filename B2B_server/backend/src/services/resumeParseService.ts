import { extractTextFromFile } from '../utils/resumeTextExtractor';
import { validateResumeUploadFile } from '../utils/resumeUploadUtils';

export interface ParsedResumeData {
  personalInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  experience?: Array<{
    company?: string;
    position?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    location?: string;
  }>;
  education?: Array<{
    institution?: string;
    degree?: string;
    field?: string;
    startDate?: string;
    endDate?: string;
    gpa?: string;
  }>;
  skills?: string[];
  projects?: Array<{
    name?: string;
    description?: string;
    technologies?: string[];
    startDate?: string;
    endDate?: string;
  }>;
  certifications?: Array<{
    name?: string;
    issuer?: string;
    date?: string;
    expiryDate?: string;
  }>;
  awards?: Array<{
    name?: string;
    issuer?: string;
    date?: string;
    description?: string;
  }>;
  languages?: Array<{
    language?: string;
    proficiency?: string;
  }>;
  rawText?: string;
}

export interface ParseResumeResult {
  success: boolean;
  parsedData?: ParsedResumeData;
  error?: string;
}

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+?\d{1,3}[-.\s]?\d{1,14}/g;
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/gi;
const DATE_REGEX = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}\b/gi;

const extractPersonalInfo = (text: string): ParsedResumeData['personalInfo'] => {
  const personalInfo: ParsedResumeData['personalInfo'] = {};
  
  const emails = text.match(EMAIL_REGEX);
  if (emails && emails.length > 0) {
    personalInfo.email = emails[0];
  }
  
  const phones = text.match(PHONE_REGEX);
  if (phones && phones.length > 0) {
    personalInfo.phone = phones[0].trim();
  }
  
  const urls = text.match(URL_REGEX);
  if (urls) {
    urls.forEach(url => {
      const lowerUrl = url.toLowerCase();
      if (lowerUrl.includes('linkedin.com')) {
        personalInfo.linkedin = url;
      } else if (lowerUrl.includes('github.com')) {
        personalInfo.github = url;
      } else if (!personalInfo.website && (lowerUrl.includes('http') || lowerUrl.includes('www'))) {
        personalInfo.website = url;
      }
    });
  }
  
  const lines = text.split('\n').slice(0, 5);
  for (const line of lines) {
    const cleanLine = line.trim();
    if (cleanLine && !cleanLine.match(EMAIL_REGEX) && !cleanLine.match(PHONE_REGEX) && !cleanLine.match(URL_REGEX)) {
      if (!personalInfo.name && cleanLine.length > 2 && cleanLine.length < 50) {
        personalInfo.name = cleanLine;
        break;
      }
    }
  }
  
  const addressPattern = /\d+\s+[A-Za-z0-9\s,]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl)[^,\n]*(?:,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5})?/gi;
  const addresses = text.match(addressPattern);
  if (addresses && addresses.length > 0) {
    personalInfo.address = addresses[0].trim();
  }
  
  return personalInfo;
};

const extractExperience = (text: string): ParsedResumeData['experience'] => {
  const experience: ParsedResumeData['experience'] = [];
  const experienceKeywords = ['experience', 'work history', 'employment', 'professional experience', 'career'];
  const sectionPattern = new RegExp(`(${experienceKeywords.join('|')})[\\s\\S]*?(?=(education|skills|projects|certifications|awards|$))`, 'i');
  const experienceSection = text.match(sectionPattern);
  
  if (!experienceSection) return experience;
  
  const expText = experienceSection[0];
  const companyPattern = /([A-Z][A-Za-z0-9\s&.,-]+(?:Inc|LLC|Ltd|Corp|Corporation|Company|Co|Group|Solutions|Systems|Technologies|Tech)?)/g;
  const positionPattern = /(?:^|\n)\s*([A-Z][A-Za-z\s&/]+(?:Engineer|Developer|Manager|Director|Analyst|Specialist|Consultant|Lead|Senior|Junior|Intern|Associate|Executive|Officer|Coordinator|Assistant|Architect|Designer|Administrator|Consultant))/gm;
  
  const companies = expText.match(companyPattern);
  const positions = expText.match(positionPattern);
  
  const dateMatches = expText.match(DATE_REGEX);
  const dates = dateMatches ? dateMatches.slice(0, 10) : [];
  
  if (companies && companies.length > 0) {
    companies.slice(0, 10).forEach((company, index) => {
      const exp: any = {
        company: company.trim(),
      };
      
      if (positions && positions[index]) {
        exp.position = positions[index].trim().replace(/^\s*/, '');
      }
      
      if (dates.length >= index * 2) {
        exp.startDate = dates[index * 2];
        if (dates[index * 2 + 1]) {
          exp.endDate = dates[index * 2 + 1];
        } else {
          exp.endDate = 'Present';
        }
      }
      
      experience.push(exp);
    });
  }
  
  return experience.length > 0 ? experience : undefined;
};

const extractEducation = (text: string): ParsedResumeData['education'] => {
  const education: ParsedResumeData['education'] = [];
  const educationKeywords = ['education', 'academic', 'qualifications', 'university', 'college', 'degree'];
  const sectionPattern = new RegExp(`(${educationKeywords.join('|')})[\\s\\S]*?(?=(experience|skills|projects|certifications|awards|$))`, 'i');
  const educationSection = text.match(sectionPattern);
  
  if (!educationSection) return education;
  
  const eduText = educationSection[0];
  const institutionPattern = /([A-Z][A-Za-z0-9\s&.,-]+(?:University|College|Institute|School|Academy|Univ|Coll))/gi;
  const degreePattern = /(Bachelor|Master|PhD|Doctorate|Associate|Diploma|Certificate|B\.?S\.?|B\.?A\.?|M\.?S\.?|M\.?A\.?|M\.?B\.?A\.?|Ph\.?D\.?)[\s\w]*/gi;
  
  const institutions = eduText.match(institutionPattern);
  const degrees = eduText.match(degreePattern);
  const dates = eduText.match(DATE_REGEX);
  
  if (institutions && institutions.length > 0) {
    institutions.slice(0, 10).forEach((institution, index) => {
      const edu: any = {
        institution: institution.trim(),
      };
      
      if (degrees && degrees[index]) {
        const degreeMatch = degrees[index].match(/([\w\s]+)/);
        if (degreeMatch) {
          edu.degree = degreeMatch[0].trim();
        }
      }
      
      if (dates && dates.length >= index * 2) {
        edu.startDate = dates[index * 2];
        if (dates[index * 2 + 1]) {
          edu.endDate = dates[index * 2 + 1];
        }
      }
      
      education.push(edu);
    });
  }
  
  return education.length > 0 ? education : undefined;
};

const extractSkills = (text: string): string[] => {
  const skills: string[] = [];
  const skillKeywords = ['skills', 'technical skills', 'competencies', 'expertise', 'proficiencies'];
  const sectionPattern = new RegExp(`(${skillKeywords.join('|')})[\\s\\S]*?(?=(experience|education|projects|certifications|awards|$))`, 'i');
  const skillsSection = text.match(sectionPattern);
  
  if (!skillsSection) return skills;
  
  const skillsText = skillsSection[0];
  const commonSkills = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust',
    'React', 'Angular', 'Vue', 'Node.js', 'Express', 'Django', 'Flask', 'Spring', 'Laravel',
    'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Git', 'CI/CD',
    'HTML', 'CSS', 'SASS', 'Bootstrap', 'Tailwind', 'REST API', 'GraphQL',
    'Machine Learning', 'AI', 'Data Science', 'Blockchain', 'DevOps'
  ];
  
  commonSkills.forEach(skill => {
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(skillsText)) {
      skills.push(skill);
    }
  });
  
  const skillListPattern = /[•\-\*]\s*([A-Za-z0-9\s+#.]+)/g;
  const skillMatches = skillsText.match(skillListPattern);
  if (skillMatches) {
    skillMatches.forEach(match => {
      const skill = match.replace(/[•\-\*]\s*/, '').trim();
      if (skill.length > 2 && skill.length < 50 && !skills.includes(skill)) {
        skills.push(skill);
      }
    });
  }
  
  return skills;
};

const extractProjects = (text: string): ParsedResumeData['projects'] => {
  const projects: ParsedResumeData['projects'] = [];
  const projectKeywords = ['projects', 'portfolio', 'personal projects'];
  const sectionPattern = new RegExp(`(${projectKeywords.join('|')})[\\s\\S]*?(?=(experience|education|skills|certifications|awards|$))`, 'i');
  const projectsSection = text.match(sectionPattern);
  
  if (!projectsSection) return projects;
  
  const projText = projectsSection[0];
  const projectNamePattern = /(?:^|\n)\s*([A-Z][A-Za-z0-9\s-]+)(?:\s*[-–—]\s*|:)/gm;
  const projectMatches = projText.match(projectNamePattern);
  
  if (projectMatches) {
    projectMatches.slice(0, 10).forEach(match => {
      const name = match.replace(/[-–—:]/, '').trim();
      if (name.length > 3) {
        projects.push({
          name: name,
        });
      }
    });
  }
  
  return projects.length > 0 ? projects : undefined;
};

const extractCertifications = (text: string): ParsedResumeData['certifications'] => {
  const certifications: ParsedResumeData['certifications'] = [];
  const certKeywords = ['certifications', 'certificates', 'credentials', 'licenses'];
  const sectionPattern = new RegExp(`(${certKeywords.join('|')})[\\s\\S]*?(?=(experience|education|skills|projects|awards|$))`, 'i');
  const certSection = text.match(sectionPattern);
  
  if (!certSection) return certifications;
  
  const certText = certSection[0];
  const certPattern = /([A-Z][A-Za-z0-9\s-]+(?:Certified|Certificate|Certification|License|AWS|Azure|Google|Microsoft|Oracle|Cisco))/gi;
  const certMatches = certText.match(certPattern);
  
  if (certMatches) {
    certMatches.slice(0, 10).forEach(match => {
      certifications.push({
        name: match.trim(),
      });
    });
  }
  
  return certifications.length > 0 ? certifications : undefined;
};

const extractAwards = (text: string): ParsedResumeData['awards'] => {
  const awards: ParsedResumeData['awards'] = [];
  const awardKeywords = ['awards', 'honors', 'achievements', 'recognition'];
  const sectionPattern = new RegExp(`(${awardKeywords.join('|')})[\\s\\S]*?(?=(experience|education|skills|projects|certifications|$))`, 'i');
  const awardSection = text.match(sectionPattern);
  
  if (!awardSection) return awards;
  
  const awardText = awardSection[0];
  const awardPattern = /([A-Z][A-Za-z0-9\s-]+(?:Award|Prize|Recognition|Honor|Achievement))/gi;
  const awardMatches = awardText.match(awardPattern);
  
  if (awardMatches) {
    awardMatches.slice(0, 10).forEach(match => {
      awards.push({
        name: match.trim(),
      });
    });
  }
  
  return awards.length > 0 ? awards : undefined;
};

export const parseResume = async (
  fileBuffer: Buffer,
  fileType: string,
  ocrText?: string
): Promise<ParseResumeResult> => {
  try {
    if (!fileBuffer || fileBuffer.length === 0) {
      return {
        success: false,
        error: 'File buffer is empty or invalid',
      };
    }
    
    const normalizedType = fileType.toLowerCase().replace('.', '');
    const parsableTypes = ['pdf', 'docx', 'doc', 'txt'];
    const imageTypes = ['jpg', 'jpeg', 'png'];
    
    if (imageTypes.includes(normalizedType) && !ocrText) {
      return {
        success: false,
        error: 'Non-parsable file type requires OCR text',
      };
    }
    
    if (!parsableTypes.includes(normalizedType) && !imageTypes.includes(normalizedType)) {
      return {
        success: false,
        error: `Unsupported file type: ${fileType}`,
      };
    }
    
    const validation = validateResumeUploadFile(fileBuffer, fileType);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error || 'File validation failed',
      };
    }
    
    let extractedText: string;
    
    if (ocrText) {
      extractedText = ocrText;
    } else if (parsableTypes.includes(normalizedType)) {
      extractedText = await extractTextFromFile(fileBuffer, fileType);
    } else {
      return {
        success: false,
        error: 'Cannot parse file without OCR text',
      };
    }
    
    if (!extractedText || extractedText.trim().length === 0) {
      return {
        success: false,
        error: 'No text could be extracted from the file',
      };
    }
    
    const personalInfo = extractPersonalInfo(extractedText);
    const experience = extractExperience(extractedText);
    const education = extractEducation(extractedText);
    const skills = extractSkills(extractedText);
    const projects = extractProjects(extractedText);
    const certifications = extractCertifications(extractedText);
    const awards = extractAwards(extractedText);
    
    const parsedData: ParsedResumeData = {
      rawText: extractedText,
    };
    
    if (personalInfo && Object.keys(personalInfo).length > 0) {
      parsedData.personalInfo = personalInfo;
    }
    if (experience && experience.length > 0) {
      parsedData.experience = experience;
    }
    if (education && education.length > 0) {
      parsedData.education = education;
    }
    if (skills && skills.length > 0) {
      parsedData.skills = skills;
    }
    if (projects && projects.length > 0) {
      parsedData.projects = projects;
    }
    if (certifications && certifications.length > 0) {
      parsedData.certifications = certifications;
    }
    if (awards && awards.length > 0) {
      parsedData.awards = awards;
    }
    
    return {
      success: true,
      parsedData,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred during parsing',
    };
  }
};

