import { type CSSProperties, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BookOpen,
  Brain,
  CalendarCheck,
  CheckCircle2,
  Copy,
  ExternalLink,
  Hammer,
  ListChecks,
  RefreshCcw,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { zeroAddress } from 'viem'
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi'
import { base } from 'wagmi/chains'
import {
  FLOWMARK_ADDRESS,
  flowMarkAbi,
  isContractConfigured,
} from './config/contract'
import { DATA_SUFFIX } from './config/wagmi'

const modes = [
  {
    id: 0,
    label: 'Build',
    verb: 'build',
    detail: 'Product progress',
    icon: Hammer,
    color: '#c7f000',
  },
  {
    id: 1,
    label: 'Study',
    verb: 'study',
    detail: 'Deep learning',
    icon: Brain,
    color: '#24d39a',
  },
  {
    id: 2,
    label: 'Read',
    verb: 'read',
    detail: 'Focused pages',
    icon: BookOpen,
    color: '#7dd3fc',
  },
  {
    id: 3,
    label: 'Plan',
    verb: 'plan',
    detail: 'Clear next steps',
    icon: ListChecks,
    color: '#f59e0b',
  },
  {
    id: 4,
    label: 'Practice',
    verb: 'practice',
    detail: 'Skill reps',
    icon: Sparkles,
    color: '#fb7185',
  },
  {
    id: 5,
    label: 'Reset',
    verb: 'reset',
    detail: 'Clean slate',
    icon: RefreshCcw,
    color: '#a78bfa',
  },
] as const

const durations = [15, 25, 45, 60, 90] as const

type FlowStats = {
  totalSessions: bigint
  totalMinutes: bigint
  lastMarkedAt: bigint
  checkInCount: bigint
  checkInStreak: bigint
  lastCheckInDay: bigint
  lastMinutes: bigint
  lastMode: bigint
  buildSessions: bigint
  studySessions: bigint
  readSessions: bigint
  planSessions: bigint
  practiceSessions: bigint
  resetSessions: bigint
}

const emptyStats: FlowStats = {
  totalSessions: 0n,
  totalMinutes: 0n,
  lastMarkedAt: 0n,
  checkInCount: 0n,
  checkInStreak: 0n,
  lastCheckInDay: 0n,
  lastMinutes: 0n,
  lastMode: 0n,
  buildSessions: 0n,
  studySessions: 0n,
  readSessions: 0n,
  planSessions: 0n,
  practiceSessions: 0n,
  resetSessions: 0n,
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function formatDate(timestamp: number) {
  if (!timestamp) return 'No sessions yet'

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp * 1000))
}

function toBigIntValue(value: unknown) {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number') return BigInt(value)
  if (typeof value === 'string' && value.length > 0) return BigInt(value)

  return 0n
}

function normalizeStats(data: unknown): FlowStats {
  if (!data) return emptyStats

  if (Array.isArray(data)) {
    return {
      totalSessions: toBigIntValue(data[0]),
      totalMinutes: toBigIntValue(data[1]),
      lastMarkedAt: toBigIntValue(data[2]),
      checkInCount: toBigIntValue(data[3]),
      checkInStreak: toBigIntValue(data[4]),
      lastCheckInDay: toBigIntValue(data[5]),
      lastMinutes: toBigIntValue(data[6]),
      lastMode: toBigIntValue(data[7]),
      buildSessions: toBigIntValue(data[8]),
      studySessions: toBigIntValue(data[9]),
      readSessions: toBigIntValue(data[10]),
      planSessions: toBigIntValue(data[11]),
      practiceSessions: toBigIntValue(data[12]),
      resetSessions: toBigIntValue(data[13]),
    }
  }

  const record = data as Record<string, unknown>

  return {
    totalSessions: toBigIntValue(record.totalSessions),
    totalMinutes: toBigIntValue(record.totalMinutes),
    lastMarkedAt: toBigIntValue(record.lastMarkedAt),
    checkInCount: toBigIntValue(record.checkInCount),
    checkInStreak: toBigIntValue(record.checkInStreak),
    lastCheckInDay: toBigIntValue(record.lastCheckInDay),
    lastMinutes: toBigIntValue(record.lastMinutes),
    lastMode: toBigIntValue(record.lastMode),
    buildSessions: toBigIntValue(record.buildSessions),
    studySessions: toBigIntValue(record.studySessions),
    readSessions: toBigIntValue(record.readSessions),
    planSessions: toBigIntValue(record.planSessions),
    practiceSessions: toBigIntValue(record.practiceSessions),
    resetSessions: toBigIntValue(record.resetSessions),
  }
}

