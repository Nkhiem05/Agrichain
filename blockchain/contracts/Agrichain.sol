// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AgriChain - neo hash sự kiện truy xuất nguồn gốc nông sản
/// @notice Chỉ lưu hash, không lưu dữ liệu thật (dữ liệu nằm trong MySQL).
///         Mỗi lô có một chuỗi hash nối tiếp: eventHash = keccak256(prevHash, payloadHash).
///         Mỗi sự kiện do đúng người (đúng vai trò, đúng người đang giữ lô) ký bằng ví của họ.
contract AgriChain {
    // Vai trò khớp nguoi_dung.vai_tro trong MySQL (ADMIN và CONSUMER không cần ví ký).
    enum Role { NONE, FARMER_COOP, PROCESSOR, TRANSPORTER, DISTRIBUTOR, CERT_AUTHORITY }

    // Mã loại sự kiện. PHẢI khớp server/services/blockchain/eventTypes.js
    uint8 public constant HARVEST_CONFIRMED = 1;
    uint8 public constant CERTIFICATE_ISSUED = 2;
    uint8 public constant CERTIFICATE_FAILED = 3;
    uint8 public constant CERTIFICATE_REVOKED = 4;
    uint8 public constant TRANSPORT_ORDERED = 5;
    uint8 public constant PICKUP_CONFIRMED = 6;
    uint8 public constant DELIVERY_CONFIRMED = 7;
    uint8 public constant STOCK_IN_CONFIRMED = 8;
    uint8 public constant HANDOVER_REJECTED = 9;
    uint8 public constant BATCH_RELATION = 10;
    uint8 public constant PROCESSING_DONE = 11;
    uint8 public constant PACKAGING_DONE = 12;
    uint8 public constant DISPATCHED = 13;
    uint8 public constant DELIVERED_TO_AGENT = 14;
    uint8 public constant SAMPLING_SEALED = 15;
    uint8 public constant COMPLETE_CONFIRMED = 16;

    // Trạng thái chứng nhận kiểm định của lô
    uint8 public constant CERT_NONE = 0;
    uint8 public constant CERT_PASSED = 1;
    uint8 public constant CERT_FAILED = 2;
    uint8 public constant CERT_REVOKED = 3;

    // Trạng thái lệnh bàn giao (vận chuyển) đang mở trên lô
    uint8 public constant ORDER_NONE = 0;
    uint8 public constant ORDER_CREATED = 1;   // đã tạo lệnh, chờ lấy hàng
    uint8 public constant ORDER_PICKED_UP = 2; // vận chuyển đã lấy hàng
    uint8 public constant ORDER_ARRIVED = 3;   // đã đến nơi, chờ bên nhận xác nhận

    struct Batch {
        bool exists;
        address owner;          // người đang giữ lô
        bytes32 lastHash;       // hash sự kiện mới nhất
        uint8 certState;
        uint64 certExpiry;      // 0 = không hết hạn
        address orderTransporter;
        address orderReceiver;  // address(0) nếu nơi nhận chưa có tài khoản
        uint8 orderStage;
    }

    address public admin;
    mapping(address => Role) public roleOf;
    mapping(bytes32 => Batch) public batches;

    event Recorded(
        bytes32 indexed batchId,
        uint8 indexed eventType,
        bytes32 prevHash,
        bytes32 eventHash,
        address indexed signer
    );
    // Dòng dõi: lô con được tạo từ lô nguồn nào, tại hash nào của lô nguồn (để đối chiếu ngoài chain)
    event Lineage(bytes32 indexed childId, bytes32 indexed sourceId, bytes32 sourceHash);
    event RoleSet(address indexed wallet, Role role);
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "chi admin");
        _;
    }

    // ---------------------------------------------------------------- quản trị

    /// @notice Admin gán vai trò cho ví (sau khi duyệt ví của người dùng trong hệ thống).
    function setRole(address wallet, Role role) external onlyAdmin {
        require(wallet != address(0), "dia chi rong");
        roleOf[wallet] = role;
        emit RoleSet(wallet, role);
    }

    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "dia chi rong");
        emit AdminChanged(admin, newAdmin);
        admin = newAdmin;
    }

    // ---------------------------------------------------------------- nông dân

    /// @notice Chốt lô thu hoạch. eventHash đã gồm hash snapshot mùa vụ và vật tư (tính ngoài chain).
    function harvest(bytes32 batchId, bytes32 eventHash) external {
        require(roleOf[msg.sender] == Role.FARMER_COOP, "chi nong dan");
        Batch storage b = batches[batchId];
        require(!b.exists, "lo da ton tai");
        b.exists = true;
        b.owner = msg.sender;
        b.lastHash = eventHash;
        emit Recorded(batchId, HARVEST_CONFIRMED, bytes32(0), eventHash, msg.sender);
    }

    // ------------------------------------------------------------ kiểm định

    /// @notice Cơ quan kiểm định ký: cấp, không đạt, thu hồi chứng nhận hoặc niêm phong mẫu.
    /// @param expiry thời điểm hết hạn (unix giây), chỉ dùng khi cấp chứng nhận; 0 = không hết hạn.
    function certify(
        bytes32 batchId,
        uint8 eventType,
        uint64 expiry,
        bytes32 prevHash,
        bytes32 eventHash
    ) external {
        require(roleOf[msg.sender] == Role.CERT_AUTHORITY, "chi co quan kiem dinh");
        Batch storage b = _batch(batchId);

        if (eventType == CERTIFICATE_ISSUED) {
            b.certState = CERT_PASSED;
            b.certExpiry = expiry;
        } else if (eventType == CERTIFICATE_FAILED) {
            b.certState = CERT_FAILED;
        } else if (eventType == CERTIFICATE_REVOKED) {
            b.certState = CERT_REVOKED;
        } else {
            require(eventType == SAMPLING_SEALED, "loai su kien khong hop le");
        }
        _link(batchId, b, eventType, prevHash, eventHash);
    }

    // ------------------------------------------------- bàn giao 3 bên (giao - vận chuyển - nhận)

    /// @notice Người đang giữ lô tạo lệnh bàn giao.
    ///         Nông dân chỉ gửi được lô có chứng nhận ĐẠT (không bị thu hồi), giống quy tắc của backend.
    ///         Hạn chứng nhận do backend kiểm tra theo giờ nghiệp vụ; contract không chặn theo hạn
    ///         để việc ký trễ không làm kẹt lô (xem isCertValid nếu muốn kiểm tra cả hạn).
    function orderTransport(
        bytes32 batchId,
        address transporter,
        address receiver,
        bytes32 prevHash,
        bytes32 eventHash
    ) external {
        Batch storage b = _batch(batchId);
        require(b.owner == msg.sender, "khong phai nguoi giu lo");
        Role r = roleOf[msg.sender];
        require(
            r == Role.FARMER_COOP || r == Role.PROCESSOR || r == Role.DISTRIBUTOR,
            "vai tro khong duoc gui hang"
        );
        require(b.orderStage == ORDER_NONE, "lo dang co lenh ban giao");
        if (r == Role.FARMER_COOP) {
            require(b.certState == CERT_PASSED, "chua co chung nhan dat");
        }
        require(roleOf[transporter] == Role.TRANSPORTER, "don vi van chuyen chua duoc duyet");
        if (receiver != address(0)) {
            Role rr = roleOf[receiver];
            require(rr == Role.PROCESSOR || rr == Role.DISTRIBUTOR, "ben nhan chua duoc duyet");
            require(receiver != msg.sender, "khong tu gui cho minh");
        }

        b.orderTransporter = transporter;
        b.orderReceiver = receiver;
        b.orderStage = ORDER_CREATED;
        _link(batchId, b, TRANSPORT_ORDERED, prevHash, eventHash);
    }

    function pickup(bytes32 batchId, bytes32 prevHash, bytes32 eventHash) external {
        Batch storage b = _batch(batchId);
        require(b.orderTransporter == msg.sender, "khong phai don vi van chuyen cua lenh");
        require(b.orderStage == ORDER_CREATED, "lenh khong o buoc cho lay hang");
        b.orderStage = ORDER_PICKED_UP;
        _link(batchId, b, PICKUP_CONFIRMED, prevHash, eventHash);
    }

    function arrive(bytes32 batchId, bytes32 prevHash, bytes32 eventHash) external {
        Batch storage b = _batch(batchId);
        require(b.orderTransporter == msg.sender, "khong phai don vi van chuyen cua lenh");
        require(b.orderStage == ORDER_PICKED_UP, "lenh khong o buoc dang van chuyen");
        b.orderStage = ORDER_ARRIVED;
        _link(batchId, b, DELIVERY_CONFIRMED, prevHash, eventHash);
    }

    /// @notice Bên nhận ký xác nhận: lô đổi chủ sang bên nhận.
    function confirmReceive(bytes32 batchId, bytes32 prevHash, bytes32 eventHash) external {
        Batch storage b = _batch(batchId);
        require(b.orderReceiver == msg.sender, "khong phai ben nhan cua lenh");
        require(b.orderStage == ORDER_ARRIVED, "hang chua den noi");
        b.owner = msg.sender;
        _clearOrder(b);
        _link(batchId, b, STOCK_IN_CONFIRMED, prevHash, eventHash);
    }

    /// @notice Hủy hoặc từ chối lệnh bàn giao:
    ///         chủ lô hủy hoặc vận chuyển từ chối (khi chưa lấy hàng), bên nhận từ chối (khi hàng đã đến).
    function rejectHandover(bytes32 batchId, bytes32 prevHash, bytes32 eventHash) external {
        Batch storage b = _batch(batchId);
        bool ownerCancels = msg.sender == b.owner && b.orderStage == ORDER_CREATED;
        bool transporterRejects = msg.sender == b.orderTransporter && b.orderStage == ORDER_CREATED;
        bool receiverRejects = msg.sender == b.orderReceiver && b.orderStage == ORDER_ARRIVED;
        require(ownerCancels || transporterRejects || receiverRejects, "khong the huy/tu choi o buoc nay");
        _clearOrder(b);
        _link(batchId, b, HANDOVER_REJECTED, prevHash, eventHash);
    }

    // ------------------------------------------------------------ sơ chế: lô con

    /// @notice Sơ chế/chia/gộp tạo ra lô mới từ một hoặc nhiều lô nguồn.
    ///         Người ký phải là người đang giữ mọi lô nguồn. Hash của lô nguồn tại thời điểm tạo
    ///         được phát ra qua event Lineage (và nằm trong eventHash) để đối chiếu ngoài chain.
    ///         Lô con chỉ kế thừa chứng nhận "đạt" khi mọi lô nguồn đều đạt (hạn = hạn sớm nhất).
    function createChild(
        bytes32 childId,
        bytes32[] calldata sources,
        bytes32[] calldata sourceHashes,
        bytes32 eventHash
    ) external {
        require(roleOf[msg.sender] == Role.PROCESSOR, "chi co so so che");
        require(sources.length > 0 && sources.length == sourceHashes.length, "danh sach lo nguon khong hop le");
        require(eventHash != bytes32(0), "event hash khong hop le");
        Batch storage c = batches[childId];
        require(!c.exists, "lo con da ton tai");

        bool allPassed = true;
        uint64 minExpiry = 0;
        for (uint256 i = 0; i < sources.length; i++) {
            Batch storage s = _batch(sources[i]);
            require(s.owner == msg.sender, "khong phai nguoi giu lo nguon");
            if (s.certState != CERT_PASSED) {
                allPassed = false;
            } else if (s.certExpiry != 0 && (minExpiry == 0 || s.certExpiry < minExpiry)) {
                minExpiry = s.certExpiry;
            }
            emit Lineage(childId, sources[i], sourceHashes[i]);
        }

        c.exists = true;
        c.owner = msg.sender;
        c.lastHash = eventHash;
        if (allPassed) {
            c.certState = CERT_PASSED;
            c.certExpiry = minExpiry;
        }
        emit Recorded(childId, BATCH_RELATION, bytes32(0), eventHash, msg.sender);
    }

    // -------------------------------------------- sự kiện thường của người đang giữ lô

    /// @notice Sơ chế xong / đóng gói xong (PROCESSOR), xuất kho / giao đại lý / hoàn tất (DISTRIBUTOR).
    function step(bytes32 batchId, uint8 eventType, bytes32 prevHash, bytes32 eventHash) external {
        Batch storage b = _batch(batchId);
        require(b.owner == msg.sender, "khong phai nguoi giu lo");
        require(b.orderStage == ORDER_NONE, "lo dang trong qua trinh ban giao");

        Role r = roleOf[msg.sender];
        if (eventType == PROCESSING_DONE || eventType == PACKAGING_DONE) {
            require(r == Role.PROCESSOR, "chi co so so che");
        } else if (
            eventType == DISPATCHED || eventType == DELIVERED_TO_AGENT || eventType == COMPLETE_CONFIRMED
        ) {
            require(r == Role.DISTRIBUTOR, "chi nha phan phoi");
        } else {
            revert("loai su kien khong hop le");
        }
        _link(batchId, b, eventType, prevHash, eventHash);
    }

    // ---------------------------------------------------------------- tra cứu

    function isCertValid(bytes32 batchId) public view returns (bool) {
        Batch storage b = batches[batchId];
        return b.certState == CERT_PASSED && (b.certExpiry == 0 || b.certExpiry >= block.timestamp);
    }

    // ---------------------------------------------------------------- nội bộ

    function _batch(bytes32 batchId) private view returns (Batch storage b) {
        b = batches[batchId];
        require(b.exists, "lo khong ton tai");
    }

    function _link(bytes32 batchId, Batch storage b, uint8 eventType, bytes32 prevHash, bytes32 eventHash) private {
        require(b.lastHash == prevHash, "prev hash sai");
        require(eventHash != bytes32(0) && eventHash != prevHash, "event hash khong hop le");
        b.lastHash = eventHash;
        emit Recorded(batchId, eventType, prevHash, eventHash, msg.sender);
    }

    function _clearOrder(Batch storage b) private {
        b.orderTransporter = address(0);
        b.orderReceiver = address(0);
        b.orderStage = ORDER_NONE;
    }
}
