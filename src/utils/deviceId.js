import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = '@fixng_device_id';

// Generates a UUID-like identifier and caches it permanently in AsyncStorage.
// This persists across app restarts but is cleared on uninstall.
const generate = () => {
  const s4 = () =>
    Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
};

export const getDeviceId = async () => {
  try {
    let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = generate();
      await AsyncStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    // If storage fails, return a temporary ID (won't persist, so OTP will be asked again next time)
    return generate();
  }
};
