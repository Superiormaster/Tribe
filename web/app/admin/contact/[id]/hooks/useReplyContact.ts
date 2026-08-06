"use client";

import { useState } from "react";
import { apiRequest } from '@/utils/api';

type ReplyPayload = {
  message: string;
};

export function useReplyContact(
  messageId: string,
  onSuccess?: () => void,
) {

  const [loading, setLoading] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState(false);


  const sendReply = async (
    payload: ReplyPayload
  ) => {

    try {

      setLoading(true);

      setError(null);

      setSuccess(false);

      const res = await apiRequest(
        `api/admin/contacts/${messageId}/reply/`,
        {
          method: "POST",
          data: payload,
        }
      );

      setSuccess(true);

      onSuccess?.();

    } catch (err: any) {

      setError(err.message);

    } finally {

      setLoading(false);

    }

  };


  return {

    sendReply,

    loading,

    error,

    success,

  };

}