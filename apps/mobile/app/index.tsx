import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏥 NearHelp</Text>
      <Text style={styles.subtitle}>Community Emergency Help</Text>
      <View style={styles.card}>
        <Text style={styles.cardText}>App scaffold ready.</Text>
        <Text style={styles.cardText}>Full features coming in Milestones 3-9.</Text>
      </View>
      <Text style={styles.disclaimer}>
        NearHelp does not replace emergency services. Always call 112 in a life-threatening emergency.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#F3F4F6',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  cardText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  disclaimer: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 32,
    paddingHorizontal: 16,
  },
});
