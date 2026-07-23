// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract FlowMark {
    uint8 public constant BUILD = 0;
    uint8 public constant STUDY = 1;
    uint8 public constant READ = 2;
    uint8 public constant PLAN = 3;
    uint8 public constant PRACTICE = 4;
    uint8 public constant RESET = 5;
    uint8 public constant MODE_COUNT = 6;

    string public constant name = "FlowMark";
    string public constant version = "1.0.0";

    struct Profile {
        uint64 totalSessions;
        uint64 totalMinutes;
        uint64 lastMarkedAt;
        uint64 checkInCount;
        uint64 checkInStreak;
        uint64 lastCheckInDay;
        uint16 lastMinutes;
        uint8 lastMode;
        mapping(uint8 => uint64) sessionsByMode;
        mapping(uint8 => uint64) minutesByMode;
    }

    mapping(address => Profile) private profiles;
    uint64 public globalSessions;
    uint64 public globalMinutes;
    uint64 public globalCheckIns;

    event FocusMarked(
        address indexed user,
        uint8 indexed mode,
        uint16 minutesAmount,
        uint64 userSessions,
        uint64 userMinutes,
        uint64 timestamp
    );

    event DailyCheckedIn(
        address indexed user,
        uint64 checkInCount,
        uint64 checkInStreak,
        uint64 day
    );

    error InvalidMode();
    error InvalidMinutes();
    error AlreadyCheckedIn();

    function mark(uint8 mode, uint16 minutesAmount) external {
        if (mode >= MODE_COUNT) revert InvalidMode();
        if (!_isAllowedMinutes(minutesAmount)) revert InvalidMinutes();

        Profile storage profile = profiles[msg.sender];
        uint64 timestamp = uint64(block.timestamp);

        profile.totalSessions += 1;
        profile.totalMinutes += minutesAmount;
        profile.lastMarkedAt = timestamp;
        profile.lastMinutes = minutesAmount;
        profile.lastMode = mode;
        profile.sessionsByMode[mode] += 1;
        profile.minutesByMode[mode] += minutesAmount;

        globalSessions += 1;
        globalMinutes += minutesAmount;

        emit FocusMarked(
            msg.sender,
            mode,
            minutesAmount,
            profile.totalSessions,
            profile.totalMinutes,
            timestamp
        );
    }

    function checkIn() external {
        Profile storage profile = profiles[msg.sender];
        uint64 today = uint64(block.timestamp / 1 days);

        if (profile.lastCheckInDay == today) revert AlreadyCheckedIn();

        if (profile.lastCheckInDay + 1 == today) {
            profile.checkInStreak += 1;
        } else {
            profile.checkInStreak = 1;
        }

        profile.checkInCount += 1;
        profile.lastCheckInDay = today;
        globalCheckIns += 1;

        emit DailyCheckedIn(
            msg.sender,
            profile.checkInCount,
            profile.checkInStreak,
            today
        );
    }

    function statsOf(address user)
        external
        view
        returns (
            uint64 totalSessions,
            uint64 totalMinutes,
            uint64 lastMarkedAt,
            uint64 checkInCount,
            uint64 checkInStreak,
            uint64 lastCheckInDay,
            uint16 lastMinutes,
            uint8 lastMode,
            uint64 buildSessions,
            uint64 studySessions,
            uint64 readSessions,
            uint64 planSessions,
            uint64 practiceSessions,
            uint64 resetSessions
        )
    {
        Profile storage profile = profiles[user];

        return (
            profile.totalSessions,
            profile.totalMinutes,
            profile.lastMarkedAt,
            profile.checkInCount,
            profile.checkInStreak,
            profile.lastCheckInDay,
            profile.lastMinutes,
            profile.lastMode,
            profile.sessionsByMode[BUILD],
            profile.sessionsByMode[STUDY],
            profile.sessionsByMode[READ],
            profile.sessionsByMode[PLAN],
            profile.sessionsByMode[PRACTICE],
            profile.sessionsByMode[RESET]
        );
    }

    function modeTotals(address user, uint8 mode)
        external
        view
        returns (uint64 sessions, uint64 minutesAmount)
    {
        if (mode >= MODE_COUNT) revert InvalidMode();

        Profile storage profile = profiles[user];
        return (profile.sessionsByMode[mode], profile.minutesByMode[mode]);
    }

    function _isAllowedMinutes(uint16 minutesAmount)
        private
        pure
        returns (bool)
    {
        return minutesAmount == 15 ||
            minutesAmount == 25 ||
            minutesAmount == 45 ||
            minutesAmount == 60 ||
            minutesAmount == 90;
    }
}
