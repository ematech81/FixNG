import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY      = 'fixng_token';
const USER_KEY       = 'fixng_user';
const LAST_PHONE_KEY = 'fixng_last_phone'; // persists across logout for autofill

export const saveToken = async (token) => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
};

export const getToken = async () => {
  return await AsyncStorage.getItem(TOKEN_KEY);
};

export const removeToken = async () => {
  await AsyncStorage.removeItem(TOKEN_KEY);
};

export const saveUser = async (user) => {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getUser = async () => {
  const user = await AsyncStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
};

export const removeUser = async () => {
  await AsyncStorage.removeItem(USER_KEY);
};

export const saveLastPhone = async (digits) => {
  await AsyncStorage.setItem(LAST_PHONE_KEY, digits);
};

export const getLastPhone = async () => {
  return await AsyncStorage.getItem(LAST_PHONE_KEY);
};

export const clearSession = async () => {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  // LAST_PHONE_KEY intentionally kept so login screen can autofill
};
