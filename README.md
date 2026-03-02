## Phần 1: Hướng dẫn cài đặt và chạy dự án (Local)

### Yêu cầu hệ thống:
* Node.js (phiên bản >= 22.x)

### Môi trường Backend
Cung cấp các biến môi trường cho phần backend trong file `backend/.env`:
```env
PORT=3000
DB_HOST=mysql_host
DB_USER=mysql_user
DB_PASSWORD=mysql_password
DB_NAME=mysql_database
DB_PORT=mysql_port
GEMINI_API_KEY=your_gemini_api_key_here
```
### Các bước khởi chạy dự án:
1. **Cài đặt thư viện:**
Mở 2 terminal song song tại thư mục gốc của project để chạy cài đặt.
- **Terminal 1** (Backend):
  ```bash
  cd backend
  npm install
  ```
- **Terminal 2** (Frontend):
  ```bash
  cd frontend
  npm install
  ```

2. **Chạy ứng dụng:**
- Khởi động **Backend** (port 3000 mặc định):
  ```bash
  cd backend
  npm run dev
  ```
- Khởi động **Frontend** (port 5173 mặc định):
  ```bash
  cd frontend
  npm run dev
  ```

3. Truy cập: http://localhost:5173

## Phần 2: Môi trường Production

Ứng dụng hiện đã được deploy và có thể trải nghiệm trực tiếp thông qua đường dẫn sau:

🔗 **Link Production:** [Đang cập nhật - Vui lòng chèn link production của bạn tại đây]

> **Lưu ý:** Xin lưu ý cần có **GEMINI_API_KEY** tại file env backend.
