import React, { useRef, useState, useEffect } from 'react';
import {
  Modal, View, StyleSheet, TouchableOpacity, Text,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

const REDIRECT_HOST = 'fixng.app';
const REDIRECT_PATH = '/payment/callback';

const isCallbackUrl = (url) => {
  if (!url) return false;
  try {
    const { hostname, pathname } = new URL(url);
    return hostname === REDIRECT_HOST && pathname === REDIRECT_PATH;
  } catch {
    return false;
  }
};

const LOAD_TIMEOUT_MS = 30000;

export default function FlutterwaveWebView({
  visible,
  paymentLink,
  txRef,
  onSuccess,
  onCancel,
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const insets              = useSafeAreaInsets();
  const webRef              = useRef(null);
  const timeoutRef          = useRef(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [loadError,   setLoadError]   = useState(false);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const startLoadTimeout = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setPageLoading(false);
      setLoadError(true);
    }, LOAD_TIMEOUT_MS);
  };

  const clearLoadTimeout = () => clearTimeout(timeoutRef.current);

  const parseRedirect = (url) => {
    try {
      const params = new URL(url).searchParams;
      const status = params.get('status');
      const ref    = params.get('tx_ref') || txRef;
      if (status === 'successful' && ref) {
        onSuccess(ref);
      } else {
        onCancel();
      }
    } catch {
      onSuccess(txRef);
    }
  };

  const handleNavChange = (state) => {
    const url = state.url || '';
    if (isCallbackUrl(url)) parseRedirect(url);
  };

  const handleShouldStartLoad = (request) => {
    const url = request.url || '';
    if (isCallbackUrl(url)) {
      clearLoadTimeout();
      parseRedirect(url);
      return false;
    }
    return true;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.card} />

        <View style={styles.topBar}>
          <TouchableOpacity onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>Secure Payment</Text>
          <Text style={styles.lockIcon}>🔒</Text>
        </View>

        {loadError ? (
          <View style={styles.centred}>
            <Text style={styles.errorTitle}>Could not load payment page</Text>
            <Text style={styles.errorSub}>Check your internet connection and try again.</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => { setLoadError(false); webRef.current?.reload(); }}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {pageLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={colors.info} />
                <Text style={styles.loadingText}>Loading payment page…</Text>
              </View>
            )}
            <WebView
              ref={webRef}
              source={{ uri: paymentLink }}
              onLoadStart={() => { setPageLoading(true); startLoadTimeout(); }}
              onLoadEnd={()   => { clearLoadTimeout(); setPageLoading(false); }}
              onError={()     => { clearLoadTimeout(); setPageLoading(false); setLoadError(true); }}
              onHttpError={() => { clearLoadTimeout(); setPageLoading(false); setLoadError(true); }}
              onNavigationStateChange={handleNavChange}
              onShouldStartLoadWithRequest={handleShouldStartLoad}
              javaScriptEnabled
              domStorageEnabled
              mixedContentMode="always"
              style={{ flex: 1 }}
            />
          </View>
        )}

        <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity
            style={styles.paidBtn}
            onPress={() => onSuccess(txRef)}
            activeOpacity={0.85}
          >
            <Text style={styles.paidBtnText}>✓  I've Completed Payment</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.card },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    backgroundColor: colors.card,
  },
  backText:  { fontSize: 15, color: colors.info, fontWeight: '600' },
  topTitle:  { fontSize: 15, fontWeight: '700', color: colors.text },
  lockIcon:  { fontSize: 16 },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.textSub },

  centred: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8, textAlign: 'center' },
  errorSub:   { fontSize: 14, color: colors.textSub, marginBottom: 24, textAlign: 'center' },
  retryBtn:   {
    backgroundColor: colors.info, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  footer: {
    backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.borderLight,
    paddingHorizontal: 16, paddingTop: 12,
  },
  paidBtn: {
    height: 52, borderRadius: 12, backgroundColor: colors.success,
    alignItems: 'center', justifyContent: 'center',
  },
  paidBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
