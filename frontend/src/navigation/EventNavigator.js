import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useI18n } from '../i18n';
import { stackOptions, tabBarOptions } from '../theme';
import { IconButton } from '../components/ui';
import WorkspaceSwitch from '../components/WorkspaceSwitch';

import ScheduleScreen from '../screens/event/ScheduleScreen';
import EventFormScreen from '../screens/event/EventFormScreen';
import ParticipantsScreen from '../screens/event/ParticipantsScreen';
import EventFinanceScreen from '../screens/event/EventFinanceScreen';
import PlayersScreen from '../screens/event/PlayersScreen';
import AccountScreen from '../screens/AccountScreen';
import PlanScreen from '../screens/PlanScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const ICONS = { Players: 'people', Finance: 'cash' };

function EventTabs({ route }) {
  const { eventId } = route.params;
  const { t } = useI18n();
  return (
    <Tab.Navigator
      screenOptions={({ route: r }) => ({
        ...tabBarOptions,
        headerShown: false,
        tabBarIcon: ({ color, size }) => <Ionicons name={ICONS[r.name]} size={size} color={color} />,
      })}
    >
      <Tab.Screen name="Players" component={ParticipantsScreen} initialParams={{ eventId }} options={{ title: t('tab.players') }} />
      <Tab.Screen name="Finance" component={EventFinanceScreen} initialParams={{ eventId }} options={{ title: t('tab.finance') }} />
    </Tab.Navigator>
  );
}

export default function EventNavigator() {
  const { t } = useI18n();
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={({ navigation }) => ({
          headerTitle: () => <WorkspaceSwitch />,
          headerRight: () => (
            <IconButton name="person-circle-outline" size={26} onPress={() => navigation.navigate('Account')} />
          ),
          headerLeft: () => (
            <IconButton name="podium-outline" onPress={() => navigation.navigate('Reliability')} />
          ),
        })}
      />
      <Stack.Screen name="EventForm" component={EventFormScreen} options={({ route }) => ({ title: route.params?.eventId ? t('eventForm.editTitle') : t('eventForm.newTitle') })} />
      <Stack.Screen name="EventHome" component={EventTabs} options={({ route, navigation }) => ({
        title: route.params.eventTitle || t('tab.event'),
        headerRight: () => <IconButton name="create-outline" onPress={() => navigation.navigate('EventForm', { eventId: route.params.eventId })} />,
      })} />
      <Stack.Screen name="Reliability" component={PlayersScreen} options={{ title: t('players.title') }} />
      <Stack.Screen name="Account" component={AccountScreen} options={{ title: t('account.title') }} />
      <Stack.Screen name="Plan" component={PlanScreen} options={{ title: t('plan.title'), presentation: 'modal' }} />
    </Stack.Navigator>
  );
}
