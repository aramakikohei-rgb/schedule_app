import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';

export function HomePage() {
  const { t } = useTranslation();
  const { setCurrentView } = useApp();

  return (
    <div className="min-h-[calc(100vh-52px)] flex flex-col items-center justify-center p-4 bg-[#F9F7F5]">
      <div className="text-center max-w-md">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto bg-[#EDE4DD] rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-[#B39E8A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#5C4D3D] mb-2">
            {t('app.title')}
          </h1>
          <p className="text-[#8C7B6A]">{t('app.subtitle')}</p>
        </div>

        {/* CTA Button */}
        <button
          onClick={() => setCurrentView('create')}
          className="w-full max-w-xs px-8 py-4 bg-[#B39E8A] hover:bg-[#A08975] text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
        >
          {t('app.createNew')}
        </button>

        {/* Credit */}
        <p className="mt-12 text-xs text-[#B39E8A]">
          {t('app.credit')}
        </p>
      </div>
    </div>
  );
}
