import {
Gesture,
GestureDetector,
} from "react-native-gesture-handler";
import Animated, {
useAnimatedStyle,
useSharedValue,
withSpring,
} from "react-native-reanimated";
import { View, Text } from "react-native";

export default function SortablePinnedPost({
post,
children,
}: any) {
const translateY = useSharedValue(0);
const isDragging = useSharedValue(false);

const panGesture = Gesture.Pan()
.onBegin(() => {
isDragging.value = true;
})
.onUpdate((event) => {
translateY.value = event.translationY;
})
.onEnd(() => {
translateY.value = withSpring(0);
isDragging.value = false;
});

const animatedStyle = useAnimatedStyle(() => ({
transform: [
{
translateY: translateY.value,
},
{
scale: isDragging.value ? 1.02 : 1,
},
],
opacity: isDragging.value ? 0.9 : 1,
zIndex: isDragging.value ? 999 : 0,
}));

return (
<GestureDetector gesture={panGesture}>
<Animated.View style={animatedStyle}>
{/* DRAG HANDLE */}
<View className="flex-row justify-end px-2 pt-2">
<Text className="text-xl leading-5 text-gray-400">
⋮⋮
</Text>
</View>

    {children}
  </Animated.View>
</GestureDetector>

);
}