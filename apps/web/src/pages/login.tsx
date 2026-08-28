import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Fingerprint, KeyRound, Loader2, Lock, Server } from 'lucide-react'
import { OnboardingLayout } from '@/components/onboarding-layout'
import { AlertBlock } from '@/components/alert-block'
import { Logo } from '@/components/logo'
import {
  VERIFICATION_STEPS,
  VerificationSteps,
  type StepStatus,
  type VerificationStep,
} from '@/components/verification-steps'
import { Button } from '@/components/ui/button'
import { CardContent, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ApiError, api, type FlowState } from '@/lib/api'

const STEP_DELAY = 420

const FAILING_STEP: Record<string, number> = {
  invalid_url: 0,
  insecure: 0,
  private_address: 0,
  dns: 0,
  unreachable: 1,
  not_dokploy: 2,
}

function initialSteps(status: StepStatus = 'pending'): VerificationStep[] {
  return VERIFICATION_STEPS.map((step) => ({ ...step, status }))
}

function stepsAfterFailure(code: string): VerificationStep[] {
  const failed = FAILING_STEP[code] ?? 2
  return VERIFICATION_STEPS.map((step, index) => ({
    ...step,
    status: index < failed ? 'done' : index === failed ? 'failed' : 'pending',
  }))
}

export function LoginPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const flowParam = params.get('flow')

  const [flow, setFlow] = useState<FlowState | null>(null)
  const [flowToken, setFlowToken] = useState(flowParam ?? '')
  const [bootError, setBootError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [instanceUrl, setInstanceUrl] = useState('')
  const [steps, setSteps] = useState<VerificationStep[]>(initialSteps())
  const [verifying, setVerifying] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!flowParam) {
      setBootError(
        'This page is opened by your AI assistant during the connection. Start from Claude or ChatGPT by adding the Dokploy MCP connector.'
      )
      return
    }
    api
      .session(flowParam)
      .then((state) => {
        setFlow(state)
        setFlowToken(state.token)
        if (state.instance?.url) {
          setInstanceUrl(state.instance.url)
        }
      })
      .catch((cause: unknown) => {
        setBootError(
          cause instanceof ApiError
            ? `${cause.message} Restart the connection from your assistant.`
            : 'This authorization link is no longer valid. Restart the connection from your assistant.'
        )
      })
  }, [flowParam])

  useEffect(() => {
    if (flow?.stage === 'consent') {
      navigate(`/authorize?flow=${encodeURIComponent(flowToken)}`, { replace: true })
    }
  }, [flow?.stage, flowToken, navigate])

  const advance = useCallback((index: number, status: StepStatus) => {
    setSteps((current) =>
      current.map((step, position) => (position === index ? { ...step, status } : step))
    )
  }, [])

  const onVerify = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!instanceUrl.trim()) {
      setError('Enter the address of your Dokploy panel.')
      return
    }
    setError(null)
    setVerifying(true)
    setSteps(initialSteps())

    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
    try {
      advance(0, 'running')
      await wait(STEP_DELAY)
      advance(0, 'done')
      advance(1, 'running')

      const request = api.verify(flowToken, instanceUrl.trim())
      await wait(STEP_DELAY)
      advance(1, 'done')
      advance(2, 'running')

      const state = await request
      advance(2, 'done')
      await wait(220)

      setFlow(state)
      setFlowToken(state.token)
      if (state.verified?.url) {
        setInstanceUrl(state.verified.url)
      }
    } catch (cause) {
      setSteps(stepsAfterFailure(cause instanceof ApiError ? cause.code : 'not_dokploy'))
      setError(
        cause instanceof ApiError ? cause.message : 'Could not verify this address. Try again.'
      )
    } finally {
      setVerifying(false)
    }
  }

  const applyState = (state: FlowState) => {
    setFlow(state)
    setFlowToken(state.token)
    if (state.stage === 'consent') {
      navigate(`/authorize?flow=${encodeURIComponent(state.token)}`, { replace: true })
    }
  }

  const onCredentials = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      applyState(await api.login(flowToken, email, password))
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not sign in. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const onTotp = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      applyState(await api.secondFactor(flowToken, totpCode.replace(/\s/g, ''), 'totp'))
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not verify the code.')
    } finally {
      setSubmitting(false)
    }
  }

  const onApiKey = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      applyState(await api.apiKey(flowToken, apiKey.trim()))
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not use this API key.')
    } finally {
      setSubmitting(false)
    }
  }

  const heading = useMemo(() => {
    if (!flow) {
      return { title: 'Sign in', subtitle: 'Preparing the secure connection' }
    }
    if (flow.two_factor_pending) {
      return { title: 'Two-factor', subtitle: 'Enter the code from your authenticator app' }
    }
    if (flow.stage === 'instance') {
      return { title: 'Sign in', subtitle: 'Connect the Dokploy panel you want to control' }
    }
    return {
      title: 'Sign in',
      subtitle: `Authenticate on ${flow.instance?.host ?? 'your panel'}`,
    }
  }, [flow])

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

  return (
    <OnboardingLayout>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          <div className="flex flex-row items-center justify-center gap-2">
            <Logo className="size-12" />
            {heading.title}
          </div>
        </h1>
        <CardDescription className="text-sm text-muted-foreground">
          {heading.subtitle}
        </CardDescription>
        {flow ? (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{flow.client.name}</span> is requesting
            access to your Dokploy infrastructure.
          </p>
        ) : null}
      </div>

      {error ? (
        <AlertBlock type="error" className="my-2">
          {error}
        </AlertBlock>
      ) : null}

      <CardContent className="p-0">
        {!flow ? (
          <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading the authorization request
          </div>
        ) : flow.stage === 'instance' ? (
          <form onSubmit={onVerify} className="space-y-4" id="instance-form">
            <div className="space-y-2">
              <Label htmlFor="instance">Dokploy server URL</Label>
              <div className="relative">
                <Server className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="instance"
                  className="pl-9"
                  placeholder="https://panel.example.com"
                  autoComplete="url"
                  value={instanceUrl}
                  onChange={(event) => setInstanceUrl(event.target.value)}
                  disabled={verifying}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                The address of your own Dokploy panel. Your credentials are sent only to that
                server.
              </p>
            </div>

            {verifying || steps.some((step) => step.status !== 'pending') ? (
              <VerificationSteps steps={steps} />
            ) : null}

            <Button className="w-full" type="submit" disabled={verifying}>
              {verifying ? <Loader2 className="size-4 animate-spin" /> : null}
              {verifying ? 'Verifying' : 'Next'}
              {verifying ? null : <ArrowRight className="size-4" />}
            </Button>
          </form>
        ) : flow.two_factor_pending ? (
          <form onSubmit={onTotp} className="space-y-4" id="totp-form">
            <div className="space-y-2">
              <Label htmlFor="totp">Authentication code</Label>
              <Input
                id="totp"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={totpCode}
                onChange={(event) => setTotpCode(event.target.value)}
              />
            </div>
            <Button className="w-full" type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Verify
            </Button>
          </form>
        ) : (
          <Tabs defaultValue="credentials" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="credentials">
                <Lock className="size-4" />
                Email
              </TabsTrigger>
              <TabsTrigger value="api-key">
                <KeyRound className="size-4" />
                API key
              </TabsTrigger>
            </TabsList>

            <TabsContent value="credentials" className="mt-4">
              <form onSubmit={onCredentials} className="space-y-4" id="login-form">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
                <Button className="w-full" type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                  Login
                </Button>
                <p className="text-xs text-muted-foreground">
                  A dedicated API key is created on your panel for this connection. Your password is
                  never stored.
                </p>
              </form>
            </TabsContent>

            <TabsContent value="api-key" className="mt-4">
              <form onSubmit={onApiKey} className="space-y-4" id="api-key-form">
                <div className="space-y-2">
                  <Label htmlFor="api-key">API key</Label>
                  <div className="relative">
                    <Fingerprint className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="api-key"
                      className="pl-9"
                      type="password"
                      autoComplete="off"
                      placeholder="Paste your Dokploy API key"
                      value={apiKey}
                      onChange={(event) => setApiKey(event.target.value)}
                    />
                  </div>
                </div>
                <Button className="w-full" type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                  Continue with API key
                </Button>
                <p className="text-xs text-muted-foreground">
                  Generate one in Dokploy under Settings, then API Keys.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </OnboardingLayout>
  )
}
