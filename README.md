# Secret-AF cho Android (APK, chạy trực tiếp trên điện thoại, không cần VPS)
Kiến trúc: app Android = WebView + dịch vụ nền (foreground service) chạy Node.js (nodejs-mobile) với đúng lõi BotAFK/Secret-AF trên PC.
Giao diện là bản PC, có bố cục điện thoại (`ui/mobile.css`). Nhấn giữ nút chức năng = chuột phải (cài đặt).

## Build không cần Android Studio (GitHub Actions)
1. Tạo repo GitHub (private), đẩy toàn bộ thư mục này lên nhánh `main`.
2. Tab Actions -> `build-apk` -> Run workflow (hoặc tự chạy khi push).
3. Chạy xong, tải artifact `Secret-AF-apk` -> giải nén ra `app-debug.apk`, chép vào điện thoại và cài (cho phép "cài từ nguồn không rõ").

## Lần đầu mở app
- Cho phép thông báo và "không tối ưu pin" (bắt buộc để Android không giết bot khi tắt màn hình).
- Đợi 10-60 giây lần đầu (giải nén lõi). Lần sau mở nhanh.
- Back = chạy nền. Dừng hẳn: nút "Dừng hẳn" trong thông báo.
- Dữ liệu acc nằm ở: Android/data/com.secretaf.app/files/data (gỡ app sẽ mất).
- Một số hãng (Xiaomi, Oppo, Vivo, Samsung) còn có "tự khởi động / chạy nền" riêng: bật cho Secret-AF.
