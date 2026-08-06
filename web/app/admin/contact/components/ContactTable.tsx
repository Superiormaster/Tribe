"use client";

import type { ContactMessage } from "../hooks/types";
import AppLink from "@/components/AppLink";


type Props = {
  messages: ContactMessage[];
};



export default function ContactTable({
  messages
}: Props){


return (

<div className="
overflow-x-auto
bg-white
dark:bg-gray-900
rounded-xl
border
">

<table className="w-full text-sm">


<thead>

<tr className="
border-b
text-left
text-gray-500
">

<th className="p-4">
Name
</th>

<th className="p-4">
Subject
</th>

<th className="p-4">
Status
</th>

<th className="p-4">
Date
</th>

<th className="p-4">
Action
</th>

</tr>

</thead>



<tbody>


{
messages.map((message)=>(

<tr
key={message.id}
className="
border-b
hover:bg-gray-50
dark:hover:bg-gray-800
"
>


<td className="p-4">

<div className="font-medium">
{message.name}
</div>

<div className="text-xs text-gray-500">
{message.email}
</div>

</td>



<td className="p-4">

<div className="font-medium">

{message.subject}

</div>


<p className="
text-xs
text-gray-500
line-clamp-1
">

{message.message}

</p>


</td>




<td className="p-4">


<span
className={`
px-3 py-1 rounded-full text-xs

${
message.status === "new"
?
"bg-blue-100 text-blue-600"
:
message.status === "replied"
?
"bg-green-100 text-green-600"
:
message.status === "closed"
?
"bg-gray-100 text-gray-600"
:
"bg-yellow-100 text-yellow-600"

}
`}
>

{message.status}

</span>


</td>




<td className="p-4 text-gray-500">

{
new Date(
message.created_at
).toLocaleDateString()
}

</td>



<td className="p-4">


<AppLink

href={`/admin/contact/${message.id}`}

className="
text-indigo-600
hover:underline
"

>

View

</AppLink>


</td>


</tr>

))

}



</tbody>


</table>


</div>

);


}