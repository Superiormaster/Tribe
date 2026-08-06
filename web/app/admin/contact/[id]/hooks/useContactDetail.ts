"use client";

import { useEffect, useState } from "react";
import { apiRequest } from '@/utils/api';
import type { ContactMessage } from "../../hooks/types";


export function useContactDetail(
  id: string
) {

  const [message, setMessage] =
    useState<ContactMessage | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);



  const fetchMessage = async () => {

    try {

      setLoading(true);


      const data = await apiRequest(
        `api/admin/contacts/${id}/`
      );

      setMessage(data);


    } catch(err:any){

      setError(
        err.message
      );


    } finally {

      setLoading(false);

    }

  };




  const updateMessage = async (
    payload:{
      status?:string;
      admin_note?:string;
    }
  )=>{


    const data = await apiRequest(
      `api/admin/contacts/${id}/update/`,
      {
        method:"PATCH",
        data: payload,
      }
    );

    setMessage(data);


    return data;

  };

  useEffect(()=>{

    fetchMessage();

  },[id]);


  return {

    message,

    loading,

    error,

    refetch:fetchMessage,

    updateMessage,

  };

}