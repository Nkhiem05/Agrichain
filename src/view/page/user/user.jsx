import React, { useState, useRef, useEffect } from "react";
import {
  Sprout,
  Scissors,
  Award,
  Package,
  Store,
  QrCode,
  Scan,
  Camera,
  Image as ImageIcon,
  X,
  FileCheck,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { useNavigate } from "react-router-dom";
import "../../css/user.css";

const TraceScannerView = ({ batchCode, setBatchCode, onNavigateToDetail }) => {
  const navigate = useNavigate();
  const [internalBatchCode, setInternalBatchCode] = useState("");
  const currentBatchCode = batchCode !== undefined ? batchCode : internalBatchCode;
  const handleSetBatchCode = setBatchCode || setInternalBatchCode;

  const goToDetail = (code) => {
    if (onNavigateToDetail) {
      onNavigateToDetail(code);
    } else if (code && code.trim()) {
      navigate(`/chi-tiet-user?malohang=${encodeURIComponent(code.trim())}`);
    }
  };
  const [scanMode, setScanMode] = useState("camera"); // "camera" | "gallery"
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isScanningFile, setIsScanningFile] = useState(false);

  const fileInputRef = useRef(null);
  const html5QrCodeScannerRef = useRef(null);

  // Hàm kiểm tra xem chuỗi có phải là link web hợp lệ hay không
  const isValidUrl = (text) => {
    try {
      const url = new URL(text.trim());
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      // Dự phòng trường hợp URL không có tiền tố http/https (như www.domain.com)
      return /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?\$/i.test(
        text.trim(),
      );
    }
  };

  // Chuẩn hóa URL nếu thiếu tiền tố giao thức
  const formatUrl = (text) => {
    const trimmed = text.trim();
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

  // Xử lý sau khi giải mã QR thành công (cả camera lẫn ảnh)
  const handleScanSuccess = (decodedText) => {
    stopCamera();
    setShowScannerModal(false);

    const rawContent = decodedText.trim();

    // Kiểm tra nếu là URL hợp lệ thì tự động mở web
    if (isValidUrl(rawContent)) {
      const targetUrl = formatUrl(rawContent);
      window.open(targetUrl, "_blank", "noopener,noreferrer");
      return;
    }

    // Nếu không phải URL web, xử lý tra cứu mã lô bình thường
    handleSetBatchCode(rawContent);
    goToDetail(rawContent);
  };

  // Dừng camera và dọn dẹp bộ nhớ
  const stopCamera = async () => {
    if (html5QrCodeScannerRef.current) {
      try {
        if (html5QrCodeScannerRef.current.isScanning) {
          await html5QrCodeScannerRef.current.stop();
        }
        html5QrCodeScannerRef.current.clear();
      } catch (err) {
        console.error("Lỗi khi tắt camera:", err);
      }
      html5QrCodeScannerRef.current = null;
    }
  };

  // Kích hoạt camera khi mở modal
  useEffect(() => {
    if (showScannerModal) {
      setErrorMessage("");
      const scanner = new Html5Qrcode("reader");
      html5QrCodeScannerRef.current = scanner;

      scanner
        .start(
          { facingMode: "environment" }, // Ưu tiên camera sau trên thiết bị di động
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
          },
          (decodedText) => {
            handleScanSuccess(decodedText);
          },
          () => {
            // Callback quét từng khung hình (bỏ qua để tối ưu hiệu năng)
          },
        )
        .catch((err) => {
          console.error("Lỗi truy cập camera:", err);
          setErrorMessage(
            "Không thể truy cập camera. Vui lòng cấp quyền máy ảnh hoặc chọn ảnh từ máy.",
          );
        });
    }

    return () => {
      stopCamera();
    };
  }, [showScannerModal]);

  // Quét giải mã QR từ file ảnh
  const handleScanFromFile = async (file) => {
    if (!file) return;
    setIsScanningFile(true);
    setErrorMessage("");

    try {
      const html5QrCode = new Html5Qrcode("hidden-file-scanner");
      const decodedText = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();
      handleScanSuccess(decodedText);
    } catch (err) {
      console.error("Lỗi đọc mã từ ảnh:", err);
      setErrorMessage(
        "Không tìm thấy hoặc không đọc được mã QR trong ảnh này.",
      );
    } finally {
      setIsScanningFile(false);
    }
  };

  // Xử lý khi nhấn nút Quét
  const handleTriggerScan = () => {
    setErrorMessage("");
    if (scanMode === "camera") {
      setShowScannerModal(true);
    } else {
      if (selectedImage) {
        handleScanFromFile(selectedImage);
      } else {
        fileInputRef.current?.click();
      }
    }
  };

  // Khi chọn file ảnh từ máy
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setErrorMessage("");
    }
  };

  // Gỡ bỏ file ảnh đã chọn
  const handleRemoveImage = () => {
    setSelectedImage(null);
    setErrorMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <>
      {/* Khối ẩn phục vụ giải mã file ảnh */}
      <div id="hidden-file-scanner" style={{ display: "none" }}></div>

      <div className="landing-container">
        {/* CỘT TRÁI: QUY TRÌNH CHUẨN */}
        <div className="timeline-box">
          <h1 className="scanner-heading">
            Quy Trình Chuẩn Hóa Chuỗi Cung Ứng
          </h1>
          <p className="scanner-subheading">
            Mỗi mắt xích đều ký số điện tử để xác nhận dữ liệu độc lập trên
            Smart Contract.
          </p>

          <div className="timeline-vertical">
            <div className="timeline-step">
              <span className="timeline-step-dot dot-green"></span>
              <div className="timeline-step-title">
                1. <Sprout size={16} color="#16a34a" /> Gieo Trồng & Quản Lý
                Canh Tác
              </div>
              <p className="timeline-step-desc">
                Lập nhật ký bón phân, tưới tiêu và chi tiết hoạt chất BVTV theo
                chuẩn an toàn sinh học.
              </p>
            </div>

            <div className="timeline-step">
              <span className="timeline-step-dot dot-green"></span>
              <div className="timeline-step-title">
                <Scissors size={16} color="#16a34a" /> 2. Thu Hoạch & Cách Ly An
                Toàn
              </div>
              <p className="timeline-step-desc">
                Đảm bảo thời gian cách ly hoạt chất và niêm phong lô quả trước
                khi xuất vườn.
              </p>
            </div>

            <div className="timeline-step">
              <span className="timeline-step-dot dot-purple"></span>
              <div className="timeline-step-title">
                <Award size={16} color="#9333ea" /> 3. Kiểm Định & Giám Định
                Chất Lượng
              </div>
              <p className="timeline-step-desc">
                Đơn vị độc lập kiểm tra dư lượng hóa chất, vi sinh và công bố mã
                giấy chứng nhận.
              </p>
            </div>

            <div className="timeline-step">
              <span className="timeline-step-dot dot-blue"></span>
              <div className="timeline-step-title">
                <Package size={16} color="#2563eb" /> 4. Sơ Chế, Khử Trùng &
                Đóng Gói
              </div>
              <p className="timeline-step-desc">
                Khử khuẩn sục ozon, sấy khô nhiệt độ chuẩn và gắn tem mã hóa QR
                truy xuất.
              </p>
            </div>

            <div className="timeline-step">
              <span className="timeline-step-dot dot-amber"></span>
              <div className="timeline-step-title">
                <Store size={16} color="#d97706" /> 5. Vận Chuyển Chuỗi Lạnh &
                Phân Phối
              </div>
              <p className="timeline-step-desc">
                Giám sát nhiệt độ xe tải lạnh suốt hành trình trước khi chuyển
                giao đến tay người tiêu dùng.
              </p>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: QUÉT QR & NHẬP MÃ */}
        <div className="qr-box">
          <div className="scanner-icon-wrap">
            <Scan size={38} />
          </div>
          <h3 className="qr-box-title">Kiểm Tra Tem Nông Sản</h3>
          <p className="qr-box-subtitle">
            Hỗ trợ mở link tự động hoặc tra cứu thông tin tem QR nông sản.
          </p>

          {/* CHỌN PHƯƠNG THỨC */}
          <div className="scan-mode-tabs">
            <button
              type="button"
              className={`scan-tab-btn ${scanMode === "camera" ? "active" : ""}`}
              onClick={() => {
                setScanMode("camera");
                setSelectedImage(null);
                setErrorMessage("");
              }}
            >
              <Camera size={16} /> Quét Camera
            </button>
            <button
              type="button"
              className={`scan-tab-btn ${scanMode === "gallery" ? "active" : ""}`}
              onClick={() => {
                setScanMode("gallery");
                setErrorMessage("");
              }}
            >
              <ImageIcon size={16} /> Chọn từ thư viện
            </button>
          </div>

          {/* Input file ẩn phục vụ chọn ảnh */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />

          {/* Hiển thị tệp ảnh đã chọn nếu ở chế độ gallery */}
          {scanMode === "gallery" && selectedImage && (
            <div className="selected-file-preview">
              <div className="preview-info">
                <FileCheck size={16} color="#10b981" />
                <span>{selectedImage.name}</span>
              </div>
              <button
                type="button"
                className="btn-remove-file"
                onClick={handleRemoveImage}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Thông báo lỗi nếu có */}
          {errorMessage && (
            <div
              className="scanner-error-msg"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                justifyContent: "center",
              }}
            >
              <AlertCircle size={15} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* NÚT THỰC HIỆN QUÉT */}
          <button
            type="button"
            className="btn-scan-primary"
            onClick={handleTriggerScan}
            disabled={isScanningFile}
          >
            {isScanningFile ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Đang Phân Tích
                Ảnh...
              </>
            ) : (
              <>
                <QrCode size={18} />
                {scanMode === "camera"
                  ? "Bật Camera Quét Mã"
                  : selectedImage
                    ? "Bắt Đầu Nhận Diện Mã QR"
                    : "Chọn Ảnh Từ Thư Mục"}
              </>
            )}
          </button>

          <div className="manual-input-wrap">
            <span className="manual-input-label">Hoặc tra cứu bằng mã</span>
            <div className="manual-input-row">
              <input
                type="text"
                value={currentBatchCode}
                onChange={(e) => handleSetBatchCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    goToDetail(currentBatchCode);
                  }
                }}
                placeholder="Nhập mã truy xuất..."
                className="input-batch-code"
              />
              <button
                type="button"
                className="btn-search-code"
                onClick={() => goToDetail(currentBatchCode)}
              >
                Tra cứu
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL QUÉT CAMERA THẬT */}
      {showScannerModal && (
        <div className="scanner-modal-backdrop">
          <div className="scanner-modal-header">
            <span>Hướng camera vào mã QR</span>
            <button
              type="button"
              className="btn-close-modal"
              onClick={() => {
                stopCamera();
                setShowScannerModal(false);
              }}
            >
              <X size={20} />
            </button>
          </div>

          <div className="scanner-camera-container">
            <div id="reader"></div>
          </div>

          {errorMessage && (
            <div className="scanner-error-msg">{errorMessage}</div>
          )}

          <p style={{ fontSize: "13px", opacity: 0.8, textAlign: "center" }}>
            Giữ mã QR nằm trong vùng quét để hệ thống nhận diện tự động.
          </p>
        </div>
      )}
    </>
  );
};

export default TraceScannerView;
