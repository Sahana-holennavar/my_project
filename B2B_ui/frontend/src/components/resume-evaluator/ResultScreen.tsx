import React from 'react';
import { RotateCcw, RefreshCw, Lightbulb, CheckCircle2 } from 'lucide-react';
import type { SuggestionItem } from '@/types/resumeEvaluator';

interface Score {
  label: string;
  value: number;
  badge: string;
}

interface Suggestion {
  id: string;
  title: string;
  description: string;
  example?: string;
  category: 'achievements' | 'keywords' | 'formatting' | 'general' | 'experience' | 'education' | 'format' | 'skills';
  priority: 1 | 2 | 3;
}

interface ResultScreenProps {
  onStartNew?: () => void;
  onReEvaluate?: () => void;
  evaluationResult?: {
    scores: {
      overall: number;
      ats: number;
      keyword: number;
      format: number;
      experience?: number;
    };
    suggestions: SuggestionItem[];
    review: string;
  } | null;
}

const ResultScreen: React.FC<ResultScreenProps> = ({ onStartNew, onReEvaluate, evaluationResult }) => {
  console.log('[ResultScreen] 🎨 Rendering ResultScreen');
  console.log('[ResultScreen] evaluationResult:', evaluationResult);
  console.log('[ResultScreen] Has scores:', !!evaluationResult?.scores);
  console.log('[ResultScreen] Scores values:', evaluationResult?.scores);
  
  const backendScores = evaluationResult?.scores;
  
  // Use backend scores if available, otherwise show dummy data
  const scores = backendScores ? {
    overall: backendScores.overall,
    ats: backendScores.ats,
    keyword: backendScores.keyword,
    format: backendScores.format,
    experience: ('experience' in backendScores && typeof backendScores.experience === 'number') ? backendScores.experience : Math.round(backendScores.overall * 0.9),
  } : {
    overall: 82,
    ats: 91,
    keyword: 78,
    format: 76,
    experience: 74,
  };

  console.log('[ResultScreen] Display scores:', scores);

  const reviewText = evaluationResult?.review || `Your resume demonstrates strong technical expertise with solid experience in full-stack development and cloud infrastructure. The inclusion of specific technologies like Node.js, React, and AWS shows alignment with modern development practices.

However, the resume lacks quantifiable impact metrics in several key achievements. While you mention building and optimizing systems, the specific outcomes in terms of performance improvements, cost savings, or user impact are not explicitly stated. Recruiters and ATS systems heavily weight measurable results and business impact.

Additionally, several high-priority keywords from the job description are missing or underrepresented. Keywords like "CI/CD pipelines," "observability tools," and "database optimization" are mentioned in the target role but not prominently featured in your resume. Strategically placing these terms in your experience section and skills area would significantly improve your ATS score.`;

  const backendSuggestions = evaluationResult?.suggestions || [];
  console.log('[ResultScreen] Backend suggestions:', backendSuggestions);
  console.log('[ResultScreen] Suggestions count:', backendSuggestions.length);
  
  // Backend now sends full SuggestionItem objects with id, title, description, example, category, priority, status
  const suggestions: Suggestion[] = backendSuggestions.length > 0 ? backendSuggestions.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    example: s.example,
    category: (s.category as Suggestion['category']) || 'general',
    priority: (s.priority as Suggestion['priority']) || 2,
  })) : [
    // Dummy suggestions as fallback
    {
      id: 's_001',
      title: 'Quantify cloud and backend impact',
      description: 'Several bullets describe what you built but not the impact. Add metrics such as latency reduction, error-rate improvement, cost savings, or user growth.',
      example: 'Optimized Node.js APIs and caching, reducing p95 latency from 800ms to 230ms and infra cost by ~18%.',
      category: 'achievements',
      priority: 1,
    },
    {
      id: 's_002',
      title: 'Surface missing job-specific keywords',
      description: 'Ensure CI/CD, observability, and DB tools from the JD appear in skills and experience sections.',
      category: 'keywords',
      priority: 2,
    },
    {
      id: 's_003',
      title: 'Add specific tools and frameworks',
      description: 'Replace generic terms like "databases" with specific tech: PostgreSQL, MongoDB, Redis, etc. This improves both ATS matching and recruiter perception.',
      example: 'Led migration from MongoDB to PostgreSQL, improving query performance by 45% and reducing storage costs.',
      category: 'keywords',
      priority: 1,
    },
    {
      id: 's_004',
      title: 'Emphasize team leadership and scale',
      description: 'If you have led teams or projects, highlight team size and scope. Recruiters value demonstrated leadership.',
      example: 'Led backend team of 4 engineers through microservices architecture redesign, handling 10M+ daily requests.',
      category: 'achievements',
      priority: 2,
    },
  ];

  // Utility to get badge based on score
  const getScoreBadge = (score: number): { badge: string; color: string } => {
    if (score >= 85) return { badge: 'Strong', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700' };
    if (score >= 70) return { badge: 'Good', color: 'bg-brand-blue-100 dark:bg-brand-blue-900/30 text-brand-blue-700 dark:text-brand-blue-300 border border-brand-blue-300 dark:border-brand-blue-700' };
    if (score >= 50) return { badge: 'Needs Work', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700' };
    return { badge: 'Critical', color: 'bg-brand-red-100 dark:bg-brand-red-900/30 text-brand-red-700 dark:text-brand-red-300 border border-brand-red-300 dark:border-brand-red-700' };
  };

  // Utility to get category color
  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'achievements':
        return 'bg-brand-purple-100 dark:bg-brand-purple-900/40 text-brand-purple-700 dark:text-brand-purple-300 border-brand-purple-300 dark:border-brand-purple-700';
      case 'keywords':
        return 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700';
      case 'formatting':
        return 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700';
      default:
        return 'bg-brand-gray-200 dark:bg-brand-gray-700/40 text-brand-gray-700 dark:text-brand-gray-300 border-brand-gray-300 dark:border-brand-gray-600';
    }
  };

  // Utility to format priority
  const getPriorityLabel = (priority: number): string => {
    return `P${priority}`;
  };

  const overallBadge = getScoreBadge(scores.overall);
  const scoreCards: Score[] = [
    { label: 'ATS Match', value: scores.ats, badge: getScoreBadge(scores.ats).badge },
    { label: 'Keywords', value: scores.keyword, badge: getScoreBadge(scores.keyword).badge },
    { label: 'Format', value: scores.format, badge: getScoreBadge(scores.format).badge },
    { label: 'Experience', value: scores.experience, badge: getScoreBadge(scores.experience).badge },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-blue-100 via-brand-purple-50 to-brand-pink-100 dark:from-brand-gray-950 dark:via-brand-gray-900 dark:to-brand-gray-950 text-brand-gray-900 dark:text-white p-6 md:p-12 font-sans">
      {/* Scores Summary Section */}
      <div className="max-w-4xl mx-auto mb-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Main Score Card */}
          <div className="md:col-span-2 bg-gradient-to-br from-brand-blue-100 dark:from-brand-purple-900/60 to-brand-blue-200 dark:to-brand-purple-800/40 border border-brand-blue-300 dark:border-brand-purple-700/50 rounded-2xl p-8 flex flex-col items-center justify-center">
            <div className="text-lg text-brand-blue-700 dark:text-brand-purple-300 mb-2">Overall Score</div>
            <div className="text-6xl font-bold text-brand-blue-900 dark:text-white mb-4">{scores.overall}</div>
            <div className="text-sm text-brand-blue-600 dark:text-brand-purple-200 mb-4">/100</div>
            <span className={`px-4 py-1 rounded-full text-sm font-semibold ${overallBadge.color}`}>
              {overallBadge.badge}
            </span>
          </div>

          {/* Score Cards Grid */}
          <div className="md:col-span-3 grid grid-cols-2 gap-4">
            {scoreCards.map((card) => {
              const badgeColor = getScoreBadge(card.value);
              return (
                <div
                  key={card.label}
                  className="bg-white dark:bg-brand-gray-800/60 border border-brand-gray-200 dark:border-brand-gray-700 rounded-xl p-4 flex flex-col items-start"
                >
                  <div className="text-sm text-brand-gray-600 dark:text-brand-gray-400 mb-2">{card.label}</div>
                  <div className="flex items-baseline gap-1 mb-3">
                    <div className="text-3xl font-bold text-brand-gray-900 dark:text-white">{card.value}</div>
                    <div className="text-sm text-brand-gray-500 dark:text-brand-gray-500">/100</div>
                  </div>
                  <span className={`px-2 py-1 rounded-md text-xs font-semibold ${badgeColor.color}`}>
                    {badgeColor.badge}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detailed Review Section */}
      <div className="max-w-4xl mx-auto mb-12">
        <div className="bg-white dark:bg-brand-gray-800/40 border border-brand-gray-200 dark:border-brand-gray-700 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle2 className="w-6 h-6 text-brand-blue-600 dark:text-brand-purple-400" />
            <h2 className="text-2xl font-semibold text-brand-gray-900 dark:text-white">AI Review</h2>
          </div>
          <div className="prose prose-invert max-w-none">
            <div className="space-y-4 text-brand-gray-700 dark:text-brand-gray-300 leading-relaxed">
              {reviewText.split('\n\n').map((paragraph, idx) => (
                <p key={idx} className="text-base">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Suggested Improvements Section */}
      <div className="max-w-4xl mx-auto mb-12">
        <div>
          <div className="flex items-center gap-3 mb-6">
            <Lightbulb className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            <h2 className="text-2xl font-semibold text-brand-gray-900 dark:text-white">Suggested Improvements</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="bg-white dark:bg-brand-gray-800/60 border border-brand-gray-200 dark:border-brand-gray-700 rounded-xl p-6 flex flex-col gap-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-lg font-semibold text-brand-gray-900 dark:text-white flex-1">{suggestion.title}</h3>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-md text-xs font-bold border ${getCategoryColor(
                        suggestion.category
                      )}`}
                    >
                      {suggestion.category.charAt(0).toUpperCase() +
                        suggestion.category.slice(1).replace(/([A-Z])/g, ' $1')}
                    </span>
                    <span className="px-2.5 py-1 bg-brand-gray-200 dark:bg-brand-gray-700 text-brand-gray-700 dark:text-brand-gray-200 rounded-md text-xs font-bold">
                      {getPriorityLabel(suggestion.priority)}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-brand-gray-700 dark:text-brand-gray-300 leading-relaxed">{suggestion.description}</p>

                {/* Example (if available) */}
                {suggestion.example && (
                  <div className="bg-brand-gray-100 dark:bg-brand-gray-900/50 border border-brand-gray-200 dark:border-brand-gray-700/50 rounded-lg p-4">
                    <div className="text-xs text-brand-gray-600 dark:text-brand-gray-400 uppercase tracking-wide mb-2">Example</div>
                    <div className="text-sm text-brand-gray-800 dark:text-brand-gray-200 italic">{suggestion.example}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={onReEvaluate}
            className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold bg-brand-purple-600 dark:bg-brand-purple-700 text-white hover:bg-brand-purple-700 dark:hover:bg-brand-purple-600 hover:translate-y-[-1px] hover:shadow-lg transition-all shadow-md h-12"
          >
            <RotateCcw className="w-5 h-5" />
            Re-evaluate with new job description
          </button>
          <button 
            onClick={onStartNew}
            className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold bg-brand-blue-600 dark:bg-brand-blue-700 text-white hover:bg-brand-blue-700 dark:hover:bg-brand-blue-600 hover:translate-y-[-1px] hover:shadow-lg transition-all shadow-md h-12"
          >
            <RefreshCw className="w-5 h-5" />
            Start new evaluation
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultScreen;
