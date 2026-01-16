import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';

export function Header() {
  const { t, i18n } = useTranslation();
  const { setCurrentView, setCurrentEventId } = useApp();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ja' : 'en';
    i18n.changeLanguage(newLang);
  };

  const goHome = () => {
    setCurrentEventId(null);
    setCurrentView('home');
  };

  return (
    <header className="bg-[#B39E8A] px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
      <button
        onClick={goHome}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <h1 className="text-xl font-bold text-white">{t('app.title')}</h1>
      </button>
      <button
        onClick={toggleLanguage}
        className="px-3 py-1.5 text-sm font-medium bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
      >
        {i18n.language === 'en' ? 'JP' : 'EN'}
      </button>
    </header>
  );
}
