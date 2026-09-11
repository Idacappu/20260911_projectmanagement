import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Filter,
  Info,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Calendar,
  Layers,
  ChevronLeft,
  Search,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  Folder,
  FolderOpen,
  SplitSquareVertical,
  Clock,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { Ticket, User, TicketStatus, PriorityLevel, TicketType } from '../types';
import { calculateSla } from '../utils/sla';

interface GanttChartProps {
  tickets: Ticket[];
  users: User[];
  currentUser: User | null;
  onSelectTicket: (ticketId: number) => void;
  onOpenCreateModal: () => void;
  onUpdateTicketDates?: (ticketId: number, startDate: string, dueDate: string) => Promise<void>;
}

// Work package tree item
interface TreeItem {
  ticket: Ticket;
  level: number;
  isParent: boolean;
  isExpanded?: boolean;
  children?: TreeItem[];
  computedStartDate: string;
  computedDueDate: string;
}

export const GanttChart: React.FC<GanttChartProps> = ({
  tickets,
  users,
  currentUser,
  onSelectTicket,
  onOpenCreateModal,
  onUpdateTicketDates,
}) => {
  // UI State
  const [collapsedParentIds, setCollapsedParentIds] = useState<Set<number>>(new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<'day' | 'week' | 'month'>('day');
  const [showFilterPopover, setShowFilterPopover] = useState<boolean>(false);
  const [showInfoPopover, setShowInfoPopover] = useState<boolean>(false);
  const [showCreateDropdown, setShowCreateDropdown] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [selectedWorkPackageMenu, setSelectedWorkPackageMenu] = useState<string>('Product Timeline');
  const [splitRatio, setSplitRatio] = useState<number>(360); // px width of left table
  const [hoveredTicketId, setHoveredTicketId] = useState<number | null>(null);

  // Local filter states
  const [filterType, setFilterType] = useState<'ALL' | 'RFI' | 'TASK' | 'MILESTONE'>('ALL');
  const [filterAssignee, setFilterAssignee] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const containerRef = useRef<HTMLDivElement>(null);
  const ganttScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);

  // Synchronize vertical scroll between left table and right gantt canvas
  const handleGanttScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const handleTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (ganttScrollRef.current) {
      ganttScrollRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // Day width in pixels according to zoom level
  const cellWidth = zoomLevel === 'day' ? 34 : zoomLevel === 'week' ? 18 : 8;
  const rowHeight = 44; // px per row to match table and gantt exactly

  // Today reference date (from environment metadata: 2026-09-10)
  const todayStr = '2026-09-10';
  const todayDate = new Date(`${todayStr}T00:00:00`);

  // Calculate timeline date range spanning before and after tickets & today
  const { startDate, endDate, totalDays, allDays } = useMemo(() => {
    let minTime = new Date('2026-08-28T00:00:00').getTime();
    let maxTime = new Date('2026-10-18T00:00:00').getTime();

    tickets.forEach((t) => {
      const s = t.start_date ? new Date(`${t.start_date}T00:00:00`).getTime() : null;
      const d = t.due_date ? new Date(`${t.due_date}T00:00:00`).getTime() : null;
      if (s && s < minTime) minTime = s;
      if (d && d > maxTime) maxTime = d;
    });

    // Expand margin
    const sDate = new Date(minTime - 4 * 86400000);
    const eDate = new Date(maxTime + 10 * 86400000);
    const diffDays = Math.ceil((eDate.getTime() - sDate.getTime()) / 86400000);

    const days: Date[] = [];
    for (let i = 0; i <= diffDays; i++) {
      const d = new Date(sDate.getTime() + i * 86400000);
      days.push(d);
    }

    return {
      startDate: sDate,
      endDate: eDate,
      totalDays: diffDays,
      allDays: days,
    };
  }, [tickets]);

  // Convert a YYYY-MM-DD string to x offset in pixels on the timeline
  const getXFromDate = (dateStr?: string | null): number => {
    if (!dateStr) return 0;
    const target = new Date(`${dateStr}T00:00:00`).getTime();
    const start = startDate.getTime();
    const dayIndex = (target - start) / 86400000;
    return dayIndex * cellWidth;
  };

  // Convert duration in days to pixel width
  const getWidthBetweenDates = (startStr?: string | null, dueStr?: string | null): number => {
    if (!startStr || !dueStr) return cellWidth;
    const s = new Date(`${startStr}T00:00:00`).getTime();
    const d = new Date(`${dueStr}T00:00:00`).getTime();
    const days = Math.max(1, Math.round((d - s) / 86400000) + 1);
    return days * cellWidth;
  };

  // Build hierarchical work packages tree
  const treeRows = useMemo(() => {
    // 1. Identify parents (tickets with parent_id === null or undefined)
    const parents = tickets.filter((t) => !t.parent_id);
    const childrenMap = new Map<number, Ticket[]>();

    tickets.forEach((t) => {
      if (t.parent_id) {
        const existing = childrenMap.get(t.parent_id) || [];
        existing.push(t);
        childrenMap.set(t.parent_id, existing);
      }
    });

    const rows: TreeItem[] = [];

    parents.forEach((parent) => {
      const children = childrenMap.get(parent.id) || [];
      // Compute parent start and due dates if children exist
      let minStart = parent.start_date || parent.created_at.split('T')[0];
      let maxDue = parent.due_date;

      children.forEach((c) => {
        const cs = c.start_date || c.created_at.split('T')[0];
        const cd = c.due_date;
        if (!minStart || cs < minStart) minStart = cs;
        if (!maxDue || cd > maxDue) maxDue = cd;
      });

      const isExpanded = !collapsedParentIds.has(parent.id);

      // Parent row
      rows.push({
        ticket: parent,
        level: 0,
        isParent: true,
        isExpanded,
        children: children.map((c) => ({
          ticket: c,
          level: 1,
          isParent: false,
          computedStartDate: c.start_date || c.created_at.split('T')[0],
          computedDueDate: c.due_date,
        })),
        computedStartDate: minStart,
        computedDueDate: maxDue,
      });

      // If expanded, push children to visible rows
      if (isExpanded) {
        children.forEach((child) => {
          // Check filters
          let match = true;
          if (filterType === 'RFI' && child.type !== 'RFI') match = false;
          if (filterType === 'TASK' && (child.type !== 'TASK' || child.is_milestone)) match = false;
          if (filterType === 'MILESTONE' && !child.is_milestone) match = false;
          if (filterAssignee !== 'ALL' && String(child.assignee_id) !== filterAssignee) match = false;
          if (filterPriority !== 'ALL' && child.priority !== filterPriority) match = false;
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const hit =
              child.title.toLowerCase().includes(q) ||
              child.ticket_no.toLowerCase().includes(q) ||
              (child.description && child.description.toLowerCase().includes(q));
            if (!hit) match = false;
          }

          if (match) {
            rows.push({
              ticket: child,
              level: 1,
              isParent: false,
              computedStartDate: child.start_date || child.created_at.split('T')[0],
              computedDueDate: child.due_date,
            });
          }
        });
      }
    });

    // Also include any orphan tickets not under known parents
    const parentIds = new Set(parents.map((p) => p.id));
    const orphanTickets = tickets.filter((t) => t.parent_id && !parentIds.has(t.parent_id));
    orphanTickets.forEach((child) => {
      rows.push({
        ticket: child,
        level: 0,
        isParent: false,
        computedStartDate: child.start_date || child.created_at.split('T')[0],
        computedDueDate: child.due_date,
      });
    });

    return rows;
  }, [tickets, collapsedParentIds, filterType, filterAssignee, filterPriority, searchQuery]);

  // Toggle parent expand / collapse
  const toggleParentCollapse = (parentId: number) => {
    setCollapsedParentIds((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) {
        next.delete(parentId);
      } else {
        next.add(parentId);
      }
      return next;
    });
  };

  // Scroll to Today
  const handleScrollToToday = () => {
    if (ganttScrollRef.current) {
      const todayX = getXFromDate(todayStr);
      ganttScrollRef.current.scrollTo({
        left: Math.max(0, todayX - 300),
        behavior: 'smooth',
      });
    }
  };

  // Initial scroll to today on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      handleScrollToToday();
    }, 200);
    return () => clearTimeout(timer);
  }, [zoomLevel]);

  // Generate calendar header groups (Month, Week, Day)
  const calendarHeaders = useMemo(() => {
    const monthsMap: { label: string; startIndex: number; count: number }[] = [];
    const weeksMap: { label: string; startIndex: number; count: number }[] = [];

    allDays.forEach((d, idx) => {
      const monthLabel = d.toLocaleString('en-US', { month: 'short', year: 'numeric' }); // e.g. Sep 2026
      const lastMonth = monthsMap[monthsMap.length - 1];
      if (!lastMonth || lastMonth.label !== monthLabel) {
        monthsMap.push({ label: monthLabel, startIndex: idx, count: 1 });
      } else {
        lastMonth.count++;
      }

      // ISO week number estimation
      const dNum = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const dayNum = dNum.getUTCDay() || 7;
      dNum.setUTCDate(dNum.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(dNum.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil(((dNum.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
      const weekLabel = `${weekNo}`;

      const lastWeek = weeksMap[weeksMap.length - 1];
      if (!lastWeek || lastWeek.label !== weekLabel) {
        weeksMap.push({ label: weekLabel, startIndex: idx, count: 1 });
      } else {
        lastWeek.count++;
      }
    });

    return { monthsMap, weeksMap };
  }, [allDays]);

  // Calculate dependency lines (Orthogonal Step Connector Lines from Predecessor to Successor)
  const dependencyLines = useMemo(() => {
    const ticketRowMap = new Map<number, number>();
    treeRows.forEach((row, idx) => {
      ticketRowMap.set(row.ticket.id, idx);
    });

    const lines: {
      fromId: number;
      toId: number;
      path: string;
      isOverdue?: boolean;
    }[] = [];

    treeRows.forEach((row, targetRowIndex) => {
      const deps = row.ticket.dependencies || [];
      deps.forEach((sourceId) => {
        const sourceRowIndex = ticketRowMap.get(sourceId);
        if (sourceRowIndex === undefined) return;

        const sourceTicket = tickets.find((t) => t.id === sourceId);
        if (!sourceTicket) return;

        // Source coordinates (end of source bar)
        const sourceEndStr = sourceTicket.due_date;
        const sourceStartX = getXFromDate(sourceTicket.start_date || sourceTicket.created_at.split('T')[0]);
        const sourceEndX = sourceTicket.is_milestone
          ? sourceStartX + 12
          : sourceStartX + getWidthBetweenDates(sourceTicket.start_date, sourceTicket.due_date);
        const sourceY = sourceRowIndex * rowHeight + rowHeight / 2;

        // Target coordinates (start of target bar)
        const targetStartX = getXFromDate(row.computedStartDate);
        const targetY = targetRowIndex * rowHeight + rowHeight / 2;

        // Orthogonal routing: Right 14px -> Vertical down/up -> Right to target
        const midX = sourceEndX + 10;
        const entryX = targetStartX - 6;

        let pathStr = '';
        if (entryX > midX) {
          pathStr = `M ${sourceEndX} ${sourceY} L ${midX} ${sourceY} L ${midX} ${targetY} L ${entryX} ${targetY}`;
        } else {
          // Loop around if target starts earlier
          const loopX = sourceEndX + 12;
          const dropY = (sourceY + targetY) / 2;
          pathStr = `M ${sourceEndX} ${sourceY} L ${loopX} ${sourceY} L ${loopX} ${dropY} L ${entryX - 10} ${dropY} L ${entryX - 10} ${targetY} L ${entryX} ${targetY}`;
        }

        lines.push({
          fromId: sourceId,
          toId: row.ticket.id,
          path: pathStr,
        });
      });
    });

    return lines;
  }, [treeRows, tickets, cellWidth, rowHeight, startDate]);

  // Calculate active filter count
  const activeFilterCount =
    (filterType !== 'ALL' ? 1 : 0) +
    (filterAssignee !== 'ALL' ? 1 : 0) +
    (filterPriority !== 'ALL' ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  // Fullscreen container handler
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const todayX = getXFromDate(todayStr);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-white text-black border-2 border-black overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50' : 'w-full h-[calc(100vh-140px)] min-h-[640px]'
      }`}
    >
      {/* 1. Project Sub-Header */}
      <div className="bg-white border-b-2 border-black px-4 py-2.5 flex items-center justify-between text-xs select-none">
        <div className="flex items-center space-x-3 font-mono">
          {/* Project Switcher */}
          <div className="flex items-center space-x-2 font-serif font-bold text-black hover:underline cursor-pointer">
            <FolderOpen className="w-4 h-4 text-black stroke-[1.5]" />
            <span className="text-sm tracking-tight uppercase">信義科技大樓工程 // 甘特圖排程</span>
            <ChevronDown className="w-3.5 h-3.5 text-black stroke-[2]" />
          </div>

          <div className="h-4 w-px bg-black mx-1 hidden sm:block" />

          {/* Brand badge */}
          <div className="hidden lg:flex items-center space-x-1.5 px-2 py-0.5 bg-black text-white font-mono text-[10px] uppercase font-bold tracking-widest">
            <span>TIMELINE ENGINE</span>
          </div>
        </div>

        {/* Global actions in top bar */}
        <div className="flex items-center space-x-2 font-mono">
          {/* Today Button */}
          <button
            onClick={handleScrollToToday}
            className="flex items-center space-x-1 px-3 py-1 bg-white hover:bg-black hover:text-white border-2 border-black text-black font-bold text-xs uppercase transition-none cursor-pointer"
            title="平移至當前基準日 (2026-09-10)"
          >
            <Clock className="w-3.5 h-3.5 stroke-[2]" />
            <span>TODAY (09/10)</span>
          </button>

          {/* User Role Indicator */}
          {currentUser && (
            <div className="hidden sm:flex items-center space-x-1.5 bg-white border border-black px-2.5 py-1 text-[11px] font-mono">
              <span className="w-2 h-2 bg-black" />
              <span className="font-bold">{currentUser.name}</span>
              <span className="text-neutral-500 uppercase">[{currentUser.role}]</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Timeline Toolbar */}
      <div className="bg-white border-b-2 border-black px-4 py-2 flex flex-wrap items-center justify-between gap-2 z-20">
        
        {/* Left Title & Create Button */}
        <div className="flex items-center space-x-3">
          {/* Sidebar Toggle Button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 text-black hover:bg-black hover:text-white border-2 border-black transition-none cursor-pointer"
            title={isSidebarOpen ? '收合左側導航選單' : '展開左側導航選單'}
          >
            {isSidebarOpen ? <ChevronLeft className="w-4 h-4 stroke-[2]" /> : <ChevronRight className="w-4 h-4 stroke-[2]" />}
          </button>

          {/* Product Timeline Title Dropdown */}
          <div className="flex items-center space-x-1.5 cursor-pointer">
            <h2 className="text-lg font-serif font-bold text-black uppercase tracking-wider">
              Product Timeline
            </h2>
          </div>

          {/* Create Button */}
          <div className="relative font-mono">
            <button
              onClick={() => setShowCreateDropdown(!showCreateDropdown)}
              className="flex items-center space-x-1 px-3.5 py-1.5 bg-black text-white hover:bg-neutral-800 border-2 border-black text-xs font-bold uppercase tracking-wider transition-none cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2]" />
              <span>新增項目</span>
              <ChevronDown className="w-3.5 h-3.5 ml-0.5 stroke-[2]" />
            </button>

            {/* Create Dropdown Menu */}
            {showCreateDropdown && (
              <div className="absolute left-0 mt-1.5 w-60 bg-white border-2 border-black z-50 py-1 text-xs font-mono shadow-none">
                <button
                  onClick={() => {
                    setShowCreateDropdown(false);
                    onOpenCreateModal();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-black hover:text-white flex items-center space-x-2 text-black font-bold uppercase transition-none cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2]" />
                  <span>新建工作包 / 任務 (TASK)</span>
                </button>
                <button
                  onClick={() => {
                    setShowCreateDropdown(false);
                    onOpenCreateModal();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-black hover:text-white flex items-center space-x-2 text-black font-bold uppercase border-t border-black transition-none cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5 stroke-[2]" />
                  <span>新建 RFI 疑義單 (RFI ISSUE)</span>
                </button>
                <button
                  onClick={() => {
                    setShowCreateDropdown(false);
                    onOpenCreateModal();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-black hover:text-white flex items-center space-x-2 text-black font-bold uppercase border-t border-black transition-none cursor-pointer"
                >
                  <span className="w-2.5 h-2.5 rotate-45 bg-black inline-block shrink-0" />
                  <span>新建里程碑 (MILESTONE)</span>
                </button>
              </div>
            )}
          </div>

          {/* Filter Button */}
          <div className="relative font-mono">
            <button
              onClick={() => setShowFilterPopover(!showFilterPopover)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold uppercase border-2 border-black transition-none cursor-pointer ${
                activeFilterCount > 0
                  ? 'bg-black text-white'
                  : 'bg-white hover:bg-black hover:text-white text-black'
              }`}
            >
              <Filter className="w-3.5 h-3.5 stroke-[2]" />
              <span>篩選</span>
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.2 bg-white text-black border border-black text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Filter Popover */}
            {showFilterPopover && (
              <div className="absolute left-0 mt-2 w-72 bg-white border-2 border-black z-50 p-4 text-xs font-mono space-y-3 shadow-none">
                <div className="flex items-center justify-between border-b-2 border-black pb-2">
                  <span className="font-bold text-black uppercase tracking-wider">篩選條件</span>
                  <button
                    onClick={() => {
                      setFilterType('ALL');
                      setFilterAssignee('ALL');
                      setFilterPriority('ALL');
                      setSearchQuery('');
                    }}
                    className="text-black underline font-bold uppercase text-[10px] cursor-pointer"
                  >
                    重設全部
                  </button>
                </div>

                <div>
                  <label className="block text-black mb-1 font-bold uppercase text-[10px]">搜尋關鍵字</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="單號、主題或說明..."
                    className="w-full px-2.5 py-1.5 border-2 border-black text-xs font-mono focus:outline-none focus:border-4"
                  />
                </div>

                <div>
                  <label className="block text-black mb-1 font-bold uppercase text-[10px]">項目類型</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="w-full px-2 py-1.5 border-2 border-black text-xs font-mono bg-white uppercase font-bold"
                  >
                    <option value="ALL">全部項目 (ALL)</option>
                    <option value="RFI">僅 RFI 疑義單</option>
                    <option value="TASK">僅一般工程任務</option>
                    <option value="MILESTONE">僅關鍵里程碑</option>
                  </select>
                </div>

                <div>
                  <label className="block text-black mb-1 font-bold uppercase text-[10px]">指派負責人</label>
                  <select
                    value={filterAssignee}
                    onChange={(e) => setFilterAssignee(e.target.value)}
                    className="w-full px-2 py-1.5 border-2 border-black text-xs font-mono bg-white uppercase font-bold"
                  >
                    <option value="ALL">全部團隊成員</option>
                    {users.map((u) => (
                      <option key={u.id} value={String(u.id)}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 border-t-2 border-black flex justify-end">
                  <button
                    onClick={() => setShowFilterPopover(false)}
                    className="px-4 py-1.5 bg-black text-white font-bold text-xs uppercase border-2 border-black hover:bg-white hover:text-black transition-none cursor-pointer"
                  >
                    確認套用
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Toolbar Action Icons */}
        <div className="flex items-center space-x-1.5 font-mono">
          {/* Info Button */}
          <button
            onClick={() => setShowInfoPopover(!showInfoPopover)}
            className={`p-1.5 border-2 border-black transition-none cursor-pointer ${
              showInfoPopover ? 'bg-black text-white' : 'bg-white text-black hover:bg-black hover:text-white'
            }`}
            title="甘特圖圖例與操作說明"
          >
            <Info className="w-4 h-4 stroke-[2]" />
          </button>

          {/* Zoom Out Button */}
          <button
            onClick={() => {
              if (zoomLevel === 'day') setZoomLevel('week');
              else if (zoomLevel === 'week') setZoomLevel('month');
            }}
            disabled={zoomLevel === 'month'}
            className="p-1.5 border-2 border-black bg-white text-black hover:bg-black hover:text-white disabled:opacity-30 transition-none cursor-pointer"
            title="縮小時間尺度 (Zoom Out)"
          >
            <ZoomOut className="w-4 h-4 stroke-[2]" />
          </button>

          {/* Zoom In Button */}
          <button
            onClick={() => {
              if (zoomLevel === 'month') setZoomLevel('week');
              else if (zoomLevel === 'week') setZoomLevel('day');
            }}
            disabled={zoomLevel === 'day'}
            className="p-1.5 border-2 border-black bg-white text-black hover:bg-black hover:text-white disabled:opacity-30 transition-none cursor-pointer"
            title="放大時間尺度 (Zoom In)"
          >
            <ZoomIn className="w-4 h-4 stroke-[2]" />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 border-2 border-black bg-white text-black hover:bg-black hover:text-white transition-none cursor-pointer"
            title={isFullscreen ? '退出全螢幕' : '全螢幕模式'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 stroke-[2]" /> : <Maximize2 className="w-4 h-4 stroke-[2]" />}
          </button>
        </div>
      </div>

      {/* Info / Legend Popover */}
      {showInfoPopover && (
        <div className="bg-black text-white border-b-2 border-black px-6 py-3 text-xs font-mono flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6">
            <span className="font-bold uppercase tracking-wider flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 stroke-[2]" />
              <span>甘特圖標記圖例 (LEGEND):</span>
            </span>

            {/* Parent Bracket */}
            <div className="flex items-center space-x-2">
              <span className="inline-block w-8 h-2 border-t-2 border-l-2 border-r-2 border-white" />
              <span className="uppercase text-[11px]">工作包進度括弧 (PARENT)</span>
            </div>

            {/* Task Bar */}
            <div className="flex items-center space-x-2">
              <span className="inline-block w-6 h-3 bg-white border border-black" />
              <span className="uppercase text-[11px]">工程任務條 (TASK/RFI)</span>
            </div>

            {/* Milestone */}
            <div className="flex items-center space-x-2">
              <span className="inline-block w-3 h-3 bg-white rotate-45" />
              <span className="font-bold uppercase text-[11px]">里程碑 (MILESTONE ◆)</span>
            </div>

            {/* Dependency line */}
            <div className="flex items-center space-x-2">
              <span className="inline-block w-6 h-0.5 bg-white relative after:content-[''] after:absolute after:right-0 after:-top-1 after:border-t-4 after:border-b-4 after:border-l-4 after:border-transparent after:border-l-white" />
              <span className="uppercase text-[11px]">相依關聯線 (FS DEPENDENCY)</span>
            </div>

            {/* Today Line */}
            <div className="flex items-center space-x-2">
              <span className="inline-block w-4 border-t-2 border-dashed border-white" />
              <span className="font-bold uppercase text-[11px]">基準日 (TODAY: 2026-09-10)</span>
            </div>
          </div>

          <button
            onClick={() => setShowInfoPopover(false)}
            className="text-white hover:bg-white hover:text-black font-bold px-2 py-0.5 border border-white cursor-pointer uppercase text-xs"
          >
            ✕ CLOSE
          </button>
        </div>
      )}

      {/* 3. Main Split View Container */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar (Collapsible) */}
        {isSidebarOpen && (
          <aside className="w-48 shrink-0 bg-white border-r-2 border-black flex flex-col justify-between py-3 text-xs select-none font-mono">
            <div className="space-y-1">
              <div className="px-3 pb-2 text-[10px] font-bold tracking-widest text-black uppercase border-b border-black mb-2">
                PROJECT NAV
              </div>

              {/* Navigation Items */}
              {[
                { name: 'Overview', icon: Layers },
                { name: 'Work packages', icon: Folder, hasSub: true },
                { name: 'Timelines', icon: Calendar },
                { name: 'Backlogs', icon: SplitSquareVertical },
                { name: 'Calendar', icon: Clock },
                { name: 'News', icon: Info },
                { name: 'Wiki', icon: Info },
                { name: 'Cost reports', icon: CheckCircle2 },
                { name: 'Members', icon: CheckCircle2 },
                { name: 'Project settings', icon: MoreVertical },
              ].map((item) => {
                const isWorkPackages = item.name === 'Work packages';
                return (
                  <div key={item.name}>
                    <div
                      className={`flex items-center justify-between px-3 py-1.5 mx-2 font-bold uppercase cursor-pointer transition-none ${
                        isWorkPackages
                          ? 'bg-black text-white'
                          : 'text-black hover:bg-neutral-100'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <item.icon className="w-3.5 h-3.5 stroke-[2]" />
                        <span className="text-[11px]">{item.name}</span>
                      </div>
                      {item.hasSub && <ChevronDown className="w-3 h-3 stroke-[2]" />}
                    </div>

                    {/* Subitems under Work Packages */}
                    {isWorkPackages && (
                      <div className="ml-4 mr-2 mt-1 space-y-1 border-l-2 border-black pl-2">
                        {['Summary', 'Gantt chart', 'Product Timeline'].map((sub) => {
                          const isActive = selectedWorkPackageMenu === sub;
                          return (
                            <button
                              key={sub}
                              onClick={() => setSelectedWorkPackageMenu(sub)}
                              className={`w-full text-left px-2 py-1 text-[10px] font-bold uppercase transition-none cursor-pointer ${
                                isActive
                                  ? 'bg-black text-white'
                                  : 'text-black hover:bg-neutral-100'
                              }`}
                            >
                              {sub}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Status */}
            <div className="px-3 pt-3 border-t-2 border-black text-[10px] text-black font-bold uppercase">
              <span>信義科技大樓工程</span>
            </div>
          </aside>
        )}

        {/* Left Pane: SUBJECT Work Package Tree Table */}
        <div
          style={{ width: `${splitRatio}px` }}
          className="shrink-0 flex flex-col border-r-2 border-black bg-white"
        >
          {/* Table Header */}
          <div className="h-17 bg-white border-b-2 border-black px-3 flex items-center justify-between text-xs font-serif font-bold text-black tracking-wider uppercase select-none">
            <div className="flex items-center space-x-2 font-mono">
              <span>■</span>
              <span className="font-serif font-bold">SUBJECT (工作包與任務)</span>
            </div>
            <span className="text-[10px] text-neutral-600 font-mono font-bold">
              {treeRows.length} ITEMS
            </span>
          </div>

          {/* Table Body (Synced vertical scroll) */}
          <div
            ref={tableScrollRef}
            onScroll={handleTableScroll}
            className="flex-1 overflow-y-auto overflow-x-hidden divide-y divide-black select-none font-mono"
          >
            {treeRows.map((row) => {
              const isHovered = hoveredTicketId === row.ticket.id;
              const isParent = row.isParent;
              const isMilestone = row.ticket.is_milestone;
              const sla = calculateSla(row.ticket);

              return (
                <div
                  key={row.ticket.id}
                  onMouseEnter={() => setHoveredTicketId(row.ticket.id)}
                  onMouseLeave={() => setHoveredTicketId(null)}
                  onClick={() => onSelectTicket(row.ticket.id)}
                  style={{ height: `${rowHeight}px` }}
                  className={`px-3 flex items-center justify-between cursor-pointer transition-none text-xs ${
                    isHovered
                      ? 'bg-black text-white'
                      : isParent
                      ? 'bg-neutral-100 font-bold text-black'
                      : 'hover:bg-neutral-100 text-black'
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0 pr-2" style={{ paddingLeft: `${row.level * 16}px` }}>
                    {/* Expand/Collapse Chevron for Parents */}
                    {isParent ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleParentCollapse(row.ticket.id);
                        }}
                        className={`p-0.5 transition-none shrink-0 ${isHovered ? 'text-white' : 'text-black'}`}
                      >
                        {row.isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                        )}
                      </button>
                    ) : (
                      <span className="w-4 shrink-0 flex items-center justify-center">
                        {isMilestone ? (
                          <span className={`w-2.5 h-2.5 rotate-45 inline-block ${isHovered ? 'bg-white' : 'bg-black'}`} />
                        ) : row.ticket.type === 'RFI' ? (
                          <span className={`w-2 h-2 inline-block border ${isHovered ? 'bg-white border-white' : 'bg-black border-black'}`} />
                        ) : (
                          <span className={`w-1.5 h-1.5 inline-block ${isHovered ? 'bg-white' : 'bg-black'}`} />
                        )}
                      </span>
                    )}

                    {/* Title */}
                    <span
                      className={`truncate text-xs ${
                        isParent ? 'font-serif font-bold tracking-tight' : 'font-sans'
                      }`}
                      title={row.ticket.title}
                    >
                      {row.ticket.title}
                    </span>
                  </div>

                  {/* Badges / SLA indicator */}
                  <div className="flex items-center space-x-2 shrink-0">
                    {sla.isOverdue && !isParent && (
                      <span className={`px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase border ${
                        isHovered ? 'bg-white text-black border-white' : 'bg-black text-white border-black'
                      }`}>
                        逾期
                      </span>
                    )}
                    <span className={`text-[10px] font-mono hidden sm:inline ${
                      isHovered ? 'text-neutral-300' : 'text-neutral-500'
                    }`}>
                      {row.ticket.ticket_no}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resizer Handle */}
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startRatio = splitRatio;
            const onMouseMove = (moveEvent: MouseEvent) => {
              const newWidth = Math.max(220, Math.min(600, startRatio + (moveEvent.clientX - startX)));
              setSplitRatio(newWidth);
            };
            const onMouseUp = () => {
              window.removeEventListener('mousemove', onMouseMove);
              window.removeEventListener('mouseup', onMouseUp);
            };
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
          }}
          className="w-1 hover:w-1.5 bg-black cursor-col-resize shrink-0 transition-none select-none"
          title="拖曳調整左右欄寬度"
        />

        {/* Right Pane: GANTT TIMELINE CANVAS */}
        <div
          ref={ganttScrollRef}
          onScroll={handleGanttScroll}
          className="flex-1 overflow-auto bg-white relative select-none"
        >
          {/* Gantt Content Inner Box */}
          <div
            style={{ width: `${totalDays * cellWidth}px` }}
            className="min-h-full flex flex-col relative"
          >
            
            {/* 3-Tier Multi-Scale Timeline Header */}
            <div className="sticky top-0 z-20 bg-white border-b-2 border-black text-black select-none font-mono">
              
              {/* Row 1: Months (Sep 2026, Oct 2026...) */}
              <div className="h-6 flex border-b border-black font-bold text-[11px] uppercase">
                {calendarHeaders.monthsMap.map((m, i) => (
                  <div
                    key={i}
                    style={{ width: `${m.count * cellWidth}px` }}
                    className="px-2 flex items-center justify-center border-r border-black text-black bg-white"
                  >
                    <span className="truncate">{m.label}</span>
                  </div>
                ))}
              </div>

              {/* Row 2: Calendar Weeks (W39, W40...) */}
              <div className="h-5 flex border-b border-black text-[10px] text-neutral-600 uppercase">
                {calendarHeaders.weeksMap.map((w, i) => (
                  <div
                    key={i}
                    style={{ width: `${w.count * cellWidth}px` }}
                    className="flex items-center justify-center border-r border-black font-mono bg-neutral-50"
                  >
                    <span>{w.label}</span>
                  </div>
                ))}
              </div>

              {/* Row 3: Days of Month (29, 30, 1, 2, 3...) */}
              <div className="h-6 flex text-[10px] text-black font-bold">
                {allDays.map((d, i) => {
                  const dayNum = d.getDate();
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  const isToday = d.toISOString().split('T')[0] === todayStr;

                  return (
                    <div
                      key={i}
                      style={{ width: `${cellWidth}px` }}
                      className={`flex items-center justify-center border-r border-black font-mono ${
                        isToday
                          ? 'bg-black text-white font-bold'
                          : isWeekend
                          ? 'bg-neutral-100 text-neutral-400'
                          : 'bg-white'
                      }`}
                    >
                      {zoomLevel === 'day' ? dayNum : zoomLevel === 'week' ? (dayNum % 2 === 0 ? dayNum : '') : ''}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gantt Timeline Rows & Visual Elements */}
            <div className="relative flex-1">
              
              {/* Background Day Columns & Weekend Highlights */}
              <div className="absolute inset-0 flex pointer-events-none">
                {allDays.map((d, i) => {
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <div
                      key={i}
                      style={{ width: `${cellWidth}px` }}
                      className={`h-full border-r border-neutral-200 ${
                        isWeekend ? 'bg-neutral-50' : ''
                      }`}
                    />
                  );
                })}
              </div>

              {/* BLACK DASHED VERTICAL LINE: TODAY MARKER (2026-09-10) */}
              <div
                style={{ left: `${todayX + cellWidth / 2}px` }}
                className="absolute top-0 bottom-0 w-0 border-r-2 border-dashed border-black z-15 pointer-events-none"
              >
                <div className="sticky top-18 -ml-12 bg-black text-white text-[9px] font-mono font-bold px-2 py-0.5 whitespace-nowrap uppercase tracking-widest">
                  TODAY 09/10
                </div>
              </div>

              {/* SVG Overlay for Orthogonal Dependency Connecting Lines */}
              <svg
                style={{ width: `${totalDays * cellWidth}px`, height: `${treeRows.length * rowHeight}px` }}
                className="absolute top-0 left-0 pointer-events-none z-10"
              >
                <defs>
                  <marker
                    id="dep-arrow"
                    viewBox="0 0 10 10"
                    refX="7"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 8 5 L 0 9 z" fill="#000000" />
                  </marker>
                </defs>
                {dependencyLines.map((line, idx) => (
                  <path
                    key={idx}
                    d={line.path}
                    fill="none"
                    stroke="#000000"
                    strokeWidth="1.5"
                    markerEnd="url(#dep-arrow)"
                    className="opacity-90"
                  />
                ))}
              </svg>

              {/* Rows with Gantt Bars & Milestones */}
              {treeRows.map((row, rowIndex) => {
                const isHovered = hoveredTicketId === row.ticket.id;
                const isParent = row.isParent;
                const isMilestone = row.ticket.is_milestone;

                // Dates & Coordinates
                const startX = getXFromDate(row.computedStartDate);
                const barWidth = getWidthBetweenDates(row.computedStartDate, row.computedDueDate);
                const dueX = startX + barWidth;
                const sla = calculateSla(row.ticket);

                // Format display dates for labels
                const formatLabelDate = (dStr: string) => {
                  const parts = dStr.split('-');
                  return `${parts[1]}/${parts[2]}`;
                };

                return (
                  <div
                    key={row.ticket.id}
                    onMouseEnter={() => setHoveredTicketId(row.ticket.id)}
                    onMouseLeave={() => setHoveredTicketId(null)}
                    onClick={() => onSelectTicket(row.ticket.id)}
                    style={{ height: `${rowHeight}px` }}
                    className={`relative border-b border-neutral-200 flex items-center cursor-pointer transition-none ${
                      isHovered ? 'bg-neutral-100' : ''
                    }`}
                  >
                    {/* A. PARENT SUMMARY WORK PACKAGE (Architectural Bracket) */}
                    {isParent && (
                      <div
                        style={{
                          left: `${startX}px`,
                          width: `${Math.max(barWidth, 60)}px`,
                        }}
                        className="absolute h-5 flex items-center group z-12"
                      >
                        {/* Start date text (left of bracket) */}
                        <span className="absolute -left-12 text-[10px] text-black font-mono whitespace-nowrap">
                          {formatLabelDate(row.computedStartDate)}
                        </span>

                        {/* Bracket Container */}
                        <div className="w-full relative h-3 flex flex-col justify-start">
                          <div className="w-full h-1 bg-black" />
                          <div className="absolute top-0 left-0 w-1 h-3 bg-black" />
                          <div className="absolute top-0 right-0 w-1 h-3 bg-black" />
                        </div>

                        {/* End date & Parent Title */}
                        <div className="absolute left-full ml-3 flex items-center space-x-2 whitespace-nowrap font-mono">
                          <span className="text-[10px] text-neutral-600">
                            {formatLabelDate(row.computedDueDate)}
                          </span>
                          <span className="text-xs font-serif font-bold text-black uppercase">
                            {row.ticket.title}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* B. MILESTONE DIAMOND (Sharp Black ◆) */}
                    {!isParent && isMilestone && (
                      <div
                        style={{ left: `${dueX - 10}px` }}
                        className="absolute flex items-center space-x-3 group z-14"
                      >
                        {/* Rotated Diamond */}
                        <div
                          className={`w-4 h-4 bg-black rotate-45 border-2 border-white transition-none ${
                            isHovered ? 'scale-125' : ''
                          }`}
                        />

                        {/* Milestone date & title label right beside diamond */}
                        <div className="flex items-center space-x-2 whitespace-nowrap pl-2 font-mono">
                          <span className="text-[10px] text-black font-bold">
                            {formatLabelDate(row.computedDueDate)}
                          </span>
                          <span className="text-xs font-serif font-bold text-black uppercase tracking-tight">
                            {row.ticket.title}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* C. TASK & RFI SOLID BAR */}
                    {!isParent && !isMilestone && (
                      <div
                        style={{
                          left: `${startX}px`,
                          width: `${Math.max(barWidth, 32)}px`,
                        }}
                        className={`absolute h-6 border-2 border-black flex items-center z-12 transition-none ${
                          row.ticket.type === 'RFI'
                            ? 'bg-neutral-200'
                            : 'bg-black'
                        } ${isHovered ? 'outline outline-2 outline-black' : ''}`}
                      >
                        {/* Internal Progress Bar Fill */}
                        <div
                          style={{ width: `${row.ticket.progress || 50}%` }}
                          className={`h-full pointer-events-none ${
                            row.ticket.type === 'RFI' ? 'bg-black' : 'bg-white/40'
                          }`}
                        />

                        {/* Left date label */}
                        <span className="absolute -left-12 text-[10px] text-neutral-500 font-mono whitespace-nowrap">
                          {formatLabelDate(row.computedStartDate)}
                        </span>

                        {/* Right date & Task title label beside the bar */}
                        <div className="absolute left-full ml-3 flex items-center space-x-2 whitespace-nowrap font-mono">
                          <span className="text-[10px] text-black font-bold">
                            {formatLabelDate(row.computedDueDate)}
                          </span>
                          <span className="text-xs text-black font-sans font-medium">
                            {row.ticket.title}
                          </span>
                          {sla.isOverdue && (
                            <span className="px-1.5 py-0.2 bg-black text-white text-[9px] font-mono font-bold uppercase border border-black">
                              逾期
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}

            </div>

          </div>
        </div>

      </div>

      {/* 4. Bottom Status Bar */}
      <div className="bg-white border-t-2 border-black px-4 py-2 flex items-center justify-between text-xs font-mono text-black">
        <div className="flex items-center space-x-4">
          <span className="font-bold uppercase tracking-wider">
            共 {treeRows.length} 個工作包與時程項目
          </span>
          <span className="hidden sm:inline text-neutral-400">|</span>
          <span className="hidden sm:inline uppercase text-neutral-600">
            尺度：{zoomLevel === 'day' ? 'DAY' : zoomLevel === 'week' ? 'WEEK' : 'MONTH'}
          </span>
        </div>

        <div className="flex items-center space-x-1 font-mono">
          <button
            onClick={() => setZoomLevel('day')}
            className={`px-3 py-1 text-[11px] font-bold uppercase border border-black transition-none cursor-pointer ${
              zoomLevel === 'day' ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            日 (DAY)
          </button>
          <button
            onClick={() => setZoomLevel('week')}
            className={`px-3 py-1 text-[11px] font-bold uppercase border border-black transition-none cursor-pointer ${
              zoomLevel === 'week' ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            週 (WEEK)
          </button>
          <button
            onClick={() => setZoomLevel('month')}
            className={`px-3 py-1 text-[11px] font-bold uppercase border border-black transition-none cursor-pointer ${
              zoomLevel === 'month' ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            月 (MONTH)
          </button>
        </div>
      </div>
    </div>
  );
};
