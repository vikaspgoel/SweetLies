import { useId } from 'react';
import { StyleSheet, View, Text, Pressable, Image, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

interface FileUploadProps {
  value: string | null;
  onChange: (uri: string) => void;
  placeholder?: string;
  accept?: string;
}

export function FileUpload({ value, onChange, placeholder = 'Upload image' }: FileUploadProps) {
  const inputId = 'label-truth-file-' + useId().replace(/:/g, '-');

  const pickImage = async () => {
    if (Platform.OS === 'web') {
      const el = document.getElementById(inputId);
      if (el) (el as HTMLInputElement).click();
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      onChange(result.assets[0].uri);
    }
  };

  const handleWebFileChange = (e: { target?: { files?: FileList | null; value?: string } }) => {
    const file = e.target?.files?.[0];
    if (file) {
      const uri = URL.createObjectURL(file);
      onChange(uri);
    }
    if (e.target) e.target.value = '';
  };

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' && (
        <input
          id={inputId}
          type="file"
          accept="image/*"
          onChange={handleWebFileChange as any}
          style={{ display: 'none' }}
        />
      )}
      {value ? (
        <View style={styles.preview}>
          <Image source={{ uri: value }} style={styles.image} resizeMode="contain" />
          <Pressable style={styles.changeBtn} onPress={pickImage}>
            <Text style={styles.changeBtnText}>Change image</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.uploadZone} onPress={pickImage}>
          <Text style={styles.uploadText}>{placeholder}</Text>
          <Text style={styles.uploadHint}>jpg, png, heic, webp</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  preview: {},
  image: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  changeBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  changeBtnText: {
    fontSize: 14,
    color: '#722F37',
    fontWeight: '500',
  },
  uploadZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  uploadText: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '500',
  },
  uploadHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
});
