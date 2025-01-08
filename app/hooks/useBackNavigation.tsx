// hooks/useBackNavigation.ts
import { useNavigation, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert } from 'react-native';

type ValidRoutes = 
  | '/'
  | '/receipt-box'
  | '/standard-input'
  | '/receipt-capture'
  | '/overall-payment'
  | '/(tabs)';

interface BackNavigationOptions {
  checkUnsavedChanges?: () => boolean;
  onBack?: () => void;
  destination?: ValidRoutes;
  showConfirmation?: boolean;
}

export const useBackNavigation = ({
  checkUnsavedChanges = () => false,
  onBack,
  destination = '/',
  showConfirmation = false
}: BackNavigationOptions = {}) => {
  const navigation = useNavigation();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      e.preventDefault();

      const handleNavigation = () => {
        if (onBack) {
          onBack();
        } else {
          router.replace(destination as any); // or use type assertion
        }
        navigation.dispatch(e.data.action);
      };

      if (showConfirmation && checkUnsavedChanges()) {
        Alert.alert(
          'Discard changes?',
          'You have unsaved changes. Are you sure you want to leave?',
          [
            {
              text: 'Stay',
              style: 'cancel',
              onPress: () => {}
            },
            {
              text: 'Leave',
              style: 'destructive',
              onPress: handleNavigation
            }
          ]
        );
      } else {
        handleNavigation();
      }
    });

    return unsubscribe;
  }, [navigation, destination, onBack, showConfirmation]);
};