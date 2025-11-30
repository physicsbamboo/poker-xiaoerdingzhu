import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import { Alert } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Global error handlers setup
function setupGlobalErrorHandlers() {
  // JS Error handler
  const defaultHandler = (ErrorUtils as any).getGlobalHandler && (ErrorUtils as any).getGlobalHandler();

  (ErrorUtils as any).setGlobalHandler((error: any, isFatal?: boolean) => {
    console.log('[GLOBAL_ERROR]', error?.message, error?.stack);
    console.log('[GLOBAL_ERROR][isFatal]', isFatal);
    try {
      Alert.alert(
        'Global JS Error',
        `${error?.message ?? 'Unknown error'}\n\n${error?.stack ?? ''}`
      );
    } catch (e) {
      console.log('[GLOBAL_ERROR][Alert failed]', e);
    }
    if (defaultHandler) {
      defaultHandler(error, isFatal);
    }
  });

  // Unhandled Promise rejections
  const globalAny = global as any;
  const origUnhandled = globalAny.onunhandledrejection;
  globalAny.onunhandledrejection = (event: any) => {
    console.log('[UNHANDLED_PROMISE_REJECTION]', event?.reason);
    console.log('[UNHANDLED_PROMISE_REJECTION][stack]', event?.reason?.stack);
    try {
      Alert.alert(
        'Unhandled Promise Rejection',
        `${String(event?.reason)}\n\n${event?.reason?.stack ?? ''}`
      );
    } catch (e) {
      console.log('[UNHANDLED_PROMISE_REJECTION][Alert failed]', e);
    }
    if (origUnhandled) {
      origUnhandled(event);
    }
  };
}

// Error Boundary Component
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: any; errorInfo?: any }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.log('[ROOT_ERROR_BOUNDARY]', error);
    console.log('[ROOT_ERROR_BOUNDARY][errorInfo]', errorInfo);
    console.log('[ROOT_ERROR_BOUNDARY][stack]', error?.stack);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong in the game.</Text>
          <Text style={styles.errorText}>{String(this.state.error)}</Text>
          {this.state.error?.stack && (
            <Text style={styles.errorStack}>{this.state.error.stack}</Text>
          )}
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#d11a1a',
  },
  errorText: {
    fontSize: 14,
    marginBottom: 10,
    color: '#333',
  },
  errorStack: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'monospace',
  },
});

export default function RootLayout() {
  useEffect(() => {
    setupGlobalErrorHandlers();
  }, []);

  const colorScheme = useColorScheme();

  return (
    <RootErrorBoundary>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="playground" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </RootErrorBoundary>
  );
}
