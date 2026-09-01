import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Building2, Check, Loader2, Server, ShieldCheck } from 'lucide-react'
import { OnboardingLayout } from '@/components/onboarding-layout'
import { AlertBlock } from '@/components/alert-block'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { CardContent, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ApiError, api, type FlowState } from '@/lib/api'
import { cn } from '@/lib/utils'

export function AuthorizePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const flowParam = params.get('flow')

  const [flow, setFlow] = useState<FlowState | null>(null)
  const [flowToken, setFlowToken] = useState(flowParam ?? '')
  const [selected, setSelected] = useState<string[]>([])
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([])
  const [avatar, setAvatar] = useState<string | null>(null)
  const [bootError, setBootError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState<'allow' | 'deny' | null>(null)

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
        setSelectedOrgs((state.account?.organizations ?? []).map((organization) => organization.id))
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

  const toggle = (scope: string) => {
    setSelected((current) =>
      current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]
    )
  }

  const toggleOrg = (id: string) => {
    setSelectedOrgs((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )
  }

  const onAllow = async () => {
    setError(null)
    setSubmitting('allow')
    try {
      const organizations = flow?.account?.organizations ?? []
      const result = await api.consent(
        flowToken,
        selected,
        organizations.length > 0 ? selectedOrgs : undefined
      )
      window.location.href = result.redirect_to
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not complete the authorization.')
      setSubmitting(null)
    }
  }

  const onDeny = async () => {
    setError(null)
    setSubmitting('deny')
    try {
      const result = await api.deny(flowToken)
      window.location.href = result.redirect_to
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not cancel the authorization.')
      setSubmitting(null)
    }
  }

  if (bootError) {
    return (
      <OnboardingLayout>
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            <div className="flex flex-row items-center justify-center gap-2">
              <Logo className="size-12" />
              Dokploy MCP
            </div>
          </h1>
        </div>
        <AlertBlock type="error">{bootError}</AlertBlock>
      </OnboardingLayout>
    )
  }

  if (!flow) {
    return (
      <OnboardingLayout>
        <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading the authorization request
        </div>
      </OnboardingLayout>
    )
  }

  const account = flow.account
  const organizations = account?.organizations ?? []
  const avatarSrc = account?.image ?? avatar
  const initials = (account?.name ?? '?')
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <OnboardingLayout>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          <div className="flex flex-row items-center justify-center gap-2">
            <Logo className="size-12" />
            Authorize
          </div>
        </h1>
        <CardDescription className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{flow.client.name}</span> wants to access
          your Dokploy infrastructure
        </CardDescription>
      </div>

      {error ? (
        <AlertBlock type="error" className="my-2">
          {error}
        </AlertBlock>
      ) : null}

      <CardContent className="space-y-6 p-0">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt=""
                className="size-10 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="flex size-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
                {initials}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">Signed in as {account?.name}</p>
              <p className="truncate text-xs text-muted-foreground">{account?.email}</p>
            </div>
            <Badge variant="secondary" className="gap-1">
              <ShieldCheck className="size-3" />
              Verified
            </Badge>
          </div>

          <Separator className="my-4" />

          <dl className="space-y-2 text-xs">
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <Server className="size-3.5" />
                Server
              </dt>
              <dd className="truncate font-medium">{flow.instance?.host}</dd>
            </div>
            {organizations.length <= 1 && account?.organizationName ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="size-3.5" />
                  Organization
                </dt>
                <dd className="truncate font-medium">{account.organizationName}</dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Authentication</dt>
              <dd className="font-medium">
                {flow.method === 'api_key' ? 'API key' : 'Email and password'}
              </dd>
            </div>
          </dl>
        </div>

        {organizations.length > 1 ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">Organizations to connect</p>
            {organizations.map((organization) => {
              const active = selectedOrgs.includes(organization.id)
              return (
                <button
                  type="button"
                  key={organization.id}
                  onClick={() => toggleOrg(organization.id)}
                  aria-pressed={active}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                    active ? 'border-primary/40 bg-accent' : 'bg-card hover:bg-accent/50'
                  )}
                >
                  <span
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded border transition-colors',
                      active ? 'border-primary bg-primary text-primary-foreground' : 'border-input'
                    )}
                  >
                    {active ? <Check className="size-3.5" /> : null}
                  </span>
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <Building2 className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm font-medium">
                      {organization.name ?? organization.id}
                    </span>
                    {organization.id === account?.organizationId ? (
                      <Badge variant="secondary">Active</Badge>
                    ) : null}
                  </span>
                </button>
              )
            })}
          </div>
        ) : null}

        <div className="space-y-3">
          <p className="text-sm font-medium">Permissions to grant</p>
          {flow.scope_catalog.map((scope) => {
            const active = selected.includes(scope.id)
            return (
              <button
                type="button"
                key={scope.id}
                onClick={() => toggle(scope.id)}
                aria-pressed={active}
                className={cn(
                  'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                  active ? 'border-primary/40 bg-accent' : 'bg-card hover:bg-accent/50'
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border transition-colors',
                    active ? 'border-primary bg-primary text-primary-foreground' : 'border-input'
                  )}
                >
                  {active ? <Check className="size-3.5" /> : null}
                </span>
                <span className="flex-1 space-y-1">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {scope.label}
                    {scope.risky ? (
                      <Badge variant="outline" className="gap-1 text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="size-3" />
                        Sensitive
                      </Badge>
                    ) : null}
                  </span>
                  <span className="block text-xs text-muted-foreground">{scope.description}</span>
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button
            className="flex-1"
            onClick={onAllow}
            disabled={
              submitting !== null ||
              selected.length === 0 ||
              (organizations.length > 1 && selectedOrgs.length === 0)
            }
          >
            {submitting === 'allow' ? <Loader2 className="size-4 animate-spin" /> : null}
            Authorize
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={onDeny}
            disabled={submitting !== null}
          >
            {submitting === 'deny' ? <Loader2 className="size-4 animate-spin" /> : null}
            Cancel
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          You can revoke this access at any time by deleting the API key in your Dokploy panel.
        </p>
      </CardContent>
    </OnboardingLayout>
  )
}
