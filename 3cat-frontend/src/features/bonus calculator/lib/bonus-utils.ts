import type { BonusAllocation, DailyShiftSummary } from "../types/bonus"

export function groupBonusesByDate(bonusAllocations: BonusAllocation[]): DailyShiftSummary[] {
  const grouped: Record<string, DailyShiftSummary> = {}

  bonusAllocations.forEach((allocation) => {
    if (!grouped[allocation.date]) {
      grouped[allocation.date] = {
        date: allocation.date,
        morningShift: {
          drinkCount: 0,
          bonusPool: 0,
          allocations: [],
        },
        nightShift: {
          drinkCount: 0,
          bonusPool: 0,
          allocations: [],
        },
      }
    }

    const shift = allocation.shiftType === "morning" ? "morningShift" : "nightShift"
    grouped[allocation.date][shift].allocations.push(allocation)
    grouped[allocation.date][shift].drinkCount = allocation.drinkCount
    grouped[allocation.date][shift].bonusPool = allocation.bonusPool
  })

  return Object.values(grouped).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

export function calculateTotalBonuses(bonusAllocations: BonusAllocation[]): number {
  return bonusAllocations.reduce((total, allocation) => total + allocation.bonusAmount, 0)
}

export function getEmployeeBonusSummary(bonusAllocations: BonusAllocation[]) {
  const summary: Record<string, { totalBonus: number; shifts: number }> = {}

  bonusAllocations.forEach((allocation) => {
    if (!summary[allocation.employeeName]) {
      summary[allocation.employeeName] = { totalBonus: 0, shifts: 0 }
    }
    summary[allocation.employeeName].totalBonus += allocation.bonusAmount
    summary[allocation.employeeName].shifts += 1
  })

  return summary
}
