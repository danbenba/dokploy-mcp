import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Building2, ChevronDown, Server, ShieldCheck } from 'lucide-react'
import claudeLogo from '@/assets/brands/claude.png'
import chatgptLogo from '@/assets/brands/chatgpt.png'
import { OnboardingLayout } from '@/components/onboarding-layout'
import { AlertBlock } from '@/components/alert-block'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AuthorizeSkeleton } from '@/components/authorize/authorize-skeleton'
import { PermissionsList } from '@/components/authorize/permissions-list'
import { SlideToAuthorize, type SlideStatus } from '@/components/authorize/slide-to-authorize'
import { SuccessCheck } from '@/components/authorize/success-check'
import { ApiError, api, type FlowState } from '@/lib/api'
import { cn } from '@/lib/utils'

const ALL = '__all__'

function clientKind(name: string): 'claude' | 'chatgpt' | 'other' {
  if (/chatgpt|openai/i.test(name)) {
    return 'chatgpt'
  }
  if (/claude|anthropic/i.test(name)) {
    return 'claude'
  }
  return 'other'
}

export function AuthorizePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const flowParam = params.get('flow')

  const [flow, setFlow] = useState<FlowState | null>(null)
  const [flowToken, setFlowToken] = useState(flowParam ?? '')
  const [selected, setSelected] = useState<string[]>([])
  const [organization, setOrganization] = useState(ALL)
  const [avatar, setAvatar] = useState<string | null>(null)
  const [bootError, setBootError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<SlideStatus>('idle')
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (!flowParam) {
      setBootError('This authorization link is incomplete. Restart the connection from your assistant.')
      return
    }
    api
      .session(flowParam)
      .then((state) => {
        setFlow(state)
        setFlowToken(state.token)
        setSelected(state.requested_scopes)
        if (state.stage !== 'consent') {
          navigate(`/login?flow=${encodeURIComponent(state.token)}`, { replace: true })
        }
      })
      .catch((cause: unknown) => {
        setBootError(
          cause instanceof ApiError
            ? `${cause.message} Restart the connection from your assistant.`
            : 'This authorization link is no longer valid.'
        )
      })
  }, [flowParam, navigate])

  useEffect(() => {
    if (!flow || flow.stage !== 'consent' || flow.account?.image) {
      return
    }
    let cancelled = false
    api
      .avatar(flow.token)
      .then((result) => {
        if (!cancelled && result.image) {
          setAvatar(result.image)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [flow])

  const account = flow?.account ?? null
  const organizations = useMemo(() => account?.organizations ?? [], [account])
  const kind = clientKind(flow?.client.name ?? '')
  const avatarSrc = account?.image ?? avatar
  const initials = (account?.name ?? '?')
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const toggle = (scope: string) => {
    setSelected((current) =>
      current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]
    )
  }

  const selectedOrganizations = () => {
    if (organizations.length === 0) {
      return undefined
    }
    return organization === ALL
      ? organizations.map((entry) => entry.id)
      : [organization]
  }

  const onComplete = async () => {
    if (status !== 'idle') {
      return
    }
    setError(null)
    setStatus('loading')
    try {
      const result = await api.consent(flowToken, selected, selectedOrganizations())
      setStatus('success')
      window.setTimeout(() => {
        window.location.href = result.redirect_to
      }, reduced ? 300 : 1400)
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not complete the authorization.')
      setStatus('idle')
    }
  }

  const onDeny = async () => {
    setError(null)
    setLeaving(true)
    try {
      const result = await api.deny(flowToken)
      window.location.href = result.redirect_to
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not cancel the authorization.')
      setLeaving(false)
    }
  }

  const onLogout = async () => {
    setError(null)
    setLeaving(true)
    try {
      const state = await api.logout(flowToken)
      navigate(`/login?flow=${encodeURIComponent(state.token)}`, { replace: true })
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not switch account.')
      setLeaving(false)
    }
  }

  if (bootError) {
    return (
      <OnboardingLayout centered>
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo className="size-12" />
          <h1 className="text-2xl font-semibold tracking-tight">Dokploy MCP</h1>
        </div>
        <AlertBlock type="error">{bootError}</AlertBlock>
      </OnboardingLayout>
    )
  }

  if (!flow || leaving) {
    return (
      <OnboardingLayout centered>
        <AuthorizeSkeleton />
      </OnboardingLayout>
    )
  }

  const fade = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.35, delay, ease: 'easeOut' as const },
        }

  const busy = status !== 'idle'

  return (
    <OnboardingLayout centered>
      <motion.div {...fade(0)} className="flex flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-3">
          <img
            src={claudeLogo}
            alt="Claude"
            width={48}
            height={48}
            className={cn(
              'size-12 rounded-2xl border bg-white p-2 shadow-sm transition-all',
              kind === 'chatgpt' ? 'opacity-40 grayscale' : ''
            )}
          />
          <img
            src={chatgptLogo}
            alt="ChatGPT"
            width={48}
            height={48}
            className={cn(
              'size-12 rounded-2xl border shadow-sm transition-all',
              kind === 'claude' ? 'opacity-40 grayscale' : ''
            )}
          />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            {flow.client.name} wants to access your account
          </h1>
          <p className="text-sm text-muted-foreground">
            Review the access below, then slide to authorize.
          </p>
        </div>
      </motion.div>

      <AnimatePresence>
        {error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <AlertBlock type="error">{error}</AlertBlock>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div {...fade(0.08)} className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-3">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt=""
              className="size-11 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="flex size-11 items-center justify-center rounded-full bg-muted text-sm font-medium">
              {initials}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{account?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{account?.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onLogout} disabled={busy}>
            Not you?
          </Button>
        </div>
        <dl className="mt-4 space-y-2 border-t pt-4 text-xs">
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 text-muted-foreground">
              <Server className="size-3.5" />
              Server
            </dt>
            <dd className="flex items-center gap-2 truncate font-medium">
              {flow.instance?.host}
              <Badge variant="secondary" className="gap-1">
                <ShieldCheck className="size-3" />
                Verified
              </Badge>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Signed in with</dt>
            <dd className="font-medium">
              {flow.method === 'api_key' ? 'API key' : 'Email and password'}
            </dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={onLogout}
          disabled={busy}
          className="mt-3 text-xs text-muted-foreground underline-offset-4 hover:underline disabled:opacity-60"
        >
          Use another account
        </button>
      </motion.div>

      {organizations.length > 0 ? (
        <motion.div {...fade(0.14)} className="space-y-2">
          <label htmlFor="organization" className="text-sm font-medium">
            Organization
          </label>
          <div className="relative">
            <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <select
              id="organization"
              value={organization}
              onChange={(event) => setOrganization(event.target.value)}
              disabled={busy}
              className="h-10 w-full appearance-none rounded-lg border bg-background pl-9 pr-9 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            >
              {organizations.length > 1 ? (
                <option value={ALL}>All organizations ({organizations.length})</option>
              ) : null}
              {organizations.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name ?? entry.id}
                  {entry.id === account?.organizationId ? ' (active)' : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </motion.div>
      ) : null}

      <motion.div {...fade(0.2)}>
        <PermissionsList
          catalog={flow.scope_catalog}
          selected={selected}
          onToggle={toggle}
          disabled={busy}
        />
      </motion.div>

      <motion.div {...fade(0.26)} className="pt-2">
        <AnimatePresence mode="wait" initial={false}>
          {status === 'success' ? (
            <motion.div
              key="success"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex min-h-[96px] items-center justify-center"
            >
              <SuccessCheck label={`Connected to ${flow.client.name}`} />
            </motion.div>
          ) : (
            <motion.div key="slider" exit={{ opacity: 0, scale: 0.98 }}>
              <SlideToAuthorize
                status={status}
                disabled={selected.length === 0}
                onComplete={onComplete}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div {...fade(0.3)} className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={onDeny}
          disabled={busy}
          className="text-xs text-muted-foreground underline-offset-4 hover:underline disabled:opacity-60"
        >
          Cancel and go back to {flow.client.name}
        </button>
        <p className="text-center text-xs text-muted-foreground">
          You can revoke this access at any time by deleting the API keys in your Dokploy panel.
        </p>
      </motion.div>
    </OnboardingLayout>
  )
}
