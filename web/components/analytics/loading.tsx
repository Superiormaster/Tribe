import LoadingSkeleton from "@/components/analytics/LoadingSkeleton";

export default function Loading() {
  return (
    <main
      className="
        relative
        min-h-screen
        overflow-hidden
        bg-gray-200
        dark:bg-gray-900
      "
    >
      {/* Background */}
      <div
        className="
          absolute
          inset-0
          -z-10
          bg-gradient-to-br
          from-indigo-100/70
          via-gray-200
          to-blue-100/60
          dark:from-gray-950
          dark:via-gray-900
          dark:to-indigo-950/30
        "
      />

      {/* Soft light-mode glow */}
      <div
        className="
          absolute
          -left-32
          -top-32
          -z-10
          h-72
          w-72
          rounded-full
          bg-indigo-300/20
          blur-3xl
          dark:bg-indigo-500/10
        "
      />

      <div
        className="
          absolute
          -bottom-32
          -right-32
          -z-10
          h-72
          w-72
          rounded-full
          bg-blue-300/20
          blur-3xl
          dark:bg-blue-500/10
        "
      />

      <section
        className="
          mx-auto
          w-full
          max-w-7xl
          px-4
          py-6
          md:px-6
          lg:px-8
        "
      >
        <LoadingSkeleton cards={8} />
      </section>
    </main>
  );
}