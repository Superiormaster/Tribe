"use client";

import AppLink from "@/components/AppLink";


type Props = {
  name:string;
  email:string;
  status:string;
};



export default function ContactHeader({
  name,
  email,
  status,
}:Props){


return (

<div className="
flex
items-center
justify-between
mb-6
">


<div>


<AppLink

href="/admin/contacts"

className="
text-sm
text-indigo-600
hover:underline
"

>

← Back to messages

</AppLink>



<h1 className="
text-2xl text-gray-700 dark:text-gray-300
font-bold
mt-3
">

{name}

</h1>


<p className="
text-gray-500
">

{email}

</p>


</div>




<span

className={`
px-4
py-2
rounded-full
text-sm

${
status==="new"
?
"bg-blue-100 text-blue-600"

:
status==="replied"
?
"bg-green-100 text-green-600"

:
status==="closed"
?
"bg-gray-100 text-gray-600"

:
"bg-yellow-100 text-yellow-600"

}

`}

>

{status}

</span>


</div>

);


}