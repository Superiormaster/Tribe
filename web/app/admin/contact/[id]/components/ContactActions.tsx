"use client";

import { useState } from "react";


type Props = {

  status:string;

  adminNote:string;

  onUpdate:(data:{
    status?:string;
    admin_note?:string;
  })=>Promise<void>;

};



export default function ContactActions({
  status,
  adminNote,
  onUpdate,
}:Props){
const [newStatus,setNewStatus] =
  useState(status);
const [note,setNote] =
  useState(adminNote || "");
const [saving,setSaving] =
  useState(false);

const handleSave = async()=>{

  try{
    setSaving(true);
    await onUpdate({
      status:newStatus,
      admin_note:note,
    });
  }finally{
    setSaving(false);
  }
};

return (

<div className="
bg-white
dark:bg-gray-900
border
rounded-xl
p-6
space-y-5
">

<h2 className="
font-semibold
text-lg
">

Actions

</h2>

<div>

<label className="
text-sm
text-gray-500
">

Status

</label>


<select

value={newStatus}

onChange={(e)=>
setNewStatus(e.target.value)
}

className="
w-full
mt-2
border
rounded-lg
px-3
py-2
bg-transparent
"

>

<option value="new">
New
</option>

<option value="read">
Read
</option>

<option value="replied">
Replied
</option>

<option value="closed">
Closed
</option>


</select>


</div>





<div>

<label className="
text-sm
text-gray-500
">

Admin Note

</label>


<textarea

value={note}

onChange={(e)=>
setNote(e.target.value)
}

rows={5}

placeholder="Add internal note..."

className="
w-full
mt-2
border
rounded-lg
p-3
bg-transparent
"

/>


</div>




<button

onClick={handleSave}

disabled={saving}

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
saving
?
"Saving..."
:
"Save Changes"
}

</button>



</div>

);


}