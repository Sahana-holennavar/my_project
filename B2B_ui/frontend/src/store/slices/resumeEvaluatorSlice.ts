import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { EvaluationResult } from '@/types/resumeEvaluator';

export interface ResumeEvaluatorState {
  jobTitle: string;
  jobDescription: string;
  resumeFileName: string | null;
  resumeFileSize: number | null;
  resumeFileType: string | null;
  triedBeforeLogin: boolean;
  error: string | null;
  evaluationId: string | null;
  fileId: string | null;
  evaluationInProgress: boolean;
  evaluationResult: EvaluationResult | null;
}

const initialState: ResumeEvaluatorState = {
  jobTitle: '',
  jobDescription: '',
  resumeFileName: null,
  resumeFileSize: null,
  resumeFileType: null,
  triedBeforeLogin: false,
  error: null,
  evaluationId: null,
  fileId: null,
  evaluationInProgress: false,
  evaluationResult: null,
};

const resumeEvaluatorSlice = createSlice({
  name: 'resumeEvaluator',
  initialState,
  reducers: {
    // Set job title
    setJobTitle: (state, action: PayloadAction<string>) => {
      state.jobTitle = action.payload;
    },
    
    // Set job description
    setJobDescription: (state, action: PayloadAction<string>) => {
      state.jobDescription = action.payload;
    },
    
    setResumeFile: (state, action: PayloadAction<{ fileName: string; fileSize: number; fileType: string } | null>) => {
      if (action.payload) {
        state.resumeFileName = action.payload.fileName;
        state.resumeFileSize = action.payload.fileSize;
        state.resumeFileType = action.payload.fileType;
      } else {
        state.resumeFileName = null;
        state.resumeFileSize = null;
        state.resumeFileType = null;
      }
    },
    
    // Set tried before login flag
    setTriedBeforeLogin: (state, action: PayloadAction<boolean>) => {
      state.triedBeforeLogin = action.payload;
    },
    
    // Set error message
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    saveFormData: (state, action: PayloadAction<Omit<ResumeEvaluatorState, 'error'>>) => {
      state.jobTitle = action.payload.jobTitle;
      state.jobDescription = action.payload.jobDescription;
      state.resumeFileName = action.payload.resumeFileName;
      state.resumeFileSize = action.payload.resumeFileSize;
      state.resumeFileType = action.payload.resumeFileType;
      state.triedBeforeLogin = action.payload.triedBeforeLogin;
    },
    
    // Clear all form data and flags after evaluation or successful login
    resetEvaluator: () => initialState,
    
    // Clear tried before login flag after redirect
    clearTriedBeforeLogin: (state) => {
      state.triedBeforeLogin = false;
    },
    // Set evaluation ID
    setEvaluationId: (state, action: PayloadAction<string | null>) => {
      state.evaluationId = action.payload;
    },
    // Set file ID
    setFileId: (state, action: PayloadAction<string | null>) => {
      state.fileId = action.payload;
    },
    // Set evaluation result
    setEvaluationResult: (state, action: PayloadAction<EvaluationResult | null>) => {
      state.evaluationResult = action.payload;
    },
    // Set evaluation in progress
    setEvaluationInProgress: (state, action: PayloadAction<boolean>) => {
      state.evaluationInProgress = action.payload;
    },
    // Reset evaluation
    resetEvaluation: (state) => {
      state.evaluationId = null;
      state.fileId = null;
      state.evaluationInProgress = false;
      state.evaluationResult = null;
    },
  },
});

export const {
  setJobTitle,
  setJobDescription,
  setResumeFile,
  setTriedBeforeLogin,
  setError,
  saveFormData,
  resetEvaluator,
  clearTriedBeforeLogin,
  setEvaluationId,
  setFileId,
  setEvaluationResult,
  setEvaluationInProgress,
  resetEvaluation: resetEvaluationState,
} = resumeEvaluatorSlice.actions;

export default resumeEvaluatorSlice.reducer;
