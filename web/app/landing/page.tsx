"use client";

import { useContext } from "react";
import Image from "next/image";
import {
  ChevronRight,
  MessageCircle,
  PenSquare,
  Play,
  Sparkles,
  Users,
  ShieldCheck,
  Globe2,
  Heart,
  Zap,
} from "lucide-react";

import { tribe2, tiger } from "@/assets";
import AppLink from "@/components/AppLink";
import LoadingScreen from "@/components/LoadingScreen";
import { UserContext } from "@/components/UserContext";
import { useNavigation } from "@/utils/useNavigation";

export default function Home() {
  const { replace } = useNavigation();
  const { user, authReady, loadingUser } =
    useContext(UserContext)!;

  if (!authReady || loadingUser) {
    return <LoadingScreen onComplete={() => {}} />;
  }

  if (user) {
    replace("/main/home");
    return null;
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-gray-100 text-gray-900 dark:bg-gray-950 dark:text-gray-100">

      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="animated-bg absolute inset-0" />

        <div className="blob blob1" />
        <div className="blob blob2" />
        <div className="blob blob3" />
      </div>

      <nav className="relative z-20 border-b border-gray-300/70 dark:border-gray-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">

          {/* Logo */}

          <AppLink
            href="/"
            className="shrink-0"
            aria-label="Tribe home"
          >
            <div className="h-14 w-14 overflow-hidden rounded-full border border-indigo-600 shadow-sm sm:h-16 sm:w-16">
              <Image
                src={tribe2}
                alt="Tribe"
                className="h-full w-full object-cover"
                priority
              />
            </div>
          </AppLink>


          {/* Navigation */}

          <div className="flex items-center gap-2 sm:gap-3">

            <AppLink
              href="/auth/login"
              className="rounded-lg border border-indigo-600 px-3 py-2 text-sm font-semibold transition hover:bg-indigo-50 dark:border-gray-300 dark:hover:bg-gray-900 sm:px-4"
            >
              Login
            </AppLink>

            <AppLink
              href="/auth/register"
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 sm:px-4"
            >
              <span className="sm:hidden">
                Join
              </span>

              <span className="hidden sm:inline">
                Get Started
              </span>
            </AppLink>

          </div>
        </div>
      </nav>

      <section className="relative px-6 py-24 text-center sm:py-28 lg:py-36">

        <div className="mx-auto max-w-4xl">

          {/* Eyebrow */}

          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/60 px-4 py-2 text-xs font-bold text-indigo-600 shadow-sm backdrop-blur dark:border-indigo-900 dark:bg-gray-900/60 dark:text-indigo-400">
            <Sparkles className="h-3.5 w-3.5" />

            Connect. Share. Belong.
          </div>


          {/* Heading */}

          <h1 className="text-5xl font-black tracking-tight sm:text-6xl lg:text-7xl">

            Find Your{" "}

            <span className="text-indigo-600 dark:text-indigo-400">
              Tribe
            </span>

          </h1>


          {/* Description */}

          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-gray-600 dark:text-gray-400 sm:text-lg">
            Tribe is a community-driven social platform
            where people discover communities, share
            content, have real conversations and build
            meaningful connections around the things
            they care about.
          </p>


          {/* Actions */}

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">

            <AppLink
              href="/auth/register"
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700"
            >
              Join Tribe

              <ChevronRight className="ml-1 h-4 w-4" />
            </AppLink>

            <AppLink
              href="/auth/login"
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white/60 px-7 py-3.5 text-base font-bold backdrop-blur transition hover:border-indigo-300 hover:bg-white dark:border-gray-700 dark:bg-gray-900/50 dark:hover:border-indigo-700 dark:hover:bg-gray-900"
            >
              Sign In
            </AppLink>

          </div>

        </div>
      </section>

      <section className="px-6 pb-24">

        <div className="mx-auto max-w-6xl">

          <div className="mx-auto mb-12 max-w-2xl text-center">

            <p className="mb-2 text-sm font-bold text-indigo-600 dark:text-indigo-400">
              THE TRIBE EXPERIENCE
            </p>

            <h2 className="text-3xl font-black sm:text-4xl">
              Everything you need to connect.
            </h2>

            <p className="mt-4 text-sm leading-6 text-gray-500 dark:text-gray-400 sm:text-base">
              Discover people, communities and content
              that make being online feel more personal.
            </p>

          </div>


          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

            <FeatureCard
              icon={<Users className="h-5 w-5" />}
              title="Communities"
              description="Find communities built around your interests, passions and conversations."
            />

            <FeatureCard
              icon={<PenSquare className="h-5 w-5" />}
              title="Posts"
              description="Share thoughts, ideas, images and moments with the people around you."
            />

            <FeatureCard
              icon={<Play className="h-5 w-5" />}
              title="Reels"
              description="Discover short-form content and share your best moments with the community."
            />

            <FeatureCard
              icon={<MessageCircle className="h-5 w-5" />}
              title="Chat"
              description="Talk directly with people and communities through real conversations."
            />

          </div>

        </div>
      </section>

      <section className="border-y border-gray-300/70 bg-gray-50/70 px-6 py-24 dark:border-gray-800 dark:bg-gray-900/40">

        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">

          {/* Copy */}

          <div>

            <p className="mb-3 text-sm font-bold text-indigo-600 dark:text-indigo-400">
              WHY TRIBE?
            </p>

            <h2 className="text-3xl font-black sm:text-4xl">
              A place where your interests become communities.
            </h2>

            <p className="mt-5 max-w-xl text-base leading-7 text-gray-600 dark:text-gray-400">
              The internet is full of people, but finding
              the right people is different.
            </p>

            <p className="mt-4 max-w-xl text-base leading-7 text-gray-600 dark:text-gray-400">
              Tribe brings people, communities,
              conversations and entertainment together
              so you can spend less time searching and
              more time belonging.
            </p>

            <AppLink
              href="/auth/register"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white transition hover:bg-indigo-700"
            >
              Find Your Tribe

              <ChevronRight className="h-4 w-4" />
            </AppLink>

          </div>

          {/* Benefits */}

          <div className="grid gap-4 sm:grid-cols-2">

            <WhyCard
              icon={<Globe2 className="h-5 w-5" />}
              title="Discover"
              text="Explore people, communities and conversations beyond your usual feed."
            />

            <WhyCard
              icon={<Heart className="h-5 w-5" />}
              title="Connect"
              text="Build genuine connections with people who share your interests."
            />

            <WhyCard
              icon={<Zap className="h-5 w-5" />}
              title="Create"
              text="Share your ideas, creativity and experiences with your community."
            />

            <WhyCard
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Belong"
              text="Find spaces where your voice, interests and contributions matter."
            />

          </div>

        </div>
      </section>

      <section className="px-6 py-24">

        <div className="mx-auto max-w-6xl">

          <div className="mx-auto max-w-2xl text-center">

            <p className="mb-2 text-sm font-bold text-indigo-600 dark:text-indigo-400">
              BUILT TO GROW
            </p>

            <h2 className="text-3xl font-black sm:text-4xl">
              Tribe is more than a feed.
            </h2>

            <p className="mt-4 text-sm leading-6 text-gray-500 dark:text-gray-400 sm:text-base">
              New experiences will continue to become
              part of Tribe as the community grows.
            </p>

          </div>


          <div className="mt-12 grid gap-5 md:grid-cols-3">

            <FutureCard
              title="Communities"
              text="Spaces where people with shared interests can connect and grow together."
              status="Available"
            />

            <FutureCard
              title="Creator Economy"
              text="Tools designed to give creators more ways to build value around their communities."
              status="Growing"
            />

            <FutureCard
              title="More to Come"
              text="Tribe will continue evolving around the people who use it."
              status="Building"
            />

          </div>

        </div>
      </section>

      <section className="bg-gray-50 px-6 py-24 dark:bg-gray-900">

        <div className="mx-auto max-w-6xl">

          <div className="mx-auto mb-12 max-w-2xl text-center">

            <p className="mb-2 text-sm font-bold text-indigo-600 dark:text-indigo-400">
              GET STARTED
            </p>

            <h2 className="text-3xl font-black sm:text-4xl">
              Your Tribe starts here.
            </h2>

          </div>


          <div className="grid gap-5 md:grid-cols-3">

            <StepCard
              number="01"
              title="Join"
              text="Create your account and tell Tribe what interests you."
            />

            <StepCard
              number="02"
              title="Discover"
              text="Find communities, people and content that match your interests."
            />

            <StepCard
              number="03"
              title="Connect"
              text="Join conversations, share content and become part of the community."
            />

          </div>

        </div>
      </section>

      <section className="px-6 py-24 text-center">

        <div className="mx-auto max-w-3xl">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
            <Sparkles className="h-6 w-6" />
          </div>

          <h2 className="mt-6 text-3xl font-black sm:text-4xl">
            Ready to find your Tribe?
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-gray-500 dark:text-gray-400 sm:text-base">
            Join the community, discover your interests
            and start connecting with people who get you.
          </p>

          <AppLink
            href="/auth/register"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700"
          >
            Create Your Account

            <ChevronRight className="h-4 w-4" />
          </AppLink>

        </div>

      </section>

      <footer className="border-t border-gray-300 py-12 dark:border-gray-800">

        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 text-sm text-gray-500">

          <div className="flex flex-col items-center">

            <div className="h-20 w-20 overflow-hidden rounded-full border border-indigo-600 shadow">
              <Image
                src={tiger}
                alt="Superior Masters Logo"
                className="h-full w-full object-cover"
              />
            </div>

            <h3 className="mt-3 text-base font-semibold text-gray-800 dark:text-gray-200">
              Superior Masters Int'l Ltd.
            </h3>

          </div>


          <p className="text-center">
            © {new Date().getFullYear()}{" "}
            Superior Masters Int'l Ltd.
            All rights reserved.
          </p>


          <div className="flex flex-wrap items-center justify-center gap-5">

            <AppLink
              href="/privacy-policy"
              className="transition-colors hover:text-indigo-600"
            >
              Privacy Policy
            </AppLink>

            <AppLink
              href="/terms"
              className="transition-colors hover:text-indigo-600"
            >
              Terms & Conditions
            </AppLink>

            <AppLink
              href="/contact"
              className="transition-colors hover:text-indigo-600"
            >
              Contact
            </AppLink>

          </div>

        </div>

      </footer>

    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white/70 p-6 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-950/50 dark:hover:border-indigo-700">

      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
        {icon}
      </div>

      <h3 className="mt-5 text-base font-bold">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
        {description}
      </p>

    </div>
  );
}

function WhyCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white/60 p-5 backdrop-blur transition hover:-translate-y-1 hover:border-indigo-300 dark:border-gray-800 dark:bg-gray-900/60 dark:hover:border-indigo-700">

      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
        {icon}
      </div>

      <h3 className="mt-4 font-bold">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
        {text}
      </p>

    </div>
  );
}

function FutureCard({
  title,
  text,
  status,
}: {
  title: string;
  text: string;
  status: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-950/50">

      <div className="flex items-center justify-between gap-3">

        <h3 className="font-bold">
          {title}
        </h3>

        <span className="rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
          {status}
        </span>

      </div>

      <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
        {text}
      </p>

    </div>
  );
}

function StepCard({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">

      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
        {number}
      </span>

      <h3 className="mt-4 text-lg font-bold">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
        {text}
      </p>

    </div>
  );
}