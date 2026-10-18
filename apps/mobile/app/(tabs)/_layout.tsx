import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#DC2626',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          paddingBottom: 6,
          paddingTop: 6,
          height: 60,
        },
        headerStyle: {
          backgroundColor: '#DC2626',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Emergency',
          tabBarLabel: 'SOS',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🚨</Text>,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Live Map',
          tabBarLabel: 'Map',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🗺️</Text>,
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'Emergency Contacts',
          tabBarLabel: 'Contacts',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📞</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'My Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>👤</Text>,
        }}
      />
    </Tabs>
  );
}
