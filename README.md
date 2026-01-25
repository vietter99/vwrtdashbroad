# 🚀 VWRT Dashboard System (VWRT Admin Panel)

> **Hệ thống quản lý Router OpenWrt chuyên dụng, tối ưu hóa cho Modem 4G/5G.**

![Version](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/vietter99/vwrtdashbroad/main/version.json&query=$.dashboard.version&label=version&color=blue)
![Status](https://img.shields.io/badge/status-stable-green.svg)
![License](https://img.shields.io/badge/license-Vietter%20Exclusive-red.svg)

<img width="100%" alt="VWRT Dashboard Preview" src="https://github.com/user-attachments/assets/05a261b4-a95b-4421-b388-cefa7a8c28fa" />

---

## 🔴 CẢNH BÁO BẢN QUYỀN (EXCLUSIVE NOTICE)

📞 **Liên Hệ & Hỗ Trợ**

- Mọi thông tin chi tiết vui lòng liên hệ qua các kênh chính thức dưới đây:

**👨‍💻 TÁC GIẢ CỦA [Vietter](https://www.facebook.com/vietter.99/)**

**🆘 HỖ TRỢ & GIẢI ĐÁP (Support) [Phạm Việt](https://www.facebook.com/pham.viet.853811)**

**© 2025 VWRT. All rights reserved.**

---

⚠️ **QUAN TRỌNG:**

- Sản phẩm được thiết kế và tối ưu riêng cho các thiết bị phần cứng do chúng tôi cung cấp/hỗ trợ.
- Nghiêm cấm mọi hành vi sao chép, chỉnh sửa, phân phối lại hoặc sử dụng cho mục đích thương mại mà không có sự đồng ý của tác giả.

---

## ✨ Tính Năng Nổi Bật (Features)

Hệ thống VWRT Dashboard mang đến trải nghiệm quản lý Router hoàn toàn mới:

### 1. 📊 Dashboard Trực Quan

- **Giao diện thẻ (Card-based):** Hiện đại, dễ nhìn.
- **Responsive:** Tương thích hoàn hảo trên cả PC & Mobile.
- **Theme:** Hỗ trợ Dark Mode / Light Mode.

### 2. 📡 Giám Sát Modem 4G/5G

- **Tối ưu hóa:** Hỗ trợ tốt dòng cardwwan sài mmcli.
- **Thông số chi tiết:** Hiển thị Real-time: RSRP, SINR, Band, CA, Nhiệt độ Modem...

### 3. 📩 Quản Lý Tin Nhắn & Hệ Thống

- **SMS:** Đọc và Gửi tin nhắn/USSD ngay trên Web.
- **Tiện ích:** Theo dõi CPU/RAM, Reboot, Reset, Đổi cổng Modem nhanh.

### 4. 🔄 Cập Nhật Tự Động (OTA)

- Tự động kiểm tra và thông báo khi có phiên bản mới từ Server.
- Hỗ trợ cập nhật riêng biệt Dashboard và Firmware.

---

## ⚡ Hướng Dẫn Cài Đặt (Installation Guide)

### Bước 1: Truy cập SSH

- Sử dụng phần mềm Terminal (macOS/Linux) hoặc PuTTY/CMD (Windows) để truy cập vào Router:

```bash
ssh root@router_ip
```

### Bước 2: Chạy lệnh cài đặt

- Copy và dán dòng lệnh sau vào cửa sổ SSH rồi nhấn Enter:
- Cách 1:

```bash
wget --no-check-certificate -O /tmp/install.sh "https://raw.githubusercontent.com/vietter99/vwrtdashbroad/main/install.sh" && chmod +x /tmp/install.sh && /tmp/install.sh
```

- Cách 2:

```bash
curl -k -L -o /tmp/install.sh "https://raw.githubusercontent.com/vietter99/vwrtdashbroad/main/install.sh" && chmod +x /tmp/install.sh && /tmp/install.sh
```

(Lưu ý: Đảm bảo Router của bạn đang có kết nối Internet để tải gói cài đặt)

### Bước 3: Truy cập Dashboard

- Sau khi script báo cài đặt thành công, hãy mở trình duyệt và truy cập:

- Địa chỉ: ROUTER_IP:2222

- Tài khoản/Mật khẩu: Sử dụng chung với tài khoản đăng nhập Router (root).

---

## 🗑️ Hướng Dẫn Gỡ Cài Đặt (Uninstall)

Nếu bạn không muốn sử dụng VWRT Dashboard nữa, hãy chạy các lệnh sau để xóa sạch hệ thống:

```bash
# 1. Dừng dịch vụ chạy ngầm
killall mobile_poller.lua

# 2. Xóa toàn bộ file nguồn
rm -rf /www/vwrt

# 3. Xóa cấu hình Web Server (uhttpd)
uci delete uhttpd.vwrt
uci commit uhttpd
/etc/init.d/uhttpd restart

# 4. Xóa script khởi động (Clean rc.local)
sed -i '/mobile_poller.lua/d' /etc/rc.local

# 5. Khôi phục trang chủ mặc định (Mở LuCI trực tiếp)
# Mở file index.html và sửa lại chuyển hướng về /cgi-bin/luci
echo '<script>window.location.href="/cgi-bin/luci/";</script>' > /www/index.html

echo "Đã gỡ cài đặt thành công!"
```

Sau khi chạy xong, truy cập vào IP Router sẽ tự động vào thẳng LuCI như mặc định.
