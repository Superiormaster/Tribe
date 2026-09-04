import React, {
  useContext,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Linking,
  Pressable,
  Text,
  View,
} from "react-native";

import {
  Link,
  useLocalSearchParams,
} from "expo-router";

import {
  apiRequest,
  setAccessToken,
} from "@/utils/api";

import {
  saveAccount,
  setActiveAccount,
} from "@/utils/accounts";

import {
  handleOnboardingRedirect,
} from "@/utils/handleOnboardingRedirect";

import {
  storeRefreshToken,
} from "@/lib/keyStore";

import {
  useNavigation,
} from "@/utils/useNavigation";

import {
  UserContext,
} from "@/components/loading/UserContext";

export default function VerifyEmailPage() {
  const params =
    useLocalSearchParams<{
      email?: string;
      code?: string;
    }>();

  const email = Array.isArray(params.email)
    ? params.email[0]
    : params.email;

  const code = Array.isArray(params.code)
    ? params.code[0]
    : params.code;

  const { push } = useNavigation();

  const {
    setUser,
  } = useContext(UserContext)!;

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [seconds, setSeconds] =
    useState(60);

  /**
   * RESEND COUNTDOWN
   */
  useEffect(() => {
    if (!email) return;

    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [email]);

  /**
   * VERIFY EMAIL WHEN CODE EXISTS
   */
  useEffect(() => {
    if (!code) return;

    verifyEmail();
  }, [code]);

  /**
   * VERIFY EMAIL
   */
  const verifyEmail = async () => {
    if (!code) return;

    setLoading(true);
    setError("");

    try {
      const res =
        await apiRequest(
          `api/users/verify-email/?code=${code}`,
          {
            method: "GET",
          }
        );

      const {
        access,
        refresh,
        user,
      } = res;

      /**
       * RESTORE AUTH TOKENS
       */
      if (access) {
        setAccessToken(access);

        await storeRefreshToken(
          user.email,
          refresh
        );
      }

      /**
       * SAVE ACCOUNT
       */
      await saveAccount(
        user,
        "password"
      );

      await setActiveAccount(
        user.email
      );

      /**
       * FETCH CURRENT PROFILE
       */
      const profile =
        await apiRequest(
          "api/users/me/",
          {
            method: "GET",
          }
        );

      setUser(profile);

      await setActiveAccount(
        profile.email
      );

      await saveAccount(
        profile,
        profile.auth_provider ===
        "google"
          ? "google"
          : "password"
      );

      setMessage(
        "Email verified successfully."
      );

      /**
       * GO TO ONBOARDING
       */
      setTimeout(async () => {
        await handleOnboardingRedirect(
          push
        );
      }, 1500);
    } catch (err: any) {
      setError(
        err?.message ||
          "Verification failed."
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * RESEND VERIFICATION EMAIL
   */
  const resendEmail = async () => {
    if (!email) return;

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res =
        await apiRequest(
          "api/users/resend-verification/",
          {
            method: "POST",
            data: {
              email,
            },
          }
        );

      setMessage(res.message);

      setSeconds(60);
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to resend email."
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * CODE VERIFICATION SCREEN
   */
  if (code) {
    return (
      <View className="flex-1 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-950">

        <View className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-lg dark:bg-gray-900">

          <Text className="mb-4 text-center text-2xl font-bold text-gray-900 dark:text-gray-100">
            Verifying Email
          </Text>

          {loading && (
            <View className="items-center">
              <Text className="text-center text-gray-700 dark:text-gray-300">
                Verifying your account...
              </Text>

              <ActivityIndicator
                size="small"
                color="#4F46E5"
                className="mt-3"
              />
            </View>
          )}

          {message ? (
            <Text className="text-center text-green-600">
              {message}
            </Text>
          ) : null}

          {error ? (
            <View>
              <Text className="mb-4 text-center text-red-600">
                {error}
              </Text>

              {email ? (
                <Pressable
                  onPress={
                    resendEmail
                  }
                  className="rounded-lg bg-indigo-600 px-5 py-2"
                >
                  <Text className="text-center font-medium text-white">
                    Resend Verification Email
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

        </View>

      </View>
    );
  }

  /**
   * EMAIL SENT SCREEN
   */
  return (
    <View className="flex-1 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-950">

      <View className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl dark:bg-gray-900">

        <View className="items-center">

          <Text className="mb-4 text-6xl">
            📧
          </Text>

          <Text className="text-center text-2xl font-bold text-gray-900 dark:text-gray-100">
            Verify your email
          </Text>

          <Text className="mt-4 text-center text-gray-500">
            We've sent a verification email to
          </Text>

          <Text className="mt-2 text-center font-semibold text-gray-900 dark:text-gray-100">
            {email}
          </Text>

        </View>

        {message ? (
          <View className="mt-5 rounded-lg bg-green-100 p-3">
            <Text className="text-green-700">
              {message}
            </Text>
          </View>
        ) : null}

        {error ? (
          <View className="mt-5 rounded-lg bg-red-100 p-3">
            <Text className="text-red-700">
              {error}
            </Text>
          </View>
        ) : null}

        {/* Open Gmail */}
        <Pressable
          onPress={() =>
            Linking.openURL(
              "https://mail.google.com"
            )
          }
          className="mt-6 w-full rounded-lg bg-indigo-600 py-3"
        >
          <Text className="text-center font-medium text-white">
            Open Gmail
          </Text>
        </Pressable>

        {/* Resend */}
        <Pressable
          disabled={
            seconds > 0 || loading
          }
          onPress={resendEmail}
          className={`mt-3 w-full rounded-lg border border-indigo-600 py-3 ${
            seconds > 0 || loading
              ? "opacity-50"
              : ""
          }`}
        >
          <Text className="text-center text-indigo-600">
            {seconds > 0
              ? `Resend in ${seconds}s`
              : "Resend Verification Email"}
          </Text>
        </Pressable>

        {/* Change Email */}
        <Link
          href="/auth/register"
          asChild
        >
          <Pressable className="mt-5">
            <Text className="text-center text-indigo-600">
              Change Email Address
            </Text>
          </Pressable>
        </Link>

      </View>

    </View>
  );
}