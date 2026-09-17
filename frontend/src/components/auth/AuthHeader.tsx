import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface AuthHeaderProps {
  onBack?: () => void;
  step?: number;
  totalSteps?: number;
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({
  onBack,
  step,
  totalSteps = 3,
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.headerRow}>
      {/* Black circle back button */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={handleBack}
        activeOpacity={0.8}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.2} />
      </TouchableOpacity>

      {/* Progress Dots Indicator (if step is provided) */}
      {step !== undefined && (
        <View style={styles.progressContainer}>
          {Array.from({ length: totalSteps }).map((_, index) => {
            const isActive = index + 1 === step;
            const isCompleted = index + 1 < step;
            return (
              <View
                key={index}
                style={[
                  styles.dot,
                  isActive && styles.activePill,
                  isCompleted && styles.completedDot,
                ]}
              />
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0D0D0D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  activePill: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0D0D0D',
  },
  completedDot: {
    backgroundColor: '#8E8E93',
  },
});
