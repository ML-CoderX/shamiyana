import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import './i18n';
import { AppBar } from './ui/components';
import { color } from './ui/tokens';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SettingsScreen from './screens/SettingsScreen';
import { initDatabase } from './db/database';

import HomeScreen from './screens/HomeScreen';
import MaterialsScreen from './screens/MaterialsScreen';
import OrdersScreen from './screens/OrdersScreen';
import NewOrderScreen from './screens/NewOrderScreen';
import BillingScreen from './screens/BillingScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const { t } = useTranslation();

  const start = async () => {
    setFailed(false);
    try { await initDatabase(); setReady(true); } catch { setFailed(true); }
  };
  useEffect(() => { start(); }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        {failed ? <><Text>{t('startup_failed')}</Text><TouchableOpacity style={{ padding: 20 }} onPress={start}><Text>{t('retry')}</Text></TouchableOpacity></> : <ActivityIndicator size="large" color={color.brand} />}
      </View>
    );
  }

  return (
    <SafeAreaProvider><NavigationContainer>
      <Stack.Navigator initialRouteName="Home" screenOptions={{
        statusBarStyle: 'light',
        header: ({ navigation, options, back }) => <AppBar title={options.title} back={back ? navigation.goBack : undefined}
          backLabel={t('ui.back')} badge={options.title === t('settings') ? t('ui.bill_profile') : undefined} />,
      }}>
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t('settings') }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Materials" component={MaterialsScreen} options={{ title: t('materials'), headerShown: false }} />
        <Stack.Screen name="Orders" component={OrdersScreen} options={{ title: t('orders'), headerShown: false }} />
        <Stack.Screen name="NewOrder" component={NewOrderScreen} options={{ title: t('new_order') }} />
        <Stack.Screen name="Billing" component={BillingScreen} options={{ title: t('generate_bill') }} />
      </Stack.Navigator>
    </NavigationContainer></SafeAreaProvider>
  );
}
