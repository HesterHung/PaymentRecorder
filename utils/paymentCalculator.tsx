// utils/paymentCalculator.tsx

import React from 'react';
import { Text } from 'react-native';
import { Payment, CONSTANTS } from '@/types/payment';

export interface PaymentSummary {
  totalBalance: number;
  monthlyBalances: {
    [monthYear: string]: {
      balance: number;
      payments: Payment[];
    };
  };
}

export interface BalanceSummaryProps {
  balance: number;
}

export const BalanceSummaryText: React.FC<BalanceSummaryProps> = ({ balance }) => {
  if (balance === 0) return <Text>(settled)</Text>;
  
  if (balance > 0) {
    return <Text>{`(${CONSTANTS.PAYERS[1]} owes)`}</Text>;
  } else {
    return <Text>{`(${CONSTANTS.PAYERS[0]} owes)`}</Text>;
  }
};

export function calculatePaymentBalance(payments: Payment[]): PaymentSummary {
  const monthlyBalances: {
    [key: string]: {
      balance: number;
      payments: Payment[];
    };
  } = {};

  let totalBalance = 0;

  payments.forEach(payment => {
    const date = new Date(payment.date);
    const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });

    if (!monthlyBalances[monthYear]) {
      monthlyBalances[monthYear] = {
        balance: 0,
        payments: []
      };
    }

    let effectiveAmount: number;

    if (payment.amountType === 'total') {
      effectiveAmount = payment.amount / 2;
    } else {
      effectiveAmount = payment.amount;
    }

    const balanceAdjustment = payment.whoPaid === CONSTANTS.PAYERS[0]
      ? effectiveAmount 
      : -effectiveAmount;

    monthlyBalances[monthYear].balance += balanceAdjustment;
    monthlyBalances[monthYear].payments.push(payment);
    totalBalance += balanceAdjustment;
  });

  return {
    totalBalance,
    monthlyBalances
  };
}

export function formatBalance(amount: number): string {
  return `$${Math.abs(amount).toFixed(2)}`;
}

interface BalanceDisplayProps {
  balance: number;
  isVisible?: boolean;
}

export const BalanceDisplay: React.FC<BalanceDisplayProps> = ({ 
  balance, 
  isVisible = true 
}) => {
  if (!isVisible) {
    return (
      <>
        <Text>•••••</Text>
        <Text>*****</Text>
      </>
    );
  }

  return (
    <>
      <Text>{formatBalance(balance)}</Text>
      <BalanceSummaryText balance={balance} />
    </>
  );
};