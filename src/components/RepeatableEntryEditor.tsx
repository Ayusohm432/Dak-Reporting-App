import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export type RepeatableEntry = {
  name: string;
  date: string;
  remarks?: string;
};

type Props = {
  title: string;
  nameLabel: string;
  entries: RepeatableEntry[];
  onChange: (entries: RepeatableEntry[]) => void;
  targetCount?: number;
  showRemarks?: boolean;
};

export default function RepeatableEntryEditor({
  title,
  nameLabel,
  entries,
  onChange,
  targetCount,
  showRemarks = false,
}: Props) {
  // Keep the number of visible entry cards aligned with AL / AT / BE.
  // Existing entered values are preserved; extra entries are trimmed if count decreases.
  useEffect(() => {
    if (targetCount === undefined || !Number.isFinite(targetCount)) return;
    const desired = Math.max(0, Math.floor(targetCount));
    if (entries.length === desired) return;

    const next = entries.slice(0, desired);
    while (next.length < desired) next.push({ name: "", date: "", remarks: "" });
    onChange(next);
    // Intentionally respond to count changes; entry edits are handled by the input callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetCount]);

  function updateEntry(index: number, patch: Partial<RepeatableEntry>) {
    onChange(entries.map((entry, i) => i === index ? { ...entry, ...patch } : entry));
  }

  function addEntry() {
    onChange([...entries, { name: "", date: "", remarks: "" }]);
  }

  function removeEntry(index: number) {
    onChange(entries.filter((_, i) => i !== index));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {targetCount !== undefined && (
        <Text style={styles.count}>कुल प्रविष्टियाँ: {targetCount}</Text>
      )}
      {entries.map((entry, index) => (
        <View key={`${title}-${index}`} style={styles.card}>
          <Text style={styles.entryTitle}>प्रविष्टि {index + 1}</Text>
          <Text style={styles.label}>{nameLabel}</Text>
          <TextInput
            value={entry.name}
            onChangeText={(name) => updateEntry(index, { name })}
            placeholder="पंचायत का नाम"
            style={styles.input}
          />
          <Text style={styles.label}>तिथि</Text>
          <TextInput
            value={entry.date}
            onChangeText={(date) => updateEntry(index, { date })}
            placeholder="DD/MM/YYYY"
            style={styles.input}
          />
          {showRemarks && (
            <>
              <Text style={styles.label}>सेफ्टी ऑडिट में निकले मुद्दे (वैकल्पिक)</Text>
              <TextInput
                value={entry.remarks ?? ""}
                onChangeText={(remarks) => updateEntry(index, { remarks })}
                placeholder="मुद्दे लिखें"
                multiline
                style={[styles.input, styles.textarea]}
              />
            </>
          )}
          {targetCount === undefined && (
            <Pressable onPress={() => removeEntry(index)} style={styles.removeButton}>
              <Text style={styles.removeText}>यह प्रविष्टि हटाएँ</Text>
            </Pressable>
          )}
        </View>
      ))}
      {targetCount === undefined && (
        <Pressable onPress={addEntry} style={styles.addButton}>
          <Text style={styles.addText}>+ प्रविष्टि जोड़ें</Text>
        </Pressable>
      )}
      {targetCount !== undefined && targetCount === 0 && (
        <Text style={styles.empty}>ऊपर संख्या 0 है, इसलिए कोई प्रविष्टि आवश्यक नहीं है।</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8, marginBottom: 12 },
  title: { fontSize: 17, fontWeight: "700", color: "#111827", marginBottom: 5 },
  count: { fontSize: 12, color: "#6B7280", marginBottom: 10 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: "#E5E7EB" },
  entryTitle: { fontSize: 14, fontWeight: "700", color: "#1D4ED8", marginBottom: 10 },
  label: { fontSize: 13, color: "#374151", marginBottom: 5, marginTop: 5 },
  input: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, padding: 10, color: "#111827", backgroundColor: "#FFFFFF" },
  textarea: { minHeight: 75, textAlignVertical: "top" },
  removeButton: { marginTop: 10, alignSelf: "flex-start" },
  removeText: { color: "#B91C1C", fontWeight: "600" },
  addButton: { borderWidth: 1, borderColor: "#2563EB", borderRadius: 8, padding: 12, alignItems: "center" },
  addText: { color: "#2563EB", fontWeight: "700" },
  empty: { color: "#6B7280", fontSize: 13, paddingVertical: 8 },
});
