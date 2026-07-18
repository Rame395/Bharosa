import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { apiFetch, API_URL } from '../api';
import { io, Socket } from 'socket.io-client';
import { T } from '../designSystem';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../supabase';

export const ChatScreen = ({ route, navigation }: any) => {
  const { jobId, otherPartyName } = route.params;
  const { session } = useContext(AuthContext);
  const userId = session?.user?.id;
  
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: `Chat with ${otherPartyName}` });
    
    // Fetch initial history
    apiFetch(`/jobs/${jobId}/messages`)
      .then(setMessages)
      .catch(console.error);

    // Initialize socket connection
    // We strip the /api or /v1 path if API_URL has it, or just connect to the root
    const socketUrl = API_URL.replace('/api', ''); 
    socketRef.current = io(socketUrl);

    socketRef.current.on('connect', () => {
      socketRef.current?.emit('join_job', jobId);
    });

    socketRef.current.on('receive_message', (msg: any) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [jobId]);

  const sendMessage = async (photoUrl?: string) => {
    if (!inputText.trim() && !photoUrl) return;

    socketRef.current?.emit('send_message', {
      jobId,
      senderId: userId,
      content: inputText,
      photoUrl
    });

    setInputText('');
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      uploadImage(uri);
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      const ext = uri.substring(uri.lastIndexOf('.') + 1);
      const fileName = `${jobId}_${Date.now()}.${ext}`;
      
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: fileName,
        type: `image/${ext}`,
      } as any);

      // Using supabase storage REST API directly or via client
      const response = await fetch(uri);
      const blob = await response.blob();

      const { data, error } = await supabase.storage
        .from('chat_photos')
        .upload(fileName, blob, {
          contentType: `image/${ext}`
        });

      if (error) {
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('chat_photos')
        .getPublicUrl(fileName);

      sendMessage(publicUrl);
    } catch (err) {
      console.error('Upload Error:', err);
      alert('Failed to upload image.');
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.sender_id === userId;
    return (
      <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
        {item.photo_url && (
          <Image source={{ uri: item.photo_url }} style={styles.chatImage} />
        )}
        {item.content ? <Text style={styles.messageText}>{item.content}</Text> : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={messages}
          keyExtractor={item => item.id.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
        />
        
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
            <Text style={styles.photoButtonText}>📷</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
          />
          <TouchableOpacity style={styles.sendButton} onPress={() => sendMessage()}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.colors.background },
  messageList: { padding: T.spacing.md },
  messageBubble: { padding: 12, borderRadius: 16, marginBottom: 8, maxWidth: '80%' },
  myMessage: { backgroundColor: '#DCF8C6', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  theirMessage: { backgroundColor: '#FFF', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  messageText: { ...T.typography.body },
  chatImage: { width: 200, height: 200, borderRadius: 8, marginBottom: 4 },
  inputContainer: { flexDirection: 'row', padding: 8, backgroundColor: '#FFF', alignItems: 'center' },
  photoButton: { padding: 8 },
  photoButtonText: { fontSize: 24 },
  input: { flex: 1, backgroundColor: '#F0F0F0', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 8 },
  sendButton: { padding: 10 },
  sendButtonText: { color: T.colors.primary, fontWeight: 'bold' }
});
