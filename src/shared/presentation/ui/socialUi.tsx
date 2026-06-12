import type { ReactNode } from 'react';
import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabInset, MaxContentWidth } from '@/constants/theme';
import { HeaderBackButton } from './HeaderBackButton';
import { PremiumPalette } from './premiumPalette';

type SocialScreenScrollMode = boolean | 'auto';

type SocialScreenProps = {
  children: ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  scroll?: SocialScreenScrollMode;
  contentStyle?: ViewStyle;
};

export function SocialScreen({
  children,
  edges = ['top', 'left', 'right'],
  scroll = true,
  contentStyle,
}: SocialScreenProps) {
  const contentHeightRef = useRef(0);
  const [scrollEnabled, setScrollEnabled] = useState(false);
  const [containerHeight, setContainerHeight] = useState(0);

  const updateScrollNeeded = useCallback(
    (contentHeight: number, nextContainerHeight = containerHeight) => {
      contentHeightRef.current = contentHeight;

      if (scroll !== 'auto' || nextContainerHeight <= 0) {
        return;
      }

      setScrollEnabled(contentHeight > nextContainerHeight + 1);
    },
    [containerHeight, scroll],
  );

  const contentContainerStyle = [
    styles.scrollContent,
    contentStyle,
    scroll === 'auto' && !scrollEnabled && styles.scrollContentFit,
  ];

  let body: ReactNode;

  if (scroll === false) {
    body = (
      <View style={[styles.scrollContent, { flex: 1 }, contentStyle]}>{children}</View>
    );
  } else if (scroll === 'auto') {
    body = (
      <View
        style={styles.autoScrollHost}
        onLayout={(event) => {
          const nextContainerHeight = event.nativeEvent.layout.height;
          setContainerHeight(nextContainerHeight);
          updateScrollNeeded(contentHeightRef.current, nextContainerHeight);
        }}
      >
        <ScrollView
          scrollEnabled={scrollEnabled}
          bounces={scrollEnabled}
          alwaysBounceVertical={false}
          contentContainerStyle={contentContainerStyle}
          showsVerticalScrollIndicator={scrollEnabled}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={(_, height) => {
            updateScrollNeeded(height);
          }}
        >
          {children}
        </ScrollView>
      </View>
    );
  } else {
    body = (
      <ScrollView
        contentContainerStyle={contentContainerStyle}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View style={styles.canvas}>
      <SafeAreaView style={styles.safeArea} edges={edges}>
        {body}
      </SafeAreaView>
    </View>
  );
}

/**
 * Header estándar de la app.
 * Layout: [← back opcional] · título (flex) · badge
 * Subtítulo debajo, alineado con el título.
 * `showBack={false}` en tabs raíz; omitir en pantallas stack (auto con router.canGoBack()).
 */
type SocialHeaderProps = {
  title: string;
  subtitle?: string;
  /** undefined = muestra ← solo si hay historial de navegación */
  showBack?: boolean;
  onBack?: () => void;
  badge?: string;
};

export function SocialHeader({ title, subtitle, onBack, badge, showBack }: SocialHeaderProps) {
  const router = useRouter();
  const canGoBack = router.canGoBack();
  const shouldShowBack = showBack ?? canGoBack;

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <View style={styles.header}>
      <View style={styles.headerToolbar}>
        {shouldShowBack ? <HeaderBackButton onPress={handleBack} /> : null}

        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerTitle} numberOfLines={2}>
            {title}
          </Text>
        </View>

        {badge ? (
          <View style={styles.headerBadgeWrap}>
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText} numberOfLines={1}>
                {badge}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

type OrgScopeBannerProps = {
  label: string;
  nombre: string;
  badge?: string;
  selected?: boolean;
  onPress?: () => void;
};

export function OrgScopeBanner({
  label,
  nombre,
  badge = 'Activo',
  selected = true,
  onPress,
}: OrgScopeBannerProps) {
  const content = (
    <View style={[styles.orgBanner, selected && styles.orgBannerSelected]}>
      <View style={styles.orgBannerCopy}>
        <Text style={styles.orgBannerLabel}>{label}</Text>
        <Text style={styles.orgBannerName} numberOfLines={1}>
          {nombre}
        </Text>
      </View>
      <View style={styles.orgBadge}>
        <Text style={styles.orgBadgeText}>{badge}</Text>
      </View>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

export type PillOption = {
  id: string;
  label: string;
};

type PillFilterRowProps = {
  options: PillOption[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  allowNull?: boolean;
  nullLabel?: string;
};

export function PillFilterRow({
  options,
  selectedId,
  onSelect,
  allowNull = false,
  nullLabel = 'Todos',
}: PillFilterRowProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.pillRow}
    >
      {allowNull ? (
        <Pressable
          onPress={() => onSelect(null)}
          style={[styles.pill, selectedId === null ? styles.pillOn : styles.pillOff]}
        >
          <Text style={[styles.pillText, selectedId === null ? styles.pillTextOn : styles.pillTextOff]}>
            {nullLabel}
          </Text>
        </Pressable>
      ) : null}
      {options.map((opt) => {
        const active = opt.id === selectedId;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onSelect(opt.id)}
            style={[styles.pill, active ? styles.pillOn : styles.pillOff]}
          >
            <Text style={[styles.pillText, active ? styles.pillTextOn : styles.pillTextOff]} numberOfLines={1}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

type SocialSearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

export function SocialSearchBar({
  value,
  onChangeText,
  placeholder = 'Buscar…',
}: SocialSearchBarProps) {
  return (
    <View style={styles.searchWrap}>
      <Text style={styles.searchIcon}>🔍</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={PremiumPalette.textMutedOnDark}
        style={styles.searchInput}
      />
    </View>
  );
}

type SocialStatCardProps = {
  label: string;
  value: string;
  accent?: boolean;
};

export function SocialStatCard({ label, value, accent }: SocialStatCardProps) {
  return (
    <View style={[styles.statCard, accent && styles.statCardAccent]}>
      <Text style={[styles.statLabel, accent && styles.statLabelAccent]}>{label}</Text>
      <Text style={[styles.statValue, accent && styles.statValueAccent]}>{value}</Text>
    </View>
  );
}

type SocialEmptyProps = {
  icon?: string;
  title: string;
  message: string;
};

export function SocialEmpty({ icon = '📭', title, message }: SocialEmptyProps) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
    </View>
  );
}

export function SocialCard({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type SocialFormScreenProps = {
  children: ReactNode;
  keyboard?: boolean;
};

export function SocialFormScreen({ children, keyboard = true }: SocialFormScreenProps) {
  const body = (
    <SocialScreen contentStyle={styles.formScroll}>
      {children}
    </SocialScreen>
  );

  if (!keyboard) {
    return body;
  }

  return (
    <KeyboardAvoidingView
      style={styles.formFlex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {body}
    </KeyboardAvoidingView>
  );
}

type SocialFormFieldProps = {
  label: string;
  hint?: string;
  children: ReactNode;
};

export function SocialFormField({ label, hint, children }: SocialFormFieldProps) {
  return (
    <View style={styles.formField}>
      <Text style={styles.formLabel}>{label}</Text>
      {hint ? <Text style={styles.formHint}>{hint}</Text> : null}
      {children}
    </View>
  );
}

export function SocialInput({ style, placeholderTextColor, ...props }: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={placeholderTextColor ?? PremiumPalette.textMutedOnDark}
      style={[styles.formInput, style]}
      {...props}
    />
  );
}

export function SocialTextArea({ style, ...props }: TextInputProps) {
  return <SocialInput multiline textAlignVertical="top" style={[styles.formTextArea, style]} {...props} />;
}

export type SocialOption = {
  id: string;
  label: string;
  subtitle?: string;
};

type SocialOptionPickerProps = {
  options: SocialOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  modalTitle?: string;
};

export function SocialOptionPicker({
  options,
  selectedId,
  onSelect,
  placeholder = 'Seleccionar',
  disabled = false,
  modalTitle = 'Seleccionar',
}: SocialOptionPickerProps) {
  const [visible, setVisible] = useState(false);
  const selected = options.find((o) => o.id === selectedId);

  return (
    <>
      <Pressable
        onPress={() => !disabled && setVisible(true)}
        style={({ pressed }) => [
          styles.selectTrigger,
          disabled && styles.selectDisabled,
          pressed && !disabled && styles.pressed,
        ]}
      >
        <View style={styles.selectCopy}>
          <Text style={selected ? styles.selectValue : styles.selectPlaceholder} numberOfLines={1}>
            {selected?.label ?? placeholder}
          </Text>
          {selected?.subtitle ? (
            <Text style={styles.selectSubtitle} numberOfLines={1}>
              {selected.subtitle}
            </Text>
          ) : null}
        </View>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>

      <Modal visible={visible} animationType="slide" transparent onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{modalTitle}</Text>
            <ScrollView style={styles.optionsScroll} contentContainerStyle={styles.optionsList}>
              {options.length === 0 ? (
                <Text style={styles.formHint}>No hay opciones disponibles.</Text>
              ) : (
                options.map((opt) => {
                  const active = opt.id === selectedId;
                  return (
                    <Pressable
                      key={opt.id}
                      onPress={() => {
                        onSelect(opt.id);
                        setVisible(false);
                      }}
                      style={({ pressed }) => [
                        styles.option,
                        active && styles.optionActive,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={styles.optionCopy}>
                        <Text style={styles.optionNombre}>{opt.label}</Text>
                        {opt.subtitle ? <Text style={styles.optionMeta}>{opt.subtitle}</Text> : null}
                      </View>
                      {active ? <Text style={styles.optionCheck}>✓</Text> : null}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
            <Pressable onPress={() => setVisible(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

type SocialInfoBannerProps = {
  title: string;
  message: string;
  accent?: boolean;
};

export function SocialInfoBanner({ title, message, accent }: SocialInfoBannerProps) {
  return (
    <View style={[styles.infoBanner, accent && styles.infoBannerAccent]}>
      <Text style={[styles.infoBannerTitle, accent && styles.infoBannerTitleAccent]}>{title}</Text>
      <Text style={[styles.infoBannerMessage, accent && styles.infoBannerMessageAccent]}>{message}</Text>
    </View>
  );
}

type SocialStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
};

export function SocialStepper({ value, onChange, min = 1 }: SocialStepperProps) {
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={() => onChange(Math.max(min, value - 1))}
        style={({ pressed }) => [styles.stepperBtn, pressed && styles.pressed]}
      >
        <Text style={styles.stepperBtnText}>−</Text>
      </Pressable>
      <Text style={styles.stepperValue}>{value}</Text>
      <Pressable
        onPress={() => onChange(value + 1)}
        style={({ pressed }) => [styles.stepperBtn, pressed && styles.pressed]}
      >
        <Text style={styles.stepperBtnText}>+</Text>
      </Pressable>
    </View>
  );
}

type SocialPrimaryButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'accent' | 'danger';
};

export function SocialPrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
}: SocialPrimaryButtonProps) {
  const bg =
    variant === 'accent'
      ? PremiumPalette.accent
      : variant === 'danger'
        ? PremiumPalette.danger
        : PremiumPalette.primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primaryBtn,
        { backgroundColor: bg },
        (disabled || loading) && styles.btnDisabled,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={styles.primaryBtnText}>{label}</Text>
      )}
    </Pressable>
  );
}

type SocialDangerLinkProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export function SocialDangerLink({ label, onPress, disabled }: SocialDangerLinkProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.dangerLink, pressed && styles.pressed, disabled && styles.btnDisabled]}
    >
      <Text style={styles.dangerLinkText}>{label}</Text>
    </Pressable>
  );
}

type SocialListCardProps = {
  title: string;
  subtitle?: string;
  meta?: string;
  trailing?: string;
  trailingAccent?: boolean;
  onPress?: () => void;
  left?: ReactNode;
};

export function SocialListCard({
  title,
  subtitle,
  meta,
  trailing,
  trailingAccent,
  onPress,
  left,
}: SocialListCardProps) {
  const content = (
    <View style={styles.listCard}>
      {left}
      <View style={styles.listCardBody}>
        <Text style={styles.listCardTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.listCardSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? <Text style={styles.listCardMeta}>{meta}</Text> : null}
      </View>
      {trailing ? (
        <Text style={[styles.listCardTrailing, trailingAccent && styles.listCardTrailingAccent]}>
          {trailing}
        </Text>
      ) : null}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.listCardWrap, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: PremiumPalette.canvas },
  safeArea: { flex: 1, maxWidth: MaxContentWidth, alignSelf: 'center', width: '100%' },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: BottomTabInset + 88,
    gap: 12,
  },
  scrollContentFit: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  autoScrollHost: {
    flex: 1,
  },
  header: { marginBottom: 4, gap: 4 },
  headerToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    gap: 10,
  },
  headerTitleBlock: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  headerTitle: { color: PremiumPalette.textOnDark, fontSize: 20, fontWeight: '800' },
  headerSubtitle: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 13,
    lineHeight: 18,
  },
  headerBadgeWrap: {
    flexShrink: 0,
    maxWidth: '38%',
  },
  headerBadge: {
    backgroundColor: PremiumPalette.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  headerBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  orgBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PremiumPalette.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: PremiumPalette.surfaceMuted,
    gap: 12,
    minWidth: 240,
  },
  orgBannerSelected: {
    borderColor: PremiumPalette.primary,
    backgroundColor: 'rgba(79, 70, 229, 0.12)',
  },
  orgBannerCopy: { flex: 1, gap: 2 },
  orgBannerLabel: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  orgBannerName: { color: PremiumPalette.textOnDark, fontSize: 16, fontWeight: '700' },
  orgBadge: {
    backgroundColor: PremiumPalette.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  orgBadgeText: { color: PremiumPalette.textSoftOnDark, fontSize: 11, fontWeight: '700' },
  pillRow: { gap: 8, paddingVertical: 4, alignItems: 'center' },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  pillOn: { backgroundColor: PremiumPalette.primary },
  pillOff: { backgroundColor: PremiumPalette.surface },
  pillText: { fontSize: 13, fontWeight: '600', maxWidth: 180 },
  pillTextOn: { color: '#FFFFFF' },
  pillTextOff: { color: PremiumPalette.textMutedOnDark },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PremiumPalette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PremiumPalette.surfaceMuted,
    paddingHorizontal: 12,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, color: PremiumPalette.textOnDark, fontSize: 16, paddingVertical: 12 },
  statCard: {
    backgroundColor: PremiumPalette.surface,
    borderRadius: 16,
    padding: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: PremiumPalette.surfaceMuted,
  },
  statCardAccent: { backgroundColor: PremiumPalette.accent, borderColor: PremiumPalette.accent },
  statLabel: { color: PremiumPalette.textMutedOnDark, fontSize: 12, fontWeight: '600' },
  statLabelAccent: { color: 'rgba(255,255,255,0.9)' },
  statValue: { color: PremiumPalette.textOnDark, fontSize: 26, fontWeight: '800' },
  statValueAccent: { color: '#FFFFFF' },
  card: {
    backgroundColor: PremiumPalette.surface,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: PremiumPalette.surfaceMuted,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
    minHeight: 220,
  },
  emptyIcon: { fontSize: 40, marginBottom: 4 },
  emptyTitle: { color: PremiumPalette.textSoftOnDark, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptyMessage: { color: PremiumPalette.textMutedOnDark, fontSize: 14, lineHeight: 22, textAlign: 'center' },
  pressed: { opacity: 0.9 },
  formFlex: { flex: 1 },
  formScroll: { gap: 14, paddingBottom: 40 },
  formField: { gap: 6 },
  formLabel: {
    color: PremiumPalette.textSoftOnDark,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  formHint: { color: PremiumPalette.textMutedOnDark, fontSize: 12, lineHeight: 17 },
  formInput: {
    backgroundColor: PremiumPalette.canvas,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PremiumPalette.surfaceMuted,
    color: PremiumPalette.textOnDark,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  formTextArea: { minHeight: 96 },
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PremiumPalette.canvas,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PremiumPalette.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  selectDisabled: { opacity: 0.55 },
  selectCopy: { flex: 1, gap: 2 },
  selectValue: { color: PremiumPalette.textOnDark, fontSize: 15, fontWeight: '600' },
  selectPlaceholder: { color: PremiumPalette.textMutedOnDark, fontSize: 15 },
  selectSubtitle: { color: PremiumPalette.textMutedOnDark, fontSize: 12 },
  chevron: { color: PremiumPalette.primary, fontSize: 16, fontWeight: '700' },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
  },
  sheet: {
    backgroundColor: PremiumPalette.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: PremiumPalette.surfaceMuted,
    maxHeight: '78%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: PremiumPalette.surfaceMuted,
    marginBottom: 12,
  },
  sheetTitle: { color: PremiumPalette.textOnDark, fontSize: 18, fontWeight: '800', marginBottom: 8 },
  optionsScroll: { flexGrow: 0 },
  optionsList: { gap: 8, paddingBottom: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PremiumPalette.surfaceMuted,
    backgroundColor: PremiumPalette.canvas,
  },
  optionActive: {
    borderColor: PremiumPalette.primary,
    backgroundColor: 'rgba(79, 70, 229, 0.12)',
  },
  optionCopy: { flex: 1, gap: 2 },
  optionNombre: { color: PremiumPalette.textOnDark, fontSize: 15, fontWeight: '700' },
  optionMeta: { color: PremiumPalette.textMutedOnDark, fontSize: 12 },
  optionCheck: { color: PremiumPalette.primary, fontSize: 18, fontWeight: '800' },
  cancelBtn: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: PremiumPalette.surfaceMuted,
  },
  cancelText: { color: PremiumPalette.textSoftOnDark, fontSize: 14, fontWeight: '600' },
  infoBanner: {
    backgroundColor: PremiumPalette.canvas,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PremiumPalette.surfaceMuted,
    padding: 12,
    gap: 4,
  },
  infoBannerAccent: {
    borderColor: PremiumPalette.accent,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  infoBannerTitle: { color: PremiumPalette.textOnDark, fontSize: 14, fontWeight: '700' },
  infoBannerTitleAccent: { color: PremiumPalette.accent },
  infoBannerMessage: { color: PremiumPalette.textMutedOnDark, fontSize: 12, lineHeight: 17 },
  infoBannerMessageAccent: { color: PremiumPalette.textSoftOnDark },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PremiumPalette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: { color: PremiumPalette.textOnDark, fontSize: 22, fontWeight: '600' },
  stepperValue: { color: PremiumPalette.textOnDark, fontSize: 22, fontWeight: '800', minWidth: 32, textAlign: 'center' },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  btnDisabled: { opacity: 0.55 },
  dangerLink: { alignItems: 'center', paddingVertical: 10 },
  dangerLinkText: { color: PremiumPalette.danger, fontSize: 13, fontWeight: '600' },
  listCardWrap: { marginBottom: 8 },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: PremiumPalette.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: PremiumPalette.surfaceMuted,
  },
  listCardBody: { flex: 1, gap: 3 },
  listCardTitle: { color: PremiumPalette.textOnDark, fontSize: 15, fontWeight: '700' },
  listCardSubtitle: { color: PremiumPalette.textMutedOnDark, fontSize: 13, lineHeight: 18 },
  listCardMeta: { color: PremiumPalette.textMutedOnDark, fontSize: 12, fontWeight: '600', marginTop: 2 },
  listCardTrailing: { color: PremiumPalette.textOnDark, fontSize: 15, fontWeight: '800' },
  listCardTrailingAccent: { color: PremiumPalette.accent },
});
