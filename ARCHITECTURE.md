# Architecture — Internal Business Hub with Discord Bot

Đây là bản markdown sống (living document) của `Architecture.docx` gốc, để có thể chỉnh sửa,
theo dõi bằng git, và cập nhật liên tục khi thiết kế thay đổi. Bản gốc `Architecture.docx`
vẫn được giữ lại trong repo để tham chiếu, nhưng từ nay **file này là nguồn cập nhật chính**.

> Cập nhật gần nhất: đọc lại toàn bộ file, thêm mục "Bắt đầu nhanh" và "Cấu trúc thư mục
> hiện tại (thực tế)" để một phiên Claude/Claude Code mới có thể nắm bối cảnh chỉ bằng
> cách đọc file này, không cần người dùng kể lại từ đầu.

---

## Bắt đầu nhanh (đọc mục này trước, dù bạn là người hay là Claude phiên mới)

**Đây là project gì:** hệ thống quản lý nội bộ cho 1 doanh nghiệp nhỏ (F&B), dùng Discord
làm giao diện/hub cho nhân viên ở giai đoạn đầu, nhưng business logic + dữ liệu thật nằm
hoàn toàn trong backend riêng (TypeScript + PostgreSQL), theo kiến trúc Ports & Adapters —
xem mục 1–5, 20, 22 để hiểu triết lý, đừng bỏ qua nếu chưa quen dự án.

**Đang ở đâu:** đã xong Milestone 1 và Phase 2 gần trọn vẹn — `/inventory-update` và
`/inventory-check` chạy thật trên Discord, có phân quyền 3 mức. Xem mục **"Trạng thái
triển khai"** (cuối file) để biết chính xác cái gì đã có / chưa có trước khi bắt đầu làm
thêm bất cứ gì — tránh làm trùng hoặc đoán sai hiện trạng.

**Chạy project trên máy này thế nào:** môi trường dev là WSL2 Ubuntu (Docker Engine native
+ Node.js qua nvm + pnpm), project truy cập được qua `~/fnb-management-system` (symlink
sang ổ Windows). Lệnh chạy nhanh:
```bash
cd ~/fnb-management-system
docker compose up -d postgres   # nếu Postgres chưa chạy
pnpm dev                        # chạy bot, tsx watch — Ctrl+C rồi chạy lại nếu vừa sửa
                                 # code từ bên ngoài WSL2 (watch không nhận qua /mnt/c)
```
Đổi schema thì `pnpm db:generate && pnpm db:migrate`. Chi tiết đầy đủ + cách lấy Discord
token/IDs xem `README.md`.

**Nguyên tắc bất di bất dịch khi sửa/thêm code** (chi tiết ở mục 22): Discord chỉ là
adapter, không chứa business logic; mọi thứ quan trọng ghi vào Postgres phải qua
PARSE → VALIDATE → PREVIEW → HUMAN CONFIRM → DATABASE; `core/` không được import
Discord.js hay Drizzle; mỗi command Discord phải gọi `resolveAuthorizedEmployee` (xem mục
7) trước khi chạm business logic.

---

## 1. Bối cảnh

Xây dựng một hệ thống nội bộ cho doanh nghiệp nhỏ.

Ở giai đoạn đầu, Discord được sử dụng như giao diện/hub cho nhân viên, thay vì xây một ứng
dụng mobile/web riêng.

Nhân viên sử dụng Discord để:

- Nhận thông báo.
- Nhận lịch làm việc.
- Tương tác với bot.
- Gửi báo cáo.
- Upload hình ảnh.
- Gửi dữ liệu tồn kho.
- Xác nhận các thao tác.
- Thực hiện một số workflow nội bộ.

Discord không phải database và không phải hệ thống nghiệp vụ chính. Business logic và dữ
liệu thật phải nằm trong backend riêng.

Yêu cầu quan trọng: kiến trúc phải cho phép sau này thay Discord bằng hoặc bổ sung Telegram
Bot, Slack Bot, Web app, hoặc các interface khác — mà không phải viết lại business logic.

