"use client";

import { useState } from "react";

type Props = {

  loading: boolean;

  success: boolean;

  error: string | null;

  onSend: (
    message: string
  ) => Promise<void>;

};


export default function ReplyBox({

  loading,

  success,

  error,

  onSend,

}: Props) {

  const [message, setMessage] =
    useState("");



  const handleSubmit = async () => {

    if (!message.trim()) return;

    await onSend(message);

    setMessage("");

  };



  return (

<div className="
bg-white
dark:bg-gray-900
border
rounded-xl
p-6
space-y-4
">

<h2 className="
font-semibold
text-lg
">

Reply

</h2>


<textarea

rows={8}

value={message}

onChange={(e)=>
setMessage(e.target.value)
}

placeholder="
Write your reply to the visitor...
"
className="
w-full
min-w-0
border
rounded-lg
p-3
bg-transparent
resize-none
"
/>



{error && (

<div className="
text-red-500
text-sm
">

{error}

</div>

)}



{success && (

<div className="
text-green-600
text-sm
">

Reply sent successfully.

</div>

)}



<button

onClick={handleSubmit}

disabled={
loading ||
!message.trim()
}

className="
bg-indigo-600
text-white
px-5
py-2
rounded-lg
disabled:opacity-50
"

>

{
loading
?
"Sending..."
:
"Send Reply"
}

</button>


</div>

  );

}