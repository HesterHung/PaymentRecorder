import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, TextInput, ScrollView, Image, StyleSheet, TouchableOpacity, Text, Alert, GestureResponderEvent, Platform, BackHandler, Animated } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { CONSTANTS, Payment } from '@/types/payment';
import { StorageUtils } from '@/utils/storage';
import Toast from 'react-native-toast-message';
import userStorage from '@/services/userStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PRIMARY_COLOR, USER_COLORS } from '@/constants/Colors';
import AmountInput from './AmountInput';
import APIService from '@/services/api'

//components\InputScreen.tsx
const InputScreen: React.FC = () => {
  const params = useLocalSearchParams();
  const [existingPayment, setExistingPayment] = useState<Payment | null>(null);
  const isEditing = params.isEditing === 'true';

  // Initialize state with existingPayment data
  const [title, setTitle] = useState('');
  const [amountType, setAmountType] = useState<'total' | 'specify'>('total');
  const [totalAmount, setTotalAmount] = useState('');
  const [specificAmount, setSpecificAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [receipt, setReceipt] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [users, setUsers] = useState<[string, string]>([CONSTANTS.PAYERS[0], CONSTANTS.PAYERS[1]]);
  const [whoPaid, setWhoPaid] = useState<string>('');
  const totalAmountRef = useRef<TextInput>(null);
  const specificAmountRef = useRef<TextInput>(null);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const loadedUsers = await userStorage.getUsers();
        setUsers(loadedUsers);

        // Set the current user as the payer if not in edit mode
        if (!existingPayment) {
          const currentUser = userStorage.getCurrentUser();
          if (currentUser) {
            setWhoPaid(currentUser);
          }
        }
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };

    loadUsers();

    // Subscribe to user changes
    const unsubscribe = userStorage.subscribe(() => {
      loadUsers();
    });

    return () => unsubscribe();
  }, [existingPayment]);

  const hasUnsavedChanges = useMemo(() => {
    return !!(title || totalAmount || specificAmount || receipt);
  }, [title, totalAmount, specificAmount, receipt]);

  const hasUserChanged = useCallback(() => {
    const currentUser = userStorage.getCurrentUser();
    return currentUser && whoPaid && currentUser !== whoPaid;
  }, [whoPaid]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load users from AsyncStorage
        const storedUsers = await AsyncStorage.getItem('users');
        if (storedUsers) {
          const parsedUsers = JSON.parse(storedUsers);
          if (parsedUsers.length >= 2) {
            setUsers([parsedUsers[0], parsedUsers[1]]);
          }
        }

        // Set the current user as the payer
        const currentUser = userStorage.getCurrentUser();
        if (currentUser) {
          setWhoPaid(currentUser);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    // Only load initial data if not in edit mode
    if (!params.existingPayment) {
      loadInitialData();
    }

    // Subscribe to user changes
    const unsubscribe = userStorage.subscribe(() => {
      if (!params.existingPayment) {
        const currentUser = userStorage.getCurrentUser();
        if (currentUser) {
          setWhoPaid(currentUser);
        }
      }
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, [params.existingPayment]);

  const resetForm = useCallback(() => {
    setTitle('');
    const currentUser = userStorage.getCurrentUser();
    setWhoPaid(currentUser || '');
    setAmountType('total');
    setTotalAmount('');
    setSpecificAmount('');
    setDate(new Date());
    setReceipt(null);
    setShowDatePicker(false);
    setShowTimePicker(false);
    setExistingPayment(null);
  }, []);

  const handleAmountTypeSelect = (type: 'total' | 'specify') => {
    setAmountType(type);
    // Use setTimeout to ensure the focus happens after the state update
    setTimeout(() => {
      if (type === 'total') {
        totalAmountRef.current?.focus();
      } else {
        specificAmountRef.current?.focus();
      }
    }, 100);
  };

  // Reset form when entering the screen (except for edit mode)
  useEffect(() => {
    if (!params.existingPayment) {
      resetForm();
    }
  }, []);

  // Modified useEffect for back handler
  useEffect(() => {
    const backAction = () => {
      if (hasUserChanged()) {
        Alert.alert(
          "Different User Selected",
          `You've selected ${whoPaid} instead of your default user ${userStorage.getCurrentUser()}. Are you sure you want to Quit?`,
          [
            {
              text: "Stay",
              style: "cancel",
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
        return true;
      }

      // Check for other unsaved changes
      if (hasUnsavedChanges) {
        Alert.alert(
          "Discard changes?",
          "You have unsaved changes. Are you sure you want to Quit?",
          [
            {
              text: "Stay",
              style: "cancel",
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
        return true;
      }

      router.back();
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [hasUserChanged, hasUnsavedChanges, whoPaid, resetForm]);

  // Modified handleCancel function
  const handleCancel = () => {
    if (hasUserChanged()) {
      Alert.alert(
        "Different User Selected",
        `You've selected ${whoPaid} instead of your default user ${userStorage.getCurrentUser()}. Are you sure you want to Quit?`,
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
              if (existingPayment) {
                router.push("/(tabs)/overall-payment");
              } else {
                router.back();
              }
            }
          }
        ]
      );
    } else if (hasUnsavedChanges) {
      Alert.alert(
        "Discard changes?",
        "You have unsaved changes. Are you sure you want to Quit?",
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
              if (existingPayment) {
                router.push("/(tabs)/overall-payment");
              } else {
                router.back();
              }
            }
          }
        ]
      );
    } else {
      if (existingPayment) {
        router.push("/(tabs)/overall-payment");
      } else {
        router.back();
      }
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
        setAmountType(payment.amountType as 'total' | 'specify');
        setDate(new Date(payment.paymentDatetime)); // This preserves the full timestamp precision

        if (payment.amountType === 'total') {
          setTotalAmount(payment.amount.toString());
        } else {
          setSpecificAmount(payment.amount.toString());
        }
      } catch (error) {
        console.error('Error parsing existing payment:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load payment details',
        });
      }
    }
  }, [params.existingPayment]);

  async function handleSubmit(event: GestureResponderEvent): Promise<void> {
    try {
      const numericAmount = amountType === 'total'
        ? parseFloat(totalAmount)
        : parseFloat(specificAmount);

      if (!whoPaid || !numericAmount || numericAmount <= 0) {
        Alert.alert('Hey!', 'Please fill in the $$$');
        return;
      }

      // Convert 'specify' to 'specify' when sending to the API
      const apiAmountType = amountType === 'total' ? 'specify' : amountType;

      const paymentData = {
        title: title || 'Untitled',
        whoPaid,
        amount: numericAmount,
        amountType: apiAmountType, // Use the converted amount type
        paymentDatetime: date.getTime(),
      };

      try {
        if (existingPayment?.id) {
          await APIService.updatePayment(existingPayment.id, paymentData);
          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'Payment updated successfully',
            position: 'bottom',
          });
        } else {
          await APIService.savePayment(paymentData);
          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'Payment created successfully',
            position: 'bottom',
          });
        }

        resetForm();
        router.push("/(tabs)/overall-payment");
      } catch (error) {
        console.error('API Error:', error);

        if (existingPayment?.id) {
          Toast.show({
            type: 'error',
            text1: 'Update Failed',
            text2: 'Please try again later.',
            position: 'bottom',
          });
        } else {
          await StorageUtils.savePayment(paymentData);
          Toast.show({
            type: 'error',
            text1: 'Saved Locally',
            text2: 'Could not connect to server. Payment saved locally.',
            position: 'bottom',
          });
          resetForm();
          router.push("/(tabs)/overall-payment");
        }
      }
    } catch (error) {
      console.error('Submit Error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to save payment. Please try again.',
        position: 'bottom',
      });
    }
  }

  return (
    <View style={styles.pageContainer}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleCancel}
        >
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {existingPayment ? 'Edit Payment' : 'New Payment'}
        </Text>
        <View style={styles.headerRightPlaceholder} />
      </View>
      <ScrollView style={styles.container}>
        <View style={styles.formContainer}>


          {/* 1. Date Section */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date and Time</Text>
            <View style={styles.dateTimeContainer}>
              <TouchableOpacity
                style={[styles.dateButton, styles.dateTimeButton]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
                <Ionicons name="calendar" size={24} color={PRIMARY_COLOR} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dateButton, styles.dateTimeButton]}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.dateText}>
                  {date.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'  // Added seconds
                  })}
                </Text>
                <Ionicons name="time" size={24} color={PRIMARY_COLOR} />
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

          {/* 4. Description Section */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Enter a Title"
                placeholderTextColor="#9CA3AF"

                value={title}
                onChangeText={setTitle}
              />
            </View>
          </View>

          {/* Who Paid Section */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Who paid?</Text>
            <View style={styles.payerButtons}>
              {users.map((payer) => (
                <TouchableOpacity
                  key={payer}
                  style={styles.payerButton}
                  onPress={() => setWhoPaid(payer)}
                >
                  <View style={[
                    styles.payerCircle,
                    whoPaid === payer ? {
                      backgroundColor: USER_COLORS[users.indexOf(payer)],
                      borderColor: USER_COLORS[users.indexOf(payer)]
                    } : styles.inactivePayerCircle
                  ]}>
                    <Ionicons
                      name={whoPaid === payer ? "person" : "person-outline"}
                      size={28}
                      color={whoPaid === payer ? 'white' : '#9CA3AF'}
                    />
                  </View>
                  <Text style={[
                    styles.payerText,
                    whoPaid === payer ? {
                      color: USER_COLORS[users.indexOf(payer)],
                      fontWeight: '600'
                    } : styles.inactivePayerText
                  ]}>
                    {payer}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroupAmount}>
            <Text style={styles.label}>Amount Type</Text>
            <View style={styles.amountTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.amountTypeBox,
                  amountType === 'total' && styles.selectedAmountTypeBox
                ]}
                onPress={() => handleAmountTypeSelect('total')}
              >
                <View style={[
                  styles.iconCircle,
                  amountType === 'total' && styles.selectedIconCircle
                ]}>
                  <Ionicons
                    name="wallet-outline"
                    size={20}
                    color={amountType === 'total' ? 'white' : '#6B7280'}
                  />
                </View>
                <Text style={[
                  styles.amountTypeTitle,
                  amountType === 'total' && styles.selectedAmountTypeTitle
                ]}>
                  Total Amount
                </Text>
                <Text style={[
                  styles.amountTypeDescription,
                  amountType === 'total' && styles.selectedAmountTypeDescription
                ]}>
                  Split equally
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.amountTypeBox,
                  amountType === 'specify' && styles.selectedAmountTypeBox
                ]}
                onPress={() => handleAmountTypeSelect('specify')}
              >
                <View style={[
                  styles.iconCircle,
                  amountType === 'specify' && styles.selectedIconCircle
                ]}>
                  <Ionicons
                    name="git-branch-outline"
                    size={20}
                    color={amountType === 'specify' ? 'white' : '#6B7280'}
                  />
                </View>
                <Text style={[
                  styles.amountTypeTitle,
                  amountType === 'specify' && styles.selectedAmountTypeTitle
                ]}>
                  Specific Amount
                </Text>
                <Text style={[
                  styles.amountTypeDescription,
                  amountType === 'specify' && styles.selectedAmountTypeDescription
                ]}>
                  Paid for another one
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.amountInputContainer}>
              {amountType === 'total' ? (
                <AmountInput
                  value={totalAmount}
                  onChange={setTotalAmount}
                  placeholder="Enter total amount to split"
                />
              ) : (
                <AmountInput
                  value={specificAmount}
                  onChange={setSpecificAmount}
                  placeholder="Enter amount you pay for other"
                />
              )}
            </View>


          </View>

          {/* 5. Save/Update Expense Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
          >
            <Text style={styles.submitButtonText}>
              {existingPayment ? 'Update Expense' : 'Save Expense'}
            </Text>
          </TouchableOpacity>

          {/* 6. Cancel Button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  amountTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  amountTypeBox: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12, // Reduced from 16
    padding: 10, // Reduced from 16
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F3F4F6',
  },
  selectedAmountTypeBox: {
    backgroundColor: `${PRIMARY_COLOR}10`,
    borderColor: PRIMARY_COLOR,
  },
  iconCircle: {
    width: 40, // Reduced from 48
    height: 40, // Reduced from 48
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8, // Reduced from 12
  },
  selectedIconCircle: {
    backgroundColor: PRIMARY_COLOR,
  },
  amountTypeTitle: {
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
    textAlign: 'center',
  },
  selectedAmountTypeTitle: {
    color: PRIMARY_COLOR,
  },
  amountTypeDescription: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
  selectedAmountTypeDescription: {
    color: PRIMARY_COLOR,
  },
  amountInputContainer: {
    marginTop: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  currencySymbol: {
    paddingLeft: 16,
    fontSize: 18,
    color: '#374151',
    fontWeight: '500',
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#374151',
  },
  amountInput: {
    textAlign: 'left',
  }, amountTypeOuterContainer: {
    position: 'relative',
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 4,
    marginBottom: 18,
    height: 80,
  },
  amountTypeSlider: {
    position: 'absolute',
    width: '50%',
    height: '100%',
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  amountTypeButton: {
    flex: 1,
    justifyContent: 'center',
    zIndex: 1,
  },
  amountTypeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  amountTypeTextContainer: {
    flex: 1,
  },
  amountTypeText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  amountTypeSubtext: {
    fontSize: 12,
  },
  selectedAmountTypeText: {
    color: 'white',
  },
  selectedAmountTypeSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  unselectedAmountTypeText: {
    color: '#374151',
  },
  unselectedAmountTypeSubtext: {
    color: '#6B7280',
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputGroupAmount: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 13,
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
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  payerButton: {
    alignItems: 'center',
    gap: 8,
  },

  payerCircle: {
    width: 50,
    height: 50,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  activePayerCircle: {
    backgroundColor: USER_COLORS[0],
    borderColor: USER_COLORS[0],
  },
  inactivePayerCircle: {
    backgroundColor: 'white',
    borderColor: '#9CA3AF',
  },
  payerText: {
    fontSize: 16,
    marginTop: 4,
  },
  activePayerText: {
    color: PRIMARY_COLOR,
    fontWeight: '600',
  },
  inactivePayerText: {
    color: '#9CA3AF',
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
    marginBottom: 16,
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
    backgroundColor: PRIMARY_COLOR,
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
    borderColor: PRIMARY_COLOR,
    width: '100%', // Ensure full width
  },
  cancelButtonText: {
    color: PRIMARY_COLOR,
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
  pageContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingTop: Platform.OS === 'ios' ? 6 : 10,
    paddingBottom: 0,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  backButtonText: {
    color: PRIMARY_COLOR,
    fontSize: 17,
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  headerRightPlaceholder: {
    width: 80, // Approximately the same width as the back button
  },
  selectedAmountType: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  unselectedAmountType: {
    backgroundColor: 'white',
    borderColor: '#E5E7EB',
  },

});

export default InputScreen;
