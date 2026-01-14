'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { tokenStorage } from '@/lib/tokens';
import { env } from '@/lib/env';
import type { ResumeStatusPayload, EvaluationData, EvaluationStep, ActivityLogEntry, EvaluationResult } from '@/types/resumeEvaluator';
import { StepStatus } from '@/types/resumeEvaluator';

export enum ConnectionStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
}

interface UseResumeEvaluationWebSocketOptions {
  evaluationId: string | null;
  onComplete?: (result: EvaluationResult) => void;
  onError?: (error: string) => void;
  autoConnect?: boolean;
}

const STEP_ORDER: Array<ResumeStatusPayload['step']> = ['upload', 'parsability_check', 'OCR', 'parsing', 'grading', 'completed'];
const mapBackendStepToUI = (step: ResumeStatusPayload['step'] | string): string => {
  const stepMap: Record<string, string> = {
    upload: 'Upload',
    parsability: 'Parsability',
    parsability_check: 'Parsability',  // Backend uses this format
    OCR: 'OCR',
    parsing: 'Parsing',
    grading: 'Grading',
    completed: 'Completed',
    failed: 'Failed',
  };
  return stepMap[step] || step;
};

const mapBackendStatusToStepStatus = (status: ResumeStatusPayload['status']): StepStatus => {
  if (status === 'completed') return StepStatus.DONE;
  if (status === 'failed') return StepStatus.FAILED;
  if (status === 'in progress' || status === 'in_progress') return StepStatus.IN_PROGRESS;
  return StepStatus.PENDING;
};

const createInitialEvaluationData = (): EvaluationData => {
  const steps: EvaluationStep[] = STEP_ORDER.map((step) => ({
    step: mapBackendStepToUI(step),
    status: StepStatus.PENDING,
    time: '—',
  }));

  return {
    steps,
    totalSteps: steps.length,
    completedSteps: 0,
    progressPercent: 0,
    inProgressStep: null,
    activityLog: [],
    estimatedTimeRemaining: '~0:30',
  };
};

