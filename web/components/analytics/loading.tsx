import LoadingSkeleton from "@/components/analytics/LoadingSkeleton";

export default function Loading() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      {/* Animated Background */}
      <div className="absolute inset-0 -z-10 animated-bg" />

      {/* Floating Blobs */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="blob blob1" />
        <div className="blob blob2" />
        <div className="blob blob3" />
      </div>

      <section className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        <LoadingSkeleton cards={8} />
      </section>
    </main>
  );
}