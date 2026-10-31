import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

export default function HomeScreen({ navigation }) {
  const { t } = useTranslation();

  const toggleLanguage = () => {
    const next = i18n.language === 'kn' ? 'en' : 'kn';
    i18n.changeLanguage(next);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('app_name')}</Text>
        <TouchableOpacity onPress={toggleLanguage} style={styles.langButton}>
          <Text style={styles.langButtonText}>
            {i18n.language === 'kn' ? 'EN' : 'ಕನ್ನಡ'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.menu}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Materials')}
        >
          <Text style={styles.cardText}>{t('materials')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Orders')}
        >
          <Text style={styles.cardText}>{t('orders')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, styles.primaryCard]}
          onPress={() => navigation.navigate('NewOrder')}
        >
          <Text style={[styles.cardText, styles.primaryCardText]}>{t('new_order')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.cardText}>{t('settings')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  title: { flex: 1, fontSize: 24, fontWeight: '700', color: '#1a1a1a' },
  langButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  langButtonText: { fontWeight: '600', color: '#333' },
  menu: { paddingHorizontal: 20, gap: 14 },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  cardText: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
  primaryCard: { backgroundColor: '#c0392b' },
  primaryCardText: { color: '#fff' },
});
