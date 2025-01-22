//components\OverallPayment.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity } from 'react-native';
import { StorageUtils } from '../utils/storage';
import { Ionicons } from '@expo/vector-icons';
import { Payment, GroupedPayments, CONSTANTS } from '../types/payment';
import { Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

const { width } = Dimensions.get('window');
const peopleNumber = 2;

const OverallPayment: React.FC = () => {
  const [isBalanceVisible, setIsBalanceVisible] = useState(false);
  const [groupedPayments, setGroupedPayments] = useState<GroupedPayments[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      loadReceipts();
    }, [])
  );

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

      // Group receipts by month
      const grouped = receipts.reduce((acc: { [key: string]: Payment[] }, payment) => {
        const date = new Date(payment.date);
        const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });

        if (!acc[monthYear]) {
          acc[monthYear] = [];
        }
        acc[monthYear].push(payment);
        return acc;
      }, {});

      // Calculate totals and convert to array format
      const groupedArray = Object.entries(grouped).map(([title, data]) => {
        const totalAmount = data.reduce((sum, payment) => {
          // For total amount type, divide by 2 since it's split between two people
          const actualAmount = payment.amountType === 'total'
            ? payment.amount / peopleNumber
            : payment.amount;
          return sum + actualAmount;
        }, 0);

        return {
          title,
          data: data.sort((a, b) => b.date - a.date),
          totalAmount
        };
      });

      // Calculate overall balance
      const total = groupedArray.reduce((sum, group) => sum + group.totalAmount, 0);
      setTotalBalance(total);

      setGroupedPayments(groupedArray);
    } catch (error) {
      console.error('Error loading receipts:', error);
    }
  };

  const renderReceiptItem = ({ item }: { item: Payment }) => {
    const date = new Date(item.date);
    const formattedDate = date.toLocaleDateString();
    const formattedTime = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });

    const displayAmount = item.amountType === 'total'
      ? item.amount / peopleNumber
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
            { backgroundColor: item.whoPaid === CONSTANTS.PAYERS[0] ? '#007AFF' : '#34C759' }
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
                color={item.whoPaid === CONSTANTS.PAYERS[0] ? '#007AFF' : '#34C759'}
              />
              <Text style={[
                styles.payerName,
                { color: item.whoPaid === CONSTANTS.PAYERS[0] ? '#007AFF' : '#34C759' }
              ]}>
                {item.whoPaid || 'Unknown'}
              </Text>
            </View>
          </View>
          {item.uri && (
            <View style={styles.receiptIcon}>
              <Ionicons name="receipt-outline" size={20} color="#666" />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderMonthSection = ({ item }: { item: GroupedPayments }) => (
    <View style={styles.monthSection}>
      <View style={styles.monthHeader}>
        <Text style={styles.monthTitle}>{item.title}</Text>
        <Text style={styles.monthTotal}>
          Total: ${item.totalAmount.toFixed(2)}
        </Text>
      </View>
      <FlatList
        data={item.data}
        renderItem={renderReceiptItem}
        keyExtractor={receipt => receipt.id}
        scrollEnabled={false}
      />
    </View>
  );

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
          {isBalanceVisible ? `$${totalBalance.toFixed(2)}` : '•••••'}
        </Text>
        <Text style={styles.balanceSubtitle}>
          Amount to be settled between {CONSTANTS.PAYERS[0]} and {CONSTANTS.PAYERS[1]}
        </Text>
      </View>

      <FlatList
        data={groupedPayments}
        renderItem={renderMonthSection}
        keyExtractor={item => item.title}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    marginBottom: 24,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  monthTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
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
});

export default OverallPayment;