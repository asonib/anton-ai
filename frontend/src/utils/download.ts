/** Trigger a browser download for an object URL. */
export function saveObjectUrl(url: string, fileName: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Download a string as a UTF-8 text file. */
export function saveTextFile(text: string, fileName: string, mimeType = 'text/plain'): void {
  const url = URL.createObjectURL(new Blob([text], { type: `${mimeType};charset=utf-8` }));
  saveObjectUrl(url, fileName);
  // Give the browser a moment to start the download before releasing the blob.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Lower-case, dash-separated, filesystem-safe name fragment. */
export function slugify(value: string, fallback = 'file'): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || fallback;
}
