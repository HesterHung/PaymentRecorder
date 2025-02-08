//components\OverallPayment.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity, Platform, UIManager, LayoutAnimation, ActivityIndicator } from 'react-native';
import { StorageUtils } from '../utils/storage';
import { Ionicons } from '@expo/vector-icons';
import { Payment, GroupedPayments, CONSTANTS } from '../types/payment';
import { Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import userStorage from '@/services/userStorage';
import { BalanceSummaryText, calculatePaymentBalance, formatBalance } from '@/utils/paymentCalculator';
import { USER_COLORS } from '@/constants/Colors';
import Toast from 'react-native-toast-message';
import APIService from '@/services/api';

const { width } = Dimensions.get('window');
const peopleNumber = 2;

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const OverallPayment: React.FC = () => {
  const [isBalanceVisible, setIsBalanceVisible] = useState(false);
  const [groupedPayments, setGroupedPayments] = useState<GroupedPayments[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [expandedMonths, setExpandedMonths] = useState<{ [key: string]: boolean }>({});
  const [currentUser, setCurrentUser] = useState<string>('');
  const [users, setUsers] = useState<[string, string]>(CONSTANTS.PAYERS);
  const [isLoading, setIsLoading] = useState(false);
  const [localPayments, setLocalPayments] = useState<Set<string>>(new Set());


  useEffect(() => {
    const fetchLocalPayments = async () => {
      const stored = await StorageUtils.getStoredPayments();
      setLocalPayments(new Set(stored.map(p => p.id)));
    };
    fetchLocalPayments();
  }, []);

  useEffect(() => {
    const initializeUsers = async () => {
      try {
        const storedUsers = await userStorage.getUsers();
        setUsers(storedUsers);
        const user = userStorage.getCurrentUser();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error initializing users:', error);
        // Fallback to constants if storage fails
        setUsers(CONSTANTS.PAYERS);
      }
    };

    initializeUsers();

    const unsubscribe = userStorage.subscribe(() => {
      setCurrentUser(userStorage.getCurrentUser());
      userStorage.getUsers().then(setUsers).catch(console.error);
    });

    return () => unsubscribe();
  }, []);


  useFocusEffect(
    React.useCallback(() => {
      setIsLoading(true);
      loadReceipts()
        .finally(() => setIsLoading(false));
    }, [])
  );


  const toggleMonth = (monthTitle: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedMonths(prev => ({
      ...prev,
      [monthTitle]: !prev[monthTitle]
    }));
  };



  const toggleBalanceVisibility = () => {
    setIsBalanceVisible(!isBalanceVisible);
  };

  const handlePaymentPress = (payment: Payment) => {
    console.log('Payment being passed:', payment);
    try {
      // Clear any existing params before navigation
      router.push({
        pathname: "/(tabs)/standard-input",
        params: {
          existingPayment: JSON.stringify({
            ...payment,
            timestamp: Date.now() // Add timestamp to force param refresh
          })
        }
      });
    } catch (error) {
      console.error('Navigation error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to navigate to edit screen',
      });
    }
  };

  const loadReceipts = async () => {
    try {
      // Get both online and local payments
      const [onlineReceipts, localReceipts] = await Promise.all([
        APIService.getPayments(),
        StorageUtils.getStoredPayments()
      ]);

      console.log('Online receipts:', onlineReceipts);
      console.log('Local receipts:', localReceipts);

      if (!Array.isArray(onlineReceipts)) {
        console.error('Expected array of online receipts, got:', onlineReceipts);
        return;
      }

      // Combine receipts, putting local ones first
      const allReceipts = [...localReceipts, ...onlineReceipts];

      // Filter out any invalid payments
      const validReceipts = allReceipts.filter(receipt =>
        receipt &&
        typeof receipt.amount === 'number' &&
        typeof receipt.paymentDatetime === 'number'
      );

      const summary = calculatePaymentBalance(validReceipts);
      console.log('Payment summary:', summary);

      const groupedArray = Object.entries(summary.monthlyBalances)
        .map(([title, data]) => ({
          title,
          data: data.payments.sort((a, b) => b.paymentDatetime - a.paymentDatetime),
          totalAmount: data.balance
        }))
        .sort((a, b) => {
          const dateA = new Date(a.data[0]?.paymentDatetime || 0);
          const dateB = new Date(b.data[0]?.paymentDatetime || 0);
          return dateB.getTime() - dateA.getTime();
        });

      setTotalBalance(summary.totalBalance);
      setGroupedPayments(groupedArray);

    } catch (error) {
      console.error('Error loading receipts:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load payments'
      });
      setGroupedPayments([]);
      setTotalBalance(0);
    }
  };



  // In OverallPayment.tsx
  // Update handleLongPress:

  const handleLongPress = async (payment: Payment) => {
    const isLocal = (await StorageUtils.getStoredPayments())
      .some(p => p.id === payment.id);

    Alert.alert(
      "Delete Payment",
      isLocal
        ? "This payment is saved locally. Delete it permanently?"
        : "Are you sure you want to delete this payment?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (isLocal) {
                await StorageUtils.removePendingUpload(payment.id);
              } else {
                await APIService.deletePayment(payment.id);
              }
              Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Payment deleted successfully'
              });
              loadReceipts(); // Reload the list
            } catch (error) {
              console.error('Error deleting payment:', error);
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to delete payment'
              });
            }
          }
        }
      ]
    );
  };

  const handleResetAll = () => {
    Alert.alert(
      "Reset All Payments (debug use)",
      "Are you sure you want to delete all payment records? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              //await StorageUtils.clearAllPayments();
              Alert.alert("Success", "All payment records have been deleted.");
              loadReceipts();
            } catch (error) {
              console.error('Error clearing payments:', error);
              Alert.alert(
                "Error",
                "Failed to clear payments. Please try again."
              );
            }
          }
        }
      ]
    );
  };

  const handlePaymentUpload = async (payment: Payment) => {
    Alert.alert(
      "Upload Payment",
      "Do you want to upload this locally saved payment to the server?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Upload",
          onPress: async () => {
            try {
              // Show loading toast
              Toast.show({
                type: 'info',
                text1: 'Uploading...',
                text2: 'Please wait'
              });

              await APIService.savePayment({
                title: payment.title,
                whoPaid: payment.whoPaid,
                amount: payment.amount,
                amountType: payment.amountType as 'total' | 'specific',
                paymentDatetime: payment.paymentDatetime
              });

              // Remove from local storage
              await StorageUtils.removePendingUpload(payment.id);
              setLocalPayments(prev => {
                const next = new Set(prev);
                next.delete(payment.id);
                return next;
              });

              Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Payment uploaded successfully'
              });
              loadReceipts();
            } catch (error) {
              console.error('Error uploading payment:', error);
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to upload payment'
              });
            }
          }
        }
      ]
    );
  };

  const renderReceiptItem = useCallback(({ item }: { item: Payment }) => {
    const isLocal = localPayments.has(item.id);

    const handlePress = () => {
      if (isLocal) {
        handlePaymentUpload(item);
      } else {
        handlePaymentPress(item);
      }
    };

    const date = new Date(item.paymentDatetime);
    const formattedDate = date.toLocaleDateString();
    const formattedTime = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const displayAmount = item.amountType === 'total'
      ? item.amount / 2
      : item.amount;

    return (
      <TouchableOpacity
        style={styles.paymentItem}
        onPress={handlePress}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={500}
      >
        <View style={styles.paymentHeader}>
          <View style={styles.dateTimeContainer}>
            <Text style={styles.paymentDate}>{formattedDate}</Text>
            <Text style={styles.paymentTime}>
              {formattedTime}
            </Text>
          </View>
          <View style={styles.amountSection}>
            {isLocal && (
              <View style={styles.warningIcon}>
                <Ionicons name="warning" size={16} color="#FFA500" />
              </View>
            )}
            <View style={[
              styles.amountContainer,
              {
                backgroundColor: item.whoPaid === users[0] ? USER_COLORS[0] : USER_COLORS[1]
              }
            ]}>
              <Text style={styles.amountText}>
                ${displayAmount.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.paymentDetails}>
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentTitle}>{item.title || 'Untitled'}</Text>
            <View style={styles.payerInfo}>
              <Ionicons
                name="person"
                size={16}
                color={item.whoPaid === users[0] ? USER_COLORS[0] : USER_COLORS[1]}
              />
              <Text style={[
                styles.payerName,
                {
                  color: item.whoPaid === users[0] ? USER_COLORS[0] : USER_COLORS[1]
                }
              ]}>
                {item.whoPaid}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [localPayments, users, handlePaymentPress, handleLongPress]);





  const renderMonthSection = ({ item }: { item: GroupedPayments }) => {
    const isExpanded = expandedMonths[item.title] ?? true;

    return (
      <View style={styles.monthSection}>
        <TouchableOpacity
          style={styles.monthHeader}
          onPress={() => toggleMonth(item.title)}
        >
          <View style={styles.monthHeaderLeft}>
            <Ionicons
              name={isExpanded ? "chevron-down" : "chevron-forward"}
              size={24}
              color="#666"
            />
            <Text style={styles.monthTitle}>{item.title}</Text>
          </View>
          <View style={styles.monthTotalContainer}>
            <Text style={styles.monthTotal}>
              Total: {isBalanceVisible ? formatBalance(item.totalAmount) : '•••••'}
            </Text>
            <Text style={styles.monthOwes}>
              {isBalanceVisible ? (
                <BalanceSummaryText balance={item.totalAmount} />
              ) : '***'}
            </Text>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <FlatList
            data={item.data}
            renderItem={renderReceiptItem}
            keyExtractor={receipt => receipt.id}
            scrollEnabled={false}
          />
        )}
      </View>
    );
  };


  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      ) : (
        <>
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <Text style={styles.balanceTitle}>Overall Balance</Text>
              <TouchableOpacity onPress={toggleBalanceVisibility}>
                <Ionicons
                  name={isBalanceVisible ? "eye-outline" : "eye-off-outline"}
                  size={24}
                  color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.balanceAmount}>
              {isBalanceVisible ? formatBalance(totalBalance) : '•••••'}
            </Text>
            <Text style={styles.balanceSubtitle}>
              {isBalanceVisible ? <BalanceSummaryText balance={totalBalance} /> : '***'}
            </Text>
          </View><FlatList
            data={groupedPayments}
            renderItem={renderMonthSection}
            keyExtractor={item => item.title}
            contentContainerStyle={styles.listContainer} />
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleResetAll}
          >
            <Text style={styles.resetButtonText}>Reset All Payments (DEBUG USE)</Text>

          </TouchableOpacity>
        </>

      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  resetButton: {
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
    margin: 16,
    alignItems: 'center',
  },
  resetButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  balanceCard: {
    margin: 16,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  balanceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 8,
  },
  balanceSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  monthSection: {
    marginBottom: 0,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  paymentItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  receiptIcon: {
    padding: 4,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  amountContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  amountText: {
    color: 'white',
    fontWeight: '600',
  },
  paymentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  payerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  payerName: {
    fontSize: 14,
    fontWeight: '500',
  },
  dateTimeContainer: {
    gap: 10,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentDate: {
    fontSize: 14,
    color: '#666',
  },
  paymentTime: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  monthHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  monthTotalContainer: {
    alignItems: 'flex-end', // Right align both texts
  },
  monthTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  monthOwes: {
    fontSize: 12,
    color: '#666',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  amountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warningIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default OverallPayment;