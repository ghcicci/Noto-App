import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function FocusModeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Focus Mode</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontFamily: 'Inter',
    fontSize: 32,
    color: '#fff',
  },
});
