// Adapted from a pasted DurationPicker component (hours + minutes, for a
// timer-style duration) into a single 0-23 "hour of day" picker for
// StreakForge's evening-reminder setting — that's one value, not a
// duration, so the minutes segment is dropped and the two-segment squircle
// (value + edit/confirm toggle) is kept. The figma-squircle path math,
// flubber pencil<->check icon morph, and spring physics are unchanged.
"use client";

import { Slot } from "@radix-ui/react-slot";
import { getSvgPath } from "figma-squircle";
import { interpolate } from "flubber";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, useVelocity } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import useMeasure from "react-use-measure";
import { cn } from "../../lib/utils";

const PEN_PATH = "M3.78181 16.3092L3 21L7.69086 20.2182C8.50544 20.0825 9.25725 19.6956 9.84119 19.1116L20.4198 8.53288C21.1934 7.75922 21.1934 6.5049 20.4197 5.73126L18.2687 3.58024C17.495 2.80658 16.2406 2.80659 15.4669 3.58027L4.88841 14.159C4.30447 14.7429 3.91757 15.4947 3.78181 16.3092Z";
const TICK_PATH = "M7.959 20.513L1.592 12.872L3.128 11.592L8.041 17.487L20.947 3.587L22.413 4.948L7.959 20.513Z";

const OPEN_GAP = 8;
const CORNER_RADIUS = 12;
const GAP_SPRING = { stiffness: 200, damping: 28, mass: 1 };
const ICON_SPRING = { stiffness: 200, damping: 28 };
const WIDTH_SPRING = { stiffness: 250, damping: 31 };
const SWAY_SPRING = { stiffness: 200, damping: 24 };
const ERROR_SPRING = { stiffness: 700, damping: 9 };

const MotionSlot = motion.create(Slot);
const radiusValue = (radius) => (typeof radius === "number" ? radius : radius.get());

function SquircleSegment({ asChild, cornerSmoothing = 1, leftRadius, rightRadius, className, style, children }) {
  const Component = asChild ? MotionSlot : motion.div;
  const [ref, bounds] = useMeasure();
  const width = useMotionValue(0);
  const height = useMotionValue(0);

  useEffect(() => {
    width.set(bounds.width);
    height.set(bounds.height);
  }, [bounds.width, bounds.height, width, height]);

  const clipPath = useTransform(() => {
    const w = width.get();
    const h = height.get();
    if (w <= 0 || h <= 0) return "none";
    const left = radiusValue(leftRadius);
    const right = radiusValue(rightRadius);
    const path = getSvgPath({
      width: w,
      height: h,
      topLeftCornerRadius: left,
      bottomLeftCornerRadius: left,
      topRightCornerRadius: right,
      bottomRightCornerRadius: right,
      cornerSmoothing,
    });
    return `path('${path}')`;
  });

  return (
    <Component data-slot="hour-picker-segment" ref={ref} className={className} style={{ ...style, clipPath }}>
      {children}
    </Component>
  );
}

function HourField({ value, onValueChange, max, isEditing, shouldReduceMotion, disabled, swayX, inputRef }) {
  const measureRef = useRef(null);
  const [textWidth, setTextWidth] = useState(0);
  const errorX = useSpring(0, ERROR_SPRING);
  const x = useTransform(() => swayX.get() + errorX.get());

  useLayoutEffect(() => {
    if (measureRef.current) setTextWidth(measureRef.current.offsetWidth);
  }, [value]);

  const handleChange = (event) => {
    const next = event.target.value;
    if (next !== "" && (Number(next) > max || Number(next) < 0)) {
      onValueChange(String(Math.min(max, Math.max(0, Number(next)))));
      if (!shouldReduceMotion) {
        errorX.jump(6);
        errorX.set(0);
      }
      return;
    }
    onValueChange(next);
  };

  const collapsedWidth = Math.max(textWidth + 12, 22);

  return (
    <>
      <motion.input
        data-slot="hour-picker-input"
        ref={inputRef}
        type="number"
        value={value}
        onChange={handleChange}
        placeholder={isEditing ? "" : "0"}
        readOnly={!isEditing}
        disabled={disabled}
        style={{ x, width: isEditing ? 44 : collapsedWidth }}
        animate={{ width: isEditing ? 44 : collapsedWidth }}
        transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", ...WIDTH_SPRING }}
        className="h-full text-center font-semibold text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <span ref={measureRef} aria-hidden className="invisible absolute whitespace-pre font-semibold">{value || "0"}</span>
    </>
  );
}

const clampField = (raw, max) => Math.min(max, Math.max(0, Math.trunc(raw) || 0));
const fieldText = (n) => (n === undefined || n === null ? "" : String(n));

