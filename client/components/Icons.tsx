import createIconSet from "@expo/vector-icons/createIconSet";
import glyphMap from "@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Feather.json";

const fontFile = require("../../assets/fonts/Feather.ttf");

const AppIcon = createIconSet(glyphMap, "app-feather", fontFile);

export default AppIcon;
