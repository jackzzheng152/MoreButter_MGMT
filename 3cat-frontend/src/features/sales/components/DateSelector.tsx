import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval } from "date-fns";

interface DateSelectorProps {
  selectedDate: Date;
  startDate?: Date;
  endDate?: Date;
  onDateChange: (date: Date) => void;
  onDateRangeChange?: (startDate: Date, endDate: Date) => void;
  showDateRange?: boolean;
}

export const DateSelector: React.FC<DateSelectorProps> = ({
  selectedDate,
  startDate: propStartDate,
  endDate: propEndDate,
  onDateChange,
  onDateRangeChange,
  showDateRange = false,
}) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [startDate, setStartDate] = useState(propStartDate || selectedDate);
  const [endDate, setEndDate] = useState(propEndDate || selectedDate);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectingEndDate, setSelectingEndDate] = useState(false);

  // Update internal state when props change
  useEffect(() => {
    if (propStartDate && propEndDate) {
      setStartDate(propStartDate);
      setEndDate(propEndDate);
    }
  }, [propStartDate, propEndDate]);

  const handleButtonClick = () => {
    setShowCalendar(!showCalendar);
  };

  const handleSingleDateChange = (date: Date) => {
    onDateChange(date);
    setShowCalendar(false);
  };

  const handleDateClick = (date: Date) => {
    if (!showDateRange) {
      handleSingleDateChange(date);
      return;
    }

    if (!selectingEndDate) {
      // First click - select start date
      setStartDate(date);
      setEndDate(date);
      setSelectingEndDate(true);
    } else {
      // Second click - select end date
      if (date < startDate) {
        // If end date is before start date, swap them
        setEndDate(startDate);
        setStartDate(date);
      } else {
        setEndDate(date);
      }
      setSelectingEndDate(false);
      
      // Apply the date range
      if (onDateRangeChange) {
        onDateRangeChange(startDate, date < startDate ? startDate : date);
      }
      setShowCalendar(false);
    }
  };

  const handleApplyDateRange = () => {
    if (onDateRangeChange) {
      onDateRangeChange(startDate, endDate);
    }
    setShowCalendar(false);
    setSelectingEndDate(false);
  };

  const handleCancel = () => {
    setShowCalendar(false);
    setSelectingEndDate(false);
    setStartDate(selectedDate);
    setEndDate(selectedDate);
  };

  const getDisplayText = () => {
    if (showDateRange) {
      if (startDate.getTime() === endDate.getTime()) {
        return format(startDate, "MMM d, yyyy");
      } else {
        return `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`;
      }
    }
    return format(selectedDate, "MMM d, yyyy");
  };

  const getCalendarDays = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    
    // Add padding days to start the calendar on the right day of the week
    const startDay = start.getDay();
    const paddingDays = [];
    for (let i = 0; i < startDay; i++) {
      paddingDays.push(null);
    }
    
    return [...paddingDays, ...days];
  };

  const isDateInRange = (date: Date) => {
    if (!showDateRange) return false;
    return isWithinInterval(date, { start: startDate, end: endDate });
  };

  const isDateSelected = (date: Date) => {
    if (showDateRange) {
      return isSameDay(date, startDate) || isSameDay(date, endDate);
    }
    return isSameDay(date, selectedDate);
  };

  const isDateStart = (date: Date) => {
    return showDateRange && isSameDay(date, startDate);
  };

  const isDateEnd = (date: Date) => {
    return showDateRange && isSameDay(date, endDate);
  };

  return (
    <div className="relative">
      <Button 
        variant="outline" 
        className="w-50 justify-start text-left font-normal"
        onClick={handleButtonClick}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {getDisplayText()}
      </Button>
      
      {showCalendar && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border rounded-md shadow-lg p-4 min-w-80">
          {showDateRange && (
            <div className="mb-3 text-sm text-gray-600">
              {selectingEndDate 
                ? `Select end date (start: ${format(startDate, "MMM d")})`
                : "Select start date"
              }
            </div>
          )}
          
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(addDays(currentMonth, -30))}
            >
              ‹
            </Button>
            <span className="font-medium">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(addDays(currentMonth, 30))}
            >
              ›
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-3">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 p-1">
                {day}
              </div>
            ))}
            
            {getCalendarDays().map((day, index) => (
              <div key={index} className="p-1">
                {day ? (
                  <button
                    onClick={() => handleDateClick(day)}
                    className={`
                      w-8 h-8 rounded-full text-sm font-medium transition-colors
                      ${isDateSelected(day) 
                        ? 'bg-blue-600 text-white' 
                        : isDateInRange(day)
                        ? 'bg-blue-100 text-blue-800'
                        : 'hover:bg-gray-100'
                      }
                      ${isDateStart(day) ? 'rounded-l-full' : ''}
                      ${isDateEnd(day) ? 'rounded-r-full' : ''}
                      ${isDateInRange(day) && !isDateStart(day) && !isDateEnd(day) ? 'rounded-none' : ''}
                    `}
                  >
                    {format(day, "d")}
                  </button>
                ) : (
                  <div className="w-8 h-8" />
                )}
              </div>
            ))}
          </div>

          {/* Action Buttons for Date Range */}
          {showDateRange && (
            <div className="flex gap-2 pt-2 border-t">
              <Button 
                size="sm" 
                onClick={handleApplyDateRange}
                className="flex-1"
                disabled={selectingEndDate}
              >
                Apply
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleCancel}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 