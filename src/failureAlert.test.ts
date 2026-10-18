/// <reference types="node" />
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'

const workflow = readFileSync('.github/workflows/failure-alert.yml', 'utf8')

it.each([false, true])('parses empty/populated alert JSON: %s', (populated) => {
  const expressions = [...workflow.matchAll(/\$\((jq -r '\.[a-z_]+ \/\/ empty'[^\n]+)\)/g)]
  expect(expressions).toHaveLength(4)
  const env = { ...process.env,
    latest_run: populated ? JSON.stringify({ id: 123, run_attempt: 2, name: 'CI' }) : '',
    issue_record: populated ? JSON.stringify({ number: 456 }) : '',
  }
  const expected = populated ? ['123', '2', 'CI', '456'] : ['', '', '', '']
  expressions.forEach((expression, index) => {
    expect(execFileSync('bash', ['-euo', 'pipefail', '-c', expression[1]], { env, encoding: 'utf8' }).trim()).toBe(expected[index])
  })
})

it.each([null, 'unrelated', '<!-- ci-failure-alert:42:1:1 -->', '<!-- ci-failure-alert:42 -->'])(
  'matches alert issue markers without contacting GitHub: %s', (body) => {
    const query = workflow.match(/--arg legacy_marker[^\n]+\n\s+'([\s\S]*?)' <<</)?.[1]
    expect(query).toBeTruthy()
    const result = execFileSync('jq', ['-c', '--arg', 'marker_prefix', '<!-- ci-failure-alert:42:', '--arg', 'legacy_marker', '<!-- ci-failure-alert:42 -->', query!], {
      input: JSON.stringify([[{ number: 7, body }]]), encoding: 'utf8',
    }).trim()
    expect(result).toBe(body?.startsWith('<!--') ? JSON.stringify({ number: 7, body }) : '')
  },
)
