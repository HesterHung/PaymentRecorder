import React, { useState, useEffect } from 'react';
import { 
  View, 
  Image, 
  StyleSheet, 
  FlatList, 
  Dimensions, 
  Text,
  ActivityIndicator 
} from 'react-native';
import { StorageUtils } from '../utils/storage';

const { width } = Dimensions.get('window');
const ITEM_SIZE = width / 3 - 8;

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

  const renderItem = ({ item }: { item: GroupedReceipts }) => (
    <View style={styles.monthSection}>
      <Text style={styles.monthTitle}>{item.title}</Text>
      <View style={styles.imageGrid}>
        {item.data.map((receipt) => (
          <View key={receipt.id} style={styles.imageContainer}>
            <Image source={{ uri: receipt.uri }} style={styles.image} />
            {!receipt.isUploaded && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator color="white" />
              </View>
            )}
          </View>
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
    padding: 4,
  },
  monthSection: {
    marginBottom: 20,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    marginLeft: 4,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  imageContainer: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    margin: 4,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
});