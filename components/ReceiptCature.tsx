import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Image, Animated } from 'react-native';
import { CameraView, CameraType, useCameraPermissions, CameraCapturedPicture } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import { StorageUtils } from '../utils/storage';

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

    const retakePicture = () => {
        setCapturedImage(null);
    };

    const confirmPicture = async () => {
        if (capturedImage) {
            const currentTimestamp = Date.now();
            try {
                // Create a new payment with the captured image
                await StorageUtils.savePaymentWithImage({
                    title: "", // You can set a default title
                    whoPaid: paidBy,
                    amount: 0, // Default amount that can be edited later
                    amountType: "total", // Default type
                    date: Date.now(),
                    timestamp: currentTimestamp, // Add this line
                }, capturedImage);
                
                router.back();
            } catch (error) {
                console.error('Error saving payment with image:', error);
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