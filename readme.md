# AgriChain – Truy xuất nguồn gốc nông sản bằng blockchain

Hướng dẫn cài đặt và chạy dự án trên máy cá nhân (Windows + XAMPP), gồm: cài thư viện, tạo cơ sở dữ liệu, biên dịch hợp đồng Solidity, deploy lên Monad Testnet, điền file `.env` và chạy trang web.

## 1. Chuẩn bị

| Phần mềm | Ghi chú |
|---|---|
| Node.js 22 LTS trở lên | Tải tại https://nodejs.org. Hardhat 3 và Vite 8 cần Node 22. Kiểm tra: `node -v`, `npm -v` |
| XAMPP (MySQL/MariaDB + phpMyAdmin) | Tải tại https://www.apachefriends.org |
| Trình duyệt có tiện ích MetaMask | https://metamask.io |

Cấu trúc thư mục chính:

```
Agrichain/
├── blockchain/        Hợp đồng Solidity + Hardhat (biên dịch, deploy)
│   ├── contracts/Agrichain.sol
│   ├── scripts/deploy.js           deploy hợp đồng
│   ├── scripts/smoke.js            chạy thử hợp đồng trên mạng giả lập
│   ├── scripts/transferAdmin.js    chuyển quyền admin hợp đồng sang ví khác
│   └── deployed-agrichain.json     địa chỉ hợp đồng đã deploy (theo chainId)
├── server/            Backend Node.js + Express (cổng 3000)
│   └── migration/truy_xuat_nong_san.sql   file CSDL để import
├── src/               Frontend React + Vite
├── .env               cấu hình (tự tạo, KHÔNG đưa lên git)
└── package.json
```

## 2. Cài thư viện

Mở terminal tại thư mục gốc `Agrichain`:

```bash
npm install
```

Sau đó cài thư viện cho phần blockchain:

```bash
cd blockchain
npm install
cd ..
```

Phải cài ở thư mục gốc trước, vì `blockchain/hardhat.config.js` dùng thư viện `dotenv` cài ở thư mục gốc.

## 3. Tạo cơ sở dữ liệu

1. Mở XAMPP Control Panel, bấm **Start** cho **Apache** và **MySQL**.
2. Vào http://localhost/phpmyadmin, chọn **New** (Mới), tạo database tên `truy_xuat_nong_san`, bảng mã chọn `utf8mb4_unicode_ci`.
3. Chọn database vừa tạo, vào tab **Import** (Nhập), chọn file `server/migration/truy_xuat_nong_san.sql`, bấm **Import**.

Hoặc import bằng dòng lệnh (dùng **cmd**, không dùng PowerShell vì PowerShell không hỗ trợ dấu `<`):

```bat
C:\xampp\mysql\bin\mysql.exe -u root -e "CREATE DATABASE truy_xuat_nong_san CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
C:\xampp\mysql\bin\mysql.exe -u root truy_xuat_nong_san < server\migration\truy_xuat_nong_san.sql
```

File SQL tạo 24 bảng. Ba bảng còn lại (`tai_xe`, `phuong_tien`, `kho_phan_phoi`) server tự tạo ở lần dùng đầu tiên, không cần chạy thêm file nào. Các file khác trong `server/migration/` là bản nâng cấp cũ, đã gộp sẵn vào file trên.

Tài khoản có sẵn trong dữ liệu mẫu (mật khẩu đều là `123456`):

| Tài khoản | Vai trò |
|---|---|
| `admin` | Quản trị viên |
| `demo_nongdan`, `nongdan01` | Nông dân / Hợp tác xã |
| `demo_kiemdinh`, `kiemdinhvung2` | Cơ quan kiểm định |
| `demo_soche`, `sochemekong` | Cơ sở sơ chế |
| `demo_vanchuyen`, `vanchuyen01` | Đơn vị vận chuyển |
| `demo_nhaphanphoi`, `phanphoi01` | Nhà phân phối |
| `demo_daily01`, `demo_daily02` | Đại lý |

