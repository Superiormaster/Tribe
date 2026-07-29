"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  console.error(error);

  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1>Something went wrong</h1>

            <button onClick={() => reset()}>
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}