import { Camera, CameraType } from 'expo-camera';
import { useState } from 'react';
import { Button, Text, TouchableOpacity, View } from 'react-native';
import { styled } from 'nativewind';
import { useNavigation } from '@react-navigation/native';


const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

export default function CameraScreen() {
  const navigation = useNavigation();
  const [type, setType] = useState(CameraType.back);
  const [permission, requestPermission] = Camera.useCameraPermissions();

  if (!permission) return <StyledView />;

  if (!permission.granted) {
    return (
      <StyledView className="flex-1 items-center justify-center">
        <Text className="text-center text-white">We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="grant permission" />
      </StyledView>
    );
  }

  function toggleCameraType() {
    setType(current => (current === CameraType.back ? CameraType.front : CameraType.back));
  }
  function saveImage(){
    
    navigation.goBack()
  }

  return (
    <StyledView className="flex-1">
      <Camera style={{ flex: 1 }} type={type}>
        <StyledView className="flex-1 flex-row m-16 bg-transparent">
          <StyledTouchableOpacity className="flex-1 self-end items-center" onPress={toggleCameraType}>
            <Text className="text-2xl font-bold text-white">Flip Camera</Text>
          </StyledTouchableOpacity>
        </StyledView>
        <Button onPress={saveImage} title="Save Image" />
      </Camera>
    </StyledView>
  );
}