## 2. Kiến trúc tổng thể mong muốn

```
Employees
   │
   ▼
Discord
   │
   ▼
Discord Adapter / Bot
   │
   ▼
Application / Business Backend
   │
   ├── Employees
   ├── Schedule
   ├── Payroll
   ├── Inventory
   ├── Daily Revenue
   ├── Image Processing
   ├── Notifications
   └── Audit Logs
   │
   ├── PostgreSQL
   ├── Object Storage
   └── External APIs / AI / OCR
```

Trong tương lai:

```
Business Backend
   │
   ┌─────────────┼─────────────┐
   ▼             ▼             ▼
Discord       Telegram       Slack
Adapter       Adapter        Adapter
```

Discord chỉ là một adapter/interface. Không được đặt business logic quan trọng trực tiếp
trong Discord bot.

## 3. Technology direction

Stack hiện đang ưu tiên: TypeScript, Node.js, Fastify, Discord.js, PostgreSQL, Drizzle ORM,
Zod, Docker, Docker Compose.

Ban đầu hệ thống triển khai dưới dạng **modular monolith**, không cần microservices.

```
VPS
 │
 ├── Docker
 │
 ├── Application
 │    ├── REST API
 │    ├── Discord Bot
 │    ├── Business Logic
 │    └── Background Jobs
 │
 ├── PostgreSQL
 │
 └── reverse proxy
```

Không cần Kubernetes ở giai đoạn đầu.

## 4. Deployment

Production ban đầu chạy trên một VPS nhỏ: 2 CPU, 2–4 GB RAM, Linux, Docker Compose, chạy
24/7.

Docker được dùng để: giữ environment nhất quán, deploy dễ dàng, chuyển server dễ dàng, quản
lý application/database, restart/log/debug thuận tiện.

Database phải dùng persistent storage và có backup riêng. **Docker không được coi là
backup.**

## 5. Kiến trúc code

Theo tư tưởng Ports & Adapters / Hexagonal Architecture ở mức vừa phải.

> Cây thư mục dưới đây là **định hướng ban đầu** (lúc chưa viết dòng code nào) — vẫn đúng
> về nguyên tắc phân lớp, nhưng không phản ánh chính xác những gì đã tồn tại. Xem
> **"Cấu trúc thư mục hiện tại (thực tế)"** trong mục "Trạng thái triển khai" ở cuối file
> để biết chính xác file nào đang có.

```
src/
 │
 ├── core/
 │    ├── employee/
 │    ├── inventory/
 │    ├── payroll/
 │    ├── schedule/
 │    └── revenue/
 │
 ├── application/
 │    ├── submit-daily-report/
 │    ├── inventory-transaction/
 │    ├── get-schedule/
 │    ├── get-payroll/
 │    └── upload-image/
 │
 ├── adapters/
 │    ├── discord/
 │    ├── telegram/
 │    └── slack/
 │
 ├── infrastructure/
 │    ├── postgres/
 │    ├── storage/
 │    └── external-api/
 │
 └── api/
```

Không cần over-engineering nhưng phải giữ business logic độc lập khỏi Discord.

## 6. Employee Identity

Không được dùng Discord User ID làm Employee ID chính. Phải có employee ID nội bộ.

```
employees
  id
  employee_code
  name
  store_id
  position
  role          -- staff | manager | admin, xem mục 7 (Permission)
  status
  ...
```

Mapping tài khoản bên ngoài:

```
external_accounts
  id
  employee_id
  provider
  provider_user_id
```

Ví dụ:

```
EMP001 | discord  | 91827381923
EMP001 | telegram | 628192830
EMP001 | slack    | U02918AB
```

Cùng một employee có thể sử dụng nhiều platform.

## 7. Permission

Discord Role có thể dùng như lớp permission đầu tiên: `@Employee`, `@StoreManager`,
`@AreaManager`, `@Accounting`, `@Admin`.

