import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  getOrder, getOrderItems, saveBill, getBill, getShop, updateOrderStatus,
} from '../db/database';
import { buildBillHtml, shareBillPdf } from '../utils/pdf';

import { billTotals } from '../utils/billing';
import { Picker } from '@react-native-picker/picker';

export default function BillingScreen({ route }) {
  const { orderId } = route.params;
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const [shop, setShop] = useState({});
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [subtotal, setSubtotal] = useState(0);

  const [useManualOverride, setUseManualOverride] = useState(false);
  const [discountPercent, setDiscountPercent] = useState('0');
  const [manualAmount, setManualAmount] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [o, its, existingBill, details] = await Promise.all([getOrder(orderId), getOrderItems(orderId), getBill(orderId), getShop()]);
      if (!o) throw new Error('missing_order');
      setOrder(o);
      setItems(its);
      setShop(details);
      setSubtotal(its.reduce((sum, item) => sum + item.line_total, 0));
      if (existingBill) {
        setUseManualOverride(!!existingBill.is_manual_override);
        setManualAmount(String(existingBill.final_amount));
        setDiscountPercent(String(existingBill.discount_value || 0));
      }
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [orderId]);
  useEffect(() => { load(); }, [load]);

  let totals;
  let validationError;
  try { totals = billTotals(items, useManualOverride, discountPercent, manualAmount); }
  catch (error) { validationError = error.message; }
  const discountPct = totals?.percent || 0;
  const discountAmount = totals?.discountAmount || 0;
  const finalAmount = totals?.finalAmount;

  const handleSaveAndShare = async (share) => {
    if (lock.current || !order) return;
    if (validationError) return Alert.alert(t('error'), t(validationError));
    lock.current = true;
    setSaving(true);
    let saved = false;
    try {
      await saveBill(orderId, totals.subtotal, useManualOverride ? 'manual' : 'percent', discountPct, finalAmount, useManualOverride, null);
      saved = true;
      if (share) {
        const discountLabel = !useManualOverride && discountPct > 0 ? `${discountPct}% (−₹${discountAmount.toFixed(2)})` : null;
        await shareBillPdf(buildBillHtml({ t, order, items, subtotal: totals.subtotal, discountLabel, finalAmount, shop }), `Bill_${orderId}`);
      } else { Alert.alert(t('saved'), t('bill_saved')); }
    } catch { Alert.alert(t('error'), t(saved ? 'share_failed' : 'save_failed')); }
    finally { lock.current = false; setSaving(false); }
  };

  const changeStatus = async (status) => {
    if (lock.current || status === order.status) return;
    lock.current = true;
    setSaving(true);
    try { await updateOrderStatus(orderId, status); setOrder({ ...order, status }); }
    catch { Alert.alert(t('error'), t('save_failed')); }
    finally { lock.current = false; setSaving(false); }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} accessibilityLabel={t('loading')} />;
  if (error) return <View style={{ padding: 24 }}><Text>{t('load_failed')}</Text><TouchableOpacity onPress={load} style={{ padding: 16 }}><Text>{t('retry')}</Text></TouchableOpacity></View>;

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>
      <FlatList automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16 }}
        data={items}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          <View>
            <Text style={styles.customerName}>{order.customer_name}</Text>
            {order.event_date ? <Text style={styles.meta}>{order.event_date}</Text> : null}
            {order.venue ? <Text style={styles.meta}>{order.venue}</Text> : null}
            <Text style={[styles.label, { marginTop: 16 }]}>{t('status')}</Text>
            <Picker enabled={!saving} accessibilityLabel={t('status')} selectedValue={order.status} onValueChange={changeStatus}>
              {['pending', 'delivered', 'returned'].map(status => <Picker.Item key={status} label={t(status)} value={status} />)}
            </Picker>
            <View style={styles.divider} />
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <View style={{ flex: 1 }}><Text style={styles.itemName}>{item.material_name}</Text>
            <Text style={styles.itemDetail}>
              {item.quantity} × ₹{item.unit_cost_snapshot.toFixed(2)}
            </Text>
            </View><Text style={styles.itemTotal}>₹{item.line_total.toFixed(2)}</Text>
          </View>
        )}
        ListFooterComponent={
          <View>
            <View style={styles.divider} />
            <Text style={styles.subtotalText}>{t('subtotal')}: ₹{subtotal.toFixed(2)}</Text>

            <View style={styles.toggleRow}>
              <Text style={styles.label}>{t('flat_amount')}</Text>
              <Switch disabled={saving} accessibilityLabel={t('flat_amount')} value={useManualOverride} onValueChange={(value) => { if (value && !manualAmount) setManualAmount(subtotal.toFixed(2)); setUseManualOverride(value); }} />
            </View>

            {!useManualOverride ? (
              <View>
                <Text style={styles.label}>{t('discount_percent')}</Text>
                <TextInput
                  style={styles.input}
                  accessibilityLabel={t('discount_percent')} editable={!saving}
                  value={discountPercent}
                  onChangeText={setDiscountPercent}
                  keyboardType="decimal-pad"
                />
                {discountPct > 0 && (
                  <Text style={styles.discountPreview}>
                    − ₹{discountAmount.toFixed(2)}
                  </Text>
                )}
              </View>
            ) : (
              <View>
                <Text style={styles.label}>{t('final_amount')}</Text>
                <TextInput
                  style={styles.input}
                  accessibilityLabel={t('final_amount')} editable={!saving}
                  value={manualAmount}
                  onChangeText={setManualAmount}
                  keyboardType="decimal-pad"
                  placeholder={String(subtotal.toFixed(2))}
                />
              </View>
            )}

            <Text style={styles.finalAmount}>
              {t('total')}: {finalAmount === undefined ? '—' : `₹${finalAmount.toFixed(2)}`}
            </Text>

            {validationError && <Text accessibilityRole="alert" style={{ color: '#a5281b', marginTop: 12 }}>{t(validationError)}</Text>}
            <TouchableOpacity disabled={saving || !!validationError} style={[styles.shareBtn, { opacity: saving || validationError ? 0.5 : 1 }]} onPress={() => handleSaveAndShare(false)}>
              <Text style={styles.shareBtnText}>{t(saving ? 'saving' : 'save_bill')}</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={saving || !!validationError} style={[styles.shareBtn, { marginTop: 0, opacity: saving || validationError ? 0.5 : 1 }]} onPress={() => handleSaveAndShare(true)}>
              <Text style={styles.shareBtnText}>{t('download_share')}</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  customerName: { fontSize: 20, fontWeight: '700' },
  meta: { color: '#666', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#e0e0e0', marginVertical: 14 },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#eee',
  },
  itemName: { flex: 1, fontWeight: '600' },
  itemDetail: { color: '#666', fontSize: 13, marginRight: 10 },
  itemTotal: { fontWeight: '700', minWidth: 80, textAlign: 'right' },
  subtotalText: { fontSize: 16, fontWeight: '600', textAlign: 'right' },
  toggleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18,
  },
  label: { fontSize: 14, color: '#333', flex: 1, marginRight: 10 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#fff',
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, marginTop: 8,
  },
  discountPreview: { textAlign: 'right', color: '#c0392b', marginTop: 4 },
  finalAmount: { fontSize: 20, fontWeight: '800', textAlign: 'right', marginTop: 20 },
  shareBtn: {
    backgroundColor: '#c0392b', borderRadius: 8, paddingVertical: 14,
    alignItems: 'center', marginTop: 20, marginBottom: 16,
  },
  shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
