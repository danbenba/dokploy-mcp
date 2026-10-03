import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { groups } from '~/lib/nav'

export function DocNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Documentation" className="text-sm">
      <ul className="space-y-7">
        {groups.map((group) => (
          <li key={group.label}>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {group.label}
            </p>
            <ul className="mt-3 space-y-0.5">
              {group.pages.map((page) => (
                <li key={page.slug}>
                  <NavLink
                    to={`/${page.slug}`}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'block rounded-md px-2.5 py-1.5 -mx-2.5 transition-colors',
                        isActive
                          ? 'bg-muted font-medium text-foreground'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                      )
                    }
                  >
                    {page.title}
                  </NavLink>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  )
}
