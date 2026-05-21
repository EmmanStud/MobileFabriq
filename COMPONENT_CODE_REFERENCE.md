# Updated Component Code - Copy & Reference

## CustomAlertModal.jsx (NO CHANGES)

This component is unchanged - it already had proper configuration for rendering on top:

```jsx
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';

export default function CustomAlertModal({
  visible,
  title,
  message,
  mode = 'alert',
  onConfirm,
  onCancel,
  onClose,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
}) {
  const handleClose = () => {
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  const handleConfirm = () => {
    if (typeof onConfirm === 'function') {
      onConfirm();
    }
    handleClose();
  };

  const handleCancel = () => {
    if (typeof onCancel === 'function') {
      onCancel();
    }
    handleClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.alertBox}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          {/* Buttons... */}
        </View>
      </View>
    </Modal>
  );
}
```

---

## EditProfileModal.jsx - UPDATED

### Function Signature (CHANGE):
```jsx
// BEFORE:
export default function EditProfileModal({
  visible,
  onClose,
  customerData,
  onSave,
  isLoading,
}) {

// AFTER:
export default function EditProfileModal({
  visible,
  onClose,
  customerData,
  onSave,
  isLoading,
  onShowAlert,  // ← NEW PROP
}) {
```

### State Management (REMOVE EVERYTHING BELOW):
```jsx
// REMOVED - This entire block should be deleted:
const [alertConfig, setAlertConfig] = useState({
  visible: false,
  title: '',
  message: '',
  mode: 'alert',
  onConfirm: null,
  onCancel: null,
});

const closeAlert = () => {
  setAlertConfig((prev) => ({ ...prev, visible: false, onConfirm: null, onCancel: null }));
};

const openAlert = ({ title, message, mode = 'alert', onConfirm, onCancel }) => {
  setAlertConfig({
    visible: true,
    title,
    message,
    mode,
    onConfirm: onConfirm ? () => { onConfirm(); closeAlert(); } : closeAlert,
    onCancel: onCancel ? () => { onCancel(); closeAlert(); } : null,
  });
};

const showCustomAlert = (title, message, onConfirm) => openAlert({ title, message, mode: 'alert', onConfirm });
const showCustomConfirm = (title, message, onConfirm) => openAlert({ title, message, mode: 'confirm', onConfirm, onCancel: closeAlert });
```

### Import Statement (REMOVE):
```jsx
// BEFORE:
import CustomAlertModal from './CustomAlertModal';

// AFTER:
// (removed - no longer needed)
```

### handleSave() Method (UPDATE ALERT CALLS):
```jsx
// BEFORE:
const handleSave = async () => {
  // ... validation code ...
  try {
    await onSave(updatedData);
    showCustomAlert('Success', 'Profile updated successfully', () => onClose());
    onClose();
  } catch (err) {
    showCustomAlert('Error', err.message || 'Failed to save profile');
  }
  // ...
};

// AFTER:
const handleSave = async () => {
  // ... validation code ...
  try {
    await onSave(updatedData);
    if (typeof onShowAlert === 'function') {
      onShowAlert('Success', 'Profile updated successfully', () => onClose());
    }
    onClose();
  } catch (err) {
    if (typeof onShowAlert === 'function') {
      onShowAlert('Error', err.message || 'Failed to save profile');
    }
  }
  // ...
};
```

### Return JSX (UPDATE):
```jsx
// BEFORE:
return (
  <>
    <CustomAlertModal
      visible={alertConfig.visible}
      title={alertConfig.title}
      message={alertConfig.message}
      mode={alertConfig.mode}
      onConfirm={alertConfig.onConfirm}
      onCancel={alertConfig.onCancel}
      onClose={closeAlert}
    />
    <Modal visible={visible} animationType="slide" transparent={true}>
      {/* Form content */}
    </Modal>
  </>
);

// AFTER:
return (
  <Modal visible={visible} animationType="slide" transparent={true}>
    {/* Form content - SAME */}
  </Modal>
);
```

---

## Profile.jsx - UPDATED

### Import (NO CHANGE):
```jsx
import CustomAlertModal from '../components/CustomAlertModal';
import EditProfileModal from '../components/EditProfileModal';
// ... other imports
```

### State Management (NO CHANGE):
```jsx
// Your existing alertConfig and related functions remain the same:
const [alertConfig, setAlertConfig] = useState({
  visible: false,
  title: '',
  message: '',
  mode: 'alert',
  onConfirm: null,
  onCancel: null,
});

const closeAlert = () => {
  setAlertConfig((prev) => ({
    ...prev,
    visible: false,
    onConfirm: null,
    onCancel: null,
  }));
};

const openAlert = ({ title, message, mode = 'alert', onConfirm, onCancel }) => {
  setAlertConfig({
    visible: true,
    title,
    message,
    mode,
    onConfirm: mode === 'confirm'
      ? () => {
          if (typeof onConfirm === 'function') {
            onConfirm();
          }
          closeAlert();
        }
      : () => {
          if (typeof onConfirm === 'function') {
            onConfirm();
          }
          closeAlert();
        },
    onCancel: mode === 'confirm'
      ? () => {
          if (typeof onCancel === 'function') {
            onCancel();
          }
          closeAlert();
        }
      : null,
  });
};
```

