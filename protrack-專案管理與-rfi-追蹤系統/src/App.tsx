import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { KanbanBoard } from './components/KanbanBoard';
import { RfiTable } from './components/RfiTable';
import { TicketDetailModal } from './components/TicketDetailModal';
import { CanvasAnnotatorModal } from './components/CanvasAnnotatorModal';
import { CreateTicketModal } from './components/CreateTicketModal';
import { SrsSpecViewer } from './components/SrsSpecViewer';
import { GanttChart } from './components/GanttChart';
import { Ticket, User, Attachment, TicketFilterOptions, TicketStatus } from './types';
import { calculateSla } from './utils/sla';

export default function App() {
  const [activeTab, setActiveTab] = useState<'kanban' | 'rfi' | 'gantt' | 'srs'>('gantt');
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [filters, setFilters] = useState<TicketFilterOptions>({
    search: '',
    type: 'ALL',
    assigneeId: 'ALL',
    priority: 'ALL',
  });

  // Modals state
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [annotatorAttachment, setAnnotatorAttachment] = useState<Attachment | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch initial users
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
        if (!currentUser && data.data.length > 0) {
          // Default to Contractor or PM
          setCurrentUser(data.data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  }, [currentUser]);

  // Fetch tickets
  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/tickets');
      const data = await res.json();
      if (data.success) {
        setTickets(data.data);
      }
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchTickets();
  }, [fetchUsers, fetchTickets]);

  // Selected ticket derived from tickets state
  const selectedTicket = selectedTicketId
    ? tickets.find((t) => t.id === selectedTicketId) || null
    : null;

  // Filtered tickets based on active filter bar
  const filteredTickets = tickets.filter((t) => {
    // Search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const matchSearch =
        t.ticket_no.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.assignee?.name && t.assignee.name.toLowerCase().includes(q));
      if (!matchSearch) return false;
    }

    // Type
    if (filters.type !== 'ALL' && t.type !== filters.type) {
      return false;
    }

    // Assignee
    if (filters.assigneeId !== 'ALL' && String(t.assignee_id) !== filters.assigneeId) {
      return false;
    }

    // Priority
    if (filters.priority !== 'ALL' && t.priority !== filters.priority) {
      return false;
    }

    return true;
  });

  // Compute total overdue count across all active tickets
  const overdueCount = tickets.filter(
    (t) => calculateSla(t).isOverdue && t.status !== 'DONE'
  ).length;

  // 1. Drag & Drop Status Transition (F-1.2: PATCH /api/v1/tickets/:id/status)
  const handleStatusChange = async (ticketId: number, newStatus: TicketStatus) => {
    // Optimistic UI update
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
    );

    try {
      const res = await fetch(`/api/v1/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error);
      }
      showToast(`單號 #${ticketId} 狀態已更新為「${newStatus}」`);
    } catch (err) {
      console.error('Status transition failed:', err);
      showToast('狀態切換失敗，請刷新重試');
      fetchTickets();
    }
  };

  // 2. Update Ticket Attributes (PATCH /api/v1/tickets/:id)
  const handleUpdateTicket = async (ticketId: number, updates: Partial<Ticket>) => {
    try {
      const res = await fetch(`/api/v1/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        setTickets((prev) =>
          prev.map((t) => (t.id === ticketId ? data.data : t))
        );
        showToast('項目資訊已儲存');
      }
    } catch (err) {
      console.error('Failed to update ticket:', err);
      showToast('更新失敗');
    }
  };

  // 3. Delete Ticket (DELETE /api/v1/tickets/:id)
  const handleDeleteTicket = async (ticketId: number) => {
    try {
      const res = await fetch(`/api/v1/tickets/${ticketId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setTickets((prev) => prev.filter((t) => t.id !== ticketId));
        setSelectedTicketId(null);
        showToast('單號已成功刪除');
      }
    } catch (err) {
      console.error('Failed to delete ticket:', err);
      showToast('刪除失敗');
    }
  };

  // 4. Create Ticket (POST /api/v1/tickets)
  const handleCreateTicket = async (ticketData: any) => {
    const res = await fetch('/api/v1/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ticketData),
    });
    const data = await res.json();
    if (data.success) {
      setTickets((prev) => [data.data, ...prev]);
      showToast(`已成功建立單號：${data.data.ticket_no}`);
      setSelectedTicketId(data.data.id);
    } else {
      throw new Error(data.error || '建立失敗');
    }
  };

  // 5. Add Attachment (POST /api/v1/tickets/:id/attachments)
  const handleAddAttachment = async (
    ticketId: number,
    fileData: { fileName: string; fileUrl: string; fileType: string }
  ) => {
    const res = await fetch(`/api/v1/tickets/${ticketId}/attachments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_name: fileData.fileName,
        file_url: fileData.fileUrl,
        file_type: fileData.fileType,
        uploaded_by: currentUser?.id || 1,
      }),
    });
    const data = await res.json();
    if (data.success) {
      // Re-fetch ticket or enrich local
      await fetchTickets();
      showToast('已成功上傳圖面附件');
    }
  };

  // 6. Save Annotation to Attachment (PUT /api/v1/attachments/:id)
  const handleSaveAnnotation = async (attachmentId: number, newFileUrl: string) => {
    const res = await fetch(`/api/v1/attachments/${attachmentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_url: newFileUrl,
      }),
    });
    const data = await res.json();
    if (data.success) {
      await fetchTickets();
      showToast('畫布標註已成功覆蓋儲存！');
    } else {
      throw new Error(data.error);
    }
  };

  // 7. Delete Attachment (DELETE /api/v1/attachments/:id)
  const handleDeleteAttachment = async (attachmentId: number) => {
    const res = await fetch(`/api/v1/attachments/${attachmentId}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (data.success) {
      await fetchTickets();
      showToast('附件已刪除');
    }
  };

  // 8. Add Comment (POST /api/v1/tickets/:id/comments)
  const handleAddComment = async (ticketId: number, content: string, imageUrl?: string) => {
    const res = await fetch(`/api/v1/tickets/${ticketId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        author_id: currentUser?.id || 1,
        image_url: imageUrl,
      }),
    });
    const data = await res.json();
    if (data.success) {
      await fetchTickets();
      showToast('已送出官方釐清回覆');
    }
  };

  // 9. Export CSV Report (GET /api/v1/reports/rfi/csv)
  const handleExportCsv = () => {
    try {
      const link = document.createElement('a');
      link.href = '/api/v1/reports/rfi/csv';
      link.setAttribute('download', `ProTrack_RFI_Report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('已觸發 RFI 彙整清單 CSV 報表下載');
    } catch (err) {
      console.error('CSV export trigger error:', err);
      window.location.href = '/api/v1/reports/rfi/csv';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col font-mono text-black">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-black text-white text-xs px-4 py-2.5 border-2 border-black flex items-center space-x-2 font-mono uppercase font-bold">
          <span className="w-2 h-2 bg-white"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main App Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        users={users}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onExportCsv={handleExportCsv}
        overdueCount={overdueCount}
      />

      {/* Content depending on Active Tab */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'kanban' && (
          <>
            <FilterBar
              filters={filters}
              setFilters={setFilters}
              users={users}
              tickets={tickets}
            />
            <div className="flex-1">
              <KanbanBoard
                tickets={filteredTickets}
                onTicketClick={(ticket) => setSelectedTicketId(ticket.id)}
                onStatusChange={handleStatusChange}
              />
            </div>
          </>
        )}

        {activeTab === 'rfi' && (
          <RfiTable
            tickets={tickets}
            onTicketClick={(ticket) => setSelectedTicketId(ticket.id)}
            onExportCsv={handleExportCsv}
          />
        )}

        {activeTab === 'gantt' && (
          <div className="flex-1 p-3 sm:p-4 lg:p-6 max-w-[1600px] w-full mx-auto flex flex-col">
            <GanttChart
              tickets={tickets}
              users={users}
              currentUser={currentUser}
              onSelectTicket={(id) => setSelectedTicketId(id)}
              onOpenCreateModal={() => setIsCreateModalOpen(true)}
              onUpdateTicketDates={async (id, startDate, dueDate) => {
                await handleUpdateTicket(id, { start_date: startDate, due_date: dueDate } as any);
              }}
            />
          </div>
        )}

        {activeTab === 'srs' && <SrsSpecViewer />}
      </main>

      {/* Footer info */}
      <footer className="bg-white border-t-2 border-black py-3 text-center text-xs text-black font-mono uppercase">
        PROTRACK 營建工程專案管理與 RFI 追蹤系統 // SPECIFICATION SRS-2026
      </footer>

      {/* Ticket Detail Modal */}
      <TicketDetailModal
        ticket={selectedTicket}
        isOpen={Boolean(selectedTicket)}
        onClose={() => setSelectedTicketId(null)}
        users={users}
        currentUser={currentUser}
        onUpdateTicket={handleUpdateTicket}
        onDeleteTicket={handleDeleteTicket}
        onAddAttachment={handleAddAttachment}
        onDeleteAttachment={handleDeleteAttachment}
        onAddComment={handleAddComment}
        onOpenAnnotator={(att) => setAnnotatorAttachment(att)}
      />

      {/* HTML5 Canvas Annotator Modal */}
      <CanvasAnnotatorModal
        attachment={annotatorAttachment}
        isOpen={Boolean(annotatorAttachment)}
        onClose={() => setAnnotatorAttachment(null)}
        onSaveAnnotation={handleSaveAnnotation}
      />

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        users={users}
        currentUser={currentUser}
        onCreateTicket={handleCreateTicket}
      />
    </div>
  );
}