export function HourPicker({
  value,
  defaultValue = 21,
  onChange,
  onConfirm,
  onEditingChange,
  defaultEditing = false,
  max = 23,
  label = "Hr.",
  disabled = false,
  className,
  ...props
}) {
  const isControlled = value !== undefined;
  const [isEditing, setIsEditing] = useState(defaultEditing);
  const [hourText, setHourText] = useState(() => fieldText(value ?? defaultValue));

  useEffect(() => {
    if (!isControlled) return;
    if (clampField(Number(hourText), max) !== clampField(value, max)) {
      setHourText(fieldText(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isControlled, value, max]);

  const handleHourChange = (text) => {
    setHourText(text);
    onChange?.(clampField(Number(text), max));
  };

  const shouldReduceMotion = useReducedMotion();
  const gap = useSpring(defaultEditing ? OPEN_GAP : 0, GAP_SPRING);
  const openness = (v) => Math.min(OPEN_GAP, Math.max(0, v)) / OPEN_GAP;
  const segmentSpacing = useTransform(gap, (v) => `${Math.min(OPEN_GAP, Math.max(0, v)) - (1 - openness(v))}px`);
  const innerRadius = useTransform(gap, (v) => CORNER_RADIUS * openness(v));
  const innerPadRight = useTransform(gap, (v) => `${3 + 9 * openness(v)}px`);
  const gapVelocity = useVelocity(gap);
  const swayXRaw = useTransform(gapVelocity, [-70, 0, 70], [-3, 0, 3], { clamp: true });
  const swayX = useSpring(swayXRaw, SWAY_SPRING);
  const iconProgress = useSpring(defaultEditing ? 1 : 0, ICON_SPRING);
  const iconPath = useTransform(iconProgress, [0, 1], [PEN_PATH, TICK_PATH], {
    clamp: true,
    mixer: (from, to) => interpolate(from, to, { maxSegmentLength: 1 }),
  });
  const iconStrokeWidth = useTransform(iconProgress, [0, 1], [0, 2.5], { clamp: true });
  const iconStrokeOpacity = useTransform(iconProgress, [0, 1], [0, 1], { clamp: true });
  const iconDashOpacity = useTransform(iconProgress, [0, 0.4], [1, 0], { clamp: true });
  const hourInputRef = useRef(null);

  const toggleEdit = () => {
    if (disabled) return;
    const next = !isEditing;
    const targetGap = next ? OPEN_GAP : 0;
    const targetIcon = next ? 1 : 0;
    if (shouldReduceMotion) {
      gap.jump(targetGap);
      iconProgress.jump(targetIcon);
    } else {
      gap.set(targetGap);
      iconProgress.set(targetIcon);
    }
    setIsEditing(next);
    onEditingChange?.(next);
    if (next) hourInputRef.current?.focus();
    else onConfirm?.(clampField(Number(hourText), max));
  };

  return (
    <motion.div
      data-slot="hour-picker"
      data-editing={isEditing || undefined}
      data-disabled={disabled || undefined}
      className={cn("flex flex-row items-center justify-start", disabled && "opacity-50", className)}
      {...props}
    >
      <SquircleSegment
        leftRadius={CORNER_RADIUS}
        rightRadius={innerRadius}
        style={{ paddingRight: innerPadRight }}
        className="glass h-12 flex items-center gap-1 pl-3"
      >
        <HourField
          value={hourText}
          onValueChange={handleHourChange}
          max={max}
          isEditing={isEditing}
          shouldReduceMotion={!!shouldReduceMotion}
          disabled={disabled}
          swayX={swayX}
          inputRef={hourInputRef}
        />
        <motion.span style={{ x: swayX }} className="text-white/50 font-semibold">{label}</motion.span>
      </SquircleSegment>
      <SquircleSegment asChild leftRadius={innerRadius} rightRadius={CORNER_RADIUS} style={{ marginLeft: segmentSpacing }}>
        <button
          data-slot="hour-picker-toggle"
          type="button"
          onClick={toggleEdit}
          disabled={disabled}
          aria-label={isEditing ? "Save hour" : "Edit hour"}
          className="w-12 h-12 glass flex justify-center items-center active:scale-90 transition-transform disabled:active:scale-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
            <motion.path
              fill="white"
              stroke="white"
              strokeWidth={0}
              strokeLinejoin="round"
              strokeLinecap="round"
              style={{ strokeWidth: iconStrokeWidth, strokeOpacity: iconStrokeOpacity }}
              d={iconPath}
            />
            <motion.path
              d="M14 6L18 10"
              fill="none"
              strokeWidth={1.5}
              strokeLinecap="round"
              className="stroke-white/10"
              style={{ opacity: iconDashOpacity }}
            />
          </svg>
        </button>
      </SquircleSegment>
    </motion.div>
  );
}

export default HourPicker;
