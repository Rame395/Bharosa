import React from 'react';
import { View, Text } from 'react-native';

export const MapView = ({ style, children }: any) => (
  <View style={[style, { backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }]}>
    <Text>Map not supported on Web</Text>
    {children}
  </View>
);

export const Marker = () => null;
