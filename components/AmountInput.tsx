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
    const [localValue, setLocalValue] = useState<string>(value);
    const lastValidValue = useRef<string>(value);
  
    // Add useEffect to handle external value changes (including resets)
    React.useEffect(() => {
      setLocalValue(value);
      lastValidValue.current = value;
    }, [value]);
  
    const handleChange = useCallback((text: string): void => {
      const cleaned: string = text.replace(/[^\d.]/g, '');
      const parts: string[] = cleaned.split('.');
      
      if (parts.length > 2) {
        setLocalValue(lastValidValue.current);
        return;
      }
  
      if (parts[1]?.length > 2) {
        setLocalValue(lastValidValue.current);
        return;
      }
  
      setLocalValue(cleaned);
      lastValidValue.current = cleaned;
      onChange(cleaned);
    }, [onChange]);
  
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
          enablesReturnKeyAutomatically={true}
          returnKeyType="done"
          autoCorrect={false}
          spellCheck={false}
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