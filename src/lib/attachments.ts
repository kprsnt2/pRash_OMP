import type { Attachment } from '@/types';

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function getFileCategory(file: File): Attachment['category'] {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  if (type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg|bmp)$/i.test(name)) {
    return 'image';
  }
  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return 'pdf';
  }
  if (
    type.includes('csv') ||
    type.includes('sheet') ||
    type.includes('excel') ||
    /\.(csv|tsv|xlsx|xls)$/i.test(name)
  ) {
    return 'tabular';
  }
  if (
    /\.(js|jsx|ts|tsx|py|sql|html|css|json|yaml|yml|xml|sh|bash|md|rs|go|cpp|c|h|java)$/i.test(
      name
    )
  ) {
    return 'code';
  }
  return 'text';
}

function stringToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function processFileToAttachment(file: File): Promise<Attachment> {
  const category = getFileCategory(file);
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  // Images: read as Data URL
  if (category === 'image') {
    const { promise, resolve, reject } = Promise.withResolvers<Attachment>();
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        id,
        name: file.name,
        size: file.size,
        type: file.type || 'image/jpeg',
        dataUrl: typeof reader.result === 'string' ? reader.result : '',
        category,
      });
    };
    reader.onerror = () => reject(new Error(`Failed to read image ${file.name}`));
    reader.readAsDataURL(file);
    return promise;
  }

  // PDFs: extract text + store dataUrl
  if (category === 'pdf') {
    const { promise, resolve } = Promise.withResolvers<Attachment>();
    const reader = new FileReader();
    reader.onload = async () => {
      let extractedText = '';
      const arrayBuffer = reader.result instanceof ArrayBuffer ? reader.result : new ArrayBuffer(0);

      try {
        if (typeof window !== 'undefined') {
          // Dynamic import required because pdfjs-dist relies on DOMMatrix/canvas which crashes during SSR in Node.js
          const pdfjsLib = await import('pdfjs-dist');
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

          const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
          const pdf = await loadingTask.promise;
          const maxPages = Math.min(pdf.numPages, 15);
          const pagesText: string[] = [];

          for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageStrings = textContent.items
              .map((item) => {
                if (item && typeof item === 'object' && 'str' in item && typeof item.str === 'string') {
                  return item.str;
                }
                return '';
              })
              .join(' ');
            pagesText.push(`--- Page ${pageNum} ---\n${pageStrings}`);
          }
          extractedText = pagesText.join('\n\n');
        }
      } catch {
        extractedText = `[PDF Document: ${file.name} (${formatBytes(file.size)})]`;
      }

      resolve({
        id,
        name: file.name,
        size: file.size,
        type: 'application/pdf',
        dataUrl: '',
        extractedText: extractedText || `[PDF Document: ${file.name}]`,
        category,
      });
    };

    reader.readAsArrayBuffer(file);
    return promise;
  }

  // Text / Code / Tabular / CSV: read text content directly
  const { promise, resolve, reject } = Promise.withResolvers<Attachment>();
  const reader = new FileReader();
  reader.onload = () => {
    const text = typeof reader.result === 'string' ? reader.result : '';
    const dataUrl = `data:${file.type || 'text/plain'};base64,${stringToBase64(text.slice(0, 50000))}`;
    resolve({
      id,
      name: file.name,
      size: file.size,
      type: file.type || 'text/plain',
      dataUrl,
      extractedText: text,
      category,
    });
  };
  reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
  reader.readAsText(file);
  return promise;
}

/**
 * Builds the payload sent to the LLM backend, formatting multiple attachments
 * seamlessly for both vision and text models.
 */
export function formatUserMessageWithAttachments(
  text: string,
  attachments: Attachment[]
): string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> {
  if (!attachments || attachments.length === 0) {
    return text;
  }

  const imageAttachments = attachments.filter((a) => a.category === 'image');
  const textAttachments = attachments.filter((a) => a.category !== 'image');

  // Format non-image attachments into clear context blocks
  let attachedTextContext = '';
  if (textAttachments.length > 0) {
    const blocks = textAttachments.map((att, index) => {
      const content = att.extractedText || '[No readable text extracted]';
      return `\n\n═══════════════════════════════════════════\n📎 ATTACHED FILE [${index + 1}/${textAttachments.length}]: "${att.name}" (${formatBytes(att.size)}, Category: ${att.category})\n═══════════════════════════════════════════\n${content}\n═══════════════════════════════════════════\n`;
    });
    attachedTextContext = `\n\n[USER ATTACHED ${textAttachments.length} FILE(S)]:\n${blocks.join('\n')}`;
  }

  const combinedText = `${text}${attachedTextContext}`.trim();

  // If there are images, return multimodal array format
  if (imageAttachments.length > 0) {
    const parts: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [
      {
        type: 'text',
        text: combinedText || `Please examine the ${imageAttachments.length} attached image(s).`,
      },
    ];

    for (const img of imageAttachments) {
      parts.push({
        type: 'image_url',
        image_url: {
          url: img.dataUrl,
        },
      });
    }

    return parts;
  }

  return combinedText;
}