Tuy nhiên business backend vẫn phải kiểm tra permission. **Không được chỉ dựa vào Discord
Role cho các hành động quan trọng.**

```
User clicks Approve
   ↓
Discord permission check
   ↓
Backend permission check
   ↓
Business validation
   ↓
Execute
   ↓
Audit log
```

**Đã triển khai (08/2026):** 3 mức role — `staff` < `manager` < `admin` (rank cao hơn tự
động bao gồm quyền của rank thấp hơn). Lưu ở cột `employees.role` (Postgres enum
`employee_role`), tách biệt với `position` (chỉ là chức danh hiển thị, không dùng để
phân quyền). Luật xếp hạng thuần túy nằm ở `core/employee/employee-role.ts`
(`hasAtLeastRole`). Mỗi command Discord tự khai báo mức quyền tối thiểu của nó (ví dụ
`inventoryCommandRequiredRole` trong file command tương ứng), và gọi
`adapters/discord/authorize.ts#resolveAuthorizedEmployee` ngay đầu handler — hàm này làm
đúng 2 bước "Discord permission check" (ngầm định, vì đã qua được `interaction`) rồi
"Backend permission check" trong sơ đồ trên, trước khi chạm vào bất kỳ business logic
nào. Audit log (bước cuối sơ đồ) **vẫn chưa có** — xem mục "Trạng thái triển khai".

## 8. Discord Server Structure

```
🏢 COMPANY
📢 INFORMATION      #announcements  #schedule
🏪 OPERATIONS       #daily-operation  #alerts
📊 REPORTING        #daily-sales  #inventory
🤖 BOT              #bot-commands
👔 MANAGEMENT       #manager  #approvals
🔒 ADMIN            #system-log
```

Không cần tạo quá nhiều channel ban đầu.

## 9. Schedule Workflow

Bot chủ động gửi lịch làm việc, ví dụ:

```
📅 LỊCH LÀM VIỆC — 10/08/2026
Nguyen Van A
08:00 → 16:00
Store 01
[ Xác nhận ]  [ Báo vấn đề ]
```

Employee bấm Confirm. Backend lưu `employee_id`, `schedule_id`, `confirmed_at`.

## 10. Payroll

Payroll là dữ liệu nhạy cảm. **KHÔNG gửi thông tin lương vào public/shared channel.**
Discord chỉ nên đóng vai trò gateway.

```
Employee → /salary → Discord Bot → Backend xác định Employee → Payroll system
```

Hướng ưu tiên: bot gửi thông báo kèm nút, dẫn tới authenticated/signed URL có thời hạn
ngắn:

```
💰 Payslip tháng 07/2026 đã sẵn sàng.
[ View Payslip ]
```

Payroll thật nằm trong backend. Discord không phải nơi lưu payroll chính thức.

## 11. Daily Revenue Report

Lệnh `/daily-report` mở form: Store, Cash, Card, Other, Note → Submit → backend lưu
structured data, bot phản hồi tổng kết.

## 12. Image Upload

```
Employee → Upload image → Discord → Bot → Backend
   → Image Processing / OCR / AI → Result → Discord Preview
   → Employee Confirm → Database
```

Nguyên tắc quan trọng: **AI/OCR không được tự động thay đổi dữ liệu quan trọng.**

```
INPUT → PARSE / OCR / AI → VALIDATE → PREVIEW → HUMAN CONFIRM → DATABASE
```

## 13. Inventory — quy trình hiện tại

Hiện tại inventory hoạt động bằng bảng trắng: số thứ tự, tên mặt hàng, số lượng. Trong ngày
nhân viên lấy hàng và ghi/trừ số lượng trên bảng. Cuối ngày bảng được chụp lại để cập nhật
hệ thống.

Lý do giữ bảng trắng: bút nhanh, không muốn mở điện thoại mỗi lần lấy hàng, không muốn
scan QR/barcode mỗi transaction, digital workflow không được làm chậm hoạt động vật lý
trong kho.

