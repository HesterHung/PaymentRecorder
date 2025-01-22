import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { AppState, Dimensions } from 'react-native';
import { UploadService } from '../../services/uploadService';
import { useCameraPermissions } from 'expo-camera';

const { width } = Dimensions.get('window');

export default function Page() {
    const [permission, requestPermission] = useCameraPermissions();

    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active') {
                UploadService.uploadPendingPayments();
            }
        });

        return () => {
            subscription.remove();
        };
    }, []);

    const handleAddReceipt = async () => {
        if (!permission?.granted) {
            const permissionResult = await requestPermission();
            if (permissionResult.granted) {
                router.push('/receipt-capture');
            }
        } else {
            router.push('/receipt-capture');
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
            {/* Profile Button */}
            <View style={{ 
                position: 'absolute', 
                top: 48,
                right: 16,
                zIndex: 10
            }}>
                <TouchableOpacity
                    style={{
                        padding: 8,
                        backgroundColor: '#007AFF',
                        borderRadius: 12,
                        shadowColor: '#000',
                        shadowOffset: {
                            width: 0,
                            height: 2,
                        },
                        shadowOpacity: 0.25,
                        shadowRadius: 3.84,
                        elevation: 5,
                    }}
                    onPress={() => router.push('/profile-page')}
                >
                    <Ionicons name="person-circle-outline" size={32} color="white" />
                </TouchableOpacity>
            </View>

            {/* Main Content */}
            <View style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                gap: 20,
            }}>
                <TouchableOpacity
                    style={{
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
                    }}
                    onPress={() => router.push('/standard-input')}
                >
                    <Ionicons name="create-outline" size={48} color="white" />
                    <Text style={{
                        color: 'white',
                        fontSize: 24,
                        fontWeight: '600',
                        marginTop: 10,
                    }}>Standard Input</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={{
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
                    }}
                    onPress={handleAddReceipt}
                >
                    <Ionicons name="camera-outline" size={48} color="white" />
                    <Text style={{
                        color: 'white',
                        fontSize: 24,
                        fontWeight: '600',
                        marginTop: 10,
                    }}>Add Receipt</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}