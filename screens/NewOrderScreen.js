import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, Modal, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Picker } from '@react-native-picker/picker';
import {
  getMaterials, createOrderWithItems,
} from '../db/database';

import { numberInput, money, validEventDate } from '../utils/billing';

export default function NewOrderScreen({ navigation }) {
  const { t } = useTranslation();
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

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>
      {loading && <ActivityIndicator />}
      {failed && <TouchableOpacity style={{ padding: 16 }} onPress={load}><Text>{t('load_failed')} · {t('retry')}</Text></TouchableOpacity>}
      <FlatList automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <View>
            <Text style={styles.label}>{t('customer_name')}</Text>
            <TextInput accessibilityLabel={t('customer_name')} style={styles.input} value={customerName} onChangeText={setCustomerName} />

            <Text style={styles.label}>{t('customer_phone')}</Text>
            <TextInput accessibilityLabel={t('customer_phone')} style={styles.input} value={customerPhone} onChangeText={setCustomerPhone} keyboardType="phone-pad" />

            <Text style={styles.label}>{t('event_date')}</Text>
            <TextInput accessibilityLabel={t('event_date')} style={styles.input} value={eventDate} onChangeText={setEventDate} placeholder="DD-MM-YYYY" />

            <Text style={styles.label}>{t('venue')}</Text>
            <TextInput accessibilityLabel={t('venue')} style={styles.input} value={venue} onChangeText={setVenue} />

            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>{t('order_items')}</Text>
          </View>
        }
        data={cart}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item, index }) => (
          <View style={styles.cartRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cartName}>{item.name}</Text>
              <Text style={styles.cartSub}>
                {item.quantity} × ₹{item.unit_cost.toFixed(2)} = ₹{(item.quantity * item.unit_cost).toFixed(2)}
              </Text>
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('delete')} style={{ minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' }} onPress={() => removeCartItem(index)}>
              <Text style={styles.removeText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        ListFooterComponent={
          <View>
            <TouchableOpacity disabled={loading || failed || saving} style={styles.addItemBtn} onPress={openPicker}>
              <Text style={styles.addItemBtnText}>+ {t('add_item')}</Text>
            </TouchableOpacity>

            {cart.length > 0 && (
              <Text style={styles.totalText}>{t('subtotal')}: ₹{cartTotal.toFixed(2)}</Text>
            )}

            <TouchableOpacity disabled={saving} style={[styles.submitBtn, saving && { opacity: 0.5 }]} onPress={handleCreateOrder}>
              <Text style={styles.submitBtnText}>{t(saving ? 'saving' : 'new_order')}</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <Modal onRequestClose={() => setPickerVisible(false)} visible={pickerVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: '90%', flexGrow: 0 }} contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('select_material')}</Text>
            <View style={styles.pickerWrap}>
              <Picker accessibilityLabel={t('select_material')} selectedValue={selectedMaterial} onValueChange={setSelectedMaterial}>
                {materials.map((m) => (
                  <Picker.Item key={m.id} label={`${m.name} (₹${m.unit_cost}/${m.unit})`} value={m.id} />
                ))}
              </Picker>
            </View>
            <Text style={styles.label}>{t('quantity')}</Text>
            <TextInput accessibilityLabel={t('quantity')} style={styles.input} value={qty} onChangeText={setQty} keyboardType="decimal-pad" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setPickerVisible(false)}>
                <Text>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={confirmAddItem}>
                <Text style={styles.saveBtnText}>{t('add_item')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  label: { fontSize: 13, color: '#555', marginTop: 8, marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#fff',
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 16,
  },
  divider: { height: 1, backgroundColor: '#e0e0e0', marginVertical: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  cartRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8,
    borderWidth: 1, borderColor: '#eee',
  },
  cartName: { fontWeight: '600', color: '#1a1a1a' },
  cartSub: { fontSize: 13, color: '#666', marginTop: 2 },
  removeText: { color: '#c0392b', fontSize: 16, paddingHorizontal: 6 },
  addItemBtn: {
    borderWidth: 1, borderColor: '#c0392b', borderRadius: 8,
    paddingVertical: 12, alignItems: 'center', marginTop: 6,
  },
  addItemBtnText: { color: '#c0392b', fontWeight: '600' },
  totalText: { textAlign: 'right', fontSize: 16, fontWeight: '700', marginTop: 14 },
  submitBtn: {
    backgroundColor: '#c0392b', borderRadius: 8, paddingVertical: 14,
    alignItems: 'center', marginTop: 20,
  },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', padding: 20, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  pickerWrap: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 6 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 12 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  saveBtn: { backgroundColor: '#c0392b', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  saveBtnText: { color: '#fff', fontWeight: '600' },
});
