import React, { useState, useContext, useMemo } from "react";
import {
  FaSave,
  FaChevronLeft,
  FaChevronRight,
  FaToggleOn,
  FaToggleOff,
  FaPlus,
  FaTrash,
  FaClock,
  FaCircle,
  FaCalendarAlt,
  FaInfoCircle,
  FaCheckCircle,
  FaUserMd,
  FaArrowRight,
  FaBan,
  FaCalendarWeek,
  FaCalendar,
  FaCalendarDay,
  FaTimes,
} from "react-icons/fa";
import { ThemeContext } from "../../Theme/ThemeContext";
import "./availability.css";
import Sidebar from "../Hamburger/sidebar";

const daysOfWeek = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dayFullNames = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const Availability = () => {
  const { darkMode } = useContext(ThemeContext);

  // ==================== HEADER STATE ====================
  const [activeView, setActiveView] = useState("weekly");
  const [currentWeekStart, setCurrentWeekStart] = useState(
    new Date(2024, 4, 19),
  );
  const [currentMonth, setCurrentMonth] = useState(new Date(2024, 4, 1));
  const [currentYear, setCurrentYear] = useState(2024);
  const [allSlotsFilter, setAllSlotsFilter] = useState("all");

  // ==================== LEFT PANEL STATE ====================
  const [weeklySchedule, setWeeklySchedule] = useState({
    monday: {
      enabled: true,
      slots: [{ id: 1, start: "09:00", end: "17:00", type: "available" }],
    },
    tuesday: {
      enabled: true,
      slots: [{ id: 1, start: "09:00", end: "17:00", type: "available" }],
    },
    wednesday: {
      enabled: true,
      slots: [{ id: 1, start: "09:00", end: "17:00", type: "available" }],
    },
    thursday: {
      enabled: false,
      slots: [],
    },
    friday: {
      enabled: true,
      slots: [{ id: 1, start: "09:00", end: "17:00", type: "available" }],
    },
    saturday: {
      enabled: false,
      slots: [],
    },
    sunday: {
      enabled: false,
      slots: [],
    },
  });

  // ==================== CUSTOM SLOT MODAL STATE ====================
  const [showCustomSlotModal, setShowCustomSlotModal] = useState(false);
  const [customSlotData, setCustomSlotData] = useState({
    day: "monday",
    start: "09:00",
    end: "17:00",
    type: "available",
  });
  const [customSlotError, setCustomSlotError] = useState("");

  // ==================== CENTER PANEL STATE ====================
  const [selectedCalendarDay, setSelectedCalendarDay] = useState("monday");
  const [clockViewDay, setClockViewDay] = useState("monday");
  const [selectedSlotForClock, setSelectedSlotForClock] = useState(null);

  // Clock slots synced with weekly schedule
  const clockSlots = useMemo(() => {
    const dayData = weeklySchedule[clockViewDay];
    if (!dayData.enabled) return [];
    return dayData.slots.map((slot) => ({
      id: slot.id,
      start: slot.start,
      end: slot.end,
      type: slot.type || "available",
    }));
  }, [weeklySchedule, clockViewDay]);

  // ==================== RIGHT PANEL STATE ====================
  const [doctorStatus] = useState("online");
  const [showSavePopup, setShowSavePopup] = useState(false);
  const [popupVisible, setPopupVisible] = useState(false);
  const [showFullSchedule, setShowFullSchedule] = useState(false);

  // ==================== WEEK DATES MEMO ====================
  const weekDates = useMemo(() => {
    const dates = [];
    const start = new Date(currentWeekStart);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dates.push(d.getDate());
    }
    return dates;
  }, [currentWeekStart]);

  // ==================== MONTH DATA ====================
  const getMonthDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  }, [currentMonth]);

  // ==================== YEAR DATA ====================
  const getYearMonths = useMemo(() => {
    const year = currentYear;
    const monthsData = [];
    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      monthsData.push({
        name: months[month],
        days: daysInMonth,
        firstDay: new Date(year, month, 1).getDay(),
      });
    }
    return monthsData;
  }, [currentYear]);

  // ==================== HEADER FUNCTIONS ====================
  const navigateWeek = (direction) => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + (direction === "next" ? 7 : -7));
    setCurrentWeekStart(newStart);
  };

  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + (direction === "next" ? 1 : -1));
    setCurrentMonth(newMonth);
  };

  const navigateYear = (direction) => {
    setCurrentYear((prev) => prev + (direction === "next" ? 1 : -1));
  };

  const formatHeaderDate = () => {
    if (activeView === "weekly") {
      const end = new Date(currentWeekStart);
      end.setDate(end.getDate() + 6);
      const startStr = currentWeekStart.getDate();
      const endStr = end.getDate();
      const monthStr = end.toLocaleString("default", { month: "short" });
      const yearStr = end.getFullYear();
      return `${startStr} - ${endStr} ${monthStr}, ${yearStr}`;
    } else if (activeView === "monthly") {
      return `${months[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
    } else {
      return `${currentYear}`;
    }
  };

  // ==================== LEFT PANEL FUNCTIONS ====================
  const toggleDayAvailability = (day) => {
    setWeeklySchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled,
      },
    }));
  };

  const addTimeSlot = (day) => {
    const dayData = weeklySchedule[day];
    let startTime = "09:00";
    let endTime = "17:00";

    if (dayData.slots.length > 0) {
      const lastSlot = dayData.slots[dayData.slots.length - 1];
      startTime = lastSlot.end;

      const [hStr, mStr] = lastSlot.end.split(":");
      const hours = Number(hStr);
      const minutes = Number(mStr);
      const newHours = (hours + 1) % 24;

      endTime = `${newHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    }

    const newSlot = {
      id: Date.now(),
      start: startTime,
      end: endTime,
      type: "available",
    };
    setWeeklySchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: [...prev[day].slots, newSlot],
      },
    }));
  };

  const removeTimeSlot = (day, slotId) => {
    setWeeklySchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.filter((slot) => slot.id !== slotId),
      },
    }));
  };

  const updateSlotType = (day, slotId, type) => {
    setWeeklySchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.map((slot) =>
          slot.id === slotId ? { ...slot, type } : slot,
        ),
      },
    }));
  };

  const updateSlotTime = (day, slotId, field, value) => {
    setWeeklySchedule((prev) => {
      const updated = {
        ...prev,
        [day]: {
          ...prev[day],
          slots: prev[day].slots.map((slot) =>
            slot.id === slotId ? { ...slot, [field]: value } : slot,
          ),
        },
      };
      if (selectedSlotForClock && selectedSlotForClock.id === slotId) {
        const updatedSlot = updated[day].slots.find((s) => s.id === slotId);
        if (updatedSlot) {
          setSelectedSlotForClock(updatedSlot);
        }
      }
      return updated;
    });
  };

  // ==================== CUSTOM SLOT MODAL FUNCTIONS ====================
  const handleCustomSlotClick = () => {
    setShowCustomSlotModal(true);
    setCustomSlotError("");
    setCustomSlotData({
      day: "monday",
      start: "09:00",
      end: "17:00",
      type: "available",
    });
  };

  const handleCustomSlotSubmit = () => {
    const { day, start, end, type } = customSlotData;

    const toMinutes = (hhmm) => {
      if (!hhmm || !hhmm.includes(":")) return NaN;
      const [hh, mm] = hhmm.split(":");
      const h = Number(hh);
      const m = Number(mm);
      if (Number.isNaN(h) || Number.isNaN(m)) return NaN;
      return h * 60 + m;
    };

    const startMinutes = toMinutes(start);
    const endMinutes = toMinutes(end);

    if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes)) {
      setCustomSlotError("Enter valid start and end time");
      return;
    }

    if (endMinutes <= startMinutes) {
      setCustomSlotError("End time must be after start time");
      return;
    }

    const newSlot = {
      id: Date.now(),
      start: start,
      end: end,
      type: type,
    };

    setWeeklySchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: true,
        slots: [...prev[day].slots, newSlot],
      },
    }));

    setShowCustomSlotModal(false);
    setClockViewDay(day);
    setSelectedSlotForClock(newSlot);
    setCustomSlotError("");
  };

  const handleCustomSlotChange = (e) => {
    const { name, value } = e.target;
    setCustomSlotData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setCustomSlotError("");
  };

  // ==================== CENTER PANEL FUNCTIONS ====================
  const getCalendarDaySlots = (dayIndex) => {
    const dayKey = daysOfWeek[dayIndex];
    const dayData = weeklySchedule[dayKey];
    if (!dayData.enabled) return [];
    return dayData.slots.map((slot, idx) => ({
      id: idx,
      start: slot.start,
      end: slot.end,
      type: slot.type || "available",
    }));
  };

  const handleSlotClick = (slot) => {
    setSelectedSlotForClock(slot);
  };

  // ==================== RIGHT PANEL FUNCTIONS ====================
  const getNextAvailableSlot = () => {
    const today = new Date().getDay();
    const dayKeys = daysOfWeek.slice(today).concat(daysOfWeek.slice(0, today));

    for (let day of dayKeys) {
      const dayData = weeklySchedule[day];
      if (dayData.enabled && dayData.slots.length > 0) {
        const slot = dayData.slots[0];
        return {
          day: dayFullNames[daysOfWeek.indexOf(day)],
          start: slot.start,
          end: slot.end,
          duration: "Available",
        };
      }
    }
    return {
      day: "No slots",
      start: "N/A",
      end: "N/A",
      duration: "N/A",
    };
  };

  const getUpcomingDays = () => {
    const today = new Date().getDay();
    const upcoming = [];
    for (let i = 1; i <= 3; i++) {
      const dayIndex = (today + i) % 7;
      const dayKey = daysOfWeek[dayIndex];
      const dayData = weeklySchedule[dayKey];
      const dayName = i === 1 ? "Tomorrow" : dayFullNames[dayIndex];

      if (dayData.enabled && dayData.slots.length > 0) {
        const slot = dayData.slots[0];
        upcoming.push({
          day: dayName,
          label: `${slot.start} - ${slot.end}`,
          available: true,
        });
      } else {
        upcoming.push({
          day: dayName,
          label: "Not Available",
          available: false,
        });
      }
    }
    return upcoming;
  };

  const handleSaveChanges = () => {
    setShowSavePopup(true);
    setPopupVisible(true);
    setTimeout(() => {
      setPopupVisible(false);
      setTimeout(() => setShowSavePopup(false), 600);
    }, 2500);
  };

  const isDayAvailable = (dayKey) => weeklySchedule[dayKey].enabled;

  // ==================== RENDER HELPERS ====================
  const renderDayToggleIcon = (enabled) => {
    return enabled ? (
      <FaToggleOn className="avail-toggle-icon avail-toggle-on" />
    ) : (
      <FaToggleOff className="avail-toggle-icon avail-toggle-off" />
    );
  };

  const isPublicHoliday = (date) => {
    const holidays = new Set(["2024-01-01", "2024-12-25"]);

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return holidays.has(`${yyyy}-${mm}-${dd}`);
  };

  const isDayInMonthAvailable = (day) => {
    const dayIndex = day % 7;
    const dayKey = daysOfWeek[dayIndex];
    return weeklySchedule[dayKey]?.enabled || false;
  };

  // ==================== CLOCK RENDER FUNCTIONS ====================
  const renderClockNumbers = () => {
    const numbers = [];
    const centerX = 50;
    const centerY = 50;
    const radius = 38;

    for (let i = 1; i <= 12; i++) {
      const angle = (i / 12) * 360 - 90;
      const radian = (angle * Math.PI) / 180;
      const x = centerX + radius * Math.cos(radian);
      const y = centerY + radius * Math.sin(radian);
      numbers.push(
        <span
          key={i}
          className="avail-clock-number"
          style={{
            position: "absolute",
            left: `${x}%`,
            top: `${y}%`,
            transform: "translate(-50%, -50%)",
            fontSize: "12px",
            fontWeight: "700",
            color: darkMode ? "#94a3b8" : "#475569",
            zIndex: 3,
          }}
        >
          {i}
        </span>,
      );
    }
    return numbers;
  };

  const renderClockSlots = () => {
    if (!clockSlots.length) return null;

    return clockSlots.map((slot) => {
      const [startHour, startMin] = slot.start.split(":").map(Number);
      const [endHour, endMin] = slot.end.split(":").map(Number);

      const startTotal = startHour * 60 + startMin;
      const endTotal = endHour * 60 + endMin;

      const startAngle = (startTotal / 720) * 360 - 90;
      const endAngle = (endTotal / 720) * 360 - 90;

      const radius = 42;
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = 50 + radius * Math.cos(startRad);
      const y1 = 50 + radius * Math.sin(startRad);
      const x2 = 50 + radius * Math.cos(endRad);
      const y2 = 50 + radius * Math.sin(endRad);

      const largeArc = endTotal - startTotal > 360 ? 1 : 0;

      const isBreak = slot.type === "break";
      const color = isBreak ? "#fbbf24" : "#38bdf8";
      const isActive =
        selectedSlotForClock && selectedSlotForClock.id === slot.id;

      return (
        <g key={slot.id} className="avail-clock-slot-arc">
          <path
            d={`M ${x1}% ${y1}% A ${radius}% ${radius}% 0 ${largeArc} 1 ${x2}% ${y2}%`}
            fill="none"
            stroke={color}
            strokeWidth={isActive ? "6" : "4"}
            strokeOpacity={isActive ? "0.9" : "0.6"}
            className={`avail-clock-arc-path ${isActive ? "avail-clock-arc-active" : ""}`}
            style={{
              filter: isActive ? `drop-shadow(0 0 8px ${color}66)` : "none",
              cursor: "pointer",
              pointerEvents: "auto",
            }}
          />
          {isActive && (
            <>
              <text
                x="50%"
                y="35%"
                textAnchor="middle"
                fontSize="10"
                fill={darkMode ? "#e2e8f0" : "#1e293b"}
                className="avail-clock-slot-label"
              >
                {slot.start} - {slot.end}
              </text>
              <text
                x="50%"
                y="45%"
                textAnchor="middle"
                fontSize="8"
                fill={color}
                className="avail-clock-slot-type-label"
              >
                {isBreak ? "Break" : "Available"}
              </text>
            </>
          )}
        </g>
      );
    });
  };

  // ==================== RENDER VIEW CONTENT ====================
  const renderViewContent = () => {
    switch (activeView) {
      case "weekly":
        return renderWeeklyView();
      case "monthly":
        return renderMonthlyView();
      case "yearly":
        return renderYearlyView();
      default:
        return renderWeeklyView();
    }
  };

  const renderWeeklyView = () => {
    return (
      <div className="avail-calendar-grid">
        <div className="avail-calendar-days-header">
          {dayLabels.map((label, idx) => {
            const dayKey = daysOfWeek[idx];
            const isSelected = selectedCalendarDay === dayKey;
            const isEnabled = isDayAvailable(dayKey);
            return (
              <div
                key={label}
                className={`avail-calendar-day-header ${isSelected ? "avail-day-selected" : ""} ${!isEnabled ? "avail-day-header-disabled" : ""}`}
                onClick={() => setSelectedCalendarDay(dayKey)}
              >
                <span className="avail-day-label">{label}</span>
                <span
                  className={`avail-day-number ${isSelected ? "avail-number-selected" : ""}`}
                >
                  {weekDates[idx]}
                </span>
              </div>
            );
          })}
        </div>

        <div className="avail-calendar-body">
          <div className="avail-calendar-columns">
            {daysOfWeek.map((day, dayIdx) => {
              const dayKey = daysOfWeek[dayIdx];
              const isEnabled = isDayAvailable(dayKey);
              const daySlots = getCalendarDaySlots(dayIdx);

              let filteredDaySlots = daySlots;
              if (allSlotsFilter === "available") {
                filteredDaySlots = daySlots.filter(
                  (s) => s.type === "available",
                );
              } else if (allSlotsFilter === "break") {
                filteredDaySlots = daySlots.filter((s) => s.type === "break");
              } else if (allSlotsFilter === "not-available") {
                if (isEnabled) {
                  return (
                    <div key={day} className="avail-calendar-column">
                      <div className="avail-column-not-available">
                        <span className="avail-col-available-text">
                          Available
                        </span>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div key={day} className="avail-calendar-column">
                      <div className="avail-column-not-available">
                        <FaBan className="avail-col-not-avail-icon" />
                        <span>Not Available</span>
                      </div>
                    </div>
                  );
                }
              }

              return (
                <div key={day} className="avail-calendar-column">
                  {isEnabled ? (
                    <div className="avail-column-slots">
                      {filteredDaySlots.map((slot, sIdx) => {
                        const startTime = slot.start;
                        const endTime = slot.end;
                        const [startHourStr, startMinStr] =
                          startTime.split(":");
                        const startHour = parseInt(startHourStr);
                        const startMin = parseInt(startMinStr);

                        const [endHourStr, endMinStr] = endTime.split(":");
                        const endHour = parseInt(endHourStr);
                        const endMin = parseInt(endMinStr);

                        const startTotal = startHour * 60 + startMin;
                        const endTotal = endHour * 60 + endMin;

                        const duration = endTotal - startTotal;
                        const topPosition = ((startTotal - 480) / 720) * 100;
                        const heightPercent = Math.max(
                          (duration / 720) * 100,
                          5,
                        );

                        return (
                          <div
                            key={`${day}-slot-${sIdx}`}
                            className={`avail-calendar-slot-block ${slot.type === "break" ? "avail-slot-break" : ""}`}
                            style={{
                              top: `${Math.max(0, Math.min(95, topPosition))}%`,
                              height: `${Math.min(95 - topPosition, heightPercent)}%`,
                            }}
                            onClick={() => handleSlotClick(slot)}
                          >
                            <span className="avail-block-start">
                              {slot.start}
                            </span>
                            <span className="avail-block-end">{slot.end}</span>
                            {slot.type === "break" && (
                              <span className="avail-slot-break-label">
                                Break
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="avail-column-not-available">
                      <FaBan className="avail-col-not-avail-icon" />
                      <span>Not Available</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderMonthlyView = () => {
    return (
      <div className="avail-monthly-grid">
        <div className="avail-monthly-header">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="avail-monthly-day-label">
              {day}
            </div>
          ))}
        </div>
        <div className="avail-monthly-days">
          {getMonthDays.map((day, index) => {
            const date =
              day &&
              new Date(
                currentMonth.getFullYear(),
                currentMonth.getMonth(),
                day,
              );
            const isHoliday = !!(date && isPublicHoliday(date));

            const weekdayIndex = date ? date.getDay() : null;
            const isAvailable =
              date && weekdayIndex != null
                ? isDayInMonthAvailable(weekdayIndex)
                : false;

            return (
              <div
                key={index}
                className={`avail-monthly-day ${!day ? "avail-empty-day" : ""} ${isAvailable ? "avail-monthly-day-available" : ""}`}
              >
                {day && (
                  <>
                    <span className="avail-monthly-day-number">{day}</span>
                    {isHoliday && (
                      <div className="avail-monthly-slot-indicator">
                        <span className="avail-dot-holiday" />
                      </div>
                    )}
                    {!isHoliday && isAvailable && (
                      <div className="avail-monthly-slot-indicator">
                        <span className="avail-dot-available"></span>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderYearlyView = () => {
    return (
      <div className="avail-yearly-grid">
        {getYearMonths.map((month, index) => {
          const monthNumber = index;
          return (
            <div key={index} className="avail-yearly-month">
              <h4 className="avail-yearly-month-name">{month.name}</h4>
              <div className="avail-yearly-month-grid">
                {["S", "M", "T", "W", "T", "F", "S"].map((day) => (
                  <div key={day} className="avail-yearly-day-label">
                    {day}
                  </div>
                ))}
                {Array.from({ length: month.firstDay }, (_, i) => (
                  <div key={`empty-${i}`} className="avail-yearly-empty"></div>
                ))}
                {Array.from({ length: month.days }, (_, i) => {
                  const date = new Date(currentYear, monthNumber, i + 1);
                  const isHoliday = !!isPublicHoliday(date);
                  const weekdayIndex = date.getDay();
                  const isAvailable = isDayInMonthAvailable(weekdayIndex);

                  return (
                    <div
                      key={i}
                      className={`avail-yearly-day ${
                        isAvailable ? "avail-yearly-day-available" : ""
                      } ${isHoliday ? "avail-yearly-day-holiday" : ""}`}
                    >
                      {i + 1}
                      {isHoliday ? (
                        <span className="avail-yearly-holiday-dot" />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ==================== MAIN RETURN ====================
  return (
    <div
      className={`avail-availability-wrapper ${darkMode ? "dark" : "light"}`}
    >
      <Sidebar />
      <div className="avail-availability-layout">
        <main className="avail-main-content">
          {/* =========================== HEADER SECTION ====================== */}
          <header className="avail-header">
            <div className="avail-header-section">
              <div className="avail-header-left">
                <div className="avail-view-tabs">
                  <button
                    className={`avail-tab-btn ${activeView === "weekly" ? "avail-tab-active" : ""}`}
                    onClick={() => setActiveView("weekly")}
                  >
                    <FaCalendarWeek className="avail-tab-icon" />
                    Weekly
                  </button>
                  <button
                    className={`avail-tab-btn ${activeView === "monthly" ? "avail-tab-active" : ""}`}
                    onClick={() => setActiveView("monthly")}
                  >
                    <FaCalendarDay className="avail-tab-icon" />
                    Monthly
                  </button>
                  <button
                    className={`avail-tab-btn ${activeView === "yearly" ? "avail-tab-active" : ""}`}
                    onClick={() => setActiveView("yearly")}
                  >
                    <FaCalendar className="avail-tab-icon" />
                    Yearly
                  </button>
                </div>
              </div>

              <div className="avail-header-center">
                <button
                  className="avail-nav-btn"
                  onClick={() => {
                    if (activeView === "weekly") navigateWeek("prev");
                    else if (activeView === "monthly") navigateMonth("prev");
                    else navigateYear("prev");
                  }}
                >
                  <FaChevronLeft />
                </button>
                <span className="avail-date-range">
                  <FaCalendarAlt className="avail-date-icon" />
                  {formatHeaderDate()}
                </span>
                <button
                  className="avail-nav-btn"
                  onClick={() => {
                    if (activeView === "weekly") navigateWeek("next");
                    else if (activeView === "monthly") navigateMonth("next");
                    else navigateYear("next");
                  }}
                >
                  <FaChevronRight />
                </button>
              </div>

              <div className="avail-header-right">
                <div className="avail-filter-dropdown">
                  <select
                    value={allSlotsFilter}
                    onChange={(e) => setAllSlotsFilter(e.target.value)}
                    className="avail-filter-select"
                  >
                    <option value="all">All Slots</option>
                    <option value="available">Available</option>
                    <option value="break">Break</option>
                    <option value="not-available">Not Available</option>
                  </select>
                </div>
                <button className="avail-save-btn" onClick={handleSaveChanges}>
                  <FaSave className="avail-save-icon" />
                  Save Changes
                </button>
              </div>
            </div>
          </header>

          {/* ========== CONTENT AREA ========== */}
          <div className="avail-content-area">
            {/* =================== LEFT PANEL - Set Weekly Availability ===================== */}
            <aside className="avail-left-panel">
              <div className="avail-panel-header">
                <h3 className="avail-panel-title">Set Weekly Availability</h3>
                <p className="avail-panel-subtitle">
                  Define your regular weekly schedule
                </p>
              </div>

              <div className="avail-days-list">
                {daysOfWeek.map((day, index) => {
                  const dayData = weeklySchedule[day];
                  const isEnabled = dayData.enabled;

                  return (
                    <div
                      key={day}
                      className={`avail-day-item ${isEnabled ? "avail-day-enabled" : "avail-day-disabled"}`}
                    >
                      <div className="avail-day-header">
                        <span className="avail-day-name">
                          {dayFullNames[index]}
                        </span>
                        <button
                          className="avail-day-toggle-btn"
                          onClick={() => toggleDayAvailability(day)}
                        >
                          {renderDayToggleIcon(isEnabled)}
                        </button>
                      </div>

                      {isEnabled ? (
                        <div className="avail-day-slots">
                          {dayData.slots.map((slot) => (
                            <div key={slot.id} className="avail-slot-row">
                              <input
                                type="time"
                                className="avail-slot-time-input"
                                value={slot.start}
                                onChange={(e) => {
                                  updateSlotTime(
                                    day,
                                    slot.id,
                                    "start",
                                    e.target.value,
                                  );
                                }}
                              />
                              <span className="avail-slot-separator">-</span>
                              <input
                                type="time"
                                className="avail-slot-time-input"
                                value={slot.end}
                                onChange={(e) => {
                                  updateSlotTime(
                                    day,
                                    slot.id,
                                    "end",
                                    e.target.value,
                                  );
                                }}
                              />
                              <select
                                className="avail-slot-type-select"
                                value={slot.type || "available"}
                                onChange={(e) => {
                                  updateSlotType(day, slot.id, e.target.value);
                                }}
                              >
                                <option value="available">Available</option>
                                <option value="break">Break</option>
                              </select>
                              <div className="avail-slot-actions">
                                <button
                                  className="avail-slot-btn avail-slot-add"
                                  onClick={() => addTimeSlot(day)}
                                >
                                  <FaPlus />
                                </button>
                                <button
                                  className="avail-slot-btn avail-slot-remove"
                                  onClick={() => removeTimeSlot(day, slot.id)}
                                >
                                  <FaTrash />
                                </button>
                              </div>
                            </div>
                          ))}
                          {dayData.slots.length === 0 && (
                            <div className="avail-no-slots">No slots added</div>
                          )}
                        </div>
                      ) : (
                        <div className="avail-not-available-text">
                          <FaBan className="avail-not-available-icon" />
                          Not Available
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                className="avail-custom-slot-btn"
                onClick={handleCustomSlotClick}
              >
                <FaPlus className="avail-custom-slot-icon" />
                Add Custom Slot
              </button>
            </aside>

            {/* ===================== CENTER PANEL - Calendar + Clock View ======================== */}
            <section className="avail-center-panel">
              <div className="avail-calendar-section">
                <div className="avail-calendar-header">
                  <h3 className="avail-calendar-title">
                    {activeView === "weekly" && "Weekly Calendar"}
                    {activeView === "monthly" && "Monthly Calendar"}
                    {activeView === "yearly" && "Yearly Calendar"}
                  </h3>
                </div>
                {renderViewContent()}
                <div className="avail-calendar-legend">
                  <div className="avail-legend-item">
                    <span className="avail-legend-dot avail-legend-available"></span>
                    <span>Available</span>
                  </div>
                  <div className="avail-legend-item">
                    <span className="avail-legend-dot avail-legend-break"></span>
                    <span>Break</span>
                  </div>
                  <div className="avail-legend-item">
                    <span className="avail-legend-dot avail-legend-not-available"></span>
                    <span>Not Available</span>
                  </div>
                </div>
              </div>

              {/*==================== Clock View =======================*/}
              <div className="avail-clock-section">
                <div className="avail-clock-header">
                  <FaClock className="avail-clock-icon" />
                  <span className="avail-clock-title">Clock View</span>
                  <span className="avail-clock-subtitle">(Select a Day)</span>
                </div>

                <div className="avail-clock-days-row">
                  {dayLabels.map((label, idx) => {
                    const dayKey = daysOfWeek[idx];
                    const isSelected = clockViewDay === dayKey;
                    const isEnabled = isDayAvailable(dayKey);
                    return (
                      <button
                        key={dayKey}
                        className={`avail-clock-day-pill ${isSelected ? "avail-clock-day-selected" : ""} ${!isEnabled ? "avail-clock-day-disabled" : ""}`}
                        onClick={() => {
                          setClockViewDay(dayKey);
                          const dayData = weeklySchedule[dayKey];
                          if (dayData.slots.length > 0) {
                            setSelectedSlotForClock(dayData.slots[0]);
                          } else {
                            setSelectedSlotForClock(null);
                          }
                        }}
                        disabled={!isEnabled}
                      >
                        <span className="avail-clock-day-name">{label}</span>
                        <span className="avail-clock-day-date">
                          {weekDates[idx]}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="avail-clock-container">
                  <div className="avail-clock-face">
                    {renderClockNumbers()}

                    <div className="avail-clock-am">AM</div>
                    <div className="avail-clock-pm">PM</div>

                    <div className="avail-clock-center"></div>

                    {selectedSlotForClock && (
                      <>
                        <div
                          className="avail-clock-hand avail-clock-hour-hand"
                          style={{
                            transform: `translateX(-50%) rotate(${(parseInt(selectedSlotForClock.start.split(":")[0]) % 12) * 30 + parseInt(selectedSlotForClock.start.split(":")[1]) * 0.5}deg)`,
                          }}
                        ></div>
                        <div
                          className="avail-clock-hand avail-clock-minute-hand"
                          style={{
                            transform: `translateX(-50%) rotate(${parseInt(selectedSlotForClock.start.split(":")[1]) * 6}deg)`,
                          }}
                        ></div>
                      </>
                    )}

                    <svg
                      className="avail-clock-svg"
                      viewBox="0 0 100 100"
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        pointerEvents: "none",
                        zIndex: 2,
                      }}
                    >
                      {renderClockSlots()}
                    </svg>

                    {selectedSlotForClock && (
                      <div className="avail-clock-slot-indicator">
                        <span className="avail-clock-slot-time-display">
                          {selectedSlotForClock.start} -{" "}
                          {selectedSlotForClock.end}
                          <span className="avail-clock-slot-type-badge">
                            {selectedSlotForClock.type === "break"
                              ? " Break"
                              : " Available"}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="avail-clock-slots-list">
                  {clockSlots.length > 0 ? (
                    clockSlots.map((slot) => (
                      <div
                        key={slot.id}
                        className={`avail-clock-slot-item ${slot.type === "break" ? "avail-clock-slot-break" : "avail-clock-slot-available"} ${selectedSlotForClock && selectedSlotForClock.id === slot.id ? "avail-clock-slot-selected" : ""}`}
                        onClick={() => handleSlotClick(slot)}
                      >
                        <div className="avail-clock-slot-info">
                          <span className="avail-clock-slot-time">
                            {slot.start}
                          </span>
                          <span className="avail-clock-slot-separator">-</span>
                          <span className="avail-clock-slot-time">
                            {slot.end}
                          </span>
                          <span
                            className={`avail-clock-slot-badge ${slot.type === "break" ? "avail-badge-break" : "avail-badge-available"}`}
                          >
                            {slot.type === "break" ? "Break" : "Available"}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="avail-clock-no-slots">
                      <FaClock className="avail-clock-no-slots-icon" />
                      <span>No slots available for this day</span>
                    </div>
                  )}
                </div>

                <div className="avail-clock-note">
                  <FaInfoCircle className="avail-note-icon" />
                  <span>Click on any slot to view it on the clock</span>
                </div>
              </div>
            </section>

            {/* ======================== RIGHT PANEL Doctor Status & Info===================== */}
            <aside className="avail-right-panel">
              <div className="avail-doctor-status-section">
                <h3 className="avail-section-title">Doctor Status</h3>
                <div className="avail-status-card">
                  <div className="avail-status-header">
                    <FaCircle
                      className={`avail-status-dot ${doctorStatus === "online" ? "avail-dot-online" : "avail-dot-offline"}`}
                    />
                    <span className="avail-status-text">
                      {doctorStatus === "online" ? "Online Now" : "Offline"}
                    </span>
                  </div>
                  <p className="avail-status-subtext">
                    Available for Consultation
                  </p>
                  <div className="avail-doctor-avatar-area">
                    <div className="avail-avatar-wrapper">
                      <FaUserMd className="avail-doctor-icon" />
                      <div className="avail-avatar-badge">
                        <FaCheckCircle />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="avail-next-available-section">
                <h4 className="avail-subsection-title">
                  Next Available (If Offline)
                </h4>
                <div className="avail-next-slot-card">
                  <div className="avail-next-slot-header">
                    <FaClock className="avail-next-icon" />
                    <span className="avail-next-label">
                      {getNextAvailableSlot().day}
                    </span>
                  </div>
                  <div className="avail-next-time">
                    {getNextAvailableSlot().start} -{" "}
                    {getNextAvailableSlot().end}
                  </div>
                  <div className="avail-next-duration">
                    Duration: {getNextAvailableSlot().duration}
                  </div>
                </div>
              </div>

              <div className="avail-upcoming-section">
                <h4 className="avail-subsection-title">Upcoming Days</h4>
                <div className="avail-upcoming-list">
                  {getUpcomingDays().map((item, idx) => (
                    <div key={idx} className="avail-upcoming-item">
                      <div className="avail-upcoming-day">{item.day}</div>
                      <div
                        className={`avail-upcoming-time ${!item.available ? "avail-upcoming-unavailable" : ""}`}
                      >
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  className="avail-view-schedule-link"
                  onClick={() => setShowFullSchedule(!showFullSchedule)}
                >
                  {showFullSchedule
                    ? "Hide Full Schedule"
                    : "View Full Schedule"}
                  <FaArrowRight className="avail-schedule-arrow" />
                </button>
                {showFullSchedule && (
                  <div className="avail-full-schedule">
                    <h5>Complete Weekly Schedule</h5>
                    {daysOfWeek.map((day) => {
                      const dayData = weeklySchedule[day];
                      return (
                        <div key={day} className="avail-schedule-day">
                          <span className="avail-schedule-day-name">
                            {dayFullNames[daysOfWeek.indexOf(day)]}
                          </span>
                          <span className="avail-schedule-status">
                            {dayData.enabled
                              ? dayData.slots.length > 0
                                ? dayData.slots.map((slot, idx) => (
                                    <span
                                      key={idx}
                                      className={`avail-schedule-time ${slot.type === "break" ? "avail-schedule-time-break" : ""}`}
                                    >
                                      {slot.start} - {slot.end}
                                      {slot.type === "break" && " (Break)"}
                                      {idx < dayData.slots.length - 1 && ", "}
                                    </span>
                                  ))
                                : "No slots"
                              : "Not Available"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="avail-note-box">
                <div className="avail-note-header">
                  <FaInfoCircle className="avail-note-box-icon" />
                  <span>Note</span>
                </div>
                <p className="avail-note-text">
                  Please press "Save Changes" button to update your availability
                  schedule.
                </p>
              </div>
            </aside>
          </div>
        </main>
      </div>

      {/* =========================== CUSTOM SLOT MODAL========================== */}
      {showCustomSlotModal && (
        <div
          className="avail-modal-overlay"
          onClick={() => setShowCustomSlotModal(false)}
        >
          <div
            className="avail-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="avail-modal-header">
              <h3>Add Custom Slot</h3>
              <button
                className="avail-modal-close"
                onClick={() => setShowCustomSlotModal(false)}
              >
                <FaTimes />
              </button>
            </div>
            <div className="avail-modal-body">
              <div className="avail-modal-field">
                <label>Select Day</label>
                <select
                  name="day"
                  value={customSlotData.day}
                  onChange={handleCustomSlotChange}
                  className="avail-modal-select"
                >
                  {daysOfWeek.map((day, idx) => (
                    <option key={day} value={day}>
                      {dayFullNames[idx]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="avail-modal-field">
                <label>Start Time</label>
                <input
                  type="time"
                  name="start"
                  value={customSlotData.start}
                  onChange={(e) => {
                    setCustomSlotData((prev) => ({
                      ...prev,
                      start: e.target.value,
                    }));
                    setCustomSlotError("");
                  }}
                  className="avail-modal-input"
                />
              </div>
              <div className="avail-modal-field">
                <label>End Time</label>
                <input
                  type="time"
                  name="end"
                  value={customSlotData.end}
                  onChange={(e) => {
                    setCustomSlotData((prev) => ({
                      ...prev,
                      end: e.target.value,
                    }));
                    setCustomSlotError("");
                  }}
                  className="avail-modal-input"
                />
              </div>
              <div className="avail-modal-field">
                <label>Slot Type</label>
                <select
                  name="type"
                  value={customSlotData.type}
                  onChange={handleCustomSlotChange}
                  className="avail-modal-select"
                >
                  <option value="available">Available</option>
                  <option value="break">Break</option>
                </select>
              </div>
              {customSlotError && (
                <div className="avail-modal-error">{customSlotError}</div>
              )}
            </div>
            <div className="avail-modal-footer">
              <button
                className="avail-modal-btn avail-modal-btn-cancel"
                onClick={() => setShowCustomSlotModal(false)}
              >
                Cancel
              </button>
              <button
                className="avail-modal-btn avail-modal-btn-submit"
                onClick={handleCustomSlotSubmit}
              >
                <FaPlus /> Add Slot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================== SAVE SUCCESS POPUP ========================= */}
      {showSavePopup && (
        <div
          className={`avail-save-popup ${popupVisible ? "avail-popup-visible" : "avail-popup-hidden"}`}
        >
          <div className="avail-popup-content">
            <div className="avail-popup-icon-wrapper">
              <FaCheckCircle className="avail-popup-icon" />
            </div>
            <div className="avail-popup-text">
              <h4 className="avail-popup-title">Successfully Saved!</h4>
              <p className="avail-popup-subtitle">
                Your availability has been updated
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Availability;
