# Mobile App — Hướng dẫn tạo tài khoản Expo & Build APK

App mobile `laundry-mobile` (React Native + Expo SDK 57) bắt buộc build bằng **EAS Build** vì dùng thư viện native `@maplibre/maplibre-react-native` (không chạy được trên Expo Go).

---

## 1. Tạo tài khoản Expo (miễn phí)

1. Mở trình duyệt: https://expo.dev/signup
2. Đăng ký bằng một trong 3 cách:
   - **Email + mật khẩu** (cần xác minh email), hoặc
   - **GitHub**, hoặc **Google** (nhanh nhất — bấm 1 lần)
3. Sau khi đăng ký xong, màn hình sẽ đưa bạn vào dashboard https://expo.dev/account — tạo xong là dùng được ngay, không cần nâng cấp gói trả phí.
4. Ghi nhớ **username Expo** của bạn (hiển thị bên trái dashboard) — dùng khi đăng nhập bằng CLI ở bước 2.

> Không cần khai báo thẻ tín dụng. Gói free cho phép ~30 build/tháng, đủ cho giai đoạn phát triển.

## 2. Cài EAS CLI & đăng nhập

Mở terminal trong thư mục `D:\Work\LaundryStore\laundry-mobile`:

```bash
npm install -g eas-cli
eas login
```

Khi được hỏi `Email or username` → nhập email/username đã đăng ký ở bước 1, rồi nhập mật khẩu (hoặc dán token từ https://expo.dev/settings/access-tokens).

Kiểm tra đã đăng nhập:

```bash
eas whoami
```

## 3. Cấu hình đã chuẩn bị sẵn

- **`eas.json`**: 3 profile build
  - `development` — dev-client (build để chạy code + hot reload trên máy thật)
  - `preview` — APK để cài trực tiếp lên máy thật test
  - `production` — AAB (app bundle) nộp Play Console
- **`app.json`**: đã khai báo `android.package = com.nimbleapp.app`, `versionCode = 1`, quyền location, plugin splash/secure-store/task-manager.

## 4. Build APK test trên máy thật

```bash
eas build -p android --profile preview
```

- Lần đầu EAS sẽ tạo **keystore** tự động (giữ file `*.jks`/khoá do EAS quản lý — đừng xoá account Expo).
- Build xong, EAS in ra link cài đặt — mở link trên điện thoại Android để tải & cài APK (đã bật `installUrlEnabled`).
- Máy thật cần bật cài đặt "cho phép cài ứng dụng từ nguồn không xác định" khi cài APK lần đầu.

### Cấu hình API URL cho máy thật

API server cần chạy được để máy thật truy cập. Đặt URL vào biến môi trường trước khi build:

```bash
# Windows PowerShell
$env:EXPO_PUBLIC_API_URL="http://<IP-máy-chạy-backend>:3000"
eas build -p android --profile preview
```

> Ví dụ: backend chạy trên máy có IP `192.168.1.10` → `http://192.168.1.10:3000`.
> `app.json` đang bật `usesCleartextTraffic: true` để test bằng HTTP. Trước khi phát hành production, đổi backend sang HTTPS và tắt cờ này.

## 5. Development client (chạy code khi phát triển)

```bash
eas build -p android --profile development
# cài app từ link EAS trả về, rồi chạy:
npx expo start --dev-client
```

Máy và máy tính phải cùng mạng WiFi. App dev-client cho phép hot reload như Expo Go nhưng chạy được MapLibre.

## 6. Production (Play Console)

1. Cấu hình API URL production qua file `.env.production` (hoặc biến môi trường `EXPO_PUBLIC_API_URL` = domain HTTPS thật).
2. Tắt `usesCleartextTraffic` trong `app.json` khi backend đã dùng HTTPS.
3. Nâng `versionCode` và `version` mỗi lần phát hành.
4. Build AAB:

```bash
eas build -p android --profile production
```

5. Tải file `.aab` từ EAS, nộp lên Play Console (Closed testing → Production). Cần tài khoản Google Play Developer (phí 25$ một lần, ngoài phạm vi tài khoản Expo).

## Ghi chú

- **CORS**: không liên quan với app native; chỉ cần khi chạy Expo web.
- **Push nền (FCM)**: chưa có trong MVP — thông báo chỉ hiện khi app mở (socket) hoặc poll 30s.
- **Thiết bị ảo Android**: dùng `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000` (đã đặt sẵn trong `.env`).
