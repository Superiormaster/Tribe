export default function DateFilter({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {["7", "30", "90"].map(d => (
        <button
          key={d}
          onClick={() => onChange(d)}
          className={`px-3 py-1 text-sm rounded-md border
            ${value === d
              ? "bg-cyan-500 text-black border-cyan-500"
              : "border-white/10 text-gray-400 hover:bg-white/5"}
          `}
        >
          {d}d
        </button>
      ))}
    </div>
  );
}