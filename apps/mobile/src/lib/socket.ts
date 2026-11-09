import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getAccessToken } from './api';
import { API_URL } from './config';

let socket: Socket | null = null;

export function getSocket() {
  const token = getAccessToken();
  if (!token) return null;
  if (!socket) {
    socket = io(API_URL, { path: '/realtime', transports: ['websocket'], auth: (cb) => cb({ token: getAccessToken() }) });
  }
  return socket;
}

export function useSocketEvent<T>(event: string, handler: (payload: T) => void) {
  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    s.on(event, handler);
    return () => {
      s.off(event, handler);
    };
  }, [event, handler]);
}
