import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AdminApp from './AdminApp';
import './index.css';

// صفحة الأدمن (/admin) وصفحة اليوزر (أي مسار تاني) منفصلين تمامًا - نفس
// الملف المبني (بندل واحد من فايت)، بس بيقرر يعرض إيه بس على حسب المسار.
// مفيش أي رابط بينهم من جوه الواجهة، والباك إند (app.js) بيرجّع نفس
// index.html لأي مسار غير /api عشان /admin يشتغل حتى لو اتفتح مباشرة.
const isAdminRoute = window.location.pathname.startsWith('/admin');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isAdminRoute ? <AdminApp /> : <App />}
  </React.StrictMode>
);