**Nguyên tắc: Digitize at the end of the workflow, not during every physical operation.**

## 14. Inventory — workflow mới

Dùng SKU/code ngắn cho từng sản phẩm, ví dụ `A1 = Coca Cola`, `A2 = Pepsi`, `B1 = Water
500ml`.

Trong ngày nhân viên vẫn ghi bằng bút (`A1 -3`, `B2 -1`...). Cuối ngày gửi Discord dạng
không dấu (`A1 3`, `B2 1`, `A3 8`, `A1 2`). Bot normalize và cộng dồn theo SKU
(`A1 → -5`), lấy thông tin sản phẩm từ backend, trả preview:

```
📦 INVENTORY UPDATE
A1 Coca Cola  -5 → còn 42
B2 Water 1L   -1 → còn 18
A3 Fanta      -8 → còn 11
[ Confirm ]  [ Edit ]  [ Cancel ]
```

Chỉ sau khi Confirm mới ghi database.

## 15. Inventory Image/OCR

```
Whiteboard → Take photo → Discord → Bot → OCR / Vision
   → Parse SKU + quantity → Validate → Preview
   → Employee Confirm → Inventory update
```

Ảnh cũng được lưu làm evidence/archive. Text input là fallback nếu OCR đọc không chính
xác.

## 16. Inventory Data Model

Không chỉ lưu `A1 stock = 36`. Phải có transaction ledger:

```
inventory_transactions
  id
  item_id
  quantity_change
  transaction_type
  employee_id
  store_id
  source
  created_at
  metadata
```

Ví dụ: `A1 +50 STOCK_IN`, `A1 -2 STOCK_OUT`, `A1 -5 STOCK_OUT`, `A1 -1 ADJUSTMENT`. Current
stock được **tính** từ transactions, không lưu tĩnh. Nhờ đó có audit trail đầy đủ.

## 17. Inventory Reconciliation

Ảnh bảng trắng có thể dùng như một bước reconciliation: so sánh expected stock (từ hệ
thống) với physical/whiteboard, nếu lệch thì bot cảnh báo và yêu cầu xác nhận adjustment.
**Không tự động adjustment nếu chưa được người có quyền xác nhận.**

## 18. Notification abstraction

Business logic không được gọi trực tiếp `discord.send(...)`. Phải gọi abstraction:

```
notification.send(employee_id, notification_type, payload)
```

Notification service quyết định gửi qua Discord / Telegram / Slack / Email. Employee có
thể có `preferred_notification_channel`.

## 19. Platform-independent actions

Backend không biết khái niệm "Discord Button". Backend chỉ biết business action: approve,
reject, confirm, edit, cancel, view. Adapter chịu trách nhiệm render (Discord Buttons,
Telegram Inline Keyboard, Slack Block Kit...). Nhờ vậy platform có thể thay đổi mà business
logic không đổi.

## 20. Source of Truth

Nguyên tắc quan trọng nhất của project:

**Discord ≠ Database. Discord ≠ Business System. Discord ≠ Payroll Storage. Discord ≠
Inventory Database.**

Discord chỉ là: Human Interface + Notification Layer + Interaction Layer.

Source of truth phải là: **Backend + PostgreSQL + Object Storage.**

## 21. Mục tiêu của MVP

Không xây toàn bộ hệ thống ngay lập tức.

**Phase 1** — Backend skeleton, PostgreSQL, Employee model, Discord account mapping,
Discord bot connection, basic permissions.

**Phase 2** — Inventory: product/SKU database, inventory transaction ledger, Discord text
inventory input, parser, preview, confirm, save transaction, current stock.

**Phase 3** — Inventory image: upload photo, store original image, OCR/Vision, parse
result, preview, human correction, confirm.

**Phase 4** — Operations: daily revenue, schedule notification, confirmation buttons.

**Phase 5** — Sensitive/private workflows: payroll notification, secure payslip access,
audit logging.

**Phase 6** — Platform abstraction: Telegram adapter, potential Slack adapter.

