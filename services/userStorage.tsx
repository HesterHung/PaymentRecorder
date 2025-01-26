import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_STORAGE_KEY = 'users';
const CURRENT_USER_KEY = 'currentUser';

export const USER_COLORS = {
    'User 1': '#2563eb', // blue
    'User 2': '#dc2626', // red
    'Hester': '#2563eb',  // blue
    'Lok': '#dc2626',    // red
} as const;

export type UserColor = typeof USER_COLORS[keyof typeof USER_COLORS];

class UserStorageService {
    private currentUser: string = '';
    private subscribers: (() => void)[] = [];

    // Add this method to the UserStorageService class:
    getUserColor(username: string): string {
        return USER_COLORS[username as keyof typeof USER_COLORS] || '#6b7280';
    }

    getCurrentUserColor(): string {
        return this.getUserColor(this.currentUser);
    }

    async initializeCurrentUser(): Promise<void> {
        try {
            const savedCurrentUser = await AsyncStorage.getItem(CURRENT_USER_KEY);
            if (savedCurrentUser) {
                this.currentUser = savedCurrentUser;
            } else {
                // If no current user is set, default to the first user
                const [firstUser] = await this.getUsers();
                await this.setCurrentUser(firstUser);
            }
        } catch (error) {
            console.error('Error initializing current user:', error);
        }
    }

    async getUsers(): Promise<[string, string]> {
        try {
            const savedUsers = await AsyncStorage.getItem(USER_STORAGE_KEY);
            if (savedUsers) {
                const parsedUsers = JSON.parse(savedUsers);
                if (Array.isArray(parsedUsers) && parsedUsers.length >= 2) {
                    return [parsedUsers[0], parsedUsers[1]];
                }
            }
            // Default users if none found
            const defaultUsers: [string, string] = ['User 1', 'User 2'];
            await this.setUsers(defaultUsers);
            return defaultUsers;
        } catch (error) {
            console.error('Error loading users:', error);
            return ['User 1', 'User 2'];
        }
    }

    async setUsers(users: [string, string]): Promise<void> {
        try {
            await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
            // If current user is not in the new users list, update it to the first user
            if (!users.includes(this.currentUser)) {
                await this.setCurrentUser(users[0]);
            }
            this.notifySubscribers();
        } catch (error) {
            console.error('Error saving users:', error);
        }
    }

    getCurrentUser(): string {
        return this.currentUser;
    }

    async setCurrentUser(user: string): Promise<void> {
        try {
            await AsyncStorage.setItem(CURRENT_USER_KEY, user);
            this.currentUser = user;
            this.notifySubscribers();
        } catch (error) {
            console.error('Error saving current user:', error);
            throw error;
        }
    }

    subscribe(callback: () => void): () => void {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter(sub => sub !== callback);
        };
    }

    private notifySubscribers(): void {
        this.subscribers.forEach(callback => callback());
    }
}

const userStorageService = new UserStorageService();
userStorageService.initializeCurrentUser().catch(console.error);
export default userStorageService;