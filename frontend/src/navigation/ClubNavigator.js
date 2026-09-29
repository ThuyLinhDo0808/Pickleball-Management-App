import React from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useI18n } from '../i18n';
import { colors, stackOptions, tabBarOptions } from '../theme';
import { IconButton } from '../components/ui';
import WorkspaceSwitch from '../components/WorkspaceSwitch';

import ClubListScreen from '../screens/club/ClubListScreen';
import ClubEditScreen from '../screens/club/ClubEditScreen';
import MembersScreen from '../screens/club/MembersScreen';
import MatchLoggerScreen from '../screens/club/MatchLoggerScreen';
import RankingsScreen from '../screens/club/RankingsScreen';
import FundScreen from '../screens/club/FundScreen';
import ClubEventsScreen from '../screens/club/ClubEventsScreen';
import AccountScreen from '../screens/AccountScreen';
import PlanScreen from '../screens/PlanScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const ICONS = { Members: 'people', Matches: 'tennisball', Rankings: 'trophy', Fund: 'wallet', Events: 'calendar' };

function ClubTabs({ route }) {
  const { clubId, clubName } = route.params;
  const { t } = useI18n();
  return (
    <Tab.Navigator
      screenOptions={({ route: r }) => ({
        ...tabBarOptions,
        headerShown: false,
        tabBarIcon: ({ color, size }) => <Ionicons name={ICONS[r.name]} size={size} color={color} />,
      })}
    >
      <Tab.Screen name="Members" component={MembersScreen} initialParams={{ clubId }} options={{ title: t('tab.members') }} />
      <Tab.Screen name="Matches" component={MatchLoggerScreen} initialParams={{ clubId }} options={{ title: t('tab.matches') }} />
      <Tab.Screen name="Rankings" component={RankingsScreen} initialParams={{ clubId }} options={{ title: t('tab.rankings') }} />
      <Tab.Screen name="Fund" component={FundScreen} initialParams={{ clubId }} options={{ title: t('tab.fund') }} />
      <Tab.Screen name="Events" component={ClubEventsScreen} initialParams={{ clubId, clubName }} options={{ title: t('tab.events') }} />
    </Tab.Navigator>
  );
}

export default function ClubNavigator() {
  const { t } = useI18n();
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen
        name="ClubList"
        component={ClubListScreen}
        options={({ navigation }) => ({
          headerTitle: () => <WorkspaceSwitch />,
          headerRight: () => <IconButton name="person-circle-outline" size={26} onPress={() => navigation.navigate('Account')} />,
        })}
      />
      <Stack.Screen
        name="ClubHome"
        component={ClubTabs}
        options={({ route, navigation }) => ({
          title: route.params.clubName || t('tab.club'),
          headerRight: () => <IconButton name="create-outline" onPress={() => navigation.navigate('ClubEdit', { clubId: route.params.clubId })} />,
        })}
      />
      <Stack.Screen name="ClubEdit" component={ClubEditScreen} options={{ title: t('club.editTitle') }} />
      <Stack.Screen name="Account" component={AccountScreen} options={{ title: t('account.title') }} />
      <Stack.Screen name="Plan" component={PlanScreen} options={{ title: t('plan.title'), presentation: 'modal' }} />
    </Stack.Navigator>
  );
}