### Modal Rendering (REORDER):
```jsx
// BEFORE - In return () of Profile screen:
return (
  <SafeAreaView style={styles.container}>
    {/* ... existing content ... */}

    {/* Custom Alert Modal - FIRST */}
    <CustomAlertModal
      visible={alertConfig.visible}
      title={alertConfig.title}
      message={alertConfig.message}
      mode={alertConfig.mode}
      onConfirm={alertConfig.onConfirm}
      onCancel={alertConfig.onCancel}
      onClose={closeAlert}
    />

    {/* Edit Profile Modal - SECOND */}
    <EditProfileModal
      visible={isEditModalOpen}
      onClose={() => setIsEditModalOpen(false)}
      customerData={customerData}
      onSave={handleSaveProfile}
      isLoading={isEditLoading}
    />

    {/* Hamburger Menu */}
    <HamburgerMenu
      visible={menuVisible}
      onClose={() => setMenuVisible(false)}
      isLoggedIn={isLoggedIn}
      onLogout={handleLogout}
      onNavigate={(routeName) => { setMenuVisible(false); navigation.navigate(routeName); }}
      onAuthAction={(routeName) => { setMenuVisible(false); navigation.navigate(routeName); }}
      currentRoute={route?.name}
      styles={styles}
    />
  </SafeAreaView>
);

// AFTER - Notice the order swap and onShowAlert prop:
return (
  <SafeAreaView style={styles.container}>
    {/* ... existing content ... */}

    {/* Edit Profile Modal - NOW FIRST */}
    <EditProfileModal
      visible={isEditModalOpen}
      onClose={() => setIsEditModalOpen(false)}
      customerData={customerData}
      onSave={handleSaveProfile}
      isLoading={isEditLoading}
      onShowAlert={openAlert}  {/* ← NEW PROP */}
    />

    {/* Custom Alert Modal - NOW LAST (renders on top!) */}
    <CustomAlertModal
      visible={alertConfig.visible}
      title={alertConfig.title}
      message={alertConfig.message}
      mode={alertConfig.mode}
      onConfirm={alertConfig.onConfirm}
      onCancel={alertConfig.onCancel}
      onClose={closeAlert}
    />

    {/* Hamburger Menu */}
    <HamburgerMenu
      visible={menuVisible}
      onClose={() => setMenuVisible(false)}
      isLoggedIn={isLoggedIn}
      onLogout={handleLogout}
      onNavigate={(routeName) => { setMenuVisible(false); navigation.navigate(routeName); }}
      onAuthAction={(routeName) => { setMenuVisible(false); navigation.navigate(routeName); }}
      currentRoute={route?.name}
      styles={styles}
    />
  </SafeAreaView>
);
```

---

## Summary of Changes

| Component | Change Type | Details |
|-----------|------------|---------|
| CustomAlertModal.jsx | None | No changes needed |
| EditProfileModal.jsx | Remove | alertConfig state management |
| EditProfileModal.jsx | Remove | CustomAlertModal import |
| EditProfileModal.jsx | Remove | closeAlert, openAlert, showCustomAlert functions |
| EditProfileModal.jsx | Add | `onShowAlert` prop parameter |
| EditProfileModal.jsx | Update | Alert calls use `onShowAlert` prop instead of `showCustomAlert` |
| EditProfileModal.jsx | Update | Return statement - remove `<>` wrapper and nested CustomAlertModal |
| Profile.jsx | Reorder | Move `<EditProfileModal />` before `<CustomAlertModal />` |
| Profile.jsx | Update | Add `onShowAlert={openAlert}` prop to EditProfileModal |

---

## Testing Instructions

1. **Before making API calls**, test the modal layering:
   - Open Profile screen
   - Click "Edit Profile" button
   - Try to trigger a validation error (leave a required field empty)
   - Verify error message appears **on top** of the edit form

2. **After form save**, test success alert:
   - Make edits to profile fields
   - Click "Save Changes"
   - Verify success alert appears **on top** of edit form

3. **Sign out flow**:
   - Click "Sign Out" button
   - Verify confirmation dialog appears properly
   - Confirm the sign out works

4. **Tab switching**:
   - Open edit modal
   - Switch Profile tabs in background (if possible)
   - Verify modal stays on top

---

## Troubleshooting

**Alert still appears behind form:**
- Verify EditProfileModal is rendered BEFORE CustomAlertModal in JSX
- Check that `onShowAlert={openAlert}` prop was added to EditProfileModal
- Ensure CustomAlertModal has `statusBarTranslucent={true}` and `transparent={true}`

**Alert doesn't show up at all:**
- Check browser/device console for errors
- Verify `onShowAlert` prop is being called with correct parameters
- Ensure `alertConfig.visible` is being updated correctly

**Form closes when alert shows:**
- This is normal! The form modal remains open but is dimmed
- Alert should handle the interaction
- Both should work together without conflict

---

## Best Practices Moving Forward

1. **Always render CustomAlertModal LAST** in component tree
2. **Pass alert function as a prop** to child components that need it
3. **Keep alert state at the root/parent level**
4. **Avoid nesting Modal components** inside other Modals
5. **Add comments** when reordering components to explain z-index importance