export function App() {
  const [selectedMode, setSelectedMode] = useState(0)
  const [selectedMinutes, setSelectedMinutes] =
    useState<(typeof durations)[number]>(25)
  const [copied, setCopied] = useState(false)

  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { connectors, connect, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  const {
    data: hash,
    error: writeError,
    isPending: isWriting,
    writeContract,
  } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const userAddress = address ?? zeroAddress

  const {
    data: statsData,
    isLoading: isStatsLoading,
    refetch: refetchStats,
  } = useReadContract({
    address: FLOWMARK_ADDRESS,
    abi: flowMarkAbi,
    functionName: 'statsOf',
    args: [userAddress],
    query: {
      enabled: isContractConfigured && isConnected,
    },
  })

  const { data: globalSessionsData, refetch: refetchGlobalSessions } =
    useReadContract({
      address: FLOWMARK_ADDRESS,
      abi: flowMarkAbi,
      functionName: 'globalSessions',
      query: {
        enabled: isContractConfigured,
      },
    })

  const { data: globalMinutesData, refetch: refetchGlobalMinutes } =
    useReadContract({
      address: FLOWMARK_ADDRESS,
      abi: flowMarkAbi,
      functionName: 'globalMinutes',
      query: {
        enabled: isContractConfigured,
      },
    })

  const { data: globalCheckInsData, refetch: refetchGlobalCheckIns } =
    useReadContract({
      address: FLOWMARK_ADDRESS,
      abi: flowMarkAbi,
      functionName: 'globalCheckIns',
      query: {
        enabled: isContractConfigured,
      },
    })

  useEffect(() => {
    if (isSuccess) {
      void refetchStats()
      void refetchGlobalSessions()
      void refetchGlobalMinutes()
      void refetchGlobalCheckIns()
    }
  }, [
    isSuccess,
    refetchStats,
    refetchGlobalSessions,
    refetchGlobalMinutes,
    refetchGlobalCheckIns,
  ])

  const stats = normalizeStats(statsData)

  const totalSessions = Number(stats.totalSessions)
  const totalMinutes = Number(stats.totalMinutes)
  const lastMarkedAt = Number(stats.lastMarkedAt)
  const checkInCount = Number(stats.checkInCount)
  const checkInStreak = Number(stats.checkInStreak)
  const lastCheckInDay = Number(stats.lastCheckInDay)
  const lastMinutes = Number(stats.lastMinutes)
  const lastMode = Number(stats.lastMode)

  const selected = modes.find((mode) => mode.id === selectedMode) ?? modes[0]
  const lastLabel =
    totalSessions > 0 ? modes[lastMode]?.label ?? 'Unknown' : 'None'

  const globalSessions = Number(globalSessionsData ?? 0n)
  const globalMinutes = Number(globalMinutesData ?? 0n)
  const globalCheckIns = Number(globalCheckInsData ?? 0n)

  const today = Math.floor(Date.now() / 86_400_000)
  const checkedInToday = lastCheckInDay === today

  const modeCounts = [
    { ...modes[0], count: Number(stats.buildSessions) },
    { ...modes[1], count: Number(stats.studySessions) },
    { ...modes[2], count: Number(stats.readSessions) },
    { ...modes[3], count: Number(stats.planSessions) },
    { ...modes[4], count: Number(stats.practiceSessions) },
    { ...modes[5], count: Number(stats.resetSessions) },
  ]

  const needsSwitch = isConnected && chainId !== base.id

  const canWrite =
    isContractConfigured &&
    isConnected &&
    !needsSwitch &&
    !isWriting &&
    !isConfirming

  const canCheckIn = canWrite && !checkedInToday

  const primaryConnector = connectors.find(
    (connector) => connector.id === 'baseAccount',
  )

  const visibleConnectors = useMemo(() => {
    if (primaryConnector) {
      return [
        primaryConnector,
        ...connectors.filter((connector) => connector.id !== 'baseAccount'),
      ]
    }

    return connectors
  }, [connectors, primaryConnector])

  function handleMark() {
    if (!isContractConfigured) return

    writeContract({
      address: FLOWMARK_ADDRESS,
      abi: flowMarkAbi,
      functionName: 'mark',
      args: [selectedMode, selectedMinutes],
      chainId: base.id,
      dataSuffix: DATA_SUFFIX,
    })
  }

  function handleCheckIn() {
    if (!isContractConfigured) return

    writeContract({
      address: FLOWMARK_ADDRESS,
      abi: flowMarkAbi,
      functionName: 'checkIn',
      chainId: base.id,
      dataSuffix: DATA_SUFFIX,
    })
  }

  async function handleCopyAddress() {
    await navigator.clipboard.writeText(FLOWMARK_ADDRESS)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  const walletError =
    writeError && 'shortMessage' in writeError
      ? String(writeError.shortMessage)
      : writeError?.message

  return (
    <main className="console-shell">
      <header className="console-topbar">
        <div className="brand-lockup">
          <span className="brand-mark">F</span>
          <div>
            <strong>FlowMark</strong>
            <small>Base focus console</small>
          </div>
        </div>

        {isConnected && address ? (
          <div className="wallet-pill">
            <span>{shortAddress(address)}</span>
            <button type="button" onClick={() => disconnect()}>
              Disconnect
            </button>
          </div>
        ) : (
          <div className="connectors">
            {visibleConnectors.map((connector) => (
              <button
                type="button"
                key={connector.uid}
                onClick={() => connect({ connector })}
                disabled={isConnecting}
              >
                <Wallet size={16} />
                {connector.id === 'baseAccount'
                  ? 'Base Account'
                  : connector.name}
              </button>
            ))}
          </div>
        )}
      </header>

      <section className="console-grid">
        <aside className="left-panel">
          <p className="eyebrow">Focused minutes, placed on Base</p>
          <h1>Run the block. Leave a mark.</h1>
          <p className="summary">
            A compact onchain console for focus sessions and daily presence.
            No token, no mint, no app fee beyond Base gas.
          </p>

          <div className="contract-line">
            <span>Contract</span>
            <code>
              {isContractConfigured
                ? shortAddress(FLOWMARK_ADDRESS)
                : 'not configured'}
            </code>

            {isContractConfigured && (
              <button
                type="button"
                aria-label="Copy contract address"
                onClick={handleCopyAddress}
              >
                <Copy size={15} />
              </button>
            )}

            {copied && <small>Copied</small>}
          </div>

          {!isContractConfigured && (
            <div className="setup-warning">
              <AlertTriangle size={18} />
              Add your deployed contract address to
              VITE_FLOWMARK_CONTRACT_ADDRESS.
            </div>
          )}

          <div className="mode-list" aria-label="Select focus mode">
            {modes.map((mode) => {
              const Icon = mode.icon
              const isSelected = selectedMode === mode.id

              return (
                <button
                  type="button"
                  className={isSelected ? 'mode-row active' : 'mode-row'}
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  style={{ '--accent': mode.color } as CSSProperties}
                  aria-pressed={isSelected}
                >
                  <span>
                    <Icon size={18} />
                  </span>
                  <strong>{mode.label}</strong>
                  <small>{mode.detail}</small>
                </button>
              )
            })}
          </div>
        </aside>

        <section className="focus-stage" aria-label="Mark a focus session">
          <div className="dial-wrap">
            <div
              className="focus-dial"
              style={{ '--accent': selected.color } as CSSProperties}
            >
              <span>{selected.label}</span>
              <strong>{selectedMinutes}</strong>
              <small>minutes</small>
            </div>
          </div>

          <div className="duration-rail" aria-label="Select focus duration">
            {durations.map((minutes) => (
              <button
                type="button"
                key={minutes}
                className={
                  selectedMinutes === minutes ? 'duration active' : 'duration'
                }
                onClick={() => setSelectedMinutes(minutes)}
                aria-pressed={selectedMinutes === minutes}
              >
                {minutes}
              </button>
            ))}
          </div>

          <div className="action-row">
            {needsSwitch ? (
              <button
                type="button"
                className="primary-action"
                onClick={() => switchChain({ chainId: base.id })}
                disabled={isSwitching}
              >
                {isSwitching ? 'Switching...' : 'Switch to Base'}
              </button>
            ) : (
              <button
                type="button"
                className="primary-action"
                onClick={handleMark}
                disabled={!canWrite}
              >
                {isWriting
                  ? 'Confirm in wallet...'
                  : isConfirming
                    ? 'Writing to Base...'
                    : `Mark ${selected.verb}`}
              </button>
            )}

            <button
              type="button"
              className="checkin-action"
              onClick={handleCheckIn}
              disabled={!canCheckIn}
            >
              <CalendarCheck size={18} />
              {checkedInToday ? 'Checked in' : 'Daily check-in'}
            </button>
          </div>

          {isSuccess && (
            <div className="success-line">
              <CheckCircle2 size={17} />
              Saved on Base.
              {hash && (
                <a
                  href={`https://basescan.org/tx/${hash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  BaseScan <ExternalLink size={14} />
                </a>
              )}
            </div>
          )}

          {writeError && <div className="error-line">{walletError}</div>}
        </section>

        <aside className="right-panel" aria-label="FlowMark stats">
          <div className="stat-led">
            <span>Your sessions</span>
            <strong>{isStatsLoading ? '...' : totalSessions}</strong>
          </div>

          <div className="stat-led">
            <span>Your minutes</span>
            <strong>{totalMinutes}</strong>
          </div>

          <div className="stat-led">
            <span>Last flow</span>
            <strong>{lastLabel}</strong>
            <small>
              {lastMinutes ? `${lastMinutes} min - ` : ''}
              {formatDate(lastMarkedAt)}
            </small>
          </div>

          <div className="pulse-strip">
            <div>
              <span>Daily pulse</span>
              <strong>{checkInStreak} day streak</strong>
              <small>
                {checkInCount} check-ins -{' '}
                {checkedInToday ? 'done today' : 'open today'}
              </small>
            </div>
            <CalendarCheck size={24} />
          </div>

          <div className="network-grid">
            <div>
              <span>Global sessions</span>
              <strong>{globalSessions}</strong>
            </div>
            <div>
              <span>Global minutes</span>
              <strong>{globalMinutes}</strong>
            </div>
            <div>
              <span>Global check-ins</span>
              <strong>{globalCheckIns}</strong>
            </div>
          </div>

          <div className="mode-bars">
            {modeCounts.map((mode) => (
              <div className="mode-bar" key={mode.id}>
                <span>{mode.label}</span>
                <div>
                  <i
                    style={
                      {
                        '--accent': mode.color,
                        '--width': `${Math.min(100, mode.count * 18)}%`,
                      } as CSSProperties
                    }
                  />
                </div>
                <strong>{mode.count}</strong>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  )
}
