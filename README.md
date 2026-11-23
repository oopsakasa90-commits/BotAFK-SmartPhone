# Secret-AF cho Android

APK cài trực tiếp trên điện thoại. Giao diện giống bản PC (kính mờ, thanh bên → thanh điều hướng dưới), bot chạy ngay trên máy qua lõi Node.js.

## Cài đặt
Tải `Secret-AF.apk` ở mục **Releases → apk-latest** (hoặc artifact của lần build mới nhất), cài và cho phép "cài từ nguồn không rõ". Cập nhật: cài đè, dữ liệu acc được giữ.

## Chạy nền, không bị đóng băng
- Dịch vụ foreground + WakeLock + WifiLock: chạy tiếp khi tắt màn hình và khi **vuốt app khỏi đa nhiệm**.
- Lần đầu app hỏi "không tối ưu pin" (bắt buộc) và mở cài đặt "tự khởi động" riêng của Xiaomi/Oppo/Realme/Vivo/Huawei/Samsung.
- Báo thức canh gác 10 phút/lần và tự bật lại sau khi mở máy / cập nhật app.
- Dừng hẳn: nút **Dừng hẳn** trên thông báo.

## Nhẹ
Chỉ arm64, R8 + shrinkResources, kính mờ blur nhỏ, không dịch vụ thừa.

## Cấu trúc
`app/` vỏ Android (Kotlin + nodejs-mobile) · `nodejs-project/` lõi Node + giao diện `ui/` · `tools/` script build + keystore · build bằng GitHub Actions `build-apk`.
