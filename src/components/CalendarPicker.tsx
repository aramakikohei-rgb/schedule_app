import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  isBefore,
  startOfDay,
} from 'date-fns';
import { ja, enUS } from 'date-fns/locale';

interface CalendarPickerProps {
  selectedDates: Date[];
  onDateToggle?: (date: Date) => void;
  onDateSelect: (date: Date) => void;
}

export function CalendarPicker({ selectedDates, onDateSelect }: CalendarPickerProps) {
  const { t, i18n } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const locale = i18n.language === 'ja' ? ja : enUS;

  const weekdays = [
    t('calendar.weekdays.sun'),
    t('calendar.weekdays.mon'),
    t('calendar.weekdays.tue'),
    t('calendar.weekdays.wed'),
    t('calendar.weekdays.thu'),
    t('calendar.weekdays.fri'),
    t('calendar.weekdays.sat'),
  ];

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const isDateSelected = (date: Date) => {
    return selectedDates.some(d => isSameDay(d, date));
  };

  const formatMonthYear = () => {
    if (i18n.language === 'ja') {
      return format(currentMonth, 'yyyy年M月', { locale });
    }
    return format(currentMonth, 'MMMM yyyy', { locale });
  };

  const today = startOfDay(new Date());

  return (
    <div className="bg-[#EDE4DD] rounded-lg p-4 border border-[#D2C4BA]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-white hover:bg-[#F9F7F5] text-[#B39E8A] border border-[#D2C4BA] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-base font-semibold text-[#5C4D3D]">
          {formatMonthYear()}
        </h3>
        <button
          type="button"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-white hover:bg-[#F9F7F5] text-[#B39E8A] border border-[#D2C4BA] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekdays.map((day, index) => (
          <div
            key={day}
            className={`text-center text-xs font-semibold py-2 ${
              index === 0 ? 'text-red-400' : index === 6 ? 'text-blue-400' : 'text-[#8C7B6A]'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = isDateSelected(day);
          const isTodayDate = isToday(day);
          const isPast = isBefore(day, today);
          const dayOfWeek = day.getDay();

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => !isPast && onDateSelect(day)}
              disabled={isPast}
              className={`
                h-10 rounded-lg text-sm font-medium transition-colors
                ${!isCurrentMonth ? 'text-[#D2C4BA]' : ''}
                ${isPast ? 'text-[#D2C4BA] cursor-not-allowed' : 'cursor-pointer'}
                ${isSelected && !isPast
                  ? 'bg-[#B39E8A] text-white'
                  : isCurrentMonth && !isPast
                  ? 'bg-white hover:bg-[#F9F7F5] border border-[#D2C4BA]'
                  : 'bg-[#F9F7F5]'
                }
                ${isTodayDate && !isSelected ? 'ring-2 ring-[#B39E8A]' : ''}
                ${dayOfWeek === 0 && !isSelected && isCurrentMonth && !isPast ? 'text-red-400' : ''}
                ${dayOfWeek === 6 && !isSelected && isCurrentMonth && !isPast ? 'text-blue-400' : ''}
              `}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>

      {/* Selected Count */}
      {selectedDates.length > 0 && (
        <div className="mt-4 text-center">
          <span className="inline-flex items-center px-4 py-2 bg-[#B39E8A] text-white rounded-full text-sm font-medium">
            {selectedDates.length} {i18n.language === 'ja' ? '日選択中' : 'dates selected'}
          </span>
        </div>
      )}
    </div>
  );
}
