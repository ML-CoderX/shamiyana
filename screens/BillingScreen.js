import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList,
  StyleSheet, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  getOrder, getOrderItems, saveBill, getBill, getShop, updateOrderStatus,
} from '../db/database';
import { buildBillHtml, shareBillPdf } from '../utils/pdf';

import { Button, Card, Chip, Field, common } from '../ui/components';
import { color, radius, space, type } from '../ui/tokens';
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

  if (loading) return <ActivityIndicator style={common.page} color={color.brand} accessibilityLabel={t('loading')} />;
  if (error) return <View style={common.body}><Text>{t('load_failed')}</Text><Button variant="secondary" label={t('retry')} onPress={load} /></View>;

  return <SafeAreaView edges={['bottom', 'left', 'right']} style={common.page}>
    <FlatList keyboardShouldPersistTaps="handled"
      contentContainerStyle={common.body} data={items} keyExtractor={item => String(item.id)}
      ListHeaderComponent={<Card style={styles.group}>
        <View style={common.split}><Text style={[common.heading, styles.grow]}>{order.customer_name}</Text><Chip label={t(order.status)} tone={order.status} maxWidth="45%" dot /></View>
        {!!order.event_date && <Text style={common.meta}>{order.event_date}</Text>}
        {!!order.venue && <Text style={common.meta}>{order.venue}</Text>}
        <Text style={styles.label}>{t('status')}</Text>
        <View style={styles.picker}>
          <Picker enabled={!saving} accessibilityLabel={t('status')} selectedValue={order.status} onValueChange={changeStatus}>
            {['pending', 'delivered', 'returned'].map(status => <Picker.Item key={status} label={t(status)} value={status} />)}
          </Picker>
        </View>
      </Card>}
      renderItem={({ item }) => <Card style={common.split}>
        <View style={styles.grow}>
          <Text numberOfLines={2} style={common.heading}>{item.material_name}</Text>
          <Text style={common.meta}>{item.quantity} × ₹{item.unit_cost_snapshot.toFixed(2)}</Text>
        </View>
        <Text style={styles.label}>₹{item.line_total.toFixed(2)}</Text>
      </Card>}
      ListFooterComponent={<Card style={styles.group}>
        <View style={common.split}><Text style={styles.label}>{t('subtotal')}</Text><Text style={styles.label}>₹{subtotal.toFixed(2)}</Text></View>
        <View style={common.split}>
          <Text style={[styles.label, styles.grow]}>{t('flat_amount')}</Text>
          <Switch disabled={saving} trackColor={{ true: color.brand }} accessibilityLabel={t('flat_amount')} value={useManualOverride} onValueChange={(value) => { if (value && !manualAmount) setManualAmount(subtotal.toFixed(2)); setUseManualOverride(value); }} />
        </View>
        {useManualOverride
          ? <Field label={t('final_amount')} prefix="₹" editable={!saving} value={manualAmount} onChangeText={setManualAmount} keyboardType="decimal-pad" placeholder={String(subtotal.toFixed(2))} />
          : <Field label={t('discount_percent')} editable={!saving} value={discountPercent} onChangeText={setDiscountPercent} keyboardType="decimal-pad" />}
        {!useManualOverride && discountPct > 0 && <Text style={styles.discount}>− ₹{discountAmount.toFixed(2)}</Text>}
        <View style={common.divider} />
        <View style={common.split}>
          <Text style={common.heading}>{t('total')}</Text>
          <Text style={styles.total}>{finalAmount === undefined ? '—' : `₹${finalAmount.toFixed(2)}`}</Text>
        </View>
        {!!validationError && <Text accessibilityRole="alert" style={styles.discount}>{t(validationError)}</Text>}
        <Button icon="check" label={t(saving ? 'saving' : 'save_bill')} disabled={saving || !!validationError} onPress={() => handleSaveAndShare(false)} />
        <Button icon="arrow" variant="dashed" label={t('download_share')} disabled={saving || !!validationError} onPress={() => handleSaveAndShare(true)} />
      </Card>}
    />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  group: { gap: space.sm },
  grow: { flex: 1, minWidth: 0 },
  label: { ...type.label, color: color.label },
  picker: { borderWidth: 1, borderColor: color.outline, borderRadius: radius.input },
  discount: { ...type.meta, textAlign: 'right', color: color.brand },
  total: { ...type.heading, color: color.brand },
});
