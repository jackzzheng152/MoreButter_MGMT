// components/labor/WeekSelector.tsx
import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameWeek, startOfMonth, endOfMonth } from "date-fns";

interface WeekSelectorProps {
  selectedWeek: string;
  onWeekChange: (week: string) => void;
  customDate?: Date;
  onCustomDateChange: (date: Date | undefined) => void;
}

export const WeekSelector: React.FC<WeekSelectorProps> = ({
  selectedWeek,
  onWeekChange,
  customDate,
  onCustomDateChange,
}) => {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Set default custom date to current week when "custom" is selected
  React.useEffect(() => {
    if (selectedWeek === "custom" && !customDate) {
      const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      onCustomDateChange(currentWeekStart);
    }
  }, [selectedWeek, customDate, onCustomDateChange]);

  const getWeekOptions = () => {
    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });

    return [
      {
        value: "current",
        label: "Current Week",
        dateRange: `${format(currentWeekStart, "MMM d")} - ${format(addDays(currentWeekStart, 6), "MMM d")}`,
      },
      {
        value: "next",
        label: "Next Week",
        dateRange: `${format(addDays(currentWeekStart, 7), "MMM d")} - ${format(addDays(currentWeekStart, 13), "MMM d")}`,
      },
      {
        value: "week-after",
        label: "Week After Next",
        dateRange: `${format(addDays(currentWeekStart, 14), "MMM d")} - ${format(addDays(currentWeekStart, 20), "MMM d")}`,
      },
    ];
  };

  const weekOptions = getWeekOptions();
  const selectedOption = weekOptions.find(option => option.value === selectedWeek);

  // Get custom week display text
  const getCustomWeekDisplay = () => {
    if (selectedWeek === "custom" && customDate) {
      const weekStart = startOfWeek(customDate, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 6);
      return {
        label: "Custom Week",
        dateRange: `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d")}`
      };
    }
    return null;
  };

  const customWeekDisplay = getCustomWeekDisplay();
  const displayOption = selectedWeek === "custom" ? customWeekDisplay : selectedOption;

  // Generate weeks for the current month view
  const getWeeksInMonth = (date: Date) => {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = startOfWeek(monthEnd, { weekStartsOn: 1 });
    
    const weeks = [];
    let current = startDate;
    
    while (current <= endDate) {
      const weekEnd = addDays(current, 6);
      weeks.push({
        start: current,
        end: weekEnd,
        label: `${format(current, "MMM d")} - ${format(weekEnd, "MMM d")}`,
        isCurrentWeek: isSameWeek(current, new Date(), { weekStartsOn: 1 }),
        isSelected: customDate && isSameWeek(current, customDate, { weekStartsOn: 1 })
      });
      current = addWeeks(current, 1);
    }
    
    return weeks;
  };

  const handleWeekSelect = (weekStart: Date) => {
    onCustomDateChange(weekStart);
    onWeekChange("custom");
    setCalendarOpen(false);
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(subWeeks(currentMonth, 4));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addWeeks(currentMonth, 4));
  };

  const weeks = getWeeksInMonth(currentMonth);

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedWeek} onValueChange={onWeekChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder={displayOption ? displayOption.dateRange : "Select week"}>
            {displayOption && (
              <div>
                <div className="font-medium">{displayOption.label}</div>
                <div className="text-xs text-gray-500">{displayOption.dateRange}</div>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent position="popper" className="w-48">
          {weekOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div>
                <div className="font-medium">{option.label}</div>
                <div className="text-xs text-gray-500">{option.dateRange}</div>
              </div>
            </SelectItem>
          ))}
          <SelectItem value="custom">Custom Week</SelectItem>
        </SelectContent>
      </Select>

      {selectedWeek === "custom" && (
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <CalendarIcon className="w-4 h-4 mr-2" />
              {customDate ? (
                (() => {
                  const weekStart = startOfWeek(customDate, { weekStartsOn: 1 });
                  const weekEnd = addDays(weekStart, 6);
                  return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d")}`;
                })()
              ) : (
                "Pick week"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePreviousMonth}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="text-sm font-medium">
                  {format(currentMonth, "MMMM yyyy")}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNextMonth}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-2">
                {weeks.map((week, index) => (
                  <Button
                    key={index}
                    variant={week.isSelected ? "default" : "outline"}
                    size="sm"
                    className={`w-full justify-start ${
                      week.isCurrentWeek ? "border-blue-500" : ""
                    }`}
                    onClick={() => handleWeekSelect(week.start)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{week.label}</span>
                      {week.isCurrentWeek && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">
                          Current
                        </span>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};