import React from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <>
      {/*
        style="dark"       → dark icons (battery, time, signal) — correct for all light-background screens
        backgroundColor    → Android only: transparent so each screen's background colour shows through
        translucent        → Android only: status bar sits on top of the screen (SafeAreaView handles the inset)
      */}
      <StatusBar style="dark" backgroundColor="transparent" translucent />
      <AppNavigator />
    </>
  );
}
