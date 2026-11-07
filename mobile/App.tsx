import { useRef, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { DarkTheme, NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import OfflineBanner from './src/components/states/OfflineBanner';
import SpaceBackground from './src/components/fx/SpaceBackground';
import WarpFlash from './src/components/fx/WarpFlash';
import { colors } from './src/theme/colors';

// Screens are see-through so the night sky behind them shows; each screen paints only its own cards.
const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: 'transparent', card: 'transparent', primary: colors.brand } };

export default function App() {
  const navRef = useNavigationContainerRef();
  const lastRoute = useRef<string | undefined>(undefined);
  const [warp, setWarp] = useState(0);

  // A burst of light streaks whenever you move to a different screen.
  const onStateChange = () => {
    const name = (navRef.getCurrentRoute() as { name: string } | undefined)?.name;
    if (name && name !== lastRoute.current) {
      if (lastRoute.current) setWarp((w) => w + 1);
      lastRoute.current = name;
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <AuthProvider>
          <View style={{ flex: 1 }}>
            <SpaceBackground />
            <NavigationContainer ref={navRef} theme={theme} onStateChange={onStateChange}>
              <StatusBar style="light" />
              <RootNavigator />
              <WarpFlash trigger={warp} />
              <OfflineBanner />
            </NavigationContainer>
          </View>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
