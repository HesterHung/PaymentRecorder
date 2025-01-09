import React, { useState, useEffect } from 'react';
import {
    View,
    Image,
    StyleSheet,
    FlatList,
    Dimensions,
    Text,
    ActivityIndicator,
    TouchableOpacity,
    ViewStyle
} from 'react-native';
import { StorageUtils } from '../utils/storage';
import { router } from 'expo-router';
import { Payment } from '../types/payment'; // Import the Payment interface
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { uploadToServer } from '@/services/uploadService';

const { width } = Dimensions.get('window');
const SPACING = 8;
const ITEMS_PER_ROW = 3;
const ITEM_SIZE = (width - (SPACING * 4)) / 3;

// Create a function outside of StyleSheet to generate container style
const getImageContainerStyle = (index: number): ViewStyle => ({
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    marginRight: (index + 1) % 3 === 0 ? 0 : SPACING,
    marginBottom: SPACING,
});

interface GroupedPayments {
    title: string;
    data: Payment[];
}

const ReceiptThumbnail: React.FC<{
    payment: Payment;
    onPress: () => void;
    onRetryUpload: () => void;
    index: number;
}> = ({ payment, onPress, onRetryUpload, index }) => {
    return (
        <TouchableOpacity
            style={getImageContainerStyle(index)}
            onPress={onPress}
        >
            {payment.uri && (
                <>
                    <Image
                        source={{ uri: payment.uri }}
                        style={styles.image}
                        resizeMode="cover"
                    />
                    <View style={styles.statusContainer}>
                        {payment.imageUploadStatus === 'uploading' || payment.imageUploadStatus === 'pending' && (
                            <View style={[styles.statusBadge, styles.uploadingBadge]}>
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            </View>
                        )}
                        {payment.imageUploadStatus === 'uploaded' && (
                            <View style={[styles.statusBadge, styles.uploadedBadge]}>
                                <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                            </View>
                        )}
                        {payment.imageUploadStatus === 'error' && (
                            <TouchableOpacity
                                style={[styles.statusBadge, styles.errorBadge]}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    onRetryUpload();
                                }}
                            >
                                <Ionicons name="refresh-circle" size={16} color="#FFFFFF" />
                            </TouchableOpacity>
                        )}
                    </View>
                </>
            )}
        </TouchableOpacity>
    );
};


export default function ReceiptBox() {
    const [groupedPayments, setGroupedPayments] = useState<GroupedPayments[]>([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useFocusEffect(
        React.useCallback(() => {
            loadPayments();
        }, [refreshTrigger])
    );

    const loadPayments = async () => {
        const payments = await StorageUtils.getStoredPayments();

        // Only process payments that have images
        const paymentsWithImages = payments.filter(payment => payment.uri);

        // Group payments by month
        const grouped = paymentsWithImages.reduce((acc: { [key: string]: Payment[] }, payment) => {
            const date = new Date(payment.date);
            const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });

            if (!acc[monthYear]) {
                acc[monthYear] = [];
            }
            acc[monthYear].push(payment);
            return acc;
        }, {});

        // Convert to array format and sort
        const groupedArray = Object.entries(grouped).map(([title, data]) => ({
            title,
            data: data.sort((a, b) => b.date - a.date)
        }));

        setGroupedPayments(groupedArray);
    };

    const handleImagePress = (payment: Payment) => {
        router.push({
            pathname: "/(tabs)/standard-input",
            params: {
                existingPayment: JSON.stringify({
                    ...payment,
                    source: 'receipt-box',
                    uri: payment.uri
                })
            }
        });
    };

    const renderItem = ({ item }: { item: GroupedPayments }) => (
        <View style={styles.monthSection}>
            <Text style={styles.monthTitle}>{item.title}</Text>
            <View style={styles.imageGrid}>
                {item.data.map((payment, index) => (
                    <ReceiptThumbnail
                        key={payment.id}
                        payment={payment}
                        onPress={() => handleImagePress(payment)}
                        onRetryUpload={() => handleRetryUpload(payment)}
                        index={index}
                    />
                ))}
            </View>
        </View>
    );

    const handleRetryUpload = async (payment: Payment) => {
        try {
            await StorageUtils.updatePayment(payment.id, {
                imageUploadStatus: 'uploading'
            });
    
            const serverUrl = await uploadToServer(payment.uri!);
    
            await StorageUtils.updatePayment(payment.id, {
                serverUri: serverUrl,
                imageUploadStatus: 'uploaded'
            });
    
            loadPayments(); // Refresh the list
        } catch (error) {
            console.error('Retry upload failed:', error);
            await StorageUtils.updatePayment(payment.id, {
                imageUploadStatus: 'error'
            });
        }
    };

    return (
        <FlatList
            data={groupedPayments}
            renderItem={renderItem}
            keyExtractor={item => item.title}
            contentContainerStyle={styles.container}
        />
    );
}

const styles = StyleSheet.create({
    container: {
        paddingTop: SPACING,
    },
    monthSection: {
        marginBottom: 20,
    },
    monthTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        paddingHorizontal: SPACING,
    },
    imageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: SPACING,
    },
    image: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
    },
    statusContainer: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        zIndex: 2,
    },
    statusBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadingBadge: {
        backgroundColor: '#007AFF80',
    },
    uploadedBadge: {
        backgroundColor: '#34C75980',
    },
    errorBadge: {
        backgroundColor: '#FF3B3080',
    },
    uploadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 4,
    },
    statusIconContainer: {
        position: 'absolute',
        bottom: 4,
        left: 4,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    retryButton: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

