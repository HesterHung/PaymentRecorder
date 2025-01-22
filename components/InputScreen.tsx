import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, TextInput, ScrollView, Image, StyleSheet, TouchableOpacity, Text, Alert, GestureResponderEvent, Platform, BackHandler } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Camera } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { CONSTANTS, Payer, Payment } from '@/types/payment';
import { StorageUtils } from '@/utils/storage';
import Toast from 'react-native-toast-message';


//components\InputScreen.tsx
const InputScreen: React.FC = () => {
  const params = useLocalSearchParams();
  const [existingPayment, setExistingPayment] = useState<Payment | null>(null);

  // Initialize state with existingPayment data
  const [title, setTitle] = useState('');
  const [whoPaid, setWhoPaid] = useState<Payer>(CONSTANTS.PAYERS[0]);
  const [amountType, setAmountType] = useState<'total' | 'specific'>('total');
  const [totalAmount, setTotalAmount] = useState('');
  const [specificAmount, setSpecificAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [receipt, setReceipt] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const hasUnsavedChanges = useMemo(() => {
    return !!(title || totalAmount || specificAmount || receipt);
  }, [title, totalAmount, specificAmount, receipt]);

  const resetForm = useCallback(() => {
    setTitle('');
    setWhoPaid(CONSTANTS.PAYERS[0]);
    setAmountType('total');
    setTotalAmount('');
    setSpecificAmount('');
    setDate(new Date());
    setReceipt(null);
    setShowDatePicker(false);
    setShowTimePicker(false);
  }, []);

  // Reset form when entering the screen (except for edit mode)
  useEffect(() => {
    if (!params.existingPayment) {
      resetForm();
    }
  }, []);

  // Modified useEffect for back handler
  useEffect(() => {
    const backAction = () => {
      if (hasUnsavedChanges) {
        Alert.alert(
          "Discard changes?",
          "You have unsaved changes. Are you sure you want to quit?",
          [
            {
              text: "Stay",
              style: "cancel",
              onPress: () => null,
            },
            {
              text: "Quit",
              style: "destructive",
              onPress: () => {
                resetForm();
                router.back();
              }
            }
          ]
        );
        return true; // Prevent default back action
      }
      // If no unsaved changes, allow normal back navigation
      router.back();
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [hasUnsavedChanges, resetForm]); // Add all dependencies

  // Modified handleCancel function
  const handleCancel = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        "Discard changes?",
        "You have unsaved changes. Are you sure you want to quit?",
        [
          {
            text: "Stay",
            style: "cancel"
          },
          {
            text: "Quit",
            style: "destructive",
            onPress: () => {
              resetForm();
              router.back();
            }
          }
        ]
      );
    } else {
      router.back();
    }
  };

  // Use useEffect to parse and set the existing payment data
  useEffect(() => {
    if (params.existingPayment) {
      try {
        const payment = JSON.parse(params.existingPayment as string) as Payment;
        setExistingPayment(payment);
        setTitle(payment.title || '');
        setWhoPaid(payment.whoPaid);
        setAmountType(payment.amountType as 'total' | 'specific');
        setDate(new Date(payment.date));
        setReceipt(payment.uri);

        // Set the amount in the correct input field
        if (payment.amountType === 'total') {
          setTotalAmount(payment.amount.toString());
          setSpecificAmount('');
        } else {
          setSpecificAmount(payment.amount.toString());
          setTotalAmount('');
        }
      } catch (error) {
        console.error('Error parsing existing payment:', error);
      }
    }
  }, [params.existingPayment]);


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
  async function handleSubmit(event: GestureResponderEvent): Promise<void> {
    try {
      const numericAmount = amountType === 'total'
        ? parseFloat(totalAmount) || 0
        : parseFloat(specificAmount) || 0;

      if (!whoPaid || !numericAmount || numericAmount === 0) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      const paymentData: Omit<Payment, 'id' | 'isUploaded'> = {
        title: title || 'Untitled',
        whoPaid,
        amount: numericAmount,
        amountType,
        date: date.getTime(),
        uri: receipt,
        serverUri: existingPayment?.serverUri || null,
        uploadStatus: 'uploading',
        imageUploadStatus: 'uploading'
      };

      if (existingPayment?.id) {
        // Update existing payment
        await StorageUtils.updatePayment(existingPayment.id, paymentData);
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Payment updated successfully',
        });
      } else {
        // Create new payment
        await StorageUtils.savePayment(paymentData);
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Payment saved successfully',
        });
      }

      // Reset form after successful save
      resetForm();

      // Navigate back to the previous screen
      router.back();
    } catch (error) {
      console.error('Error saving payment:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to save payment. Please try again.',
      });
    }
  }
  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.screenTitle}>
          {existingPayment ? 'Edit Payment' : 'New Payment'}
        </Text>        {/* Date Section */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date and Time</Text>
          <View style={styles.dateTimeContainer}>
            <TouchableOpacity
              style={[styles.dateButton, styles.dateTimeButton]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
              <Ionicons name="calendar" size={24} color="#007AFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dateButton, styles.dateTimeButton]}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.dateText}>
                {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Ionicons name="time" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>

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

          {showTimePicker && (
            <DateTimePicker
              value={date}
              mode="time"
              onChange={(event, selectedDate) => {
                setShowTimePicker(false);
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
            {CONSTANTS.PAYERS.map((payer) => (
              <TouchableOpacity
                key={payer}
                style={[
                  styles.payerButton,
                  whoPaid === payer && styles.selectedPayer
                ]}
                onPress={() => setWhoPaid(payer)}
              >
                <Ionicons
                  name={whoPaid === payer ? "person" : "person-outline"}
                  size={24}
                  color={whoPaid === payer ? 'white' : '#007AFF'}
                />
                <Text style={[styles.payerText, whoPaid === payer && styles.selectedPayerText]}>
                  {payer}
                </Text>
              </TouchableOpacity>
            ))}
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
              <View style={styles.imageHeaderContainer}>
                <TouchableOpacity
                  style={styles.clearImageButton}
                  onPress={() => setReceipt(null)}
                >
                  <Ionicons name="close-circle" size={24} color="#FF3B30" />
                  <Text style={styles.clearImageText}>Clear Image</Text>
                </TouchableOpacity>
              </View>
              <Image
                source={{ uri: receipt }}
                style={styles.image}
                resizeMode="cover"
                onError={(e) => console.error('Image loading error:', e.nativeEvent.error)}
                onLoad={() => console.log('Image loaded successfully')}
              />
              <Text style={styles.imageUri}>{receipt}</Text> {/* Temporary: to verify the URI */}
            </View>
          )}
        </View>

        {/* Submit and Cancel Buttons */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
        >
          <Text style={styles.submitButtonText}>Save Expense</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
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
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12, // Add margin bottom to create space between buttons
    width: '100%', // Ensure full width
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
    width: '100%', // Ensure full width
  },
  cancelButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeButton: {
    flex: 1,
  },
  imageHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  clearImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFE5E5',
  },
  clearImageText: {
    color: '#FF3B30',
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  imageUri: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },

});

export default InputScreen;
