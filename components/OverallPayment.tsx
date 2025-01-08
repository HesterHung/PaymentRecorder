import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const OverallPayment: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Overall Payment</Text>
      {/* Logic to display payment records goes here */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default OverallPayment;