## 22. Engineering Principles

1. Keep it simple.
2. Modular monolith first.
3. Discord is an adapter.
4. Backend owns business logic.
5. PostgreSQL is source of truth.
6. Object storage owns uploaded files.
7. Never trust client/platform permissions alone.
8. Validate every business operation in backend.
9. AI/OCR output must be reviewed before critical updates.
10. Maintain audit logs for important actions.
11. Use internal employee IDs, never Discord IDs as primary identity.
12. Keep workflows platform-independent.
13. Do not introduce microservices/Kubernetes unless actually needed.
14. Optimize employee workflow for speed.
15. Technology should not make physical warehouse work slower.

## 23. Development Starting Point

Bắt đầu implementation từ zero, từng bước, không nhảy ngay vào một hệ thống quá lớn.

1. Define project structure
2. Initialize TypeScript/Node project
3. Configure Docker Compose
4. Start PostgreSQL
5. Define database schema
6. Implement Employee
7. Implement Product/SKU
8. Implement Inventory Transactions
9. Connect Discord Bot
10. Implement first command
11. Implement inventory text parser
12. Preview + Confirm workflow
13. Persist transaction
14. Add image/OCR later

**Milestone 1 (đã hoàn thành — xem "Trạng thái triển khai" bên dưới):**

```
Employee sends:
A1 5
A2 2
B3 4
   ↓
Discord Bot
   ↓
Backend validates SKU
   ↓
Bot shows preview
   ↓
Employee clicks Confirm
   ↓
Inventory transaction saved in PostgreSQL
```

## 24. Inventory Reorder Alerts (Planned)

> Trạng thái: **chưa triển khai — ghi lại yêu cầu để làm ở Phase 4/5.** Thảo luận ngày
> 08/2026: cần backend quét định kỳ tồn kho còn lại, dự đoán và cảnh báo đặt hàng, vì mỗi
> mặt hàng có thời gian đặt hàng (lead time) khác nhau — có mặt hàng 1-2 ngày là có hàng,
> có mặt hàng mất 1-2 tuần.

**Schema bổ sung cần cho `products`:**

- `lead_time_days` — thời gian chờ hàng về kể từ lúc đặt.
- `reorder_point` — ngưỡng tồn kho mà dưới đó phải cảnh báo đặt hàng. Giai đoạn đầu có thể
  để quản lý tự nhập tay; sau này có thể tự tính từ `average_daily_usage`.
- `average_daily_usage` (tùy chọn, làm sau) — tốc độ tiêu thụ trung bình mỗi ngày, tự tính
  từ lịch sử `inventory_transactions` để dự đoán ngưỡng đặt hàng thông minh hơn thay vì
  nhập tay cố định.

**Cách vận hành:**

```
Scheduled Job (chạy định kỳ, ví dụ mỗi đêm)
   ↓
Lặp qua các SKU đang active
   ↓
Tính current stock (SUM trên inventory_transactions — vẫn dùng cách tính hiện có,
không cần cache vì job chạy theo lịch, không chạy theo mỗi lệnh người dùng)
   ↓
So sánh với reorder_point (có tính đến lead_time_days)
   ↓
Nếu dưới ngưỡng → notification.send(employee_id, "LOW_STOCK_ALERT", payload)
```

Job này thuộc nhóm "Background Jobs" đã có chỗ sẵn trong kiến trúc tổng ở mục 3, và phải
gọi qua notification abstraction ở mục 18 (không gọi thẳng Discord), để sau này đổi/thêm
Telegram, Slack vẫn dùng lại được job này mà không sửa gì.

---

## Trạng thái triển khai

Cập nhật thủ công mỗi khi có thay đổi lớn, để file này luôn phản ánh đúng những gì đã làm.

### Cấu trúc thư mục hiện tại (thực tế)

