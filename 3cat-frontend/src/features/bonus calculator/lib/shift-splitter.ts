import type { TimesheetEntry } from "../types/timesheet"
import type { ShiftSplitSettings } from "../types/bonus"

export function applyShiftSplitting(
  timesheetData: TimesheetEntry[],
  shiftSettings: ShiftSplitSettings,
): TimesheetEntry[] {
  console.log("Applying shift splitting logic to timesheet data...")
  console.log("Shift settings:", shiftSettings)

  // Check if entries are already split (have morning/night shiftType)
  const alreadySplit = timesheetData.some(entry => 
    entry.shiftType === "morning" || entry.shiftType === "night"
  );

  if (alreadySplit) {
    console.log("✅ Entries are already split with morning/night designations - no additional processing needed");
    return timesheetData;
  }

  console.log("🔄 Processing unassigned shifts for classification...");

  return timesheetData.map((entry) => {
    if (entry.shiftType !== "unassigned") {
      // Already has a shift type assigned, don't change it
      return entry
    }

    // Parse clock-in time to determine shift
    const clockInTime = new Date(entry.clockIn)
    const hour = clockInTime.getHours()
    const minute = clockInTime.getMinutes()
    const timeInMinutes = hour * 60 + minute

    let shiftType: "morning" | "night" = "morning"

    if (shiftSettings.splitMethod === "custom") {
      // Custom split time method
      const [splitHour, splitMinute] = shiftSettings.customSplitTime.split(":").map(Number)
      const splitTimeInMinutes = splitHour * 60 + splitMinute

      shiftType = timeInMinutes >= splitTimeInMinutes ? "night" : "morning"
    } else {
      // Time-based method using morning hours range
      const [morningStart, morningEnd] = shiftSettings.morningHours.split("-")
      const [morningStartHour, morningStartMinute] = morningStart.split(":").map(Number)
      const [morningEndHour, morningEndMinute] = morningEnd.split(":").map(Number)

      const morningStartTime = morningStartHour * 60 + morningStartMinute
      const morningEndTime = morningEndHour * 60 + morningEndMinute

      // If clock-in time is within morning hours range, it's morning shift
      if (timeInMinutes >= morningStartTime && timeInMinutes < morningEndTime) {
        shiftType = "morning"
      } else {
        shiftType = "night"
      }
    }

    console.log(
      `Employee ${entry.employeeName} clocked in at ${clockInTime.toLocaleTimeString()} -> ${shiftType} shift`,
    )

    return {
      ...entry,
      shiftType,
    }
  })
}