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
  Timer,
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
    detail: 'Made progress on a product.',
    icon: Hammer,
    color: '#0052ff',
  },
  {
    id: 1,
    label: 'Study',
    verb: 'study',
    detail: 'Learned with real attention.',
    icon: Brain,
    color: '#0f9f6e',
  },
  {
    id: 2,
    label: 'Read',
    verb: 'read',
    detail: 'Finished a focused reading block.',
    icon: BookOpen,
    color: '#7c3aed',
  },
  {
    id: 3,
    label: 'Plan',
    verb: 'plan',
    detail: 'Turned noise into next steps.',
    icon: ListChecks,
    color: '#f97316',
  },
  {
    id: 4,
    label: 'Practice',
    verb: 'practice',
    detail: 'Repeated the skill on purpose.',
    icon: Sparkles,
    color: '#dc2626',
  },
  {
    id: 5,
    label: 'Reset',
    verb: 'reset',
    detail: 'Cleared the desk and mind.',
    icon: RefreshCcw,
    color: '#0f766e',
  },
] as const

const durations = [15, 25, 45, 60, 90] as const
const emptyStats = [
  0n,
  0n,
  0n,
  0n,
  0n,
  0n,
  0n,
  0n,
  0n,
  0n,
  0n,
  0n,
  0n,
  0n,
] as const

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

export function App() {
  const [selectedMode, setSelectedMode] = useState(0)
  const [selectedMinutes, setSelectedMinutes] = useState<(typeof durations)[number]>(25)
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

  const stats = statsData ?? emptyStats
  const totalSessions = Number(stats[0])
  const totalMinutes = Number(stats[1])
  const lastMarkedAt = Number(stats[2])
  const checkInCount = Number(stats[3])
  const checkInStreak = Number(stats[4])
  const lastCheckInDay = Number(stats[5])
  const lastMinutes = Number(stats[6])
  const lastMode = Number(stats[7])
  const selected = modes.find((mode) => mode.id === selectedMode) ?? modes[0]
  const SelectedIcon = selected.icon
  const lastLabel = totalSessions > 0 ? modes[lastMode]?.label ?? 'Unknown' : 'None'
  const globalSessions = Number(globalSessionsData ?? 0n)
  const globalMinutes = Number(globalMinutesData ?? 0n)
  const globalCheckIns = Number(globalCheckInsData ?? 0n)
  const today = Math.floor(Date.now() / 86_400_000)
  const checkedInToday = lastCheckInDay === today
  const modeCounts = modes.map((mode, index) => ({
    ...mode,
    count: Number(stats[index + 8] ?? 0n),
  }))
  const needsSwitch = isConnected && chainId !== base.id
  const canMark =
    isContractConfigured &&
    isConnected &&
    !needsSwitch &&
    !isWriting &&
    !isConfirming
  const canCheckIn = canMark && !checkedInToday

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
    <main className="app-shell">
      <section className="hero">
        <nav className="topbar" aria-label="FlowMark wallet controls">
          <div className="brand">
            <span className="brand-mark">F</span>
            <span>FlowMark</span>
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
        </nav>

        <div className="hero-grid">
          <div className="intro">
            <p className="eyebrow">Focused minutes, placed on Base</p>
            <h1>Mark the block where attention held.</h1>
            <p className="summary">
              A tiny onchain focus log. Pick a mode, choose the minutes, and
              mark the session with one Base transaction.
            </p>

            <div className="contract-chip">
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
          </div>

          <div className="mark-panel" aria-label="Create a FlowMark session">
            {!isContractConfigured && (
              <div className="setup-warning">
                <AlertTriangle size={18} />
                Add your deployed contract address to
                VITE_FLOWMARK_CONTRACT_ADDRESS.
              </div>
            )}

            <div className="mark-header">
              <div>
                <span>Selected flow</span>
                <strong>{selected.label}</strong>
              </div>
              <SelectedIcon
                className="selected-icon"
                style={{ color: selected.color }}
                size={34}
              />
            </div>

            <div className="duration-row" aria-label="Select focus duration">
              {durations.map((minutes) => (
                <button
                  type="button"
                  key={minutes}
                  className={selectedMinutes === minutes ? 'duration active' : 'duration'}
                  onClick={() => setSelectedMinutes(minutes)}
                  aria-pressed={selectedMinutes === minutes}
                >
                  <Timer size={15} />
                  {minutes}
                </button>
              ))}
            </div>

            <div className="checkin-card">
              <div>
                <span>Daily check-in</span>
                <strong>
                  {checkedInToday ? 'Checked in today' : 'Mark today'}
                </strong>
                <small>
                  {checkInStreak} day streak - {checkInCount} total
                </small>
              </div>
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={!canCheckIn}
                aria-label="Daily check-in"
              >
                <CalendarCheck size={18} />
                {checkedInToday ? 'Done' : 'Check in'}
              </button>
            </div>

            <div className="mode-grid" role="list">
              {modes.map((mode) => {
                const Icon = mode.icon
                const isSelected = selectedMode === mode.id

                return (
                  <button
                    type="button"
                    role="listitem"
                    className={isSelected ? 'mode active' : 'mode'}
                    key={mode.id}
                    onClick={() => setSelectedMode(mode.id)}
                    style={{ '--accent': mode.color } as CSSProperties}
                    aria-pressed={isSelected}
                  >
                    <Icon size={20} />
                    <span>{mode.label}</span>
                    <small>{mode.detail}</small>
                  </button>
                )
              })}
            </div>

            {needsSwitch ? (
              <button
                type="button"
                className="mark-button"
                onClick={() => switchChain({ chainId: base.id })}
                disabled={isSwitching}
              >
                {isSwitching ? 'Switching...' : 'Switch to Base'}
              </button>
            ) : (
              <button
                type="button"
                className="mark-button"
                onClick={handleMark}
                disabled={!canMark}
              >
                {isWriting
                  ? 'Confirm in wallet...'
                  : isConfirming
                    ? 'Marking on Base...'
                    : `Mark ${selectedMinutes} min ${selected.verb}`}
              </button>
            )}

            {isSuccess && (
              <div className="success-line">
                <CheckCircle2 size={17} />
                Flow marked.
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
          </div>
        </div>
      </section>

      <section className="stats-band" aria-label="FlowMark stats">
        <div className="metric">
          <span>Your sessions</span>
          <strong>{isStatsLoading ? '...' : totalSessions}</strong>
        </div>
        <div className="metric">
          <span>Your minutes</span>
          <strong>{totalMinutes}</strong>
        </div>
        <div className="metric">
          <span>Last flow</span>
          <strong>{lastLabel}</strong>
          <small>
            {lastMinutes ? `${lastMinutes} min - ` : ''}
            {formatDate(lastMarkedAt)}
          </small>
        </div>
        <div className="metric">
          <span>Network flow</span>
          <strong>{globalSessions}</strong>
          <small>{globalMinutes} min total</small>
        </div>
        <div className="metric">
          <span>Daily check-ins</span>
          <strong>{globalCheckIns}</strong>
          <small>{checkInStreak} day personal streak</small>
        </div>
      </section>

      <section className="ledger" aria-label="Mode ledger">
        <div className="section-heading">
          <span>Personal ledger</span>
          <strong>Sessions by mode</strong>
        </div>

        <div className="ledger-grid">
          {modeCounts.map((mode) => {
            const Icon = mode.icon

            return (
              <div className="ledger-item" key={mode.id}>
                <span style={{ color: mode.color }}>
                  <Icon size={21} />
                </span>
                <div>
                  <strong>{mode.count}</strong>
                  <small>{mode.label}</small>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </main>
  )
}
