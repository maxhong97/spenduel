import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { recordSpending, uploadEvidence } from '@/lib/api';
import { classifyMerchant } from '@/lib/claude';
import { User } from '@/types';

interface Props {
  visible: boolean;
  duelId: string;
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

export function SpendingModal({ visible, duelId, user, onClose, onSuccess }: Props) {
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requiresReceipt = !user.card_linked;

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    const amountNum = parseInt(amount.replace(/[^0-9]/g, ''), 10);

    if (!amountNum || amountNum <= 0) {
      Alert.alert('오류', '올바른 금액을 입력해주세요.');
      return;
    }

    if (requiresReceipt && !imageUri) {
      Alert.alert('영수증 필요', '카드 미연동 유저는 영수증 사진이 필수입니다.');
      return;
    }

    setLoading(true);
    try {
      let evidenceUrl: string | undefined;
      if (imageUri) {
        evidenceUrl = await uploadEvidence(user.id, imageUri);
      }

      await recordSpending({
        duelId,
        userId: user.id,
        amount: amountNum,
        merchantName: merchant.trim() || undefined,
        evidenceUrl,
      });

      // AI classify in background (non-blocking)
      if (merchant.trim()) {
        classifyMerchant(merchant.trim()).catch(console.error);
      }

      reset();
      onSuccess();
    } catch (e: any) {
      Alert.alert('오류', e.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setAmount('');
    setMerchant('');
    setImageUri(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const formatAmount = (text: string) => {
    const num = text.replace(/[^0-9]/g, '');
    if (!num) return '';
    return parseInt(num, 10).toLocaleString('ko-KR');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <Text style={styles.title}>소비 기록</Text>

          <View style={styles.field}>
            <Text style={styles.label}>금액 *</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={amount}
                onChangeText={(t) => setAmount(formatAmount(t))}
                keyboardType="numeric"
                returnKeyType="done"
              />
              <Text style={styles.unit}>원</Text>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>가맹점명 (선택)</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 스타벅스, 쿠팡"
              value={merchant}
              onChangeText={setMerchant}
              returnKeyType="done"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              영수증 사진{requiresReceipt ? ' *' : ' (선택)'}
            </Text>
            {requiresReceipt && (
              <Text style={styles.hintText}>카드 미연동: 영수증 사진이 필수입니다.</Text>
            )}
            {imageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.removeImage}
                  onPress={() => setImageUri(null)}
                >
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.imageButtons}>
                <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
                  <Text style={styles.imageButtonIcon}>📷</Text>
                  <Text style={styles.imageButtonText}>촬영</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                  <Text style={styles.imageButtonIcon}>🖼️</Text>
                  <Text style={styles.imageButtonText}>갤러리</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Points preview */}
          {amount ? (() => {
            const num = parseInt(amount.replace(/,/g, ''), 10);
            const pts = num < 10000 ? -5 : num < 30000 ? -10 : -20;
            return (
              <View style={styles.pointsPreview}>
                <Text style={styles.pointsPreviewText}>기록 시 {pts}점</Text>
              </View>
            );
          })() : null}

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>기록하기</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
            <Text style={styles.cancelText}>취소</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#DFE6E9',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 20,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#636E72',
    marginBottom: 6,
  },
  hintText: {
    fontSize: 11,
    color: '#E17055',
    marginBottom: 6,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#DFE6E9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2D3436',
    backgroundColor: '#F8F9FA',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unit: {
    fontSize: 16,
    fontWeight: '600',
    color: '#636E72',
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  imageButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#DFE6E9',
    borderRadius: 12,
    borderStyle: 'dashed',
    paddingVertical: 16,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8F9FA',
  },
  imageButtonIcon: {
    fontSize: 24,
  },
  imageButtonText: {
    fontSize: 13,
    color: '#636E72',
    fontWeight: '500',
  },
  imagePreviewContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  removeImage: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E17055',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  pointsPreview: {
    backgroundColor: '#FFF5F5',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    alignItems: 'center',
  },
  pointsPreviewText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E17055',
  },
  submitButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    color: '#B2BEC3',
  },
});
