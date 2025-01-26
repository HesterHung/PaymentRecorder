//components\OverallPayment.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity, Platform, UIManager, LayoutAnimation } from 'react-native';
import { StorageUtils } from '../utils/storage';
import { Ionicons } from '@expo/vector-icons';
import { Payment, GroupedPayments, CONSTANTS } from '../types/payment';
import { Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import userStorage from '@/services/userStorage';
import { BalanceSummaryText, calculatePaymentBalance, formatBalance } from '@/utils/paymentCalculator';

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
      loadReceipts();
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
    router.push({
      pathname: "./components/InputScreen",
      params: { existingPayment: JSON.stringify(payment) }
    });
  };

  const handleLongPress = (payment: Payment) => {
    Alert.alert(
      "Delete Payment",
      "Are you sure you want to delete this payment?",
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
              await StorageUtils.deletePayment(payment.id);
              // Reload the payments list
              loadReceipts();
            } catch (error) {
              console.error('Error deleting payment:', error);
              Alert.alert(
                "Error",
                "Failed to delete payment. Please try again."
              );
            }
          }
        }
      ]
    );
  };

  const loadReceipts = async () => {
    try {
      const receipts = await StorageUtils.getStoredPayments();
      const summary = calculatePaymentBalance(receipts);

      const groupedArray = Object.entries(summary.monthlyBalances).map(([title, data]) => ({
        title,
        data: data.payments.sort((a, b) => b.date - a.date),
        totalAmount: data.balance
      }));

      setTotalBalance(summary.totalBalance);
      setGroupedPayments(groupedArray);
    } catch (error) {
      console.error('Error loading receipts:', error);
    }
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
              await StorageUtils.clearAllPayments();
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


  const renderReceiptItem = ({ item }: { item: Payment }) => {
    const date = new Date(item.date);
    const formattedDate = date.toLocaleDateString();
    const formattedTime = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });

    const displayAmount = item.amountType === 'total'
      ? item.amount / 2
      : item.amount;

    return (
      <TouchableOpacity
        style={styles.paymentItem}
        onPress={() => handlePaymentPress(item)}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={500}
      >
        <View style={styles.paymentHeader}>
          <View style={styles.dateTimeContainer}>
            <Text style={styles.paymentDate}>{formattedDate}</Text>
            <Text style={styles.paymentTime}>{formattedTime}</Text>
          </View>
          <View style={[
            styles.amountContainer,
            { backgroundColor: item.whoPaid === users[0] ? '#007AFF' : '#34C759' }
          ]}>
            <Text style={styles.amountText}>
              ${displayAmount.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.paymentDetails}>
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentTitle}>{item.title || 'Untitled'}</Text>
            <View style={styles.payerInfo}>
              <Ionicons
                name="person"
                size={16}
                color={item.whoPaid === users[0] ? '#007AFF' : '#34C759'}
              />
              <Text style={[
                styles.payerName,
                { color: item.whoPaid === users[0] ? '#007AFF' : '#34C759' }
              ]}>
                {item.whoPaid}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };


  const renderMonthSection = ({ item }: { item: GroupedPayments }) => {
    const isExpanded = expandedMonths[item.title] ?? true; // Default to expanded

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
              Total: {formatBalance(item.totalAmount)}
            </Text>
            <Text style={styles.monthOwes}>
              <BalanceSummaryText balance={item.totalAmount} />
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
      <View style={styles.balanceCard}>
        <View style={styles.balanceHeader}>
          <Text style={styles.balanceTitle}>Overall Balance</Text>
          <TouchableOpacity onPress={toggleBalanceVisibility}>
            <Ionicons
              name={isBalanceVisible ? "eye-outline" : "eye-off-outline"}
              size={24}
              color="#666"
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.balanceAmount}>
          {isBalanceVisible ? formatBalance(totalBalance) : '•••••'}
        </Text>
        <Text style={styles.balanceSubtitle}>
          {isBalanceVisible ? <BalanceSummaryText balance={totalBalance} /> : '*****'}
        </Text>
      </View>

      <FlatList
        data={groupedPayments}
        renderItem={renderMonthSection}
        keyExtractor={item => item.title}
        contentContainerStyle={styles.listContainer}
      />

      <TouchableOpacity
        style={styles.resetButton}
        onPress={handleResetAll}
      >
        <Text style={styles.resetButtonText}>Reset All Payments (DEBUG USE)</Text>

      </TouchableOpacity>
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
    color: '#007AFF',
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
});

export default OverallPayment;