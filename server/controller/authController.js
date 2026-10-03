const db = require("../../server/config/db");
const bcrypt = require("bcryptjs");

const login = (req, res) => {
    const { ten_dang_nhap, mat_khau } = req.body;

    if (!ten_dang_nhap || !mat_khau) {
        return res.status(400).json({
            success: false,
            message: "Vui lòng nhập tên đăng nhập và mật khẩu"
        });
    }

    const sql = `
        SELECT *
        FROM nguoi_dung
        WHERE ten_dang_nhap = ?
        LIMIT 1
    `;

    db.query(sql, [ten_dang_nhap], async (err, results) => {
        if (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                message: "Lỗi server"
            });
        }

        if (results.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Tên đăng nhập hoặc mật khẩu không đúng"
            });
        }

        const user = results[0];

        if (user.trang_thai !== 1) {
            return res.status(403).json({
                success: false,
                message: "Tài khoản đã bị khóa"
            });
        }

        try {
            let hash = user.mat_khau;

            // Hash trong file SQL của bạn đang có tiền tố $2y$
            if (hash && hash.startsWith("$2y$")) {
                hash = "$2b$" + hash.substring(4);
            }

            const passwordDung = await bcrypt.compare(mat_khau, hash);

            if (!passwordDung) {
                return res.status(401).json({
                    success: false,
                    message: "Tên đăng nhập hoặc mật khẩu không đúng"
                });
            }

            return res.json({
                success: true,
                message: "Đăng nhập thành công",
                user: {
                    ma_nguoi_dung: user.ma_nguoi_dung,
                    ho_ten: user.ho_ten,
                    ten_dang_nhap: user.ten_dang_nhap,
                    vai_tro: user.vai_tro,
                    so_dien_thoai: user.so_dien_thoai
                }
            });

        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Lỗi kiểm tra mật khẩu"
            });
        }
    });
};

module.exports = {
    login
};