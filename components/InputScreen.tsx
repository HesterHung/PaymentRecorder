import React, { useState } from 'react';
import { View, TextInput, Button, Image, StyleSheet, TouchableOpacity, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

const InputScreen: React.FC = () => {
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [title, setTitle] = useState('');
  const [whoPaid, setWhoPaid] = useState<'Person1' | 'Person2' | null>(null);
  const [amountType, setAmountType] = useState<'total' | 'specific'>('total');
  const [totalAmount, setTotalAmount] = useState('');
  const [specificAmount, setSpecificAmount] = useState('');
  const [receipt, setReceipt] = useState<string | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (result.assets && result.assets.length > 0) {
      setReceipt(result.assets[0].uri);
    }
  };

  const handleSubmit = () => {
    console.log({
      date,
      title,
      whoPaid,
      amountType,
      amount: amountType === 'total' ? totalAmount : specificAmount,
      receipt,
    });
  };

  return (
    <View style={styles.container}>
      {/* Date Picker */}
      <TouchableOpacity 
        style={styles.dateButton}
        onPress={() => setShowDatePicker(true)}
      >
        <Text>{date.toLocaleDateString()}</Text>
        <Ionicons name="calendar" size={24} color="gray" />
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) setDate(selectedDate);
          }}
        />
      )}

      {/* Title Input */}
      <TextInput
        style={styles.input}
        placeholder="Title (optional)"
        value={title}
        onChangeText={setTitle}
      />

      {/* Who Paid Buttons */}
      <View style={styles.payerContainer}>
        <Text style={styles.label}>Who paid?</Text>
        <View style={styles.payerButtons}>
          <TouchableOpacity
            style={[
              styles.payerButton,
              whoPaid === 'Person1' && styles.selectedPayer
            ]}
            onPress={() => setWhoPaid('Person1')}
          >
            <Ionicons name="person" size={24} color={whoPaid === 'Person1' ? 'white' : 'black'} />
            <Text style={whoPaid === 'Person1' ? styles.selectedPayerText : null}>Person 1</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.payerButton,
              whoPaid === 'Person2' && styles.selectedPayer
            ]}
            onPress={() => setWhoPaid('Person2')}
          >
            <Ionicons name="person" size={24} color={whoPaid === 'Person2' ? 'white' : 'black'} />
            <Text style={whoPaid === 'Person2' ? styles.selectedPayerText : null}>Person 2</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Amount Type Toggle */}
      <View style={styles.amountTypeContainer}>
        <TouchableOpacity
          style={[
            styles.amountTypeButton,
            amountType === 'total' && styles.selectedAmountType
          ]}
          onPress={() => setAmountType('total')}
        >
          <Text style={amountType === 'total' ? styles.selectedAmountTypeText : null}>
            Total Amount
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.amountTypeButton,
            amountType === 'specific' && styles.selectedAmountType
          ]}
          onPress={() => setAmountType('specific')}
        >
          <Text style={amountType === 'specific' ? styles.selectedAmountTypeText : null}>
            Specific Amount
          </Text>
        </TouchableOpacity>
      </View>

      {/* Amount Input */}
      {amountType === 'total' ? (
        <TextInput
          style={styles.input}
          placeholder="Total Amount"
          value={totalAmount}
          onChangeText={setTotalAmount}
          keyboardType="numeric"
        />
      ) : (
        <TextInput
          style={styles.input}
          placeholder="Specific Amount"
          value={specificAmount}
          onChangeText={setSpecificAmount}
          keyboardType="numeric"
        />
      )}

      {/* Receipt Image Picker */}
      <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
        <Ionicons name="camera" size={24} color="white" />
        <Text style={styles.imageButtonText}>Add Receipt</Text>
      </TouchableOpacity>
      {receipt && <Image source={{ uri: receipt }} style={styles.image} />}

      {/* Submit Button */}
      <TouchableOpacity 
        style={styles.submitButton}
        onPress={handleSubmit}
      >
        <Text style={styles.submitButtonText}>Submit</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 15,
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  label: {
    marginBottom: 10,
    fontSize: 16,
    fontWeight: '500',
  },
  payerContainer: {
    marginBottom: 15,
  },
  payerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  payerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    width: '48%',
  },
  selectedPayer: {
    backgroundColor: '#007AFF',
  },
  selectedPayerText: {
    color: 'white',
    marginLeft: 10,
  },
  amountTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  amountTypeButton: {
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    width: '48%',
    alignItems: 'center',
  },
  selectedAmountType: {
    backgroundColor: '#007AFF',
  },
  selectedAmountTypeText: {
    color: 'white',
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  imageButtonText: {
    color: 'white',
    marginLeft: 10,
    fontSize: 16,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 15,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default InputScreen;