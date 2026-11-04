import { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { StatusBar } from 'expo-status-bar';
import { getOrders, getShop } from '../db/database';
import i18n from '../i18n';
import { Card, Chip, Icon, Tap, Tile, common } from '../ui/components';
import { color, radius, shadow, size, space, type } from '../ui/tokens';

const destinations = [
  ['Materials', 'materials', 'box'],
  ['Orders', 'orders', 'file'],
  ['NewOrder', 'new_order', 'plus'],
  ['Settings', 'settings', 'settings'],
];

function todayKey() {
  const now = new Date();
  return [now.getDate(), now.getMonth() + 1, now.getFullYear()].map(value => String(value).padStart(2, '0')).join('-');
}

export default function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  const { width, fontScale } = useWindowDimensions();
  const compact = width <= 365 || fontScale >= 1.2;
  const [shop, setShop] = useState('');
  const [active, setActive] = useState(null);
  useFocusEffect(useCallback(() => {
    let current = true;
    getShop().then(value => { if (current) setShop(value.name); }).catch(() => {});
    getOrders().then(orders => {
      if (current) setActive(orders.filter(order => order.event_date === todayKey() && order.status !== 'returned').length);
    }).catch(() => { if (current) setActive(null); });
    return () => { current = false; };
  }, []));
  const next = i18n.language === 'kn' ? 'en' : 'kn';

  return <SafeAreaView style={common.page}>
    <StatusBar style="dark" />
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.top}>
        <View style={common.split}>
          <View style={styles.brand}>
            <Image source={require('../assets/shamiyana-logo.png')} style={styles.logo} accessible={false} />
            <View style={styles.grow}>
              <Text accessibilityRole="header" style={styles.title}>{t('app_name')}</Text>
              <View style={styles.subtitle}><View style={styles.dot} /><Text numberOfLines={2} style={[common.meta, styles.grow]}>{shop ? `${shop} · ${t('ui.rentals')}` : t('ui.rentals')}</Text></View>
            </View>
          </View>
          <Tap accessibilityLabel={t('language')} onPress={() => i18n.changeLanguage(next)} style={styles.language}>
            <Icon name="globe" dimension={16} /><Text style={common.meta}>{t(next === 'kn' ? 'kannada' : 'english', { lng: next })}</Text>
          </Tap>
        </View>
        <Card style={[common.row, compact && styles.dispatchCompact]}>
          <View style={[common.row, !compact && styles.grow]}>
            <Tile icon="calendar" tone="brand" />
            <View style={styles.grow}>
            <Text style={common.eyebrow}>{t('ui.dispatch')}</Text>
            <Text style={common.heading}>{active === null ? t('ui.dispatch_unavailable') : t(active === 1 ? 'ui.active_one' : 'ui.active_other', { number: active })}</Text>
            </View>
          </View>
          <Chip label={t('ui.offline_ready')} tone="delivered" maxWidth={compact ? '100%' : '42%'} />
        </Card>
      </View>

      <View style={styles.menu}>
        {destinations.map(([route, label, icon]) => {
          const hero = route === 'NewOrder';
          return <Card key={route} onPress={() => navigation.navigate(route)} style={[common.row, hero && styles.hero]}>
            {hero && <Image source={require('../assets/order-gradient.png')} style={styles.gradient} resizeMode="stretch" accessible={false} />}
            <Tile icon={icon} tone={hero ? 'white' : 'neutral'} />
            <View style={styles.grow}>
              <Text style={[common.heading, hero && styles.heroText]}>{t(label)}</Text>
              <Text numberOfLines={2} style={[common.meta, hero && styles.heroMeta]}>{t(`ui.nav_${label}`)}</Text>
            </View>
            <View style={hero && styles.heroChevron}><Icon name="chevron" tint={hero ? color.white : color.placeholder} dimension={20} /></View>
          </Card>;
        })}
      </View>
      <View style={styles.bottom}><Text style={styles.footer}>V{require('../app.json').expo.version} · {t('ui.offline_ready')}</Text></View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: space.xxl, gap: space.section },
  dispatchCompact: { flexDirection: 'column', alignItems: 'stretch' },
  top: { gap: space.lg },
  title: { ...type.title, color: color.ink },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  grow: { flex: 1, minWidth: 0 },
  logo: { width: size.touch, height: size.touch, borderRadius: radius.input },
  subtitle: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingRight: space.sm },
  dot: { width: 6, height: 6, borderRadius: radius.pill, backgroundColor: color.green },
  language: { ...common.row, gap: space.xs, minHeight: size.touch, paddingHorizontal: space.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: color.line, backgroundColor: color.white },
  menu: { flexGrow: 1, justifyContent: 'center', gap: space.md },
  hero: { backgroundColor: color.brand, borderColor: color.brand, ...shadow.cta },
  gradient: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined, borderRadius: radius.card },
  heroText: { color: color.white },
  heroMeta: { color: color.blush },
  heroChevron: { padding: space.xs, borderRadius: radius.pill, backgroundColor: color.glass },
  bottom: { alignItems: 'center', paddingTop: space.lg },
  footer: { ...common.eyebrow, textAlign: 'center' },
});
