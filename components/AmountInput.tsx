import React, { useCallback, useRef, useState, memo } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

type CombinedInputProps = AmountInputProps & Omit<TextInputProps, keyof AmountInputProps>;

const AmountInput: React.FC<CombinedInputProps> = ({ 
  value, 
  onChange, 
  placeholder,
  ...textInputProps 
}) => {
  // Use local state for immediate feedback
  const [localValue, setLocalValue] = useState<string>(value);
  const lastValidValue = useRef<string>(value);

  // Memoized handler for input changes
  const handleChange = useCallback((text: string): void => {
    // Remove any non-numeric characters except decimal point
    const cleaned: string = text.replace(/[^\d.]/g, '');
    
    // Handle decimal points
    const parts: string[] = cleaned.split('.');
    if (parts.length > 2) {
      // If multiple decimal points, use the last valid value
      setLocalValue(lastValidValue.current);
      return;
    }

    // Prevent more than 2 decimal places
    if (parts[1]?.length > 2) {
      setLocalValue(lastValidValue.current);
      return;
    }

    // Update local state immediately for responsive UI
    setLocalValue(cleaned);
    lastValidValue.current = cleaned;
    
    // Update parent with validated value
    onChange(cleaned);
  }, [onChange]);

  // Reset local value when parent value changes
  React.useEffect(() => {
    setLocalValue(value);
    lastValidValue.current = value;
  }, [value]);

  return (
    <View style={styles.inputWrapper}>
      <Text style={styles.currencySymbol}>$</Text>
      <TextInput
        {...textInputProps}
        style={[styles.input, textInputProps.style]}
        value={localValue}
        onChangeText={handleChange}
        placeholder={placeholder}
        keyboardType="decimal-pad"
        maxLength={10}
        placeholderTextColor="#9CA3AF"
        // Additional optimizations
        enablesReturnKeyAutomatically={true}
        returnKeyType="done"
        autoCorrect={false}
        spellCheck={false}
        // Improve input performance
        removeClippedSubviews={true}
        maxFontSizeMultiplier={1}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  currencySymbol: {
    paddingLeft: 16,
    fontSize: 18,
    color: '#374151',
    fontWeight: '500',
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#374151',
  },
});

// Use memo to prevent unnecessary re-renders
export default memo(AmountInput);