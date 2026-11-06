import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                background: '#0f1852',
                color: '#f8fafc',
                border: '1px solid rgba(249, 147, 7, 0.3)',
                borderRadius: '12px',
                fontSize: '13px',
                fontFamily: 'Inter, sans-serif',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
              },
              success: {
                iconTheme: {
                  primary: '#f99307',
                  secondary: '#0b1137',
                },
              },
              error: {
                style: {
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                },
              },
            }}
          />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
