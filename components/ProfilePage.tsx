import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import userStorage from '@/services/userStorage';

const ProfilePage = () => {
    const [users, setUsers] = useState<[string, string]>(['User 1', 'User 2']);
    const [editingUser, setEditingUser] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [currentUser, setCurrentUser] = useState('');

    useEffect(() => {
        const loadData = async () => {
            const loadedUsers = await userStorage.getUsers();
            setUsers(loadedUsers);
            setCurrentUser(userStorage.getCurrentUser());
        };

        loadData();

        const unsubscribe = userStorage.subscribe(() => {
            loadData();
        });

        return () => unsubscribe();
    }, []);

    const handleUpdateUser = async (index: number, newName: string) => {
        if (newName.trim()) {
            const newUsers: [string, string] = [...users] as [string, string];
            newUsers[index] = newName.trim();

            try {
                await userStorage.setUsers(newUsers);
                if (currentUser === users[index]) {
                    await userStorage.setCurrentUser(newName.trim());
                }
                setUsers(newUsers);
                setEditingUser(null);
                setEditName('');
            } catch (error) {
                Alert.alert('Error', 'Failed to save user changes');
            }
        }
    };

    const handleSetDefaultUser = async (user: string) => {
        try {
            await userStorage.setCurrentUser(user);
            setCurrentUser(user);
        } catch (error) {
            Alert.alert('Error', 'Failed to set default user');
        }
    };

    return (
        <ScrollView style={{ flex: 1, backgroundColor: 'white' }}>
            <View style={{ padding: 24 }}>
                <View style={{ marginBottom: 32 }}>
                    <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 }}>
                        Profile Settings
                    </Text>
                    <Text style={{ color: '#4b5563' }}>
                        Current User: {currentUser || 'None'}
                    </Text>
                </View>

                <View>
                    <Text style={{ fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 12 }}>
                        Your Users
                    </Text>
                    {users.map((user, index) => (
                        <View
                            key={index}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: 12,
                                backgroundColor: '#f9fafb',
                                borderRadius: 8,
                                marginBottom: 12
                            }}
                        >
                            {editingUser === user ? (
                                <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
                                    <TextInput
                                        value={editName}
                                        onChangeText={setEditName}
                                        placeholder="Enter new name"
                                        style={{
                                            flex: 1,
                                            padding: 8,
                                            backgroundColor: 'white',
                                            borderRadius: 4,
                                            borderWidth: 1,
                                            borderColor: '#d1d5db'
                                        }}
                                    />
                                    <TouchableOpacity
                                        onPress={() => handleUpdateUser(index, editName)}
                                        style={{ padding: 8 }}
                                    >
                                        <Ionicons name="checkmark" size={24} color="#22c55e" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setEditingUser(null);
                                            setEditName('');
                                        }}
                                        style={{ padding: 8 }}
                                    >
                                        <Ionicons name="close" size={24} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                        <Ionicons name="person" size={20} color="#666" />
                                        <Text style={{ color: '#374151' }}>{user}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <TouchableOpacity
                                            onPress={() => handleSetDefaultUser(user)}
                                            style={{ padding: 4 }}
                                        >
                                            <Ionicons
                                                name="checkmark-circle"
                                                size={20}
                                                color={currentUser === user ? '#22c55e' : '#9ca3af'}
                                            />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setEditingUser(user);
                                                setEditName(user);
                                            }}
                                            style={{ padding: 4 }}
                                        >
                                            <Ionicons name="pencil" size={20} color="#3b82f6" />
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </View>
                    ))}
                </View>
            </View>
        </ScrollView>
    );
};

export default ProfilePage;