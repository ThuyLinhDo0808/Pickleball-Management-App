import { Alert } from 'react-native';

// One place that turns API errors into something a host can act on.
// Pass the navigation object so a plan-limit error can jump to the Plans screen.
export function showError(title, err, navigation) {
  if (err?.code === 'CAPACITY_LIMIT_REACHED') {
    Alert.alert('Plan limit reached', err.message, [
      { text: 'Not now', style: 'cancel' },
      { text: 'View plans', onPress: () => navigation?.navigate('Plan') },
    ]);
    return;
  }
  if (err?.status === 401) {
    Alert.alert('Session expired', 'Please sign out and sign in again.');
    return;
  }
  Alert.alert(title, err?.message || 'Something went wrong. Please try again.');
}
