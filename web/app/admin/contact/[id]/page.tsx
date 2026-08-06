"use client";


import { useParams } from "next/navigation";


import { useContactDetail } 
from "./hooks/useContactDetail";
import ReplyBox from "./components/ReplyBox";
import ReplyHistory from "./components/ReplyHistory";
import { useReplyContact } from "./hooks/useReplyContact";

import ContactHeader 
from "./components/ContactHeader";


import ContactMessageCard 
from "./components/ContactMessageCard";


import ContactActions 
from "./components/ContactActions";



export default function ContactDetailPage(){


const params = useParams();


const id = params.id as string;



const {
 message,
 loading,
 error,
 updateMessage,
 refetch,
} = useContactDetail(id);

const reply = useReplyContact(
  id,
  refetch
);


if(loading){

return (

<div className="
p-6
animate-pulse
">

<div className="
h-10
bg-gray-200
rounded
mb-5
"/>


<div className="
h-64
bg-gray-200
rounded
"/>


</div>

);

}

if(error || !message){

return (

<div className="
p-6
text-red-500
">

{
error ||
"Message not found"
}

</div>

);

}

return (

<div className="p-1 max-w-7xl mx-auto overflow-x-hidden">
<ContactHeader
name={message.name}
email={message.email}
status={message.status}
/>

<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

  <div className="lg:col-span-2 space-y-6">
    <ContactMessageCard message={message} />

    <ReplyHistory
      replies={message.replies ?? []}
    />

    <ReplyBox
      loading={reply.loading}
      success={reply.success}
      error={reply.error}
      onSend={async (text) => {
        await reply.sendReply({
          message: text,
        });
      }}
    />
  </div>

  <div>
    <ContactActions
      status={message.status}
      adminNote={message.admin_note}
      onUpdate={updateMessage}
    />
  </div>

</div>

</div>

);


}