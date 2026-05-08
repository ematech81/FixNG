import React, { useRef, useState } from 'react';
import {
  Modal, View, StyleSheet, TouchableOpacity, Text,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PRIMARY = '#2563EB';

// Must match the redirect_url domain set in the backend initializePayment call
const REDIRECT_HOST = 'fixng.app';
const REDIRECT_PATH = '/payment/callback';

/**
 * FlutterwaveWebView
 *
 * Opens the Flutterwave hosted checkout in a modal WebView.
 * Intercepts the redirect URL to detect payment completion automatically.
 * Falls back to a manual "I've Completed Payment" button for edge cases.
 *
 * Props:
 *   visible      — boolean controls modal visibility
 *   paymentLink  — the link returned by /subscriptions/initiate
 *   txRef        — the tx_ref returned by /subscriptions/initiate
 *   onSuccess(txRef) — called when payment is confirmed (auto or manual)
 *   onCancel()       — called when the user closes without paying
 */
export default function FlutterwaveWebView({
  visible,
  paymentLink,
  txRef,
  onSuccess,
  onCancel,
}) {
  const insets              = useSafeAreaInsets();
  const webRef              = useRef(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [loadError,   setLoadError]   = useState(false);

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
      // URL parse failed — treat as success with the stored txRef
      onSuccess(txRef);
    }
  };

  // Fires after navigation completes — catches soft redirects
  const handleNavChange = (state) => {
    const url = state.url || '';
    if (url.includes(REDIRECT_HOST + REDIRECT_PATH)) {
      parseRedirect(url);
    }
  };

  // Fires before loading starts — intercepts the redirect page before it renders
  const handleShouldStartLoad = (request) => {
    const url = request.url || '';
    if (url.includes(REDIRECT_HOST + REDIRECT_PATH)) {
      parseRedirect(url);
      return false; // block the redirect page from loading
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
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>Secure Payment</Text>
          <Text style={styles.lockIcon}>🔒</Text>
        </View>

        {/* Content */}
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
                <ActivityIndicator size="large" color={PRIMARY} />
                <Text style={styles.loadingText}>Loading payment page…</Text>
              </View>
            )}
            <WebView
              ref={webRef}
              source={{ uri: paymentLink }}
              onLoadStart={() => setPageLoading(true)}
              onLoadEnd={()   => setPageLoading(false)}
              onError={()     => { setPageLoading(false); setLoadError(true); }}
              onNavigationStateChange={handleNavChange}
              onShouldStartLoadWithRequest={handleShouldStartLoad}
              javaScriptEnabled
              domStorageEnabled
              mixedContentMode="always"
              style={{ flex: 1 }}
            />
          </View>
        )}

        {/* Manual fallback — shown in case the redirect isn't auto-detected */}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
  },
  backText:  { fontSize: 15, color: PRIMARY, fontWeight: '600' },
  topTitle:  { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  lockIcon:  { fontSize: 16 },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748B' },

  centred: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 8, textAlign: 'center' },
  errorSub:   { fontSize: 14, color: '#64748B', marginBottom: 24, textAlign: 'center' },
  retryBtn:   {
    backgroundColor: PRIMARY, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  footer: {
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6',
    paddingHorizontal: 16, paddingTop: 12,
  },
  paidBtn: {
    height: 52, borderRadius: 12, backgroundColor: '#16A34A',
    alignItems: 'center', justifyContent: 'center',
  },
  paidBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
