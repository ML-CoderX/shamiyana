import { useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import {
  getMaterials, addMaterial, updateMaterial, deleteMaterial,
} from '../db/database';

import { Picker } from '@react-native-picker/picker';
import { AppBar, Button, Card, Chip, Field, IconButton, Sheet, Tap, Tile, common } from '../ui/components';
import { color, radius, space, type } from '../ui/tokens';
import { numberInput } from '../utils/billing';

export default function MaterialsScreen({ navigation }) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const lock = useRef(false);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('piece');
  const [editingCustomUnit, setEditingCustomUnit] = useState(false);
  const [cost, setCost] = useState('');
  const [category, setCategory] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setFailed(false);
    try { setMaterials(await getMaterials()); } catch { setFailed(true); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setUnit('piece');
    setEditingCustomUnit(false);
    setCost('');
    setCategory('');
  };

  const openAdd = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setName(item.name);
    setUnit(item.unit);
    setEditingCustomUnit(false);
    setCost(String(item.unit_cost));
    setCategory(item.category || '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (lock.current) return;
    const costNum = numberInput(cost);
    if (!name.trim() || !Number.isFinite(costNum) || costNum < 0.01 || costNum > 1e10) {
      Alert.alert(t('error'), t('invalid_material'));
      return;
    }
    lock.current = true; setSaving(true);
    try {
    if (editingId) {
      await updateMaterial(editingId, name.trim(), unit.trim() || 'piece', costNum, category.trim());
    } else {
      await addMaterial(name.trim(), unit.trim() || 'piece', costNum, category.trim());
    }
    setModalVisible(false);
    resetForm();
    await load();
    } catch { Alert.alert(t('error'), t('save_failed')); }
    finally { lock.current = false; setSaving(false); }
  };

  const handleDelete = (id) => {
    Alert.alert(t('delete'), t('delete_material_confirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'), style: 'destructive',
        onPress: async () => { try { await deleteMaterial(id); await load(); } catch { Alert.alert(t('error'), t('save_failed')); } },
      },
    ]);
  };

  const categories = [...new Set(materials.map(item => item.category).filter(Boolean))];
  const needle = query.trim().toLowerCase();
  const selectedCategory = categories.includes(categoryFilter) ? categoryFilter : null;
  const shown = materials.filter(item =>
    (!selectedCategory || item.category === selectedCategory) &&
    [item.name, item.category].some(value => value?.toLowerCase().includes(needle)));
  const units = [...new Set(['piece', 'set', 'day', ...materials.map(item => item.unit), unit].filter(Boolean))];
  const close = () => { if (!saving) setModalVisible(false); };

  return <SafeAreaView edges={['bottom', 'left', 'right']} style={common.page}>
    <AppBar title={t('materials')} back={navigation.goBack} backLabel={t('ui.back')} badge={t(materials.length === 1 ? 'ui.items_one' : 'ui.items_other', { number: materials.length })}>
      <Field style={styles.search} icon="search" value={query} onChangeText={setQuery} placeholder={t('ui.search_materials')} accessibilityLabel={t('ui.search_materials')} />
    </AppBar>
    <View style={styles.filters}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      <Chip label={t('ui.all_items')} active={selectedCategory === null} onPress={() => setCategoryFilter(null)} />
      {categories.map(value => <Chip key={value} label={value} active={selectedCategory === value} onPress={() => setCategoryFilter(value)} />)}
    </ScrollView></View>
    {failed && <Button label={t('retry')} variant="secondary" onPress={load} />}
    <FlatList data={shown} keyExtractor={item => String(item.id)} contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled" refreshing={loading} onRefresh={load}
      ListEmptyComponent={loading ? <ActivityIndicator color={color.brand} /> : !failed && <Text style={styles.empty}>{t(materials.length ? 'ui.no_matching_materials' : 'no_materials')}</Text>}
      renderItem={({ item }) => <Card style={common.row}>
        <Tap style={common.row} accessibilityLabel={`${t('edit')} ${item.name}`} onPress={() => openEdit(item)}>
          <Tile icon="box" tone="brand" />
        </Tap>
        <Tap style={styles.materialText} containerStyle={styles.flex} onPress={() => openEdit(item)}>
          <Text numberOfLines={2} style={common.heading}>{item.name}</Text>
          {!!item.category && <Text numberOfLines={1} style={common.eyebrow}>{item.category}</Text>}
          <Text style={styles.price}>₹{item.unit_cost.toFixed(2)} <Text style={common.meta}>/ {t(`ui.unit_${item.unit}`, { defaultValue: item.unit })}</Text></Text>
        </Tap>
        <IconButton label={`${t('delete')} ${item.name}`} icon="close" onPress={() => handleDelete(item.id)} />
      </Card>}
    />
    <View style={common.fab}><IconButton label={t('add_material')} icon="plus" tint={color.white} style={common.fabInner} onPress={openAdd} /></View>
    <Sheet visible={modalVisible} close={close} title={t(editingId ? 'edit_material' : 'add_material')} closeLabel={t('ui.close')}>
      <Field label={t('material_name')} required value={name} onChangeText={setName} />
      <View>
        <Text style={styles.label}>{t('unit')}</Text>
        <View style={styles.picker}><Picker accessibilityLabel={t('unit')} selectedValue={editingCustomUnit ? units.length : units.indexOf(unit)} onValueChange={value => {
          setEditingCustomUnit(value === units.length);
          if (value < units.length) setUnit(units[value]);
        }}>
          {units.map((value, index) => <Picker.Item key={value} value={index} label={t(`ui.unit_${value}`, { defaultValue: value })} />)}
          <Picker.Item value={units.length} label={t('ui.custom_unit')} />
        </Picker></View>
        {editingCustomUnit && <Field style={styles.customUnit} label={t('ui.custom_unit')} value={unit} onChangeText={setUnit} />}
      </View>
      <Field label={t('unit_cost')} prefix="₹" required value={cost} onChangeText={setCost} keyboardType="decimal-pad" />
      <Field label={t('category')} value={category} onChangeText={setCategory} placeholder={t('optional')} />
      {categories.length > 0 && <View style={styles.suggestions}>{categories
        .filter(value => value !== category && value.toLowerCase().includes(category.trim().toLowerCase()))
        .slice(0, 6).map(value => <Chip key={value} label={value} onPress={() => setCategory(value)} />)}</View>}
      <View style={styles.actions}>
        <Button variant="secondary" label={t('cancel')} disabled={saving} onPress={close} />
        <Button label={t(saving ? 'saving' : 'save')} disabled={saving} onPress={handleSave} />
      </View>
    </Sheet>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  search: { marginHorizontal: space.lg, marginBottom: space.md },
  filters: { backgroundColor: color.white, borderBottomWidth: 1, borderColor: color.line },
  chips: { padding: space.md, gap: space.sm },
  list: { ...common.body, paddingBottom: space.section * 3 },
  materialText: { gap: space.xs },
  price: { ...type.label, color: color.brand },
  empty: { ...common.meta, textAlign: 'center', marginTop: space.section },
  label: { ...type.label, color: color.label, marginBottom: space.sm },
  picker: { borderWidth: 1, borderColor: color.outline, borderRadius: radius.input },
  customUnit: { marginTop: space.md },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: space.sm },
});
