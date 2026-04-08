import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { getToken } from '../utils/storage';

const SOCKET_URL = 'http://10.0.2.2:5000'; // same as API base, no /api

let socketInstance = null;

// Singleton — one socket connection for the whole app
export const getSocket = () => socketInstance;

export const connectSocket = async (userId) => {
  if (socketInstance?.connected) return socketInstance;

  socketInstance = io(SOCKET_URL, {
    query: { userId },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 3000,   // wait 3s between retries (network drops in Nigeria)
    reconnectionDelayMax: 15000,
    timeout: 20000,
  });

  return socketInstance;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

// Hook for listening to socket events within a screen
export default function useSocket(userId, eventHandlers = {}) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!userId) return;

    connectSocket(userId).then((socket) => {
      socketRef.current = socket;

      socket.on('connect', () => console.log('Socket connected'));
      socket.on('disconnect', (reason) => console.log('Socket disconnected:', reason));
      socket.on('connect_error', (err) => console.warn('Socket error:', err.message));

      // Attach all event handlers
      Object.entries(eventHandlers).forEach(([event, handler]) => {
        socket.on(event, handler);
      });
    });

    return () => {
      if (socketRef.current) {
        Object.keys(eventHandlers).forEach((event) => {
          socketRef.current.off(event);
        });
      }
    };
  }, [userId]);

  return socketRef;
}
