"use client";

type Reply = {

  id: number;

  message: string;

  sent_by_name: string;

  created_at: string;

};

type Props = {

  replies: Reply[];

};


export default function ReplyHistory({

  replies,

}: Props) {

if (!replies.length) {

return (

<div className="
rounded-xl
border
p-6
bg-white
dark:bg-gray-900
">

<p className="text-gray-500">

No replies yet.

</p>

</div>

);

}


return (

<div className="
bg-white
dark:bg-gray-900
rounded-xl
border
p-6
space-y-5
">

<h2 className="
font-semibold
text-lg
">

Reply History

</h2>



{
replies.map(reply => (

<div

key={reply.id}

className="
border-b
last:border-none
pb-4
"

>

<div className="
flex
justify-between
text-sm
mb-2
">

<span className="font-medium">

{reply.sent_by_name}

</span>

<span className="text-gray-500">

{
new Date(
reply.created_at
).toLocaleString()
}

</span>

</div>


<p className="
whitespace-pre-wrap
text-gray-700
dark:text-gray-200
">

{reply.message}

</p>

</div>

))
}

</div>

);

}