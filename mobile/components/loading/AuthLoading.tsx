import React from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { tribe2 } from "@/assets";

interface AuthLoadingProps {
  show: boolean;
  text?: string;
}

export default function AuthLoading({
  show,
  text = "Signing you in...",
}: AuthLoadingProps) {
  return (
    <Modal
      visible={show}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.logoContainer}>
            <Image
              source={tribe2}
              style={styles.logo}
              resizeMode="cover"
            />
          </View>

          <ActivityIndicator
            size="large"
            color="#FFFFFF"
            style={styles.loader}
          />

          <Text style={styles.text}>
            {text}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },

  container: {
    alignItems: "center",
  },

  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#4F46E5",
  },

  logo: {
    width: "100%",
    height: "100%",
  },

  loader: {
    marginTop: 24,
  },

  text: {
    marginTop: 20,
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "500",
  },
});