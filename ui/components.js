import { useRef, useState } from 'react';
import { Animated, Image, KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color, radius, shadow, size, space, type } from './tokens';

const glyphs = {
  box: require('../assets/icons/box.png'),
  file: require('../assets/icons/file.png'),
  plus: require('../assets/icons/plus.png'),
  close: require('../assets/icons/close.png'),
  chevron: require('../assets/icons/chevron.png'),
  arrow: require('../assets/icons/arrow.png'),
  back: require('../assets/icons/back.png'),
  check: require('../assets/icons/check.png'),
  calendar: require('../assets/icons/calendar.png'),
  pin: require('../assets/icons/pin.png'),
  phone: require('../assets/icons/phone.png'),
  search: require('../assets/icons/search.png'),
  user: require('../assets/icons/user.png'),
  globe: require('../assets/icons/globe.png'),
  settings: require('../assets/icons/settings.png'),
  trash: require('../assets/icons/trash.png'),
  bookmark: require('../assets/icons/bookmark.png'),
  eye: require('../assets/icons/eye.png'),
};

export function Icon({ name, tint = color.label, dimension = size.icon }) {
  return <Image accessible={false} source={glyphs[name]} style={{ width: dimension, height: dimension, tintColor: tint }} />;
}

export function Tap({ children, style, containerStyle, disabled, ...props }) {
  const scale = useRef(new Animated.Value(1)).current;
  const move = toValue => Animated.timing(scale, { toValue, duration: 100, useNativeDriver: true }).start();
  return <Pressable accessibilityRole="button" style={containerStyle} disabled={disabled} {...props} onPressIn={() => move(0.985)} onPressOut={() => move(1)}>
    <Animated.View style={[style, { transform: [{ scale }] }, disabled && styles.disabled]}>{children}</Animated.View>
  </Pressable>;
}

export function Card({ children, style, onPress }) {
  if (onPress) return <Tap style={[styles.card, style]} onPress={onPress}>{children}</Tap>;
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Tile({ icon, tone = 'neutral' }) {
  const tint = tone === 'white' ? color.white : tone === 'brand' ? color.brand : color.label;
  const backgroundColor = tone === 'white' ? color.glass : tone === 'brand' ? color.blush : color.tile;
  return <View style={[styles.tile, { backgroundColor }]}><Icon name={icon} tint={tint} /></View>;
}

const tones = {
  pending: [color.amber, color.amberBg, color.amberLine],
  delivered: [color.green, color.greenBg, color.greenLine],
  returned: [color.blue, color.blueBg, color.blueLine],
  brand: [color.brand, color.blush, color.rose],
  neutral: [color.label, color.tile, color.line],
};

export function Chip({ label, tone = 'neutral', active, dot, onPress, maxWidth }) {
  const [ink, backgroundColor, borderColor] = tones[tone] || tones.neutral;
  const style = [styles.chip, { backgroundColor: active ? color.brand : backgroundColor, borderColor: active ? color.brand : borderColor, maxWidth }];
  const contents = <>{dot && <View style={[styles.dot, { backgroundColor: ink }]} />}<Text style={[dot ? type.eyebrow : type.meta, { color: active ? color.white : ink, flexShrink: 1 }]}>{label}</Text></>;
  if (onPress) return <Tap accessibilityState={{ selected: !!active }} onPress={onPress} style={[style, styles.chipTouch]}>{contents}</Tap>;
  return <View style={style}>{contents}</View>;
}

export function Button({ label, icon, leading, variant = 'primary', style, ...props }) {
  const primary = variant === 'primary';
  const tint = primary ? color.white : color.brand;
  const glyph = icon && <Icon name={icon} tint={tint} dimension={20} />;
  return <Tap style={[styles.button, primary && styles.primary, variant === 'dashed' && styles.dashed, style]} {...props}>
    {leading && glyph}<Text style={[type.label, { color: tint, flexShrink: 1, textAlign: 'center' }]}>{label}</Text>{!leading && glyph}
  </Tap>;
}

export function IconButton({ label, icon, tint, style, ...props }) {
  return <Tap accessibilityLabel={label} style={[styles.iconButton, style]} {...props}><Icon name={icon} tint={tint} /></Tap>;
}

export function Field({ label, icon, required, prefix, style, inputStyle, action, ...props }) {
  const [focused, setFocused] = useState(false);
  return <View style={style}>
    {!!label && <Text style={styles.label}>{label}{required && <Text style={{ color: color.brand }}> *</Text>}</Text>}
    <View style={[styles.field, focused && styles.focused]}>
      {icon && <Icon name={icon} tint={color.placeholder} dimension={20} />}
      {!!prefix && <Text style={styles.prefix}>{prefix}</Text>}
      <TextInput {...props} accessibilityLabel={label || props.accessibilityLabel} placeholderTextColor={color.placeholder}
        selectionColor={color.rose} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={[styles.input, inputStyle]} />
      {action}
    </View>
  </View>;
}

export function Sheet({ visible, close, title, closeLabel, children }) {
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
    <KeyboardAvoidingView style={styles.overlay} behavior="height">
      <SafeAreaView edges={['bottom']} style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.sheetHeader}><Text accessibilityRole="header" style={[type.heading, styles.grow]}>{title}</Text>
          <IconButton label={closeLabel} icon="close" onPress={close} />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetBody}>{children}</ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  </Modal>;
}

