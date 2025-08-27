import type { ShiftData, BonusAllocation, TimesheetEntry, ShiftEligibility, EmployeeEligibility } from "../types/bonus"

// Enhanced mock function with realistic data
export async function fetchShiftData(
  _apiKey: string,
  _locationId: string,
  _startDate: string,
  _endDate: string,
  dates: string[],
): Promise<ShiftData[]> {
  console.log(`Fetching shift data for dates: ${dates.join(", ")}`)

  // Generate mock shift data for each date
  const mockShiftData: ShiftData[] = []

  const employees = [
    { id: "emp1", name: "Alice Johnson", role: "Shift Lead", isLead: true },
    { id: "emp2", name: "Bob Smith", role: "Barista", isLead: false },
    { id: "emp3", name: "Carol Davis", role: "Barista", isLead: false },
    { id: "emp4", name: "David Wilson", role: "Shift Lead", isLead: true },
    { id: "emp5", name: "Emma Brown", role: "Barista", isLead: false },
    { id: "emp6", name: "Frank Miller", role: "Trainee", isLead: false },
  ]

  dates.forEach((date) => {
    // Morning shift (6 AM - 2 PM)
    const morningEmployees = employees.slice(0, 3) // First 3 employees work morning
    morningEmployees.forEach((emp, empIndex) => {
      const startHour = 6 + empIndex * 0.5 // Stagger start times
      const endHour = 14 + empIndex * 0.5

      mockShiftData.push({
        id: `morning-${date}-${emp.id}`,
        employeeId: emp.id,
        employeeName: emp.name,
        role: emp.role,
        jobTitle: emp.role,
        clockIn: `${date}T${String(Math.floor(startHour)).padStart(2, "0")}:${String((startHour % 1) * 60).padStart(2, "0")}:00Z`,
        clockOut: `${date}T${String(Math.floor(endHour)).padStart(2, "0")}:${String((endHour % 1) * 60).padStart(2, "0")}:00Z`,
        hoursWorked: endHour - startHour,
        date: date,
        shiftType: "morning",
        isShiftLead: emp.isLead,
        isTrainee: emp.role === "Trainee",
      })
    })

    // Night shift (2 PM - 10 PM)
    const nightEmployees = employees.slice(2, 6) // Last 4 employees work night (some overlap)
    nightEmployees.forEach((emp, empIndex) => {
      const startHour = 14 + empIndex * 0.25
      const endHour = 22 + empIndex * 0.25

      mockShiftData.push({
        id: `night-${date}-${emp.id}`,
        employeeId: emp.id,
        employeeName: emp.name,
        role: emp.role,
        jobTitle: emp.role,
        clockIn: `${date}T${String(Math.floor(startHour)).padStart(2, "0")}:${String((startHour % 1) * 60).padStart(2, "0")}:00Z`,
        clockOut: `${date}T${String(Math.floor(endHour)).padStart(2, "0")}:${String((endHour % 1) * 60).padStart(2, "0")}:00Z`,
        hoursWorked: endHour - startHour,
        date: date,
        shiftType: "night",
        isShiftLead: emp.isLead,
        isTrainee: emp.role === "Trainee",
      })
    })
  })

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1500))

  console.log(`Generated ${mockShiftData.length} mock shift records`)
  return mockShiftData
}

export function calculateBonusesFromTimesheet(
  drinkCounts: Record<string, { morning: number; night: number }>,
  timesheetData: TimesheetEntry[],
  shiftEligibility: ShiftEligibility[],
  employeeEligibility: EmployeeEligibility[],
): BonusAllocation[] {
  const bonusAllocations: BonusAllocation[] = []

  console.log("Starting bonus calculations with timesheet data...")
  console.log("Drink counts:", drinkCounts)
  console.log("Timesheet entries:", timesheetData.length)
  console.log("Shift eligibility:", shiftEligibility.length)
  console.log("Employee eligibility:", employeeEligibility.length)

  Object.entries(drinkCounts).forEach(([date, counts]) => {
    console.log(`Processing date: ${date}`, counts)

    // Check if shift is eligible
    const morningShiftEligible =
      shiftEligibility.find((s) => s.date === date && s.shiftType === "morning")?.isEligible !== false

    const nightShiftEligible =
      shiftEligibility.find((s) => s.date === date && s.shiftType === "night")?.isEligible !== false

    // Morning shift calculations
    if (counts.morning > 0 && morningShiftEligible) {
      const morningEmployees = timesheetData.filter(
        (entry) => entry.date === date && entry.shiftType === "morning" && !entry.isTrainee,
      )

      console.log(`Morning employees for ${date}:`, morningEmployees.length)

      if (morningEmployees.length > 0) {
        const bonusPool = counts.morning * 0.12
        const allocations = calculateShiftBonusesFromTimesheet(
          morningEmployees,
          bonusPool,
          counts.morning,
          date,
          "morning",
          employeeEligibility,
        )
        bonusAllocations.push(...allocations)
        console.log(`Added ${allocations.length} morning allocations for ${date}`)
      }
    }

    // Night shift calculations
    if (counts.night > 0 && nightShiftEligible) {
      const nightEmployees = timesheetData.filter(
        (entry) => entry.date === date && entry.shiftType === "night" && !entry.isTrainee,
      )

      console.log(`Night employees for ${date}:`, nightEmployees.length)

      if (nightEmployees.length > 0) {
        const bonusPool = counts.night * 0.12
        const allocations = calculateShiftBonusesFromTimesheet(
          nightEmployees,
          bonusPool,
          counts.night,
          date,
          "night",
          employeeEligibility,
        )
        bonusAllocations.push(...allocations)
        console.log(`Added ${allocations.length} night allocations for ${date}`)
      }
    }
  })

  console.log(`Total bonus allocations: ${bonusAllocations.length}`)
  return bonusAllocations
}

