import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import userStorage from '@/services/userStorage';
import { USER_COLORS } from '@/constants/Colors';
import { CONSTANTS } from '@/types/payment';

const ProfilePage = () => {
    const [users, setUsers] = useState<[string, string]>([CONSTANTS.PAYERS[0], CONSTANTS.PAYERS[1]]);
    const [editingUser, setEditingUser] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [currentUser, setCurrentUser] = useState('');
    const [currentUserIndex, setCurrentUserIndex] = useState(0);

    useEffect(() => {
        const loadData = async () => {
            try {
                const loadedUsers = await userStorage.getUsers();
                setUsers(loadedUsers);
                const current = userStorage.getCurrentUser();
                setCurrentUser(current);
                setCurrentUserIndex(loadedUsers.indexOf(current));
            } catch (error) {
                console.error('Error loading users:', error);
            }
        };

        loadData();
        const unsubscribe = userStorage.subscribe(loadData);
        return () => unsubscribe();
    }, []);

    const handleUpdateUser = async (index: number, newName: string) => {
        if (newName.trim()) {
            try {
                const newUsers: [string, string] = [...users] as [string, string];
                newUsers[index] = newName.trim();
                await userStorage.setUsers(newUsers);
                if (currentUser === users[index]) {
                    setCurrentUser(newName.trim());
                    await userStorage.setCurrentUser(newName.trim());
                }
                setEditingUser(null);
                setEditName('');
            } catch (error) {
                Alert.alert('Error', 'Failed to save user changes');
            }
        }
    };

    const handleSetCurrentUser = async (user: string, index: number) => {
        try {
            await userStorage.setCurrentUser(user);
            setCurrentUser(user);
            setCurrentUserIndex(index);
            Alert.alert('Success', `Current user set to ${user}`);
        } catch (error) {
            Alert.alert('Error', 'Failed to set current user');
        }
    };

    const getUserColor = (index: number, isCurrentUser: boolean) => {
        return isCurrentUser ? USER_COLORS[index] : '#9CA3AF';
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>

                {/* Users List Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Users</Text>
                    {users.map((user, index) => (
                        <View key={index} style={styles.userCard}>
                            {editingUser === user ? (
                                <View style={styles.editContainer}>
                                    <TextInput
                                        style={styles.editInput}
                                        value={editName}
                                        onChangeText={setEditName}
                                        placeholder="Enter new name"
                                    />
                                    <View style={styles.editButtons}>
                                        <TouchableOpacity
                                            onPress={() => handleUpdateUser(index, editName)}
                                            style={styles.iconButton}
                                        >
                                            <Ionicons name="checkmark" size={24} color="#22c55e" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => setEditingUser(null)}
                                            style={styles.iconButton}
                                        >
                                            <Ionicons name="close" size={24} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.userInfo}>
                                    <View style={styles.userNameSection}>
                                        <Ionicons
                                            name="person"
                                            size={24}
                                            color={getUserColor(index, currentUser === user)}
                                        />
                                        <Text style={[
                                            styles.userName,
                                            { color: getUserColor(index, currentUser === user) }
                                        ]}>
                                            {user}
                                        </Text>
                                    </View>
                                    <View style={styles.userActions}>
                                        <TouchableOpacity
                                            onPress={() => handleSetCurrentUser(user, index)}
                                            style={[
                                                styles.setCurrentButton,
                                                currentUser === user && {
                                                    backgroundColor: USER_COLORS[index]
                                                }
                                            ]}
                                        >
                                            <Text style={[
                                                styles.setCurrentButtonText,
                                                currentUser === user && styles.currentUserButtonText
                                            ]}>
                                                {currentUser === user ? 'Current' : 'Set as Current'}
                                            </Text>
                                        </TouchableOpacity>
                                        {/*
                                        <TouchableOpacity
                                            onPress={() => {
                                                setEditingUser(user);
                                                setEditName(user);
                                            }}
                                            style={styles.editButton}
                                        >
                                            <Ionicons
                                                name="pencil"
                                                size={20}
                                                color={getUserColor(index, currentUser === user)}
                                            />
                                        </TouchableOpacity>
                                        */}

                                    </View>
                                </View>
                            )}
                        </View>
                    ))}
                </View>
                <Text style={styles.remark}>(default) user1: Hester; user2: Lok</Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    remark: {
        fontSize: 14,
        color: '#666666',
        fontStyle: 'italic',
        lineHeight: 16,
        fontWeight: '300',
        marginVertical: 4,
        letterSpacing: 0.2,
    },
    content: {
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 16,
    },
    currentUserCard: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    currentUserText: {
        fontSize: 18,
        fontWeight: '600',
    },
    userCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    userInfo: {
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    userNameSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    userName: {
        fontSize: 16,
    },
    userActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    setCurrentButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#f3f4f6',
    },
    setCurrentButtonText: {
        fontSize: 14,
        color: '#6b7280',
    },
    currentUserButtonText: {
        color: 'white',
    },
    editButton: {
        padding: 8,
    },
    editContainer: {
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    editInput: {
        flex: 1,
        padding: 8,
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        fontSize: 16,
    },
    editButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    iconButton: {
        padding: 8,
    },
});

export default ProfilePage;