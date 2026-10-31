import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getShop, saveShop } from '../db/database';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const [shop, setShop] = useState({ name: '', phone: '', address: '' });
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const load = async () => {
    setLoading(true); setFailed(false);
    try { setShop(await getShop()); } catch { setFailed(true); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const save = async () => {
    if (lock.current) return;
    if (!shop.name.trim()) return Alert.alert(t('error'), t('shop_required'));
    lock.current = true; setSaving(true);
    try { await saveShop(shop); Alert.alert(t('saved'), t('settings_saved')); }
    catch { Alert.alert(t('error'), t('save_failed')); }
    finally { lock.current = false; setSaving(false); }
  };
  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;
  if (failed) return <TouchableOpacity style={{ padding: 24 }} onPress={load}><Text>{t('load_failed')} · {t('retry')}</Text></TouchableOpacity>;
  return <ScrollView style={styles.page} contentContainerStyle={{ padding: 20, paddingBottom: 64 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
    <Text style={styles.description}>{t('shop_help')}</Text>
    {['name', 'phone', 'address'].map(field => <ReactField key={field} field={field} shop={shop} setShop={setShop} t={t} saving={saving} />)}
    <TouchableOpacity accessibilityRole="button" disabled={saving} style={[styles.button, saving && { opacity: 0.5 }]} onPress={save}><Text style={styles.buttonText}>{t(saving ? 'saving' : 'save')}</Text></TouchableOpacity>
  </ScrollView>;
}

function ReactField({ field, shop, setShop, t, saving }) {
  return <>
    <Text style={styles.label}>{t(`shop_${field}`)}</Text>
    <TextInput accessibilityLabel={t(`shop_${field}`)} editable={!saving} style={styles.input} value={shop[field]} onChangeText={value => setShop(previous => ({ ...previous, [field]: value }))} keyboardType={field === 'phone' ? 'phone-pad' : 'default'} multiline={field === 'address'} maxLength={field === 'address' ? 500 : 120} />
  </>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f5f5f5' },
  description: { fontSize: 16, color: '#555', marginBottom: 24, lineHeight: 24 },
  label: { fontSize: 16, marginBottom: 8, color: '#333' },
  input: { fontSize: 16, padding: 12, minHeight: 48, borderWidth: 1, borderColor: '#bbb', borderRadius: 8, backgroundColor: '#fff', marginBottom: 20 },
  button: { padding: 16, borderRadius: 8, backgroundColor: '#c0392b', alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
