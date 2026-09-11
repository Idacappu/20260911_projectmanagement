import React, { useState } from 'react';
import { 
  Paperclip, 
  MessageSquare, 
  AlertTriangle, 
  Calendar, 
  CheckCircle,
  HelpCircle,
  PlayCircle,
  Eye,
  ListTodo
} from 'lucide-react';
import { Ticket, TicketStatus } from '../types';
import { calculateSla } from '../utils/sla';

interface KanbanBoardProps {
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
  onStatusChange: (ticketId: number, newStatus: TicketStatus) => void;
}

interface ColumnConfig {
  id: TicketStatus;
  title: string;
  subTitle: string;
  icon: React.ComponentType<{ className?: string }>;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'TODO',
    title: '待處理',
    subTitle: 'Backlog',
    icon: ListTodo,
  },
  {
    id: 'RFI_PENDING',
    title: '待答 RFI',
    subTitle: 'Clarification',
    icon: HelpCircle,
  },
  {
    id: 'IN_PROGRESS',
    title: '處理中',
    subTitle: 'In Progress',
    icon: PlayCircle,
  },
  {
    id: 'REVIEW',
    title: '審核中',
    subTitle: 'Review',
    icon: Eye,
  },
  {
    id: 'DONE',
    title: '已結案',
    subTitle: 'Resolved',
    icon: CheckCircle,
  },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tickets,
  onTicketClick,
  onStatusChange,
}) => {
  const [draggedTicketId, setDraggedTicketId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TicketStatus | null>(null);

  // Drag and Drop event handlers
  const handleDragStart = (e: React.DragEvent, ticketId: number) => {
    e.dataTransfer.setData('text/plain', String(ticketId));
    setDraggedTicketId(ticketId);
  };

  const handleDragEnd = () => {
    setDraggedTicketId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, status: TicketStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== status) {
      setDragOverColumn(status);
    }
  };

  const handleDragLeave = (status: TicketStatus) => {
    if (dragOverColumn === status) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TicketStatus) => {
    e.preventDefault();
    const idStr = e.dataTransfer.getData('text/plain');
    const ticketId = parseInt(idStr, 10);
    setDragOverColumn(null);
    setDraggedTicketId(null);

    if (!isNaN(ticketId)) {
      onStatusChange(ticketId, targetStatus);
    }
  };

  // Group tickets by column
  const ticketsByColumn: Record<TicketStatus, Ticket[]> = {
    TODO: [],
    RFI_PENDING: [],
    IN_PROGRESS: [],
    REVIEW: [],
    DONE: [],
  };

  tickets.forEach((t) => {
    if (ticketsByColumn[t.status]) {
      ticketsByColumn[t.status].push(t);
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        {COLUMNS.map((column) => {
          const columnTickets = ticketsByColumn[column.id] || [];
          const isOver = dragOverColumn === column.id;
          const Icon = column.icon;

          return (
            <div
              key={column.id}
              id={`column-${column.id}`}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={() => handleDragLeave(column.id)}
              onDrop={(e) => handleDrop(e, column.id)}
              className={`flex flex-col bg-white border-2 border-black transition-none min-h-[600px] ${
                isOver ? 'bg-neutral-100 border-4' : ''
              }`}
            >
              {/* Column Header */}
              <div className="p-3.5 border-b-2 border-black flex items-center justify-between bg-black text-white">
                <div className="flex items-center space-x-2">
                  <Icon className="w-4 h-4 text-white stroke-[2]" />
                  <div>
                    <h3 className="text-xs font-serif font-bold text-white uppercase tracking-wider">
                      {column.title}
                    </h3>
                    <p className="text-[9px] text-neutral-400 font-mono uppercase tracking-widest">{column.subTitle}</p>
                  </div>
                </div>
                <span className="text-[11px] px-2 py-0.5 font-mono font-bold bg-white text-black border border-black">
                  {columnTickets.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="p-3 flex-1 flex flex-col space-y-3 overflow-y-auto custom-scrollbar bg-neutral-50/50">
                {columnTickets.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 py-12 border-2 border-dashed border-neutral-300 bg-white">
                    <p className="text-xs font-mono uppercase tracking-wider">尚無卡片</p>
                    <p className="text-[10px] text-neutral-400 font-mono mt-1">拖曳至此</p>
                  </div>
                ) : (
                  columnTickets.map((ticket) => {
                    const sla = calculateSla(ticket);
                    const isDragging = draggedTicketId === ticket.id;

                    return (
                      <div
                        key={ticket.id}
                        id={`ticket-card-${ticket.id}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, ticket.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onTicketClick(ticket)}
                        className={`bg-white p-4 border-2 cursor-grab active:cursor-grabbing hover:border-4 transition-none relative ${
                          sla.isOverdue && ticket.status !== 'DONE'
                            ? 'border-black bg-white'
                            : 'border-black'
                        } ${isDragging ? 'opacity-30' : 'opacity-100'}`}
                      >
                        {/* Top Meta: Ticket No & Type & SLA Pill */}
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-neutral-200">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-white text-black border border-black">
                              {ticket.ticket_no}
                            </span>
                            {ticket.type === 'RFI' && (
                              <span className="text-[9px] bg-black text-white px-1.5 py-0.5 font-mono uppercase font-bold tracking-wider">
                                RFI
                              </span>
                            )}
                          </div>

                          {/* Priority Tag */}
                          <span
                            className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 ${
                              ticket.priority === 'HIGH'
                                ? 'bg-black text-white border border-black'
                                : ticket.priority === 'MEDIUM'
                                ? 'bg-white text-black border border-black'
                                : 'bg-neutral-100 text-neutral-500 border border-neutral-300'
                            }`}
                          >
                            {ticket.priority === 'HIGH' ? 'HIGH 緊' : ticket.priority === 'MEDIUM' ? 'MED 普' : 'LOW 低'}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="text-sm font-serif font-bold text-black mb-2 line-clamp-2 leading-snug tracking-tight">
                          {ticket.title}
                        </h4>

                        {/* SLA Warning Alert */}
                        {sla.isOverdue && ticket.status !== 'DONE' && (
                          <div className="mb-2 px-2 py-1 bg-black text-white border border-black text-[10px] font-mono font-bold flex items-center space-x-1.5 uppercase tracking-wider">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                            <span className="truncate">SLA 逾期: {sla.statusText}</span>
                          </div>
                        )}

                        {/* Assignee & Due Date Row */}
                        <div className="flex items-center justify-between text-xs pt-2 border-t border-black mt-2 font-mono">
                          <div className="flex items-center space-x-1.5 truncate max-w-[130px]">
                            <div className="w-4 h-4 bg-black text-white flex items-center justify-center text-[9px] font-mono font-bold shrink-0">
                              {ticket.assignee?.name?.[0] || 'U'}
                            </div>
                            <div className="truncate">
                              <span className="font-bold text-black truncate block text-[11px]">
                                {ticket.assignee?.name?.split(' ')?.[0] || '未指派'}
                              </span>
                              <span className="text-[9px] text-neutral-500 block uppercase">
                                [{ticket.assignee?.role}]
                              </span>
                            </div>
                          </div>

                          {/* Due date */}
                          <div className="flex items-center space-x-1 text-[10px]">
                            <Calendar className="w-3 h-3 text-black stroke-[2]" />
                            <span
                              className={`font-mono ${
                                sla.isOverdue && ticket.status !== 'DONE'
                                  ? 'text-black font-bold underline'
                                  : 'text-neutral-700'
                              }`}
                            >
                              {ticket.due_date ? ticket.due_date.slice(5) : '無期限'}
                            </span>
                          </div>
                        </div>

                        {/* Footer Badges (Attachments & Comments count) */}
                        <div className="flex items-center justify-between text-[10px] font-mono text-neutral-600 mt-2.5 pt-1.5 border-t border-neutral-200">
                          <span className="text-[9px] text-neutral-500 uppercase">
                            CREATOR: {ticket.creator?.name?.split(' ')?.[0] || 'USR'}
                          </span>
                          <div className="flex items-center space-x-2.5">
                            {ticket.attachments && ticket.attachments.length > 0 && (
                              <div className="flex items-center space-x-1 text-black font-bold" title={`附件: ${ticket.attachments.length} 個`}>
                                <Paperclip className="w-3 h-3 stroke-[2]" />
                                <span>{ticket.attachments.length}</span>
                              </div>
                            )}
                            {ticket.comments && ticket.comments.length > 0 && (
                              <div className="flex items-center space-x-1 text-black font-bold" title={`討論: ${ticket.comments.length} 則`}>
                                <MessageSquare className="w-3 h-3 stroke-[2]" />
                                <span>{ticket.comments.length}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
