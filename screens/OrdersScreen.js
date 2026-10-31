import { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { getOrders } from '../db/database';

export default function OrdersScreen({ navigation }) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [orders, setOrders] = useState([]);

  const load = useCallback(async () => {
    setLoading(true); setFailed(false);
    try { setOrders(await getOrders()); } catch { setFailed(true); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>
      <View style={{ paddingHorizontal: 16 }}>
        <Text style={{ marginTop: 12 }}>{t('filter_status')}</Text>
        <Picker accessibilityLabel={t('filter_status')} selectedValue={filter} onValueChange={setFilter}>
          {['all', 'pending', 'delivered', 'returned'].map(status => <Picker.Item key={status} value={status} label={t(status)} />)}
        </Picker>
      </View>
      {failed && <TouchableOpacity onPress={load} style={{ padding: 16 }}><Text>{t('load_failed')} · {t('retry')}</Text></TouchableOpacity>}
      <FlatList
        data={filter === 'all' ? orders : orders.filter(order => order.status === filter)}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshing={loading} onRefresh={load}
        ListEmptyComponent={loading ? <ActivityIndicator /> : !failed ? <Text style={styles.empty}>{t(filter === 'all' ? 'no_orders' : 'no_matching_orders')}</Text> : null}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('Billing', { orderId: item.id })}
          >
            <Text style={styles.rowName}>#{item.id} · {item.customer_name}</Text>
            <Text style={{ color: '#933022', marginTop: 6 }}>{t(item.status)}</Text>
            <Text style={styles.rowSub}>
              {item.event_date || '—'}{item.venue ? `  •  ${item.venue}` : ''}
            </Text>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('new_order')} style={styles.fab} onPress={() => navigation.navigate('NewOrder')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  empty: { textAlign: 'center', color: '#666', marginTop: 40 },
  row: {
    backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 10,
    borderWidth: 1, borderColor: '#eee',
  },
  rowName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  rowSub: { fontSize: 13, color: '#666', marginTop: 2 },
  fab: {
    position: 'absolute', right: 20, bottom: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#c0392b', justifyContent: 'center', alignItems: 'center',
    elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 30 },
});
