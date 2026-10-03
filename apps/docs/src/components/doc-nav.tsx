import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { groups } from '~/lib/nav'

/**
 * The page list.
 *
 * Nothing here uses a negative margin: the links are padded and the group labels share that
 * padding, so the active pill lines up with the headings above it without ever being wider than
 * the column. A link wider than its scroll container is what puts a horizontal scrollbar across
 * the bottom of the sidebar.
 */
export function DocNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Documentation" className="text-sm">
      <ul className="space-y-6">
        {groups.map((group) => (
          <li key={group.label}>
            <p className="px-3 text-[0.6875rem] font-medium tracking-wider text-muted-foreground/80 uppercase">
              {group.label}
            </p>
            <ul className="mt-1.5">
              {group.pages.map((page) => (
                <li key={page.slug}>
                  <NavLink
                    to={`/${page.slug}`}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'block truncate rounded-md px-3 py-1.5 transition-colors',
                        isActive
                          ? 'bg-muted font-medium text-foreground'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
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
