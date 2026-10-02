import React, { useState } from "react";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { format, isValid, parse } from "date-fns";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

const DATE_FORMAT = "dd/MM/yyyy";
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parseDate(value: string): Date | null {
  for (const dateFormat of [DATE_FORMAT, "yyyy-MM-dd"]) {
    const date = parse(value, dateFormat, new Date());
    if (isValid(date)) return date;
  }
  return null;
}

export default function DatePickerField({ label, value, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const parsedDate = parseDate(value);
  const date = parsedDate ?? new Date();
  const years = Array.from(
    { length: new Date().getFullYear() + 6 - 1900 },
    (_, index) => 1900 + index
  );

  function updateDate(year: number, month: number, day: number) {
    const lastDay = new Date(year, month, 0).getDate();
    onChange(format(new Date(year, month - 1, Math.min(day, lastDay)), DATE_FORMAT));
  }

  function openPicker() {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: date,
        mode: "date",
        display: "calendar",
        design: "material",
        title: `Select ${label.toLowerCase()}`,
        onValueChange: (_event, selectedDate) => {
          if (selectedDate) onChange(format(selectedDate, DATE_FORMAT));
        },
      });
      return;
    }

    setExpanded((current) => !current);
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={openPicker}
        style={({ pressed }) => [styles.dateButton, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${parsedDate ? format(date, DATE_FORMAT) : "choose date"}`}
      >
        <Text style={[styles.dateValue, !parsedDate && styles.placeholder]}>
          {parsedDate ? format(date, DATE_FORMAT) : "DD/MM/YYYY"}
        </Text>
        <Text style={styles.actionText}>
          {expanded ? "बंद करें" : parsedDate ? "बदलें" : "तिथि चुनें"}
        </Text>
      </Pressable>

      {expanded && Platform.OS === "ios" && (
        <DateTimePicker
          value={date}
          mode="date"
          display="inline"
          onValueChange={(_event, selectedDate) => {
            if (selectedDate) onChange(format(selectedDate, DATE_FORMAT));
          }}
          accessibilityLabel={`Select ${label.toLowerCase()}`}
        />
      )}

      {expanded && Platform.OS === "web" && (
        <View style={styles.webPickerRow}>
          <View style={styles.dayPicker}>
            <Picker
              selectedValue={date.getDate()}
              onValueChange={(day) => updateDate(date.getFullYear(), date.getMonth() + 1, Number(day))}
              accessibilityLabel={`Select ${label.toLowerCase()} day`}
            >
              {Array.from(
                { length: new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate() },
                (_, index) => index + 1
              ).map((day) => <Picker.Item key={day} label={String(day)} value={day} />)}
            </Picker>
          </View>
          <View style={styles.monthPicker}>
            <Picker
              selectedValue={date.getMonth() + 1}
              onValueChange={(month) => updateDate(date.getFullYear(), Number(month), date.getDate())}
              accessibilityLabel={`Select ${label.toLowerCase()} month`}
            >
              {MONTHS.map((month, index) => (
                <Picker.Item key={month} label={month} value={index + 1} />
              ))}
            </Picker>
          </View>
          <View style={styles.yearPicker}>
            <Picker
              selectedValue={date.getFullYear()}
              onValueChange={(year) => updateDate(Number(year), date.getMonth() + 1, date.getDate())}
              accessibilityLabel={`Select ${label.toLowerCase()} year`}
            >
              {years.map((year) => (
                <Picker.Item key={year} label={String(year)} value={year} />
              ))}
            </Picker>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 16 },
  label: { color: "#111827", fontSize: 14, fontWeight: "600", marginBottom: 7, lineHeight: 21 },
  dateButton: {
    minHeight: 48,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateValue: { color: "#111827", fontSize: 15 },
  placeholder: { color: "#6B7280" },
  actionText: { color: "#2563EB", fontSize: 13, fontWeight: "600" },
  pressed: { opacity: 0.7 },
  webPickerRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 },
  dayPicker: { flex: 0.7, minWidth: 52 },
  monthPicker: { flex: 1.7, minWidth: 112 },
  yearPicker: { flex: 1, minWidth: 68 },
});