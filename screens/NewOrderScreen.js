import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Picker } from '@react-native-picker/picker';
import {
  getMaterials, createOrderWithItems,
} from '../db/database';

import { Button, Card, Chip, Field, IconButton, Sheet, Tap, common } from '../ui/components';
import { color, radius, size, space, type } from '../ui/tokens';
import { numberInput, money, validEventDate } from '../utils/billing';

export default function NewOrderScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const [calendar, setCalendar] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [venue, setVenue] = useState('');

  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [cart, setCart] = useState([]); // {material_id, name, unit_cost, quantity}

  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [qty, setQty] = useState('1');
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);

  const load = useCallback(async () => {
    setLoading(true); setFailed(false);
    try {
      const rows = await getMaterials();
      setMaterials(rows);
      if (rows.length) setSelectedMaterial(rows[0].id);
    } catch { setFailed(true); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openPicker = () => {
    if (loading || failed) return;
    if (materials.length === 0) {
      Alert.alert(t('no_materials'), t('add_materials_first'), [{ text: t('cancel') }, { text: t('materials'), onPress: () => navigation.replace('Materials') }]);
      return;
    }
    setQty('1');
    setPickerVisible(true);
  };

  const confirmAddItem = () => {
    const mat = materials.find((m) => m.id === selectedMaterial);
    const quantity = numberInput(qty);
    if (!mat || !Number.isFinite(quantity) || quantity <= 0 || quantity * mat.unit_cost > 1e10) {
      Alert.alert(t('error'), t('invalid_quantity'));
      return;
    }
    if (cartTotal + money(quantity * mat.unit_cost) > 1e10) return Alert.alert(t('error'), t('invalid_amount'));
    setCart((prev) => [
      ...prev,
      { material_id: mat.id, name: mat.name, unit_cost: mat.unit_cost, quantity },
    ]);
    setPickerVisible(false);
  };

  const removeCartItem = (index) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const cartTotal = cart.reduce((sum, i) => sum + money(i.unit_cost * i.quantity), 0);

  const handleCreateOrder = async () => {
    if (lock.current) return;
    if (!customerName.trim()) return Alert.alert(t('error'), t('customer_required'));
    if (!cart.length) return Alert.alert(t('error'), t('items_required'));
    if (!validEventDate(eventDate)) return Alert.alert(t('error'), t('invalid_date'));
    lock.current = true;
    setSaving(true);
    try {
      const orderId = await createOrderWithItems(customerName, customerPhone, eventDate, venue, cart);
      navigation.replace('Billing', { orderId });
    } catch (error) {
      Alert.alert(t('error'), t(error.message, { defaultValue: t('save_failed') }));
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };

  return <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.page}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {loading && <ActivityIndicator color={color.brand} />}
      {failed && <Button variant="secondary" label={t('retry')} onPress={load} />}
      <FlatList keyboardShouldPersistTaps="handled" contentContainerStyle={common.body}
        ListHeaderComponent={<View style={styles.form}>
          <Field label={t('customer_name')} icon="user" required value={customerName} onChangeText={setCustomerName} />
          <Field label={t('customer_phone')} icon="phone" value={customerPhone} onChangeText={setCustomerPhone} keyboardType="phone-pad" />
          <Field label={t('event_date')} icon="calendar" value={eventDate} onChangeText={setEventDate} placeholder="DD-MM-YYYY"
            action={<IconButton icon="calendar" label={t('ui.choose_date')} onPress={() => {
              const [day, month, year] = eventDate.trim().split('-').map(Number);
              setCalendar(day && validEventDate(eventDate) ? new Date(year, month - 1, 1) : new Date());
            }} />} />
          <Field label={t('venue')} icon="pin" value={venue} onChangeText={setVenue} />
          <View style={common.divider} />
          <View style={common.split}>
            <Text style={[common.heading, styles.flex]}>{t('order_items')}</Text>
            <Chip label={t('ui.added', { count: cart.length })} tone="brand" />
          </View>
          <Text style={common.meta}>{t('ui.estimated')}</Text>
        </View>}
        data={cart} keyExtractor={(_, index) => String(index)}
        renderItem={({ item, index }) => <Card style={common.row}>
          <View style={styles.quantity}><Text style={styles.rate}>{item.quantity}×</Text></View>
          <View style={styles.flex}>
            <Text numberOfLines={2} style={common.heading}>{item.name}</Text>
            <Text style={styles.rate}>{t('ui.per_unit', { price: item.unit_cost.toFixed(2) })}</Text>
          </View>
          <View style={styles.itemEnd}>
            <Text style={styles.amount}>₹{money(item.quantity * item.unit_cost).toFixed(2)}</Text>
            <IconButton label={t('delete')} icon="trash" onPress={() => removeCartItem(index)} />
          </View>
        </Card>}
        ListFooterComponent={<View style={styles.form}>
          <Button variant="dashed" icon="plus" leading label={t('add_item')} disabled={loading || failed || saving} onPress={openPicker} />
          <Card style={styles.totals}>
            <View style={common.split}><Text style={common.meta}>{t('subtotal')}</Text><Text style={common.meta}>₹{cartTotal.toFixed(2)}</Text></View>
            <View style={common.divider} />
            <View style={common.split}><Text style={common.heading}>{t('ui.grand_total')}</Text><Text style={[common.heading, styles.rate]}>₹{cartTotal.toFixed(2)}</Text></View>
          </Card>
        </View>}
      />
      <View style={common.footer}><Button icon="arrow" label={t(saving ? 'saving' : 'ui.create_order')} disabled={saving} onPress={handleCreateOrder} /></View>
    </KeyboardAvoidingView>
    <Sheet visible={!!calendar} close={() => setCalendar(null)} title={t('ui.choose_date')} closeLabel={t('ui.close')}>
      {calendar && <View>
        <View style={common.split}>
          <IconButton icon="back" label={t('ui.previous_month')} onPress={() => setCalendar(new Date(calendar.getFullYear(), calendar.getMonth() - 1, 1))} />
          <Text style={[common.heading, styles.monthTitle]}>{new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(calendar)}</Text>
          <IconButton icon="arrow" label={t('ui.next_month')} onPress={() => setCalendar(new Date(calendar.getFullYear(), calendar.getMonth() + 1, 1))} />
        </View>
        <View style={styles.days}>{Array.from({ length: new Date(calendar.getFullYear(), calendar.getMonth() + 1, 0).getDate() }, (_, index) => {
          const day = index + 1;
          const value = [day, calendar.getMonth() + 1, calendar.getFullYear()].map(part => String(part).padStart(2, '0')).join('-');
          return <Tap key={day} containerStyle={styles.dayCell} style={styles.day} accessibilityLabel={value}
            onPress={() => { setEventDate(value); setCalendar(null); }}><Text style={styles.amount}>{day}</Text></Tap>;
        })}</View>
      </View>}
    </Sheet>
    <Sheet visible={pickerVisible} close={() => setPickerVisible(false)} title={t('select_material')} closeLabel={t('ui.close')}>
      <View style={styles.picker}>
        <Picker accessibilityLabel={t('select_material')} selectedValue={selectedMaterial} onValueChange={setSelectedMaterial}>
          {materials.map(m => <Picker.Item key={m.id} label={`${m.name} (₹${m.unit_cost}/${m.unit})`} value={m.id} />)}
        </Picker>
      </View>
      <Field label={t('quantity')} value={qty} onChangeText={setQty} keyboardType="decimal-pad" />
      <View style={styles.actions}>
        <Button variant="secondary" label={t('cancel')} onPress={() => setPickerVisible(false)} />
        <Button label={t('add_item')} onPress={confirmAddItem} />
      </View>
    </Sheet>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  page: { ...common.page, backgroundColor: color.white },
  flex: { flex: 1, minWidth: 0 },
  form: { gap: space.lg },
  quantity: { backgroundColor: color.blush, padding: space.sm, borderRadius: radius.input, maxWidth: '24%' },
  rate: { ...type.label, color: color.brand },
  amount: { ...type.label, color: color.ink, fontVariant: ['tabular-nums'] },
  itemEnd: { alignItems: 'flex-end', maxWidth: '38%' },
  totals: { backgroundColor: color.page },
  picker: { borderWidth: 1, borderColor: color.outline, borderRadius: radius.input },
  monthTitle: { flex: 1, textAlign: 'center' },
  days: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '16.66%' },
  day: { minHeight: size.touch, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: space.sm },
});
