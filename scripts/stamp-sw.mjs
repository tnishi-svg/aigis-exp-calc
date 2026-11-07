// ビルド後に dist/sw.js の版 ID を埋め込む。版が変わると、ブラウザが新しい Service Worker として検知する
import { readFileSync, writeFileSync } from 'node:fs'

const file = new URL('../dist/sw.js', import.meta.url)
const id = Date.now().toString(36)
writeFileSync(file, readFileSync(file, 'utf8').replace('__BUILD_ID__', id))
console.log(`sw.js build id: ${id}`)
