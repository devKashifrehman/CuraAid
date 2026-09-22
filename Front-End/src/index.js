import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './Theme/ThemeContext'; 

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter> 
       <ThemeProvider>  {/* ✅ Required for Router to work */}
      <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
