import { useEffect, useState } from 'react';

const STORAGE_KEY = 'stockWatcherTheme';

function getInitialTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return 'light';
}

// بيدير الوضع الداكن/الفاتح: بيحفظ اختيار المستخدم في localStorage، ولو
// مفيش اختيار محفوظ بيتبع تفضيل نظام التشغيل تلقائيًا.
export default function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  return { theme, toggleTheme };
}
