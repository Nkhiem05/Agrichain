// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Nhật ký on-chain: ai cũng ghi được, đã ghi thì không sửa/xóa được.
contract NhatKy {
    struct Muc {
        address nguoiGhi;
        uint256 thoiGian;
        string noiDung;
    }

    Muc[] public cacMuc;

    event DaGhi(uint256 indexed stt, address indexed nguoiGhi, string noiDung);

    function ghi(string calldata noiDung) external {
        cacMuc.push(Muc(msg.sender, block.timestamp, noiDung));
        emit DaGhi(cacMuc.length - 1, msg.sender, noiDung);
    }

    function soMuc() external view returns (uint256) {
        return cacMuc.length;
    }
}