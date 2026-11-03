// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract NotarialDocumentRegistry {
    struct Version {
        bytes32 fileHash;
        uint64 timestamp;
        address registeredBy;
    }

    mapping(bytes32 => Version[]) private versions;
    mapping(bytes32 => address) public registrars;

    event DocumentRegistered(
        bytes32 indexed publicId,
        bytes32 indexed fileHash,
        uint256 version,
        address indexed registrar,
        uint64 timestamp
    );

    error InvalidPublicId();
    error InvalidFileHash();
    error AlreadyRegistered();
    error NotDocumentRegistrar();

    function registerDocument(bytes32 publicId, bytes32 fileHash) external {
        if (publicId == bytes32(0)) revert InvalidPublicId();
        if (fileHash == bytes32(0)) revert InvalidFileHash();
        if (versions[publicId].length != 0) revert AlreadyRegistered();
        registrars[publicId] = msg.sender;
        _appendVersion(publicId, fileHash);
    }

    function addVersion(bytes32 publicId, bytes32 fileHash) external {
        if (fileHash == bytes32(0)) revert InvalidFileHash();
        if (registrars[publicId] == address(0)) revert InvalidPublicId();
        if (registrars[publicId] != msg.sender) revert NotDocumentRegistrar();
        _appendVersion(publicId, fileHash);
    }

    function getVersions(bytes32 publicId) external view returns (Version[] memory) {
        return versions[publicId];
    }

    function _appendVersion(bytes32 publicId, bytes32 fileHash) private {
        uint64 timestamp = uint64(block.timestamp);
        versions[publicId].push(Version(fileHash, timestamp, msg.sender));
        emit DocumentRegistered(publicId, fileHash, versions[publicId].length, msg.sender, timestamp);
    }
}
