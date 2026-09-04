// components/GlobalError.tsx

import React, {
  Component,
  ErrorInfo,
  ReactNode,
} from "react";

import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class GlobalError extends Component<
  Props,
  State
> {
  state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(
    error: Error
  ): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(
    error: Error,
    errorInfo: ErrorInfo
  ) {
    console.error(
      "Global Error:",
      error
    );

    console.error(
      "Error Info:",
      errorInfo
    );
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>
            Something went wrong
          </Text>

          <Text style={styles.message}>
            An unexpected error occurred.
            Please try again.
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={this.handleReset}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F9FAFB",
  },

  title: {
    marginBottom: 16,
    color: "#374151",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },

  message: {
    marginBottom: 24,
    color: "#6B7280",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },

  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#4F46E5",
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});