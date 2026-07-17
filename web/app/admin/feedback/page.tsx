'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/utils/api';
import { useNavigation } from "@/utils/useNavigation";
import Skeleton from "@/components/Skeleton";
import { ChevronRight } from 'lucide-react';

type Feedback = {
  id: number;
  rating: string | null;
  message: string;
  resolved: boolean;
  created_at: string;

  user: {
    id: number;
    username: string;
    avatar?: string;
  };
};

type FeedbackResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Feedback[];
};

export default function FeedbackPage() {
  const { push } = useNavigation();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [count, setCount] = useState(0);
  const [next, setNext] = useState<string | null>(null);
  const [previous, setPrevious] = useState<string | null>(null);

  const fetchFeedback = async () => {
    try {
      const data: FeedbackResponse = await apiRequest(
          `api/admin/feedback/?page=${page}&search=${encodeURIComponent(search)}`
      );
  
      setFeedback(data.results);
      setCount(data.count);
      setNext(data.next);
      setPrevious(data.previous);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [search]);

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
  
  if (loading) {
    return (
      <Skeleton />
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Feedback</h1>

      {feedback.map((f) => (
        <div
          key={f.id}
          onClick={() => push(`/admin/feedback/${f.id}`)}
          className="cursor-pointer rounded-xl bg-white dark:bg-zinc-900 p-4 shadow"
        >
      
          <div className="flex justify-between">
      
              <div>
      
                  <h3 className="font-semibold">
                      {f.user.username}
                  </h3>
      
                  <p className="text-sm text-gray-500">
                      {f.rating?.replace("_", " ")}
                  </p>
      
                  <p className="mt-2 line-clamp-2">
                      {f.message}
                  </p>
      
                  <span
                      className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs ${
                          f.resolved
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                      }`}
                  >
                      {f.resolved ? "Resolved" : "Pending"}
                  </span>
      
              </div>
      
              <ChevronRight size={18}/>
          </div>
      
        </div>
      ))}
    </div>
  );
}