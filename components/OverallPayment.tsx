// app/(tabs)/overall-payment.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity } from 'react-native';
import { StorageUtils } from '../utils/storage';
import { Ionicons } from '@expo/vector-icons';
import { Payment, GroupedPayments, CONSTANTS } from '../types/payment';

const { width } = Dimensions.get('window');

const OverallPayment: React.FC = () => {
  const [groupedPayments, setGroupedPayments] = useState<GroupedPayments[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    try {
      const receipts = await StorageUtils.getStoredPayments();
      
      // Group receipts by month
      const grouped = receipts.reduce((acc: { [key: string]: Payment[] }, payment) => {
        const date = new Date(payment.timestamp);
        const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        
        if (!acc[monthYear]) {
          acc[monthYear] = [];
        }
        acc[monthYear].push(payment);
        return acc;
      }, {});

      // Calculate totals and convert to array format
      const groupedArray = Object.entries(grouped).map(([title, data]) => {
        const totalAmount = data.reduce((sum, receipt) => {
          // You might need to adjust this calculation based on your business logic
          // This assumes you store the amount information in the receipt title or elsewhere
          const amount = 0; // Replace with actual amount calculation
          return sum + amount;
        }, 0);

        return {
          title,
          data: data.sort((a, b) => b.timestamp - a.timestamp),
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
    const date = new Date(item.timestamp).toLocaleDateString();

    return (
      <View style={styles.paymentItem}>
        <View style={styles.paymentHeader}>
          <Text style={styles.paymentDate}>{date}</Text>
          <View style={[
            styles.amountContainer,
            { backgroundColor: item.whoPaid === CONSTANTS.PAYERS[0] ? '#007AFF' : '#34C759' }
          ]}>
            <Text style={styles.amountText}>
              ${/* Replace with actual amount calculation */}
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
            <TouchableOpacity onPress={() => {/* Handle receipt image view */}}>
              <Ionicons name="receipt-outline" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>
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
        <Text style={styles.balanceTitle}>Overall Balance</Text>
        <Text style={styles.balanceAmount}>${totalBalance.toFixed(2)}</Text>
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
    marginBottom: 8,
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
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentDate: {
    fontSize: 14,
    color: '#666',
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
});

export default OverallPayment;