const themedReactSelectStyles = ({ minHeight = '40px', borderRadius = '0.75rem', fontSize = '0.875rem' } = {}) => ({
  control: (base, state) => ({
    ...base,
    minHeight,
    borderColor: state.isFocused ? 'hsl(var(--ring))' : 'hsl(var(--border))',
    borderRadius,
    backgroundColor: 'hsl(var(--muted) / 0.3)',
    boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--ring) / 0.2)' : 'none',
    color: 'hsl(var(--foreground))',
    opacity: state.isDisabled ? 0.6 : 1,
    cursor: state.isDisabled ? 'not-allowed' : 'default',
    '&:hover': {
      borderColor: 'hsl(var(--ring))',
    },
  }),
  valueContainer: (base) => ({
    ...base,
    paddingLeft: '0.75rem',
    paddingRight: '0.75rem',
  }),
  input: (base) => ({
    ...base,
    color: 'hsl(var(--foreground))',
    fontSize,
  }),
  placeholder: (base) => ({
    ...base,
    color: 'hsl(var(--muted-foreground))',
    fontSize,
  }),
  singleValue: (base) => ({
    ...base,
    color: 'hsl(var(--foreground))',
    fontSize,
  }),
  multiValue: (base) => ({
    ...base,
    borderRadius: '0.375rem',
    backgroundColor: 'hsl(var(--primary) / 0.12)',
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: 'hsl(var(--foreground))',
    fontSize,
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: 'hsl(var(--muted-foreground))',
    '&:hover': {
      backgroundColor: 'hsl(var(--destructive) / 0.14)',
      color: 'hsl(var(--destructive))',
    },
  }),
  menu: (base) => ({
    ...base,
    zIndex: 50,
    overflow: 'hidden',
    border: '1px solid hsl(var(--border))',
    borderRadius,
    backgroundColor: 'hsl(var(--popover))',
    boxShadow: '0 12px 28px rgba(0, 0, 0, 0.18)',
  }),
  menuList: (base) => ({
    ...base,
    padding: '0.25rem',
    backgroundColor: 'hsl(var(--popover))',
  }),
  option: (base, state) => ({
    ...base,
    borderRadius: '0.375rem',
    backgroundColor: state.isSelected
      ? 'hsl(var(--primary))'
      : state.isFocused
        ? 'hsl(var(--accent))'
        : 'hsl(var(--popover))',
    color: state.isSelected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--popover-foreground))',
    cursor: 'default',
    fontSize,
    ':active': {
      backgroundColor: state.isSelected ? 'hsl(var(--primary))' : 'hsl(var(--accent))',
    },
  }),
  dropdownIndicator: (base) => ({
    ...base,
    color: 'hsl(var(--muted-foreground))',
    '&:hover': {
      color: 'hsl(var(--foreground))',
    },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: 'hsl(var(--muted-foreground))',
    '&:hover': {
      color: 'hsl(var(--foreground))',
    },
  }),
  indicatorSeparator: (base) => ({
    ...base,
    backgroundColor: 'hsl(var(--border))',
  }),
});

export { themedReactSelectStyles };
