import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const target = path.join(here, '..', 'packages', 'core', 'src', 'mcp', 'catalog.json')

const source = process.argv[2]
if (!source) {
  console.error('usage: node scripts/generate-catalog.mjs <path-to-openapi.json>')
  console.error('fetch one with: curl -s https://panel.example.com/api/settings.getOpenApiDocument > openapi.json')
  process.exit(1)
}

function describeType(schema) {
  if (!schema || typeof schema !== 'object') return '?'
  if (Array.isArray(schema.anyOf)) {
    return [...new Set(schema.anyOf.map(describeType))].join('|')
  }
  if (schema.type === 'array') {
    return `array<${describeType(schema.items ?? {})}>`
  }
  if (schema.type === 'object' && schema.properties) {
    const inner = Object.entries(schema.properties)
      .slice(0, 8)
      .map(([key, value]) => `${key}:${describeType(value)}`)
      .join(', ')
    return `object{${inner}}`
  }
  return schema.type ?? '?'
}

function describeEnum(schema) {
  if (!schema || typeof schema !== 'object') return undefined
  if (schema.enum) return schema.enum
  for (const branch of schema.anyOf ?? []) {
    if (branch.enum) return branch.enum
  }
  return undefined
}

function collectParams(method, operation) {
  const params = {}
  if (method === 'get') {
    for (const parameter of operation.parameters ?? []) {
      const schema = parameter.schema ?? {}
      const entry = { type: describeType(schema) }
      if (parameter.required) entry.required = true
      const values = describeEnum(schema)
      if (values) entry.enum = values
      if (schema.default !== undefined) entry.default = schema.default
      params[parameter.name] = entry
    }
    return params
  }

  const body = operation.requestBody?.content?.['application/json']?.schema ?? {}
  const required = new Set(body.required ?? [])
  for (const [name, schema] of Object.entries(body.properties ?? {})) {
    const entry = { type: describeType(schema) }
    if (required.has(name)) entry.required = true
    const values = describeEnum(schema)
    if (values) entry.enum = values
    if (schema && schema.default !== undefined) entry.default = schema.default
    params[name] = entry
  }
  return params
}

const spec = JSON.parse(fs.readFileSync(source, 'utf8'))
const endpoints = {}

for (const [route, methods] of Object.entries(spec.paths ?? {})) {
  for (const [method, operation] of Object.entries(methods)) {
    if (!operation || typeof operation !== 'object') continue
    const entry = { method: method.toUpperCase() }
    const params = collectParams(method, operation)
    if (Object.keys(params).length > 0) entry.params = params
    const description = operation.summary ?? operation.description
    if (description) entry.desc = description
    endpoints[route] = entry
  }
}

const catalog = {
  source: 'Dokploy openapi.json',
  dokploy_version: spec.info?.version ?? '?',
  count: Object.keys(endpoints).length,
  endpoints,
}

fs.writeFileSync(target, JSON.stringify(catalog))
console.log(`wrote ${catalog.count} endpoints to ${path.relative(process.cwd(), target)}`)
