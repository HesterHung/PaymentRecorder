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
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [isLocalLoading, setIsLocalLoading] = useState(false);
  const [retryingPayments, setRetryingPayments] = useState<{ [key: string]: boolean }>({});
  const [failedPayments, setFailedPayments] = useState<Set<string>>(new Set());

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
      const loadData = async () => {
        try {
          // Load local data first
          await loadLocalReceipts();
          // Then load API data
          await loadApiReceipts();
        } catch (error) {
          console.error('Error in loadData:', error);
        }
      };
      loadData();
    }, [])
  );


  const toggleMonth = (monthTitle: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedMonths(prev => ({
      ...prev,
      [monthTitle]: !prev[monthTitle]
    }));
  };

  const renderLocalPayments = () => {
    if (!localPayments.size) return null;

    const localPaymentItems = groupedPayments
      .flatMap(group => group.data)
      .filter(payment => localPayments.has(payment.id));

    if (localPaymentItems.length === 0) return null;

    return (
      <View style={styles.localPaymentsSection}>
        <View style={styles.localPaymentsHeader}>
          <View style={styles.headerLeftContent}>
            <Ionicons name="cloud-upload-outline" size={24} color="#666" />
            <Text style={styles.localPaymentsTitle}>Pending Uploads</Text>
          </View>
          <Text style={styles.pendingCount}>
            {localPaymentItems.length} {localPaymentItems.length === 1 ? 'item' : 'items'}
          </Text>
        </View>
        {localPaymentItems.map(payment => (
          <View key={payment.id} style={styles.localPaymentWrapper}>
            {renderReceiptItem({ item: payment })}
          </View>
        ))}
      </View>
    );
  };

  const loadLocalReceipts = async () => {
    setIsLocalLoading(true);
    try {
      const localReceipts = await StorageUtils.getStoredPayments();
      console.log('Local receipts loaded:', localReceipts); // Debug log

      if (localReceipts && localReceipts.length > 0) {
        setLocalPayments(new Set(localReceipts.map(p => p.id)));
        const localSummary = calculatePaymentBalance(localReceipts);

        const groupedArray = Object.entries(localSummary.monthlyBalances)
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

        setTotalBalance(localSummary.totalBalance);
        setGroupedPayments(groupedArray);
      }
    } catch (error) {
      console.error('Error loading local receipts:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load local payments'
      });
    } finally {
      setIsLocalLoading(false);
    }
  };

  const loadApiReceipts = async (shouldRetry: boolean = true) => {
    setIsApiLoading(true);
    try {
      const onlineReceipts = await APIService.getPayments();
      const localReceipts = await StorageUtils.getStoredPayments();

      const onlineSummary = calculatePaymentBalance(onlineReceipts);
      setTotalBalance(onlineSummary.totalBalance);

      // Create a map of online receipt IDs for faster lookup
      const onlineReceiptIds = new Set(onlineReceipts.map(receipt => receipt.id));

      if (shouldRetry) {
        const localPaymentsToRetry = new Map();
        localReceipts.forEach(payment => {
          // Only retry if payment is local and not already on server
          if (localPayments.has(payment.id) &&
            !onlineReceiptIds.has(payment.id) &&
            !failedPayments.has(payment.id)) {
            localPaymentsToRetry.set(payment.id, payment);
          }
        });

        // Start retry process for local payments
        if (localPaymentsToRetry.size > 0) {
          setRetryingPayments(prev => {
            const next = { ...prev };
            localPaymentsToRetry.forEach((_, id) => {
              next[id] = true;
            });
            return next;
          });

          // Retry logic for each payment
          const retryPromises = Array.from(localPaymentsToRetry.entries()).map(([id, payment]) =>
            new Promise(async (resolve) => {
              let retryCount = 0;
              const maxRetries = 4;
              const retryInterval = 5000;

              const attemptUpload = async () => {
                try {
                  await APIService.savePayment({
                    title: payment.title,
                    whoPaid: payment.whoPaid,
                    amount: payment.amount,
                    amountType: payment.amountType as 'total' | 'specify',
                    paymentDatetime: payment.paymentDatetime
                  });

                  // If upload successful, remove from local storage
                  await StorageUtils.deletePayment(payment.id);
                  setLocalPayments(prev => {
                    const next = new Set(prev);
                    next.delete(payment.id);
                    return next;
                  });

                  return true;
                } catch (error) {
                  console.error('Upload attempt failed:', error);
                  return false;
                }
              };

              while (retryCount < maxRetries) {
                if (await attemptUpload()) {
                  setRetryingPayments(prev => ({
                    ...prev,
                    [id]: false
                  }));
                  resolve(true);
                  return;
                }
                await new Promise(r => setTimeout(r, retryInterval));
                retryCount++;
              }

              setFailedPayments(prev => new Set(prev).add(id));
              setRetryingPayments(prev => ({
                ...prev,
                [id]: false
              }));
              resolve(false);
            })
          );

          await Promise.all(retryPromises);
        }
      }


      // Create a map of local payment IDs that need retry

      // After all retries, reload all payments
      const finalOnlineReceipts = await APIService.getPayments();
      const finalLocalReceipts = await StorageUtils.getStoredPayments();

      // Combine all receipts, preferring online versions
      const onlineIds = new Set(finalOnlineReceipts.map(p => p.id));
      const uniqueLocalReceipts = finalLocalReceipts.filter(p => !onlineIds.has(p.id));
      const allReceipts = [...finalOnlineReceipts, ...uniqueLocalReceipts];

      const validReceipts = allReceipts.filter(receipt =>
        receipt &&
        typeof receipt.amount === 'number' &&
        typeof receipt.paymentDatetime === 'number'
      );

      const displaySummary = calculatePaymentBalance(validReceipts);
      const groupedArray = Object.entries(displaySummary.monthlyBalances)
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

      setGroupedPayments(groupedArray);

    } catch (error) {
      console.error('Error loading API receipts:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load online payments'
      });
    } finally {
      setIsApiLoading(false);
    }
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

      if (!Array.isArray(onlineReceipts)) {
        console.error('Expected array of online receipts, got:', onlineReceipts);
        return;
      }

      // Calculate total balance using only online receipts
      const onlineSummary = calculatePaymentBalance(onlineReceipts);
      setTotalBalance(onlineSummary.totalBalance);

      // Combine receipts for display purposes
      const allReceipts = [...localReceipts, ...onlineReceipts];

      // Filter out any invalid payments
      const validReceipts = allReceipts.filter(receipt =>
        receipt &&
        typeof receipt.amount === 'number' &&
        typeof receipt.paymentDatetime === 'number'
      );

      // Group all payments for display
      const displaySummary = calculatePaymentBalance(validReceipts);
      const groupedArray = Object.entries(displaySummary.monthlyBalances)
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
                await StorageUtils.deletePayment(payment.id);
                setLocalPayments(prev => {
                  const next = new Set(prev);
                  next.delete(payment.id);
                  return next;
                });
                await loadLocalReceipts();
                await loadApiReceipts(false);  // Don't retry when deleting
              } else {
                await APIService.deletePayment(payment.id);
                await loadApiReceipts(false);  // Don't retry when deleting
              }

              Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Payment deleted successfully'
              });
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
              setIsLoading(true);
              Toast.show({
                type: 'info',
                text1: 'Deleting all records...',
                text2: 'Please wait'
              });

              // Get all payments
              const [onlineReceipts, localReceipts] = await Promise.all([
                APIService.getPayments(),
                StorageUtils.getStoredPayments()
              ]);

              // Delete all online payments
              const onlineDeletePromises = onlineReceipts.map(payment =>
                APIService.deletePayment(payment.id)
              );

              // Delete all local payments and storage
              await Promise.all([
                ...onlineDeletePromises,
                AsyncStorage.removeItem(CONSTANTS.STORAGE_KEYS.PAYMENTS),
                StorageUtils.clearAllPayments() // Add this method to StorageUtils
              ]);

              // Reset states
              setLocalPayments(new Set());
              setFailedPayments(new Set());
              setRetryingPayments({});
              setGroupedPayments([]);
              setTotalBalance(0);

              Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'All payment records have been deleted'
              });

            } catch (error) {
              console.error('Error clearing payments:', error);
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to delete all records. Please try again.'
              });
            } finally {
              setIsLoading(false);
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

              // Upload to server
              await APIService.savePayment({
                title: payment.title,
                whoPaid: payment.whoPaid,
                amount: payment.amount,
                amountType: payment.amountType as 'total' | 'specify',
                paymentDatetime: payment.paymentDatetime
              });

              // Remove from local storage
              await StorageUtils.deletePayment(payment.id);

              // Update local payments state
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

              // Refresh both local and API data
              await loadLocalReceipts();
              await loadApiReceipts(false); // Don't retry when we just uploaded

            } catch (error) {
              console.error('Error uploading payment:', error);
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to upload payment. Please try again later.'
              });
            }
          }
        }
      ]
    );
  };

  const renderReceiptItem = useCallback(({ item }: { item: Payment }) => {
    const isLocal = localPayments.has(item.id);
    const isRetrying = retryingPayments[item.id];
    const hasFailed = failedPayments.has(item.id);

    const handlePress = () => {
      if (isLocal) {
        // For local payments, trigger upload instead of navigation
        handlePaymentUpload(item);
      } else {
        // Only navigate to input screen for online payments
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
        style={[
          styles.paymentItem,
          isLocal && styles.localPaymentItem // Add different styling for local items if desired
        ]}
        onPress={handlePress}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={500}
      >
        <View style={styles.paymentHeader}>
          <View style={styles.dateTimeContainer}>
            <Text style={styles.paymentDate}>{formattedDate}</Text>
            <Text style={styles.paymentTime}>{formattedTime}</Text>
          </View>
          <View style={styles.amountSection}>
            {isLocal && (
              <View style={[styles.warningIcon, { width: 24, height: 24 }]}>
                {isRetrying ? (
                  <ActivityIndicator size="small" color="#FFA500" />
                ) : hasFailed ? (
                  <Ionicons name="warning-outline" size={20} color="#FFA500" />
                ) : (
                  <ActivityIndicator size="small" color="#0000ff" />
                )}
              </View>
            )}
            <View style={[
              styles.amountContainer,
              {
                backgroundColor: item.whoPaid === users[0] ? USER_COLORS[0] : USER_COLORS[1],
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4
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
          {isLocal && (
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => handlePaymentUpload(item)}
            >
              <Ionicons name="cloud-upload-outline" size={20} color="#666" />
              <Text style={styles.uploadButtonText}>Upload</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [localPayments, retryingPayments, failedPayments, users]);



  const renderMonthSection = ({ item }: { item: GroupedPayments }) => {


    const isExpanded = expandedMonths[item.title] ?? true;

    // Filter out local payments from the month's data
    const onlinePayments = item.data.filter(payment => !localPayments.has(payment.id));

    // Calculate the total amount for online payments only
    const onlineTotal = onlinePayments.reduce((sum, payment) => {
      const amount = payment.amountType === 'total' ? payment.amount / 2 : payment.amount;
      return sum + (payment.whoPaid === users[0] ? -amount : amount);
    }, 0);

    // Don't render the month section if there are no online payments
    if (onlinePayments.length === 0) return null;

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
              Total: {isBalanceVisible ? formatBalance(onlineTotal) : '•••••'}
            </Text>
            <Text style={styles.monthOwes}>
              {isBalanceVisible ? (
                <BalanceSummaryText balance={onlineTotal} />
              ) : '***'}
            </Text>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <FlatList
            data={onlinePayments}
            renderItem={renderReceiptItem}
            keyExtractor={receipt => receipt.id}
            scrollEnabled={false}
          />
        )}
      </View>
    );
  };

  const calculateOnlineTotal = () => {
    return groupedPayments
      .flatMap(group => group.data)
      .filter(payment => !localPayments.has(payment.id))
      .reduce((sum, payment) => {
        const amount = payment.amountType === 'total' ? payment.amount / 2 : payment.amount;
        return sum + (payment.whoPaid === users[0] ? -amount : amount);
      }, 0);
  };

  return (
    <View style={styles.container}>
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
        {isApiLoading ? (
          <View style={styles.balanceLoadingContainer}>
            <ActivityIndicator size="small" color="#666" />
            <Text style={styles.balanceLoadingText}>Loading balance...</Text>
          </View>
        ) : (
          <>
            <Text style={styles.balanceAmount}>
              {isBalanceVisible ? formatBalance(totalBalance) : '•••••'}
            </Text>
            <Text style={styles.balanceSubtitle}>
              {isBalanceVisible ? <BalanceSummaryText balance={totalBalance} /> : '***'}
            </Text>
          </>
        )}
      </View>

      <TouchableOpacity
        style={styles.resetButton}
        onPress={handleResetAll}
      >
        <Text style={styles.resetButtonText}>Reset All Records (Debug)</Text>
      </TouchableOpacity>

      {isLocalLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Loading local payments...</Text>
        </View>
      ) : (
        <FlatList
          data={groupedPayments}
          ListHeaderComponent={renderLocalPayments}
          renderItem={renderMonthSection}
          keyExtractor={item => item.title}
          contentContainerStyle={styles.listContainer}
          ListFooterComponent={
            isApiLoading ? (
              <View style={styles.apiLoadingContainer}>
                <ActivityIndicator size="small" color="#0000ff" />
                <Text style={styles.apiLoadingText}>Loading online payments...</Text>
              </View>
            ) : null
          }
        />
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
  warningIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  amountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 4,
  },
  apiLoadingContainer: {
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  apiLoadingText: {
    color: '#666',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
    fontSize: 14,
  },
  localPaymentsSection: {
    backgroundColor: '#fff8dc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ffd700',
  },
  localPaymentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  localPaymentsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  pendingCount: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  localPaymentWrapper: {
    marginBottom: 8,
  },
  localPaymentItem: {
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  uploadButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  balanceLoadingContainer: {
    minHeight: 80,  // Adjust this value to match your normal balance display height
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  balanceLoadingText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});

export default OverallPayment;
