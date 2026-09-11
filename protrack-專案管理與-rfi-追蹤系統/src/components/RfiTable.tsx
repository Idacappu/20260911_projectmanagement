import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  AlertTriangle, 
  Paperclip, 
  ExternalLink,
  Search
} from 'lucide-react';
import { Ticket, TicketStatus } from '../types';
import { calculateSla } from '../utils/sla';

interface RfiTableProps {
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
  onExportCsv: () => void;
}

export const RfiTable: React.FC<RfiTableProps> = ({
  tickets,
  onTicketClick,
  onExportCsv,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [slaFilter, setSlaFilter] = useState<'ALL' | 'OVERDUE' | 'ACTIVE'>('ALL');

  // Filter to RFIs only as this is RFI Tracking module
  const rfiList = tickets.filter((t) => t.type === 'RFI');

  const filteredRfi = rfiList.filter((item) => {
    // Search
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        item.ticket_no.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        (item.creator?.name && item.creator.name.toLowerCase().includes(q)) ||
        (item.assignee?.name && item.assignee.name.toLowerCase().includes(q));
      if (!matchSearch) return false;
    }

    // Status
    if (statusFilter !== 'ALL' && item.status !== statusFilter) {
      return false;
    }

    // SLA
    const sla = calculateSla(item);
    if (slaFilter === 'OVERDUE' && (!sla.isOverdue || item.status === 'DONE')) {
      return false;
    }
    if (slaFilter === 'ACTIVE' && item.status === 'DONE') {
      return false;
    }

    return true;
  });

  const overdueTotal = rfiList.filter((t) => calculateSla(t).isOverdue && t.status !== 'DONE').length;

  const statusNameMap: Record<TicketStatus, string> = {
    TODO: '待處理 [TODO]',
    RFI_PENDING: '待回答 [PENDING]',
    IN_PROGRESS: '處理中 [ACTIVE]',
    REVIEW: '審核中 [REVIEW]',
    DONE: '已結案 [CLOSED]',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner and Summary */}
      <div className="bg-white p-6 border-2 border-black flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <FileSpreadsheet className="w-6 h-6 text-black stroke-[1.5]" />
            <h2 className="text-xl font-serif font-bold text-black uppercase tracking-wider">
              RFI 工程資訊需求單追蹤清冊
            </h2>
            <span className="text-xs bg-black text-white px-2 py-0.5 font-mono uppercase font-bold tracking-wider">
              COUNT: {rfiList.length}
            </span>
          </div>
          <p className="text-xs text-neutral-600 font-mono tracking-tight mt-1">
            RECORD LOG OF ARCHITECTURAL &amp; ENGINEERING CLARIFICATION REQUESTS // SLA MONITORING
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {overdueTotal > 0 && (
            <div className="px-3.5 py-2 bg-black text-white border-2 border-black text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
              <span>SLA OVERDUE: {overdueTotal}</span>
            </div>
          )}
          <button
            id="btn-table-export-csv"
            onClick={onExportCsv}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-white hover:bg-black hover:text-white text-black text-xs font-mono font-bold uppercase tracking-widest border-2 border-black transition-none cursor-pointer"
          >
            <Download className="w-4 h-4 stroke-[2]" />
            <span>匯出 CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="bg-white p-4 border-2 border-black flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="w-4 h-4 text-black absolute left-3.5 top-1/2 -translate-y-1/2 stroke-[2]" />
          <input
            type="text"
            placeholder="搜尋單號、標題、提問人、技師..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-xs font-mono bg-white border-2 border-black focus:outline-none focus:border-4 transition-none placeholder:italic placeholder:text-neutral-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 font-mono">
          {/* Status Filter */}
          <div className="flex items-center space-x-2 text-xs bg-white border-2 border-black px-3 py-1.5">
            <span className="text-neutral-600 uppercase text-[10px] font-bold">STATUS:</span>
            <select
              aria-label="依狀態過濾清冊"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-black focus:outline-none cursor-pointer uppercase"
            >
              <option value="ALL">全部狀態</option>
              <option value="TODO">待處理</option>
              <option value="RFI_PENDING">待回答 RFI</option>
              <option value="IN_PROGRESS">處理中</option>
              <option value="REVIEW">審核中</option>
              <option value="DONE">已結案</option>
            </select>
          </div>

          {/* SLA Filter */}
          <div className="flex items-center space-x-2 text-xs bg-white border-2 border-black px-3 py-1.5">
            <span className="text-neutral-600 uppercase text-[10px] font-bold">SLA ALERT:</span>
            <select
              aria-label="依SLA時效過濾"
              value={slaFilter}
              onChange={(e) => setSlaFilter(e.target.value as any)}
              className="bg-transparent text-xs font-mono font-bold text-black focus:outline-none cursor-pointer uppercase"
            >
              <option value="ALL">全部項目</option>
              <option value="OVERDUE">僅顯示逾期項目 ({overdueTotal})</option>
              <option value="ACTIVE">進行中項目</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border-2 border-black overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-black text-white border-b-2 border-black font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">RFI 單號</th>
                <th className="py-3 px-4 min-w-[260px]">疑義項目標題</th>
                <th className="py-3 px-4">看板狀態</th>
                <th className="py-3 px-4">提問人員</th>
                <th className="py-3 px-4">指定技師</th>
                <th className="py-3 px-4">預計回覆日</th>
                <th className="py-3 px-4">SLA 時效</th>
                <th className="py-3 px-4 text-center">附件</th>
                <th className="py-3 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y border-black divide-neutral-200 bg-white">
              {filteredRfi.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-neutral-400 font-mono uppercase tracking-wider">
                    NO MATCHING RFI RECORDS FOUND
                  </td>
                </tr>
              ) : (
                filteredRfi.map((item) => {
                  const sla = calculateSla(item);
                  const isOverdue = sla.isOverdue && item.status !== 'DONE';

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-neutral-100 transition-none ${
                        isOverdue ? 'bg-neutral-50' : ''
                      }`}
                    >
                      {/* Ticket No */}
                      <td className="py-3 px-4 font-mono font-bold whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs inline-block font-mono font-bold border ${
                            isOverdue
                              ? 'bg-black text-white border-black'
                              : 'bg-white text-black border-black'
                          }`}
                        >
                          {item.ticket_no}
                        </span>
                      </td>

                      {/* Title & Excerpt */}
                      <td className="py-3 px-4">
                        <div
                          className="font-serif font-bold text-sm text-black hover:underline cursor-pointer tracking-tight"
                          onClick={() => onTicketClick(item)}
                        >
                          {item.title}
                        </div>
                        <p className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5 font-sans">
                          {item.description || '無詳細說明'}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 text-[10px] font-mono font-bold border uppercase tracking-wider inline-block ${
                            item.status === 'DONE'
                              ? 'border-neutral-300 text-neutral-400 line-through'
                              : item.status === 'RFI_PENDING'
                              ? 'border-2 border-black bg-white text-black'
                              : 'border border-black bg-black text-white'
                          }`}
                        >
                          {statusNameMap[item.status]}
                        </span>
                      </td>

                      {/* Creator */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono">
                        <div className="font-bold text-black text-xs">
                          {item.creator?.name || '未知人員'}
                        </div>
                        <div className="text-[9px] text-neutral-500 uppercase">
                          [{item.creator?.role || 'CREATOR'}]
                        </div>
                      </td>

                      {/* Assignee */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono">
                        <div className="font-bold text-black text-xs">
                          {item.assignee?.name || '未指派'}
                        </div>
                        <div className="text-[9px] text-neutral-500 uppercase">
                          [{item.assignee?.role || 'UNASSIGNED'}]
                        </div>
                      </td>

                      {/* Due Date */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono">
                        <span
                          className={`font-bold ${
                            isOverdue
                              ? 'bg-black text-white px-1.5 py-0.5 border border-black'
                              : 'text-black'
                          }`}
                        >
                          {item.due_date || '未設定'}
                        </span>
                      </td>

                      {/* SLA Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider border inline-flex items-center space-x-1 ${
                            isOverdue
                              ? 'bg-black text-white border-black'
                              : item.status === 'DONE'
                              ? 'border-neutral-200 text-neutral-400'
                              : 'border-black text-black bg-white'
                          }`}
                        >
                          {isOverdue && <AlertTriangle className="w-3 h-3 stroke-[2.5]" />}
                          <span>{sla.statusText}</span>
                        </span>
                      </td>

                      {/* Attachments */}
                      <td className="py-3 px-4 text-center font-bold text-black">
                        {item.attachments && item.attachments.length > 0 ? (
                          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 border border-black bg-white">
                            <Paperclip className="w-3 h-3 stroke-[2]" />
                            <span>{item.attachments.length}</span>
                          </span>
                        ) : (
                          <span className="text-neutral-400">0</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => onTicketClick(item)}
                          className="inline-flex items-center space-x-1 text-xs font-mono font-bold uppercase tracking-wider text-black hover:bg-black hover:text-white px-2.5 py-1 border-2 border-black transition-none cursor-pointer"
                        >
                          <span>檢視</span>
                          <ExternalLink className="w-3 h-3 stroke-[2]" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
