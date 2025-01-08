import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { UploadService } from '../../services/uploadService';

// In your root component


const { width } = Dimensions.get('window');

export default function Page() {
    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
          if (nextAppState === 'active') {
            UploadService.uploadPendingReceipts();
          }
        });
      
        return () => {
          subscription.remove();
        };
      }, []);

    return (
        
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.push('/standard-input')}
        >
          <Ionicons name="create-outline" size={48} color="white" />
          <Text style={styles.buttonText}>Standard Input</Text>
        </TouchableOpacity>
  
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.push('/receipt-capture')}
        >
          <Ionicons name="camera-outline" size={48} color="white" />
          <Text style={styles.buttonText}>Add Receipt</Text>
        </TouchableOpacity>
      </View>
    );
  }
  

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    gap: 20,
  },
  button: {
    width: width * 0.8,
    height: 160,
    backgroundColor: '#007AFF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '600',
    marginTop: 10,
  },
});