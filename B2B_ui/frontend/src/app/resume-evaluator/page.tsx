"use client";

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setJobTitle as setJobTitleAction, setJobDescription as setJobDescriptionAction, setResumeFile as setResumeFileAction, setTriedBeforeLogin, setError as setErrorAction, setEvaluationId, setFileId, setEvaluationResult, setEvaluationInProgress, resetEvaluationState } from '@/store/slices/resumeEvaluatorSlice';
import { FileUp, Search, Percent, Lightbulb, UploadCloud, Check, X, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import ResumeEvaluationProgress from '@/components/resume-evaluator/ResumeEvaluationProgress';
import ResultScreen from '@/components/resume-evaluator/ResultScreen';
import { resumeEvaluationApi } from '@/lib/api';

// Component Definitions
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card = ({ children, className = '' }: CardProps) => (
  <section className={`rounded-2xl border bg-white dark:bg-brand-gray-800 text-brand-gray-900 dark:text-white shadow-sm border-brand-gray-200 dark:border-brand-gray-700 ${className}`}>
    {children}
  </section>
);

interface CardHeaderProps {
  children: React.ReactNode;
}

const CardHeader = ({ children }: CardHeaderProps) => <div className="flex flex-col space-y-1 p-6">{children}</div>;

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

const CardTitle = ({ children, className = '' }: CardTitleProps) => (
  <h3 className={`text-xl md:text-2xl font-semibold leading-tight ${className}`}>{children}</h3>
);

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

const CardContent = ({ children, className = '' }: CardContentProps) => <div className={`p-6 pt-0 ${className}`}>{children}</div>;

interface CardFooterProps {
  children: React.ReactNode;
}

const CardFooter = ({ children }: CardFooterProps) => <div className="flex items-center p-6 pt-0">{children}</div>;

interface ButtonProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'ghost' | 'subtle';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

const Button = ({ children, className = '', variant = 'primary', onClick, disabled = false, ariaLabel }: ButtonProps) => {
  const base = 'inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-all disabled:opacity-60 disabled:pointer-events-none h-11 px-4 py-2';
  const variants = {
    primary: 'bg-brand-purple-600 dark:bg-brand-purple-600 text-white shadow hover:translate-y-[-1px] hover:shadow-lg hover:bg-brand-purple-700 dark:hover:bg-brand-purple-700',
    ghost: 'bg-transparent border border-brand-gray-300 dark:border-brand-gray-600 text-brand-gray-900 dark:text-white hover:bg-brand-gray-100 dark:hover:bg-white/5',
    subtle: 'bg-brand-gray-100 dark:bg-brand-gray-700 text-brand-gray-900 dark:text-brand-gray-100',
  };
  return (
    <button 
      aria-label={ariaLabel} 
      className={`${base} ${variants[variant] || variants.primary} ${className}`} 
      onClick={onClick} 
      disabled={disabled}
    >
      {children}
    </button>
  );
};

interface InputProps {
  placeholder?: string;
  className?: string;
  type?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  id?: string;
}

const Input = ({ placeholder, className = '', type = 'text', value, onChange, id }: InputProps) => (
  <input 
    id={id} 
    type={type} 
    placeholder={placeholder} 
    value={value} 
    onChange={onChange}
    className={`w-full rounded-lg border border-brand-gray-300 dark:border-brand-gray-600 bg-white dark:bg-brand-gray-700 px-3 py-2 text-sm text-brand-gray-900 dark:text-white placeholder:text-brand-gray-500 dark:placeholder:text-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 dark:focus:ring-brand-purple-500 ${className}`} 
  />
);

interface TextareaProps {
  placeholder?: string;
  className?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  id?: string;
}

const Textarea = ({ placeholder, className = '', value, onChange, rows = 4, id }: TextareaProps) => (
  <textarea 
    id={id} 
    placeholder={placeholder} 
    value={value} 
    onChange={onChange} 
    rows={rows}
    className={`w-full rounded-lg border border-brand-gray-300 dark:border-brand-gray-600 bg-white dark:bg-brand-gray-700 px-3 py-3 text-sm text-brand-gray-900 dark:text-white placeholder:text-brand-gray-500 dark:placeholder:text-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 dark:focus:ring-brand-purple-500 ${className}`} 
  />
);

const Chip = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-gray-100 dark:bg-brand-gray-700 text-sm text-brand-gray-700 dark:text-brand-gray-200 border border-brand-gray-300 dark:border-brand-gray-600">
    {children}
  </span>
);

