import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { AlertTriangle, Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ScopeDefinition } from '@/lib/api'
import { cn } from '@/lib/utils'

interface PermissionsListProps {
  catalog: ScopeDefinition[]
  selected: string[]
  onToggle: (scope: string) => void
  disabled?: boolean
  pageSize?: number
}

export function PermissionsList({
  catalog,
  selected,
  onToggle,
  disabled = false,
  pageSize = 4,
}: PermissionsListProps) {
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(0)
  const reduced = useReducedMotion()

  const pages = Math.max(1, Math.ceil(catalog.length / pageSize))
  const current = Math.min(page, pages - 1)
  const visible = catalog.slice(current * pageSize, current * pageSize + pageSize)
  const granted = catalog.filter((scope) => selected.includes(scope.id))
  const risky = granted.some((scope) => scope.risky)

  return (
    <div className="rounded-xl border bg-card">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="block text-sm font-medium">Permissions</span>
          <span className="block truncate text-xs text-muted-foreground">
            {granted.length === 0
              ? 'Nothing selected'
              : granted.map((scope) => scope.label).join(', ')}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {risky ? (
            <Badge variant="outline" className="gap-1 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-3" />
              Sensitive
            </Badge>
          ) : null}
          <Badge variant="secondary">{granted.length}/{catalog.length}</Badge>
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            className="text-muted-foreground"
          >
            <ChevronDown className="size-4" />
          </motion.span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="permissions"
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduced ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-2 border-t px-3 py-3">
              {visible.map((scope) => {
                const active = selected.includes(scope.id)
                return (
                  <button
                    type="button"
                    key={scope.id}
                    onClick={() => onToggle(scope.id)}
                    disabled={disabled}
                    aria-pressed={active}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors disabled:opacity-60',
                      active ? 'border-primary/40 bg-accent' : 'bg-background hover:bg-accent/50'
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
              {pages > 1 ? (
                <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={current === 0}
                    onClick={() => setPage(current - 1)}
                  >
                    <ChevronLeft className="size-4" />
                    Previous
                  </Button>
                  <span>
                    Page {current + 1} of {pages}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={current >= pages - 1}
                    onClick={() => setPage(current + 1)}
                  >
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
