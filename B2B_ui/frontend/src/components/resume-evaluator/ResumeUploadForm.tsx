import React, { useState, useRef } from 'react';
import { FileUp, Search, Percent, Lightbulb } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Chip } from '@/components/ui/chip';
import { UploadWidget } from './UploadWidget';

interface FeaturePillProps {
  icon: React.ElementType;
  title: string;
}

const FeaturePill: React.FC<FeaturePillProps> = ({ icon: Icon, title }) => (
  <div className="inline-flex items-center gap-3 bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-300 dark:border-indigo-700 rounded-lg px-3 py-2">
    <Icon className="w-4 h-4 text-indigo-700 dark:text-indigo-300" />
    <div className="text-sm text-indigo-800 dark:text-indigo-200">{title}</div>
  </div>
);

interface ResumeUploadFormProps {
  onEvaluate: (data: { jobTitle: string; jobDescription: string; resumeFile: File }) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const features = [
  { icon: Percent, title: 'Match Score', description: 'Quick estimate vs JD keywords and skills.' },
  { icon: Search, title: 'Keyword Analysis', description: 'Spot missing keywords recruiters expect.' },
  { icon: Lightbulb, title: 'Actionable Advice', description: 'Small high-impact edits you can implement.' },
];

export const ResumeUploadForm: React.FC<ResumeUploadFormProps> = ({ onEvaluate }) => {
  const [jobTitle, setJobTitle] = useState('Senior Full Stack Developer');
  const [jobDescription, setJobDescription] = useState(
    'Develop and maintain high-quality web applications using Next.js and React. Collaborate with design and product teams to translate requirements into technical solutions. Must have 5+ years of experience with modern JavaScript frameworks, Firebase/Firestore, and cloud services (AWS/GCP).'
  );
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const fileFocus = useRef<HTMLDivElement | null>(null);

  const humanFileSize = (size: number | undefined): string => {
    if (!size) return '';
    const i = Math.floor(Math.log(size) / Math.log(1024));
    return `${(size / Math.pow(1024, i)).toFixed(1)} ${['B', 'KB', 'MB', 'GB'][i]}`;
  };

  const handleFileSelect = (file: File) => {
    setError('');
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setError('File too large — maximum allowed size is 5MB.');
      return;
    }

    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    if (!allowed.includes(file.type) && !file.name.endsWith('.docx') && !file.name.endsWith('.txt')) {
      setError('Unsupported file type. Use PDF, DOCX or TXT.');
      return;
    }

    setResumeFile(file);
  };

  const handleRemove = () => {
    setResumeFile(null);
    setError('');
    setTimeout(() => fileFocus.current?.focus(), 0);
  };

  const handleEvaluate = () => {
    setError('');
    if (!resumeFile) {
      setError('Please upload a resume before evaluating.');
      return;
    }
    if (!jobDescription.trim()) {
      setError('Please paste the job description.');
      return;
    }

    onEvaluate({ jobTitle, jobDescription, resumeFile });
  };

  const handleReset = () => {
    setJobTitle('');
    setJobDescription('');
    setResumeFile(null);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-blue-100 via-brand-purple-50 to-brand-pink-100 dark:from-brand-gray-950 dark:via-brand-gray-900 dark:to-brand-gray-950 text-neutral-900 dark:text-white p-6 md:p-12 font-sans relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-blue-400/20 dark:bg-brand-purple-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-brand-purple-400/20 dark:bg-brand-blue-600/10 rounded-full blur-3xl animate-pulse" />
      </div>
      
      {/* Top bar */}
      <div className="max-w-6xl mx-auto mb-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-brand-blue-100 dark:bg-brand-purple-900/30 p-2">
            <FileUp className="w-6 h-6 text-brand-blue-700 dark:text-brand-purple-300" />
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

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
        {/* Left column */}
        <div className="md:col-span-1 space-y-6">
          <Card className="bg-white/80 dark:bg-brand-gray-800/90 backdrop-blur-lg border-white/20 dark:border-brand-gray-700/50 p-6 shadow-xl">
            <CardHeader>
              <CardTitle className="text-brand-blue-700 dark:text-brand-purple-300">Why this helps</CardTitle>
              <p className="text-sm text-brand-gray-600 dark:text-brand-gray-400">
                Focused feedback to improve ATS hit-rate and recruiter signals.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {features.map((f, i) => {
                  const Icon = f.icon;
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex-none rounded-lg bg-indigo-100 dark:bg-indigo-900/30 p-3 border border-indigo-200 dark:border-indigo-700">
                        <Icon className="w-5 h-5 text-indigo-700 dark:text-indigo-300" />
                      </div>
                      <div>
                        <div className="font-semibold text-neutral-900 dark:text-white">{f.title}</div>
                        <div className="text-sm text-neutral-600 dark:text-neutral-400">{f.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
            <CardFooter>
              <div className="w-full">
                <Button
                  className="w-full"
                  onClick={() => document.getElementById('resume-file-input')?.click()}
                >
                  Upload resume
                </Button>
              </div>
            </CardFooter>
          </Card>

          <Card className="bg-white dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700 p-4">
            <CardContent>
              <h4 className="text-sm text-neutral-700 dark:text-neutral-300 mb-2 font-semibold">Best Practices</h4>
              <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1 list-inside list-disc">
                <li>Use concrete metrics (%, numbers)</li>
                <li>Match tech keywords from the JD</li>
                <li>Prefer bullets over long paragraphs</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Right column - form */}
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-gray-800/60 border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-indigo-200">Start evaluation</CardTitle>
                  <p className="text-sm text-gray-400">
                    Paste the job description and upload your resume — we&apos;ll return notes.
                  </p>
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
                  <label htmlFor="jobTitle" className="text-sm text-gray-300 block mb-1">
                    Target Job Title
                  </label>
                  <Input
                    id="jobTitle"
                    placeholder="e.g. Senior Full Stack Developer"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="jobDescription" className="text-sm text-gray-300 block mb-1">
                  Job Description <span className="text-red-400">*</span>
                </label>
                <Textarea
                  id="jobDescription"
                  value={jobDescription}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setJobDescription(e.target.value)}
                  rows={8}
                />
                <div className="flex justify-end mt-1 text-xs text-gray-500">
                  {jobDescription.length} characters
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-300 block mb-2">Resume</label>
                <UploadWidget
                  fileName={resumeFile?.name}
                  fileSize={humanFileSize(resumeFile?.size)}
                  onFileSelect={handleFileSelect}
                  onRemove={handleRemove}
                  error={error}
                  focusRef={fileFocus}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="text-sm text-gray-400">Ready to analyze — results shown inline.</div>
                <div className="flex items-center gap-3">
                  <Button
                    className="w-44"
                    onClick={handleEvaluate}
                    disabled={!resumeFile || !jobDescription.trim()}
                    aria-label="Evaluate resume"
                  >
                    Evaluate
                  </Button>
                  <Button variant="ghost" onClick={handleReset}>
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/40 border-gray-700 p-4">
            <CardContent>
              <h4 className="text-sm text-gray-300 mb-2">Tips</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-400">
                <div>• Keep job description details like tech stack and years of experience.</div>
                <div>• Use concise bullet points in resume work history.</div>
                <div>• Add measurable outcomes (%, numbers) when possible.</div>
                <div>• Avoid generic phrases without context.</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
