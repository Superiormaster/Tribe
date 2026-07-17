'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/utils/api';
import { useParams } from "next/navigation";
import { useNavigation } from "@/utils/useNavigation";
import Skeleton from "@/components/Skeleton";

type Feedback = {
    id: number;
    rating: string | null;
    message: string;
    resolved: boolean;
    created_at: string;

    user: {
        id: number;
        username: string;
        email: string;
        avatar?: string;
    };
};

export default function FeedbackPage() {
  const params = useParams();
  const { push } = useNavigation();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchFeedback = async () => {
    try {
      const res = await apiRequest(
        `api/admin/feedback-details/${params.id}/`
      );
  
      setFeedback(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

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
  
  if (!feedback) {
    return (
      <div className="p-8">
        Feedback not found.
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">
          Feedback Details
      </h1>
      
      <div className="rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow">
      
          <div className="flex justify-between">
      
              <h2 className="text-xl font-semibold">
                  Submitted By
              </h2>
      
              <button
                  onClick={() => push(`/admin/users/${feedback.user.id}`)}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-white"
              >
                  View User
              </button>
      
          </div>
      
          <div className="mt-5 flex gap-4">
      
              {feedback.user.avatar ? (
                  <img
                      src={feedback.user.avatar}
                      className="h-16 w-16 rounded-full object-cover"
                  />
              ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-300 font-bold">
                      {feedback.user.username[0].toUpperCase()}
                  </div>
              )}
      
              <div>
      
                  <h3 className="font-semibold">
                      {feedback.user.username}
                  </h3>
      
                  <p>{feedback.user.email}</p>
      
              </div>
      
          </div>
      
      </div>
      
      <div className="rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow mt-6">
      
          <div className="grid md:grid-cols-2 gap-5">
      
              <div>
      
                  <p className="text-sm text-gray-500">
                      Rating
                  </p>
      
                  <p className="font-semibold capitalize">
                      {feedback.rating?.replace(/_/g, " ") || "No rating"}
                  </p>
      
              </div>
      
              <div>
      
                  <p className="text-sm text-gray-500">
                      Status
                  </p>
      
                  <span
                      className={`inline-flex rounded-full px-3 py-1 ${
                          feedback.resolved
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                      }`}
                  >
                      {feedback.resolved ? "Resolved" : "Pending"}
                  </span>
      
              </div>
      
              <div>
      
                  <p className="text-sm text-gray-500">
                      Submitted
                  </p>
      
                  <p>
                      {new Date(feedback.created_at).toLocaleString()}
                  </p>
      
              </div>
      
          </div>
      
          <div className="mt-6">
      
              <p className="text-sm text-gray-500 mb-2">
                  Feedback
              </p>
      
              <div className="rounded-xl border p-4 whitespace-pre-wrap">
                  {feedback.message || "No message provided."}
              </div>
      
          </div>
      
      </div>
    </div>
  );
}