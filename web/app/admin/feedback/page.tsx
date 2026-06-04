'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/utils/api';

type Feedback = {
  id: number;
  message: string;
  resolved: boolean;
};

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    try {
      const data = await apiRequest('api/admin/feedback/');
      setFeedback(data);
    } catch (err) {
      console.error(err);
    }
  };

  const resolve = async (id: number | string) => {
    try {
      await apiRequest('api/admin/feedback/resolve/', {
        method: 'POST',
        data: { feedback_id: id },
      });

      fetchFeedback();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Feedback</h1>

      {feedback.map((f) => (
        <div key={f.id} className="bg-white p-3 mb-2">
          <p>{f.message}</p>
          <p>Resolved: {f.resolved ? 'Yes' : 'No'}</p>

          <button
            onClick={() => resolve(f.id)}
            className="bg-blue-500 text-white px-3 py-1 mt-2"
          >
            Mark Resolved
          </button>
        </div>
      ))}
    </div>
  );
}