// Utilities
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const truncate = (s: string | undefined, n = 30) => (s && s.length > n ? `${s.slice(0, n - 3)}...` : s);

const features = [
  { icon: Percent, title: 'Match Score', description: 'Quick estimate vs JD keywords and skills.' },
  { icon: Search, title: 'Keyword Analysis', description: 'Spot missing keywords recruiters expect.' },
  { icon: Lightbulb, title: 'Actionable Advice', description: 'Small high-impact edits you can implement.' },
];

interface FeaturePillProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}

const FeaturePill = ({ icon: Icon, title }: FeaturePillProps) => (
  <div className="inline-flex items-center gap-3 bg-brand-gray-100 dark:bg-brand-gray-700/60 border border-brand-gray-300 dark:border-brand-gray-600 rounded-lg px-3 py-2">
    <Icon className="w-4 h-4 text-brand-blue-600 dark:text-brand-purple-400" />
    <div className="text-sm text-brand-gray-700 dark:text-brand-gray-200">{title}</div>
  </div>
);

interface UploadWidgetProps {
  fileName?: string | null;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
  error: string | null;
  focusRef: React.RefObject<HTMLDivElement | null>;
  fileSize?: string;
}

const UploadWidget = ({ fileName, onFileSelect, onRemove, error, focusRef, fileSize }: UploadWidgetProps) => {
  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        ref={focusRef}
        onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') document.getElementById('resume-file-input')?.click(); }}
        className={`w-full rounded-xl border-2 p-4 text-center transition-all cursor-pointer focus:outline-none ${
          error 
            ? 'border-brand-red-500 bg-brand-red-50 dark:bg-brand-red-900/20' 
            : 'border-brand-gray-300 dark:border-brand-gray-600 bg-gradient-to-b from-brand-gray-50 dark:from-brand-gray-700/30 to-brand-gray-100 dark:to-brand-gray-800/10 hover:border-brand-blue-500 dark:hover:border-brand-purple-400'
        }`}
        onClick={() => document.getElementById('resume-file-input')?.click()}
        onDragOver={(e: React.DragEvent) => e.preventDefault()}
        onDrop={(e: React.DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onFileSelect(f); }}
      >
        <input 
          id="resume-file-input" 
          type="file" 
          accept=".pdf,.docx,.txt" 
          className="hidden" 
          onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])} 
        />

        {fileName ? (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Check className="w-7 h-7 text-green-500" />
              <div className="text-left">
                <div className="font-medium text-brand-gray-900 dark:text-white">{truncate(fileName)}</div>
                <div className="text-xs text-brand-gray-500 dark:text-brand-gray-400">{fileSize}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={(e) => { e.stopPropagation(); document.getElementById('resume-file-input')?.click(); }}>Replace</Button>
              <button 
                onClick={(e) => { e.stopPropagation(); onRemove(); }} 
                aria-label="remove file" 
                className="p-2 rounded-full bg-brand-gray-200 dark:bg-brand-gray-700 hover:bg-brand-gray-300 dark:hover:bg-brand-gray-600 transition-colors"
              >
                <X className="w-4 h-4 text-brand-gray-600 dark:text-brand-gray-300" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <UploadCloud className="w-10 h-10 text-brand-blue-500 dark:text-brand-purple-400" />
            <p className="text-lg font-medium text-brand-gray-900 dark:text-white">Upload or drop your resume</p>
            <p className="text-sm text-brand-gray-600 dark:text-brand-gray-400">PDF / DOCX / TXT · max 5MB</p>
            <div className="mt-2">
              <Button variant="ghost" onClick={(e) => { e.stopPropagation(); document.getElementById('resume-file-input')?.click(); }}>Browse files</Button>
            </div>
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-brand-red-600 dark:text-brand-red-400">{error}</p>}
    </div>
  );
};

