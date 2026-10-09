import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

async function setItem(key: string, value: string): Promise<void> {
  if (typeof value !== 'string') {
    throw new Error(
      `SessionStorage.setItem: el valor de "${key}" no es una cadena (tipo: ${typeof value}).`
    );
  }

  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') {
      throw new Error('El almacenamiento web no está disponible.');
    }

    window.sessionStorage.setItem(key, value);
    return;
  }

  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.error(`Error guardando la clave "${key}" en SecureStore.`);
    throw error;
  }
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.sessionStorage.getItem(key);
  }

  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error(`Error leyendo la clave "${key}" de SecureStore.`);
    throw error;
  }
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(key);
    }

    return;
  }

  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error(`Error eliminando la clave "${key}" de SecureStore.`);
    throw error;
  }
}

export const SessionStorage = {
  setItem,
  getItem,
  deleteItem,
};
