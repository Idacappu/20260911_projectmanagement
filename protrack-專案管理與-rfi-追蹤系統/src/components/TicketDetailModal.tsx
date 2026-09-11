import React, { useState, useEffect } from 'react';
import { 
  X, 
  Paperclip, 
  Send, 
  Calendar, 
  AlertTriangle, 
  Edit3, 
  Trash2, 
  UploadCloud, 
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  UserCheck,
  Tag,
  Palette
} from 'lucide-react';
import { Ticket, User, Attachment, Comment, TicketStatus, PriorityLevel } from '../types';
import { calculateSla } from '../utils/sla';
import { extractImageFromClipboard, processImageBlob } from '../utils/image';

interface TicketDetailModalProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  currentUser: User | null;
  onUpdateTicket: (ticketId: number, updates: Partial<Ticket>) => Promise<void>;
  onDeleteTicket: (ticketId: number) => Promise<void>;
  onAddAttachment: (ticketId: number, fileData: { fileName: string; fileUrl: string; fileType: string }) => Promise<void>;
  onDeleteAttachment: (attachmentId: number) => Promise<void>;
  onAddComment: (ticketId: number, content: string, imageUrl?: string) => Promise<void>;
  onOpenAnnotator: (attachment: Attachment) => void;
}

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  ticket,
  isOpen,
  onClose,
  users,
  currentUser,
  onUpdateTicket,
  onDeleteTicket,
  onAddAttachment,
  onDeleteAttachment,
  onAddComment,
  onOpenAnnotator,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedStatus, setEditedStatus] = useState<TicketStatus>('TODO');
  const [editedPriority, setEditedPriority] = useState<PriorityLevel>('MEDIUM');
  const [editedAssigneeId, setEditedAssigneeId] = useState<number>(1);
  const [editedDueDate, setEditedDueDate] = useState<string>('');

  // Comment input
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [pasteNotice, setPasteNotice] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isConfirmingDeleteTicket, setIsConfirmingDeleteTicket] = useState(false);
  const [confirmingDeleteAttId, setConfirmingDeleteAttId] = useState<number | null>(null);

  useEffect(() => {
    if (ticket) {
      setEditedTitle(ticket.title);
      setEditedDescription(ticket.description || '');
      setEditedStatus(ticket.status);
      setEditedPriority(ticket.priority);
      setEditedAssigneeId(ticket.assignee_id);
      setEditedDueDate(ticket.due_date || '');
      setIsEditing(false);
      setIsConfirmingDeleteTicket(false);
      setConfirmingDeleteAttId(null);
      setUploadError(null);
    }
  }, [ticket]);

  // F-3.1 Clipboard Image Paste listener:
  // 監聽 modal/詳細頁之 paste 事件。當剪貼簿內包含 image/png 或 image/jpeg 時，自動提取 Blob 檔案並透過 POST /api/v1/tickets/:id/attachments 上傳，自動產生微縮圖。
  useEffect(() => {
    if (!isOpen || !ticket) return;

    const handleWindowPaste = async (e: ClipboardEvent) => {
      const file = extractImageFromClipboard(e);
      if (file) {
        e.preventDefault();
        setIsUploadingAttachment(true);
        setPasteNotice(true);
        setUploadError(null);
        try {
          const processed = await processImageBlob(file, `截圖_${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.png`);
          await onAddAttachment(ticket.id, {
            fileName: processed.fileName,
            fileUrl: processed.dataUrl,
            fileType: processed.fileType,
          });
        } catch (err) {
          console.error('Failed to process pasted screenshot:', err);
          setUploadError('貼上截圖處理失敗，請重試');
        } finally {
          setIsUploadingAttachment(false);
          setTimeout(() => setPasteNotice(false), 2500);
        }
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => {
      window.removeEventListener('paste', handleWindowPaste);
    };
  }, [isOpen, ticket, onAddAttachment]);

  if (!isOpen || !ticket) return null;

  const sla = calculateSla(ticket);
  const isOverdue = sla.isOverdue && ticket.status !== 'DONE';

  const handleSaveAttributes = async () => {
    await onUpdateTicket(ticket.id, {
      title: editedTitle,
      description: editedDescription,
      status: editedStatus,
      priority: editedPriority,
      assignee_id: editedAssigneeId,
      due_date: editedDueDate,
    });
    setIsEditing(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    // MIME type check as required by 6.2 Security specs
    const validMimes = ['image/png', 'image/jpeg', 'application/pdf'];
    if (!validMimes.includes(file.type)) {
      setUploadError('格式限制：僅支援 PNG, JPEG 圖片及 PDF 文件');
      return;
    }

    // Size limit 15MB
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('檔案容量過大：單一檔案不可超過 15MB');
      return;
    }

    setIsUploadingAttachment(true);
    try {
      const processed = await processImageBlob(file, file.name);
      await onAddAttachment(ticket.id, {
        fileName: processed.fileName,
        fileUrl: processed.dataUrl,
        fileType: processed.fileType,
      });
    } catch (err) {
      console.error('Attachment upload failed:', err);
      setUploadError('附件上傳失敗，請確認網路連線');
    } finally {
      setIsUploadingAttachment(false);
      e.target.value = '';
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsSubmittingComment(true);
    try {
      await onAddComment(ticket.id, commentText.trim());
      setCommentText('');
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const insertTemplate = (prefix: string) => {
    setCommentText((prev) => (prev ? `${prev}\n${prefix}: ` : `${prefix}: `));
  };

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-black/80 flex items-center justify-center p-3 sm:p-6">
      <div 
        id="ticket-detail-modal-container"
        className="bg-white border-4 border-black max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden"
      >
        
        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-black text-white flex items-center justify-between border-b-2 border-black">
          <div className="flex items-center space-x-3 font-mono">
            <span
              className={`text-xs font-mono font-bold px-2.5 py-1 border ${
                ticket.type === 'RFI'
                  ? 'bg-white text-black border-white'
                  : 'bg-black text-white border-white'
              }`}
            >
              {ticket.ticket_no}
            </span>
            <span className="text-xs uppercase tracking-wider text-neutral-300 font-bold">
              {ticket.type === 'RFI' ? 'RFI 資訊需求單' : 'TASK 工程任務'}
            </span>

            {isOverdue && (
              <span className="px-2.5 py-0.5 bg-white text-black text-xs font-bold uppercase border border-white flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5 stroke-[2]" />
                <span>{sla.statusText}</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 font-mono">
            {isConfirmingDeleteTicket ? (
              <div className="flex items-center space-x-1.5 bg-black border-2 border-white px-2.5 py-1 text-xs">
                <span className="text-white font-bold">確定刪除此單？</span>
                <button
                  onClick={() => {
                    onDeleteTicket(ticket.id);
                    onClose();
                  }}
                  className="px-2 py-0.5 bg-white text-black font-bold uppercase transition-none cursor-pointer"
                >
                  確認
                </button>
                <button
                  onClick={() => setIsConfirmingDeleteTicket(false)}
                  className="px-1.5 py-0.5 text-white underline cursor-pointer"
                >
                  取消
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsConfirmingDeleteTicket(true)}
                className="p-1.5 text-white hover:bg-white hover:text-black border border-white transition-none cursor-pointer"
                title="刪除單號"
              >
                <Trash2 className="w-4 h-4 stroke-[2]" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-white hover:bg-white hover:text-black border border-white transition-none cursor-pointer"
            >
              <X className="w-5 h-5 stroke-[2]" />
            </button>
          </div>
        </div>

        {/* Modal Body: Two columns layout */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono">
          
          {/* Main Left Section: Title, Description, Attachments, Discussions (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Title & Description Card */}
            <div className="bg-white p-4 border-2 border-black">
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">標題</label>
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="w-full text-sm font-serif font-bold p-2 border-2 border-black bg-white text-black focus:outline-none focus:border-4"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">工程疑義與說明</label>
                    <textarea
                      rows={4}
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      className="w-full text-xs p-2.5 border-2 border-black bg-white text-black focus:outline-none focus:border-4"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 text-xs text-black border border-black hover:bg-neutral-100 uppercase cursor-pointer"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSaveAttributes}
                      className="px-4 py-1.5 text-xs bg-black text-white font-bold border border-black uppercase cursor-pointer"
                    >
                      儲存修改
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between">
                    <h2 className="text-base font-serif font-bold text-black uppercase tracking-tight leading-snug">{ticket.title}</h2>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-xs text-black hover:underline font-bold flex items-center space-x-1 shrink-0 ml-2 uppercase cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 stroke-[2]" />
                      <span>[編輯]</span>
                    </button>
                  </div>
                  <div className="mt-3 text-xs text-black whitespace-pre-wrap leading-relaxed font-sans">
                    {ticket.description || '無詳細說明。'}
                  </div>
                </div>
              )}
            </div>

            {/* Attachments Section */}
            <div className="bg-white p-4 border-2 border-black space-y-3">
              <div className="flex items-center justify-between border-b-2 border-black pb-2">
                <div className="flex items-center space-x-2">
                  <Paperclip className="w-4 h-4 text-black stroke-[2]" />
                  <h3 className="text-xs font-serif font-bold text-black uppercase tracking-wider">多媒體附件與線上畫布標註</h3>
                  <span className="text-[10px] bg-black text-white px-2 py-0.5 font-bold font-mono">
                    {ticket.attachments?.length || 0}
                  </span>
                </div>

                <label className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-black hover:bg-neutral-800 text-white text-xs font-bold uppercase cursor-pointer transition-none border-2 border-black">
                  <UploadCloud className="w-3.5 h-3.5 stroke-[2]" />
                  <span>上傳附件</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Upload Error Banner */}
              {uploadError && (
                <div className="p-2.5 bg-black text-white border-2 border-black text-xs flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4 stroke-[2] shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                  <button
                    onClick={() => setUploadError(null)}
                    className="text-white hover:underline font-bold ml-2 text-xs cursor-pointer"
                  >
                    [關閉]
                  </button>
                </div>
              )}

              {/* Clipboard paste notice banner */}
              <div
                className={`p-2.5 border-2 border-black text-xs flex items-center justify-between ${
                  pasteNotice
                    ? 'bg-neutral-100 text-black font-bold'
                    : 'bg-white text-black'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="font-mono bg-black text-white px-1.5 py-0.5 text-[10px] font-bold">
                    CTRL + V
                  </span>
                  <span>支援螢幕截圖直接貼上！在任意位置按 Ctrl+V 即自動提取上傳。</span>
                </div>
                {isUploadingAttachment && (
                  <span className="text-black font-bold uppercase text-xs">
                    上傳處理中...
                  </span>
                )}
              </div>

              {/* Attachments Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {!ticket.attachments || ticket.attachments.length === 0 ? (
                  <div className="col-span-2 py-8 text-center border-2 border-dashed border-black bg-neutral-50 text-neutral-600 text-xs">
                    尚無圖面附件。點擊上方「上傳附件」或直接按「CTRL + V」貼上施工截圖。
                  </div>
                ) : (
                  ticket.attachments.map((att) => {
                    const isImg = att.file_url.startsWith('data:image') || att.file_type.includes('image');

                    return (
                      <div
                        key={att.id}
                        className="group border-2 border-black p-2 bg-white flex flex-col justify-between"
                      >
                        {/* Thumbnail / Preview */}
                        <div
                          className="w-full h-32 bg-neutral-100 border border-black overflow-hidden flex items-center justify-center relative cursor-pointer"
                          onClick={() => {
                            if (isImg) onOpenAnnotator(att);
                          }}
                        >
                          {isImg ? (
                            <>
                              <img
                                src={att.file_url}
                                alt={att.file_name}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 flex items-center justify-center space-x-1.5 text-white text-xs font-bold uppercase transition-none">
                                <Palette className="w-4 h-4 stroke-[2]" />
                                <span>開啟畫布標註</span>
                              </div>
                            </>
                          ) : (
                            <div className="text-black flex flex-col items-center">
                              <ImageIcon className="w-8 h-8 stroke-[1.5]" />
                              <span className="text-[10px] mt-1 font-bold">PDF / 文件</span>
                            </div>
                          )}
                        </div>

                        {/* Info & Actions */}
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <div className="truncate max-w-[170px]" title={att.file_name}>
                            <span className="font-bold text-black truncate block text-[11px]">
                              {att.file_name}
                            </span>
                            <span className="text-[10px] text-neutral-500 block">
                              {att.uploader_name || '上傳者'} · {att.created_at.slice(5, 10)}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1">
                            {isImg && (
                              <button
                                onClick={() => onOpenAnnotator(att)}
                                className="p-1 border border-black hover:bg-black hover:text-white transition-none cursor-pointer"
                                title="線上標註 (Canvas)"
                              >
                                <Palette className="w-3.5 h-3.5 stroke-[2]" />
                              </button>
                            )}

                            {confirmingDeleteAttId === att.id ? (
                              <div className="flex items-center space-x-1 bg-black text-white p-1 border border-black">
                                <span className="text-[10px] font-bold">確定？</span>
                                <button
                                  onClick={() => {
                                    onDeleteAttachment(att.id);
                                    setConfirmingDeleteAttId(null);
                                  }}
                                  className="px-1.5 py-0.5 bg-white text-black font-bold text-[10px] cursor-pointer"
                                >
                                  是
                                </button>
                                <button
                                  onClick={() => setConfirmingDeleteAttId(null)}
                                  className="px-1 py-0.5 text-white underline text-[10px] cursor-pointer"
                                >
                                  否
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmingDeleteAttId(att.id)}
                                className="p-1 border border-black hover:bg-black hover:text-white transition-none cursor-pointer"
                                title="刪除附件"
                              >
                                <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Timeline Discussion & Audit Trail */}
            <div className="bg-white p-4 border-2 border-black space-y-4">
              <div className="flex items-center justify-between border-b-2 border-black pb-2">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-black stroke-[2]" />
                  <h3 className="text-xs font-serif font-bold text-black uppercase tracking-wider">團隊指派與歷程討論區 (AUDIT TRAIL)</h3>
                </div>
                <span className="text-xs text-neutral-600 font-bold">
                  {ticket.comments?.length || 0} 則留言
                </span>
              </div>

              {/* Comments Timeline */}
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {!ticket.comments || ticket.comments.length === 0 ? (
                  <p className="text-xs text-neutral-500 py-4 text-center">
                    尚無官方討論回覆。技師或工務所可在下方輸入釐清意見。
                  </p>
                ) : (
                  ticket.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="p-3 bg-neutral-50 border-2 border-black text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between border-b border-black pb-1">
                        <div className="flex items-center space-x-2">
                          <div className="w-5 h-5 bg-black text-white flex items-center justify-center text-[10px] font-bold">
                            {comment.author_name?.[0] || 'U'}
                          </div>
                          <span className="font-bold text-black">{comment.author_name}</span>
                          <span className="text-[10px] bg-black text-white px-1.5 py-0.2 font-mono uppercase">
                            {comment.author_role}
                          </span>
                        </div>
                        <span className="text-[10px] text-neutral-600 font-mono">
                          {new Date(comment.created_at).toLocaleString('zh-TW', {
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-black whitespace-pre-wrap leading-relaxed font-sans pt-1">
                        {comment.content}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleCommentSubmit} className="pt-2 border-t-2 border-black space-y-2">
                <div className="flex items-center space-x-1.5 text-[10px] text-black font-bold uppercase">
                  <span>快速範本:</span>
                  <button
                    type="button"
                    onClick={() => insertTemplate('【結構技師釐清意見】')}
                    className="px-2 py-0.5 bg-white border border-black hover:bg-black hover:text-white uppercase transition-none cursor-pointer"
                  >
                    技師釐清
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTemplate('【建築師圖面核准說明】')}
                    className="px-2 py-0.5 bg-white border border-black hover:bg-black hover:text-white uppercase transition-none cursor-pointer"
                  >
                    建築核准
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTemplate('【工務所現場回報】')}
                    className="px-2 py-0.5 bg-white border border-black hover:bg-black hover:text-white uppercase transition-none cursor-pointer"
                  >
                    現場回報
                  </button>
                </div>

                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    placeholder={`以「${currentUser?.name || '使用者'} (${currentUser?.role || ''})」身分發表官方釐清說明...`}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-1 text-xs p-2.5 bg-white border-2 border-black text-black focus:outline-none focus:border-4"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingComment || !commentText.trim()}
                    className="px-5 bg-black hover:bg-neutral-800 text-white border-2 border-black flex items-center justify-center transition-none disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-4 h-4 stroke-[2]" />
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Sidebar: Attributes & Status management (1 col) */}
          <div className="space-y-5 font-mono">
            
            {/* Status & Priority Control Card */}
            <div className="bg-white p-4 border-2 border-black space-y-4">
              <h4 className="text-xs font-serif font-bold text-black uppercase tracking-wider border-b-2 border-black pb-1">
                單號屬性與流程
              </h4>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">看板流程狀態</label>
                <select
                  value={ticket.status}
                  onChange={(e) => onUpdateTicket(ticket.id, { status: e.target.value as TicketStatus })}
                  className="w-full text-xs font-bold p-2 bg-white border-2 border-black text-black cursor-pointer"
                >
                  <option value="TODO">待處理 (Backlog)</option>
                  <option value="RFI_PENDING">待回答 RFI</option>
                  <option value="IN_PROGRESS">處理中 (In Progress)</option>
                  <option value="REVIEW">審核中 (Review)</option>
                  <option value="DONE">已結案 (Done)</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">優先級</label>
                <select
                  value={ticket.priority}
                  onChange={(e) => onUpdateTicket(ticket.id, { priority: e.target.value as PriorityLevel })}
                  className="w-full text-xs font-bold p-2 bg-white border-2 border-black text-black cursor-pointer"
                >
                  <option value="HIGH">緊急 (HIGH)</option>
                  <option value="MEDIUM">一般 (MEDIUM)</option>
                  <option value="LOW">低 (LOW)</option>
                </select>
              </div>

              {/* Assignee */}
              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">負責人 / 技師</label>
                <select
                  value={ticket.assignee_id}
                  onChange={(e) => onUpdateTicket(ticket.id, { assignee_id: Number(e.target.value) })}
                  className="w-full text-xs font-bold p-2 bg-white border-2 border-black text-black cursor-pointer"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} [{u.role}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">預計回覆日 (DUE)</label>
                <input
                  type="date"
                  value={ticket.due_date || ''}
                  onChange={(e) => onUpdateTicket(ticket.id, { due_date: e.target.value })}
                  className="w-full text-xs font-mono font-bold p-2 bg-white border-2 border-black text-black"
                />
              </div>

              {/* SLA Warning Status Card */}
              <div
                className={`p-3 border-2 border-black text-xs space-y-1 ${
                  isOverdue
                    ? 'bg-black text-white font-bold'
                    : 'bg-neutral-100 text-black'
                }`}
              >
                <div className="flex items-center space-x-1.5 font-bold uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5 stroke-[2]" />
                  <span>SLA 時效檢驗：</span>
                </div>
                <div className="text-[11px] leading-relaxed pt-1">
                  {sla.statusText}
                  {isOverdue && (
                    <p className="mt-1 text-neutral-300 font-bold uppercase">
                      [注意] 請儘速聯繫指派之技師或建築師進行回覆。
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Audit Metadata */}
            <div className="bg-white p-3.5 border-2 border-black text-[10px] text-black space-y-1.5 font-mono uppercase">
              <div>
                <span>提問單位：</span>
                <strong className="text-black font-bold">
                  {ticket.creator?.name} [{ticket.creator?.role}]
                </strong>
              </div>
              <div>
                <span>建立時間：</span>
                <span className="text-neutral-700">
                  {new Date(ticket.created_at).toLocaleString('zh-TW')}
                </span>
              </div>
              <div>
                <span>最後更新：</span>
                <span className="text-neutral-700">
                  {new Date(ticket.updated_at).toLocaleString('zh-TW')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
