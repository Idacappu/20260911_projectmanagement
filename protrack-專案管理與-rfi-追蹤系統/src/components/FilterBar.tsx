import React from 'react';
import { Search, Filter, Layers, UserCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { TicketFilterOptions, User, Ticket } from '../types';
import { calculateSla } from '../utils/sla';

interface FilterBarProps {
  filters: TicketFilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<TicketFilterOptions>>;
  users: User[];
  tickets: Ticket[];
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  setFilters,
  users,
  tickets,
}) => {
  // Compute quick counters
  const totalCount = tickets.length;
  const rfiCount = tickets.filter((t) => t.type === 'RFI').length;
  const taskCount = tickets.filter((t) => t.type === 'TASK').length;
  const overdueCount = tickets.filter((t) => calculateSla(t).isOverdue).length;
  const doneCount = tickets.filter((t) => t.status === 'DONE').length;

  return (
    <div className="bg-white border-b-2 border-black py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-black absolute left-3.5 top-1/2 -translate-y-1/2 stroke-[2]" />
          <input
            id="filter-search-input"
            type="text"
            placeholder="搜尋單號 (RFI-*)、標題、說明..."
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            className="w-full pl-10 pr-3 py-2 text-xs font-mono bg-white border-2 border-black focus:outline-none focus:border-4 transition-none placeholder:italic placeholder:text-neutral-500"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Type Filter */}
          <div className="flex items-center space-x-1.5 bg-white border-2 border-black px-3 py-1.5 text-xs text-black">
            <Layers className="w-3.5 h-3.5 text-black stroke-[2]" />
            <span className="font-mono uppercase text-[10px] text-neutral-600 font-bold">TYPE:</span>
            <select
              id="filter-type-select"
              aria-label="依類型篩選"
              value={filters.type}
              onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value as any }))}
              className="bg-transparent text-xs font-mono font-bold text-black focus:outline-none cursor-pointer uppercase"
            >
              <option value="ALL">全部 ({totalCount})</option>
              <option value="RFI">RFI 疑義單 ({rfiCount})</option>
              <option value="TASK">TASK 任務 ({taskCount})</option>
            </select>
          </div>

          {/* Assignee Filter */}
          <div className="flex items-center space-x-1.5 bg-white border-2 border-black px-3 py-1.5 text-xs text-black">
            <UserCheck className="w-3.5 h-3.5 text-black stroke-[2]" />
            <span className="font-mono uppercase text-[10px] text-neutral-600 font-bold">ASSIGNEE:</span>
            <select
              id="filter-assignee-select"
              aria-label="依指派人篩選"
              value={filters.assigneeId}
              onChange={(e) => setFilters((prev) => ({ ...prev, assigneeId: e.target.value }))}
              className="bg-transparent text-xs font-mono font-bold text-black focus:outline-none cursor-pointer uppercase"
            >
              <option value="ALL">全體人員</option>
              {users.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.name} [{u.role}]
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center space-x-1.5 bg-white border-2 border-black px-3 py-1.5 text-xs text-black">
            <Filter className="w-3.5 h-3.5 text-black stroke-[2]" />
            <span className="font-mono uppercase text-[10px] text-neutral-600 font-bold">PRIORITY:</span>
            <select
              id="filter-priority-select"
              aria-label="依優先級篩選"
              value={filters.priority}
              onChange={(e) => setFilters((prev) => ({ ...prev, priority: e.target.value as any }))}
              className="bg-transparent text-xs font-mono font-bold text-black focus:outline-none cursor-pointer uppercase"
            >
              <option value="ALL">全部</option>
              <option value="HIGH">緊急 (HIGH)</option>
              <option value="MEDIUM">一般 (MEDIUM)</option>
              <option value="LOW">低 (LOW)</option>
            </select>
          </div>

          {/* Reset Filters button if any is active */}
          {(filters.search || filters.type !== 'ALL' || filters.assigneeId !== 'ALL' || filters.priority !== 'ALL') && (
            <button
              id="btn-reset-filters"
              onClick={() =>
                setFilters({
                  search: '',
                  type: 'ALL',
                  assigneeId: 'ALL',
                  priority: 'ALL',
                })
              }
              className="text-xs font-mono font-bold text-black underline underline-offset-4 hover:bg-black hover:text-white px-2 py-1.5 border border-black cursor-pointer uppercase"
            >
              [CLEAR]
            </button>
          )}
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="max-w-7xl mx-auto mt-3 pt-3 border-t border-black flex flex-wrap items-center gap-5 text-xs font-mono">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 bg-black"></span>
          <span className="text-neutral-600 uppercase text-[11px]">TOTAL: <strong className="text-black font-bold font-mono">{totalCount}</strong></span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 border border-black bg-white"></span>
          <span className="text-neutral-600 uppercase text-[11px]">RFI ITEMS: <strong className="text-black font-bold font-mono">{rfiCount}</strong></span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 bg-neutral-400"></span>
          <span className="text-neutral-600 uppercase text-[11px]">TASKS: <strong className="text-black font-bold font-mono">{taskCount}</strong></span>
        </div>
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-3.5 h-3.5 text-black stroke-[2.5]" />
          <span className="text-black font-bold uppercase text-[11px] bg-black text-white px-2 py-0.5 border border-black">
            SLA OVERDUE: {overdueCount}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-black stroke-[2]" />
          <span className="text-neutral-700 uppercase text-[11px]">CLOSED: <strong className="font-bold text-black font-mono">{doneCount}</strong></span>
        </div>
      </div>
    </div>
  );
};
