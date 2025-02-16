import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Platform,
  UIManager,
  LayoutAnimation,
  ActivityIndicator,
  AppState,
  AppStateStatus,
  RefreshControl,
  Modal,
  Pressable,
  ScrollView,
  Alert
} from 'react-native';
import { StorageUtils, UploadHistoryEntry } from '../utils/storage';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Payment, GroupedPayments, CONSTANTS } from '../types/payment';
import { router, useFocusEffect } from 'expo-router';
import userStorage from '@/services/userStorage';
import { BalanceSummaryText, calculatePaymentBalance, formatBalance } from '@/utils/paymentCalculator';
import { USER_COLORS } from '@/constants/Colors';
import Toast from 'react-native-toast-message';
import APIService from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitter } from '@/hooks/eventEmitter';

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
  const [refreshing, setRefreshing] = useState(false); // RefreshControl state
  const [queuedPayments, setQueuedPayments] = useState<Set<string>>(new Set());
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [lastFetchedData, setLastFetchedData] = useState<GroupedPayments[]>([]);
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
  const [uploadHistory, setUploadHistory] = useState<UploadHistoryEntry[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false); // Add this
  // Track app state changes
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const loadLastFetchedData = async () => {
      try {
        const lastApiPayments = await StorageUtils.getLastApiPayments();
        if (lastApiPayments.length > 0) {
          const summary = calculatePaymentBalance(lastApiPayments);
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
          setLastFetchedData(groupedArray);
        }
      } catch (error) {
        console.error('Error loading last fetched data:', error);
      }
    };

    loadLastFetchedData();
  }, []);

  const areQueuesEqual = (a: Set<string>, b: Set<string>): boolean => {
    if (a.size !== b.size) return false;
    for (const item of a) {
      if (!b.has(item)) return false;
    }
    return true;
  };


  useEffect(() => {
    const subscription = emitter.addListener('paymentsUpdated', async () => {
      console.log('paymentsUpdated event received – re-getting data.');
      await loadLocalReceipts();
      await loadApiReceipts();
    });
    return () => subscription.remove();
  }, []);

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

  useEffect(() => {
    let isMounted = true;

    const checkRetryAndQueue = async () => {
      if (!isMounted) return;

      try {
        const retryStatus = await StorageUtils.getRetryStatus();
        const isAnyRetrying = Object.values(retryStatus).some(status => status === true);

        if (!isAnyRetrying) {
          // Get the upload queue
          const queue = await StorageUtils.getUploadQueue();

          if (queue.length > 0) {
            // Get the first payment in queue
            const nextPaymentId = queue[0];

            // Remove from queue
            await StorageUtils.removeFromUploadQueue(nextPaymentId);
            setQueuedPayments(prev => {
              const next = new Set(prev);
              next.delete(nextPaymentId);
              return next;
            });

            // Set retry status for this payment
            await StorageUtils.setRetryStatus(nextPaymentId, true);

            // Get the payment details
            const payments = await StorageUtils.getStoredPayments();
            const nextPayment = payments.find(p => p.id === nextPaymentId);

            if (nextPayment) {
              // Trigger upload for this payment
              handlePaymentUpload(nextPayment);

              // Update UI states
              setRetryingPayments(prev => ({
                ...prev,
                [nextPaymentId]: true
              }));
            }
          }
          renderLocalPayments();
        }
      } catch (error) {
        console.error('Error checking retry status and queue:', error);
      }
    };

    // Check initially
    checkRetryAndQueue();

    // Set up interval
    const intervalId = setInterval(checkRetryAndQueue, 3000); // Check every 5 seconds

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []); // Empty dependency array means this runs once on mount

  useEffect(() => {
    let isMounted = true;

    const checkStatuses = async () => {
      if (!isMounted) return;

      try {
        // Get both statuses in parallel
        const [queue, retryStatus] = await Promise.all([
          StorageUtils.getUploadQueue(),
          StorageUtils.getRetryStatus()
        ]);

        // Update queue status if changed
        setQueuedPayments(prevQueue => {
          const newQueue = new Set(queue);
          return areQueuesEqual(prevQueue, newQueue) ? prevQueue : newQueue;
        });

        // Update retry status if changed
        setRetryingPayments(prevStatus => {
          if (JSON.stringify(prevStatus) !== JSON.stringify(retryStatus)) {
            return retryStatus;
          }
          return prevStatus;
        });
      } catch (error) {
        console.error('Error checking statuses:', error);
      }
    };

    // Check initially
    checkStatuses();

    // Check every 5 seconds
    const intervalId = setInterval(checkStatuses, 3000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const loadLastUpdated = async () => {
      const timestamp = await StorageUtils.getLastUpdated();
      setLastUpdated(timestamp);
    };
    loadLastUpdated();
  }, []);

  useEffect(() => {
    console.log("HI")

    const loadHistory = async () => {
      const history = await StorageUtils.getUploadHistory();
      setUploadHistory(history);
    };

    // Load history initially
    loadHistory();

    // Set up an interval to update history periodically
    const intervalId = setInterval(loadHistory, 10000);

    return () => clearInterval(intervalId);
  }, []); // Empty dependency array means this only runs once on mount

  useFocusEffect(
    React.useCallback(() => {
      const loadData = async () => {
        try {
          // Load local data first
          await loadLocalReceipts();
          // Then load API data
          await loadApiReceipts();
          renderLocalPayments();
        } catch (error) {
          console.error('Error in loadData:', error);
        }
      };
      loadData();
    }, [])
  );

  const getLoadingSkeletonData = (): GroupedPayments[] => [
    {
      title: 'Loading-Section-1', // Changed to be unique
      data: [
        {
          id: 'loading-skeleton-1',
          title: '',
          whoPaid: users[0],
          amount: 0,
          amountType: 'total',
          paymentDatetime: Date.now(),
        },
        {
          id: 'loading-skeleton-2',
          title: '',
          whoPaid: users[0],
          amount: 0,
          amountType: 'total',
          paymentDatetime: Date.now(),
        }
      ],
      totalAmount: 0
    },
    {
      title: 'Loading-Section-2', // Changed to be unique
      data: [
        {
          id: 'loading-skeleton-3',
          title: '',
          whoPaid: users[0],
          amount: 0,
          amountType: 'total',
          paymentDatetime: Date.now(),
        }
      ],
      totalAmount: 0
    }
  ];

  const LoadingPaymentItem = () => (
    <View style={[styles.paymentItem, styles.loadingItem]}>
      <View style={styles.paymentHeader}>
        <View style={styles.dateTimeContainer}>
          <View style={[styles.loadingPlaceholder, { width: 80 }]} />
          <View style={[styles.loadingPlaceholder, { width: 60 }]} />
        </View>
        <View style={styles.amountSection}>
          <View style={[styles.loadingPlaceholder, { width: 70, height: 30 }]} />
        </View>
      </View>
      <View style={styles.paymentDetails}>
        <View style={styles.paymentInfo}>
          <View style={[styles.loadingPlaceholder, { width: 120, marginBottom: 8 }]} />
          <View style={[styles.loadingPlaceholder, { width: 80 }]} />
        </View>
      </View>
    </View>
  );

  const LoadingMonthSection = () => (
    <View style={styles.monthSection}>
      <View style={styles.monthHeader}>
        <View style={styles.monthHeaderLeft}>
          <Ionicons name="chevron-down" size={24} color="#ccc" />
          <View style={[styles.loadingPlaceholder, { width: 100 }]} />
        </View>
        <View style={styles.monthTotalContainer}>
          <View style={[styles.loadingPlaceholder, { width: 80 }]} />
          <View style={[styles.loadingPlaceholder, { width: 60 }]} />
        </View>
      </View>
      <LoadingPaymentItem />
      <LoadingPaymentItem />
    </View>
  );

  const handleHistoryButtonPress = async () => {
    if (!isHistoryModalVisible) {  // Only load if modal isn't already visible
      try {
        setIsHistoryLoading(true);
        const history = await StorageUtils.getUploadHistory();
        setUploadHistory(history);
        setIsHistoryModalVisible(true);
      } catch (error) {
        console.error('Error loading history:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load upload history',
          position: 'bottom',

        });
      } finally {
        setIsHistoryLoading(false);
      }
    } else {
      setIsHistoryModalVisible(true);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadLocalReceipts();
    await loadApiReceipts();
    setRefreshing(false);
  };

  const toggleMonth = (monthTitle: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedMonths(prev => ({
      ...prev,
      [monthTitle]: !prev[monthTitle]
    }));
  };

  const formatLastUpdated = (timestamp: number | null): string => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
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
        text2: 'Failed to load local payments',
        position: 'bottom',
      });
    } finally {
      setIsLocalLoading(false);
    }
  };

  const loadApiReceipts = async () => {
    setIsApiLoading(true);
    try {
      const onlineReceipts = await APIService.getPayments();
      const currentTime = Date.now();

      // Store the fetched data
      await StorageUtils.storeLastApiPayments(onlineReceipts);
      await StorageUtils.setLastUpdated(currentTime);

      setLastUpdated(currentTime);
      setIsOffline(false);

      const localReceipts = await StorageUtils.getStoredPayments();
      const onlineSummary = calculatePaymentBalance(onlineReceipts);
      setTotalBalance(onlineSummary.totalBalance);

      const onlineIds = new Set(onlineReceipts.map(p => p.id));
      const uniqueLocalReceipts = localReceipts.filter(p => !onlineIds.has(p.id));
      const allReceipts = [...onlineReceipts, ...uniqueLocalReceipts];

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

      // Set both the current and last fetched data
      setGroupedPayments(groupedArray);
      setLastFetchedData(groupedArray); // Add this line

    } catch (error) {
      console.error('Error loading API receipts:', error);
      setIsOffline(true);
      const lastUpdatedTime = await StorageUtils.getLastUpdated();
      setLastUpdated(lastUpdatedTime);

      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load online payments',
        position: 'bottom',
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
        position: 'bottom',
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
        text2: 'Failed to load payments',
        position: 'bottom',
      });
      setGroupedPayments([]);
      setTotalBalance(0);
    }
  };

  const handleLongPress = async (payment: Payment) => {
    const isLocal = localPayments.has(payment.id);

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
                await StorageUtils.setRetryStatus(payment.id, false);  // Add this line
                setLocalPayments(prev => {
                  const next = new Set(prev);
                  next.delete(payment.id);
                  return next;
                });
                await loadLocalReceipts();
                await loadApiReceipts();
              } else {
                await APIService.deletePayment(payment.id);
                await loadApiReceipts();
              }

              Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Payment deleted successfully',
              });
            } catch (error) {
              console.error('Error deleting payment:', error);
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to delete payment',
                position: 'bottom',
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
                text2: 'Please wait',
                position: 'bottom',
              });

              // Debug print before clearing
              await StorageUtils.debugPrintAllStorage();

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
                StorageUtils.clearAllPayments(),
                StorageUtils.forceResetRetryStatus()  // Add this line
              ]);

              // Reset states
              setLocalPayments(new Set());
              setGroupedPayments([]);
              setTotalBalance(0);
              setRetryingPayments({});  // Add this line
              setQueuedPayments(new Set());  // Add this line if you have queued payments state

              // Debug print after clearing
              await StorageUtils.debugPrintAllStorage();

              Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'All payment records have been deleted',
                position: 'bottom',

              });

            } catch (error) {
              console.error('Error clearing payments:', error);
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to delete all records. Please try again.',
                position: 'bottom',
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
    try {
      // First check if this specific payment is already being processed
      if (retryingPayments[payment.id]) {
        console.log('Payment is already being processed');
        return;
      }

      // Update retry status
      setRetryingPayments(prev => ({
        ...prev,
        [payment.id]: true
      }));

      const paymentData = {
        title: payment.title,
        whoPaid: payment.whoPaid,
        amount: payment.amount,
        amountType: payment.amountType,
        paymentDatetime: payment.paymentDatetime
      };

      if (!isApiLoading) {
        await APIService.savePayment(paymentData, 10000);

        // If successful, remove from local storage and retry status
        await StorageUtils.deletePayment(payment.id);
        await StorageUtils.setRetryStatus(payment.id, false);

        // Clear this payment's retry status
        setRetryingPayments(prev => {
          const next = { ...prev };
          delete next[payment.id];
          return next;
        });

        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: `${payment.title || 'Untitled'} uploaded successfully`,
          position: 'bottom',
        });

        // Refresh the local payments display
        await loadLocalReceipts();
        emitter.emit('paymentsUpdated');
      } else {
        Toast.show({
          type: 'error',
          text1: 'Uplaod Fail',
          text2: `API is not ready yet. Try again later.`,
          position: 'bottom',
        });
      }


    } catch (error) {
      console.error('Upload retry failed:', error);

      // Clear retry status for this payment
      setRetryingPayments(prev => {
        const next = { ...prev };
        delete next[payment.id];
        return next;
      });

      await StorageUtils.setRetryStatus(payment.id, false);

      // Add to history
      await StorageUtils.addUploadHistory({
        paymentId: payment.id,
        timestamp: Date.now(),
        paymentDatetime: payment.paymentDatetime,
        paymentTitle: payment.title,
        amount: payment.amount,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Upload Failed'
      });

      // Add back to queue for retry
      await StorageUtils.addToUploadQueue(payment.id);
      setQueuedPayments(prev => {
        const next = new Set(prev);
        next.add(payment.id);
        return next;
      });
    }
  };

  const renderReceiptItem = useCallback(({ item }: { item: Payment }) => {
    const isLocal = localPayments.has(item.id);
    const isRetrying = retryingPayments[item.id];
    const isQueued = queuedPayments.has(item.id);

    const date = new Date(item.paymentDatetime);
    const formattedDate = date.toLocaleDateString();
    const formattedTime = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const displayAmount = item.amountType === 'total'
      ? item.amount / 2
      : item.amount;

    return (
      <TouchableOpacity
        style={[
          styles.paymentItem,
          isLocal && styles.localPaymentItem
        ]}
        onPress={() => isLocal ? handlePaymentUpload(item) : handlePaymentPress(item)}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={500}
        activeOpacity={0.7}
      >
        <View style={styles.paymentHeader}>
          <View style={styles.dateTimeContainer}>
            <Text style={styles.paymentDate}>{formattedDate}</Text>
            <Text style={styles.paymentTime}>{formattedTime}</Text>
          </View>
          <View style={styles.amountSection}>
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
              style={[
                styles.uploadButton,
                isRetrying && styles.uploadButtonRetrying,
                isQueued && styles.uploadButtonQueued
              ]}
              onPress={() => handlePaymentUpload(item)}
              disabled={isRetrying || isQueued} // Disable button if retrying or queued
            >
              {isRetrying ? (
                <>
                  <ActivityIndicator size="small" color="#666" />
                  <Text style={styles.uploadButtonText}>Uploading...</Text>
                </>
              ) : isQueued ? (
                <>
                  <Ionicons name="time-outline" size={20} color="#666" />
                  <Text style={styles.uploadButtonText}>Queued</Text>
                </>
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={20} color="#666" />
                  <Text style={styles.uploadButtonText}>Upload</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [localPayments, retryingPayments, queuedPayments, handlePaymentUpload]);

  const renderMonthSection = ({ item }: { item: GroupedPayments }) => {
    if (isApiLoading && isInitialLoad) {
      return (
        <View style={styles.monthSection}>
          <View style={styles.monthHeader}>
            <View style={styles.monthHeaderLeft}>
              <Ionicons name="chevron-down" size={24} color="#ccc" />
              <View style={[styles.loadingPlaceholder, { width: 100 }]} />
            </View>
            <View style={styles.monthTotalContainer}>
              <View style={[styles.loadingPlaceholder, { width: 80 }]} />
              <View style={[styles.loadingPlaceholder, { width: 60 }]} />
            </View>
          </View>
          {item.data.map(payment => (
            <View key={payment.id} style={[styles.paymentItem, styles.loadingItem]}>
              <View style={styles.paymentHeader}>
                <View style={styles.dateTimeContainer}>
                  <View style={[styles.loadingPlaceholder, { width: 80 }]} />
                  <View style={[styles.loadingPlaceholder, { width: 60 }]} />
                </View>
                <View style={styles.amountSection}>
                  <View style={[styles.loadingPlaceholder, { width: 70, height: 30 }]} />
                </View>
              </View>
              <View style={styles.paymentDetails}>
                <View style={styles.paymentInfo}>
                  <View style={[styles.loadingPlaceholder, { width: 120, marginBottom: 8 }]} />
                  <View style={[styles.loadingPlaceholder, { width: 80 }]} />
                </View>
              </View>
            </View>
          ))}
        </View>
      );
    }

    const isExpanded = expandedMonths[item.title] ?? true;

    // Filter out local payments from the month's data
    const onlinePayments = item.data.filter(payment => !localPayments.has(payment.id));

    // Calculate the total amount for online payments only
    const onlineTotal = onlinePayments.reduce((sum, payment) => {
      const amount = payment.amountType === 'total' ? payment.amount / 2 : payment.amount;
      return sum + (payment.whoPaid === users[0] ? amount : -amount);
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

  const keyExtractor = (item: GroupedPayments, index: number) => {
    if (isApiLoading && isInitialLoad) {
      return `loading-section-${index}`;
    }
    return item.title;
  };

  const HistoryModal = React.memo(() => (
    <Modal
      visible={isHistoryModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setIsHistoryModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Background Upload History</Text>
              <TouchableOpacity
                onPress={() => setIsHistoryModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {isHistoryLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#666" />
                </View>
              ) : uploadHistory.length === 0 ? (
                <View style={styles.emptyHistoryContainer}>
                  <Ionicons name="time-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyHistoryText}>No upload history yet</Text>
                </View>
              ) : (
                <ScrollView
                  style={styles.scrollView}
                  contentContainerStyle={styles.scrollViewContent}
                  showsVerticalScrollIndicator={true}
                >
                  {uploadHistory.map((item, index) => (
                    <View key={`${item.paymentId}-${index}`} style={styles.historyItem}>
                      <View style={styles.historyHeader}>
                        <Text style={styles.historyTitle}>{item.paymentTitle}</Text>
                        <Text style={[
                          styles.historyStatus,
                          { color: item.status === 'success' ? '#4CAF50' : '#F44336' }
                        ]}>
                          {item.status === 'success' ? 'Success' : 'Failed'}
                        </Text>
                      </View>
                      <Text style={styles.historyAmount}>${item.amount.toFixed(2)}</Text>
                      <View style={styles.historyTimeContainer}>
                        <Text style={styles.historyTimestamp}>
                          Created: {item.paymentDatetime
                            ? new Date(item.paymentDatetime).toLocaleString()
                            : 'Date not available'}
                        </Text>
                        <Text style={styles.historyTimestamp}>
                          Upload Attempt: {new Date(item.timestamp).toLocaleString()}
                        </Text>
                      </View>
                      {item.error && (
                        <Text style={styles.historyError}>{item.error}</Text>
                      )}
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  ));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (
        (appState.current === 'active' &&
          (nextAppState === 'background' || nextAppState === 'inactive'))
      ) {
        // App is going to background
        console.log('App going to background - pausing uploads');
        try {
          await StorageUtils.handleAppBackground();
          // Update UI states
          setRetryingPayments({});
          const queue = await StorageUtils.getUploadQueue();
          setQueuedPayments(new Set(queue));
        } catch (error) {
          console.error('Error handling background transition:', error);
        }
      } else if (
        (appState.current.match(/inactive|background/) &&
          nextAppState === 'active')
      ) {
        // App is coming to foreground
        console.log('App coming to foreground - resuming uploads');
        try {
          const nextPaymentId = await StorageUtils.handleAppForeground();
          if (nextPaymentId) {
            const payments = await StorageUtils.getStoredPayments();
            const paymentToProcess = payments.find(p => p.id === nextPaymentId);
            if (paymentToProcess) {
              handlePaymentUpload(paymentToProcess);
            }
          }
        } catch (error) {
          console.error('Error handling foreground transition:', error);
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [handlePaymentUpload]);

  return (
    <FlatList
      data={
        isApiLoading && lastFetchedData.length > 0
          ? lastFetchedData
          : isApiLoading
            ? getLoadingSkeletonData()
            : groupedPayments
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refreshData} />
      }
      ListHeaderComponent={
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.balanceCard}
            onPress={toggleBalanceVisibility}
            activeOpacity={0.6}
          >
            <View style={styles.balanceHeader}>
              <Text style={styles.balanceTitle}>Overall Balance</Text>
              <Ionicons
                name={isBalanceVisible ? "eye-outline" : "eye-off-outline"}
                size={28}
                color="#666"
              />
            </View>
            {isApiLoading ? (
              <View style={styles.balanceLoadingContainer}>
                <ActivityIndicator size="large" color="#666" />
              </View>
            ) : (
              <>
                <Text style={styles.balanceAmount}>
                  {isBalanceVisible ? formatBalance(totalBalance) : '•••••'}
                </Text>
                <Text style={styles.balanceSubtitle}>
                  {isBalanceVisible
                    ? <BalanceSummaryText balance={totalBalance} />
                    : '***'}
                </Text>
              </>
            )}
          </TouchableOpacity>
          {/* Updated lastUpdatedContainer - history button is now on the left, text on the right */}
          <View style={styles.lastUpdatedContainer}>
            <TouchableOpacity
              onPress={handleHistoryButtonPress}
              style={styles.historyButton}
              disabled={isHistoryLoading}
            >
              {isHistoryLoading ? (
                <ActivityIndicator size="small" color="#666" />
              ) : (
                <MaterialIcons name="manage-history" size={24} color="#666" />
              )}
            </TouchableOpacity>
            <Text style={styles.lastUpdatedText}>
              {isOffline ? 'Offline -' : isApiLoading ? 'Updating... Last updated:' : 'Last updated:'} {formatLastUpdated(lastUpdated)}
            </Text>
          </View>
          <HistoryModal />
          {/*
            <TouchableOpacity onPress={handleResetAll} style={styles.debugResetButton}></TouchableOpacity>
          */}
          {renderLocalPayments()}
        </View>
      }
      renderItem={renderMonthSection}
      keyExtractor={(item) => item.title}
      contentContainerStyle={styles.listContainer}
    />
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
    marginBottom: 0,
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
    alignItems: 'flex-end',
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
    marginHorizontal: 12,
    marginBottom: 5,
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
  localPaymentItem: {},
  balanceLoadingText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    alignSelf: 'center'
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    minWidth: 110,
    justifyContent: 'center',
    height: 36,
  },
  uploadButtonRetrying: {
    backgroundColor: '#e8e8e8',
    opacity: 0.8,
  },
  uploadButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginLeft: 4,
  },
  headerContainer: {
    marginHorizontal: -18,
    paddingTop: 5,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  debugResetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  debugResetText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  uploadButtonQueued: {
    backgroundColor: '#f0f0f0',
    opacity: 0.8,
  },
  // Updated container: a row where the history button is on the left and the last updated text is on the right
  lastUpdatedContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 10,
  },
  lastUpdatedText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    flex: 1, // This lets the text expand and push itself to the right
    paddingLeft: 10,
  },
  // Updated historyButton: removed absolute positioning and let it flow naturally
  historyButton: {
    padding: 8,
  },
  loadingItem: {
    opacity: 0.7,
  },
  loadingPlaceholder: {
    backgroundColor: '#E8E8E8',
    borderRadius: 4,
    height: 16,
    overflow: 'hidden',
  },
  shimmerContainer: {
    padding: 16,
    gap: 8,
  },
  balanceLoadingPlaceholder: {
    height: 32,
    width: 150,
    marginBottom: 8,
  },
  subtitleLoadingPlaceholder: {
    height: 16,
    width: 100,
  },
  skeletonAnimation: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F5F5F5',
  },
  balanceLoadingContainer: {
    minHeight: 80,
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  historyItem: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    paddingLeft: 40,
    paddingRight: 40,
    borderRadius: 8,
    marginBottom: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  historyStatus: {
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  historyAmount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  historyTimestamp: {
    fontSize: 12,
    color: '#888',
  },
  historyError: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyHistoryContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHistoryText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%', // Increased max height
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    backfaceVisibility: 'hidden',
    transform: [{ perspective: 5000 }],
    marginHorizontal: 0,
    paddingBottom: 70,
  },
  modalScrollContent: {
    flex: 1,
  },
  modalScrollContentContainer: {
    flexGrow: 1,
  },
  historyList: {
    padding: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: 'white', // Ensure header is opaque
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalBody: {
    padding: 5,
    paddingHorizontal: 0,
    margin: 5,
  },
  scrollView: {
    padding: 20,
  },
  scrollViewContent: {
    padding: 0,
  },
  historyTimeContainer: {
    marginTop: 4,
  },
});

export default OverallPayment;