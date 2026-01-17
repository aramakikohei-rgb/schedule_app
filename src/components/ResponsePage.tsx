import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import type { Availability } from '../types';

export function ResponsePage() {
  const { t } = useTranslation();
  const {
    currentEventId,
    editingResponseId,
    getEvent,
    setCurrentView,
    addParticipantResponse,
    updateParticipantResponse,
    deleteParticipantResponse,
  } = useApp();

  const event = currentEventId ? getEvent(currentEventId) : undefined;
  const editingResponse = editingResponseId
    ? event?.participants.find(p => p.id === editingResponseId)
    : undefined;

  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [responses, setResponses] = useState<Record<string, Availability>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with editing data
  useEffect(() => {
    if (editingResponse) {
      setName(editingResponse.name);
      setComment(editingResponse.comment);
      setResponses(editingResponse.responses);
    } else if (event) {
      // Initialize empty responses
      const initial: Record<string, Availability> = {};
      event.dateCandidates.forEach(dc => {
        initial[dc.id] = null;
      });
      setResponses(initial);
    }
  }, [editingResponse, event]);

  if (!event) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="text-center py-12">
          <p className="text-gray-500">Event not found</p>
        </div>
      </div>
    );
  }

  const setAvailability = (dateId: string, availability: Availability) => {
    setResponses(prev => ({
      ...prev,
      [dateId]: prev[dateId] === availability ? null : availability,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);

    try {
      if (editingResponse) {
        await updateParticipantResponse(event.id, editingResponse.id, name.trim(), comment.trim(), responses);
      } else {
        await addParticipantResponse(event.id, name.trim(), comment.trim(), responses);
      }
      setCurrentView('event');
    } catch (error) {
      console.error('Failed to submit response:', error);
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (editingResponse && window.confirm(t('respond.confirmDelete'))) {
      try {
        await deleteParticipantResponse(event.id, editingResponse.id);
        setCurrentView('event');
      } catch (error) {
        console.error('Failed to delete response:', error);
      }
    }
  };

  const handleBack = () => {
    setCurrentView('event');
  };

  return (
    <div className="max-w-2xl mx-auto p-4 pb-8 bg-[#F9F7F5] min-h-screen">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-[#B39E8A] px-6 py-5">
          <button
            onClick={handleBack}
            className="text-white/80 hover:text-white text-sm mb-2 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('common.back')}
          </button>
          <h1 className="text-xl font-bold text-white">
            {event.title}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name Input */}
          <div>
            <label className="block text-sm font-semibold text-[#5C4D3D] mb-2">
              {t('respond.yourName')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-[#D2C4BA] rounded-lg focus:ring-2 focus:ring-[#B39E8A] focus:border-[#B39E8A] outline-none"
              placeholder={t('respond.namePlaceholder')}
              required
            />
          </div>

          {/* Availability Selection */}
          <div className="bg-[#EDE4DD] rounded-lg p-4">
            <label className="block text-sm font-semibold text-[#5C4D3D] mb-3">
              {t('respond.selectAvailability')}
            </label>
            <div className="space-y-3">
              {event.dateCandidates.map(dc => (
                <div
                  key={dc.id}
                  className="flex items-center gap-3 p-3 bg-white rounded-lg border border-[#D2C4BA]"
                >
                  <span className="flex-1 text-sm font-medium text-[#5C4D3D]">{dc.datetime}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAvailability(dc.id, 'available')}
                      className={`w-12 h-12 rounded-lg border-2 transition-all flex items-center justify-center text-lg font-bold ${
                        responses[dc.id] === 'available'
                          ? 'border-green-400 bg-green-400 text-white'
                          : 'border-[#D2C4BA] bg-white text-green-400 hover:border-green-300'
                      }`}
                      title={t('availability.available')}
                    >
                      ○
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvailability(dc.id, 'maybe')}
                      className={`w-12 h-12 rounded-lg border-2 transition-all flex items-center justify-center text-lg font-bold ${
                        responses[dc.id] === 'maybe'
                          ? 'border-amber-400 bg-amber-400 text-white'
                          : 'border-[#D2C4BA] bg-white text-amber-400 hover:border-amber-300'
                      }`}
                      title={t('availability.maybe')}
                    >
                      △
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvailability(dc.id, 'unavailable')}
                      className={`w-12 h-12 rounded-lg border-2 transition-all flex items-center justify-center text-lg font-bold ${
                        responses[dc.id] === 'unavailable'
                          ? 'border-red-400 bg-red-400 text-white'
                          : 'border-[#D2C4BA] bg-white text-red-400 hover:border-red-300'
                      }`}
                      title={t('availability.unavailable')}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
              <span className="flex items-center gap-1 px-3 py-1 bg-green-50 text-green-600 rounded-full">
                ○ {t('availability.available')}
              </span>
              <span className="flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-600 rounded-full">
                △ {t('availability.maybe')}
              </span>
              <span className="flex items-center gap-1 px-3 py-1 bg-red-50 text-red-500 rounded-full">
                × {t('availability.unavailable')}
              </span>
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-semibold text-[#5C4D3D] mb-2">
              {t('respond.comment')}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-4 py-3 border border-[#D2C4BA] rounded-lg focus:ring-2 focus:ring-[#B39E8A] focus:border-[#B39E8A] outline-none resize-none"
              rows={2}
              placeholder={t('respond.commentPlaceholder')}
            />
          </div>

          {/* Actions */}
          <div className="pt-4 space-y-3">
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="w-full px-6 py-4 bg-[#B39E8A] hover:bg-[#A08975] disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              {isSubmitting ? t('respond.submitting') : editingResponse ? t('respond.update') : t('respond.submit')}
            </button>

            {editingResponse && (
              <button
                type="button"
                onClick={handleDelete}
                className="w-full px-6 py-3 bg-red-50 hover:bg-red-100 text-red-500 font-semibold rounded-xl transition-colors"
              >
                {t('respond.deleteResponse')}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
