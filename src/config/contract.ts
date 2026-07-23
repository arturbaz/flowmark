import type { Address } from 'viem'

const configuredAddress = import.meta.env.VITE_FLOWMARK_CONTRACT_ADDRESS
const zeroContractAddress = '0x0000000000000000000000000000000000000000'
const activeAddress = configuredAddress || zeroContractAddress

export const isContractConfigured =
  /^0x[a-fA-F0-9]{40}$/.test(activeAddress) &&
  activeAddress !== zeroContractAddress

export const FLOWMARK_ADDRESS = (
  isContractConfigured ? activeAddress : zeroContractAddress
) as Address

export const flowMarkAbi = [
  {
    type: 'function',
    name: 'mark',
    inputs: [
      { name: 'mode', type: 'uint8' },
      { name: 'minutesAmount', type: 'uint16' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'checkIn',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'statsOf',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'totalSessions', type: 'uint64' },
      { name: 'totalMinutes', type: 'uint64' },
      { name: 'lastMarkedAt', type: 'uint64' },
      { name: 'checkInCount', type: 'uint64' },
      { name: 'checkInStreak', type: 'uint64' },
      { name: 'lastCheckInDay', type: 'uint64' },
      { name: 'lastMinutes', type: 'uint16' },
      { name: 'lastMode', type: 'uint8' },
      { name: 'buildSessions', type: 'uint64' },
      { name: 'studySessions', type: 'uint64' },
      { name: 'readSessions', type: 'uint64' },
      { name: 'planSessions', type: 'uint64' },
      { name: 'practiceSessions', type: 'uint64' },
      { name: 'resetSessions', type: 'uint64' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'globalSessions',
    inputs: [],
    outputs: [{ name: '', type: 'uint64' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'globalMinutes',
    inputs: [],
    outputs: [{ name: '', type: 'uint64' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'globalCheckIns',
    inputs: [],
    outputs: [{ name: '', type: 'uint64' }],
    stateMutability: 'view',
  },
] as const
