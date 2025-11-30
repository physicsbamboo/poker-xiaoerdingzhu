import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();

  const handleStartGame = () => {
    router.push({
      pathname: "/playground",
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>小二定主</Text>
      <Text style={styles.subtitle}>Xiao Er Ding Zhu</Text>
      
      <Pressable style={styles.startButton} onPress={handleStartGame}>
        <Text style={styles.startButtonText}>开始游戏</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    color: "#666",
    marginBottom: 40,
    textAlign: "center",
  },
  startButton: {
    backgroundColor: "#2196f3",
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  startButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
});
