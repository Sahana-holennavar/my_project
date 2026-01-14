/**
 * WebSocket Hook for Real-time Resume Evaluation Progress
 * Features: Auto-reconnect, fallback to dummy data, real-time updates
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { EvaluationData, EvaluationStep, StepStatus } from '@/types/resumeEvaluator';

export enum ConnectionStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  USING_DUMMY = 'using_dummy',
}

export interface WebSocketMessage {
  type:
    | 'progress_update'
    | 'step_complete'
    | 'step_error'
    | 'evaluation_complete'
    | 'connection_ready';
  data: {
    stepIndex?: number;
    step?: EvaluationStep;
    progressPercent?: number;
    currentStep?: string;
    message?: string;
    timestamp?: string;
    evaluationId?: string;
  };
}

interface UseWebSocketProgressOptions {
  evaluationId?: string;
  wsUrl?: string;
  autoConnect?: boolean;
  fallbackToAnimation?: boolean;
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
}

export const useWebSocketProgress = ({
  evaluationId,
  wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/evaluations',
  autoConnect = true,
  fallbackToAnimation = true,
  onMessage,
  onError,
  onStatusChange,
}: UseWebSocketProgressOptions) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef(0);
  const maxReconnectAttemptsRef = useRef(5);
  const reconnectDelayRef = useRef(1000); // Start with 1 second

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    ConnectionStatus.DISCONNECTED
  );
  const [evaluationData, setEvaluationData] = useState<EvaluationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUsingDummyData, setIsUsingDummyData] = useState(false);

  // Update connection status
  const updateStatus = useCallback((status: ConnectionStatus) => {
    setConnectionStatus(status);
    onStatusChange?.(status);
  }, [onStatusChange]);

  // Handle incoming WebSocket message
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        // Call user's callback
        onMessage?.(message);

        // Update evaluation data based on message type
        switch (message.type) {
          case 'connection_ready':
            updateStatus(ConnectionStatus.CONNECTED);
            setError(null);
            reconnectCountRef.current = 0;
            reconnectDelayRef.current = 1000;
            break;

          case 'progress_update':
            if (message.data.progressPercent !== undefined) {
              setEvaluationData((prev) => ({
                ...prev!,
                progressPercent: message.data.progressPercent!,
              }));
            }
            break;

          case 'step_complete':
            if (message.data.stepIndex !== undefined && message.data.step) {
              setEvaluationData((prev) => {
                if (!prev) return null;
                const newSteps = [...prev.steps];
                newSteps[message.data.stepIndex!] = message.data.step!;
                return {
                  ...prev,
                  steps: newSteps,
                  inProgressStep:
                    message.data.stepIndex! < prev.steps.length - 1
                      ? newSteps[message.data.stepIndex! + 1]
                      : null,
                };
              });
            }
            break;

          case 'step_error':
            setError(message.data.message || 'Step failed');
            if (message.data.stepIndex !== undefined) {
              setEvaluationData((prev) => {
                if (!prev) return null;
                const newSteps = [...prev.steps];
                newSteps[message.data.stepIndex!] = {
                  ...newSteps[message.data.stepIndex!],
                  status: StepStatus.FAILED,
                };
                return {
                  ...prev,
                  steps: newSteps,
                };
              });
            }
            break;

          case 'evaluation_complete':
            updateStatus(ConnectionStatus.CONNECTED);
            if (message.data.progressPercent !== undefined) {
              setEvaluationData((prev) => ({
                ...prev!,
                progressPercent: message.data.progressPercent!,
              }));
            }
            break;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to parse message';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    },
    [onMessage, onError, updateStatus]
  );

  // Reconnect with exponential backoff
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reconnect = useCallback(() => {
    if (reconnectCountRef.current >= maxReconnectAttemptsRef.current) {
      updateStatus(ConnectionStatus.ERROR);
      setError('Max reconnection attempts reached. Using dummy data.');
      setIsUsingDummyData(true);
      return;
    }

    reconnectCountRef.current++;
    const delay = reconnectDelayRef.current * Math.pow(2, reconnectCountRef.current - 1);

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    updateStatus(ConnectionStatus.CONNECTING);

    try {
      const url = evaluationId
        ? `${wsUrl}/${evaluationId}`
        : wsUrl;

      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        updateStatus(ConnectionStatus.CONNECTED);
        setError(null);
        reconnectCountRef.current = 0;
        reconnectDelayRef.current = 1000;

        // Send ready message
        if (wsRef.current) {
          wsRef.current.send(
            JSON.stringify({
              type: 'connection_ready',
              evaluationId,
            })
          );
        }
      };

      wsRef.current.onmessage = handleMessage;

      wsRef.current.onerror = () => {
        updateStatus(ConnectionStatus.ERROR);
        setError('WebSocket connection error');
        onError?.('WebSocket connection error');
      };

      wsRef.current.onclose = () => {
        updateStatus(ConnectionStatus.DISCONNECTED);
        if (fallbackToAnimation && !isUsingDummyData) {
          reconnect();
        }
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect to WebSocket';
      updateStatus(ConnectionStatus.ERROR);
      setError(errorMsg);
      onError?.(errorMsg);

      if (fallbackToAnimation && !isUsingDummyData) {
        reconnect();
      }
    }
  }, [evaluationId, wsUrl, handleMessage, updateStatus, onError, reconnect, fallbackToAnimation, isUsingDummyData]);

  // Connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [autoConnect, connect]);

  // Send message to server
  const sendMessage = useCallback((message: Partial<WebSocketMessage>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Disconnect manually
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    updateStatus(ConnectionStatus.DISCONNECTED);
  }, [updateStatus]);

  // Reconnect manually
  const manualReconnect = useCallback(() => {
    reconnectCountRef.current = 0;
    reconnectDelayRef.current = 1000;
    connect();
  }, [connect]);

  return {
    // Data
    evaluationData,
    setEvaluationData,
    
    // Status
    connectionStatus,
    isConnected: connectionStatus === ConnectionStatus.CONNECTED,
    isConnecting: connectionStatus === ConnectionStatus.CONNECTING,
    isError: connectionStatus === ConnectionStatus.ERROR,
    isUsingDummyData,
    error,

    // Controls
    connect,
    disconnect,
    manualReconnect,
    sendMessage,
  };
};