// Main Component
export default function ResumeEvaluatorPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);
  
  // Get state from Redux
  const resumeEvaluatorState = useAppSelector(state => state.resumeEvaluator);
  const { jobTitle, jobDescription, resumeFileName, resumeFileSize, error, evaluationId } = resumeEvaluatorState;
  
  const [resumeFile, setResumeFileLocal] = useState<File | null>(null);
  const fileFocus = useRef<HTMLDivElement>(null);

  const humanFileSize = (size: number | undefined) => {
    if (!size) return '';
    const i = Math.floor(Math.log(size) / Math.log(1024));
    return `${(size / Math.pow(1024, i)).toFixed(1)} ${['B','KB','MB','GB'][i]}`;
  };

  const handleFileSelect = (file: File) => {
    dispatch(setErrorAction(null));
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      dispatch(setErrorAction('File too large — maximum allowed size is 5MB.'));
      return;
    }
    const allowed = ['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain'];
    if (!allowed.includes(file.type) && !file.name.endsWith('.docx') && !file.name.endsWith('.txt')) {
      dispatch(setErrorAction('Unsupported file type. Use PDF, DOCX or TXT.'));
      return;
    }
    setResumeFileLocal(file);
    dispatch(setResumeFileAction({ fileName: file.name, fileSize: file.size, fileType: file.type }));
  };

  const handleRemove = () => {
    setResumeFileLocal(null);
    dispatch(setResumeFileAction(null));
    dispatch(setErrorAction(null));
    setTimeout(() => fileFocus.current?.focus(), 0);
  };

  const [showProgress, setShowProgress] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isConnectingWebSocket, setIsConnectingWebSocket] = useState(false);
  const [tempEvaluationId, setTempEvaluationId] = useState<string | null>(null);
  const wsConnectionEstablishedRef = useRef(false);

  const handleEvaluate = async () => {
    console.log('[ResumeEvaluatorPage] ========================================');
    console.log('[ResumeEvaluatorPage] 🚀 EVALUATE BUTTON CLICKED!');
    console.log('[ResumeEvaluatorPage] ========================================');
    console.log('[ResumeEvaluatorPage] Current state:', {
      hasResumeFile: !!resumeFile,
      resumeFileName: resumeFile?.name,
      resumeFileSize: resumeFile?.size,
      resumeFileType: resumeFile?.type,
      hasJobDescription: !!jobDescription,
      jobDescriptionLength: jobDescription.length,
      hasUser: !!user,
      userId: user?.id,
      jobTitle: jobTitle || 'Not provided',
    });
    console.log('[ResumeEvaluatorPage] ========================================');
    
    dispatch(setErrorAction(null));
    
    if (!user) {
      console.log('[ResumeEvaluatorPage] ⚠️ User not logged in, redirecting to login');
      dispatch(setTriedBeforeLogin(true));
      router.push('/login');
      return;
    }

    if (!resumeFile) {
      console.log('[ResumeEvaluatorPage] ⚠️ No resume file uploaded');
      dispatch(setErrorAction('Please upload a resume before evaluating.'));
      return;
    }
    if (!jobDescription.trim()) {
      console.log('[ResumeEvaluatorPage] ⚠️ No job description provided');
      dispatch(setErrorAction('Please paste the job description.'));
      return;
    }
    
    console.log('[ResumeEvaluatorPage] ✅ Validation passed');
    console.log('[ResumeEvaluatorPage] Form data:', {
      jobTitle: jobTitle || 'Resume Evaluation',
      jobDescriptionLength: jobDescription.length,
      resumeFileName: resumeFileName,
      resumeFileSize: resumeFileSize,
    });
    
    try {
      // Step 1: Show progress screen and set connecting state
      console.log('[ResumeEvaluatorPage] 🔌 Step 1: Establishing WebSocket connection...');
      setIsConnectingWebSocket(true);
      setShowProgress(true);
      setShowResults(false);
      dispatch(setEvaluationInProgress(true));
      
      // Set a temporary evaluation ID to trigger WebSocket connection
      // We'll use a placeholder until we get the real one from API
      setTempEvaluationId('connecting');
      
      // Wait for WebSocket to connect (max 10 seconds)
      console.log('[ResumeEvaluatorPage] ⏳ Waiting for WebSocket connection...');
      const wsConnected = await waitForWebSocketConnection(10000);
      
      if (!wsConnected) {
        throw new Error('WebSocket connection timeout. Please check your internet connection and try again.');
      }
      
      console.log('[ResumeEvaluatorPage] ✅ WebSocket connected successfully!');
      setIsConnectingWebSocket(false);
      
      // Step 2: Now call the API to start evaluation
      console.log('[ResumeEvaluatorPage] 📡 Step 2: Calling startResumeEvaluation API...');
      const response = await resumeEvaluationApi.startResumeEvaluation(
        jobTitle || 'Resume Evaluation',
        jobDescription,
        resumeFile
      );

      console.log('[ResumeEvaluatorPage] 📥 API Response received:', {
        success: response.success,
        message: response.message,
        hasData: !!response.data,
        evaluationId: response.data?.evaluationId,
        fileId: response.data?.fileId,
        hasScores: !!response.data?.scores,
        hasReview: !!response.data?.review,
      });

      if (response.success && response.data) {
        console.log('[ResumeEvaluatorPage] ✅ API call successful');
        console.log('[ResumeEvaluatorPage] Storing evaluationId:', response.data.evaluationId);
        console.log('[ResumeEvaluatorPage] Storing fileId:', response.data.fileId);
        
        // Clear temp ID and set real evaluation ID
        setTempEvaluationId(null);
        dispatch(setEvaluationId(response.data.evaluationId));
        dispatch(setFileId(response.data.fileId));
        
        if (response.data.scores && response.data.review) {
          console.log('[ResumeEvaluatorPage] 🎉 Evaluation completed immediately with scores:', response.data.scores);
          dispatch(setEvaluationResult({
            scores: response.data.scores,
            suggestions: response.data.suggestions || [],
            review: response.data.review,
          }));
          setShowProgress(false);
          setShowResults(true);
        } else {
          console.log('[ResumeEvaluatorPage] ⏳ Evaluation in progress, waiting for WebSocket updates...');
        }
      } else {
        throw new Error(response.message || 'Failed to start evaluation');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start evaluation';
      console.error('[ResumeEvaluatorPage] ❌ Error during evaluation:', errorMessage);
      console.error('[ResumeEvaluatorPage] Error details:', error);
      dispatch(setErrorAction(errorMessage));
      toast.error(errorMessage);
      dispatch(setEvaluationInProgress(false));
      setShowProgress(false);
      setIsConnectingWebSocket(false);
      setTempEvaluationId(null);
    }
  };

  // Helper function to wait for WebSocket connection
  const waitForWebSocketConnection = (timeoutMs: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkConnection = () => {
        // Check if WebSocket has connected (will be set by useEffect)
        if (wsConnectionEstablishedRef.current) {
          console.log('[ResumeEvaluatorPage] ✅ WebSocket connection confirmed');
          resolve(true);
          return;
        }
        
        // Check if timeout exceeded
        if (Date.now() - startTime > timeoutMs) {
          console.error('[ResumeEvaluatorPage] ❌ WebSocket connection timeout');
          resolve(false);
          return;
        }
        
        // Check again in 100ms
        setTimeout(checkConnection, 100);
      };
      
      checkConnection();
    });
  };

  const handleEvaluationComplete = (result: import('@/types/resumeEvaluator').EvaluationResult) => {
    console.log('[ResumeEvaluatorPage] 🎉 Evaluation completed via WebSocket!');
    console.log('[ResumeEvaluatorPage] Final result:', {
      scores: result.scores,
      suggestionsCount: result.suggestions.length,
      reviewLength: result.review.length,
    });
    dispatch(setEvaluationResult(result));
    dispatch(setEvaluationInProgress(false));
    setShowProgress(false);
    setShowResults(true);
    console.log('[ResumeEvaluatorPage] ✅ Navigated to results screen');
  };

  const handleEvaluationError = (error: string) => {
    console.error('[ResumeEvaluatorPage] ❌ Evaluation error received:', error);
    dispatch(setErrorAction(error));
    toast.error(error);
  };

  const handleBackToForm = () => {
    setShowProgress(false);
    setShowResults(false);
    dispatch(setJobDescriptionAction(''));
    dispatch(setResumeFileAction(null));
    dispatch(setErrorAction(null));
    dispatch(resetEvaluationState());
  };

  const handleStartNew = () => {
    setShowResults(false);
    setShowProgress(false);
  };

  const handleReEvaluate = () => {
    setShowResults(false);
    setShowProgress(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-blue-100 via-brand-purple-50 to-brand-pink-100 dark:from-brand-gray-950 dark:via-brand-gray-900 dark:to-brand-gray-950 text-brand-gray-900 dark:text-white p-6 md:p-12 font-sans">
      {/* Show results screen */}
      {showResults ? (
        <div className="w-full">
          {/* Back button */}
          <div className="mb-6">
            <button
              onClick={handleBackToForm}
              className="flex items-center gap-2 text-sm text-brand-gray-600 dark:text-brand-gray-400 hover:text-brand-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to form
            </button>
          </div>
          
          <ResultScreen 
            onStartNew={handleStartNew} 
            onReEvaluate={handleReEvaluate}
            evaluationResult={resumeEvaluatorState.evaluationResult}
          />
        </div>
      ) : showProgress ? (
        <div className="w-full">
          {/* Back button */}
          <div className="mb-6">
            <button
              onClick={handleBackToForm}
              className="flex items-center gap-2 text-sm text-brand-gray-600 dark:text-brand-gray-400 hover:text-brand-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to form
            </button>
          </div>
          
          <ResumeEvaluationProgress 
            autoStart={true}
            inline={true}
            evaluationId={tempEvaluationId || evaluationId}
            onComplete={handleEvaluationComplete}
            onError={handleEvaluationError}
            onConnectionStatusChange={(status) => {
              console.log('[ResumeEvaluatorPage] WebSocket status changed:', status);
              if (status === 'connected') {
                wsConnectionEstablishedRef.current = true;
              } else if (status === 'disconnected' || status === 'error') {
                wsConnectionEstablishedRef.current = false;
              }
            }}
          />
        </div>
      ) : (
        <>
      {/* Top bar */}
      <div className="max-w-6xl mx-auto mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-brand-blue-100 dark:bg-brand-purple-900/30 p-2">
            <FileUp className="w-6 h-6 text-brand-blue-600 dark:text-brand-purple-400" />
          </div>
          <div>
            <div className="text-sm text-brand-gray-600 dark:text-brand-gray-400">Tool</div>
            <div className="text-lg font-semibold text-brand-gray-900 dark:text-white">AI Resume Optimizer</div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <FeaturePill icon={Percent} title="Match" />
          <FeaturePill icon={Search} title="Keywords" />
          <FeaturePill icon={Lightbulb} title="Advice" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left column */}
        <div className="md:col-span-1 space-y-6">
          <Card className="bg-gradient-to-br from-white dark:from-brand-gray-800 to-brand-gray-50 dark:to-brand-gray-700 border-brand-gray-200 dark:border-brand-gray-700 p-6">
            <CardHeader>
              <CardTitle className="text-brand-blue-600 dark:text-brand-purple-400">Why this helps</CardTitle>
              <p className="text-sm text-brand-gray-600 dark:text-brand-gray-400">Focused feedback to improve ATS hit-rate and recruiter signals.</p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {features.map((f, i) => {
                  const Icon = f.icon;
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex-none rounded-lg bg-brand-gray-200 dark:bg-brand-gray-700 p-3 border border-brand-gray-300 dark:border-brand-gray-600">
                        <Icon className="w-5 h-5 text-brand-blue-600 dark:text-brand-purple-400" />
                      </div>
                      <div>
                        <div className="font-semibold text-brand-gray-900 dark:text-white">{f.title}</div>
                        <div className="text-sm text-brand-gray-600 dark:text-brand-gray-400">{f.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
            <CardFooter>
              <div className="w-full">
                <Button className="w-full" onClick={() => document.getElementById('resume-file-input')?.click()}>Upload resume</Button>
              </div>
            </CardFooter>
          </Card>

          <Card className="bg-white dark:bg-brand-gray-800/60 border-brand-gray-200 dark:border-brand-gray-700 p-4">
            <CardContent>
              <h4 className="text-sm text-brand-gray-700 dark:text-brand-gray-300 mb-2 font-semibold">Best Practices</h4>
              <ul className="text-sm text-brand-gray-600 dark:text-brand-gray-400 space-y-1 list-inside list-disc">
                <li>Use concrete metrics (%, numbers)</li>
                <li>Match tech keywords from the JD</li>
                <li>Prefer bullets over long paragraphs</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Right column - form */}
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-white dark:bg-brand-gray-800/60 border-brand-gray-200 dark:border-brand-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between flex-col sm:flex-row gap-4">
                <div>
                  <CardTitle className="text-brand-blue-700 dark:text-brand-purple-300">Start evaluation</CardTitle>
                  <p className="text-sm text-brand-gray-600 dark:text-brand-gray-400">Paste the job description and upload your resume &mdash; we&apos;ll return notes.</p>
                </div>
                <div className="hidden sm:flex items-center gap-3">
                  <Chip>Local processing</Chip>
                  <Chip>Private</Chip>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label htmlFor="jobTitle" className="text-sm text-brand-gray-700 dark:text-brand-gray-300 block mb-1">Target Job Title</label>
                  <Input 
                    id="jobTitle" 
                    placeholder="e.g. Senior Full Stack Developer" 
                    value={jobTitle} 
                    onChange={(e) => dispatch(setJobTitleAction(e.target.value))} 
                  />
                </div>
              </div>

              <div>
                <label htmlFor="jobDescription" className="text-sm text-brand-gray-700 dark:text-brand-gray-300 block mb-1">Job Description <span className="text-brand-red-500">*</span></label>
                <Textarea 
                  id="jobDescription" 
                  value={jobDescription} 
                  onChange={(e) => dispatch(setJobDescriptionAction(e.target.value))} 
                  rows={8} 
                />
                <div className="flex justify-end mt-1 text-xs text-brand-gray-500 dark:text-brand-gray-400">{jobDescription.length} characters</div>
              </div>

              <div>
                <label className="text-sm text-brand-gray-700 dark:text-brand-gray-300 block mb-2">Resume</label>
                <UploadWidget 
                  fileName={resumeFileName} 
                  fileSize={resumeFileSize ? humanFileSize(resumeFileSize) : ''} 
                  onFileSelect={handleFileSelect} 
                  onRemove={handleRemove} 
                  error={error} 
                  focusRef={fileFocus} 
                />
              </div>

              <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
                <div className="text-sm text-brand-gray-600 dark:text-brand-gray-400">Ready to analyze — results shown inline.</div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Button 
                    className="flex-1 sm:flex-none sm:w-44" 
                    onClick={handleEvaluate} 
                    disabled={!resumeFile || !jobDescription.trim()} 
                    ariaLabel="Evaluate resume"
                  >
                    Evaluate
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => { dispatch(setJobDescriptionAction('')); dispatch(setResumeFileAction(null)); dispatch(setErrorAction(null)); }}
                  >
                    Reset
                  </Button>
                </div>
              </div>

            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-brand-gray-800/40 border-brand-gray-200 dark:border-brand-gray-700 p-4">
            <CardContent>
              <h4 className="text-sm text-brand-gray-700 dark:text-brand-gray-300 mb-2 font-semibold">Tips</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-brand-gray-600 dark:text-brand-gray-400">
                <div>• Keep job description details like tech stack and years of experience.</div>
                <div>• Use concise bullet points in resume work history.</div>
                <div>• Add measurable outcomes (%, numbers) when possible.</div>
                <div>• Avoid generic phrases without context.</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
