import { useEffect, useState } from "react"

export default function StatCard({ title, value }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = Number(value);
    if (!end) return;

    const timer = setInterval(() => {
      start += Math.ceil(end / 20);
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 30);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <div className="bg-[#111827] border border-white/10 rounded-xl p-5 shadow-lg p-6 text-center">
      <p className="text-sm text-gray-400 uppercase tracking-wide">{title}</p>
      <p className="text-3xl font-bold text-white mt-2">{count}</p>
    </div>
  );
}