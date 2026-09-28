import React from 'react';
import { Pressable } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useMode } from '../context/ModeContext';
import { colors, stackOptions } from '../theme';
import { T } from '../components/ui';
import ClubListScreen from '../screens/club/ClubListScreen';
import MembersScreen from '../screens/club/MembersScreen';
import MatchLoggerScreen from '../screens/club/MatchLoggerScreen';
import RankingsScreen from '../screens/club/RankingsScreen';
import FundScreen from '../screens/club/FundScreen';
import PlanScreen from '../screens/PlanScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const ICONS = { Members: 'people', Matches: 'tennisball', Rankings: 'trophy', Fund: 'wallet' };

function ClubTabs({ route }) {
  const { clubId } = route.params;
  return (
    <Tab.Navigator
      screenOptions={({ route: r }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primaryLight,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ color, size }) => <Ionicons name={ICONS[r.name]} size={size} color={color} />,
      })}
    >
      <Tab.Screen name="Members" component={MembersScreen} initialParams={{ clubId }} />
      <Tab.Screen name="Matches" component={MatchLoggerScreen} initialParams={{ clubId }} />
      <Tab.Screen name="Rankings" component={RankingsScreen} initialParams={{ clubId }} />
      <Tab.Screen name="Fund" component={FundScreen} initialParams={{ clubId }} />
    </Tab.Navigator>
  );
}

export default function ClubNavigator() {
  const { setMode } = useMode();
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen
        name="ClubList"
        component={ClubListScreen}
        options={{
          title: 'Club Manager',
          headerRight: () => (
            <Pressable onPress={() => setMode(null)} hitSlop={10}>
              <T style={{ color: colors.primaryLight, fontWeight: '600' }}>Switch</T>
            </Pressable>
          ),
        }}
      />
      <Stack.Screen name="ClubHome" component={ClubTabs} options={({ route }) => ({ title: route.params.clubName || 'Club' })} />
      <Stack.Screen name="Plan" component={PlanScreen} options={{ title: 'Your plan', presentation: 'modal' }} />
    </Stack.Navigator>
  );
}