## 4. Tạo file `.env`

Tạo file tên `.env` ở **thư mục gốc** `Agrichain` (cùng chỗ với `package.json`). Cả server và Hardhat đều đọc file này. Chép mẫu dưới đây rồi sửa các giá trị:

```env
# ===== Server =====
PORT=3000
JWT_SECRET=doi_thanh_chuoi_bi_mat_dai_ngau_nhien

# ===== Cơ sở dữ liệu (XAMPP) =====
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_DATABASE=truy_xuat_nong_san

# ===== Blockchain: Monad Testnet =====
PRIVATE_KEY=0xKHOA_RIENG_CUA_VI_DEPLOY
BLOCKCHAIN_RPC_URL=https://testnet-rpc.monad.xyz
BLOCKCHAIN_CHAIN_ID=10143
BLOCKCHAIN_NETWORK_NAME=Monad Testnet
BLOCKCHAIN_CURRENCY=MON
BLOCKCHAIN_EXPLORER_URL=https://testnet.monadexplorer.com
BLOCKCHAIN_CONTRACT_ADDRESS=

# ===== Tùy chọn (có thể để trống / bỏ đi) =====
BLOCKCHAIN_NAMESPACE=
BLOCKCHAIN_CHI_LO_TU=
BLOCKCHAIN_WORKER=1
BLOCKCHAIN_WORKER_GIAY=15
BLOCKCHAIN_WORKER_HET_HAN_PHUT=30
BLOCKCHAIN_WORKER_DOI_SOAT_GIAY=120
```

Ý nghĩa từng biến:

| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `PORT` | có | Cổng của server. **Giữ nguyên 3000**, vì giao diện gọi API tới `http://localhost:3000`. |
| `JWT_SECRET` | nên có | Chuỗi bí mật để ký token đăng nhập. Đặt một chuỗi dài, ngẫu nhiên. Đổi chuỗi này thì mọi người phải đăng nhập lại. |
| `DB_HOST`, `DB_PORT` | có | Địa chỉ MySQL. XAMPP mặc định `localhost` và `3306`. |
| `DB_USER`, `DB_PASSWORD` | có | Tài khoản MySQL. XAMPP mặc định `root`, mật khẩu để trống. |
| `DB_DATABASE` | có | Tên database đã tạo ở bước 3. |
| `PRIVATE_KEY` | khi deploy | Khóa riêng của ví dùng để deploy hợp đồng (dạng `0x` + 64 ký tự). Ví này trở thành **admin của hợp đồng**. Chỉ Hardhat dùng biến này, server không dùng. |
| `BLOCKCHAIN_RPC_URL` | có | Nút RPC của Monad Testnet. Nếu bị lỗi `ENOTFOUND` hoặc bị chặn, đổi sang nút RPC khác (ví dụ nút đang dùng trong MetaMask). |
| `BLOCKCHAIN_CHAIN_ID` | có | `10143` là Monad Testnet. |
| `BLOCKCHAIN_NETWORK_NAME`, `BLOCKCHAIN_CURRENCY` | không | Tên mạng và đơn vị tiền hiển thị trên giao diện. |
| `BLOCKCHAIN_EXPLORER_URL` | không | Trang xem giao dịch, dùng để tạo đường dẫn tới mã giao dịch. |
| `BLOCKCHAIN_CONTRACT_ADDRESS` | có | Địa chỉ hợp đồng AgriChain lấy ở bước 5. Nếu để trống, server lấy địa chỉ trong `blockchain/deployed-agrichain.json` theo `BLOCKCHAIN_CHAIN_ID`. |
| `BLOCKCHAIN_NAMESPACE` | không | Tiền tố gắn vào mã lô khi ghi lên chain. Mỗi mã chỉ ghi được một lần trên một hợp đồng, nên khi nhiều máy dùng chung một hợp đồng, hoặc khi import lại database sạch mà vẫn dùng hợp đồng cũ, đặt một tên riêng (ví dụ `may_hoang_01`) để không bị báo "lô đã tồn tại". **Không đổi** khi database đã có dữ liệu đã ký. |
| `BLOCKCHAIN_CHI_LO_TU` | không | Ngày bắt đầu theo dõi trên blockchain (ví dụ `2026-11-01`). Lô tạo trước ngày này không đưa lên chain. Để trống = theo dõi mọi lô. |
| `BLOCKCHAIN_WORKER` | không | `0` = tắt tiến trình nền tự đối soát giao dịch; mặc định bật. |
| `BLOCKCHAIN_WORKER_GIAY` | không | Bao nhiêu giây tiến trình nền chạy một lần (mặc định 15). |
| `BLOCKCHAIN_WORKER_HET_HAN_PHUT` | không | Sau bao nhiêu phút một sự kiện chờ ký bị coi là hết hạn (mặc định 30). |
| `BLOCKCHAIN_WORKER_DOI_SOAT_GIAY` | không | Mỗi lô đang chờ ký được đọc lại từ chain tối đa bao lâu một lần (mặc định 120). |

