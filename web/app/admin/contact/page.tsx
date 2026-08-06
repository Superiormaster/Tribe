"use client";

import { useState, useEffect } from "react";

import ContactFilters from "./components/ContactFilters";
import ContactTable from "./components/ContactTable";
import ContactPagination from "./components/ContactPagination";

import { useContactMessages } from "./hooks/useContactMessages";


export default function ContactsPage() {

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [searchValue, setSearchValue] =
    useState("");

  // debounce search
  useEffect(()=>{
    const timer = setTimeout(()=>{
      setSearch(searchValue);
      setPage(1);
    },500);
    return ()=>clearTimeout(timer);
  },[searchValue]);

  const {
    messages,
    count,
    next,
    previous,
    loading,
    error,
  } = useContactMessages(
    page,
    search,
    status
  );

  const handleStatus = (
    value:string
  )=>{
    setStatus(value);
    setPage(1);
  };

  return (

<div className="
p-6 text-gray-600 dark:text-gray-500
space-y-6
">


{/* Header */}

<div>

<h1 className="
text-2xl text-gray-700 dark:text-gray-300
font-bold
">

Contact Messages

</h1>

<p className="
text-gray-500
text-sm
">

Manage visitor enquiries and messages

</p>

</div>

{/* Stats */}

<div className="
grid
grid-cols-2
md:grid-cols-4
gap-4
">


<div className="
rounded-xl
border
p-4
bg-white
dark:bg-gray-900
">

<p className="text-sm text-gray-500">
Total
</p>

<h2 className="text-2xl font-bold">
{count}
</h2>

</div>

<div className="
rounded-xl
border
p-4
bg-white
dark:bg-gray-900
">

<p className="text-sm text-gray-500">
Showing
</p>

<h2 className="text-2xl font-bold">
{messages.length}
</h2>


</div>


</div>

<ContactFilters

search={searchValue}

status={status}

setSearch={setSearchValue}

setStatus={handleStatus}

/>

{
loading && (

<div className="
space-y-3
">

{
[1,2,3,4].map(i=>(

<div

key={i}

className="
h-16
rounded-lg
bg-gray-200
dark:bg-gray-800
animate-pulse
"

/>

))

}

</div>

)

}

{
error && (

<div className="
p-4
rounded-lg
bg-red-100
text-red-600
">

{error}

</div>

)

}

{
!loading && !error && (

<ContactTable

messages={messages}

/>

)
}

<ContactPagination

page={page}

setPage={setPage}

next={next}

previous={previous}

/>
</div>

  );

}