import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Chip, Field, Icon, Tile, common } from '../ui/components';
import { color, radius, space, type } from '../ui/tokens';
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
  if (loading) return <ActivityIndicator style={common.page} color={color.brand} />;
  if (failed) return <Button variant="secondary" label={t('retry')} onPress={load} />;
  return <SafeAreaView edges={['bottom', 'left', 'right']} style={common.page}>
    <KeyboardAvoidingView style={common.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      <ScrollView contentContainerStyle={common.body} keyboardShouldPersistTaps="handled">
        <Card style={styles.intro}>
          <Tile icon="file" tone="brand" />
          <View style={styles.grow}><Text style={common.heading}>{t('ui.invoice_header')}</Text><Text style={common.meta}>{t('shop_help')}</Text></View>
        </Card>
        {['name', 'phone', 'address'].map(field => <Card key={field}>
          <View style={common.split}>
            <Text style={[common.eyebrow, styles.grow]}>{t(`shop_${field}`)}</Text>
            <Text style={[common.eyebrow, field === 'name' && styles.required]}>{t(`ui.hint_${field}`)}</Text>
          </View>
          <Field style={styles.field} accessibilityLabel={t(`shop_${field}`)} icon={{ name: 'box', phone: 'phone', address: 'pin' }[field]}
            inputStyle={[styles.value, field === 'phone' && styles.mono]} editable={!saving}
            value={shop[field]} onChangeText={value => setShop(previous => ({ ...previous, [field]: value }))}
            keyboardType={field === 'phone' ? 'phone-pad' : 'default'} multiline={field === 'address'} maxLength={field === 'address' ? 500 : 120} />
        </Card>)}
        <View style={common.split}>
          <View style={[common.row, styles.grow]}><Icon name="eye" dimension={16} /><Text style={[common.eyebrow, styles.grow]}>{t('ui.live_preview')}</Text></View>
          <Chip label={t('ui.sample')} />
        </View>
        <Card style={styles.preview}>
          <View style={styles.bookmark}><Icon name="bookmark" tint={color.brand} dimension={20} /></View>
          <Text style={[common.heading, styles.center]}>{shop.name.trim() || t('app_name')}</Text>
          {!!shop.address.trim() && <Text style={[common.meta, styles.center]}>{shop.address.trim()}</Text>}
          {!!shop.phone.trim() && <Text style={[common.meta, styles.mono, styles.center]}>{t('ui.tel', { phone: shop.phone.trim() })}</Text>}
          <View style={common.divider} />
          <Text style={[common.eyebrow, styles.center]}>{t('ui.rental_slip')}</Text>
        </Card>
      </ScrollView>
      <View style={common.footer}><Button icon="check" leading label={t(saving ? 'saving' : 'ui.save_changes')} onPress={save} disabled={saving} /></View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  intro: { ...common.row, alignItems: 'flex-start' },
  grow: { flex: 1 },
  required: { color: color.brand },
  field: { marginTop: space.sm },
  value: { ...type.heading },
  mono: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  preview: { borderStyle: 'dashed', borderColor: color.outline, gap: space.xs },
  center: { textAlign: 'center' },
  bookmark: { alignSelf: 'center', padding: space.sm, borderRadius: radius.pill, backgroundColor: color.rose, marginBottom: space.xs },
});
