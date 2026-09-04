import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Eye, EyeOff } from "lucide-react-native";

import { useNavigation } from "@/utils/useNavigation";
import { apiRequest } from "@/utils/api";

export default function ResetPasswordPage() {
  const { push } = useNavigation();

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirm, setShowConfirm] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const params =
    useLocalSearchParams<{
      token?: string;
      uid?: string;
    }>();

  const token = params.token;
  const uid = params.uid;

  const handleReset = async () => {
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!token || !uid) {
      setError(
        "Invalid or missing token"
      );
      return;
    }

    setLoading(true);

    try {
      const data = await apiRequest(
        "api/users/reset-password/",
        {
          method: "POST",
          data: {
            password,
            uid,
            token,
          },
        }
      );

      setMessage(data.message);

      setTimeout(() => {
        push("/auth/login");
      }, 2000);
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to reset password"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-950">
      <View className="w-full max-w-sm space-y-4 rounded-2xl bg-white px-5 py-3 shadow-xl dark:bg-gray-900">

        <Text className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
          Reset Password
        </Text>

        {message ? (
          <View className="mb-4 rounded-lg bg-green-100 px-3 py-2">
            <Text className="text-sm text-green-600">
              {message}
            </Text>
          </View>
        ) : null}

        {error ? (
          <View className="mb-4 rounded-lg bg-red-100 px-3 py-2">
            <Text className="text-sm text-red-600">
              {error}
            </Text>
          </View>
        ) : null}

        {/* New Password */}
        <View className="relative mb-4">
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="New Password"
            placeholderTextColor="#9CA3AF"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            className="w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 pr-12 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />

          <Pressable
            onPress={() =>
              setShowPassword(
                !showPassword
              )
            }
            className="absolute right-3 top-2 h-6 w-6 items-center justify-center"
          >
            {showPassword ? (
              <EyeOff
                size={18}
                color="#4B5563"
              />
            ) : (
              <Eye
                size={18}
                color="#4B5563"
              />
            )}
          </Pressable>
        </View>

        {/* Confirm Password */}
        <View className="relative mb-4">
          <TextInput
            value={confirmPassword}
            onChangeText={
              setConfirmPassword
            }
            placeholder="Confirm Password"
            placeholderTextColor="#9CA3AF"
            secureTextEntry={!showConfirm}
            autoCapitalize="none"
            autoCorrect={false}
            className="w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 pr-12 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />

          <Pressable
            onPress={() =>
              setShowConfirm(
                !showConfirm
              )
            }
            className="absolute right-3 top-2 h-6 w-6 items-center justify-center"
          >
            {showConfirm ? (
              <EyeOff
                size={18}
                color="#4B5563"
              />
            ) : (
              <Eye
                size={18}
                color="#4B5563"
              />
            )}
          </Pressable>
        </View>

        {/* Reset Button */}
        <Pressable
          onPress={handleReset}
          disabled={loading}
          className={`w-full items-center justify-center rounded-lg bg-indigo-600 py-2 ${
            loading
              ? "opacity-60"
              : ""
          }`}
        >
          {loading ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />

              <Text className="text-base font-semibold text-white">
                Resetting...
              </Text>
            </View>
          ) : (
            <Text className="text-base font-semibold text-white">
              Reset Password
            </Text>
          )}
        </Pressable>

        {/* Login */}
        <View className="mt-4 flex-row items-center justify-center">
          <Text className="text-sm text-gray-500">
            Remembered your password?
          </Text>

          <Pressable
            onPress={() =>
              push("/auth/login")
            }
          >
            <Text className="ml-1 text-sm text-indigo-600">
              Login
            </Text>
          </Pressable>
        </View>

      </View>
    </View>
  );
}