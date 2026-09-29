import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

// toast('Đã lưu') from anywhere. Mount <ToastHost /> once near the app root.
let show = null;
export function toast(message, type = 'success') {
  if (show) show(message, type);
}

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [item, setItem] = useState(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);

  useEffect(() => {
    show = (message, type) => {
      clearTimeout(timer.current);
      setItem({ message, type });
      Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setItem(null));
      }, 2600);
    };
    return () => { show = null; clearTimeout(timer.current); };
  }, [anim]);

  if (!item) return null;
  const ok = item.type !== 'error';
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', left: 16, right: 16, top: insets.top + 8, zIndex: 1000,
        opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
        backgroundColor: ok ? '#14532D' : '#7F1D1D', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14,
        flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: ok ? '#166534' : '#991B1B',
      }}
    >
      <Ionicons name={ok ? 'checkmark-circle' : 'alert-circle'} size={20} color={ok ? '#86EFAC' : '#FCA5A5'} />
      <Text style={{ color: colors.text, fontWeight: '600', flex: 1 }}>{item.message}</Text>
    </Animated.View>
  );
}
