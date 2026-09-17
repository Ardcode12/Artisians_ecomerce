import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronDown, Check, X, Search } from 'lucide-react-native';
import { Fonts } from '@/constants/artisan-theme';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { useAuth } from '@/context/AuthContext';

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu & Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Tamil Nadu',
  'Telangana',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

export default function BuyerAddressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { buyerOnboardingData, updateBuyerOnboardingData, saveBuyerProfile } = useAuth();

  const [addressLine, setAddressLine] = useState(buyerOnboardingData.addressLine || '');
  const [city, setCity] = useState(buyerOnboardingData.city || '');
  const [selectedState, setSelectedState] = useState(buyerOnboardingData.state || '');
  const [pincode, setPincode] = useState(buyerOnboardingData.pincode || '');

  const [stateModalVisible, setStateModalVisible] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const filteredStates = INDIAN_STATES.filter(s =>
    s.toLowerCase().includes(stateSearch.toLowerCase())
  );

  const isComplete =
    addressLine.trim().length >= 3 &&
    city.trim().length >= 2 &&
    selectedState.trim().length > 0 &&
    pincode.replace(/[^0-9]/g, '').length === 6;

  const handlePincodeChange = (val: string) => {
    const digits = val.replace(/[^0-9]/g, '').slice(0, 6);
    setPincode(digits);
    if (errorMsg) setErrorMsg('');
  };

  const handleContinue = async () => {
    if (!isComplete) {
      if (!addressLine.trim()) setErrorMsg('Please enter your address line');
      else if (!city.trim()) setErrorMsg('Please enter your city');
      else if (!selectedState) setErrorMsg('Please select your state');
      else if (pincode.length < 6) setErrorMsg('Please enter a 6-digit PIN code');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    updateBuyerOnboardingData({
      addressLine: addressLine.trim(),
      city: city.trim(),
      state: selectedState.trim(),
      pincode: pincode.trim(),
    });

    try {
      const res = await saveBuyerProfile();
      if (res.success) {
        router.replace('/auth/buyer-success');
      } else {
        setErrorMsg(res.error || 'Could not save address. Please try again.');
      }
    } catch (err) {
      setErrorMsg('Network error. Check connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inner}>
            {/* Header with Step 3 of 3 indicator */}
            <AuthHeader step={3} totalSteps={3} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Headline & Subtext */}
              <View style={styles.textContainer}>
                <Text style={styles.headline}>Where should orders be delivered?</Text>
                <Text style={styles.subtext}>
                  You can add more addresses later
                </Text>
              </View>

              {/* Stacked Input Fields */}
              <View style={styles.inputsStack}>
                {/* Address Line */}
                <View style={styles.pillInputContainer}>
                  <TextInput
                    style={styles.pillInput}
                    placeholder="Address Line"
                    placeholderTextColor="#A0A0A0"
                    value={addressLine}
                    onChangeText={setAddressLine}
                    editable={!loading}
                    autoCapitalize="sentences"
                  />
                </View>

                {/* City */}
                <View style={styles.pillInputContainer}>
                  <TextInput
                    style={styles.pillInput}
                    placeholder="City"
                    placeholderTextColor="#A0A0A0"
                    value={city}
                    onChangeText={setCity}
                    editable={!loading}
                    autoCapitalize="words"
                  />
                </View>

                {/* State Dropdown / Picker Pill */}
                <TouchableOpacity
                  style={[styles.pillInputContainer, styles.pickerContainer]}
                  onPress={() => {
                    Keyboard.dismiss();
                    setStateModalVisible(true);
                  }}
                  activeOpacity={0.8}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.pillInput,
                      !selectedState && styles.placeholderText,
                    ]}
                  >
                    {selectedState || 'Select State'}
                  </Text>
                  <ChevronDown size={20} color="#666666" />
                </TouchableOpacity>

                {/* Pincode */}
                <View style={styles.pillInputContainer}>
                  <TextInput
                    style={styles.pillInput}
                    placeholder="Pincode"
                    placeholderTextColor="#A0A0A0"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={pincode}
                    onChangeText={handlePincodeChange}
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Error text */}
              {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
            </ScrollView>

            {/* Pinned Bottom Primary Button */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  isComplete && !loading ? styles.primaryBtnActive : styles.primaryBtnDisabled,
                ]}
                onPress={handleContinue}
                disabled={!isComplete || loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text
                    style={[
                      styles.btnText,
                      isComplete ? styles.btnTextActive : styles.btnTextDisabled,
                    ]}
                  >
                    Continue
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* State Picker Modal */}
      <Modal
        visible={stateModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setStateModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select State</Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setStateModalVisible(false)}
            >
              <X size={20} color="#0D0D0D" />
            </TouchableOpacity>
          </View>

          {/* Search box in modal */}
          <View style={styles.modalSearchWrapper}>
            <View style={styles.modalSearchBox}>
              <Search size={18} color="#8E8E93" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search state..."
                placeholderTextColor="#A0A0A0"
                value={stateSearch}
                onChangeText={setStateSearch}
                autoCorrect={false}
              />
            </View>
          </View>

          <FlatList
            data={filteredStates}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const isSelected = selectedState === item;
              return (
                <TouchableOpacity
                  style={[styles.stateRow, isSelected && styles.stateRowSelected]}
                  onPress={() => {
                    setSelectedState(item);
                    setStateModalVisible(false);
                    setStateSearch('');
                    if (errorMsg) setErrorMsg('');
                  }}
                >
                  <Text
                    style={[
                      styles.stateName,
                      isSelected && styles.stateNameSelected,
                    ]}
                  >
                    {item}
                  </Text>
                  {isSelected && <Check size={20} color="#0D0D0D" />}
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  textContainer: {
    marginTop: 24,
    marginBottom: 28,
  },
  headline: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0D0D0D',
    fontFamily: Fonts.headingBold,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtext: {
    fontSize: 16,
    color: '#8E8E93',
    fontFamily: Fonts.body,
    lineHeight: 22,
  },
  inputsStack: {
    gap: 14,
  },
  pillInputContainer: {
    backgroundColor: '#F5F5F7',
    borderRadius: 30,
    height: 60,
    paddingHorizontal: 22,
    justifyContent: 'center',
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pillInput: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0D0D0D',
    fontFamily: Fonts.heading,
    flex: 1,
  },
  placeholderText: {
    color: '#A0A0A0',
  },
  errorText: {
    color: '#E53E3E',
    fontSize: 14,
    marginTop: 14,
    marginLeft: 16,
    fontFamily: Fonts.bodyMedium,
  },
  bottomBar: {
    width: '100%',
    paddingTop: 12,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryBtnActive: {
    backgroundColor: '#0D0D0D',
  },
  primaryBtnDisabled: {
    backgroundColor: '#D0D0D0',
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
  },
  btnTextActive: {
    color: '#FFFFFF',
  },
  btnTextDisabled: {
    color: '#8E8E93',
  },
  /* Modal Styles */
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalSearchWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 24,
    height: 48,
    paddingHorizontal: 16,
    gap: 10,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.heading,
    color: '#0D0D0D',
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F7F8',
  },
  stateRowSelected: {
    backgroundColor: '#F7F7FA',
  },
  stateName: {
    fontSize: 16,
    fontFamily: Fonts.heading,
    color: '#222222',
  },
  stateNameSelected: {
    fontWeight: '700',
    color: '#0D0D0D',
  },
});
