"use client";


type Props = {

page:number;

setPage:(page:number)=>void;

next:string|null;

previous:string|null;

};



export default function ContactPagination({

page,

setPage,

next,

previous,

}:Props){


return (

<div className="
flex
justify-between
items-center
mt-5
">


<button

disabled={!previous}

onClick={()=>setPage(page-1)}

className="
px-4
py-2
rounded-lg
border
disabled:opacity-40
"

>

Previous

</button>



<span className="text-sm">

Page {page}

</span>



<button

disabled={!next}

onClick={()=>setPage(page+1)}

className="
px-4
py-2
rounded-lg
border
disabled:opacity-40
"

>

Next

</button>



</div>

);

}