import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for WebSocket connection with auto-reconnect.
 * 
 * Connects to the Antigravity WebSocket gateway for real-time events.
 * Handles reconnection with exponential backoff.
 * 
 * @param {string} url - WebSocket URL (e.g., ws://localhost:8400/ws/events)
 * @param {object} options - Configuration options
 * @returns {object} - { isConnected, lastEvent, send, connectionCount }
 */
export function useWebSocket(url, options = {}) {
  const {
    autoConnect = true,
    reconnectInterval = 2000,
    maxReconnectAttempts = 10,
    onMessage = null,
    onOpen = null,
    onClose = null,
    onError = null,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const [connectionCount, setConnectionCount] = useState(0);
  
  const wsRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const heartbeatTimerRef = useRef(null);
  const unmountedRef = useRef(false);

  const connect = useCallback(() => {
    if (unmountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setConnectionCount(prev => prev + 1);
        reconnectAttemptsRef.current = 0;
        onOpen?.();

        // Start heartbeat ping every 30s
        heartbeatTimerRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Ignore pong responses
          if (data.type === 'pong') return;

          setLastEvent(data);
          onMessage?.(data);
        } catch {
          // Non-JSON message — ignore
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        clearInterval(heartbeatTimerRef.current);
        onClose?.(event);

        // Auto-reconnect if not unmounted and not intentional close
        if (!unmountedRef.current && event.code !== 1000) {
          scheduleReconnect();
        }
      };

      ws.onerror = (error) => {
        onError?.(error);
      };
    } catch (err) {
      scheduleReconnect();
    }
  }, [url, onMessage, onOpen, onClose, onError]);

  const scheduleReconnect = useCallback(() => {
    if (unmountedRef.current) return;
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) return;

    const delay = reconnectInterval * Math.pow(1.5, reconnectAttemptsRef.current);
    reconnectAttemptsRef.current += 1;

    reconnectTimerRef.current = setTimeout(() => {
      connect();
    }, Math.min(delay, 30000));
  }, [connect, reconnectInterval, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    clearTimeout(reconnectTimerRef.current);
    clearInterval(heartbeatTimerRef.current);
    if (wsRef.current) {
      wsRef.current.close(1000); // Normal closure
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    unmountedRef.current = false;
    if (autoConnect) {
      connect();
    }
    return () => {
      unmountedRef.current = true;
      disconnect();
    };
  }, [url, autoConnect]);

  return {
    isConnected,
    lastEvent,
    send,
    connect,
    disconnect,
    connectionCount,
    reconnectAttempts: reconnectAttemptsRef.current,
  };
}

/**
 * Hook for subscribing to mission-specific WebSocket events.
 */
export function useMissionWebSocket(missionId, options = {}) {
  const baseUrl = import.meta.env.VITE_ANTIGRAVITY_WS_URL || 'ws://localhost:8400';
  const url = missionId ? `${baseUrl}/ws/mission/${missionId}` : null;

  return useWebSocket(url, {
    autoConnect: !!missionId,
    ...options,
  });
}

/**
 * Hook for subscribing to global system events.
 */
export function useSystemWebSocket(options = {}) {
  const baseUrl = import.meta.env.VITE_ANTIGRAVITY_WS_URL || 'ws://localhost:8400';
  return useWebSocket(`${baseUrl}/ws/events`, options);
}
