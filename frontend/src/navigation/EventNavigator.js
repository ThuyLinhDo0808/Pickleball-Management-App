import React from 'react';
import { Pressable } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useMode } from '../context/ModeContext';
import { colors, stackOptions } from '../theme';
import { T } from '../components/ui';
import EventListScreen from '../screens/event/EventListScreen';
import EventFormScreen from '../screens/event/EventFormScreen';
import ParticipantsScreen from '../screens/event/ParticipantsScreen';
import EventFinanceScreen from '../screens/event/EventFinanceScreen';
import PlayersScreen from '../screens/event/PlayersScreen';
import PlanScreen from '../screens/PlanScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const ICONS = { Players: 'people', Finance: 'cash' };

function EventTabs({ route }) {
  const { eventId } = route.params;
  return (
    <Tab.Navigator
      screenOptions={({ route: r }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.eventLight,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ color, size }) => <Ionicons name={ICONS[r.name]} size={size} color={color} />,
      })}
    >
      <Tab.Screen name="Players" component={ParticipantsScreen} initialParams={{ eventId }} />
      <Tab.Screen name="Finance" component={EventFinanceScreen} initialParams={{ eventId }} />
    </Tab.Navigator>
  );
}

export default function EventNavigator() {
  const { setMode } = useMode();
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen
        name="EventList"
        component={EventListScreen}
        options={{
          title: 'Xé Vé Manager',
          headerRight: () => (
            <Pressable onPress={() => setMode(null)} hitSlop={10}>
              <T style={{ color: colors.eventLight, fontWeight: '600' }}>Switch</T>
            </Pressable>
          ),
        }}
      />
      <Stack.Screen name="EventForm" component={EventFormScreen} options={{ title: 'New event' }} />
      <Stack.Screen name="EventHome" component={EventTabs} options={({ route }) => ({ title: route.params.eventTitle || 'Event' })} />
      <Stack.Screen name="Reliability" component={PlayersScreen} options={{ title: 'Player reliability' }} />
      <Stack.Screen name="Plan" component={PlanScreen} options={{ title: 'Your plan', presentation: 'modal' }} />
    </Stack.Navigator>
  );
}
