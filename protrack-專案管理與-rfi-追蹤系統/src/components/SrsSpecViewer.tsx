import React, { useState } from 'react';
import { 
  FileCode2, 
  Database, 
  Network, 
  Server, 
  ShieldCheck, 
  Copy, 
  Check, 
  Terminal, 
  ExternalLink,
  Code2
} from 'lucide-react';

export const SrsSpecViewer: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [apiTestResponse, setApiTestResponse] = useState<string | null>(null);
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);

  const copyToClipboard = async (text: string, sectionId: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedSection(sectionId);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.warn('Clipboard write failed, using fallback:', err);
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopiedSection(sectionId);
        setTimeout(() => setCopiedSection(null), 2000);
      } catch (fallbackErr) {
        console.error('Copy totally failed:', fallbackErr);
      }
    }
  };

  const testApi = async (endpoint: string, method = 'GET') => {
    setTestingEndpoint(endpoint);
    try {
      const res = await fetch(endpoint, { method });
      const data = await res.json();
      setApiTestResponse(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setApiTestResponse(`Error: ${err.message}`);
    }
  };

  const postgresSchema = `-- 1. 使用者與角色表 (users)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'PM', 'Architect', 'Engineer', 'Contractor'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. 任務/RFI 主表 (tickets)
CREATE TABLE tickets (
    id SERIAL PRIMARY KEY,
    ticket_no VARCHAR(50) UNIQUE NOT NULL, -- e.g. RFI-202609-001
    type VARCHAR(20) NOT NULL,             -- 'RFI', 'TASK'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'TODO', -- 'TODO', 'RFI_PENDING', 'IN_PROGRESS', 'REVIEW', 'DONE'
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM', -- 'HIGH', 'MEDIUM', 'LOW'
    creator_id INT NOT NULL REFERENCES users(id),
    assignee_id INT NOT NULL REFERENCES users(id),
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. 附件表 (attachments)
CREATE TABLE attachments (
    id SERIAL PRIMARY KEY,
    ticket_id INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    uploaded_by INT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. 討論與官方回覆紀錄表 (comments)
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    ticket_id INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    author_id INT NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`;

  const dockerComposeYaml = `version: '3.8'

services:
  protrack-app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgres://protrack:secret@postgres:5432/protrack_db
    depends_on:
      - postgres
    restart: always

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: protrack
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: protrack_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: always

volumes:
  pgdata:`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-mono">
      
      {/* Overview Banner */}
      <div className="bg-black text-white p-6 border-4 border-black">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 border-2 border-white">
            <FileCode2 className="w-6 h-6 stroke-[2] text-white" />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold uppercase tracking-wider">系統需求與架構規格書 (SRS)</h1>
            <p className="text-xs text-neutral-400 mt-1 uppercase">
              營建工程專案管理與 RFI 疑義追蹤系統規格 // PROTRACK SYSTEM SPECIFICATION
            </p>
          </div>
        </div>
        <p className="text-xs text-neutral-300 leading-relaxed max-w-4xl mt-3 font-sans">
          針對設計端（建築師/技師）與施工端（營造廠/專案經理）消除資訊傳遞時間差，提供視覺化看板狀態轉移、RFI 自動編號、SLA 逾期催辦、剪貼簿 Ctrl+V 圖片直貼與線上 HTML5 Canvas 標註協作。
        </p>
      </div>

      {/* System Topology Diagram */}
      <div className="bg-white p-6 border-2 border-black space-y-4">
        <div className="flex items-center space-x-2 border-b-2 border-black pb-3">
          <Network className="w-5 h-5 stroke-[2] text-black" />
          <h2 className="text-base font-serif font-bold text-black uppercase tracking-wider">2.2 系統拓撲與資料流向 (SYSTEM TOPOLOGY)</h2>
        </div>

        <div className="p-4 bg-black text-white border-2 border-black font-mono text-xs overflow-x-auto">
          <pre>{`[ 用戶端瀏覽器 (Vue 3 / React SPA) ]
      │ (HTTPS / RESTful API / Base64 Payload)
      ▼
[ API Gateway / Express 反向代理 (Port 3000) ]
      │
      ├──> [ 前端靜態資源 (Vite Middleware / CDN) ]
      └──> [ 後端 RESTful API 服務 (/api/v1/*) ]
                │
                ├──> [ PostgreSQL 關聯式資料庫 (tickets, users, comments) ]
                └──> [ 附件與標註儲存庫 (attachments / Canvas PNG Base64) ]`}</pre>
        </div>
      </div>

      {/* Database Schema Section */}
      <div className="bg-white p-6 border-2 border-black space-y-4">
        <div className="flex items-center justify-between border-b-2 border-black pb-3">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 stroke-[2] text-black" />
            <h2 className="text-base font-serif font-bold text-black uppercase tracking-wider">4. 資料庫 SCHEMA 設計 (POSTGRESQL DDL)</h2>
          </div>
          <button
            onClick={() => copyToClipboard(postgresSchema, 'schema')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-neutral-100 text-black text-xs font-bold uppercase border-2 border-black transition-none cursor-pointer"
          >
            {copiedSection === 'schema' ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2]" />
                <span>已複製 SQL</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 stroke-[2]" />
                <span>複製 DDL</span>
              </>
            )}
          </button>
        </div>

        <div className="p-4 bg-black text-white border-2 border-black font-mono text-xs overflow-x-auto">
          <pre>{postgresSchema}</pre>
        </div>
      </div>

      {/* RESTful API Specification & Live Tester */}
      <div className="bg-white p-6 border-2 border-black space-y-4">
        <div className="flex items-center justify-between border-b-2 border-black pb-3">
          <div className="flex items-center space-x-2">
            <Server className="w-5 h-5 stroke-[2] text-black" />
            <h2 className="text-base font-serif font-bold text-black uppercase tracking-wider">5. RESTFUL API 端點規格與線上測試 (BASE: /API/V1)</h2>
          </div>
          <span className="text-xs bg-black text-white px-2.5 py-0.5 font-mono font-bold uppercase">
            線上服務中
          </span>
        </div>

        <div className="overflow-x-auto border-2 border-black">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-black text-white font-bold uppercase border-b border-black">
                <th className="py-2.5 px-3 border-r border-neutral-800">動詞</th>
                <th className="py-2.5 px-3 border-r border-neutral-800">端點 (ENDPOINT)</th>
                <th className="py-2.5 px-3 border-r border-neutral-800">功能說明</th>
                <th className="py-2.5 px-3 border-r border-neutral-800">PAYLOAD / 回傳</th>
                <th className="py-2.5 px-3 text-right">實測</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black font-mono">
              <tr className="hover:bg-neutral-100">
                <td className="py-2.5 px-3 border-r border-black"><span className="px-2 py-0.5 bg-black text-white font-bold">GET</span></td>
                <td className="py-2.5 px-3 border-r border-black font-bold">/api/v1/tickets</td>
                <td className="py-2.5 px-3 border-r border-black font-sans">取得卡片/RFI 列表 (支援 ?type=&status=)</td>
                <td className="py-2.5 px-3 border-r border-black font-sans text-neutral-600">JSON 陣列 (含附件與關聯人員)</td>
                <td className="py-2.5 px-3 text-right">
                  <button
                    onClick={() => testApi('/api/v1/tickets')}
                    className="px-2.5 py-1 bg-white hover:bg-black hover:text-white text-black text-xs font-bold uppercase border border-black transition-none cursor-pointer"
                  >
                    發送請求
                  </button>
                </td>
              </tr>

              <tr className="hover:bg-neutral-100">
                <td className="py-2.5 px-3 border-r border-black"><span className="px-2 py-0.5 bg-black text-white font-bold">GET</span></td>
                <td className="py-2.5 px-3 border-r border-black font-bold">/api/v1/users</td>
                <td className="py-2.5 px-3 border-r border-black font-sans">取得專案團隊使用者 (PM, 技師, 建築師, 營造)</td>
                <td className="py-2.5 px-3 border-r border-black font-sans text-neutral-600">User 清單</td>
                <td className="py-2.5 px-3 text-right">
                  <button
                    onClick={() => testApi('/api/v1/users')}
                    className="px-2.5 py-1 bg-white hover:bg-black hover:text-white text-black text-xs font-bold uppercase border border-black transition-none cursor-pointer"
                  >
                    發送請求
                  </button>
                </td>
              </tr>

              <tr className="hover:bg-neutral-100">
                <td className="py-2.5 px-3 border-r border-black"><span className="px-2 py-0.5 bg-black text-white font-bold">PATCH</span></td>
                <td className="py-2.5 px-3 border-r border-black font-bold">/api/v1/tickets/:id/status</td>
                <td className="py-2.5 px-3 border-r border-black font-sans">看板卡片拖曳狀態轉移</td>
                <td className="py-2.5 px-3 border-r border-black font-sans text-neutral-600">&#123; "status": "DONE" &#125;</td>
                <td className="py-2.5 px-3 text-right">
                  <span className="text-neutral-500 text-xs uppercase">[看板拖曳觸發]</span>
                </td>
              </tr>

              <tr className="hover:bg-neutral-100">
                <td className="py-2.5 px-3 border-r border-black"><span className="px-2 py-0.5 bg-black text-white font-bold">POST</span></td>
                <td className="py-2.5 px-3 border-r border-black font-bold">/api/v1/tickets/:id/attachments</td>
                <td className="py-2.5 px-3 border-r border-black font-sans">上傳剪貼簿截圖 (Ctrl+V) 或圖面</td>
                <td className="py-2.5 px-3 border-r border-black font-sans text-neutral-600">Base64 JSON / Multipart</td>
                <td className="py-2.5 px-3 text-right">
                  <span className="text-neutral-500 text-xs uppercase">[剪貼簿自動觸發]</span>
                </td>
              </tr>

              <tr className="hover:bg-neutral-100">
                <td className="py-2.5 px-3 border-r border-black"><span className="px-2 py-0.5 bg-black text-white font-bold">PUT</span></td>
                <td className="py-2.5 px-3 border-r border-black font-bold">/api/v1/attachments/:id</td>
                <td className="py-2.5 px-3 border-r border-black font-sans">覆蓋儲存 Canvas 標註結果</td>
                <td className="py-2.5 px-3 border-r border-black font-sans text-neutral-600">&#123; "file_url": "data:image/png..." &#125;</td>
                <td className="py-2.5 px-3 text-right">
                  <span className="text-neutral-500 text-xs uppercase">[畫布儲存觸發]</span>
                </td>
              </tr>

              <tr className="hover:bg-neutral-100">
                <td className="py-2.5 px-3 border-r border-black"><span className="px-2 py-0.5 bg-black text-white font-bold">GET</span></td>
                <td className="py-2.5 px-3 border-r border-black font-bold">/api/v1/reports/rfi/csv</td>
                <td className="py-2.5 px-3 border-r border-black font-sans">匯出 RFI 彙整清單 CSV 報表</td>
                <td className="py-2.5 px-3 border-r border-black font-sans text-neutral-600">text/csv (UTF-8 BOM)</td>
                <td className="py-2.5 px-3 text-right">
                  <a
                    href="/api/v1/reports/rfi/csv"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 px-2.5 py-1 bg-black hover:bg-neutral-800 text-white text-xs font-bold uppercase transition-none"
                  >
                    <span>下載測試</span>
                    <ExternalLink className="w-3 h-3 stroke-[2]" />
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Live API Console */}
        {apiTestResponse && (
          <div className="mt-4 p-4 bg-black border-2 border-black space-y-2">
            <div className="flex items-center justify-between text-xs text-white">
              <span className="flex items-center space-x-1">
                <Terminal className="w-3.5 h-3.5 stroke-[2] text-white" />
                <span className="font-mono uppercase font-bold text-white">回應結果: {testingEndpoint}</span>
              </span>
              <button
                onClick={() => setApiTestResponse(null)}
                className="text-neutral-400 hover:text-white underline cursor-pointer"
              >
                [關閉面板]
              </button>
            </div>
            <pre className="text-[11px] font-mono text-white max-h-60 overflow-y-auto p-2 bg-neutral-900 border border-neutral-700">
              {apiTestResponse}
            </pre>
          </div>
        )}
      </div>

      {/* Non-Functional & Deployment Specs */}
      <div className="bg-white p-6 border-2 border-black space-y-4">
        <div className="flex items-center space-x-2 border-b-2 border-black pb-3">
          <ShieldCheck className="w-5 h-5 stroke-[2] text-black" />
          <h2 className="text-base font-serif font-bold text-black uppercase tracking-wider">6. 非功能性需求與 DEVOPS 配置 (NON-FUNCTIONAL REQUIREMENTS)</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-white border-2 border-black space-y-2">
            <h3 className="font-serif font-bold text-black text-sm uppercase">6.1 效能規格 (PERFORMANCE)</h3>
            <ul className="list-disc list-inside space-y-1 text-black font-sans">
              <li>首頁首繪時間 (FCP) &lt; 1.5 秒</li>
              <li>狀態切換 (PATCH) API 平均回應 &lt; 200ms</li>
              <li>剪貼簿圖片自動壓縮至最大尺寸 1920px</li>
            </ul>
          </div>

          <div className="p-4 bg-white border-2 border-black space-y-2">
            <h3 className="font-serif font-bold text-black text-sm uppercase">6.2 安全規格 (SECURITY)</h3>
            <ul className="list-disc list-inside space-y-1 text-black font-sans">
              <li>Bearer JWT + RBAC 角色存取授權</li>
              <li>檔案上傳白名單（PNG, JPEG, PDF）</li>
              <li>單一檔案容量限制 &le; 15MB</li>
              <li>HTML Sanitizer 防止 XSS 攻擊</li>
            </ul>
          </div>

          <div className="p-4 bg-white border-2 border-black space-y-2">
            <h3 className="font-serif font-bold text-black text-sm uppercase">6.3 部署規格 (DEVOPS)</h3>
            <ul className="list-disc list-inside space-y-1 text-black font-sans">
              <li>前後端容器化部署 (Dockerfile)</li>
              <li>docker-compose 多服務編排</li>
              <li>GitHub Actions 自動 CI/CD 流程</li>
            </ul>
          </div>
        </div>

        {/* Docker-compose viewer */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-black mb-1.5 font-bold uppercase">
            <span>生產環境 DOCKER-COMPOSE.YML 範例</span>
            <button
              onClick={() => copyToClipboard(dockerComposeYaml, 'docker')}
              className="text-black hover:underline flex items-center space-x-1 cursor-pointer"
            >
              {copiedSection === 'docker' ? <Check className="w-3.5 h-3.5 stroke-[2]" /> : <Copy className="w-3.5 h-3.5 stroke-[2]" />}
              <span>[複製 DOCKER COMPOSE]</span>
            </button>
          </div>
          <pre className="p-3 bg-black text-white border-2 border-black font-mono text-xs overflow-x-auto">
            {dockerComposeYaml}
          </pre>
        </div>
      </div>
    </div>
  );
};