export function AppBar({ title, back, backLabel, badge, action, children }) {
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.appBar}>
    <View style={styles.barRow}>
      {back && <IconButton label={backLabel} icon="back" tint={color.white} onPress={back} />}
      <Text accessibilityRole="header" numberOfLines={2} style={[type.bar, styles.barTitle]}>{title}</Text>
      {badge && <Text style={styles.barBadge}>{badge}</Text>}{action}
    </View>
    {children}
  </SafeAreaView>;
}

export const common = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.page },
  body: { padding: space.lg, gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  split: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  heading: { ...type.heading, color: color.ink },
  meta: { ...type.meta, color: color.muted },
  eyebrow: { ...type.eyebrow, color: color.muted },
  footer: { backgroundColor: color.white, padding: space.lg, borderTopWidth: 1, borderColor: color.line },
  divider: { borderTopWidth: 1, borderStyle: 'dashed', borderColor: color.outline, marginVertical: space.md },
  fab: { position: 'absolute', right: space.xl, bottom: space.xl },
  fabInner: { width: size.cta, height: size.cta, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: color.brand, ...shadow.cta },
});

const styles = StyleSheet.create({
  disabled: { opacity: 0.5 },
  grow: { flex: 1, color: color.ink },
  card: { borderRadius: radius.card, borderWidth: 1, borderColor: color.line, backgroundColor: color.white, padding: space.lg, ...shadow.card },
  tile: { width: size.tile, height: size.tile, borderRadius: radius.input, alignItems: 'center', justifyContent: 'center' },
  chip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: space.xs, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: space.md, paddingVertical: space.xs },
  chipTouch: { minHeight: size.touch },
  dot: { width: 6, height: 6, borderRadius: radius.pill },
  button: { minHeight: size.cta, borderRadius: radius.button, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, padding: space.md },
  primary: { backgroundColor: color.brand, ...shadow.cta },
  dashed: { borderStyle: 'dashed', borderWidth: 1, borderColor: color.brand },
  iconButton: { minWidth: size.touch, minHeight: size.touch, justifyContent: 'center', alignItems: 'center' },
  label: { ...type.label, color: color.label, marginBottom: space.sm },
  field: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: size.touch, paddingHorizontal: space.md, borderWidth: 1, borderColor: color.outline, borderRadius: radius.input, backgroundColor: color.white },
  focused: { borderColor: color.brand, boxShadow: '0 0 0 2px #fee5e2' },
  input: { flex: 1, ...type.body, color: color.ink, paddingVertical: space.md },
  prefix: { color: color.muted, ...type.body },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: color.overlay },
  sheet: { maxHeight: '92%', borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, backgroundColor: color.white, overflow: 'hidden' },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: radius.pill, backgroundColor: color.outline, marginTop: space.md },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: color.line, paddingHorizontal: space.xl, paddingVertical: space.xs },
  sheetBody: { padding: space.xl, gap: space.lg },
  appBar: { backgroundColor: color.brand },
  barRow: { flexDirection: 'row', alignItems: 'center', minHeight: size.cta, paddingRight: space.lg, gap: space.sm },
  barTitle: { color: color.white, flex: 1, paddingVertical: space.sm },
  barBadge: { ...type.meta, color: color.white, backgroundColor: color.glass, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: space.xs, flexShrink: 1 },
});
