import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AmountTypeSelectorProps {
  onAmountTypeChange: (type: 'total' | 'specific') => void;
  onAmountChange: (amount: string) => void;
  totalAmount: string;
  specificAmount: string;
  amountType: 'total' | 'specific';
}

const AmountTypeSelector: React.FC<AmountTypeSelectorProps> = ({
  onAmountTypeChange,
  onAmountChange,
  totalAmount,
  specificAmount,
  amountType,
}) => {
  const [slideAnim] = useState(new Animated.Value(0));

  const handleAmountTypeChange = (newType: 'total' | 'specific') => {
    Animated.spring(slideAnim, {
      toValue: newType === 'total' ? 0 : 1,
      useNativeDriver: false,
      tension: 50,
      friction: 7,
    }).start();
    onAmountTypeChange(newType);
  };

  const slideInterpolation = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '50%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.selectorContainer}>
        <Animated.View
          style={[
            styles.slider,
            {
              left: slideInterpolation,
            },
          ]}
        />
        <TouchableOpacity
          style={[
            styles.button,
            amountType === 'total' && styles.activeButton,
          ]}
          onPress={() => handleAmountTypeChange('total')}
        >
          <Ionicons
            name="wallet-outline"
            size={20}
            color={amountType === 'total' ? '#2563EB' : '#6B7280'}
          />
          <Text
            style={[
              styles.buttonText,
              amountType === 'total' && styles.activeButtonText,
            ]}
          >
            Total
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            amountType === 'specific' && styles.activeButton,
          ]}
          onPress={() => handleAmountTypeChange('specific')}
        >
          <Ionicons
            name="git-branch-outline"
            size={20}
            color={amountType === 'specific' ? '#2563EB' : '#6B7280'}
          />
          <Text
            style={[
              styles.buttonText,
              amountType === 'specific' && styles.activeButtonText,
            ]}
          >
            Specific
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.currencySymbol}>$</Text>
        <TextInput
          style={styles.input}
          placeholder={
            amountType === 'total'
              ? "Enter total amount to split"
              : "Enter specific amount"
          }
          value={amountType === 'total' ? totalAmount : specificAmount}
          onChangeText={onAmountChange}
          keyboardType="decimal-pad"
          placeholderTextColor="#9CA3AF"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  selectorContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 4,
    position: 'relative',
    height: 56,
  },
  slider: {
    position: 'absolute',
    width: '50%',
    height: 48,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 1,
    borderRadius: 12,
  },
  activeButton: {
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeButtonText: {
    color: '#2563EB',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 56,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 16,
    color: '#6B7280',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
});

export default AmountTypeSelector;