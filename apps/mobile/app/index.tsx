import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/auth-store';

export default function IndexScreen() {
  const router = useRouter();
  const { isLoading, isAuthenticated, loadSession } = useAuthStore();

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [isLoading, isAuthenticated, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#DC2626" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
