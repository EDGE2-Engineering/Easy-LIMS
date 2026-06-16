// BankStatementsContext — intentionally empty.
// All DB operations are performed directly in AdminBankStatementsManager
// to avoid holding statement data in memory.

import React from 'react';

// Kept as a no-op so App.jsx provider wrapping is harmless.
export const BankStatementsProvider = ({ children }) => <>{children}</>;
export const useBankStatements = () => {};
