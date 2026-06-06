import React, { useMemo, useRef } from 'react';
import { DatePicker } from 'rsuite';
import { cn } from '@/lib/utils';

// Helper to convert YYYY-MM-DD string to local Date object (no timezone shift)
const parseLocalDate = (dateStr) => {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const [year, month, day] = parts.map(Number);
  const date = new Date(year, month - 1, day);
  return isNaN(date.getTime()) ? null : date;
};

// Helper to convert local Date object to YYYY-MM-DD string
const formatLocalDate = (date) => {
  if (!date || isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const AppDatePicker = React.forwardRef(
  (
    {
      value,
      onChange,
      className,
      placeholder = 'Select date',
      disabled = false,
      required = false,
      max,
      id,
      name,
      ...props
    },
    ref
  ) => {
    const wrapperRef = useRef(null);

    const dateValue = useMemo(() => {
      if (!value) return null;
      if (value instanceof Date) return value;
      return parseLocalDate(value);
    }, [value]);

    const handleChange = (date) => {
      if (!onChange) return;
      onChange({
        target: { value: formatLocalDate(date), name: name || '', id: id || '' },
      });
    };

    const shouldDisableDate = useMemo(() => {
      if (!max) return undefined;
      return (date) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        const m = parseLocalDate(max) || new Date(max);
        m.setHours(0, 0, 0, 0);
        return d > m;
      };
    }, [max]);

    return (
      // We own ALL the visual chrome (border, bg, radius, focus ring).
      // RSuite DatePicker uses appearance="subtle" so its toggle is
      // completely borderless/shadowless — we only need it for the calendar popup.
      <div
        ref={wrapperRef}
        className={cn(
          'app-datepicker-root relative',
          // Identical base classes to SelectTrigger in select.jsx:
          'flex h-10 w-full items-center rounded-md border border-input bg-background',
          'ring-offset-background',
          'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
          disabled && 'cursor-not-allowed opacity-50',
          className
        )}
      >
        <DatePicker
          ref={ref}
          appearance="subtle"
          value={dateValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          shouldDisableDate={shouldDisableDate}
          format="dd MMM yyyy"
          block
          cleanable
          oneTap
          placement="autoVerticalStart"
          // Portal the calendar into the wrapper div so it stays inside
          // Radix Dialog's focus trap — without this, Radix blocks all
          // pointer events on the rsuite popup since it's outside the dialog DOM.
          container={() => wrapperRef.current || document.body}
          id={id}
          name={name}
          style={{ width: '100%', height: '100%' }}
          {...props}
        />

        {/* Hidden input for HTML5 required validation */}
        {required && (
          <input
            type="text"
            value={value || ''}
            required
            readOnly
            tabIndex={-1}
            style={{
              opacity: 0,
              width: 0,
              height: 0,
              position: 'absolute',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>
    );
  }
);

AppDatePicker.displayName = 'AppDatePicker';
export default AppDatePicker;
export { AppDatePicker };
