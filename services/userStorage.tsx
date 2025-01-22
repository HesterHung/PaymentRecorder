import AsyncStorage from '@react-native-async-storage/async-storage';

type UserStorageListener = () => void;

class UserStorageService {
    private listeners: UserStorageListener[] = [];
    private currentUser: string = '';

    constructor() {
        // Initialize from AsyncStorage
        this.initializeUser();
    }

    private async initializeUser() {
        try {
            const savedUser = await AsyncStorage.getItem('currentUser');
            if (savedUser) {
                this.currentUser = savedUser;
                this.notifyListeners();
            }
        } catch (error) {
            console.error('Error initializing user:', error);
        }
    }

    getCurrentUser(): string {
        return this.currentUser;
    }

    async setCurrentUser(user: string): Promise<void> {
        try {
            await AsyncStorage.setItem('currentUser', user);
            this.currentUser = user;
            this.notifyListeners();
        } catch (error) {
            console.error('Error setting user:', error);
            throw error;
        }
    }

    subscribe(listener: UserStorageListener): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners(): void {
        this.listeners.forEach(listener => listener());
    }
}

export const userStorage = new UserStorageService();
export default userStorage;