import React, { useState, useEffect } from 'react';
import {
    View,
    Image,
    StyleSheet,
    FlatList,
    Dimensions,
    Text,
    ActivityIndicator,
    TouchableOpacity
} from 'react-native';
import { StorageUtils } from '../utils/storage';
import { router } from 'expo-router';
import { Payment } from '../types/payment'; // Import the Payment interface
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { uploadToServer } from '@/services/uploadService';

const { width } = Dimensions.get('window');
const SPACING = 6;
const ITEMS_PER_ROW = 3;
const ITEM_SIZE = (width - (SPACING * (ITEMS_PER_ROW + 1))) / ITEMS_PER_ROW;


interface GroupedPayments {
    title: string;
    data: Payment[];
}

const ReceiptThumbnail: React.FC<{ payment: Payment; onPress: () => void; onRetryUpload: () => void }> = ({
    payment,
    onPress,
    onRetryUpload
}) => {
    return (
        <TouchableOpacity
            style={styles.imageContainer}
            onPress={onPress}
        >
            {payment.uri && (
                <Image
                    source={{ uri: payment.uri }}
                    style={styles.image}
                    resizeMode="cover"
                />
            )}
            <View style={styles.statusIconContainer}>
                {payment.uploadStatus === 'uploading' && (
                    <ActivityIndicator size="small" color="#007AFF" />
                )}
                {payment.uploadStatus === 'uploaded' && (
                    <Ionicons name="cloud-done" size={20} color="#34C759" />
                )}
                {payment.uploadStatus === 'error' && (
                    <TouchableOpacity
                        onPress={(e) => {
                            e.stopPropagation();
                            onRetryUpload();
                        }}
                        style={styles.retryButton}
                    >
                        <Ionicons name="cloud-upload" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                )}
            </View>
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
                    <TouchableOpacity
                        key={payment.id}
                        style={[
                            styles.imageContainer,
                            (index + 1) % 3 === 0 ? { marginRight: 0 } : null
                        ]}
                        onPress={() => handleImagePress(payment)}
                        disabled={!payment.isUploaded}
                    >
                        {payment.uri && (
                            <Image
                                source={{ uri: payment.uri }}
                                style={styles.image}
                                resizeMode="cover"
                            />
                        )}
                        {!payment.isUploaded && (
                            <View style={styles.uploadingOverlay}>
                                <ActivityIndicator color="white" />
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const handleRetryUpload = async (payment: Payment) => {
        try {
            await StorageUtils.updatePayment(payment.id, {
                uploadStatus: 'uploading'
            });

            const serverUrl = await uploadToServer(payment.uri!);

            await StorageUtils.updatePayment(payment.id, {
                serverUri: serverUrl,
                isUploaded: true,
                uploadStatus: 'uploaded'
            });

            loadPayments(); // Refresh the list
        } catch (error) {
            console.error('Retry upload failed:', error);
            await StorageUtils.updatePayment(payment.id, {
                uploadStatus: 'error'
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
        flex: 1,
    },
    monthSection: {
        marginBottom: 20,
        paddingHorizontal: SPACING,
    },
    monthTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    imageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
    },
    imageContainer: {
        width: ITEM_SIZE,
        height: ITEM_SIZE,
        marginRight: SPACING,
        marginBottom: SPACING,
    },
    image: {
        width: '100%',
        height: '100%',
        borderRadius: 4,
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

