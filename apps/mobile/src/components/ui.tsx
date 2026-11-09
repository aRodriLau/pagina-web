import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { colors, font, MIN_TOUCH, space } from '../lib/theme';

export function Button({ title, onPress, variant = 'primary', loading, disabled, style }: {
  title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger'; loading?: boolean; disabled?: boolean; style?: ViewStyle;
}) {
  const bg = variant === 'primary' ? colors.primary : variant === 'danger' ? colors.danger : colors.surface;
  const fg = variant === 'secondary' ? colors.primary : colors.primaryText;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === 'secondary' && { borderWidth: 2, borderColor: colors.primary },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, color = colors.primary }: { label: string; selected?: boolean; onPress?: () => void; color?: string }) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'checkbox' : 'text'}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.chip, { borderColor: color, backgroundColor: selected ? color : colors.surface }]}
    >
      <Text style={{ color: selected ? '#fff' : color, fontSize: font.sm, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={{ gap: space(1) }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[styles.input, error ? { borderColor: colors.danger } : null]}
        {...props}
      />
      {error ? <Text style={{ color: colors.danger, fontSize: font.sm }}>{error}</Text> : null}
    </View>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: space(2) }}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export const Row = ({ children, wrap }: { children: ReactNode; wrap?: boolean }) => (
  <View style={{ flexDirection: 'row', flexWrap: wrap ? 'wrap' : 'nowrap', gap: space(2), alignItems: 'center' }}>{children}</View>
);

export const Empty = ({ text }: { text: string }) => (
  <Text style={{ color: colors.muted, fontSize: font.md, textAlign: 'center', padding: space(8) }}>{text}</Text>
);

const styles = StyleSheet.create({
  button: { minHeight: MIN_TOUCH + 4, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space(5) },
  buttonText: { fontSize: font.lg, fontWeight: '700' },
  chip: { minHeight: 40, paddingHorizontal: space(3), borderRadius: 20, borderWidth: 2, justifyContent: 'center' },
  label: { fontSize: font.md, fontWeight: '600', color: colors.text },
  input: { minHeight: MIN_TOUCH + 4, borderWidth: 2, borderColor: colors.border, borderRadius: 12, paddingHorizontal: space(3), fontSize: font.lg, color: colors.text, backgroundColor: colors.surface },
  sectionTitle: { fontSize: font.lg, fontWeight: '700', color: colors.text },
});
