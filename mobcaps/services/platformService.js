import { Alert, Platform } from 'react-native'; 
 
export const showAlert = (title, message, onConfirm) => { 
  Alert.alert( 
    title, 
    message, 
    [{ text: 'OK', onPress: onConfirm || (() => {}) }], 
    { cancelable: true } 
  ); 
}; 
 
export const showConfirm = (title, message, onConfirm, onCancel) => { 
  Alert.alert( 
    title, 
    message, 
    [ 
      { text: 'Cancel', onPress: onCancel || (() => {}), style: 'cancel' }, 
      { text: 'Confirm', onPress: onConfirm || (() => {}) }, 
    ], 
    { cancelable: true } 
  ); 
}; 
