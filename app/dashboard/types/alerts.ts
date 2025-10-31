// app/dashboard/types/alerts.ts
export type Severity = 'info' | 'warning' | 'critical';

export type AlertItem = {
  id: string | number;
  title: string;
  body?: string;
  createdAt: string; // ISO
  severity: Severity;
  read?: boolean;
  archived?: boolean;
};
