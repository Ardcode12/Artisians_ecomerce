import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Platform,
} from 'react-native';
import { Volume2, Square } from 'lucide-react-native';
import { ProductSpeechData, isSpeechSupported } from '@/utils/speech';
import { Fonts } from '@/constants/artisan-theme';
import { getSelectedLanguage } from '@/utils/language-utils';

export interface ProductListenButtonProps {
  product: ProductSpeechData;
  isSpeaking: boolean;
  onToggle: (product: ProductSpeechData, e?: any) => void;
  variant?: 'card-overlay' | 'inline' | 'full-banner' | 'top-bar';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export const ProductListenButton: React.FC<ProductListenButtonProps> = ({
  product,
  isSpeaking,
  onToggle,
  variant = 'card-overlay',
  style,
  accessibilityLabel,
}) => {
  // Gracefully hide if speech synthesis is not supported
  if (!isSpeechSupported()) {
    return null;
  }

  const handlePress = (e: any) => {
    if (e) {
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (e.nativeEvent) {
        if (typeof e.nativeEvent.stopPropagation === 'function') e.nativeEvent.stopPropagation();
        if (typeof e.nativeEvent.stopImmediatePropagation === 'function') e.nativeEvent.stopImmediatePropagation();
        if (typeof e.nativeEvent.preventDefault === 'function') e.nativeEvent.preventDefault();
      }
    }
    onToggle(product, e);
  };

  const label =
    accessibilityLabel ||
    (isSpeaking
      ? `Stop reading details for ${product.title}`
      : `Listen to details for ${product.title}`);

  if (variant === 'full-banner') {
    const currentLang = getSelectedLanguage();
    const stopText =
      currentLang === 'ta' ? 'நிறுத்தவும்' :
      currentLang === 'hi' ? 'रोकें' : 'Stop Reading';
    const listenText =
      currentLang === 'ta' ? 'பொருள் விவரங்களைக் கேட்கவும்' :
      currentLang === 'hi' ? 'उत्पाद विवरण सुनें' : 'Listen to Product Details';

    return (
      <TouchableOpacity
        style={[
          styles.fullBanner,
          isSpeaking && styles.fullBannerActive,
          style,
        ]}
        onPress={handlePress}
        activeOpacity={0.85}
        accessibilityLabel={label}
        accessibilityRole="button"
      >
        {isSpeaking ? (
          <>
            <Square size={18} color="#FFFFFF" fill="#FFFFFF" />
            <Text style={styles.fullBannerText}>{stopText}</Text>
          </>
        ) : (
          <>
            <Volume2 size={20} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={styles.fullBannerText}>{listenText}</Text>
          </>
        )}
      </TouchableOpacity>
    );
  }

  if (variant === 'top-bar') {
    return (
      <TouchableOpacity
        style={[
          styles.topBarBtn,
          isSpeaking && styles.topBarBtnActive,
          style,
        ]}
        onPress={handlePress}
        activeOpacity={0.8}
        accessibilityLabel={label}
        accessibilityRole="button"
      >
        {isSpeaking ? (
          <Square size={16} color="#FFFFFF" fill="#FFFFFF" />
        ) : (
          <Volume2 size={19} color="#FFFFFF" strokeWidth={2.2} />
        )}
      </TouchableOpacity>
    );
  }

  // card-overlay and inline: 44x44px circular touch target
  return (
    <TouchableOpacity
      style={[
        styles.circleBtn,
        variant === 'card-overlay' && styles.cardOverlayPos,
        isSpeaking && styles.circleBtnActive,
        style,
      ]}
      onPress={handlePress}
      activeOpacity={0.85}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      {isSpeaking ? (
        <Square size={16} color="#FFFFFF" fill="#FFFFFF" />
      ) : (
        <Volume2 size={20} color="#FFFFFF" strokeWidth={2.2} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Minimum 44x44px touch target requirement
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#059669', // Emerald green
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(5, 150, 105, 0.4)',
      },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
      },
    }),
  },
  cardOverlayPos: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  circleBtnActive: {
    backgroundColor: '#DC2626', // High-contrast pulsing red
    ...Platform.select({
      web: {
        boxShadow: '0 4px 14px rgba(220, 38, 38, 0.5)',
      },
    }),
  },
  topBarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  topBarBtnActive: {
    backgroundColor: '#DC2626',
  },
  fullBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 10,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
      },
      default: {
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 4,
      },
    }),
  },
  fullBannerActive: {
    backgroundColor: '#DC2626',
  },
  fullBannerText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
  },
});
