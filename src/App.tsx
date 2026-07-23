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
  { id: 0, label: 'Build', verb: 'build', detail: 'Product progress', icon: Hammer, color: '#c7f000' },
  { id: 1, label: 'Study', verb: 'study', detail: 'Deep learning', icon: Brain, color: '#24d39a' },
  { id: 2, label: 'Read', verb: 'read', detail: 'Focused pages', icon: BookOpen, color: '#7dd3fc' },
  { id: 3, label: 'Plan', verb: 'plan', detail: 'Clear next steps', icon: ListChecks, color: '#f59e0b' },
  { id: 4, label: 'Practice', verb: 'practice', detail: 'Skill reps', icon: Sparkles, color: '#fb7185' },
  { id: 5, label: 'Reset', verb: 'reset', detail: 'Clean slate', icon: RefreshCcw, color: '#a78bfa' },
] as const

const durations = [15, 25, 45, 60, 90] as const
const emptyStats = [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n] as const

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
  const { data: hash, error: writeError, isPending: isWriting, writeContract } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const userAddress = address ?? zeroAddress

  const { data: statsData, isLoading: isStatsLoading, refetch: refetchStats } = useReadContract({
    address: FLOWMARK_ADDRESS,
    abi: flowMarkAbi,
    functionName: 'statsOf',
    args: [userAddress],
    query: { enabled: isContractConfigured && isConnected },
  })

  const { data: globalSessionsData, refetch: refetchGlobalSessions } = useReadContract({
    address: FLOWMARK_ADDRESS,
    abi: flowMarkAbi,
    functionName: 'globalSessions',
    query: { enabled: isContractConfigured },
  })

  const { data: globalMinutesData, refetch: refetchGlobalMinutes } = useReadContract({
    address: FLOWMARK_ADDRESS,
    abi: flowMarkAbi,
    functionName: 'globalMinutes',
    query: { enabled: isContractConfigured },
  })

  const { data: globalCheckInsData, refetch: refetchGlobalCheckIns } = useReadContract({
    address: FLOWMARK_ADDRESS,
    abi: flowMarkAbi,
    functionName: 'globalCheckIns',
    query: { enabled: isContractConfigured },
  })

  useEffect(() => {
    if (isSuccess) {
      void refetchStats()
      void refetchGlobalSessions()
      void refetchGlobalMinutes()
      void refetchGlobalCheckIns()
    }
  }, [isSuccess, refetchStats, refetchGlobalSessions, refetchGlobalMinutes, refetchGlobalCheckIns])

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
  const canWrite = isContractConfigured && isConnected && !needsSwitch && !isWriting && !isConfirming
  const canCheckIn = canWrite && !checkedInToday

  const primaryConnector = connectors.find((connector) => connector.id === 'baseAccount')
  const visibleConnectors = useMemo(() => {
    if (primaryConnector) {
      return [primaryConnector, ...connectors.filter((connector) => connector.id !== 'baseAccount')]
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
            <button type="button" onClick={() => disconnect()}>Disconnect</button>
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
                {connector.id === 'baseAccount' ? 'Base Account' : connector.name}
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
            <code>{isContractConfigured ? shortAddress(FLOWMARK_ADDRESS) : 'not configured'}</code>
            {isContractConfigured && (
              <button type="button" aria-label="Copy contract address" onClick={handleCopyAddress}>
                <Copy size={15} />
              </button>
            )}
            {copied && <small>Copied</small>}
          </div>

          {!isContractConfigured && (
            <div className="setup-warning">
              <AlertTriangle size={18} />
              Add your deployed contract address to VITE_FLOWMARK_CONTRACT_ADDRESS.
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
                  <span><Icon size={18} /></span>
                  <strong>{mode.label}</strong>
                  <small>{mode.detail}</small>
                </button>
              )
            })}
          </div>
        </aside>

        <section className="focus-stage" aria-label="Mark a focus session">
          <div className="dial-wrap">
            <div className="focus-dial" style={{ '--accent': selected.color } as CSSProperties}>
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
                className={selectedMinutes === minutes ? 'duration active' : 'duration'}
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
              <button type="button" className="primary-action" onClick={handleMark} disabled={!canWrite}>
                {isWriting
                  ? 'Confirm in wallet...'
                  : isConfirming
                    ? 'Writing to Base...'
                    : `Mark ${selected.verb}`}
              </button>
            )}

            <button type="button" className="checkin-action" onClick={handleCheckIn} disabled={!canCheckIn}>
              <CalendarCheck size={18} />
              {checkedInToday ? 'Checked in' : 'Daily check-in'}
            </button>
          </div>

          {isSuccess && (
            <div className="success-line">
              <CheckCircle2 size={17} />
              Saved on Base.
              {hash && (
                <a href={`https://basescan.org/tx/${hash}`} target="_blank" rel="noreferrer">
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
            <small>{lastMinutes ? `${lastMinutes} min - ` : ''}{formatDate(lastMarkedAt)}</small>
          </div>

          <div className="pulse-strip">
            <div>
              <span>Daily pulse</span>
              <strong>{checkInStreak} day streak</strong>
              <small>{checkInCount} check-ins - {checkedInToday ? 'done today' : 'open today'}</small>
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
