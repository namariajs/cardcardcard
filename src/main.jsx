import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import { AppProvider } from './context/AppContext.jsx';
import PublicFormPage from './components/public/PublicFormPage.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/f/:slug" element={<PublicFormPage />} />
        <Route
          path="/*"
          element={
            <AppProvider>
              <App />
            </AppProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
