import React, { useContext } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  CalendarDays,
  ChevronRight,
  MessageCircle,
  Play,
  Radio,
  Users,
  Trophy,
  PenSquare,
  Sparkles,
} from "lucide-react-native";

import { tribe2, tiger } from "@/assets";
import LoadingScreen from "@/components/loading/LoadingScreen";
import { UserContext } from "@/components/loading/UserContext";
import { useNavigation } from "@/utils/useNavigation";

export default function Home() {
  const { replace } = useNavigation();

  const { user, authReady, loadingUser } =
    useContext(UserContext)!;

  if (!authReady || loadingUser) {
    return (
      <LoadingScreen
        onComplete={() => {}}
      />
    );
  }

  if (user) {
    replace("/main/home");
    return null;
  }

  return (
    <View className="flex-1 bg-gray-100 dark:bg-gray-950">
      {/* Animated Gradient Background */}
      <View
        pointerEvents="none"
        className="absolute inset-0"
      >
        <View className="absolute -left-24 -top-20 h-72 w-72 rounded-full bg-indigo-200/40 dark:bg-indigo-900/20" />

        <View className="absolute -right-24 top-40 h-80 w-80 rounded-full bg-purple-200/40 dark:bg-purple-900/20" />

        <View className="absolute -bottom-20 left-20 h-72 w-72 rounded-full bg-blue-200/30 dark:bg-blue-900/20" />
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-0"
      >
        <View className="relative z-10">

          {/* ========================= */}
          {/* NAVIGATION */}
          {/* ========================= */}

          <View className="border-b border-gray-600 dark:border-gray-400">
            <View className="flex-row items-center justify-between px-4 py-4">

              {/* Logo */}
              <Pressable
                onPress={() =>
                  replace("/")
                }
              >
                <View className="h-14 w-14 overflow-hidden rounded-full border border-indigo-600 shadow">
                  <Image
                    source={tribe2}
                    resizeMode="cover"
                    className="h-full w-full"
                  />
                </View>
              </Pressable>

              {/* Navigation */}
              <View className="flex-row items-center gap-2">

                {/* Sports */}
                <Pressable
                  onPress={() =>
                    replace("/sports")
                  }
                  className="flex-row items-center rounded-lg px-3 py-2"
                >
                  <Text className="mr-1 text-base">
                    ⚽
                  </Text>

                  <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Sports
                  </Text>
                </Pressable>

                {/* Login */}
                <Pressable
                  onPress={() =>
                    replace("/auth/login")
                  }
                  className="rounded-lg border border-indigo-600 px-3 py-2 dark:border-gray-200"
                >
                  <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Login
                  </Text>
                </Pressable>

                {/* Get Started */}
                <Pressable
                  onPress={() =>
                    replace("/auth/register")
                  }
                  className="rounded-lg bg-indigo-600 px-3 py-2"
                >
                  <Text className="text-sm font-semibold text-white">
                    Join
                  </Text>
                </Pressable>

              </View>
            </View>
          </View>

          {/* ========================= */}
          {/* HERO */}
          {/* ========================= */}

          <View className="px-6 py-24">
            <View className="items-center">

              {/* Small label */}
              <View className="mb-6 flex-row items-center rounded-full border border-indigo-200 bg-white/60 px-4 py-2 dark:border-indigo-900 dark:bg-gray-900/60">
                <Sparkles
                  size={14}
                  color="#4F46E5"
                />

                <Text className="ml-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  Connect. Share. Belong.
                </Text>
              </View>

              <Text className="text-center text-5xl font-black tracking-tight text-gray-900 dark:text-gray-100">
                Find Your{" "}
                <Text className="text-indigo-600 dark:text-indigo-400">
                  Tribe
                </Text>
              </Text>

              <Text className="mt-6 max-w-2xl text-center text-base leading-7 text-gray-600 dark:text-gray-400">
                A community-driven social platform where
                people connect, share ideas, discover
                communities, and build meaningful
                conversations around the things they love.
              </Text>

              {/* Hero buttons */}
              <View className="mt-9 w-full gap-3">

                <Pressable
                  onPress={() =>
                    replace("/auth/register")
                  }
                  className="items-center justify-center rounded-xl bg-indigo-600 px-7 py-3.5"
                >
                  <Text className="text-base font-bold text-white">
                    Join Tribe
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    replace("/sports")
                  }
                  className="flex-row items-center justify-center rounded-xl border border-indigo-600 bg-white/50 px-7 py-3.5 dark:border-indigo-400 dark:bg-gray-900/40"
                >
                  <Text className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                    ⚽ Explore Sports
                  </Text>

                  <ChevronRight
                    size={16}
                    color="#4F46E5"
                    style={{
                      marginLeft: 6,
                    }}
                  />
                </Pressable>

              </View>
            </View>
          </View>

          {/* ========================= */}
          {/* SPORTS */}
          {/* ========================= */}

          <View className="px-6 pb-20">
            <View>

              <View className="mb-8">

                <View className="mb-2 flex-row items-center">
                  <Text className="mr-2 text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    ⚽
                  </Text>

                  <Text className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    TRIBE SPORTS
                  </Text>
                </View>

                <Text className="text-3xl font-black text-gray-900 dark:text-gray-100">
                  Follow the game.
                </Text>

                <Text className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
                  Live matches, today's fixtures,
                  competitions and more — all in one
                  place.
                </Text>

                <Pressable
                  onPress={() =>
                    replace("/sports")
                  }
                  className="mt-4 flex-row items-center"
                >
                  <Text className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    Explore Sports
                  </Text>

                  <ChevronRight
                    size={16}
                    color="#4F46E5"
                    style={{
                      marginLeft: 3,
                    }}
                  />
                </Pressable>

              </View>

              <View className="gap-4">

                <SportsCard
                  icon={
                    <Radio
                      size={20}
                      color="#EF4444"
                    />
                  }
                  title="Live Matches"
                  description="Follow matches happening right now with live scores and updates."
                  href="/sports/live"
                  iconBackground="bg-red-50 dark:bg-red-950/30"
                />

                <SportsCard
                  icon={
                    <CalendarDays
                      size={20}
                      color="#4F46E5"
                    />
                  }
                  title="Today's Fixtures"
                  description="See today's matches and upcoming games across major competitions."
                  href="/sports/fixtures"
                  iconBackground="bg-indigo-50 dark:bg-indigo-950/30"
                />

                <SportsCard
                  icon={
                    <Trophy
                      size={20}
                      color="#4F46E5"
                    />
                  }
                  title="Popular Competitions"
                  description="Explore leagues, tournaments, standings and teams."
                  href="/sports/competitions"
                  iconBackground="bg-indigo-50 dark:bg-indigo-950/30"
                />

              </View>
            </View>
          </View>

          {/* ========================= */}
          {/* TRIBE EXPERIENCE */}
          {/* ========================= */}

          <View className="border-y border-gray-300/70 bg-gray-50/70 px-6 py-20 dark:border-gray-800 dark:bg-gray-900/40">

            <View>

              <View className="mb-12 items-center">
                <Text className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  THE TRIBE EXPERIENCE
                </Text>

                <Text className="mt-2 text-center text-3xl font-black text-gray-900 dark:text-gray-100">
                  More than just a social feed.
                </Text>

                <Text className="mt-4 text-center text-sm leading-6 text-gray-500 dark:text-gray-400">
                  Discover people, communities and
                  conversations that match your interests.
                </Text>
              </View>

              <View className="gap-5">

                <FeatureCard
                  icon={
                    <Users
                      size={20}
                      color="#4F46E5"
                    />
                  }
                  title="Communities"
                  description="Find and join communities built around the things you care about."
                />

                <FeatureCard
                  icon={
                    <PenSquare
                      size={20}
                      color="#4F46E5"
                    />
                  }
                  title="Posts"
                  description="Share thoughts, ideas, images and moments with your Tribe."
                />

                <FeatureCard
                  icon={
                    <Play
                      size={20}
                      color="#4F46E5"
                    />
                  }
                  title="Reels"
                  description="Discover short-form content and share your best moments."
                />

                <FeatureCard
                  icon={
                    <MessageCircle
                      size={20}
                      color="#4F46E5"
                    />
                  }
                  title="Chat"
                  description="Have real conversations with people and communities."
                />

              </View>
            </View>
          </View>

          {/* ========================= */}
          {/* WHY TRIBE */}
          {/* ========================= */}

          <View className="px-6 py-24">
            <View>

              <Text className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                WHY TRIBE?
              </Text>

              <Text className="mt-3 text-3xl font-black text-gray-900 dark:text-gray-100">
                A place to find people who get you.
              </Text>

              <Text className="mt-5 text-base leading-7 text-gray-600 dark:text-gray-400">
                Tribe brings communities, conversations,
                entertainment and interests together in
                one place.
              </Text>

              <Text className="mt-4 text-base leading-7 text-gray-600 dark:text-gray-400">
                Whether you're here to meet people,
                share your creativity, follow sports or
                simply discover something new, there's a
                Tribe for you.
              </Text>

              <Pressable
                onPress={() =>
                  replace("/auth/register")
                }
                className="mt-7 flex-row items-center self-start rounded-xl bg-indigo-600 px-6 py-3"
              >
                <Text className="font-bold text-white">
                  Find Your Tribe
                </Text>

                <ChevronRight
                  size={16}
                  color="#FFFFFF"
                  style={{
                    marginLeft: 5,
                  }}
                />
              </Pressable>

              {/* Why Tribe Cards */}
              <View className="mt-12 gap-4">

                <WhyCard
                  number="01"
                  title="Discover"
                  text="Explore communities, creators, sports and conversations."
                />

                <WhyCard
                  number="02"
                  title="Connect"
                  text="Meet people who share your interests and passions."
                />

                <WhyCard
                  number="03"
                  title="Create"
                  text="Post, share, comment and contribute to your communities."
                />

                <WhyCard
                  number="04"
                  title="Belong"
                  text="Build meaningful connections around the things you love."
                />

              </View>
            </View>
          </View>

          {/* ========================= */}
          {/* CTA */}
          {/* ========================= */}

          <View className="bg-gray-50 px-6 py-24 dark:bg-gray-900">
            <View className="items-center">

              <Text className="text-center text-3xl font-black text-gray-900 dark:text-gray-100">
                Ready to find your Tribe?
              </Text>

              <Text className="mt-4 text-center text-sm leading-6 text-gray-500 dark:text-gray-400">
                Join the community, discover your
                interests and start connecting today.
              </Text>

              <Pressable
                onPress={() =>
                  replace("/auth/register")
                }
                className="mt-8 flex-row items-center rounded-xl bg-indigo-600 px-8 py-3.5"
              >
                <Text className="text-base font-bold text-white">
                  Create Account
                </Text>

                <ChevronRight
                  size={16}
                  color="#FFFFFF"
                  style={{
                    marginLeft: 5,
                  }}
                />
              </Pressable>

            </View>
          </View>

          {/* ========================= */}
          {/* FOOTER */}
          {/* ========================= */}

          <View className="border-t border-gray-600 px-6 py-12 dark:border-gray-400">

            <View className="items-center">

              <View className="h-20 w-20 overflow-hidden rounded-full border border-indigo-600">
                <Image
                  source={tiger}
                  resizeMode="cover"
                  className="h-full w-full"
                />
              </View>

              <Text className="mt-3 text-base font-semibold text-gray-800 dark:text-gray-200">
                Superior Masters Int'l Ltd.
              </Text>

              <Text className="mt-6 text-center text-sm text-gray-500">
                © {new Date().getFullYear()}{" "}
                Superior Masters Int'l Ltd.
                {" "}All rights reserved.
              </Text>

              <View className="mt-6 flex-row flex-wrap justify-center gap-5">

                <FooterLink
                  title="Privacy Policy"
                  href="/privacy-policy"
                  replace={replace}
                />

                <FooterLink
                  title="Terms & Conditions"
                  href="/terms"
                  replace={replace}
                />

                <FooterLink
                  title="Contact"
                  href="/contact"
                  replace={replace}
                />

                <FooterLink
                  title="Sports"
                  href="/sports"
                  replace={replace}
                />

              </View>
            </View>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

/* ================================= */
/* SPORTS CARD */
/* ================================= */

function SportsCard({
  icon,
  title,
  description,
  href,
  iconBackground,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  iconBackground: string;
}) {
  const { replace } = useNavigation();

  return (
    <Pressable
      onPress={() => replace(href)}
      className="rounded-2xl border border-gray-200 bg-white/70 p-6 dark:border-gray-800 dark:bg-gray-900/70"
    >
      <View
        className={`h-11 w-11 items-center justify-center rounded-xl ${iconBackground}`}
      >
        {icon}
      </View>

      <View className="mt-5 flex-row items-center justify-between">
        <Text className="font-bold text-gray-900 dark:text-gray-100">
          {title}
        </Text>

        <ChevronRight
          size={16}
          color="#9CA3AF"
        />
      </View>

      <Text className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
        {description}
      </Text>
    </Pressable>
  );
}

/* ================================= */
/* FEATURE CARD */
/* ================================= */

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
    <View className="rounded-2xl border border-gray-200 bg-white/70 p-6 dark:border-gray-800 dark:bg-gray-950/50">

      <View className="h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/30">
        {icon}
      </View>

      <Text className="mt-5 text-base font-bold text-gray-900 dark:text-gray-100">
        {title}
      </Text>

      <Text className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
        {description}
      </Text>

    </View>
  );
}

/* ================================= */
/* WHY CARD */
/* ================================= */

function WhyCard({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <View className="rounded-2xl border border-gray-200 bg-white/60 p-5 dark:border-gray-800 dark:bg-gray-900/60">

      <Text className="text-xs font-black text-indigo-600 dark:text-indigo-400">
        {number}
      </Text>

      <Text className="mt-3 font-bold text-gray-900 dark:text-gray-100">
        {title}
      </Text>

      <Text className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
        {text}
      </Text>

    </View>
  );
}

/* ================================= */
/* FOOTER LINK */
/* ================================= */

function FooterLink({
  title,
  href,
  replace,
}: {
  title: string;
  href: string;
  replace: (url: string) => void;
}) {
  return (
    <Pressable
      onPress={() => replace(href)}
    >
      <Text className="text-sm text-gray-500">
        {title}
      </Text>
    </Pressable>
  );
}