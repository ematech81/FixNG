import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { getToken } from '../utils/storage';
import { ApiIPAddress } from '../utils/AppIPAdress';

// Derived from the same IP as the REST API — strip /api suffix so both point to the same server
const SOCKET_URL = ApiIPAddress.replace('/api', '');

let socketInstance = null;

// Singleton — one socket connection for the whole app
export const getSocket = () => socketInstance;

export const connectSocket = async (userId) => {
  // Reuse existing socket regardless of connection state — Socket.IO handles reconnection.
  // Creating a new socket when the old one is briefly disconnected produces orphaned
  // connections where event listeners are registered on dead socket objects.
  if (socketInstance) return socketInstance;

  const token = await getToken();

  socketInstance = io(SOCKET_URL, {
    auth: { token },
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