function calculateShiftBonusesFromTimesheet(
  employees: TimesheetEntry[],
  bonusPool: number,
  drinkCount: number,
  date: string,
  shiftType: "morning" | "night",
  employeeEligibility: EmployeeEligibility[],
): BonusAllocation[] {
  console.log(`Calculating bonuses for ${shiftType} shift on ${date}`)
  console.log(`Bonus pool: $${bonusPool.toFixed(2)}, Drink count: ${drinkCount}`)

  // Filter out ineligible employees
  const eligibleEmployees = employees.filter((employee) => {
    const empEligibility = employeeEligibility.find(
      (e) => e.employeeId === employee.employeeId && e.date === date && e.shiftType === shiftType,
    )
    return empEligibility?.isEligible !== false
  })

  console.log(`Eligible employees: ${eligibleEmployees.length} out of ${employees.length}`)

  if (eligibleEmployees.length === 0) {
    console.log("No eligible employees for this shift")
    return []
  }

  // Calculate total hours worked by eligible employees
  const totalHours = eligibleEmployees.reduce((sum, employee) => sum + employee.hoursWorked, 0)

  console.log(`Total hours worked by eligible employees: ${totalHours}`)

  if (totalHours === 0) {
    console.log("No hours worked by eligible employees")
    return []
  }

  // Calculate individual bonuses based on pro rata hours
  const allocations = eligibleEmployees.map((employee) => {
    const hoursRatio = employee.hoursWorked / totalHours
    const bonusAmount = bonusPool * hoursRatio

    console.log(
      `${employee.employeeName}: ${employee.hoursWorked}h / ${totalHours}h = ${(hoursRatio * 100).toFixed(1)}% = $${bonusAmount.toFixed(2)}`,
    )

    return {
      date,
      shiftType,
      employeeName: employee.employeeName,
      role: employee.role,
      hoursWorked: employee.hoursWorked,
      multiplier: 1, // No multipliers in pro rata system
      adjustedHours: employee.hoursWorked, // Same as actual hours
      bonusAmount,
      drinkCount,
      bonusPool,
      hoursRatio, // Add this for reference
      totalShiftHours: totalHours, // Add this for reference
    }
  })

  console.log(`Calculated ${allocations.length} individual bonuses using pro rata distribution`)
  return allocations
}

// Keep the original function for backward compatibility with mock data
export function calculateBonuses(
  drinkCounts: Record<string, { morning: number; night: number }>,
  shiftData: ShiftData[],
): BonusAllocation[] {
  const bonusAllocations: BonusAllocation[] = []

  console.log("Starting bonus calculations...")
  console.log("Drink counts:", drinkCounts)
  console.log("Shift data count:", shiftData.length)

  Object.entries(drinkCounts).forEach(([date, counts]) => {
    console.log(`Processing date: ${date}`, counts)

    // Morning shift calculations
    if (counts.morning > 0) {
      const morningShifts = shiftData.filter(
        (shift) => shift.date === date && shift.shiftType === "morning" && !shift.isTrainee,
      )

      console.log(`Morning shifts for ${date}:`, morningShifts.length)

      if (morningShifts.length > 0) {
        const bonusPool = counts.morning * 0.12
        const allocations = calculateShiftBonuses(morningShifts, bonusPool, counts.morning, date, "morning")
        bonusAllocations.push(...allocations)
        console.log(`Added ${allocations.length} morning allocations for ${date}`)
      }
    }

    // Night shift calculations
    if (counts.night > 0) {
      const nightShifts = shiftData.filter(
        (shift) => shift.date === date && shift.shiftType === "night" && !shift.isTrainee,
      )

      console.log(`Night shifts for ${date}:`, nightShifts.length)

      if (nightShifts.length > 0) {
        const bonusPool = counts.night * 0.12
        const allocations = calculateShiftBonuses(nightShifts, bonusPool, counts.night, date, "night")
        bonusAllocations.push(...allocations)
        console.log(`Added ${allocations.length} night allocations for ${date}`)
      }
    }
  })

  console.log(`Total bonus allocations: ${bonusAllocations.length}`)
  return bonusAllocations
}

function calculateShiftBonuses(
  shifts: ShiftData[],
  bonusPool: number,
  drinkCount: number,
  date: string,
  shiftType: "morning" | "night",
): BonusAllocation[] {
  console.log(`Calculating bonuses for ${shiftType} shift on ${date}`)
  console.log(`Bonus pool: $${bonusPool.toFixed(2)}, Drink count: ${drinkCount}`)

  // Calculate total hours worked
  const totalHours = shifts.reduce((sum, shift) => sum + shift.hoursWorked, 0)

  console.log(`Total hours worked: ${totalHours}`)

  if (totalHours === 0) {
    console.log("No hours worked")
    return []
  }

  // Calculate individual bonuses based on pro rata hours
  const allocations = shifts.map((shift) => {
    const hoursRatio = shift.hoursWorked / totalHours
    const bonusAmount = bonusPool * hoursRatio

    return {
      date,
      shiftType,
      employeeName: shift.employeeName,
      role: shift.role,
      hoursWorked: shift.hoursWorked,
      multiplier: 1, // No multipliers in pro rata system
      adjustedHours: shift.hoursWorked, // Same as actual hours
      bonusAmount,
      drinkCount,
      bonusPool,
    }
  })

  console.log(`Calculated ${allocations.length} individual bonuses using pro rata distribution`)
  return allocations
}
