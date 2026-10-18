import { View, Text, StyleSheet } from 'react-native';

export default function ContactsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>📞 Emergency Contacts</Text>
      <Text style={styles.subtitle}>Manage contacts alerted via SMS on SOS (Milestone 8)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
});
