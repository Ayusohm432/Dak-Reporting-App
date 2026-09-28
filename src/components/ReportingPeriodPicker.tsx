import React from "react";
import { format } from "date-fns";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

interface ReportingPeriodPickerProps {
  startDate: Date;
  endDate: Date;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
  minimumYear?: number;
  maximumYear?: number;
}

interface DateCardProps {
  label: string;
  date: Date;
  onChange: (date: Date) => void;
  accent: "start" | "end";
  minimumYear: number;
  maximumYear: number;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function DateCard({
  label,
  date,
  onChange,
  accent,
  minimumYear,
  maximumYear,
}: DateCardProps) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const daysInMonth = new Date(year, month, 0).getDate();
  const years = Array.from(
    { length: maximumYear - minimumYear + 1 },
    (_, index) => minimumYear + index
  );

  function updateDate(nextYear: number, nextMonth: number, nextDay: number) {
    const lastDay = new Date(nextYear, nextMonth, 0).getDate();
    onChange(new Date(nextYear, nextMonth - 1, Math.min(nextDay, lastDay)));
  }

  function openAndroidPicker() {
    DateTimePickerAndroid.open({
      value: date,
      mode: "date",
      display: "calendar",
      design: "material",
      title: `Select ${label.toLowerCase()}`,
      onValueChange: (_event, selectedDate) => onChange(selectedDate),
    });
  }

  function renderWebPickers() {
    return (
      <View style={styles.webPickerRow}>
        <View style={styles.webPickerDay}>
          <Text style={styles.webLabel}>Day</Text>
          <Picker
            selectedValue={day}
            onValueChange={(value) => updateDate(year, month, Number(value))}
            accessibilityLabel={`Select ${label.toLowerCase()} day`}
          >
            {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((value) => (
              <Picker.Item key={value} label={String(value)} value={value} />
            ))}
          </Picker>
        </View>
        <View style={styles.webPickerMonth}>
          <Text style={styles.webLabel}>Month</Text>
          <Picker
            selectedValue={month}
            onValueChange={(value) => updateDate(year, Number(value), day)}
            accessibilityLabel={`Select ${label.toLowerCase()} month`}
          >
            {MONTHS.map((value, index) => (
              <Picker.Item key={value} label={value} value={index + 1} />
            ))}
          </Picker>
        </View>
        <View style={styles.webPickerYear}>
          <Text style={styles.webLabel}>Year</Text>
          <Picker
            selectedValue={year}
            onValueChange={(value) => updateDate(Number(value), month, day)}
            accessibilityLabel={`Select ${label.toLowerCase()} year`}
          >
            {years.map((value) => (
              <Picker.Item key={value} label={String(value)} value={value} />
            ))}
          </Picker>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.dateCard, styles[`${accent}Card`]]}>
      <View style={styles.dateCardHeading}>
        <View style={[styles.dateMarker, styles[`${accent}Marker`]]} />
        <Text style={styles.dateHeading}>{label}</Text>
      </View>
      <Text style={styles.dateValue}>{format(date, "EEE, d MMM yyyy")}</Text>

      {Platform.OS === "ios" && (
        <DateTimePicker
          value={date}
          mode="date"
          display="compact"
          accentColor={accent === "start" ? "#0F766E" : "#2563EB"}
          onValueChange={(_event, selectedDate) => onChange(selectedDate)}
          accessibilityLabel={`Select ${label.toLowerCase()}`}
        />
      )}
      {Platform.OS === "android" && (
        <Pressable
          onPress={openAndroidPicker}
          style={({ pressed }) => [styles.changeButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`Change ${label.toLowerCase()}`}
        >
          <Text style={styles.changeButtonText}>Choose date</Text>
        </Pressable>
      )}
      {Platform.OS === "web" && renderWebPickers()}
    </View>
  );
}

export default function ReportingPeriodPicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  minimumYear = 2000,
  maximumYear = new Date().getFullYear() + 5,
}: ReportingPeriodPickerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Reporting period</Text>
      <Text style={styles.description}>Choose the first and last day to include.</Text>
      <View style={styles.dateGroups}>
        <DateCard
          label="Start date"
          date={startDate}
          onChange={onStartDateChange}
          accent="start"
          minimumYear={minimumYear}
          maximumYear={maximumYear}
        />
        <DateCard
          label="End date"
          date={endDate}
          onChange={onEndDateChange}
          accent="end"
          minimumYear={minimumYear}
          maximumYear={maximumYear}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  heading: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  description: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 4,
    marginBottom: 12,
  },
  dateGroups: {
    gap: 10,
  },
  dateCard: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    gap: 8,
  },
  startCard: {
    backgroundColor: "#F0FDFA",
    borderColor: "#99F6E4",
  },
  endCard: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  dateCardHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateMarker: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  startMarker: {
    backgroundColor: "#0F766E",
  },
  endMarker: {
    backgroundColor: "#2563EB",
  },
  dateHeading: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "600",
  },
  dateValue: {
    color: "#0F172A",
    fontSize: 19,
    fontWeight: "700",
  },
  changeButton: {
    alignSelf: "flex-start",
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  changeButtonText: {
    color: "#1D4ED8",
    fontSize: 13,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
  webPickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  webPickerDay: {
    flex: 0.7,
    minWidth: 52,
  },
  webPickerMonth: {
    flex: 1.7,
    minWidth: 112,
  },
  webPickerYear: {
    flex: 1,
    minWidth: 68,
  },
  webLabel: {
    color: "#64748B",
    fontSize: 12,
    marginLeft: 10,
    marginTop: 4,
  },
});