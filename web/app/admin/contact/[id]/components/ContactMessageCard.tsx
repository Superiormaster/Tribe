"use client";


import type { ContactMessage } from "../../hooks/types";


type Props = {

message:ContactMessage;

};



export default function ContactMessageCard({
message
}:Props){



return (

<div className="
bg-white
dark:bg-gray-900
border
rounded-xl
p-3
space-y-5
">



<div>


<h2 className="
font-semibold text-gray-500
text-lg
">

{message.subject}

</h2>


<p className="
text-xs
text-gray-500
mt-1
">

Sent:

{" "}

{
new Date(
message.created_at
).toLocaleString()
}

</p>

</div>

<div
className="
border-t
pt-5
whitespace-pre-wrap
break-words
overflow-hidden
text-gray-700
dark:text-gray-200
">

{message.message}

</div>

{
message.admin_note && (

<div className="
border-t
pt-5
">

<h3 className="
font-semibold
mb-2
">

Admin Note

</h3>


<p className="
text-sm
text-gray-600
dark:text-gray-300
">

{message.admin_note}

</p>


</div>

)

}



</div>

);

}