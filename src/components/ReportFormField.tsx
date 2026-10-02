import React from "react";
import { Text, TextInput, View, StyleSheet, type FocusEvent } from "react-native";
import { Picker } from "@react-native-picker/picker";
import type { ReportField } from "../config/reportFields";
import DatePickerField from "./DatePickerField";

type Props = {
  field: ReportField;
  value: unknown;
  onChange: (value: unknown) => void;
  onFocus?: (event: FocusEvent) => void;
};

function asText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.join(", ");
  return "";
}

export default function ReportFormField({ field, value, onChange, onFocus }: Props) {
  const textValue = asText(value);

  if (field.type === "date") {
    return (
      <DatePickerField
        label={field.label}
        value={textValue}
        onChange={onChange}
      />
    );
  }

  if (field.type === "select") {
    return (
      <View style={styles.field}>
        <Text style={styles.label}>{field.label}</Text>
        <View style={styles.pickerBox}>
          <Picker selectedValue={textValue} onValueChange={(v) => onChange(String(v))}>
            <Picker.Item label="चुनें..." value="" />
            {(field.options ?? []).map((option) => (
              <Picker.Item key={option} label={option} value={option} />
            ))}
          </Picker>
        </View>
      </View>
    );
  }

  if (field.type === "multiSelect") {
    const selected = Array.isArray(value) ? value.map(String) : textValue ? textValue.split(",").map((v) => v.trim()) : [];
    return (
      <View style={styles.field}>
        <Text style={styles.label}>{field.label}</Text>
        <Text style={styles.hint}>एक या अधिक विकल्प चुनें।</Text>
        {(field.options ?? []).map((option) => {
          const checked = selected.includes(option);
          return (
            <Text
              key={option}
              onPress={() => onChange(checked ? selected.filter((v) => v !== option) : [...selected, option])}
              style={[styles.choice, checked && styles.choiceSelected]}
            >
              {checked ? "☑ " : "☐ "}{option}
            </Text>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{field.label}{field.required ? " *" : ""}</Text>
      <TextInput
        value={textValue}
        onChangeText={(text) => onChange(field.type === "number" ? (text === "" ? "" : text) : text)}
        placeholder={field.placeholder ?? (field.type === "number" ? "0" : "यहाँ लिखें")}
        keyboardType={field.type === "number" ? "numeric" : "default"}
        onFocus={onFocus}
        multiline={field.type === "textarea"}
        textAlignVertical={field.type === "textarea" ? "top" : "center"}
        style={[styles.input, field.type === "textarea" && styles.textarea]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 16 },
  label: { color: "#111827", fontSize: 14, fontWeight: "600", marginBottom: 7, lineHeight: 21 },
  hint: { color: "#6B7280", fontSize: 12, marginBottom: 6 },
  input: { backgroundColor: "#FFFFFF", borderColor: "#D1D5DB", borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: "#111827" },
  textarea: { minHeight: 90 },
  pickerBox: { backgroundColor: "#FFFFFF", borderColor: "#D1D5DB", borderWidth: 1, borderRadius: 9, overflow: "hidden" },
  choice: { padding: 10, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, marginTop: 5, color: "#374151" },
  choiceSelected: { backgroundColor: "#DBEAFE", borderColor: "#2563EB", color: "#1D4ED8" },
});