```
src/
├── core/
│   ├── employee/
│   │   ├── employee.entity.ts
│   │   ├── employee.repository.ts     (port/interface)
│   │   └── employee-role.ts           (staff < manager < admin, hasAtLeastRole)
│   ├── product/
│   │   ├── product.entity.ts
│   │   └── product.repository.ts      (port/interface)
│   ├── inventory/
│   │   ├── inventory-transaction.entity.ts
│   │   └── inventory.repository.ts    (port/interface)
│   └── audit/
│       ├── audit-log.entity.ts
│       └── audit-log.repository.ts    (port/interface)
│
├── application/
│   ├── employee/
│   │   └── resolve-employee-by-provider.ts
│   └── inventory/
│       ├── types.ts
│       ├── parse-inventory-input.ts
│       ├── validate-inventory-input.ts
│       ├── preview-inventory-update.ts
│       ├── confirm-inventory-update.ts
│       └── check-inventory-stock.ts
│
├── adapters/
│   └── discord/
│       ├── bot.ts                     (đăng ký lệnh + router sự kiện — điểm cắm mọi command mới)
│       ├── dependencies.ts
│       ├── authorize.ts               (resolveAuthorizedEmployee — mọi handler gọi hàm này đầu tiên)
│       ├── inventory-session-store.ts (preview tạm trong RAM, chờ Confirm)
│       ├── render-inventory-preview.ts
│       ├── render-inventory-check.ts
│       ├── commands/
│       │   ├── inventory-command.ts        (/inventory-update)
│       │   └── inventory-check-command.ts  (/inventory-check)
│       └── interactions/
│           ├── inventory-modal-submit.ts
│           └── inventory-confirm-button.ts
│   (adapters/telegram, adapters/slack — CHƯA tạo, Phase 6)
│
├── infrastructure/
│   ├── config/env.ts                  (Zod validate biến môi trường)
│   └── postgres/
│       ├── client.ts
│       ├── schema/                    (employees, external-accounts, products,
│       │                               inventory-transactions, audit-logs)
│       └── repositories/              (implement các port ở core/)
│
├── api/                                (RỖNG — chưa có REST API, xem "Chưa có" bên dưới)
└── index.ts                            (điểm khởi động DUY NHẤT — xem "Bắt đầu nhanh" ở đầu file)

scripts/
├── migrate.ts
└── seed.ts
```

### Đã có (Milestone 1) — đã test end-to-end thành công 08/2026

- Cấu trúc code hexagonal: `src/core`, `src/application`, `src/adapters/discord`,
  `src/infrastructure`.
- Schema Postgres (Drizzle): `employees`, `external_accounts`, `products`,
  `inventory_transactions` (ledger, không lưu stock tĩnh).
- Employee identity qua `external_accounts` (không dùng Discord ID trực tiếp).
- Discord flow: `/inventory-update` → modal nhập nhiều dòng → parse (tự cộng dồn theo SKU,
  mặc định stock-out nếu không có dấu) → validate SKU → preview (embed + nút Confirm/
  Cancel) → Confirm mới ghi `inventory_transactions`.
- Docker Compose (Postgres + app), Dockerfile, migration đầu tiên đã generate sẵn trong
  `drizzle/`.
- Seed script mẫu: 5 sản phẩm (A1–B2) + 1 nhân viên mẫu map với Discord.
- Môi trường dev thật: Docker Engine + Node.js (qua nvm) chạy native trong WSL2 Ubuntu,
  Discord Application/Bot đã tạo, đã chạy `pnpm dev` và xác nhận thật trên Discord —
  `/inventory-update` → preview → Confirm → transaction ghi vào Postgres thành công.
- `/inventory-check [sku]` — lệnh chỉ đọc, xem tồn kho hiện tại của 1 SKU hoặc toàn bộ sản
  phẩm đang active. Không ghi gì vào DB. Thêm `ProductRepository.findAllActive()` để phục
  vụ trường hợp không truyền SKU.
