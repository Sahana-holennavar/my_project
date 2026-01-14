'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { tokenStorage } from '@/lib/tokens';
import { env } from '@/lib/env';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, Square, Trash2, Wifi, WifiOff, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import type { ResumeStatusPayload } from '@/types/resumeEvaluator';

interface WebSocketMessage {
  id: string;
  timestamp: string;
  type: 'connect' | 'disconnect' | 'resume:status' | 'error' | 'connect_error' | 'info';
  data: unknown;
  raw?: string;
}

export default function WebSocketTestPage() {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const [evaluationId, setEvaluationId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [socketUrl, setSocketUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (type: WebSocketMessage['type'], data: unknown, raw?: string) => {
    const message: WebSocketMessage = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      type,
      data,
      raw: raw ? JSON.stringify(raw, null, 2) : undefined,
    };
    setMessages((prev) => [...prev, message]);
    console.log(`[WebSocketTest] ${type}:`, data);
  };

  const connect = () => {
    if (!evaluationId.trim()) {
      addMessage('error', { message: 'Please enter an evaluation ID' });
      setError('Please enter an evaluation ID');
      return;
    }

    if (socketRef.current?.connected) {
      addMessage('info', { message: 'Already connected' });
      return;
    }

    setIsConnecting(true);
    setConnectionStatus('connecting');
    setError(null);

    const tokens = tokenStorage.getStoredTokens();
    if (!tokens?.access_token) {
      const errorMsg = 'No access token found';
      addMessage('error', { message: errorMsg });
      setError(errorMsg);
      setConnectionStatus('error');
      setIsConnecting(false);
      return;
    }

    let url: string;
    if (env.WS_URL) {
      url = env.WS_URL;
    } else {
      const apiUrl = env.API_URL || 'http://localhost:3000/api';
      const urlObj = new URL(apiUrl);
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
      const namespace = '/api/resumes/status';
      url = `${baseUrl}${namespace}`;
    }

    setSocketUrl(url);
    addMessage('info', { message: 'Connecting...', url, evaluationId });

    try {
      socketRef.current = io(url, {
        auth: {
          token: tokens.access_token,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 20000,
        forceNew: true,
      });

      socketRef.current.on('connect', () => {
        console.log('[WebSocketTest] ✅ Connected');
        addMessage('connect', {
          socketId: socketRef.current?.id,
          transport: socketRef.current?.io.engine.transport.name,
        });
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionStatus('connected');
        setError(null);
      });

      socketRef.current.on('connect_error', (err) => {
        console.error('[WebSocketTest] ❌ Connection error:', err);
        addMessage('connect_error', {
          message: err.message,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          type: (err as any).type,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          description: (err as any).description,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          context: (err as any).context,
        });
        setIsConnected(false);
        setIsConnecting(false);
        setConnectionStatus('error');
        setError(err.message || 'Connection error');
      });

      socketRef.current.on('resume:status', (payload: ResumeStatusPayload) => {
        console.log('[WebSocketTest] 📨 Received resume:status:', payload);
        addMessage('resume:status', payload, JSON.stringify(payload));
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('[WebSocketTest] 🔌 Disconnected:', reason);
        addMessage('disconnect', { reason });
        setIsConnected(false);
        setIsConnecting(false);
        setConnectionStatus('disconnected');
      });

      socketRef.current.on('error', (err) => {
        console.error('[WebSocketTest] ❌ Socket error:', err);
        addMessage('error', { message: 'Socket error', error: err });
      });

      socketRef.current.io.on('error', (err) => {
        console.error('[WebSocketTest] ❌ Socket.IO engine error:', err);
        addMessage('error', { message: 'Socket.IO engine error', error: err });
      });

      addMessage('info', { message: 'Event listeners registered' });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect';
      console.error('[WebSocketTest] ❌ Exception:', errorMsg);
      addMessage('error', { message: errorMsg, error: err });
      setIsConnecting(false);
      setConnectionStatus('error');
      setError(errorMsg);
    }
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      addMessage('info', { message: 'Disconnected manually' });
    }
    setIsConnected(false);
    setIsConnecting(false);
    setConnectionStatus('disconnected');
    setError(null);
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Connected
          </Badge>
        );
      case 'connecting':
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Connecting
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-500 hover:bg-red-600">
            <AlertCircle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-500 hover:bg-gray-600">
            <WifiOff className="w-3 h-3 mr-1" />
            Disconnected
          </Badge>
        );
    }
  };

  const getMessageIcon = (type: WebSocketMessage['type']) => {
    switch (type) {
      case 'connect':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'disconnect':
        return <WifiOff className="w-4 h-4 text-gray-500" />;
      case 'resume:status':
        return <Wifi className="w-4 h-4 text-blue-500" />;
      case 'error':
      case 'connect_error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Loader2 className="w-4 h-4 text-gray-500" />;
    }
  };

  const getMessageColor = (type: WebSocketMessage['type']) => {
    switch (type) {
      case 'connect':
        return 'border-green-500 bg-green-50 dark:bg-green-950';
      case 'disconnect':
        return 'border-gray-500 bg-gray-50 dark:bg-gray-950';
      case 'resume:status':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-950';
      case 'error':
      case 'connect_error':
        return 'border-red-500 bg-red-50 dark:bg-red-950';
      default:
        return 'border-gray-300 bg-gray-50 dark:bg-gray-900';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
              WebSocket Test - Resume Evaluation
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Test and debug WebSocket connection for resume evaluation API
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Connection Control</CardTitle>
                <CardDescription>Manage WebSocket connection</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Evaluation ID</label>
                  <Input
                    placeholder="Enter evaluation ID"
                    value={evaluationId}
                    onChange={(e) => setEvaluationId(e.target.value)}
                    disabled={isConnected || isConnecting}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={connect}
                    disabled={isConnected || isConnecting}
                    className="flex-1"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Connecting
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Connect
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={disconnect}
                    disabled={!isConnected && !isConnecting}
                    variant="destructive"
                    className="flex-1"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Disconnect
                  </Button>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status:</span>
                    {getStatusBadge()}
                  </div>
                  {socketUrl && (
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">URL:</span>
                      <p className="text-xs font-mono bg-neutral-100 dark:bg-neutral-800 p-2 rounded break-all">
                        {socketUrl}
                      </p>
                    </div>
                  )}
                  {error && (
                    <div className="p-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
                      {error}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Statistics</CardTitle>
                <CardDescription>Message statistics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Total Messages:</span>
                  <Badge>{messages.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">resume:status:</span>
                  <Badge variant="outline">
                    {messages.filter((m) => m.type === 'resume:status').length}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Errors:</span>
                  <Badge variant="destructive">
                    {messages.filter((m) => m.type === 'error' || m.type === 'connect_error').length}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>WebSocket Messages</CardTitle>
                    <CardDescription>Real-time message log</CardDescription>
                  </div>
                  <Button onClick={clearMessages} variant="outline" size="sm">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[600px] overflow-y-auto space-y-3 pr-2">
                  {messages.length === 0 ? (
                    <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
                      <WifiOff className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No messages yet. Connect to start receiving messages.</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`border rounded-lg p-4 ${getMessageColor(message.type)}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">{getMessageIcon(message.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {message.type}
                                </Badge>
                                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                  {message.timestamp}
                                </span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {message.type === 'resume:status' && (
                                <div className="space-y-1">
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <span className="font-medium">Step:</span>{' '}
                                      <Badge variant="outline" className="ml-1">
                                        {(message.data as ResumeStatusPayload).step}
                                      </Badge>
                                    </div>
                                    <div>
                                      <span className="font-medium">Status:</span>{' '}
                                      <Badge variant="outline" className="ml-1">
                                        {(message.data as ResumeStatusPayload).status}
                                      </Badge>
                                    </div>
                                    <div>
                                      <span className="font-medium">Progress:</span>{' '}
                                      {(message.data as ResumeStatusPayload).progress !== undefined
                                        ? `${(message.data as ResumeStatusPayload).progress}%`
                                        : 'N/A'}
                                    </div>
                                    <div>
                                      <span className="font-medium">Evaluation ID:</span>{' '}
                                      <span className="font-mono text-xs">
                                        {(message.data as ResumeStatusPayload).evaluationId?.substring(0, 8)}...
                                      </span>
                                    </div>
                                  </div>
                                  {(message.data as ResumeStatusPayload).details && (
                                    <div className="text-xs">
                                      <span className="font-medium">Details:</span>{' '}
                                      <span className="text-neutral-600 dark:text-neutral-300">
                                        {(message.data as ResumeStatusPayload).details}
                                      </span>
                                    </div>
                                  )}
                                  {(message.data as ResumeStatusPayload).scores && (
                                    <div className="text-xs">
                                      <span className="font-medium">Scores:</span>
                                      <pre className="mt-1 p-2 bg-neutral-100 dark:bg-neutral-800 rounded text-xs overflow-x-auto">
                                        {JSON.stringify((message.data as ResumeStatusPayload).scores, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  {(message.data as ResumeStatusPayload).error && (
                                    <div className="text-xs text-red-600 dark:text-red-400">
                                      <span className="font-medium">Error:</span> {(message.data as ResumeStatusPayload).error}
                                    </div>
                                  )}
                                </div>
                              )}
                              {message.type === 'connect' && (
                                <div className="text-xs space-y-1">
                                  <div>
                                    <span className="font-medium">Socket ID:</span>{' '}
                                    <span className="font-mono">{(message.data as { socketId?: string; transport?: string }).socketId}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium">Transport:</span>{' '}
                                    {(message.data as { socketId?: string; transport?: string }).transport}
                                  </div>
                                </div>
                              )}
                              {message.type === 'disconnect' && (
                                <div className="text-xs">
                                  <span className="font-medium">Reason:</span> {(message.data as { reason?: string }).reason}
                                </div>
                              )}
                              {(message.type === 'error' || message.type === 'connect_error') && (
                                <div className="text-xs space-y-1">
                                  <div>
                                    <span className="font-medium">Message:</span>{' '}
                                    {(message.data as { message?: string; type?: string; description?: string }).message}
                                  </div>
                                  {(message.data as { message?: string; type?: string; description?: string }).type && (
                                    <div>
                                      <span className="font-medium">Type:</span> {(message.data as { message?: string; type?: string; description?: string }).type}
                                    </div>
                                  )}
                                  {(message.data as { message?: string; type?: string; description?: string }).description && (
                                    <div>
                                      <span className="font-medium">Description:</span>{' '}
                                      {(message.data as { message?: string; type?: string; description?: string }).description}
                                    </div>
                                  )}
                                </div>
                              )}
                              {message.type === 'info' && (
                                <div className="text-xs">
                                  <span className="font-medium">Info:</span> {(message.data as { message?: string; url?: string }).message}
                                  {(message.data as { message?: string; url?: string }).url && (
                                    <div className="mt-1">
                                      <span className="font-medium">URL:</span>{' '}
                                      <span className="font-mono text-xs break-all">
                                        {(message.data as { message?: string; url?: string }).url}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                              {message.raw && (
                                <details className="mt-2">
                                  <summary className="text-xs font-medium cursor-pointer">
                                    Raw JSON
                                  </summary>
                                  <pre className="mt-2 p-2 bg-neutral-100 dark:bg-neutral-800 rounded text-xs overflow-x-auto">
                                    {message.raw}
                                  </pre>
                                </details>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
