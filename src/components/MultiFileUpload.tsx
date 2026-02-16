import { StyleSheet, View, Text, Pressable, Image, ScrollView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const WEB_FILE_INPUT_ID = 'sweetlies-multi-file-input';

interface MultiFileUploadProps {
  uris: string[];
  onAdd: (uri: string) => void;
  onRemove: (index: number) => void;
  maxCount?: number;
  placeholder?: string;
}

const MAX_COUNT = 5;

export function MultiFileUpload({
  uris,
  onAdd,
  onRemove,
  maxCount = MAX_COUNT,
  placeholder = 'Upload nutrition label or ingredients',
}: MultiFileUploadProps) {
  const pickImageNative = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: uris.length < maxCount,
      quality: 1,
    });
    if (!result.canceled && result.assets) {
      for (const asset of result.assets) {
        if (uris.length >= maxCount) break;
        onAdd(asset.uri);
      }
    }
  };

  const handleWebFileChange = (e: { target?: HTMLInputElement }) => {
    const files = e.target?.files;
    if (!files) return;
    let added = 0;
    const limit = maxCount - uris.length;
    for (let i = 0; i < files.length && added < limit; i++) {
      const file = files[i];
      if (file && file.type.startsWith('image/')) {
        onAdd(URL.createObjectURL(file));
        added++;
      }
    }
    if (e.target) e.target.value = '';
  };

  const addZoneContent = (
    <>
      <Text style={styles.addText}>
        {uris.length === 0 ? placeholder : `+ Add another (${uris.length}/${maxCount})`}
      </Text>
      <Text style={styles.addHint}>Up to {maxCount} images — jpg, png, webp</Text>
    </>
  );

  const addZone =
    Platform.OS === 'web' ? (
      <label
        htmlFor={WEB_FILE_INPUT_ID}
        style={webLabelStyle}
      >
        <input
          id={WEB_FILE_INPUT_ID}
          type="file"
          accept="image/*"
          multiple
          onChange={handleWebFileChange as any}
          style={{ display: 'none' }}
        />
        {addZoneContent}
      </label>
    ) : (
      <Pressable style={styles.addZone} onPress={pickImageNative}>
        {addZoneContent}
      </Pressable>
    );

  return (
    <View style={styles.container}>
      {uris.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbs}>
          {uris.map((uri, i) => (
            <View key={i} style={styles.thumbWrap}>
              <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
              <Pressable style={styles.removeBtn} onPress={() => onRemove(i)}>
                <Text style={styles.removeText}>×</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
      {uris.length < maxCount && addZone}
    </View>
  );
}

const webLabelStyle = {
  display: 'block',
  cursor: 'pointer',
  borderWidth: 2,
  borderStyle: 'dashed',
  borderColor: '#cbd5e1',
  borderRadius: 12,
  padding: 24,
  textAlign: 'center',
  backgroundColor: '#f8fafc',
};

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  thumbs: { marginBottom: 12 },
  thumbWrap: {
    width: 80,
    height: 80,
    marginRight: 8,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  thumb: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  addZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  addText: { fontSize: 15, color: '#475569', fontWeight: '500' },
  addHint: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
});
