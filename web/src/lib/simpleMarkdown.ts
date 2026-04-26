// 轻量 Markdown 渲染：仅覆盖课程项目常用语法，且始终先转义 HTML，避免注入。
function escapeHtml(raw: string): string {
    return raw
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;')
}

function renderInline(raw: string): string {
    const escaped = escapeHtml(raw)
    return escaped
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
}

function flushParagraph(buf: string[], out: string[]) {
    if (buf.length === 0) {
        return
    }
    out.push(`<p>${renderInline(buf.join(' '))}</p>`)
    buf.length = 0
}

function flushList(buf: string[], out: string[]) {
    if (buf.length === 0) {
        return
    }
    out.push('<ul>')
    for (const line of buf) {
        out.push(`<li>${renderInline(line)}</li>`)
    }
    out.push('</ul>')
    buf.length = 0
}

// 输出给 NotePage 的安全 HTML。
export function renderSimpleMarkdown(markdown: string): string {
    const lines = markdown.replaceAll('\r\n', '\n').split('\n')
    const out: string[] = []
    const paragraph: string[] = []
    const listItems: string[] = []
    const codeBlock: string[] = []
    let inCode = false

    for (const line of lines) {
        if (line.trimStart().startsWith('```')) {
            flushParagraph(paragraph, out)
            flushList(listItems, out)
            if (!inCode) {
                inCode = true
            } else {
                out.push(
                    `<pre><code>${escapeHtml(codeBlock.join('\n'))}</code></pre>`,
                )
                codeBlock.length = 0
                inCode = false
            }
            continue
        }

        if (inCode) {
            codeBlock.push(line)
            continue
        }

        const heading = line.match(/^(#{1,6})\s+(.+)$/)
        if (heading) {
            flushParagraph(paragraph, out)
            flushList(listItems, out)
            const level = heading[1].length
            out.push(
                `<h${String(level)}>${renderInline(heading[2])}</h${String(level)}>`,
            )
            continue
        }

        const list = line.match(/^\s*[-*+]\s+(.+)$/)
        if (list) {
            flushParagraph(paragraph, out)
            listItems.push(list[1])
            continue
        }

        if (line.trim().length === 0) {
            flushParagraph(paragraph, out)
            flushList(listItems, out)
            continue
        }

        flushList(listItems, out)
        paragraph.push(line.trim())
    }

    flushParagraph(paragraph, out)
    flushList(listItems, out)
    if (codeBlock.length > 0) {
        out.push(`<pre><code>${escapeHtml(codeBlock.join('\n'))}</code></pre>`)
    }
    return out.join('\n')
}
