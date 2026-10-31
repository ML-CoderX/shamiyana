import { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, Modal, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import {
  getMaterials, addMaterial, updateMaterial, deleteMaterial,
} from '../db/database';

import { numberInput } from '../utils/billing';

export default function MaterialsScreen() {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const lock = useRef(false);
  const [materials, setMaterials] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('piece');
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

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>
      {failed && <TouchableOpacity onPress={load} style={{ padding: 16 }}><Text>{t('load_failed')} · {t('retry')}</Text></TouchableOpacity>}
      <FlatList
        data={materials}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshing={loading} onRefresh={load}
        ListEmptyComponent={loading ? <ActivityIndicator /> : !failed ? <Text style={styles.empty}>{t('no_materials')}</Text> : null}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => openEdit(item)}>
              <Text style={styles.rowName}>{item.name}</Text>
              <Text style={styles.rowSub}>
                ₹{item.unit_cost.toFixed(2)} / {item.unit}
                {item.category ? `  •  ${item.category}` : ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${t('delete')} ${item.name}`} onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('add_material')} style={styles.fab} onPress={openAdd}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal onRequestClose={() => { if (!saving) setModalVisible(false); }} visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: '90%', flexGrow: 0 }} contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalTitle}>{t(editingId ? 'edit_material' : 'add_material')}</Text>

            <Text style={styles.label}>{t('material_name')}</Text>
            <TextInput accessibilityLabel={t('material_name')} style={styles.input} value={name} onChangeText={setName} />

            <Text style={styles.label}>{t('unit')}</Text>
            <TextInput accessibilityLabel={t('unit')} style={styles.input} value={unit} onChangeText={setUnit} placeholder="piece / set / day" />

            <Text style={styles.label}>{t('unit_cost')}</Text>
            <TextInput accessibilityLabel={t('unit_cost')} style={styles.input} value={cost} onChangeText={setCost} keyboardType="decimal-pad" />

            <Text style={styles.label}>{t('category')}</Text>
            <TextInput accessibilityLabel={t('category')} style={styles.input} value={category} onChangeText={setCategory} placeholder={t('optional')} />

            <View style={styles.modalActions}>
              <TouchableOpacity disabled={saving} style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={handleSave}>
                <Text style={styles.saveBtnText}>{t(saving ? 'saving' : 'save')}</Text>
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
  empty: { textAlign: 'center', color: '#666', marginTop: 40 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 10,
    borderWidth: 1, borderColor: '#eee',
  },
  rowName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  rowSub: { fontSize: 13, color: '#666', marginTop: 2 },
  deleteBtn: { padding: 12, minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { color: '#c0392b', fontSize: 16 },
  fab: {
    position: 'absolute', right: 20, bottom: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#c0392b', justifyContent: 'center', alignItems: 'center',
    elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 30 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', padding: 20, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  label: { fontSize: 13, color: '#555', marginTop: 8, marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 16,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 12 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  saveBtn: { backgroundColor: '#c0392b', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  saveBtnText: { color: '#fff', fontWeight: '600' },
});
