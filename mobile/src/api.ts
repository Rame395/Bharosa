import { supabase } from './supabase';
import { Alert } from 'react-native';

// NOTE: You must set EXPO_PUBLIC_API_URL in your mobile/.env file
// Example: EXPO_PUBLIC_API_URL=http://192.168.1.10:3000
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error(`API Error on ${endpoint}:`, error);
    Alert.alert('Network Error', error.message);
    throw error;
  }
};
