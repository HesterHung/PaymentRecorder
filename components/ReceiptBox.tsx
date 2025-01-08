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

const { width } = Dimensions.get('window');
// Calculate item size to fit exactly 3 items per row with minimal spacing
const SPACING = 6; // Space between images
const ITEMS_PER_ROW = 3;
const ITEM_SIZE = (width - (SPACING * (ITEMS_PER_ROW + 1))) / ITEMS_PER_ROW;

type NavigationProp = {
    navigate: (screen: string, params?: any) => void;
};

interface GroupedReceipts {
    title: string;
    data: Array<{
        id: string;
        uri: string;
        timestamp: number;
        isUploaded: boolean;
    }>;
}

export default function ReceiptBox() {
    const [groupedReceipts, setGroupedReceipts] = useState<GroupedReceipts[]>([]);

    useEffect(() => {
        loadReceipts();
    }, []);

    const loadReceipts = async () => {
        const receipts = await StorageUtils.getStoredReceipts();

        // Group receipts by month
        const grouped = receipts.reduce((acc: { [key: string]: any[] }, receipt) => {
            const date = new Date(receipt.timestamp);
            const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });

            if (!acc[monthYear]) {
                acc[monthYear] = [];
            }
            acc[monthYear].push(receipt);
            return acc;
        }, {});

        // Convert to array format
        const groupedArray = Object.entries(grouped).map(([title, data]) => ({
            title,
            data: data.sort((a, b) => b.timestamp - a.timestamp)
        }));

        setGroupedReceipts(groupedArray);
    };

    // In ReceiptBox component
    const handleImagePress = (receipt: {
        id: string;
        uri: string;
        timestamp: number;
        isUploaded: boolean;
    }) => {
        router.push({
            pathname: "/(tabs)/standard-input",
            params: {
                existingReceipt: JSON.stringify({
                    ...receipt,
                    source: 'receipt-box'  // Add source parameter
                })
            }
        });
    };


    const renderItem = ({ item }: { item: GroupedReceipts }) => (
        <View style={styles.monthSection}>
            <Text style={styles.monthTitle}>{item.title}</Text>
            <View style={styles.imageGrid}>
                {item.data.map((receipt, index) => (
                    <TouchableOpacity
                        key={receipt.id}
                        style={[
                            styles.imageContainer,
                            (index + 1) % 3 === 0 ? { marginRight: 0 } : null
                        ]}
                        onPress={() => handleImagePress(receipt)}
                        disabled={!receipt.isUploaded} // Optional: prevent clicking while uploading
                    >
                        <Image
                            source={{ uri: receipt.uri }}
                            style={styles.image}
                            resizeMode="cover"
                        />
                        {!receipt.isUploaded && (
                            <View style={styles.uploadingOverlay}>
                                <ActivityIndicator color="white" />
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    return (
        <FlatList
            data={groupedReceipts}
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
});