// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AgriChain - neo hash sự kiện truy xuất nguồn gốc nông sản
/// @notice Chỉ lưu hash và trạng thái tối thiểu, dữ liệu thật nằm trong MySQL.
///         Mỗi lô có một chuỗi hash nối tiếp: eventHash = keccak256(prevHash, payloadHash) (tính ngoài chain).
///         Mỗi sự kiện do đúng người (đúng vai trò, đúng người đang giữ lô) ký bằng ví của họ.
///
///  Phiên bản 2 (so với bản đầu):
///   - Thêm vai trò ĐẠI LÝ (RETAILER): đại lý tự ký nhận hàng và đóng lô.
///   - Chứng nhận tách riêng theo mã hồ sơ kiểm định: chỉ cơ quan đã niêm phong mới được công bố / thu hồi.
///     Chủ lô phải ký xác nhận biên bản lấy mẫu trước khi công bố. Kết luận phải gắn bộ ngưỡng đã ghi.
///   - Lô lưu khối lượng (gram). Tạo lô con trừ khối lượng lô nguồn, lô nguồn hết hàng thì "đã dùng".
///   - Lệnh bàn giao bắt buộc có bên nhận, ghi khối lượng thực nhận, có bước trả hàng về.
///   - Khóa / mở ví, ghi phiên bản bảng ngưỡng, đính chính hồ sơ.
contract AgriChain {
    // Vai trò khớp nguoi_dung.vai_tro trong MySQL (ADMIN và CONSUMER không cần ví ký).
    enum Role { NONE, FARMER_COOP, PROCESSOR, TRANSPORTER, DISTRIBUTOR, CERT_AUTHORITY, RETAILER }

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
    uint8 public constant DISPATCHED = 13;          // không dùng nữa (giữ mã cho dữ liệu cũ)
    uint8 public constant DELIVERED_TO_AGENT = 14;  // không dùng nữa (giữ mã cho dữ liệu cũ)
    uint8 public constant SAMPLING_SEALED = 15;
    uint8 public constant COMPLETE_CONFIRMED = 16;
    uint8 public constant SAMPLING_CONFIRMED = 17;
    uint8 public constant RETURN_SHIPPED = 18;
    uint8 public constant RETURN_RECEIVED = 19;
    uint8 public constant CORRECTION = 20;

    // Trạng thái lô
    uint8 public constant BATCH_ACTIVE = 1;    // còn hàng, dùng được
    uint8 public constant BATCH_CONSUMED = 2;  // đã đem đi sơ chế / tách / gộp hết
    uint8 public constant BATCH_CLOSED = 3;    // đại lý đã bán hết

    // Trạng thái chứng nhận (theo từng hồ sơ kiểm định)
    uint8 public constant CERT_NONE = 0;
    uint8 public constant CERT_SEALED = 1;     // đã niêm phong mẫu, chờ công bố
    uint8 public constant CERT_PASSED = 2;
    uint8 public constant CERT_FAILED = 3;
    uint8 public constant CERT_REVOKED = 4;

    // Bước của lệnh bàn giao đang mở trên lô
    uint8 public constant ORDER_NONE = 0;
    uint8 public constant ORDER_CREATED = 1;   // đã tạo lệnh, chờ lấy hàng
    uint8 public constant ORDER_PICKED_UP = 2; // vận chuyển đã lấy hàng
    uint8 public constant ORDER_ARRIVED = 3;   // đã đến nơi, chờ bên nhận ký
    uint8 public constant ORDER_REJECTED = 4;  // bên nhận từ chối, hàng còn trên xe
    uint8 public constant ORDER_RETURNED = 5;  // vận chuyển đã chở hàng về, chờ bên gửi ký nhận lại

    uint256 public constant MAX_SOURCES = 10;  // tối đa lô nguồn khi tạo 1 lô con
    uint256 public constant MAX_CERTS = 20;    // tối đa chứng nhận (kể cả thừa hưởng) trên 1 lô

    struct Batch {
        bool exists;
        uint8 status;
        bool failed;            // từng bị kết luận KHÔNG ĐẠT -> chặn vĩnh viễn
        address owner;          // chủ hiện tại (chỉ đổi khi bên nhận ký nhận hàng)
        uint128 quantity;       // khối lượng hiện tại, đơn vị gram
        bytes32 productId;      // keccak256(mã sản phẩm)
        bytes32 lastHash;       // hash sự kiện mới nhất
        address orderTransporter;
        address orderReceiver;
        uint8 orderStage;
        uint128 orderQty;       // khối lượng gửi đi
        bytes32[] certIds;      // chứng nhận của lô + thừa hưởng từ lô nguồn
    }

    struct Cert {
        bool exists;
        uint8 state;
        bool ownerConfirmed;    // chủ lô đã ký biên bản lấy mẫu
        address issuer;         // ví cơ quan đã niêm phong (và là cơ quan duy nhất được công bố / thu hồi)
        address ownerAtSeal;    // chủ lô lúc lấy mẫu (người phải ký xác nhận)
        uint64 expiry;          // hạn hiệu lực (unix giây), 0 = không hết hạn
        bytes32 batchId;
        bytes32 threshold;      // hash bộ ngưỡng dùng để kết luận
    }

    address public admin;
    mapping(address => Role) public roleOf;
    mapping(address => bool) public isLocked;
    mapping(bytes32 => bool) public thresholds;
    mapping(bytes32 => Batch) private _batches;
    mapping(bytes32 => Cert) public certs;

    event Recorded(
        bytes32 indexed batchId,
        uint8 indexed eventType,
        bytes32 prevHash,
        bytes32 eventHash,
        address indexed signer
    );
    // Dòng dõi: lô con được tạo từ lô nguồn nào, lấy bao nhiêu gram, tại hash nào của lô nguồn
    event Lineage(bytes32 indexed childId, bytes32 indexed sourceId, bytes32 sourceHash, uint128 quantity);
    event CertChanged(bytes32 indexed certId, bytes32 indexed batchId, address indexed issuer, uint8 state);
    event RoleSet(address indexed wallet, Role role);
    event LockSet(address indexed wallet, bool locked);
    event ThresholdSet(bytes32 indexed thresholdHash);
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "chi admin");
        _;
    }

    // ---------------------------------------------------------------- quản trị

    /// @notice Admin gán vai trò cho ví (sau khi duyệt ví của người dùng trong hệ thống). Role.NONE = gỡ vai trò.
    function setRole(address wallet, Role role) external onlyAdmin {
        _setRole(wallet, role);
    }

    /// @notice Gán vai trò cho nhiều ví trong 1 lần ký.
    function setRoles(address[] calldata wallets, Role[] calldata roles) external onlyAdmin {
        require(wallets.length == roles.length, "danh sach khong khop");
        for (uint256 i = 0; i < wallets.length; i++) _setRole(wallets[i], roles[i]);
    }

    /// @notice Khóa / mở ví. Ví bị khóa không ký được sự kiện nào.
    function setLocked(address wallet, bool locked) external onlyAdmin {
        require(wallet != address(0), "dia chi rong");
        isLocked[wallet] = locked;
        emit LockSet(wallet, locked);
    }

    /// @notice Ghi hash một phiên bản bảng ngưỡng kiểm định (mỗi lần bảng ngưỡng thay đổi).
    function setThreshold(bytes32 thresholdHash) external onlyAdmin {
        require(thresholdHash != bytes32(0), "hash rong");
        thresholds[thresholdHash] = true;
        emit ThresholdSet(thresholdHash);
    }

    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "dia chi rong");
        emit AdminChanged(admin, newAdmin);
        admin = newAdmin;
    }

    // ---------------------------------------------------------------- nông dân

    /// @notice Chốt lô thu hoạch. eventHash đã gồm hash snapshot mùa vụ và vật tư (tính ngoài chain).
    function harvest(bytes32 batchId, bytes32 productId, uint128 quantity, bytes32 eventHash) external {
        _requireRole(Role.FARMER_COOP);
        require(quantity > 0, "khoi luong phai > 0");
        require(eventHash != bytes32(0), "event hash khong hop le");
        Batch storage b = _batches[batchId];
        require(!b.exists, "lo da ton tai");
        b.exists = true;
        b.status = BATCH_ACTIVE;
        b.owner = msg.sender;
        b.quantity = quantity;
        b.productId = productId;
        b.lastHash = eventHash;
        emit Recorded(batchId, HARVEST_CONFIRMED, bytes32(0), eventHash, msg.sender);
    }

    // ------------------------------------------------------------ kiểm định

    /// @notice Cơ quan kiểm định ký: niêm phong mẫu, công bố đạt / không đạt, thu hồi.
    /// @param certId keccak256(mã kiểm định) - mỗi hồ sơ một chứng nhận
    /// @param expiry hạn hiệu lực (unix giây), chỉ dùng khi công bố đạt; 0 = không hết hạn
    /// @param threshold hash bộ ngưỡng (đã ghi bằng setThreshold), bắt buộc khi công bố đạt / không đạt
    function certify(
        bytes32 batchId,
        bytes32 certId,
        uint8 eventType,
        uint64 expiry,
        bytes32 threshold,
        bytes32 prevHash,
        bytes32 eventHash
    ) external {
        _requireRole(Role.CERT_AUTHORITY);
        Batch storage b = _batch(batchId);
        Cert storage c = certs[certId];

        if (eventType == SAMPLING_SEALED) {
            require(!c.exists, "ho so kiem dinh da ton tai");
            require(b.status == BATCH_ACTIVE && b.orderStage == ORDER_NONE, "lo khong o trang thai lay mau duoc");
            c.exists = true;
            c.state = CERT_SEALED;
            c.issuer = msg.sender;
            c.ownerAtSeal = b.owner;
            c.batchId = batchId;
        } else {
            require(c.exists && c.batchId == batchId, "ho so kiem dinh khong ton tai");
            require(c.issuer == msg.sender, "chi co quan da niem phong / da cap");
            if (eventType == CERTIFICATE_ISSUED || eventType == CERTIFICATE_FAILED) {
                require(c.state == CERT_SEALED, "ho so khong o buoc cho cong bo");
                require(c.ownerConfirmed, "chu lo chua ky bien ban lay mau");
                require(thresholds[threshold], "bo nguong chua duoc ghi");
                c.threshold = threshold;
                if (eventType == CERTIFICATE_ISSUED) {
                    require(b.certIds.length < MAX_CERTS, "qua so chung nhan");
                    c.state = CERT_PASSED;
                    c.expiry = expiry;
                    b.certIds.push(certId);
                } else {
                    c.state = CERT_FAILED;
                    b.failed = true;
                }
            } else if (eventType == CERTIFICATE_REVOKED) {
                require(c.state == CERT_PASSED, "chung nhan khong o trang thai dat");
                c.state = CERT_REVOKED; // mọi lô con trỏ tới chứng nhận này tự mất hiệu lực
            } else {
                revert("loai su kien khong hop le");
            }
        }
        emit CertChanged(certId, batchId, c.issuer, c.state);
        _link(batchId, b, eventType, prevHash, eventHash);
    }

    /// @notice Chủ lô (lúc lấy mẫu) ký xác nhận biên bản lấy mẫu đúng lô của mình.
    function confirmSampling(bytes32 batchId, bytes32 certId, bytes32 prevHash, bytes32 eventHash) external {
        _requireActive();
        Batch storage b = _batch(batchId);
        Cert storage c = certs[certId];
        require(c.exists && c.batchId == batchId, "ho so kiem dinh khong ton tai");
        require(c.ownerAtSeal == msg.sender, "chi chu lo luc lay mau duoc ky");
        require(c.state == CERT_SEALED && !c.ownerConfirmed, "khong o buoc xac nhan lay mau");
        c.ownerConfirmed = true;
        _link(batchId, b, SAMPLING_CONFIRMED, prevHash, eventHash);
    }

    // ------------------------------------------------- bàn giao (gửi - vận chuyển - nhận)

    /// @notice Người đang giữ lô tạo lệnh bàn giao. Bên nhận BẮT BUỘC có ví.
    ///         Chặng hợp lệ: nông dân -> sơ chế / phân phối; sơ chế -> phân phối; phân phối -> đại lý.
    ///         transporter = ví đơn vị vận chuyển, hoặc chính bên gửi nếu tự giao.
    ///         Hạn chứng nhận do backend kiểm tra theo giờ nghiệp vụ; contract chỉ chặn chứng nhận
    ///         không đạt / bị thu hồi để việc ký trễ không làm kẹt lô.
    function orderTransport(
        bytes32 batchId,
        address transporter,
        address receiver,
        bytes32 prevHash,
        bytes32 eventHash
    ) external {
        _requireActive();
        Batch storage b = _batch(batchId);
        require(b.owner == msg.sender, "khong phai nguoi giu lo");
        require(b.status == BATCH_ACTIVE, "lo khong con hang");
        require(b.orderStage == ORDER_NONE, "lo dang co lenh ban giao");
        require(_certOk(b), "lo chua co chung nhan dat");

        require(receiver != address(0) && receiver != msg.sender, "ben nhan khong hop le");
        require(_active(receiver), "ben nhan chua duoc duyet hoac bi khoa");
        require(_routeOk(roleOf[msg.sender], roleOf[receiver]), "chang van chuyen khong hop le");
        require(
            transporter == msg.sender || (_active(transporter) && roleOf[transporter] == Role.TRANSPORTER),
            "don vi van chuyen chua duoc duyet"
        );

        b.orderTransporter = transporter;
        b.orderReceiver = receiver;
        b.orderStage = ORDER_CREATED;
        b.orderQty = b.quantity;
        _link(batchId, b, TRANSPORT_ORDERED, prevHash, eventHash);
    }

    function pickup(bytes32 batchId, bytes32 prevHash, bytes32 eventHash) external {
        _requireActive();
        Batch storage b = _batch(batchId);
        require(b.orderTransporter == msg.sender, "khong phai don vi van chuyen cua lenh");
        require(b.orderStage == ORDER_CREATED, "lenh khong o buoc cho lay hang");
        b.orderStage = ORDER_PICKED_UP;
        _link(batchId, b, PICKUP_CONFIRMED, prevHash, eventHash);
    }

    function arrive(bytes32 batchId, bytes32 prevHash, bytes32 eventHash) external {
        _requireActive();
        Batch storage b = _batch(batchId);
        require(b.orderTransporter == msg.sender, "khong phai don vi van chuyen cua lenh");
        require(b.orderStage == ORDER_PICKED_UP, "lenh khong o buoc dang van chuyen");
        b.orderStage = ORDER_ARRIVED;
        _link(batchId, b, DELIVERY_CONFIRMED, prevHash, eventHash);
    }

    /// @notice Bên nhận ký nhận hàng kèm khối lượng thực nhận (<= khối lượng gửi). Lô đổi chủ tại đây.
    function confirmReceive(bytes32 batchId, uint128 receivedQty, bytes32 prevHash, bytes32 eventHash) external {
        _requireActive();
        Batch storage b = _batch(batchId);
        require(b.orderReceiver == msg.sender, "khong phai ben nhan cua lenh");
        require(b.orderStage == ORDER_ARRIVED, "hang chua den noi");
        require(receivedQty > 0 && receivedQty <= b.orderQty, "khoi luong nhan khong hop le");
        b.owner = msg.sender;
        b.quantity = receivedQty; // hao hụt = orderQty - receivedQty
        _clearOrder(b);
        _link(batchId, b, STOCK_IN_CONFIRMED, prevHash, eventHash);
    }

    /// @notice Hủy hoặc từ chối lệnh bàn giao:
    ///         - chủ lô hủy / vận chuyển từ chối khi chưa lấy hàng -> lệnh bị xóa, lô ở lại bên gửi;
    ///         - bên nhận từ chối khi hàng đã đến -> hàng còn trên xe, chờ vận chuyển chở trả về.
    function rejectHandover(bytes32 batchId, bytes32 prevHash, bytes32 eventHash) external {
        _requireActive();
        Batch storage b = _batch(batchId);
        bool ownerCancels = msg.sender == b.owner && b.orderStage == ORDER_CREATED;
        bool transporterRejects = msg.sender == b.orderTransporter && b.orderStage == ORDER_CREATED;
        bool receiverRejects = msg.sender == b.orderReceiver && b.orderStage == ORDER_ARRIVED;
        require(ownerCancels || transporterRejects || receiverRejects, "khong the huy/tu choi o buoc nay");
        if (receiverRejects) {
            b.orderStage = ORDER_REJECTED;
        } else {
            _clearOrder(b);
        }
        _link(batchId, b, HANDOVER_REJECTED, prevHash, eventHash);
    }

    /// @notice Vận chuyển ký: đã chở hàng bị từ chối về tới bên gửi.
    function returnShip(bytes32 batchId, bytes32 prevHash, bytes32 eventHash) external {
        _requireActive();
        Batch storage b = _batch(batchId);
        require(b.orderTransporter == msg.sender, "khong phai don vi van chuyen cua lenh");
        require(b.orderStage == ORDER_REJECTED, "lenh khong bi tu choi");
        b.orderStage = ORDER_RETURNED;
        _link(batchId, b, RETURN_SHIPPED, prevHash, eventHash);
    }

    /// @notice Bên gửi ký: đã nhận lại hàng. Lô trở lại dùng được ở bên gửi.
    function returnReceive(bytes32 batchId, bytes32 prevHash, bytes32 eventHash) external {
        _requireActive();
        Batch storage b = _batch(batchId);
        require(b.owner == msg.sender, "khong phai ben gui");
        require(b.orderStage == ORDER_RETURNED, "van chuyen chua ky tra hang");
        _clearOrder(b);
        _link(batchId, b, RETURN_RECEIVED, prevHash, eventHash);
    }

    // ------------------------------------------------- sơ chế / tách / gộp: lô con

    /// @notice Tạo lô mới từ một hoặc nhiều lô nguồn (sơ chế, tách, gộp).
    ///         - Người ký là chủ và đang giữ mọi lô nguồn; lô nguồn còn hàng, không trong lệnh bàn giao,
    ///           chứng nhận còn đạt (không bị thu hồi / không đạt).
    ///         - Lấy sourceQty[i] gram từ lô nguồn i; lô nguồn về 0 thì "đã dùng" (chặn dùng 2 lần).
    ///         - childQty <= tổng lượng lấy (cho phép hao hụt khi sơ chế).
    ///         - Gộp nhiều lô: các lô nguồn phải cùng sản phẩm.
    ///         - Lô con thừa hưởng toàn bộ chứng nhận của lô nguồn (thu hồi gốc thì lô con mất hiệu lực).
    ///         Tách 1 lô thành nhiều lô con = gọi nhiều lần, mỗi lần lấy một phần.
    function createChild(
        bytes32 childId,
        bytes32[] calldata sources,
        bytes32[] calldata sourceHashes,
        uint128[] calldata sourceQty,
        uint128 childQty,
        bytes32 productId,
        bytes32 eventHash
    ) external {
        _requireActive();
        Role r = roleOf[msg.sender];
        require(r == Role.PROCESSOR || r == Role.DISTRIBUTOR, "chi co so so che / nha phan phoi");
        require(
            sources.length > 0 && sources.length <= MAX_SOURCES &&
                sources.length == sourceHashes.length && sources.length == sourceQty.length,
            "danh sach lo nguon khong hop le"
        );
        require(eventHash != bytes32(0), "event hash khong hop le");
        Batch storage c = _batches[childId];
        require(!c.exists, "lo con da ton tai");

        uint256 tong = 0;
        for (uint256 i = 0; i < sources.length; i++) {
            for (uint256 j = 0; j < i; j++) require(sources[j] != sources[i], "lo nguon bi trung");
            Batch storage s = _batch(sources[i]);
            require(s.owner == msg.sender, "khong phai nguoi giu lo nguon");
            require(s.status == BATCH_ACTIVE && s.orderStage == ORDER_NONE, "lo nguon khong dung duoc");
            require(_certOk(s), "lo nguon chua co chung nhan dat");
            require(sourceQty[i] > 0 && sourceQty[i] <= s.quantity, "khoi luong lay tu lo nguon khong hop le");
            if (sources.length > 1) require(s.productId == _batches[sources[0]].productId, "chi gop cac lo cung san pham");

            s.quantity -= sourceQty[i];
            if (s.quantity == 0) s.status = BATCH_CONSUMED;
            tong += sourceQty[i];

            for (uint256 k = 0; k < s.certIds.length; k++) {
                if (!_hasCert(c, s.certIds[k])) c.certIds.push(s.certIds[k]);
            }
            emit Lineage(childId, sources[i], sourceHashes[i], sourceQty[i]);
        }
        require(c.certIds.length <= MAX_CERTS, "qua so chung nhan");
        require(childQty > 0 && childQty <= tong, "khoi luong lo con khong hop le");

        c.exists = true;
        c.status = BATCH_ACTIVE;
        c.owner = msg.sender;
        c.quantity = childQty;
        c.productId = productId;
        c.lastHash = eventHash;
        emit Recorded(childId, BATCH_RELATION, bytes32(0), eventHash, msg.sender);
    }

    // -------------------------------------------- sự kiện thường của người đang giữ lô

    /// @notice Sơ chế xong / đóng gói xong (sơ chế), đóng lô khi bán hết (đại lý).
    function step(bytes32 batchId, uint8 eventType, bytes32 prevHash, bytes32 eventHash) external {
        _requireActive();
        Batch storage b = _batch(batchId);
        require(b.owner == msg.sender, "khong phai nguoi giu lo");
        require(b.status == BATCH_ACTIVE && b.orderStage == ORDER_NONE, "lo khong o trang thai nay");

        Role r = roleOf[msg.sender];
        if (eventType == PROCESSING_DONE || eventType == PACKAGING_DONE) {
            require(r == Role.PROCESSOR, "chi co so so che");
        } else if (eventType == COMPLETE_CONFIRMED) {
            require(r == Role.RETAILER, "chi dai ly");
            b.status = BATCH_CLOSED;
        } else {
            revert("loai su kien khong hop le");
        }
        _link(batchId, b, eventType, prevHash, eventHash);
    }

    /// @notice Đính chính: hồ sơ đã ký thì không sửa đè, ghi bản đính chính nối vào chuỗi của lô
    ///         (nội dung đính chính + sự kiện gốc nằm trong payload, đã được băm vào eventHash).
    function correct(bytes32 batchId, bytes32 prevHash, bytes32 eventHash) external {
        _requireActive();
        Batch storage b = _batch(batchId);
        _link(batchId, b, CORRECTION, prevHash, eventHash);
    }

    // ---------------------------------------------------------------- tra cứu

    function getBatch(bytes32 batchId)
        external
        view
        returns (
            bool exists,
            uint8 status,
            bool failed,
            address owner,
            uint128 quantity,
            bytes32 productId,
            bytes32 lastHash,
            address orderTransporter,
            address orderReceiver,
            uint8 orderStage,
            uint128 orderQty,
            uint256 certCount
        )
    {
        Batch storage b = _batches[batchId];
        return (
            b.exists, b.status, b.failed, b.owner, b.quantity, b.productId, b.lastHash,
            b.orderTransporter, b.orderReceiver, b.orderStage, b.orderQty, b.certIds.length
        );
    }

    function getBatchCerts(bytes32 batchId) external view returns (bytes32[] memory) {
        return _batches[batchId].certIds;
    }

    /// @notice Lô có chứng nhận đạt, chưa bị thu hồi và còn hạn (tính theo giờ của block).
    function isCertValid(bytes32 batchId) public view returns (bool) {
        Batch storage b = _batches[batchId];
        if (!_certOk(b)) return false;
        for (uint256 i = 0; i < b.certIds.length; i++) {
            uint64 exp = certs[b.certIds[i]].expiry;
            if (exp != 0 && exp < block.timestamp) return false;
        }
        return true;
    }

    // ---------------------------------------------------------------- nội bộ

    function _setRole(address wallet, Role role) private {
        require(wallet != address(0), "dia chi rong");
        roleOf[wallet] = role;
        emit RoleSet(wallet, role);
    }

    function _active(address wallet) private view returns (bool) {
        return roleOf[wallet] != Role.NONE && !isLocked[wallet];
    }

    function _requireActive() private view {
        require(_active(msg.sender), "vi chua duoc duyet hoac bi khoa");
    }

    function _requireRole(Role role) private view {
        require(roleOf[msg.sender] == role, "sai vai tro");
        require(!isLocked[msg.sender], "vi bi khoa");
    }

    function _routeOk(Role from, Role to) private pure returns (bool) {
        return
            (from == Role.FARMER_COOP && (to == Role.PROCESSOR || to == Role.DISTRIBUTOR)) ||
            (from == Role.PROCESSOR && to == Role.DISTRIBUTOR) ||
            (from == Role.DISTRIBUTOR && to == Role.RETAILER);
    }

    /// Chứng nhận "đạt" về trạng thái: có ít nhất 1, tất cả đều PASSED, lô chưa từng KHÔNG ĐẠT (không xét hạn)
    function _certOk(Batch storage b) private view returns (bool) {
        if (b.failed || b.certIds.length == 0) return false;
        for (uint256 i = 0; i < b.certIds.length; i++) {
            if (certs[b.certIds[i]].state != CERT_PASSED) return false;
        }
        return true;
    }

    function _hasCert(Batch storage b, bytes32 certId) private view returns (bool) {
        for (uint256 i = 0; i < b.certIds.length; i++) if (b.certIds[i] == certId) return true;
        return false;
    }

    function _batch(bytes32 batchId) private view returns (Batch storage b) {
        b = _batches[batchId];
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
        b.orderQty = 0;
    }
}
