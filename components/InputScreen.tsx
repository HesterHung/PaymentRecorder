import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, TextInput, ScrollView, Image, StyleSheet, TouchableOpacity, Text, Alert, GestureResponderEvent, Platform, BackHandler } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Payment } from '@/types/payment';
import { StorageUtils } from '@/utils/storage';
import Toast from 'react-native-toast-message';
import userStorage from '@/services/userStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PRIMARY_COLOR, USER_COLORS } from '@/constants/Colors';


//components\InputScreen.tsx
const InputScreen: React.FC = () => {
  const params = useLocalSearchParams();
  const [existingPayment, setExistingPayment] = useState<Payment | null>(null);

  // Initialize state with existingPayment data
  const [title, setTitle] = useState('');
  const [amountType, setAmountType] = useState<'total' | 'specific'>('total');
  const [totalAmount, setTotalAmount] = useState('');
  const [specificAmount, setSpecificAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [receipt, setReceipt] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [users, setUsers] = useState<[string, string]>(['User 1', 'User 2']);
  const [whoPaid, setWhoPaid] = useState<string>('');


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
    setWhoPaid(currentUser || ''); // Set to current user or empty string
    setAmountType('total');
    setTotalAmount('');
    setSpecificAmount('');
    setDate(new Date());
    setReceipt(null);
    setShowDatePicker(false);
    setShowTimePicker(false);
  }, []);

  const hasUserSelectionChanged = useCallback(() => {
    const currentUser = userStorage.getCurrentUser();
    return currentUser && whoPaid !== currentUser;
  }, [whoPaid]);

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
              router.back();
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
        serverUri: existingPayment?.serverUri || null,
        uploadStatus: 'uploading',
        imageUploadStatus: 'uploading',
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
                  {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

          {/*Amount Type Section */}
          <View style={styles.inputGroupAmount}>
            <Text style={styles.label}>Amount Type</Text>
            <View style={styles.amountTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.amountTypeButton,
                  amountType === 'total' ? styles.selectedAmountType : styles.unselectedAmountType
                ]}
                onPress={() => setAmountType('total')}
              >
                <Ionicons
                  name="cash-outline"
                  size={24}
                  color={amountType === 'total' ? 'white' : '#6B7280'}
                />
                <Text style={[
                  styles.amountTypeText,
                  amountType === 'total' ? styles.selectedAmountTypeText : styles.unselectedAmountTypeText
                ]}>
                  Total Amount
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.amountTypeButton,
                  amountType === 'specific' ? styles.selectedAmountType : styles.unselectedAmountType
                ]}
                onPress={() => setAmountType('specific')}
              >
                <Ionicons
                  name="git-branch-outline"
                  size={24}
                  color={amountType === 'specific' ? 'white' : '#6B7280'}
                />
                <Text style={[
                  styles.amountTypeText,
                  amountType === 'specific' ? styles.selectedAmountTypeText : styles.unselectedAmountTypeText
                ]}>
                  Specific Amount
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={[styles.input, styles.amountInput]}
                placeholder={amountType === 'total'
                  ? "Enter total amount to split"
                  : "Enter specific amount you pay for other"}
                value={amountType === 'total' ? totalAmount : specificAmount}
                onChangeText={amountType === 'total' ? setTotalAmount : setSpecificAmount}
                keyboardType="decimal-pad"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>



          {/* 4. Description Section */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Enter a description (optional)"
                value={title}
                onChangeText={setTitle}
              />
            </View>
          </View>

          {/* 5. Save Expense Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
          >
            <Text style={styles.submitButtonText}>Save Expense</Text>
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
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputGroupAmount: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  currencySymbol: {
    paddingLeft: 15,
    fontSize: 16,
    color: '#666',
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
    minHeight: 56, // Add minimum height
  },
  input: {
    flex: 1,
    padding: 15,
    fontSize: 14,
    color: '#333',
    paddingRight: 15, // Add right padding
  },
  amountInput: {
    textAlign: 'left',
    minWidth: 0, // Ensure text can wrap if needed
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
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
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
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    paddingBottom: 8,
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
    width: 70, // Approximately the same width as the back button
  },
  // Add or update these styles in your StyleSheet.create()
  amountTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  amountTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  selectedAmountType: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  unselectedAmountType: {
    backgroundColor: 'white',
    borderColor: '#E5E7EB',
  },
  amountTypeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  selectedAmountTypeText: {
    color: 'white',
  },
  unselectedAmountTypeText: {
    color: '#6B7280',
  },
});

export default InputScreen;
