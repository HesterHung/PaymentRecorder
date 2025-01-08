import React, { useEffect, useMemo, useState } from 'react';
import { View, TextInput, ScrollView, Image, StyleSheet, TouchableOpacity, Text, Alert, GestureResponderEvent, Platform, BackHandler } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Camera } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { Receipt } from '@/types/receipt';



const InputScreen: React.FC = () => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [amountType, setAmountType] = useState<'total' | 'specific'>('total');
  const [totalAmount, setTotalAmount] = useState('');
  const [specificAmount, setSpecificAmount] = useState('');
  const params = useLocalSearchParams();
  const existingReceipt = useMemo<Receipt | null>(() => {
    if (!params.existingReceipt) return null;
    try {
      return JSON.parse(params.existingReceipt as string) as Receipt;
    } catch (e) {
      console.error('Error parsing existingReceipt:', e);
      return null;
    }
  }, [params.existingReceipt]);

  const [date, setDate] = useState(() =>
    existingReceipt ? new Date(existingReceipt.timestamp) : new Date()
  );
  const [receipt, setReceipt] = useState<string | null>(
    existingReceipt ? existingReceipt.uri : null
  );
  const [title, setTitle] = useState(existingReceipt?.title || '');
  const [whoPaid, setWhoPaid] = useState(existingReceipt?.whoPaid || '');

  // Add useEffect to update receipt when existingReceipt changes
  useEffect(() => {
    if (existingReceipt?.uri) {
      setReceipt(existingReceipt.uri);
    }
  }, [existingReceipt]);

  // Update your back button handler
  useEffect(() => {
    const backAction = () => {
      if (existingReceipt?.source === 'receipt-box') {
        router.replace('/(tabs)/receipt-box');
      } else {
        router.replace('/');
      }
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [existingReceipt]);

  const handleImageSelection = () => {
    if (Platform.OS === 'ios') {
      Alert.alert(
        "Add Receipt",
        "Choose an option",
        [
          {
            text: "Choose from Library",
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                allowsMultipleSelection: false,
                quality: 1,
              });

              if (result.assets && result.assets.length > 0) {
                setReceipt(result.assets[0].uri);
              }
            }
          },
          {
            text: "Take Photo",
            onPress: async () => {
              const { status } = await Camera.requestCameraPermissionsAsync();
              if (status === 'granted') {
                const result = await ImagePicker.launchCameraAsync({
                  allowsEditing: true,
                  allowsMultipleSelection: false,
                  quality: 1,
                });

                if (result.assets && result.assets.length > 0) {
                  setReceipt(result.assets[0].uri);
                }
              }
            }
          },
        ]
      );
    } else {
      Alert.alert(
        "Add Receipt",
        "Choose an option",
        [
          {
            text: "Take Photo",
            onPress: async () => {
              const { status } = await Camera.requestCameraPermissionsAsync();
              if (status === 'granted') {
                const result = await ImagePicker.launchCameraAsync({
                  allowsEditing: true,
                  allowsMultipleSelection: false,
                  quality: 1,
                });

                if (result.assets && result.assets.length > 0) {
                  setReceipt(result.assets[0].uri);
                }
              }
            }
          },
          {
            text: "Choose from Library",
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                allowsMultipleSelection: false,
                quality: 1,
              });

              if (result.assets && result.assets.length > 0) {
                setReceipt(result.assets[0].uri);
              }
            }
          },
        ],
        { cancelable: true }
      );
    }
  };

  function handleSubmit(event: GestureResponderEvent): void {
    throw new Error('Function not implemented.');
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        {/* Date Section */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
            <Ionicons name="calendar" size={24} color="#007AFF" />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setDate(selectedDate);
              }}
            />
          )}
        </View>

        {/* Title Section */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Title</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Enter a description (optional)"
              value={title}
              onChangeText={setTitle}
            />
          </View>
        </View>

        {/* Who Paid Section */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Who paid?</Text>
          <View style={styles.payerButtons}>
            <TouchableOpacity
              style={[
                styles.payerButton,
                whoPaid === 'Person1' && styles.selectedPayer
              ]}
              onPress={() => setWhoPaid('Person1')}
            >
              <Ionicons
                name={whoPaid === 'Person1' ? "person" : "person-outline"}
                size={24}
                color={whoPaid === 'Person1' ? 'white' : '#007AFF'}
              />
              <Text style={[styles.payerText, whoPaid === 'Person1' && styles.selectedPayerText]}>
                Person 1
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.payerButton,
                whoPaid === 'Person2' && styles.selectedPayer
              ]}
              onPress={() => setWhoPaid('Person2')}
            >
              <Ionicons
                name={whoPaid === 'Person2' ? "person" : "person-outline"}
                size={24}
                color={whoPaid === 'Person2' ? 'white' : '#007AFF'}
              />
              <Text style={[styles.payerText, whoPaid === 'Person2' && styles.selectedPayerText]}>
                Person 2
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Amount Section */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Amount Type</Text>
          <View style={styles.amountTypeContainer}>
            <TouchableOpacity
              style={[
                styles.amountTypeButton,
                amountType === 'total' && styles.selectedAmountType
              ]}
              onPress={() => setAmountType('total')}
            >
              <Text style={[
                styles.amountTypeText,
                amountType === 'total' && styles.selectedAmountTypeText
              ]}>
                Total Amount
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.amountTypeButton,
                amountType === 'specific' && styles.selectedAmountType
              ]}
              onPress={() => setAmountType('specific')}
            >
              <Text style={[
                styles.amountTypeText,
                amountType === 'specific' && styles.selectedAmountTypeText
              ]}>
                Specific Amount
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={[styles.input, styles.amountInput]}
              placeholder={amountType === 'total' ? "Enter total amount (system will divide it by 2)" : "Enter specific amount paid for another one"}
              value={amountType === 'total' ? totalAmount : specificAmount}
              onChangeText={amountType === 'total' ? setTotalAmount : setSpecificAmount}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Receipt Section */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Receipt Image (if any)</Text>
          <TouchableOpacity style={styles.imageButton} onPress={handleImageSelection}>
            <Ionicons name="camera" size={24} color="white" />
            <Text style={styles.imageButtonText}>
              {receipt ? 'Change Receipt Image' : 'Add Receipt Image'}
            </Text>
          </TouchableOpacity>
          {receipt && (
            <View style={styles.imageContainer}>
              <Image source={{ uri: receipt }} style={styles.image} />
            </View>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
        >
          <Text style={styles.submitButtonText}>Save Expense</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 23,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  currencySymbol: {
    paddingLeft: 15,
    fontSize: 16,
    color: '#666',
  },
  input: {
    flex: 1,
    padding: 15,
    fontSize: 14,
    color: '#333',
  },
  amountInput: {
    textAlign: 'left',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  payerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  payerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    gap: 8,
  },
  payerText: {
    fontSize: 16,
    color: '#007AFF',
  },
  selectedPayer: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  selectedPayerText: {
    color: 'white',
  },
  amountTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  amountTypeButton: {
    flex: 1,
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    alignItems: 'center',
  },
  amountTypeText: {
    fontSize: 16,
    color: '#007AFF',
  },
  selectedAmountType: {
    backgroundColor: '#007AFF',
  },
  selectedAmountTypeText: {
    color: 'white',
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    padding: 15,
    borderRadius: 12,
    gap: 8,
  },
  imageButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  imageContainer: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

});

export default InputScreen;

function setShowImageOptions(arg0: boolean) {
  throw new Error('Function not implemented.');
}
