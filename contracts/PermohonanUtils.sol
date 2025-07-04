// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

library PermohonanUtils {
    function hapusByStatus(uint256[] storage daftar, uint256 _id) internal {
        for (uint256 i = 0; i < daftar.length; i++) {
            if (daftar[i] == _id) {
                daftar[i] = daftar[daftar.length - 1];
                daftar.pop();
                break;
            }
        }
    }
}