> File `.env` chứa khóa riêng: **không gửi cho ai và không đưa lên git** (`.gitignore` đã bỏ qua file này). Nên dùng một ví riêng chỉ để thử nghiệm.

## 5. Biên dịch và deploy hợp đồng lên Monad Testnet

### 5.1. Chuẩn bị ví

1. Trong MetaMask, thêm mạng Monad Testnet (hoặc thêm nhanh qua https://chainlist.org/chain/10143):
   - Network name: `Monad Testnet`
   - RPC URL: `https://testnet-rpc.monad.xyz`
   - Chain ID: `10143`
   - Currency symbol: `MON`
   - Block explorer: `https://testnet.monadexplorer.com`
2. Lấy MON thử nghiệm (để trả phí gas) cho ví deploy tại faucet https://faucet.monad.xyz.
3. Lấy khóa riêng của ví deploy: MetaMask → chọn tài khoản → **⋮** → **Account details** → **Show private key**. Dán vào `PRIVATE_KEY` trong `.env`. Nếu chuỗi không có `0x` ở đầu thì thêm vào.

### 5.2. Biên dịch

```bash
cd blockchain
npx hardhat compile
```

Lần đầu Hardhat tự tải trình biên dịch Solidity 0.8.24. Biên dịch xong, kết quả nằm trong `blockchain/artifacts/`.

Có thể chạy thử hợp đồng trên mạng giả lập (không tốn MON):

```bash
npx hardhat run scripts/smoke.js
```

### 5.3. Deploy

Vẫn ở thư mục `blockchain`:

```bash
npx hardhat run scripts/deploy.js --network monadTestnet
```

Tên mạng phải viết đúng `monadTestnet` (chữ T hoa). Kết quả in ra dạng:

```
chainId: 10143 | ví deploy: 0xVíCủaBạn...
Đã deploy AgriChain tại: 0xĐỊA_CHỈ_HỢP_ĐỒNG
```

Địa chỉ cũng được ghi vào `blockchain/deployed-agrichain.json`:

```json
{
  "10143": "0xĐỊA_CHỈ_HỢP_ĐỒNG"
}
```

### 5.4. Gắn địa chỉ hợp đồng vào `.env`

Mở `.env` ở thư mục gốc, dán địa chỉ vừa nhận:

```env
BLOCKCHAIN_CONTRACT_ADDRESS=0xĐỊA_CHỈ_HỢP_ĐỒNG
```

Có thể xem hợp đồng trên trang explorer bằng cách tìm địa chỉ này.

Mỗi lần deploy lại sẽ ra một hợp đồng mới, trống dữ liệu. Phải cập nhật lại `BLOCKCHAIN_CONTRACT_ADDRESS` và khởi động lại server. Nếu database đã có sự kiện ký trên hợp đồng cũ thì nên import lại database sạch.

## 6. Chạy trang web

Mở **hai** terminal ở thư mục gốc `Agrichain`.

Terminal 1 – server (API, cổng 3000):

```bash
npm run dev
```

Thấy `Server đang chạy tại http://localhost:3000` và `Kết nối MySQL Pool thành công!` là được.

Terminal 2 – giao diện:

```bash
npm run ui
```

Mở đường dẫn Vite in ra (thường là http://localhost:5173) trong trình duyệt có MetaMask.

## 7. Cấu hình ví trên trang web

1. Đăng nhập `admin` / `123456`, mở mục **Ví blockchain**. Trang hiển thị ví admin của hợp đồng, chính là ví đã deploy ở bước 5. Trong MetaMask, chọn đúng ví này rồi bấm **Liên kết ví admin**, vì chỉ ví admin mới duyệt ví và gán vai trò được.
2. Mỗi tài khoản nghiệp vụ (nông dân, kiểm định, sơ chế, vận chuyển, phân phối, đại lý) đăng nhập, bấm **Liên kết ví MetaMask** và ký thông điệp xác nhận. Mỗi tài khoản nên dùng một ví MetaMask riêng.
3. Quay lại tài khoản `admin`, mục **Ví blockchain** → **Ví chờ duyệt**, bấm **Duyệt**. MetaMask hiện giao dịch gán vai trò (`setRole`), bấm xác nhận.
4. Từ đây, các bước nghiệp vụ cần ký sẽ hiện ở tab **Ký blockchain** của từng vai trò. Mọi ví ký đều cần một ít MON để trả phí gas.

## 8. Lệnh hay dùng

| Việc cần làm | Lệnh (chạy trong thư mục) |
|---|---|
| Chạy server | `npm run dev` (gốc) |
| Chạy giao diện | `npm run ui` (gốc) |
| Build giao diện | `npm run build` (gốc) |
| Biên dịch hợp đồng | `npx hardhat compile` (`blockchain`) |
| Chạy thử hợp đồng | `npx hardhat run scripts/smoke.js` (`blockchain`) |
| Deploy Monad Testnet | `npx hardhat run scripts/deploy.js --network monadTestnet` (`blockchain`) |
| Chuyển admin hợp đồng (PowerShell) | `$env:NEW_ADMIN="0xVíMới"; npx hardhat run scripts/transferAdmin.js --network monadTestnet` (`blockchain`) |

## 9. Lỗi thường gặp

| Lỗi | Cách xử lý |
|---|---|
| `Kết nối MySQL thất bại` | Chưa bật MySQL trong XAMPP, hoặc sai `DB_USER` / `DB_PASSWORD` / `DB_DATABASE`. |
| `Chưa có ví để deploy` | `PRIVATE_KEY` trống hoặc sai định dạng (phải là `0x` + 64 ký tự). |
| `insufficient funds` khi deploy hoặc ký | Ví chưa có MON, xin thêm ở faucet. |
| `ENOTFOUND testnet-rpc.monad.xyz` | Mạng không phân giải được tên miền RPC. Đổi `BLOCKCHAIN_RPC_URL` sang nút RPC khác. |
| Hardhat báo không tìm thấy network | Gõ sai tên mạng, phải là `monadTestnet` (chữ T hoa). |
| Giao diện báo chưa cấu hình blockchain | Thiếu `BLOCKCHAIN_CONTRACT_ADDRESS` hoặc `BLOCKCHAIN_CHAIN_ID` không khớp với mạng đã deploy. Sửa `.env` rồi chạy lại `npm run dev`. |
| Ký báo "lô đã tồn tại" | Mã lô đã được ghi trên hợp đồng này. Đặt `BLOCKCHAIN_NAMESPACE` mới (khi database còn sạch) hoặc deploy hợp đồng mới. |
| Giao diện không gọi được API | Server chưa chạy hoặc `PORT` khác 3000. |
