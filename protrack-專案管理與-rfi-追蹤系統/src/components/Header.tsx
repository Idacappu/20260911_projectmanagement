import React from 'react';
import { 
  Building2, 
  LayoutDashboard, 
  FileSpreadsheet, 
  FileCode2, 
  Plus, 
  AlertTriangle, 
  Download, 
  UserCheck,
  SplitSquareVertical
} from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
  activeTab: 'kanban' | 'rfi' | 'gantt' | 'srs';
  setActiveTab: (tab: 'kanban' | 'rfi' | 'gantt' | 'srs') => void;
  users: User[];
  currentUser: User | null;
  setCurrentUser: (user: User) => void;
  onOpenCreateModal: () => void;
  onExportCsv: () => void;
  overdueCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  users,
  currentUser,
  setCurrentUser,
  onOpenCreateModal,
  onExportCsv,
  overdueCount,
}) => {
  return (
    <header className="bg-white border-b-4 border-black text-black sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-black text-white flex items-center justify-center border-2 border-black">
              <Building2 className="w-6 h-6 stroke-[1.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <span className="text-2xl font-serif font-black tracking-widest text-black uppercase">
                  PROTRACK
                </span>
                <span className="text-[10px] px-2 py-0.5 border border-black bg-white text-black font-mono uppercase tracking-wider font-semibold">
                  EDITION 2026 // SRS
                </span>
              </div>
              <p className="text-[11px] text-neutral-600 font-mono tracking-tight hidden sm:block">
                ARCHITECTURAL PROJECT MANAGEMENT &amp; RFI RESOLUTION
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 border-2 border-black p-1 bg-white">
            <button
              id="tab-gantt"
              onClick={() => setActiveTab('gantt')}
              className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-none ${
                activeTab === 'gantt'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              <SplitSquareVertical className="w-3.5 h-3.5 stroke-[2]" />
              <span>工程甘特圖 (Gantt)</span>
            </button>

            <button
              id="tab-kanban"
              onClick={() => setActiveTab('kanban')}
              className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-none ${
                activeTab === 'kanban'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 stroke-[2]" />
              <span>視覺看板 (Kanban)</span>
            </button>

            <button
              id="tab-rfi"
              onClick={() => setActiveTab('rfi')}
              className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-none ${
                activeTab === 'rfi'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 stroke-[2]" />
              <span>RFI 清冊</span>
              {overdueCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-white text-black border border-black font-mono font-bold">
                  {overdueCount}
                </span>
              )}
            </button>

            <button
              id="tab-srs"
              onClick={() => setActiveTab('srs')}
              className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-none ${
                activeTab === 'srs'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5 stroke-[2]" />
              <span>SRS 規範</span>
            </button>
          </nav>

          {/* User Role Switcher & Action Buttons */}
          <div className="flex items-center space-x-3">
            {overdueCount > 0 && (
              <div 
                className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 bg-black text-white text-xs font-mono uppercase tracking-wider border-2 border-black cursor-pointer hover:bg-neutral-800"
                onClick={() => setActiveTab('rfi')}
                title="點擊檢視逾期 RFI"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>SLA 逾期: {overdueCount} 件</span>
              </div>
            )}

            {/* Role Switcher */}
            <div className="flex items-center space-x-2 bg-white px-2.5 py-1.5 border-2 border-black">
              <UserCheck className="w-4 h-4 text-black" />
              <select
                id="role-switcher-select"
                aria-label="切換測試角色"
                value={currentUser?.id || 1}
                onChange={(e) => {
                  const u = users.find((item) => item.id === Number(e.target.value));
                  if (u) setCurrentUser(u);
                }}
                className="bg-transparent text-xs font-mono font-bold text-black focus:outline-none cursor-pointer uppercase"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id} className="bg-white text-black font-mono">
                    {u.name} [{u.role}]
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Export CSV */}
            <button
              id="btn-export-csv"
              onClick={onExportCsv}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-black hover:text-white text-black text-xs font-mono font-bold uppercase tracking-wider border-2 border-black transition-none cursor-pointer"
              title="匯出 RFI 彙整清單 CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV 匯出</span>
            </button>

            {/* Create Ticket Button */}
            <button
              id="btn-create-ticket"
              onClick={onOpenCreateModal}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-black hover:bg-white hover:text-black text-white text-xs font-mono font-bold uppercase tracking-widest border-2 border-black transition-none cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>新建單號</span>
            </button>
          </div>
        </div>

        {/* Mobile Tab bar */}
        <div className="flex md:hidden space-x-1 py-2 border-t-2 border-black text-xs">
          <button
            onClick={() => setActiveTab('gantt')}
            className={`flex-1 py-2 text-center font-mono font-bold uppercase tracking-wider border border-black ${
              activeTab === 'gantt' ? 'bg-black text-white' : 'bg-white text-black'
            }`}
          >
            甘特圖
          </button>
          <button
            onClick={() => setActiveTab('kanban')}
            className={`flex-1 py-2 text-center font-mono font-bold uppercase tracking-wider border border-black ${
              activeTab === 'kanban' ? 'bg-black text-white' : 'bg-white text-black'
            }`}
          >
            看板
          </button>
          <button
            onClick={() => setActiveTab('rfi')}
            className={`flex-1 py-2 text-center font-mono font-bold uppercase tracking-wider border border-black ${
              activeTab === 'rfi' ? 'bg-black text-white' : 'bg-white text-black'
            }`}
          >
            RFI {overdueCount > 0 && `(${overdueCount})`}
          </button>
          <button
            onClick={() => setActiveTab('srs')}
            className={`flex-1 py-2 text-center font-mono font-bold uppercase tracking-wider border border-black ${
              activeTab === 'srs' ? 'bg-black text-white' : 'bg-white text-black'
            }`}
          >
            SRS
          </button>
        </div>
      </div>
    </header>
  );
};
