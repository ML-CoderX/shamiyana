import { useState, useCallback } from 'react';
import { View, Text, FlatList, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { AppBar, Button, Card, Chip, Field, Icon, IconButton, common } from '../ui/components';
import { color, space } from '../ui/tokens';
import { getOrderItems, getBill, getOrders } from '../db/database';

export default function OrdersScreen({ navigation }) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState(false);
  const [newest, setNewest] = useState(true);
  const [orders, setOrders] = useState([]);

  const load = useCallback(async () => {
    setLoading(true); setFailed(false);
    try {
      const rows = await getOrders();
      setOrders(await Promise.all(rows.map(async order => {
        try {
          const [items, bill] = await Promise.all([getOrderItems(order.id), getBill(order.id)]);
          return { ...order, count: items.length, amount: bill?.final_amount ?? items.reduce((sum, item) => sum + item.line_total, 0) };
        } catch { return order; }
      })));
    } catch { setFailed(true); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const needle = query.trim().toLowerCase();
  const matching = orders.filter(order => [order.customer_name, order.venue, String(order.id), '#' + order.id].some(value => value?.toLowerCase().includes(needle)));
  const filtered = matching.filter(order => filter === 'all' || order.status === filter);
  const data = newest ? filtered : [...filtered].reverse();
  return <SafeAreaView edges={['bottom', 'left', 'right']} style={common.page}>
    <AppBar title={t('orders')} back={navigation.goBack} backLabel={t('ui.back')}
      action={<IconButton icon={search ? 'close' : 'search'} tint={color.white} label={t(search ? 'ui.close' : 'ui.search_orders')}
        onPress={() => { if (search) setQuery(''); setSearch(!search); }} />}>
      {search && <Field style={styles.search} icon="search" value={query} onChangeText={setQuery} autoFocus placeholder={t('ui.search_orders')} accessibilityLabel={t('ui.search_orders')} />}
    </AppBar>
    <View style={styles.filters}>
      <View style={common.split}>
        <Text style={[common.eyebrow, styles.grow]}>{t('filter_status')}</Text>
        <Button label={t(newest ? 'ui.newest' : 'ui.oldest')} variant="secondary" onPress={() => setNewest(!newest)} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {['all', 'pending', 'delivered', 'returned'].map(status => {
          const count = status === 'all' ? matching.length : matching.filter(order => order.status === status).length;
          return <Chip key={status} label={`${t(status)} (${count})`} tone={status} active={filter === status} onPress={() => setFilter(status)} />;
        })}
      </ScrollView>
    </View>
    {failed && <Button label={t('retry')} variant="secondary" onPress={load} />}
    <FlatList data={data} keyExtractor={item => String(item.id)} contentContainerStyle={styles.list}
      refreshing={loading} onRefresh={load} keyboardShouldPersistTaps="handled"
      ListEmptyComponent={loading ? <ActivityIndicator color={color.brand} /> : !failed && <Text style={styles.empty}>{t(orders.length ? 'no_matching_orders' : 'no_orders')}</Text>}
      renderItem={({ item }) => <Card onPress={() => navigation.navigate('Billing', { orderId: item.id })}>
        <View style={common.split}>
          <Text numberOfLines={2} style={[common.heading, styles.grow]}>#{item.id} · {item.customer_name}</Text>
          <Chip label={t(item.status)} tone={item.status} maxWidth="45%" dot />
        </View>
        {item.customer_phone && <Text style={common.meta}>{item.customer_phone}</Text>}
        <View style={common.divider} />
        <View style={styles.details}>
          <View style={[styles.detail, styles.grow]}><Icon name="calendar" dimension={16} /><Text style={common.meta}>{item.event_date || '—'}</Text></View>
          <View style={[styles.detail, styles.grow]}><Icon name="pin" dimension={16} /><Text numberOfLines={2} style={[common.meta, styles.grow]}>{item.venue || '—'}</Text></View>
        </View>
        {item.count != null && <><View style={common.divider} /><View style={common.split}>
          <Text style={common.meta}>{t('ui.items', { count: item.count })}</Text>
          <Text style={common.heading}>₹{item.amount.toFixed(2)}</Text>
        </View></>}
      </Card>}
    />
    <View style={common.fab}><IconButton label={t('new_order')} icon="plus" tint={color.white} style={common.fabInner} onPress={() => navigation.navigate('NewOrder')} /></View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0 },
  search: { marginHorizontal: space.lg, marginBottom: space.md },
  filters: { backgroundColor: color.white, borderBottomWidth: 1, borderColor: color.line, paddingHorizontal: space.lg, paddingBottom: space.md },
  chips: { gap: space.sm },
  list: { ...common.body, paddingBottom: space.section * 3 },
  details: { flexDirection: 'row', gap: space.md },
  detail: { ...common.row, gap: space.xs },
  empty: { ...common.meta, textAlign: 'center', marginTop: space.section },
});
