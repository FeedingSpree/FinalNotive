import { StyleSheet, View, Image } from "react-native";
import Notive from "../assets/notive.png";

export default function Splashscreen(){
    return (
        <View style={styles.container}>
            <View>
                <Image source={Notive} style={styles.icon}/>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#C281E8",
    },
    icon:{
        width: 100, height: 100, resizeMode: "cover",
    }
});