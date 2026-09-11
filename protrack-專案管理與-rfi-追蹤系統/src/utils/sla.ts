import { Ticket } from '../types';

export interface SlaInfo {
  isOverdue: boolean;
  isDueToday: boolean;
  statusText: string;
  daysDiff: number;
  badgeClass: string;
  cardHighlightClass: string;
}

export function calculateSla(ticket: Ticket, referenceDateStr?: string): SlaInfo {
  if (ticket.status === 'DONE') {
    return {
      isOverdue: false,
      isDueToday: false,
      statusText: '已結案',
      daysDiff: 0,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      cardHighlightClass: '',
    };
  }

  if (!ticket.due_date) {
    return {
      isOverdue: false,
      isDueToday: false,
      statusText: '未設期限',
      daysDiff: 0,
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      cardHighlightClass: '',
    };
  }

  // Use current date or given reference date (e.g. 2026-09-10)
  const today = referenceDateStr ? new Date(referenceDateStr) : new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(ticket.due_date);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      isOverdue: true,
      isDueToday: false,
      statusText: `逾期 ${overdueDays} 天 (SLA 超時)`,
      daysDiff: overdueDays,
      badgeClass: 'bg-red-500 text-white font-semibold shadow-xs animate-pulse',
      cardHighlightClass: 'border-red-400 bg-red-50/30 ring-1 ring-red-400/50',
    };
  } else if (diffDays === 0) {
    return {
      isOverdue: false,
      isDueToday: true,
      statusText: '今日截止',
      daysDiff: 0,
      badgeClass: 'bg-amber-500 text-white font-semibold',
      cardHighlightClass: 'border-amber-400 bg-amber-50/20',
    };
  } else {
    return {
      isOverdue: false,
      isDueToday: false,
      statusText: `剩餘 ${diffDays} 天`,
      daysDiff: diffDays,
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      cardHighlightClass: '',
    };
  }
}
