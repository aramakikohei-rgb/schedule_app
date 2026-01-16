import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';
import { useApp } from '../context/AppContext';
import { CalendarPicker } from './CalendarPicker';

export function CreateEventPage() {
  const { t, i18n } = useTranslation();
  const { createEvent, setCurrentEventId, setCurrentView } = useApp();
  const locale = i18n.language === 'ja' ? ja : enUS;

  const [title, setTitle] = useState('');
  const [memo, setMemo] = useState('');
  const [organizerEmail, setOrganizerEmail] = useState('');
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [timeInputs, setTimeInputs] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);

  const handleDateSelect = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    if (selectedDates.some(d => format(d, 'yyyy-MM-dd') === dateKey)) {
      // Remove date
      setSelectedDates(prev => prev.filter(d => format(d, 'yyyy-MM-dd') !== dateKey));
      setTimeInputs(prev => {
        const newInputs = { ...prev };
        delete newInputs[dateKey];
        return newInputs;
      });
    } else {
      // Add date
      setSelectedDates(prev => [...prev, date].sort((a, b) => a.getTime() - b.getTime()));
      setTimeInputs(prev => ({ ...prev, [dateKey]: '' }));
    }
  };

  const updateTimeInput = (dateKey: string, value: string) => {
    setTimeInputs(prev => ({ ...prev, [dateKey]: value }));
  };

  const formatDateForDisplay = (date: Date) => {
    if (i18n.language === 'ja') {
      return format(date, 'M/d(E)', { locale });
    }
    return format(date, 'MMM d (E)', { locale });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || selectedDates.length === 0) {
      return;
    }

    setIsCreating(true);
    await new Promise(resolve => setTimeout(resolve, 300));

    const dateCandidates = selectedDates.map(date => {
      const dateKey = format(date, 'yyyy-MM-dd');
      const time = timeInputs[dateKey]?.trim();
      const dateStr = formatDateForDisplay(date);
      return {
        datetime: time ? `${dateStr} ${time}` : dateStr,
      };
    });

    const eventId = createEvent(title.trim(), memo.trim(), dateCandidates, organizerEmail.trim() || undefined);
    setCurrentEventId(eventId);
    setCurrentView('event');
  };

  return (
    <div className="max-w-2xl mx-auto p-4 pb-8 bg-[#F9F7F5] min-h-screen">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-[#B39E8A] px-6 py-5">
          <h2 className="text-xl font-bold text-white">
            {t('create.title')}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Event Name */}
          <div>
            <label className="block text-sm font-semibold text-[#5C4D3D] mb-2">
              {t('create.eventName')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border border-[#D2C4BA] rounded-lg focus:ring-2 focus:ring-[#B39E8A] focus:border-[#B39E8A] outline-none"
              placeholder={t('create.eventNamePlaceholder')}
              required
            />
          </div>

          {/* Memo */}
          <div>
            <label className="block text-sm font-semibold text-[#5C4D3D] mb-2">
              {t('create.memo')}
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full px-4 py-3 border border-[#D2C4BA] rounded-lg focus:ring-2 focus:ring-[#B39E8A] focus:border-[#B39E8A] outline-none resize-none"
              rows={3}
              placeholder={t('create.memoPlaceholder')}
            />
          </div>

          {/* Organizer Email for Notifications */}
          <div>
            <label className="block text-sm font-semibold text-[#5C4D3D] mb-2">
              {t('create.organizerEmail')}
            </label>
            <input
              type="email"
              value={organizerEmail}
              onChange={(e) => setOrganizerEmail(e.target.value)}
              className="w-full px-4 py-3 border border-[#D2C4BA] rounded-lg focus:ring-2 focus:ring-[#B39E8A] focus:border-[#B39E8A] outline-none"
              placeholder={t('create.organizerEmailPlaceholder')}
            />
            <p className="mt-1 text-xs text-[#8C7B6A]">
              {t('create.organizerEmailHint')}
            </p>
          </div>

          {/* Calendar Picker */}
          <div>
            <label className="block text-sm font-semibold text-[#5C4D3D] mb-3">
              {t('create.dateCandidates')} <span className="text-red-500">*</span>
            </label>
            <CalendarPicker
              selectedDates={selectedDates}
              onDateToggle={handleDateSelect}
              onDateSelect={handleDateSelect}
            />
          </div>

          {/* Selected Dates with Time Input */}
          {selectedDates.length > 0 && (
            <div className="bg-[#EDE4DD] rounded-lg p-4">
              <label className="block text-sm font-semibold text-[#5C4D3D] mb-3">
                {i18n.language === 'ja' ? '時間を追加（任意）' : 'Add time (optional)'}
              </label>
              <div className="space-y-2">
                {selectedDates.map(date => {
                  const dateKey = format(date, 'yyyy-MM-dd');
                  return (
                    <div key={dateKey} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 bg-white rounded-lg p-3 border border-[#D2C4BA]">
                      <div className="flex items-center justify-between sm:justify-start gap-2">
                        <span className="font-medium text-[#5C4D3D] text-sm sm:text-base sm:min-w-[100px]">
                          {formatDateForDisplay(date)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDateSelect(date)}
                          className="sm:hidden text-[#8C7B6A] hover:text-red-500 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <input
                        type="text"
                        value={timeInputs[dateKey] || ''}
                        onChange={(e) => updateTimeInput(dateKey, e.target.value)}
                        className="flex-1 px-3 py-2 border border-[#D2C4BA] rounded-lg focus:ring-2 focus:ring-[#B39E8A] focus:border-[#B39E8A] outline-none text-sm"
                        placeholder={i18n.language === 'ja' ? '例: 19:00〜' : 'e.g., 7:00 PM'}
                      />
                      <button
                        type="button"
                        onClick={() => handleDateSelect(date)}
                        className="hidden sm:block text-[#8C7B6A] hover:text-red-500 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={!title.trim() || selectedDates.length === 0 || isCreating}
              className="w-full px-6 py-4 bg-[#B39E8A] hover:bg-[#A08975] disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              {isCreating ? t('create.creating') : t('create.createEvent')}
            </button>
            {selectedDates.length === 0 && title.trim() && (
              <p className="mt-3 text-sm text-red-500 text-center">
                {t('create.noDateCandidates')}
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
