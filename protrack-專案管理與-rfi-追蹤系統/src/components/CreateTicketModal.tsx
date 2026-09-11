import React, { useState } from 'react';
import { X, Plus, AlertCircle, FileText, Layers, Calendar, UserCheck, ShieldAlert } from 'lucide-react';
import { TicketType, PriorityLevel, User } from '../types';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  currentUser: User | null;
  onCreateTicket: (ticketData: {
    type: TicketType;
    title: string;
    description: string;
    priority: PriorityLevel;
    creator_id: number;
    assignee_id: number;
    due_date: string;
  }) => Promise<void>;
}

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  onCreateTicket,
}) => {
  const [type, setType] = useState<TicketType>('RFI');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('MEDIUM');
  
  // Default assignee: Architect (2) or Engineer (3) for RFI
  const [assigneeId, setAssigneeId] = useState<number>(3);
  
  // Default due date: 5 days from now
  const defaultDueDate = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().split('T')[0];
  const [dueDate, setDueDate] = useState<string>(defaultDueDate);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const previewNo = `${type}-${yearMonth}-XXX`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!title.trim()) {
      setFormError('請填寫疑義項目或任務標題');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateTicket({
        type,
        title: title.trim(),
        description: description.trim(),
        priority,
        creator_id: currentUser?.id || 1,
        assignee_id: Number(assigneeId),
        due_date: dueDate,
      });
      // Reset form
      setTitle('');
      setDescription('');
      setFormError(null);
      onClose();
    } catch (err) {
      console.error('Failed to create ticket:', err);
      setFormError('建立失敗，請確認資料格式或後端連線');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white border-4 border-black max-w-xl w-full flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-black text-white flex items-center justify-between border-b-2 border-black">
          <div>
            <h3 className="text-base font-serif font-bold uppercase tracking-wider flex items-center space-x-2">
              <Plus className="w-4 h-4 stroke-[2]" />
              <span>新建工程疑義單 // 工作任務</span>
            </h3>
            <p className="text-xs font-mono text-neutral-400 mt-1">
              自動生成單號格式：
              <span className="font-mono text-white font-bold ml-1 uppercase">{previewNo}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white hover:bg-white hover:text-black border border-white transition-none cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[2]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-mono">
          
          {/* Error Message */}
          {formError && (
            <div className="p-3 bg-black text-white border-2 border-black text-xs flex items-center justify-between">
              <span className="font-bold">{formError}</span>
              <button
                type="button"
                onClick={() => setFormError(null)}
                className="text-white hover:underline font-bold ml-2 cursor-pointer"
              >
                [關閉]
              </button>
            </div>
          )}

          {/* Type Toggle */}
          <div>
            <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">
              單號類型 (TYPE)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setType('RFI');
                  setAssigneeId(3); // default Engineer
                }}
                className={`p-3 border-2 border-black flex items-center space-x-2.5 transition-none text-left cursor-pointer ${
                  type === 'RFI'
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-neutral-100'
                }`}
              >
                <div className={`w-7 h-7 flex items-center justify-center border ${type === 'RFI' ? 'border-white text-white' : 'border-black text-black'}`}>
                  <FileText className="w-4 h-4 stroke-[2]" />
                </div>
                <div>
                  <div className="font-bold text-xs uppercase">RFI 資訊需求單</div>
                  <div className={`text-[10px] ${type === 'RFI' ? 'text-neutral-300' : 'text-neutral-600'}`}>設計疑義、尺寸衝突</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('TASK');
                  setAssigneeId(4); // default Contractor
                }}
                className={`p-3 border-2 border-black flex items-center space-x-2.5 transition-none text-left cursor-pointer ${
                  type === 'TASK'
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-neutral-100'
                }`}
              >
                <div className={`w-7 h-7 flex items-center justify-center border ${type === 'TASK' ? 'border-white text-white' : 'border-black text-black'}`}>
                  <Layers className="w-4 h-4 stroke-[2]" />
                </div>
                <div>
                  <div className="font-bold text-xs uppercase">TASK 工程任務</div>
                  <div className={`text-[10px] ${type === 'TASK' ? 'text-neutral-300' : 'text-neutral-600'}`}>品管、圖面、驗收</div>
                </div>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">
              標題 (TITLE) *
            </label>
            <input
              type="text"
              required
              placeholder={type === 'RFI' ? '例：B2F-C3 柱筋與排污幹管套管淨距衝突疑義' : '例：完成 2F 頂板混凝土澆置前鋼筋自主查驗'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs font-serif font-bold p-2.5 bg-white border-2 border-black text-black focus:outline-none focus:border-4"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">
              工程疑義與說明 (DESCRIPTION)
            </label>
            <textarea
              rows={3}
              placeholder="詳細說明圖面編號、施工軸線、問題描述及具體釐清需求..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border-2 border-black text-black focus:outline-none focus:border-4"
            />
          </div>

          {/* Grid: Assignee, Priority, Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Assignee */}
            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">負責人 / 技師</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(Number(e.target.value))}
                className="w-full text-xs font-bold p-2 bg-white border-2 border-black text-black"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">優先級 (PRIORITY)</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full text-xs font-bold p-2 bg-white border-2 border-black text-black"
              >
                <option value="HIGH">緊急 (HIGH)</option>
                <option value="MEDIUM">一般 (MEDIUM)</option>
                <option value="LOW">低 (LOW)</option>
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">預計回覆日 (DUE)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-xs font-mono font-bold p-2 bg-white border-2 border-black text-black"
              >
              </input>
            </div>
          </div>

          {/* SLA Rule note */}
          <div className="p-3 bg-neutral-100 border-2 border-black text-black flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 stroke-[2] shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>SLA 自動催辦機制：</strong>系統每日比對基準日與「預計回覆日」，逾期將以黑底粗框顯示並列入催辦清冊。建立後可直接按 <span className="font-mono bg-black text-white px-1">Ctrl+V</span> 貼上施工照片或截圖。
            </p>
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end space-x-3 border-t-2 border-black">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-black bg-white hover:bg-neutral-100 border-2 border-black uppercase transition-none cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 text-xs font-bold text-white bg-black hover:bg-neutral-800 border-2 border-black uppercase transition-none disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? '建立中...' : '確認建立單號'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