- Phân quyền 3 mức `staff < manager < admin` (mục 7). Cả `/inventory-update` và
  `/inventory-check` hiện để mức tối thiểu `staff` (mở cho tất cả) — đổi 1 dòng hằng số
  `xxxCommandRequiredRole` trong file command tương ứng nếu muốn giới hạn lại. Employee
  mẫu EMP001 (map với Discord của bạn) được seed sẵn role `admin`.
- Audit log (08/2026): bảng `audit_logs` (`employee_id`, `action`, `entity_type`,
  `entity_id`, `payload` jsonb, `source`, `created_at`) — hoàn thiện bước cuối sơ đồ
  permission ở mục 7. Port `AuditLogRepository` (`core/audit/`), implementation ở
  `infrastructure/postgres/repositories/audit-log.repository.ts`. Hiện chỉ có 1 điểm ghi:
  `confirmInventoryUpdate` (`application/inventory/confirm-inventory-update.ts`) ghi
  1 dòng `INVENTORY_UPDATE_CONFIRMED` ngay sau khi transaction được lưu, kèm
  `transactionIds` + danh sách dòng đã confirm trong `payload`. Ghi audit log là best-effort
  nối tiếp sau (không bọc chung DB transaction với insert `inventory_transactions`) — ưu
  tiên giữ đơn giản (mục 22.1) hơn là atomicity tuyệt đối ở giai đoạn MVP này. Chưa có điểm
  ghi audit log nào khác (chưa dùng cho employee role change, v.v.) — thêm dần khi các
  action quan trọng khác xuất hiện.

### Chưa có (việc tiếp theo)

- Inventory reorder alert / background job (mục 24 ở trên) — cần thêm `lead_time_days`,
  `reorder_point` vào schema `products` trước.
- REST API (`src/api` đang để trống).
- OCR/Vision cho ảnh bảng trắng (Phase 3).
- Daily revenue report, schedule notification (Phase 4).
- Payroll, secure payslip URL, audit logging đầy đủ (Phase 5).
- Telegram/Slack adapter (Phase 6) — khung thư mục `src/adapters/telegram`,
  `src/adapters/slack` chưa tạo, chỉ có `discord`.
- Backup định kỳ Postgres → Google Drive (đã thiết kế trong tài liệu gốc, chưa cấu hình).

---

## Ghi chú — Database, File Storage & Backup

Ở giai đoạn MVP, ưu tiên kiến trúc đơn giản và chi phí thấp.

**PostgreSQL** chạy trực tiếp trên cùng VPS với backend/bot qua Docker Compose, là source of
truth cho: Employees, External accounts/Discord mappings, Products/SKU, Inventory
transactions, Current inventory (tính từ ledger), Daily revenue reports, Schedule, Payroll
metadata, Permissions, Audit logs, Metadata/reference tới file. Không cần Managed
PostgreSQL riêng ở giai đoạn đầu.

**Google Drive** dùng làm nơi lưu file thay vì triển khai S3/Object Storage riêng: ảnh bảng
tồn kho, ảnh/chứng từ nhân viên upload, payslip PDF, report/export, tài liệu liên quan,
PostgreSQL backups. PostgreSQL chỉ lưu metadata/reference tới file, ví dụ:

```
inventory_photos
  id
  store_id
  employee_id
  google_drive_file_id
  created_at
  status
```

Không lưu binary image trực tiếp trong PostgreSQL nếu không cần thiết.

**Database Backup** — Postgres nằm trên VPS, nhưng backup không được chỉ nằm trên cùng VPS.

```
PostgreSQL → pg_dump → Backup file → Google Drive
```

Ví dụ retention: daily backups giữ 7–14 ngày, weekly backups giữ 4–8 tuần, monthly backups
giữ lâu hơn nếu cần. Retention policy cụ thể quyết định sau.

**Nguyên tắc:** PostgreSQL = structured business data / source of truth. Google Drive =
file storage + off-server backup. Discord = employee interface / notification / interaction
layer. Không cần S3/Object Storage hoặc Managed PostgreSQL trong MVP trừ khi quy mô hoặc
yêu cầu thay đổi.
