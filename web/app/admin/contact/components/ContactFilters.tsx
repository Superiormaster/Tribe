"use client";

type Props = {
  search: string;
  status: string;

  setSearch: (value: string) => void;

  setStatus: (value: string) => void;
};


export default function ContactFilters({
  search,
  status,
  setSearch,
  setStatus,
}: Props) {


  return (
    <div className="flex flex-col md:flex-row gap-3 mb-5">

      <input
        value={search}
        onChange={(e)=>setSearch(e.target.value)}
        placeholder="Search name, email, subject..."
        className="
          border rounded-lg px-4 py-2
          bg-white dark:bg-gray-900
          w-full md:w-80
        "
      />


      <select
        value={status}
        onChange={(e)=>setStatus(e.target.value)}
        className="
          border rounded-lg px-4 py-2
          bg-white dark:bg-gray-900
        "
      >

        <option value="">
          All Status
        </option>

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
  );
}