import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import type { Availability } from '../types';

// Shorten URL using TinyURL API
async function shortenUrl(longUrl: string): Promise<string> {
  try {
    const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
    if (response.ok) {
      return await response.text();
    }
  } catch (error) {
    console.error('Failed to shorten URL:', error);
  }
  return longUrl; // Return original URL if shortening fails
}

const AvailabilityIcon = ({ availability }: { availability: Availability }) => {
  switch (availability) {
    case 'available':
      return <span className="w-8 h-8 rounded-full bg-green-400 text-white flex items-center justify-center text-lg font-bold">○</span>;
    case 'maybe':
      return <span className="w-8 h-8 rounded-full bg-amber-400 text-white flex items-center justify-center text-lg font-bold">△</span>;
    case 'unavailable':
      return <span className="w-8 h-8 rounded-full bg-red-400 text-white flex items-center justify-center text-lg font-bold">×</span>;
    default:
      return <span className="w-8 h-8 rounded-full bg-[#D2C4BA] text-white flex items-center justify-center text-lg">-</span>;
  }
};

export function EventPage() {
  const { t } = useTranslation();
  const { currentEventId, getEvent, getShareableUrl, setCurrentView, setEditingResponseId } = useApp();
  const [copied, setCopied] = useState(false);
  const [shortUrl, setShortUrl] = useState<string>('');
  const [isShortening, setIsShortening] = useState(false);

  const event = currentEventId ? getEvent(currentEventId) : undefined;
  const shareUrl = event ? getShareableUrl(event) : '';

  // Shorten URL when shareUrl changes
  useEffect(() => {
    if (shareUrl) {
      setIsShortening(true);
      shortenUrl(shareUrl).then(shortened => {
        setShortUrl(shortened);
        setIsShortening(false);
      });
    }
  }, [shareUrl]);

  const displayUrl = shortUrl || shareUrl;

  const summary = useMemo(() => {
    if (!event) return {};

    const result: Record<string, { available: number; maybe: number; unavailable: number; score: number }> = {};

    event.dateCandidates.forEach(dc => {
      result[dc.id] = { available: 0, maybe: 0, unavailable: 0, score: 0 };
    });

    event.participants.forEach(p => {
      Object.entries(p.responses).forEach(([dateId, availability]) => {
        if (result[dateId]) {
          if (availability === 'available') {
            result[dateId].available++;
            result[dateId].score += 2;
          } else if (availability === 'maybe') {
            result[dateId].maybe++;
            result[dateId].score += 1;
          } else if (availability === 'unavailable') {
            result[dateId].unavailable++;
          }
        }
      });
    });

    return result;
  }, [event]);

  const bestDateIds = useMemo(() => {
    if (!event || event.participants.length === 0) return [];

    const maxScore = Math.max(...Object.values(summary).map(s => s.score));
    if (maxScore === 0) return [];

    return Object.entries(summary)
      .filter(([_, s]) => s.score === maxScore)
      .map(([id]) => id);
  }, [summary, event]);

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="text-center py-12">
          <p className="text-gray-500">Event not found</p>
        </div>
      </div>
    );
  }

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(displayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const handleRespond = () => {
    setEditingResponseId(null);
    setCurrentView('respond');
  };

  const handleEditResponse = (responseId: string) => {
    setEditingResponseId(responseId);
    setCurrentView('respond');
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 pb-8 bg-[#F9F7F5] min-h-screen">
      {/* Event Info Card */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-[#B39E8A] px-6 py-5">
          <h1 className="text-xl font-bold text-white">
            {event.title}
          </h1>
        </div>

        <div className="p-6">
          {event.memo && (
            <div className="bg-[#F9F7F5] rounded-lg p-4 mb-4">
              <p className="text-[#5C4D3D] whitespace-pre-wrap">
                {event.memo}
              </p>
            </div>
          )}

          {/* Share URL */}
          <div className="bg-[#EDE4DD] rounded-lg p-4">
            <p className="text-sm font-semibold text-[#5C4D3D] mb-3">
              {t('event.shareMessage')}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                readOnly
                value={isShortening ? 'Shortening URL...' : displayUrl}
                className="flex-1 px-3 py-2 bg-white border border-[#D2C4BA] rounded-lg text-sm text-[#5C4D3D] truncate"
              />
              <button
                onClick={handleCopyUrl}
                disabled={isShortening}
                className={`px-4 py-2 ${copied ? 'bg-green-400' : 'bg-[#B39E8A] hover:bg-[#A08975]'} text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap disabled:opacity-50`}
              >
                {copied ? t('event.copiedUrl') : t('event.copyUrl')}
              </button>
            </div>
          </div>

          {/* Respond Button */}
          <div className="mt-6">
            <button
              onClick={handleRespond}
              className="w-full px-6 py-4 bg-[#B39E8A] hover:bg-[#A08975] text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              {t('event.respond')}
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-[#B39E8A] px-6 py-4">
          <h2 className="font-semibold text-white text-lg">
            {t('event.participants')} ({event.participants.length})
          </h2>
        </div>

        {event.participants.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[#8C7B6A]">{t('event.noResponses')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px]">
              <thead>
                <tr className="bg-[#F9F7F5]">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[#5C4D3D] sticky left-0 bg-[#F9F7F5] z-10 min-w-[120px]">
                    {t('respond.yourName')}
                  </th>
                  {event.dateCandidates.map(dc => (
                    <th
                      key={dc.id}
                      className={`px-4 py-3 text-center text-sm font-semibold whitespace-nowrap ${
                        bestDateIds.includes(dc.id)
                          ? 'bg-[#EDE4DD] text-[#5C4D3D]'
                          : 'text-[#5C4D3D]'
                      }`}
                    >
                      {bestDateIds.includes(dc.id) && (
                        <span className="block text-[#B39E8A] text-xs mb-1">{t('event.best')}</span>
                      )}
                      {dc.datetime}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-sm font-semibold text-[#5C4D3D] min-w-[100px]">
                    {t('respond.comment')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {event.participants.map((participant, index) => (
                  <tr
                    key={participant.id}
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-[#F9F7F5]'} hover:bg-[#EDE4DD] cursor-pointer transition-colors`}
                    onClick={() => handleEditResponse(participant.id)}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-[#5C4D3D] sticky left-0 bg-inherit z-10">
                      <span className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-[#B39E8A] flex items-center justify-center text-white text-xs font-bold">
                          {participant.name.charAt(0).toUpperCase()}
                        </span>
                        {participant.name}
                      </span>
                    </td>
                    {event.dateCandidates.map(dc => (
                      <td
                        key={dc.id}
                        className={`px-4 py-3 ${
                          bestDateIds.includes(dc.id) ? 'bg-[#EDE4DD]/50' : ''
                        }`}
                      >
                        <div className="flex justify-center">
                          <AvailabilityIcon availability={participant.responses[dc.id]} />
                        </div>
                      </td>
                    ))}
                    <td className="px-4 py-3 text-sm text-[#8C7B6A] max-w-[200px] truncate">
                      {participant.comment || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Summary Row */}
              <tfoot>
                <tr className="bg-[#EDE4DD] border-t-2 border-[#D2C4BA]">
                  <td className="px-4 py-4 text-sm font-semibold text-[#5C4D3D] sticky left-0 bg-[#EDE4DD] z-10">
                    {t('event.summary')}
                  </td>
                  {event.dateCandidates.map(dc => (
                    <td
                      key={dc.id}
                      className={`px-4 py-4 text-center ${
                        bestDateIds.includes(dc.id) ? 'bg-[#D2C4BA]/30' : ''
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1 text-sm font-medium">
                        <span className="text-green-500">○ {summary[dc.id]?.available || 0}</span>
                        <span className="text-amber-500">△ {summary[dc.id]?.maybe || 0}</span>
                        <span className="text-red-400">× {summary[dc.id]?.unavailable || 0}</span>
                      </div>
                    </td>
                  ))}
                  <td className="px-4 py-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
