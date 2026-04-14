# Kho Prompt Video AI

Website nội bộ để nhân viên lưu prompt tạo video AI. Staff chỉ thấy/sửa bộ của mình, admin xem & quản lý tất cả.

## Stack
- **Next.js 14** (App Router) + TypeScript + Tailwind
- **Supabase**: Auth + Postgres + Row Level Security
- Deploy: **Vercel**

## Cấu trúc dữ liệu
Mỗi **bộ prompt** gồm:
- Tên bộ, Model AI (Veo 3.1 / Seedance 2.0 / Kling 3.0) — 1 model cho cả bộ.
- **Kho ảnh tham chiếu** (image refs) dùng chung (0..n): tên + prompt tạo ảnh.
- Danh sách **video con** theo thứ tự (≥1). Loại bộ tự suy: 1 video = *Đơn*, ≥2 = *Ghép*.
- Mỗi video có kiểu: `T2V` / `I2V Multi Ref` / `I2V First & Last`.
  - **Multi Ref**: tick image refs dùng chung + (tùy chọn) dùng Video #X cùng bộ làm video ref.
  - **First & Last**: mỗi vị trí chọn image ref từ kho **hoặc** end frame của Video #X (có thể bỏ trống 1 trong 2).
- Video ref chỉ là tham chiếu nội bộ tới video khác trong cùng bộ — không có ngoài.

## Setup

### 1. Tạo schema trên Supabase
1. Mở Supabase dashboard → **SQL Editor**.
2. Paste nội dung `supabase/schema.sql` → Run.

### 2. Tạo tài khoản admin đầu tiên
1. **Authentication → Users → Add user** (dashboard Supabase):
   - Email: `nvhien.it.work@gmail.com`
   - Password: `123123`
   - Auto Confirm User: **Yes**
2. Chạy `supabase/seed.sql` trong SQL Editor để nâng quyền admin.

### 3. Chạy local
```bash
npm install
npm run dev
```
File `.env.local` đã có sẵn các key Supabase.

### 4. Deploy lên Vercel
1. Push repo này lên GitHub (đã trỏ sẵn về `github.com/Hien-NguyenVan/prompt-storage`).
2. Vào [vercel.com](https://vercel.com) → Import repo.
3. Environment Variables — copy từ `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` ← ⚠️ không được set là Public
4. Deploy.

## Tính năng
- 🔐 Đăng nhập email/password (Supabase Auth + middleware).
- 📝 Tạo/sửa bộ prompt với kho ảnh tham chiếu tái sử dụng.
- 🔗 Thêm ảnh mới ngay trong form video con.
- 🛡️ Xóa image ref đang dùng bị chặn + cảnh báo.
- 📋 Nút copy cho từng prompt (ảnh ref + video).
- 🔎 Lọc: tên, loại (Đơn/Ghép), model, người tạo (admin), khoảng ngày, sắp xếp.
- 👥 Admin page: tạo/xóa/đổi mật khẩu nhân viên.
- 🚫 Staff không xóa được bộ của mình (chỉ admin xóa).
