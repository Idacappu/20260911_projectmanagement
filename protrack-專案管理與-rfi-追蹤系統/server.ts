import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

// Construction architectural & structural sample svg diagrams (as base64 data URLs)
const sampleBlueprint1 = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600" style="background:#0f172a; font-family:monospace;">
  <!-- Grid lines -->
  <defs>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#grid)" />
  
  <!-- Title Block -->
  <rect x="20" y="20" width="860" height="560" fill="none" stroke="#38bdf8" stroke-width="2"/>
  <text x="40" y="55" fill="#38bdf8" font-size="20" font-weight="bold">PROTRACK STRUCTURAL DWG: B2F-C3柱筋與幹管衝突斷面圖</text>
  <text x="40" y="80" fill="#94a3b8" font-size="13">PROJECT: 信義科技大樓新建工程 | DWG NO: S-302-B2 | SCALE 1:30</text>
  
  <!-- Slab and Beam lines -->
  <rect x="80" y="150" width="740" height="70" fill="#1e293b" stroke="#64748b" stroke-width="2"/>
  <text x="90" y="190" fill="#94a3b8" font-size="14">B2F 頂板 (厚度 t=25cm / fc'=350kgf/cm²)</text>
  
  <!-- Column Rebars -->
  <rect x="360" y="150" width="180" height="380" fill="#0f172a" stroke="#0284c7" stroke-width="2" stroke-dasharray="4 2"/>
  <text x="380" y="320" fill="#38bdf8" font-size="15" font-weight="bold">C3 主柱 (90x90cm)</text>
  <line x1="390" y1="150" x2="390" y2="530" stroke="#f43f5e" stroke-width="4"/>
  <line x1="410" y1="150" x2="410" y2="530" stroke="#f43f5e" stroke-width="4"/>
  <line x1="490" y1="150" x2="490" y2="530" stroke="#f43f5e" stroke-width="4"/>
  <line x1="510" y1="150" x2="510" y2="530" stroke="#f43f5e" stroke-width="4"/>
  
  <!-- MEP Conduit Conflict -->
  <circle cx="450" cy="280" r="45" fill="#eab308" fill-opacity="0.3" stroke="#eab308" stroke-width="3"/>
  <text x="415" y="285" fill="#fde047" font-size="13" font-weight="bold">Ø150 幹管套管</text>
  <line x1="450" y1="230" x2="450" y2="330" stroke="#eab308" stroke-width="2" stroke-dasharray="3 3"/>
  <text x="530" y="275" fill="#f87171" font-size="14">⚠ 與 D32 主筋淨距不足 30mm</text>
  
  <!-- Dimension lines -->
  <line x1="360" y1="545" x2="540" y2="545" stroke="#94a3b8" stroke-width="1.5"/>
  <line x1="360" y1="540" x2="360" y2="550" stroke="#94a3b8" stroke-width="1.5"/>
  <line x1="540" y1="540" x2="540" y2="550" stroke="#94a3b8" stroke-width="1.5"/>
  <text x="425" y="565" fill="#94a3b8" font-size="13">900 mm</text>
</svg>
`)}`;

const sampleBlueprint2 = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600" style="background:#0f172a; font-family:monospace;">
  <rect width="100%" height="100%" fill="#090d16" />
  <rect x="20" y="20" width="860" height="560" fill="none" stroke="#10b981" stroke-width="2"/>
  <text x="40" y="60" fill="#34d399" font-size="20" font-weight="bold">ARCHITECTURAL DWG: 3F 陽台降板剖面示意圖</text>
  <text x="40" y="85" fill="#94a3b8" font-size="13">PROJECT: 信義科技大樓新建工程 | DWG NO: A-410 | SCALE 1:20</text>
  
  <!-- Living Room Slab -->
  <polygon points="100,200 380,200 380,280 100,280" fill="#1e293b" stroke="#64748b" stroke-width="2"/>
  <text x="130" y="240" fill="#f8fafc" font-size="15">室內客廳地坪 (FL ±0)</text>
  
  <!-- Balcony Slab Drop -->
  <polygon points="380,260 760,260 760,340 380,340" fill="#1e293b" stroke="#64748b" stroke-width="2"/>
  <text x="420" y="300" fill="#38bdf8" font-size="15">陽台地坪 (FL -10cm)</text>
  
  <!-- Waterproof layer -->
  <path d="M 380 200 L 380 260 L 760 260" fill="none" stroke="#06b6d4" stroke-width="4"/>
  <text x="430" y="245" fill="#22d3ee" font-size="13">複合式PU防水層 2.0mm</text>
  
  <!-- Drainage slope marker -->
  <line x1="420" y1="360" x2="720" y2="380" stroke="#f59e0b" stroke-width="3" marker-end="url(#arrow)"/>
  <text x="520" y="410" fill="#fbbf24" font-size="14">洩水坡度 1/50 往落水孔方向</text>
  
  <!-- Note conflict -->
  <circle cx="700" cy="300" r="30" fill="#ef4444" fill-opacity="0.3" stroke="#ef4444" stroke-width="2"/>
  <text x="650" y="350" fill="#f87171" font-size="13">落水頭安裝深度疑義</text>
</svg>
`)}`;

// Seed Users as required by SRS
const initialUsers = [
  { id: 1, name: '陳建銘 (Kevin)', email: 'kevin.chen@protrack.com', role: 'PM', department: '專案管理部' },
  { id: 2, name: '林立翔 (Robert)', email: 'robert.lin@acubearch.com', role: 'Architect', department: '建築設計組' },
  { id: 3, name: '張振國 (David)', email: 'david.chang@struct-eng.com', role: 'Engineer', department: '結構機電處' },
  { id: 4, name: '黃信宏 (Alex)', email: 'alex.huang@builder-corp.com', role: 'Contractor', department: '營造廠工地工務所' },
];

// Initial attachments
let attachmentCounter = 10;
let initialAttachments = [
  {
    id: 1,
    ticket_id: 1,
    file_name: 'S-302-B2F_柱筋與幹管衝突圖.png',
    file_url: sampleBlueprint1,
    file_type: 'image/png',
    uploaded_by: 4,
    created_at: '2026-09-05T08:30:00Z',
  },
  {
    id: 2,
    ticket_id: 2,
    file_name: 'A-410-3F_陽台洩水坡度與落水頭剖面.png',
    file_url: sampleBlueprint2,
    file_type: 'image/png',
    uploaded_by: 4,
    created_at: '2026-09-08T10:15:00Z',
  },
];

// Initial comments
let commentCounter = 10;
let initialComments = [
  {
    id: 1,
    ticket_id: 1,
    author_id: 4,
    content: '現場工務所於地下二層 C3 柱放樣時，發現 6 英吋幹管與 D32 主筋淨距不足 30mm，請結構技師與機電顧問釐清是否可微調套管中心位置或進行補強。',
    created_at: '2026-09-05T09:00:00Z',
  },
  {
    id: 2,
    ticket_id: 1,
    author_id: 3,
    content: '已請結構同仁複算應力集中區，若幹管向西平移 60mm 並於兩側加配置 #4 菱形繫筋 4 支，結構安全可符合規範，請建築師同步確認建築淨高。',
    created_at: '2026-09-07T14:20:00Z',
  },
  {
    id: 3,
    ticket_id: 2,
    author_id: 4,
    content: '3F 陽台降板原設計為 10cm，因落水頭杯身較高，加上坡度起算點後鋪面厚度不足，建請核定降板加深至 12cm。',
    created_at: '2026-09-08T11:00:00Z',
  },
];

// Initial Tickets
// Notice local reference time: 2026-09-10
let ticketCounter = 100;
let initialTickets: any[] = [
  // Parent Phase 1: Develop v2.0
  {
    id: 10,
    ticket_no: 'WP-202609-001',
    type: 'TASK',
    title: 'Develop v2.0 (基礎與地下結構工程階段)',
    description: '涵蓋地下二層至地上一層結構施工、鋼筋綁紮與管線套繪衝突釐清。',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    creator_id: 1,
    assignee_id: 1,
    start_date: '2026-09-01',
    due_date: '2026-09-11',
    progress: 85,
    parent_id: null,
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-08T10:00:00Z',
  },
  {
    id: 1,
    ticket_no: 'RFI-202609-001',
    type: 'RFI',
    title: '地下二層 B2F C3 柱筋搭接長度與管線幹管衝突疑義',
    description: 'B2F 工務所於鋼筋綁紮前套繪機電圖面，發現排污主幹管套管與 C3 柱受拉主筋淨距不足，可能影響混凝土澆置密實度與主筋保護層厚度。需技師儘速確認結構補強方案。',
    status: 'RFI_PENDING',
    priority: 'HIGH',
    creator_id: 4,
    assignee_id: 3, // Assigned to David (Engineer)
    start_date: '2026-09-01',
    due_date: '2026-09-08', // Overdue SLA Alert
    progress: 70,
    parent_id: 10,
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-07T14:20:00Z',
  },
  {
    id: 4,
    ticket_no: 'TASK-202609-001',
    type: 'TASK',
    title: '完成 1F 頂板混凝土澆置前鋼筋自主檢查與查驗提送',
    description: '依據品管計畫書，1F 頂板澆置前須完成鋼筋間距、搭接長度、保護層墊塊自主檢查表，並檢附照片向監造單位提送查驗。',
    status: 'DONE',
    priority: 'HIGH',
    creator_id: 1,
    assignee_id: 4, // Contractor
    start_date: '2026-09-05',
    due_date: '2026-09-09',
    progress: 100,
    parent_id: 10,
    dependencies: [1],
    created_at: '2026-09-04T08:00:00Z',
    updated_at: '2026-09-09T17:00:00Z',
  },
  {
    id: 13,
    ticket_no: 'MILE-202609-001',
    type: 'TASK',
    title: 'Launch beautiful product v2.0 (地下結構體勘驗核准)',
    description: '完成基礎與地下結構查驗，獲得主管機關勘驗合格公文。',
    status: 'DONE',
    priority: 'HIGH',
    creator_id: 1,
    assignee_id: 1,
    start_date: '2026-09-11',
    due_date: '2026-09-11',
    is_milestone: true,
    progress: 100,
    parent_id: 10,
    dependencies: [4],
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-11T12:00:00Z',
  },

  // Parent Phase 2: Develop v2.1
  {
    id: 20,
    ticket_no: 'WP-202609-002',
    type: 'TASK',
    title: 'Develop v2.1 (主體結構與建築外牆工程階段)',
    description: '地上 2F 至 3F 結構體推進、外牆單元帷幕預埋鐵件與景觀陽台落水管線審查。',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    creator_id: 1,
    assignee_id: 2,
    start_date: '2026-09-12',
    due_date: '2026-09-20',
    progress: 55,
    parent_id: null,
    created_at: '2026-09-05T08:00:00Z',
    updated_at: '2026-09-09T10:00:00Z',
  },
  {
    id: 3,
    ticket_no: 'RFI-202609-003',
    type: 'RFI',
    title: '東側外牆單元帷幕預埋鐵件 (Anchor) 與 2F 邊梁配筋干涉',
    description: '帷幕廠商提送之預埋螺栓深度達 250mm，與 2F-B1 梁頂層第四排受彎主筋衝突，需請結構處確認錨定力拔出力計算書並核可調整偏心。',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    creator_id: 1,
    assignee_id: 3, // Engineer
    start_date: '2026-09-12',
    due_date: '2026-09-19',
    progress: 50,
    parent_id: 20,
    created_at: '2026-09-09T09:30:00Z',
    updated_at: '2026-09-09T09:30:00Z',
  },
  {
    id: 2,
    ticket_no: 'RFI-202609-002',
    type: 'RFI',
    title: '3F 景觀陽台降板高度與落水頭埋設厚度檢討',
    description: '針對 3F A戶陽台降板 10cm，因現場配合防落水杯身深度及 1/50 洩水坡度，表層砂漿與磁磚壓頂空間不足，建議調整為 12cm 降板。',
    status: 'REVIEW',
    priority: 'MEDIUM',
    creator_id: 4,
    assignee_id: 2, // Architect
    start_date: '2026-09-15',
    due_date: '2026-09-18',
    progress: 80,
    parent_id: 20,
    dependencies: [3],
    created_at: '2026-09-08T10:00:00Z',
    updated_at: '2026-09-08T11:00:00Z',
  },
  {
    id: 23,
    ticket_no: 'MILE-202609-002',
    type: 'TASK',
    title: 'Launch beautiful product v2.1 (結構體上樑與帷幕試裝核定)',
    description: '主體結構上樑儀式與單元帷幕工廠實體試拼裝審核通過。',
    status: 'TODO',
    priority: 'HIGH',
    creator_id: 1,
    assignee_id: 2,
    start_date: '2026-09-20',
    due_date: '2026-09-20',
    is_milestone: true,
    progress: 0,
    parent_id: 20,
    dependencies: [2],
    created_at: '2026-09-05T08:00:00Z',
    updated_at: '2026-09-05T08:00:00Z',
  },

  // Parent Phase 3: Develop v2.2
  {
    id: 30,
    ticket_no: 'WP-202609-003',
    type: 'TASK',
    title: 'Develop v2.2 (機電空調消防與天花綜合工程階段)',
    description: '4F 消防撒水給水 CSD/SEM 套繪、BIM 走道天花碰撞分析與穿梁套管報核。',
    status: 'TODO',
    priority: 'MEDIUM',
    creator_id: 1,
    assignee_id: 3,
    start_date: '2026-09-23',
    due_date: '2026-10-02',
    progress: 10,
    parent_id: null,
    created_at: '2026-09-08T08:00:00Z',
    updated_at: '2026-09-10T14:00:00Z',
  },
  {
    id: 5,
    ticket_no: 'TASK-202609-002',
    type: 'TASK',
    title: '提送 4F 消防撒水與給水配管綜合套繪圖 (CSD/SEM)',
    description: '配合 BIM 團隊檢討 4F 走道天花淨高，完成管線衝突碰撞分析報告並送交建築師審查核可。',
    status: 'TODO',
    priority: 'MEDIUM',
    creator_id: 2,
    assignee_id: 3, // Engineer
    start_date: '2026-09-23',
    due_date: '2026-09-27',
    progress: 20,
    parent_id: 30,
    created_at: '2026-09-10T14:00:00Z',
    updated_at: '2026-09-10T14:00:00Z',
  },
  {
    id: 32,
    ticket_no: 'TASK-202609-003',
    type: 'TASK',
    title: 'BIM 走道淨高管線碰撞檢討會議與衝突消解 (CSD Alignment)',
    description: '機電與空調風管於主走廊與結構大梁衝突之細部排程檢討。',
    status: 'TODO',
    priority: 'MEDIUM',
    creator_id: 1,
    assignee_id: 3,
    start_date: '2026-09-24',
    due_date: '2026-09-27',
    progress: 0,
    parent_id: 30,
    created_at: '2026-09-10T15:00:00Z',
    updated_at: '2026-09-10T15:00:00Z',
  },
  {
    id: 33,
    ticket_no: 'TASK-202609-004',
    type: 'TASK',
    title: '機電套管梁柱洗洞加固技師簽證報告 (Add project status)',
    description: '向主管機關申報穿梁套管補強技師簽署結構計算書。',
    status: 'TODO',
    priority: 'LOW',
    creator_id: 3,
    assignee_id: 3,
    start_date: '2026-09-30',
    due_date: '2026-10-01',
    progress: 0,
    parent_id: 30,
    dependencies: [32],
    created_at: '2026-09-10T16:00:00Z',
    updated_at: '2026-09-10T16:00:00Z',
  },
  {
    id: 34,
    ticket_no: 'MILE-202609-003',
    type: 'TASK',
    title: 'Launch beautiful product v2.2 (機電整合與天花封板核可)',
    description: '機電水電管線試水試壓及天花封板許可查驗。',
    status: 'TODO',
    priority: 'HIGH',
    creator_id: 1,
    assignee_id: 3,
    start_date: '2026-10-02',
    due_date: '2026-10-02',
    is_milestone: true,
    progress: 0,
    parent_id: 30,
    dependencies: [33],
    created_at: '2026-09-10T16:00:00Z',
    updated_at: '2026-09-10T16:00:00Z',
  },

  // Parent Phase 4: Develop v3.0
  {
    id: 40,
    ticket_no: 'WP-202610-001',
    type: 'TASK',
    title: 'Develop v3.0 (室內裝修與智慧建築竣工移交)',
    description: '室內裝修施作、智慧綠建築標章查驗與使照請領作業。',
    status: 'TODO',
    priority: 'MEDIUM',
    creator_id: 1,
    assignee_id: 1,
    start_date: '2026-10-03',
    due_date: '2026-10-08',
    progress: 0,
    parent_id: null,
    created_at: '2026-09-10T17:00:00Z',
    updated_at: '2026-09-10T17:00:00Z',
  },
];

// Helper to populate user and relation details
function enrichTicket(ticket: any) {
  const creator = initialUsers.find((u) => u.id === ticket.creator_id);
  const assignee = initialUsers.find((u) => u.id === ticket.assignee_id);
  const attachments = initialAttachments
    .filter((a) => a.ticket_id === ticket.id)
    .map((a) => {
      const uploader = initialUsers.find((u) => u.id === a.uploaded_by);
      return {
        ...a,
        uploader_name: uploader ? uploader.name : '系統成員',
        uploader_role: uploader ? uploader.role : undefined,
      };
    });
  const comments = initialComments
    .filter((c) => c.ticket_id === ticket.id)
    .map((c) => {
      const author = initialUsers.find((u) => u.id === c.author_id);
      return {
        ...c,
        author_name: author ? author.name : '系統成員',
        author_role: author ? author.role : undefined,
      };
    })
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return {
    ...ticket,
    creator,
    assignee,
    attachments,
    comments,
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser with 50mb limit for Base64 canvas images
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // --- API Routes (Prefix: /api/v1) ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'ProTrack API', timestamp: new Date().toISOString() });
  });

  // 1. Get Users
  app.get('/api/v1/users', (req, res) => {
    res.json({ success: true, data: initialUsers });
  });

  // 2. Get Tickets (with query filtering)
  app.get('/api/v1/tickets', (req, res) => {
    const { type, status, priority, assigneeId, search } = req.query;
    let list = [...initialTickets];

    if (type && type !== 'ALL') {
      list = list.filter((t) => t.type === type);
    }
    if (status && status !== 'ALL') {
      list = list.filter((t) => t.status === status);
    }
    if (priority && priority !== 'ALL') {
      list = list.filter((t) => t.priority === priority);
    }
    if (assigneeId && assigneeId !== 'ALL') {
      list = list.filter((t) => String(t.assignee_id) === String(assigneeId));
    }
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.ticket_no.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }

    const enriched = list.map(enrichTicket);
    res.json({ success: true, count: enriched.length, data: enriched });
  });

  // 3. Get single ticket
  app.get('/api/v1/tickets/:id', (req, res) => {
    const ticketId = parseInt(req.params.id, 10);
    const ticket = initialTickets.find((t) => t.id === ticketId);
    if (!ticket) {
      return res.status(404).json({ success: false, error: '找不到指定單號' });
    }
    res.json({ success: true, data: enrichTicket(ticket) });
  });

  // 4. Create Ticket (Auto-numbering e.g. RFI-202609-001)
  app.post('/api/v1/tickets', (req, res) => {
    const { 
      type = 'RFI', 
      title, 
      description = '', 
      priority = 'MEDIUM', 
      creator_id = 1, 
      assignee_id = 2, 
      due_date,
      start_date,
      parent_id,
      progress = 0,
      is_milestone = false,
      dependencies = []
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: '請輸入標題' });
    }

    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Count existing tickets with this type in this month to format number
    const prefix = is_milestone ? 'MILE' : type === 'RFI' ? 'RFI' : 'TASK';
    const monthPattern = `${prefix}-${yearMonth}-`;
    const countThisMonth = initialTickets.filter((t) => t.ticket_no && t.ticket_no.startsWith(monthPattern)).length;
    const ticket_no = `${monthPattern}${String(countThisMonth + 1).padStart(3, '0')}`;

    ticketCounter++;
    const newTicket = {
      id: ticketCounter,
      ticket_no,
      type: type === 'RFI' ? 'RFI' : 'TASK',
      title: title.trim(),
      description: description.trim(),
      status: type === 'RFI' ? 'RFI_PENDING' : 'TODO',
      priority,
      creator_id: Number(creator_id) || 1,
      assignee_id: Number(assignee_id) || 2,
      start_date: start_date || new Date().toISOString().split('T')[0],
      due_date: due_date || new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().split('T')[0],
      parent_id: parent_id !== undefined ? parent_id : null,
      progress: Number(progress) || 0,
      is_milestone: Boolean(is_milestone),
      dependencies: Array.isArray(dependencies) ? dependencies : [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    initialTickets.unshift(newTicket);
    res.status(201).json({ success: true, data: enrichTicket(newTicket) });
  });

  // 5. Update Ticket Status (Drag & Drop PATCH /api/v1/tickets/:id/status)
  app.patch('/api/v1/tickets/:id/status', (req, res) => {
    const ticketId = parseInt(req.params.id, 10);
    const { status } = req.body;
    const validStatuses = ['TODO', 'RFI_PENDING', 'IN_PROGRESS', 'REVIEW', 'DONE'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: '不合法的看板狀態' });
    }

    const ticketIndex = initialTickets.findIndex((t) => t.id === ticketId);
    if (ticketIndex === -1) {
      return res.status(404).json({ success: false, error: '找不到指定單號' });
    }

    initialTickets[ticketIndex].status = status;
    initialTickets[ticketIndex].updated_at = new Date().toISOString();

    res.json({ success: true, data: enrichTicket(initialTickets[ticketIndex]) });
  });

  // 6. Update Ticket Attributes (PATCH /api/v1/tickets/:id)
  app.patch('/api/v1/tickets/:id', (req, res) => {
    const ticketId = parseInt(req.params.id, 10);
    const ticketIndex = initialTickets.findIndex((t) => t.id === ticketId);
    if (ticketIndex === -1) {
      return res.status(404).json({ success: false, error: '找不到指定單號' });
    }

    const { 
      title, 
      description, 
      priority, 
      assignee_id, 
      start_date,
      due_date, 
      status, 
      type,
      progress,
      parent_id,
      is_milestone,
      dependencies
    } = req.body;
    const current = initialTickets[ticketIndex];

    if (title !== undefined) current.title = title;
    if (description !== undefined) current.description = description;
    if (priority !== undefined) current.priority = priority;
    if (assignee_id !== undefined) current.assignee_id = Number(assignee_id);
    if (start_date !== undefined) current.start_date = start_date;
    if (due_date !== undefined) current.due_date = due_date;
    if (status !== undefined) current.status = status;
    if (type !== undefined) current.type = type;
    if (progress !== undefined) current.progress = Math.min(100, Math.max(0, Number(progress)));
    if (parent_id !== undefined) current.parent_id = parent_id;
    if (is_milestone !== undefined) current.is_milestone = Boolean(is_milestone);
    if (dependencies !== undefined) current.dependencies = dependencies;
    current.updated_at = new Date().toISOString();

    res.json({ success: true, data: enrichTicket(current) });
  });

  // 7. Delete Ticket (DELETE /api/v1/tickets/:id)
  app.delete('/api/v1/tickets/:id', (req, res) => {
    const ticketId = parseInt(req.params.id, 10);
    const ticketIndex = initialTickets.findIndex((t) => t.id === ticketId);
    if (ticketIndex === -1) {
      return res.status(404).json({ success: false, error: '找不到指定單號' });
    }

    initialTickets.splice(ticketIndex, 1);
    // Cascade delete attachments and comments
    initialAttachments = initialAttachments.filter((a) => a.ticket_id !== ticketId);
    initialComments = initialComments.filter((c) => c.ticket_id !== ticketId);

    res.json({ success: true, message: `已成功刪除單號 #${ticketId}` });
  });

  // 8. Add Attachment (POST /api/v1/tickets/:id/attachments)
  app.post('/api/v1/tickets/:id/attachments', (req, res) => {
    const ticketId = parseInt(req.params.id, 10);
    const ticket = initialTickets.find((t) => t.id === ticketId);
    if (!ticket) {
      return res.status(404).json({ success: false, error: '找不到指定單號' });
    }

    const { file_name, file_url, file_type = 'image/png', uploaded_by = 1 } = req.body;
    if (!file_url) {
      return res.status(400).json({ success: false, error: '缺少檔案內容 (file_url)' });
    }

    attachmentCounter++;
    const newAttachment = {
      id: attachmentCounter,
      ticket_id: ticketId,
      file_name: file_name || `截圖_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`,
      file_url: file_url,
      file_type: file_type,
      uploaded_by: Number(uploaded_by) || 1,
      created_at: new Date().toISOString(),
    };

    initialAttachments.push(newAttachment);
    res.status(201).json({ success: true, data: newAttachment });
  });

  // 9. Update/Overwrite Attachment (HTML5 Canvas save annotation)
  app.put('/api/v1/attachments/:id', (req, res) => {
    const attachmentId = parseInt(req.params.id, 10);
    const attachment = initialAttachments.find((a) => a.id === attachmentId);
    if (!attachment) {
      return res.status(404).json({ success: false, error: '找不到指定附件' });
    }

    const { file_url, file_name } = req.body;
    if (file_url) attachment.file_url = file_url;
    if (file_name) attachment.file_name = file_name;

    res.json({ success: true, data: attachment });
  });

  // 10. Delete Attachment (DELETE /api/v1/attachments/:id)
  app.delete('/api/v1/attachments/:id', (req, res) => {
    const attachmentId = parseInt(req.params.id, 10);
    const index = initialAttachments.findIndex((a) => a.id === attachmentId);
    if (index === -1) {
      return res.status(404).json({ success: false, error: '找不到指定附件' });
    }

    initialAttachments.splice(index, 1);
    res.json({ success: true, message: '附件已刪除' });
  });

  // 11. Add Discussion / Comment (POST /api/v1/tickets/:id/comments)
  app.post('/api/v1/tickets/:id/comments', (req, res) => {
    const ticketId = parseInt(req.params.id, 10);
    const ticket = initialTickets.find((t) => t.id === ticketId);
    if (!ticket) {
      return res.status(404).json({ success: false, error: '找不到指定單號' });
    }

    const { content, author_id = 1, image_url } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: '留言內容不可為空' });
    }

    commentCounter++;
    const newComment = {
      id: commentCounter,
      ticket_id: ticketId,
      author_id: Number(author_id) || 1,
      content: content.trim(),
      image_url: image_url || undefined,
      created_at: new Date().toISOString(),
    };

    initialComments.push(newComment);
    const author = initialUsers.find((u) => u.id === newComment.author_id);

    res.status(201).json({
      success: true,
      data: {
        ...newComment,
        author_name: author ? author.name : '系統成員',
        author_role: author ? author.role : undefined,
      },
    });
  });

  // 12. Export RFI CSV Report (GET /api/v1/reports/rfi/csv)
  app.get('/api/v1/reports/rfi/csv', (req, res) => {
    const rfiList = initialTickets.filter((t) => t.type === 'RFI').map(enrichTicket);

    const headers = [
      '單號 (Ticket No)',
      '類型 (Type)',
      '標題 (Title)',
      '狀態 (Status)',
      '優先度 (Priority)',
      '提問單位/人員 (Creator)',
      '指定技師/負責人 (Assignee)',
      '到期日 (Due Date)',
      '附件數 (Attachments)',
      '討論則數 (Comments)',
      '建立時間 (Created At)',
    ];

    const statusMap: Record<string, string> = {
      TODO: '待處理',
      RFI_PENDING: '待回答 RFI',
      IN_PROGRESS: '處理中',
      REVIEW: '審核中',
      DONE: '已結案',
    };

    const rows = rfiList.map((item) => [
      `"${item.ticket_no}"`,
      `"${item.type}"`,
      `"${item.title.replace(/"/g, '""')}"`,
      `"${statusMap[item.status] || item.status}"`,
      `"${item.priority}"`,
      `"${item.creator ? `${item.creator.name} (${item.creator.role})` : ''}"`,
      `"${item.assignee ? `${item.assignee.name} (${item.assignee.role})` : ''}"`,
      `"${item.due_date || ''}"`,
      item.attachments ? item.attachments.length : 0,
      item.comments ? item.comments.length : 0,
      `"${item.created_at}"`,
    ]);

    // UTF-8 BOM for Excel Chinese compatibility
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="ProTrack_RFI_Report_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csvContent);
  });

  // --- Vite Middleware setup for Frontend SPA ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ProTrack Full-stack Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
