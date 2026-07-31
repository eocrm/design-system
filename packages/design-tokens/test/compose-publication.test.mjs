import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { repairComposePublication } from '../scripts/repair-compose-publication.mjs';

const artifacts = [
  'design-tokens-compose',
  'design-tokens-compose-android',
  'design-tokens-compose-jvm',
  'design-tokens-compose-iosarm64',
  'design-tokens-compose-iossimulatorarm64',
];

test('continues past an existing Maven file and uploads a later missing file', async () => {
  const root = await mkdtemp(join(tmpdir(), 'eocrm-compose-publication-'));
  const version = '1.2.3';
  const remote = new Map();
  const putOrder = [];

  try {
    for (const artifact of artifacts) {
      const directory = join(root, 'com/eocrm/design', artifact, version);
      await mkdir(directory, { recursive: true });
      const payloadName = `${artifact}-${version}.bin`;
      const payload = Buffer.from(`payload:${artifact}`);
      const module = Buffer.from(
        JSON.stringify({
          component: { version },
          variants: [{ files: [{ url: payloadName, sha256: sha256(payload) }] }],
        }),
      );
      await writeFile(join(directory, `${artifact}-${version}.module`), module);
      await writeFile(join(directory, `${artifact}-${version}.pom`), '<project />');
      await writeFile(join(directory, payloadName), payload);
    }

    const base = 'https://maven.pkg.github.com/eocrm/design-system/com/eocrm/design';
    const existingUrl = `${base}/design-tokens-compose/${version}/design-tokens-compose-${version}.bin`;
    const missingUrl = `${base}/design-tokens-compose/${version}/design-tokens-compose-${version}.pom`;
    remote.set(existingUrl, Buffer.from('payload:design-tokens-compose'));

    const result = await repairComposePublication({
      publicationRoot: root,
      version,
      repository: 'eocrm/design-system',
      actor: 'actor',
      token: 'token',
      fetchImpl: async (url, options = {}) => {
        if (options.method === 'PUT') {
          putOrder.push(url);
          if (remote.has(url)) return new Response('conflict', { status: 409 });
          remote.set(url, Buffer.from(options.body));
          return new Response('', { status: 201 });
        }
        const content = remote.get(url);
        return content
          ? new Response(content, { status: 200 })
          : new Response('missing', { status: 404 });
      },
    });

    assert.deepEqual(remote.get(missingUrl), Buffer.from('<project />'));
    assert.ok(putOrder.indexOf(existingUrl) < putOrder.indexOf(missingUrl));
    assert.equal(result.alreadyPresent, 1);
    assert.equal(result.uploaded, 14);
  } finally {
    await rm(root, { recursive: true });
  }
});

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}
