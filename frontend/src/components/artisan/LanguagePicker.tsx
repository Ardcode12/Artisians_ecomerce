import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, ScrollView,
} from 'react-native';
import { Globe, Check } from 'lucide-react-native';
import { Fonts, Shadow, Spacing } from '@/constants/artisan-theme';
import { useLanguage } from '@/context/LanguageContext';
import { LanguageCode, LANGUAGE_META } from '@/i18n/translations';

const LANGUAGE_LIST: Array<{ code: LanguageCode }> = [
  { code: 'en' },
  { code: 'hi' },
  { code: 'ta' },
  { code: 'te' },
  { code: 'bn' },
  { code: 'pa' },
  { code: 'mr' },
];

export function LanguagePicker({ autoOpen, onClose }: { autoOpen?: boolean; onClose?: () => void } = {}) {
  const [open, setOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const current = LANGUAGE_META[language] ?? LANGUAGE_META['en'];

  // Support programmatic open (from Profile language row)
  React.useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  const handleSelect = (code: LanguageCode) => {
    setLanguage(code);
    handleClose();
  };

  return (
    <>
      {/* Light gray fill, bold black text pill chip */}
      <TouchableOpacity
        style={styles.chip}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Globe size={13} color="#0D0D0D" strokeWidth={2.2} />
        <Text style={styles.chipText}>{current.short}</Text>
        <Text style={styles.chipNative}>{current.native}</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={handleClose}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t('lang_picker_title')}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {LANGUAGE_LIST.map(({ code }) => {
                const meta = LANGUAGE_META[code];
                const isSelected = language === code;
                return (
                  <TouchableOpacity
                    key={code}
                    style={[styles.langRow, isSelected && styles.langRowSelected]}
                    onPress={() => handleSelect(code)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.langInfo}>
                      <Text style={[styles.langNative, isSelected && styles.langNativeSelected]}>
                        {meta.native}
                      </Text>
                      <Text style={styles.langLabel}>{meta.label}</Text>
                    </View>
                    {isSelected && (
                      <View style={styles.checkBadge}>
                        <Check size={16} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  chipNative: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#6B7280',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.lg,
    paddingBottom: 40,
    maxHeight: '65%',
    gap: 6,
    ...Shadow.nav,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  sheetTitle: {
    fontSize: 17,
    fontFamily: Fonts.headingBold,
    fontWeight: '800',
    color: '#0D0D0D',
    marginBottom: Spacing.sm,
  },
  langRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  langRowSelected: {
    backgroundColor: '#F5F5F7',
  },
  langInfo: {
    gap: 2,
  },
  langNative: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  langNativeSelected: {
    color: '#B5502F',
  },
  langLabel: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#8E8E93',
  },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
