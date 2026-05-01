import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY      = 'fixng_token';
const USER_KEY       = 'fixng_user';
const LAST_PHONE_KEY = 'fixng_last_phone'; // persists across logout for autofill

export const saveToken = async (token) => {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
};

export const getToken = async () => {
  return await SecureStore.getItemAsync(TOKEN_KEY);
};

export const removeToken = async () => {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
};

export const saveUser = async (user) => {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getUser = async () => {
  const user = await AsyncStorage.getItem(USER_KEY);
  if (!user) return null;
  try {
    return JSON.parse(user);
  } catch {
    return null;
  }
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
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    AsyncStorage.removeItem(USER_KEY),
  ]);
  // LAST_PHONE_KEY intentionally kept so login screen can autofill
};
