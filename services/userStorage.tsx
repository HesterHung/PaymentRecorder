import { USER_COLORS } from '@/constants/Colors';
import { CONSTANTS } from '@/types/payment';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_STORAGE_KEY = 'users';
const CURRENT_USER_KEY = 'currentUser';

export type UserColor = typeof USER_COLORS[0 | 1];

class UserStorageService {
    private currentUser: string = '';
    private subscribers: (() => void)[] = [];

    // Cache for users to avoid excessive AsyncStorage calls
    private cachedUsers: [string, string] | null = null;

    async getUserColor(username: string): Promise<string> {
        const users = await this.getUsers();
        const index = users.indexOf(username);
        return index >= 0 && index < USER_COLORS.length ? USER_COLORS[index] : '#6b7280';
    }

    async getCurrentUserColor(): Promise<string> {
        const users = await this.getUsers();
        const index = users.indexOf(this.currentUser);
        return index >= 0 && index < USER_COLORS.length ? USER_COLORS[index] : '#6b7280';
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
            // Return cached users if available
            if (this.cachedUsers) {
                return this.cachedUsers;
            }

            const savedUsers = await AsyncStorage.getItem(USER_STORAGE_KEY);
            if (savedUsers) {
                const parsedUsers = JSON.parse(savedUsers);
                if (Array.isArray(parsedUsers) && parsedUsers.length >= 2) {
                    this.cachedUsers = [parsedUsers[0], parsedUsers[1]];
                    return this.cachedUsers;
                }
            }
            // Default users if none found
            const defaultUsers: [string, string] = [CONSTANTS.PAYERS[0], CONSTANTS.PAYERS[1]];
            await this.setUsers(defaultUsers);
            this.cachedUsers = defaultUsers;
            return defaultUsers;
        } catch (error) {
            console.error('Error loading users:', error);
            const defaultUsers: [string, string] = [CONSTANTS.PAYERS[0], CONSTANTS.PAYERS[1]];
            this.cachedUsers = defaultUsers;
            return defaultUsers;
        }
    }

    async setUsers(users: [string, string]): Promise<void> {
        try {
            await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
            this.cachedUsers = users; // Update cache
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