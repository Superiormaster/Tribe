'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/utils/api';

type TribeRequest = {
  id: number;
  name: string;
  description: string;
};

export default function TribeRequests() {
  const [requests, setRequests] = useState<TribeRequest[]>([]);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const data = await apiRequest('api/admin/tribe-requests/');
      setRequests(data);
    } catch (err) {
      console.error(err);
    }
  };

  const approve = async (id: number | string) => {
    try {
      await apiRequest('api/admin/tribe-requests/approve/', {
        method: 'POST',
        data: { request_id: id },
      });

      fetchRequests();
    } catch (err) {
      console.error(err);
    }
  };

  const reject = async (id: number | string) => {
    try {
      await apiRequest('api/admin/tribe-requests/reject/', {
        method: 'POST',
        data: { request_id: id },
      });

      fetchRequests();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Tribe Requests</h1>

      {requests.map((t) => (
        <div key={t.id} className="bg-white p-3 mb-2">
          <p className="font-bold">{t.name}</p>
          <p>{t.description}</p>

          <div className="flex gap-2 mt-2">
            <button
              onClick={() => approve(t.id)}
              className="bg-green-500 text-white px-3 py-1"
            >
              Approve
            </button>

            <button
              onClick={() => reject(t.id)}
              className="bg-red-500 text-white px-3 py-1"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}