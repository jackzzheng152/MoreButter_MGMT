import type { OrderData, ShiftSplitSettings } from "../types/bonus"

export async function parseCSV(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string
        const lines = csv.split("\n")
        const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))

        const data = lines
          .slice(1)
          .filter((line) => line.trim())
          .map((line) => {
            const values = parseCSVLine(line)
            const row: any = {}
            headers.forEach((header, index) => {
              row[header] = values[index] || ""
            })
            return row
          })

        resolve(data)
      } catch (error) {
        reject(new Error("Failed to parse CSV file"))
      }
    }

    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsText(file)
  })
}

function parseCSVLine(line: string): string[] {
  const result = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

export function validateOrderData(rawData: any[]): OrderData[] {
  return rawData
    .map((row, index) => {
      try {
        const orderedAt = row["Ordered At"] || ""
        const items = row["Items"] || ""

        // Parse date and time from "Ordered At" field
        const dateTimeMatch = orderedAt.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s*(\d{1,2}\/\d{1,2}\/\d{4})/)
        let date = ""
        let time = ""

        if (dateTimeMatch) {
          time = dateTimeMatch[1]
          date = dateTimeMatch[2]
        } else {
          // Fallback parsing
          const parts = orderedAt.split(" ")
          if (parts.length >= 3) {
            time = parts[0] + " " + parts[1]
            date = parts[2]
          }
        }

        // Count drinks by splitting items and filtering
        const drinkCount = items ? items.split(";").filter((item: string) => item.trim()).length : 0

        return {
          orderNumber: row["Order #"] || "",
          orderedAt,
          status: row["Status"] || "",
          customer: row["Customer"] || "",
          items,
          total: row["Total"] || "",
          date,
          time,
          drinkCount,
        }
      } catch (error) {
        throw new Error(`Invalid data format at row ${index + 1}`)
      }
    })
    .filter((order) => order.date && order.time && order.drinkCount > 0)
}

export function countDrinksByShift(
  orders: OrderData[],
  shiftSettings: ShiftSplitSettings,
): Record<string, { morning: number; night: number }> {
  const shiftCounts: Record<string, { morning: number; night: number }> = {}

  orders.forEach((order) => {
    if (!shiftCounts[order.date]) {
      shiftCounts[order.date] = { morning: 0, night: 0 }
    }

    const isNightShift = determineShiftType(order.time, shiftSettings)

    if (isNightShift) {
      shiftCounts[order.date].night += order.drinkCount
    } else {
      shiftCounts[order.date].morning += order.drinkCount
    }
  })

  return shiftCounts
}

function determineShiftType(timeStr: string, settings: ShiftSplitSettings): boolean {
  // Parse time string (e.g., "11:12 AM" or "2:30 PM")
  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
  if (!timeMatch) return false

  const hour = Number.parseInt(timeMatch[1])
  const minute = Number.parseInt(timeMatch[2])
  const isPM = timeMatch[3].toUpperCase() === "PM"

  // Convert to 24-hour format
  let hour24 = hour
  if (isPM && hour !== 12) hour24 += 12
  if (!isPM && hour === 12) hour24 = 0

  const orderTime = hour24 * 60 + minute // minutes since midnight

  if (settings.splitMethod === "custom") {
    const [splitHour, splitMinute] = settings.customSplitTime.split(":").map(Number)
    const splitTime = splitHour * 60 + splitMinute
    return orderTime >= splitTime
  } else {
    // Time-based method
    const [morningStart, morningEnd] = settings.morningHours.split("-")
    const [morningStartHour, morningStartMinute] = morningStart.split(":").map(Number)
    const [morningEndHour, morningEndMinute] = morningEnd.split(":").map(Number)

    const morningStartTime = morningStartHour * 60 + morningStartMinute
    const morningEndTime = morningEndHour * 60 + morningEndMinute

    // If order time is within morning hours, it's morning shift
    if (orderTime >= morningStartTime && orderTime < morningEndTime) {
      return false // morning shift
    }
    return true // night shift
  }
}
