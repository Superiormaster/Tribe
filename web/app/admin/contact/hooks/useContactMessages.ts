"use client";

import { useEffect, useState } from "react";
import { apiRequest } from '@/utils/api';
import { ContactMessage, ContactResponse } from "./types";


export function useContactMessages(
  page = 1,
  search = "",
  status = ""
) {

  const [messages, setMessages] = useState<ContactMessage[]>([]);

  const [count, setCount] = useState(0);

  const [next, setNext] = useState<string | null>(null);

  const [previous, setPrevious] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);



  const fetchMessages = async () => {

    try {

      setLoading(true);


      const params = new URLSearchParams();


      params.append(
        "page",
        String(page)
      );


      if(search){
        params.append(
          "search",
          search
        );
      }


      if(status){
        params.append(
          "status",
          status
        );
      }


      const data: ContactResponse = await apiRequest(
        `api/admin/contacts/?${params.toString()}`
      );

      setMessages(data.results);

      setCount(data.count);

      setNext(data.next);

      setPrevious(data.previous);


    } catch(err:any){

      setError(
        err.message
      );

    } finally {

      setLoading(false);

    }

  };


  useEffect(()=>{

    fetchMessages();

  },[
    page,
    search,
    status
  ]);



  return {
    messages,
    count,
    next,
    previous,
    loading,
    error,
    refetch: fetchMessages,
  };

}