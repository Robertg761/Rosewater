import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import { Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import { getSetting, initDb, setSetting } from './src/db';
import { checkForUpdate, updatesAvailable, UpdateInfo } from './src/update';
import UpdateSheet from './src/components/UpdateSheet';
import { DialogHost } from './src/components/dialog';
import { RootStackParamList, TabParamList } from './src/types';
import { ThemeProvider, useTheme } from './src/ThemeContext';
import { font, shadow } from './src/theme';
import { Icon } from './src/components/ui';
import HomeScreen from './src/screens/HomeScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import ProductsScreen from './src/screens/ProductsScreen';
import VitaminsScreen from './src/screens/VitaminsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import LogEntryScreen from './src/screens/LogEntryScreen';
import PhotosScreen from './src/screens/PhotosScreen';

initDb();
SplashScreen.preventAutoHideAsync().catch(() => {});

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

/** Outline glyph when the tab is idle, solid when it is focused. */
const TAB_ICONS: Record<keyof TabParamList, [string, string]> = {
  Home: ['home-variant-outline', 'home-variant'],
  Calendar: ['calendar-blank-outline', 'calendar-blank'],
  Shelf: ['bottle-tonic-outline', 'bottle-tonic'],
  Vitamins: ['pill', 'pill'],
  Settings: ['cog-outline', 'cog'],
};

function Tabs() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.border,
          height: 58 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom,
          ...shadow(theme, 2),
        },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textFaint,
        tabBarLabelStyle: { fontFamily: font.medium, fontSize: 10.5, marginTop: 1 },
        tabBarIcon: ({ focused, color }) => {
          const [idle, active] = TAB_ICONS[route.name as keyof TabParamList];
          return (
            <View
              style={[
                styles.tabIcon,
                focused && { backgroundColor: theme.accentSoft },
              ]}
            >
              <Icon name={focused ? active : idle} size={20} color={color} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'My Hair' }} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Shelf" component={ProductsScreen} options={{ title: 'Shelf' }} />
      <Tab.Screen name="Vitamins" component={VitaminsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

/** How often the app quietly looks for a newer GitHub release on launch. */
const UPDATE_CHECK_INTERVAL_MS = 20 * 60 * 60 * 1000;

function ThemedApp() {
  const theme = useTheme();
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [updateSheetOpen, setUpdateSheetOpen] = useState(false);

  useEffect(() => {
    if (!updatesAvailable()) return;
    const lastCheck = Number(getSetting('lastUpdateCheckAt', '0'));
    if (Date.now() - lastCheck < UPDATE_CHECK_INTERVAL_MS) return;
    checkForUpdate()
      .then((info) => {
        setSetting('lastUpdateCheckAt', String(Date.now()));
        if (info) {
          setUpdate(info);
          setUpdateSheetOpen(true);
        }
      })
      .catch(() => {});
  }, []);

  const navTheme = {
    ...DefaultTheme,
    dark: theme.dark,
    colors: {
      ...DefaultTheme.colors,
      background: theme.background,
      card: theme.card,
      text: theme.text,
      primary: theme.accent,
      border: theme.border,
    },
  };
  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen
          name="LogEntry"
          component={LogEntryScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="Photos" component={PhotosScreen} />
      </Stack.Navigator>
      <UpdateSheet
        info={update}
        visible={updateSheetOpen}
        onClose={() => setUpdateSheetOpen(false)}
      />
      <DialogHost />
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
  });

  // A missing font must not leave the user staring at a splash screen forever —
  // fall through to the system face instead.
  const ready = fontsLoaded || fontError != null;

  const onLayout = useCallback(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }} onLayout={onLayout}>
        <ThemeProvider>
          <ThemedApp />
        </ThemeProvider>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    width: 46,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
