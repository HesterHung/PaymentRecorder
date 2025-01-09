import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Image, Animated } from 'react-native';
import { CameraView, CameraType, useCameraPermissions, CameraCapturedPicture } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import { StorageUtils } from '../utils/storage';
import * as FileSystem from 'expo-file-system';
import { EventRegister } from 'react-native-event-listeners';
import { uploadToServer } from '@/services/uploadService';

export default function ReceiptCapture() {
    const [permission, requestPermission] = useCameraPermissions();
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [facing, setFacing] = useState<CameraType>('back');
    const cameraRef = useRef<CameraView>(null);  // Change the ref type to CameraView
    const [torch, setTorch] = useState(false);
    const [paidBy, setPaidBy] = useState('Person A'); // Default value can be fetched from settings later




    const togglePayer = () => {
        setPaidBy(current => current === 'Person A' ? 'Person B' : 'Person A');
    };

    const toggleTorch = () => {
        setTorch(torch === false ? true : false);
    };

    const toggleCameraFacing = () => {
        setFacing(current => (current === 'back' ? 'front' : 'back'));
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 1,
        });

        if (!result.canceled) {
            setCapturedImage(result.assets[0].uri);
        }
    };

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const result = await cameraRef.current.takePictureAsync({
                    quality: 0.8,
                    shutterSound: false
                });

                if (result) {
                    setCapturedImage(result.uri);
                }
            } catch (error) {
                console.error('Failed to take picture:', error);
            }
        }
    };

    const saveImageLocally = async (uri: string) => {
        try {
            // Create a permanent directory for receipts if it doesn't exist
            const receiptsDir = `${FileSystem.documentDirectory}receipts`;
            const dirInfo = await FileSystem.getInfoAsync(receiptsDir);
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(receiptsDir, { intermediates: true });
            }

            // Generate unique filename
            const filename = `receipt_${Date.now()}.jpg`;
            const newUri = `${receiptsDir}/${filename}`;

            // Copy from temporary cache to permanent storage
            await FileSystem.copyAsync({
                from: uri,
                to: newUri
            });

            console.log('Image saved locally at:', newUri);
            return newUri;
        } catch (error) {
            console.error('Error saving image locally:', error);
            throw error;
        }
    };

    const retakePicture = () => {
        setCapturedImage(null);
    };

    const confirmPicture = async () => {
        if (capturedImage) {
            try {
                // 1. Save to permanent local storage
                const localUri = await saveImageLocally(capturedImage);
    
                // 2. Create payment record with local URI and initial upload status
                const newPayment = await StorageUtils.savePaymentWithImage({
                    title: "",
                    whoPaid: paidBy,
                    amount: 0,
                    amountType: "total",
                    date: Date.now(),
                    isUploaded: false,
                    uploadStatus: 'uploading', // Add this new field
                    uri: localUri,
                    serverUri: null,
                    imageUploadStatus: 'uploading'
                }, localUri);
    
                // 3. Navigate back immediately
                router.back();
    
                // 4. Start background upload
                uploadToServer(localUri).then(async (serverUrl) => {
                    await StorageUtils.updatePayment(newPayment.id, {
                        serverUri: serverUrl,
                        isUploaded: true,
                        imageUploadStatus: 'uploaded'
                    });
                    EventRegister.emit('UPLOAD_COMPLETE', newPayment.id);
                }).catch(async error => {
                    console.error('Background upload failed:', error);
                    await StorageUtils.updatePayment(newPayment.id, {
                        imageUploadStatus: 'error'
                    });
                    EventRegister.emit('UPLOAD_FAILED', newPayment.id);
                });
    
            } catch (error) {
                console.error('Error in confirm picture:', error);
            }
        }
    };

    if (capturedImage) {
        return (
            <View style={styles.container}>
                <Image
                    source={{ uri: capturedImage }}
                    style={styles.preview}
                />
                <View style={styles.previewControls}>
                    <TouchableOpacity
                        style={[styles.previewButton, styles.retakeButton]}
                        onPress={retakePicture}
                    >
                        <Ionicons name="camera-reverse" size={24} color="white" />
                        <Text style={styles.buttonText}>Retake</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.previewButton,
                            styles.payerButton,
                            { backgroundColor: paidBy === 'Person A' ? '#007AFF' : '#FF9500' }
                        ]}
                        onPress={togglePayer}
                    >
                        <Ionicons
                            name={paidBy === 'Person A' ? "person" : "person-outline"}
                            size={24}
                            color="white"
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.previewButton, styles.confirmButton]}
                        onPress={confirmPicture}
                    >
                        <Ionicons name="checkmark" size={24} color="white" />
                        <Text style={styles.buttonText}>Confirm</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing={facing}
                animateShutter={false}
                enableTorch={torch}
            >
                <TouchableOpacity
                    style={styles.torchButton}
                    onPress={toggleTorch}
                >
                    <Ionicons
                        name={torch ? "flash" : "flash-off"}
                        size={24}
                        color="white"
                    />
                </TouchableOpacity>
                <TouchableOpacity style={styles.FlipButton} onPress={toggleCameraFacing}>
                    <Ionicons name="camera-reverse-outline" size={30} color="white" />
                </TouchableOpacity>
                <View style={styles.bottomControls}>
                    <View style={styles.bottomLeftPlaceholder} />
                    <TouchableOpacity
                        style={styles.captureButton}
                        onPress={takePicture}
                    >
                        <View style={styles.captureButtonInner} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton} onPress={pickImage}>
                        <Ionicons name="images-outline" size={24} color="white" />
                        <Text style={styles.iconButtonText}>Gallery</Text>
                    </TouchableOpacity>
                </View>
            </CameraView>
        </View>
    );

}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    cameraContainer: {
        flex: 1,
    },
    camera: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    FlipButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        borderRadius: 30,
        paddingVertical: 8,
        paddingHorizontal: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    iconButton: {
        padding: 10,
        borderRadius: 30,
        backgroundColor: 'rgba(0,0,0,0.3)',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: 70, // Fixed width
    },
    iconButtonText: {
        color: 'white',
        fontSize: 12,
        marginTop: 4, // Add some space between icon and text
        textAlign: 'center',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingBottom: 30,
        paddingHorizontal: 20,
    },
    button: {
        backgroundColor: '#007AFF',
        borderRadius: 30,
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    bottomControls: {
        flexDirection: 'row',
        justifyContent: 'space-between', // This spreads out the items
        alignItems: 'center',
        paddingBottom: 30,
        paddingHorizontal: 40,
        width: '100%',
    },
    bottomLeftPlaceholder: {
        width: 70, // Same width as iconButton
    },
    captureButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureButtonInner: {
        width: 62,
        height: 62,
        borderRadius: 31,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#000',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    text: {
        color: 'white',
        fontSize: 16,
        textAlign: 'center',
    },
    preview: {
        flex: 1,
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    previewControls: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    previewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 23,
        gap: 8,
    },
    retakeButton: {
        backgroundColor: '#FF3B30',
    },
    confirmButton: {
        backgroundColor: '#34C759',
    },
    torchButton: {
        position: 'absolute',
        top: 16,
        left: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    payerButton: {
        backgroundColor: '#007AFF',
        minWidth: 80, // Ensure enough space for the text
    },
});