import React from "react";
import {
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

import {
  getReportingMonthKey,
  parseReportingMonth,
} from "../services/reportingPeriod";

interface ReportingMonthPickerProps {
  value: string;
  onChange: (reportingMonth: string) => void;
  minimumYear?: number;
  maximumYear?: number;
}

const MONTHS = [
  { label: "January", value: 1 },
  { label: "February", value: 2 },
  { label: "March", value: 3 },
  { label: "April", value: 4 },
  { label: "May", value: 5 },
  { label: "June", value: 6 },
  { label: "July", value: 7 },
  { label: "August", value: 8 },
  { label: "September", value: 9 },
  { label: "October", value: 10 },
  { label: "November", value: 11 },
  { label: "December", value: 12 },
];

export default function ReportingMonthPicker({
  value,
  onChange,
  minimumYear = 2000,
  maximumYear = new Date().getFullYear() + 5,
}: ReportingMonthPickerProps) {
  const { year, month } = parseReportingMonth(value);
  const years = Array.from(
    { length: maximumYear - minimumYear + 1 },
    (_, index) => minimumYear + index
  );

  function handleMonthChange(newMonth: number) {
    onChange(getReportingMonthKey(year, newMonth));
  }

  function handleYearChange(newYear: number) {
    onChange(getReportingMonthKey(newYear, month));
  }

  return (
    <View style={styles.container}>
      <View style={styles.pickerRow}>
        <View style={styles.monthPicker}>
          <Text style={styles.label}>Month</Text>
          <Picker
            selectedValue={month}
            onValueChange={(itemValue) => handleMonthChange(Number(itemValue))}
            accessibilityLabel="Select reporting month"
          >
            {MONTHS.map((item) => (
              <Picker.Item
                key={item.value}
                label={item.label}
                value={item.value}
              />
            ))}
          </Picker>
        </View>

        <View style={styles.yearPicker}>
          <Text style={styles.label}>Year</Text>
          <Picker
            selectedValue={year}
            onValueChange={(itemValue) => handleYearChange(Number(itemValue))}
            accessibilityLabel="Select reporting year"
          >
            {years.map((item) => (
              <Picker.Item key={item} label={String(item)} value={item} />
            ))}
          </Picker>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  heading: {
    color: "#0F766E",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 9,
  },
  pickerRow: {
    flexDirection: "row",
    gap: 8,
  },
  monthPicker: {
    flex: 2,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#F0FDFA",
  },
  yearPicker: {
    flex: 1,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#F8FAFC",
  },
  label: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
    marginLeft: 12,
    marginTop: 7,
  },
});