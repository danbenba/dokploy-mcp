import { chip, softGradient, ui, width } from './theme.js'

const ASCII_ART = [
  '██████╗  ██████╗ ██╗  ██╗██████╗ ██╗      ██████╗ ██╗   ██╗',
  '██╔══██╗██╔═══██╗██║ ██╔╝██╔══██╗██║     ██╔═══██╗╚██╗ ██╔╝',
  '██║  ██║██║   ██║█████╔╝ ██████╔╝██║     ██║   ██║ ╚████╔╝ ',
  '██║  ██║██║   ██║██╔═██╗ ██╔═══╝ ██║     ██║   ██║  ╚██╔╝  ',
  '██████╔╝╚██████╔╝██║  ██╗██║     ███████╗╚██████╔╝   ██║   ',
  '╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚══════╝ ╚═════╝    ╚═╝   ',
]

export function showBanner(version: string): void {
  if (width() < 66) {
    console.log(`\n  ${ui.primary.bold('dokploy-rest')} ${ui.muted(`v${version}`)} ${chip('install')}`)
    console.log(`  ${ui.text.bold('Dokploy MCP')} ${ui.muted('connect your assistants to your panel')}\n`)
    return
  }
  console.log('')
  for (const line of ASCII_ART) {
    console.log(`  ${softGradient(line)}`)
  }
  console.log('')
  console.log(
    `  ${ui.muted(`v${version}`)}  ${ui.text.bold('Dokploy MCP')}  ${chip('install')} ${ui.muted('one command, every assistant')}`
  )
  console.log(
    `  ${ui.muted('Claude Code')} ${ui.border('/')} ${ui.muted('Claude Desktop')} ${ui.border('/')} ${ui.muted('Cursor')} ${ui.border('/')} ${ui.muted('VS Code')} ${ui.border('/')} ${ui.muted('+ more')} ${ui.border('·')} ${ui.text('browser sign-in')} ${ui.border('·')} ${ui.text('scoped api keys')}\n`
  )
}
