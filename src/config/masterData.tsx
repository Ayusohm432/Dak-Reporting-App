import { View, Text, StyleSheet } from "react-native";

export default function MasterDataScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Master Data</Text>
      <Text>District, block and Panchayat options will be managed here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
  },
});