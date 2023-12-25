import { View, Text, Button } from 'react-native'
import React from 'react'
import { useNavigation } from '@react-navigation/native';


const HomeScreen = () => {
    const navigation = useNavigation();

    const openCamera = () =>{
        navigation.navigate('CameraScreen');
    };

    return (
        <View className = "flex-1 items-center justify-center bg-gray-700">
            <Button title="Open Camera" onPress={openCamera} />
        </View>
    )
}

export default HomeScreen