export const useResumeEvaluationWebSocket = ({
  evaluationId,
  onComplete,
  onError,
  autoConnect = true,
}: UseResumeEvaluationWebSocketOptions) => {
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 1000;

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [evaluationData, setEvaluationData] = useState<EvaluationData>(createInitialEvaluationData());
  const [error, setError] = useState<string | null>(null);

  const updateEvaluationData = useCallback((payload: ResumeStatusPayload) => {
    console.log('');
    console.log('==============================================');
    console.log('[ResumeEvaluationWebSocket] 🔄 UPDATING EVALUATION DATA');
    console.log('==============================================');
    console.log('[ResumeEvaluationWebSocket] Received step:', payload.step);
    console.log('[ResumeEvaluationWebSocket] Received status:', payload.status);
    console.log('[ResumeEvaluationWebSocket] Received progress:', payload.progress);
    console.log('[ResumeEvaluationWebSocket] Received details:', payload.details);

    setEvaluationData((prev) => {
      console.log('[ResumeEvaluationWebSocket] 📊 INSIDE setEvaluationData callback');
      console.log('[ResumeEvaluationWebSocket] Previous state:', {
        completedSteps: prev.completedSteps,
        progressPercent: prev.progressPercent,
        steps: prev.steps.map(s => `${s.step}: ${s.status}`),
      });
      
      let stepIndex = STEP_ORDER.indexOf(payload.step);
      
      // If step not found, try to map it
      if (stepIndex === -1) {
        console.warn('[ResumeEvaluationWebSocket] ⚠️ Step not in STEP_ORDER:', payload.step);
        console.warn('[ResumeEvaluationWebSocket] STEP_ORDER:', STEP_ORDER);
        
        // Try to find a similar step
        if (payload.step === 'parsability_check') {
          stepIndex = 1; // Index of parsability_check in STEP_ORDER
          console.log('[ResumeEvaluationWebSocket] ✅ Mapped parsability_check to index:', stepIndex);
        } else {
          console.warn('[ResumeEvaluationWebSocket] ❌ Unknown step, RETURNING PREVIOUS STATE');
          return prev;
        }
      }

      console.log('[ResumeEvaluationWebSocket] Step index:', stepIndex);

      const newSteps = [...prev.steps];
      const stepStatus = mapBackendStatusToStepStatus(payload.status);

      // 🚀 IMPORTANT: Mark all previous steps as completed when we skip ahead
      // This ensures the UI can jump to the current step even if updates came fast
      if (payload.status === 'in progress' || payload.status === 'in_progress' || payload.status === 'completed') {
        for (let i = 0; i < stepIndex; i++) {
          if (newSteps[i].status === StepStatus.PENDING || newSteps[i].status === StepStatus.IN_PROGRESS) {
            newSteps[i] = {
              ...newSteps[i],
              status: StepStatus.DONE,
              time: new Date(payload.timestamp).toLocaleTimeString(),
            };
            console.log('[ResumeEvaluationWebSocket] ⚡ Fast-forwarded step', i, 'to DONE');
          }
        }
      }

      if (payload.step === 'failed') {
        newSteps[stepIndex] = {
          step: mapBackendStepToUI(payload.step),
          status: StepStatus.FAILED,
          time: new Date(payload.timestamp).toLocaleTimeString(),
        };
        console.log('[ResumeEvaluationWebSocket] ❌ Step marked as failed');
      } else if (payload.status === 'completed') {
        newSteps[stepIndex] = {
          step: mapBackendStepToUI(payload.step),
          status: StepStatus.DONE,
          time: new Date(payload.timestamp).toLocaleTimeString(),
        };
        console.log('[ResumeEvaluationWebSocket] ✅ Step marked as completed');
      } else if (payload.status === 'in progress' || payload.status === 'in_progress') {
        newSteps[stepIndex] = {
          step: mapBackendStepToUI(payload.step),
          status: StepStatus.IN_PROGRESS,
          time: new Date(payload.timestamp).toLocaleTimeString(),
        };
        console.log('[ResumeEvaluationWebSocket] ⏳ Step marked as in progress');
      }

      const completedSteps = newSteps.filter((s) => s.status === StepStatus.DONE).length;
      const progressPercent = payload.progress !== undefined ? payload.progress : Math.round((completedSteps / prev.totalSteps) * 100);
      const inProgressStep = newSteps.find((s) => s.status === StepStatus.IN_PROGRESS) || null;

      console.log('[ResumeEvaluationWebSocket] Progress update:', {
        completedSteps,
        progressPercent,
        inProgressStep: inProgressStep?.step,
      });

      const activityLog: ActivityLogEntry[] = [...prev.activityLog];
      if (payload.details) {
        activityLog.unshift({
          action: payload.details,
          timestamp: new Date(payload.timestamp).toLocaleTimeString(),
        });
        if (activityLog.length > 10) activityLog.pop();
        console.log('[ResumeEvaluationWebSocket] 📝 Added to activity log:', payload.details);
      }

      const estimatedTimeRemaining = payload.progress !== undefined
        ? `~${Math.max(0, Math.round((100 - payload.progress) / 2))}:00`
        : prev.estimatedTimeRemaining;

      const updatedData = {
        ...prev,
        steps: newSteps,
        completedSteps,
        progressPercent,
        inProgressStep,
        activityLog,
        estimatedTimeRemaining,
      };

      console.log('[ResumeEvaluationWebSocket] ✅ NEW STATE BEING RETURNED:');
      console.log('[ResumeEvaluationWebSocket] Total steps:', updatedData.totalSteps);
      console.log('[ResumeEvaluationWebSocket] Completed steps:', updatedData.completedSteps);
      console.log('[ResumeEvaluationWebSocket] Progress percent:', updatedData.progressPercent);
      console.log('[ResumeEvaluationWebSocket] In-progress step:', updatedData.inProgressStep?.step);
      console.log('[ResumeEvaluationWebSocket] Activity log entries:', updatedData.activityLog.length);
      console.log('[ResumeEvaluationWebSocket] Steps state:', updatedData.steps.map(s => `${s.step}: ${s.status}`));
      console.log('==============================================');
      console.log('');

      return updatedData;
    });
  }, []);

  const connect = useCallback(() => {
    // Allow connection even without evaluationId for pre-connection
    if (socketRef.current?.connected) {
      console.log('[ResumeEvaluationWebSocket] Already connected, skipping');
      return;
    }

    console.log('[ResumeEvaluationWebSocket] Starting connection...', { evaluationId });

    const tokens = tokenStorage.getStoredTokens();
    if (!tokens?.access_token) {
      console.error('[ResumeEvaluationWebSocket] No access token found');
      setError('Authentication required');
      setConnectionStatus(ConnectionStatus.ERROR);
      return;
    }

    console.log('[ResumeEvaluationWebSocket] Token found, proceeding with connection');
    setConnectionStatus(ConnectionStatus.CONNECTING);
    setError(null);

    try {
      let socketUrl: string;
      
      if (env.WS_URL) {
        socketUrl = env.WS_URL;
        console.log('[ResumeEvaluationWebSocket] Using explicit WS_URL from env:', socketUrl);
      } else {
        const apiUrl = env.API_URL || 'http://localhost:3000/api';
        const url = new URL(apiUrl);
        const baseUrl = `${url.protocol}//${url.host}`;
        const namespace = '/api/resumes/status';
        socketUrl = `${baseUrl}${namespace}`;
        console.log('[ResumeEvaluationWebSocket] Derived Socket.IO URL from API_URL');
      }

      console.log('[ResumeEvaluationWebSocket] Connecting to:', socketUrl);
      console.log('[ResumeEvaluationWebSocket] Full config:', {
        apiUrl: env.API_URL,
        wsUrl: env.WS_URL,
        socketUrl,
        evaluationId,
        hasToken: !!tokens.access_token,
        tokenPreview: tokens.access_token ? tokens.access_token.substring(0, 20) + '...' : 'No token',
      });

      socketRef.current = io(socketUrl, {
        auth: {
          token: tokens.access_token,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: maxReconnectAttempts,
      });

      socketRef.current.on('connect', () => {
        console.log('[ResumeEvaluationWebSocket] ✅ Connected successfully');
        console.log('[ResumeEvaluationWebSocket] Socket ID:', socketRef.current?.id);
        console.log('[ResumeEvaluationWebSocket] Socket transport:', socketRef.current?.io.engine.transport.name);
        setConnectionStatus(ConnectionStatus.CONNECTED);
        setError(null);
        reconnectCountRef.current = 0;
      });

      socketRef.current.on('resume:status', (payload: ResumeStatusPayload) => {
        console.log('[ResumeEvaluationWebSocket] 📨 Received resume:status event');
        console.log('[ResumeEvaluationWebSocket] Payload:', JSON.stringify(payload, null, 2));
        console.log('[ResumeEvaluationWebSocket] Payload details:', {
          evaluationId: payload.evaluationId,
          step: payload.step,
          status: payload.status,
          progress: payload.progress,
          details: payload.details,
          hasScores: !!payload.scores,
          hasError: !!payload.error,
        });
        console.log('[ResumeEvaluationWebSocket] Current stored evaluationId:', evaluationId);

        // If we're in "connecting" state, accept any evaluation ID
        // The API call will set the real evaluationId after this
        if (evaluationId === 'connecting') {
          console.log('[ResumeEvaluationWebSocket] ⚠️ Still in connecting state, accepting this evaluation ID');
          console.log('[ResumeEvaluationWebSocket] ✅ Processing update...');
          updateEvaluationData(payload);
        } else if (payload.evaluationId !== evaluationId) {
          console.warn('[ResumeEvaluationWebSocket] ⚠️ Evaluation ID mismatch:', {
            received: payload.evaluationId,
            expected: evaluationId,
          });
          console.warn('[ResumeEvaluationWebSocket] ❌ Ignoring this update!');
          return;
        } else {
          console.log('[ResumeEvaluationWebSocket] ✅ Evaluation ID matches, updating data');
          updateEvaluationData(payload);
        }

        if (payload.step === 'completed' && payload.status === 'completed') {
          console.log('[ResumeEvaluationWebSocket] 🎉 Evaluation completed!');
          console.log('[ResumeEvaluationWebSocket] Final scores:', payload.scores);
          console.log('[ResumeEvaluationWebSocket] Has suggestions:', !!payload.suggestions);
          console.log('[ResumeEvaluationWebSocket] Has review:', !!payload.review);
          
          if (payload.scores && onComplete) {
            console.log('[ResumeEvaluationWebSocket] Calling onComplete callback');
            const result = {
              scores: payload.scores,
              suggestions: payload.suggestions || [],
              review: payload.review || payload.details || 'Evaluation completed successfully.',
            };
            console.log('[ResumeEvaluationWebSocket] Sending result to onComplete:', {
              hasScores: !!result.scores,
              suggestionsCount: result.suggestions.length,
              reviewLength: result.review.length,
            });
            onComplete(result);
          } else {
            console.warn('[ResumeEvaluationWebSocket] ⚠️ Cannot call onComplete:', {
              hasScores: !!payload.scores,
              hasCallback: !!onComplete,
            });
          }
        }

        if (payload.step === 'failed' || payload.error) {
          const errorMessage = payload.error || payload.details || 'Evaluation failed';
          console.error('[ResumeEvaluationWebSocket] ❌ Evaluation failed:', errorMessage);
          setError(errorMessage);
          onError?.(errorMessage);
        }
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('[ResumeEvaluationWebSocket] 🔌 Disconnected:', reason);
        setConnectionStatus(ConnectionStatus.DISCONNECTED);
        if (reason === 'io server disconnect') {
          console.log('[ResumeEvaluationWebSocket] Server disconnected the socket');
        } else if (reason === 'io client disconnect') {
          console.log('[ResumeEvaluationWebSocket] Client disconnected');
        } else {
          console.log('[ResumeEvaluationWebSocket] Connection lost, will attempt to reconnect');
        }
      });

      socketRef.current.on('connect_error', (err) => {
        console.error('[ResumeEvaluationWebSocket] ❌ Connection error:', err);
        console.error('[ResumeEvaluationWebSocket] Error details:', {
          message: err.message,
          name: err.name,
        });
        setConnectionStatus(ConnectionStatus.ERROR);
        setError(err.message || 'Connection error');
        onError?.(err.message || 'Connection error');
      });

      socketRef.current.on('error', (err) => {
        console.error('[ResumeEvaluationWebSocket] ❌ Socket error:', err);
      });

      socketRef.current.io.on('error', (err) => {
        console.error('[ResumeEvaluationWebSocket] ❌ Socket.IO engine error:', err);
      });

      console.log('[ResumeEvaluationWebSocket] ✅ Event listeners registered');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect';
      console.error('[ResumeEvaluationWebSocket] ❌ Exception during connection:', errorMsg);
      console.error('[ResumeEvaluationWebSocket] Error stack:', err instanceof Error ? err.stack : 'No stack');
      setConnectionStatus(ConnectionStatus.ERROR);
      setError(errorMsg);
      onError?.(errorMsg);
    }
  }, [evaluationId, updateEvaluationData, onComplete, onError]);

  const disconnect = useCallback(() => {
    console.log('[ResumeEvaluationWebSocket] 🔌 Disconnecting...');
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      console.log('[ResumeEvaluationWebSocket] ✅ Socket disconnected and cleared');
    }
    setConnectionStatus(ConnectionStatus.DISCONNECTED);
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
      console.log('[ResumeEvaluationWebSocket] ✅ Reconnect timeout cleared');
    }
  }, []);

  useEffect(() => {
    console.log('[ResumeEvaluationWebSocket] 🔧 Effect triggered', {
      autoConnect,
      evaluationId,
      hasSocket: !!socketRef.current,
      isConnected: socketRef.current?.connected,
    });

    if (autoConnect && evaluationId) {
      console.log('[ResumeEvaluationWebSocket] 🚀 Auto-connecting...');
      connect();
    } else {
      console.log('[ResumeEvaluationWebSocket] ⏸️ Auto-connect disabled or no evaluationId');
    }

    return () => {
      console.log('[ResumeEvaluationWebSocket] 🧹 Cleaning up on unmount');
      disconnect();
    };
  }, [autoConnect, evaluationId, connect, disconnect]);

  return {
    evaluationData,
    connectionStatus,
    isConnected: connectionStatus === ConnectionStatus.CONNECTED,
    isConnecting: connectionStatus === ConnectionStatus.CONNECTING,
    error,
    connect,
    disconnect,
  };
};
