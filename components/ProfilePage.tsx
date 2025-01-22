import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function ProfilePage() {
    const [users, setUsers] = useState<string[]>([]);
    const [newUserName, setNewUserName] = useState('');
    const [defaultUser, setDefaultUser] = useState('');
    const [currentUser, setCurrentUser] = useState('');

    // Load saved users and default user from AsyncStorage on component mount
    useEffect(() => {
        const loadData = async () => {
            try {
                const savedUsers = await AsyncStorage.getItem('users');
                const savedDefaultUser = await AsyncStorage.getItem('defaultUser');
                if (savedUsers) setUsers(JSON.parse(savedUsers));
                if (savedDefaultUser) setDefaultUser(savedDefaultUser);
                setCurrentUser(savedDefaultUser || '');
            } catch (error) {
                console.error('Error loading data:', error);
            }
        };
        loadData();
    }, []);

    // Save users and default user to AsyncStorage whenever they change
    useEffect(() => {
        const saveUsers = async () => {
            try {
                await AsyncStorage.setItem('users', JSON.stringify(users));
            } catch (error) {
                console.error('Error saving users:', error);
            }
        };
        saveUsers();
    }, [users]);

    useEffect(() => {
        const saveDefaultUser = async () => {
            if (defaultUser) {
                try {
                    await AsyncStorage.setItem('defaultUser', defaultUser);
                } catch (error) {
                    console.error('Error saving default user:', error);
                }
            }
        };
        saveDefaultUser();
    }, [defaultUser]);

    const handleAddUser = () => {
        if (newUserName.trim() && !users.includes(newUserName.trim())) {
            if (users.length >= 2) {
                Alert.alert('Error', 'Maximum 2 users allowed');
                return;
            }
            setUsers((prevUsers: string[]) => [...prevUsers, newUserName.trim()]);
            setNewUserName('');
            if (users.length === 0) {
                setDefaultUser(newUserName.trim());
            }
        }
    };

    const handleDeleteUser = (userToDelete: string) => {
        if (users.length <= 1) {
            Alert.alert('Error', 'Cannot delete last user');
            return;
        }
        setUsers((prevUsers: string[]) => prevUsers.filter(user => user !== userToDelete));
        if (defaultUser === userToDelete) {
            const newDefaultUser = users.find(user => user !== userToDelete) || '';
            setDefaultUser(newDefaultUser);
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

                <View style={{ flexDirection: 'row', marginBottom: 24, gap: 8 }}>
                    <TextInput
                        value={newUserName}
                        onChangeText={setNewUserName}
                        placeholder="Enter new user name"
                        style={{
                            flex: 1,
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            borderWidth: 1,
                            borderColor: '#d1d5db',
                            borderRadius: 8
                        }}
                    />
                    <TouchableOpacity
                        onPress={handleAddUser}
                        style={{
                            padding: 8,
                            backgroundColor: '#3b82f6',
                            borderRadius: 8,
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}
                    >
                        <Ionicons name="add-circle" size={24} color="white" />
                    </TouchableOpacity>
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
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <Ionicons name="person" size={20} color="#666" />
                                <Text style={{ color: '#374151' }}>{user}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <TouchableOpacity
                                    onPress={() => setDefaultUser(user)}
                                    style={{ padding: 4 }}
                                >
                                    <Ionicons
                                        name="checkmark-circle"
                                        size={20}
                                        color={defaultUser === user ? '#22c55e' : '#9ca3af'}
                                    />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => handleDeleteUser(user)}
                                    style={{ padding: 4 }}
                                >
                                    <Ionicons name="trash" size={20} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                    {users.length === 0 && (
                        <Text style={{ color: '#6b7280', textAlign: 'center', paddingVertical: 16 }}>
                            No users added yet. Add your first user above!
                        </Text>
                    )}
                </View>
            </View>
        </ScrollView>
    );
}