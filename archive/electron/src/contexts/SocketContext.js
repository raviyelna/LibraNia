import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
const SocketContext = createContext(undefined);
export function SocketProvider({ children }) {
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    useEffect(() => {
        const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const newSocket = io(socketUrl, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: Infinity,
        });
        newSocket.on('connect', () => {
            console.log('Socket.IO connected');
            setConnected(true);
        });
        newSocket.on('disconnect', () => {
            console.log('Socket.IO disconnected');
            setConnected(false);
            toast.error('Connection lost - reconnecting...');
        });
        setSocket(newSocket);
        return () => {
            newSocket.close();
        };
    }, []);
    return (_jsx(SocketContext.Provider, { value: { socket, connected }, children: children }));
}
export function useSocket() {
    const context = useContext(SocketContext);
    if (context === undefined) {
        throw new Error('useSocket must be used within SocketProvider');
    }
    return context;
}
