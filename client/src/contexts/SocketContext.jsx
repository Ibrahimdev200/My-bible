import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentScripture, setCurrentScripture] = useState(null);
  const [displayDuration, setDisplayDuration] = useState(15);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isMicListening, setIsMicListening] = useState(false);

  // Broadcast channel for instantaneous cross-tab syncing (Projection window <-> Dashboard)
  const channelRef = useRef(null);
  const timerRef = useRef(null);

  // Initialize broadcast channel
  useEffect(() => {
    try {
      channelRef.current = new BroadcastChannel('scripturelive_channel');
      channelRef.current.onmessage = (event) => {
        const { type, payload } = event.data;
        if (type === 'SCRIPTURE_DETECTED') {
          setCurrentScripture(payload);
        } else if (type === 'CLEAR_PROJECTION') {
          setCurrentScripture(null);
        } else if (type === 'MIC_STATUS') {
          setIsMicListening(payload);
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported in this browser environment', e);
    }

    return () => {
      if (channelRef.current) {
        channelRef.current.close();
      }
    };
  }, []);

  // Socket.io initialization
  useEffect(() => {
    // Connect to backend socket
    const socketInstance = io(window.location.origin, {
      path: '/socket.io',
      auth: {
        token: token || '',
      },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      // Join church-specific room if user/churchId exists
      const churchId = user?.id || user?.churchId || 'public';
      socketInstance.emit('join-church', { churchId });
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    // Listen for projection events
    socketInstance.on('scripture-detected', (data) => {
      setCurrentScripture(data);
      // Also broadcast locally
      if (channelRef.current) {
        channelRef.current.postMessage({ type: 'SCRIPTURE_DETECTED', payload: data });
      }
    });

    socketInstance.on('clear-projection', () => {
      setCurrentScripture(null);
      if (channelRef.current) {
        channelRef.current.postMessage({ type: 'CLEAR_PROJECTION' });
      }
    });

    socketInstance.on('update-branding', (branding) => {
      // Branding updated
      if (user) {
        user.branding = branding;
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [token, user?.id, user?.churchId]);

  // Emit scripture detected to projection
  const emitScriptureDetected = useCallback((scriptureData) => {
    const payload = {
      ...scriptureData,
      timestamp: new Date().toISOString(),
      churchId: user?.id || user?.churchId || 'public',
      churchName: user?.churchName || user?.name || 'ScriptureLive Church',
      logoUrl: user?.logoUrl || '',
    };

    setCurrentScripture(payload);

    // Cross-tab broadcast
    if (channelRef.current) {
      channelRef.current.postMessage({ type: 'SCRIPTURE_DETECTED', payload });
    }

    // Socket broadcast to room
    if (socket && socket.connected) {
      socket.emit('scripture-detected', payload);
    }

    // Auto-clear after displayDuration if set > 0
    if (timerRef.current) clearTimeout(timerRef.current);
    if (displayDuration > 0) {
      timerRef.current = setTimeout(() => {
        // Only clear if still showing this scripture
        setCurrentScripture((prev) => (prev?.reference === payload.reference ? null : prev));
      }, displayDuration * 1000);
    }
  }, [socket, user, displayDuration]);

  // Emit clear projection
  const emitClearProjection = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCurrentScripture(null);

    if (channelRef.current) {
      channelRef.current.postMessage({ type: 'CLEAR_PROJECTION' });
    }

    if (socket && socket.connected) {
      const churchId = user?.id || user?.churchId || 'public';
      socket.emit('clear-projection', { churchId });
    }
  }, [socket, user]);

  // Update branding broadcast
  const emitUpdateBranding = useCallback((branding) => {
    if (socket && socket.connected) {
      const churchId = user?.id || user?.churchId || 'public';
      socket.emit('update-branding', { churchId, branding });
    }
  }, [socket, user]);

  // Broadcast mic status
  const broadcastMicStatus = useCallback((active) => {
    setIsMicListening(active);
    if (channelRef.current) {
      channelRef.current.postMessage({ type: 'MIC_STATUS', payload: active });
    }
  }, []);

  const value = {
    socket,
    isConnected,
    currentScripture,
    setCurrentScripture,
    emitScriptureDetected,
    emitClearProjection,
    emitUpdateBranding,
    displayDuration,
    setDisplayDuration,
    liveTranscript,
    setLiveTranscript,
    isMicListening,
    broadcastMicStatus,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;
