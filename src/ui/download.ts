/** Hands the browser a file to save. Works without a server and without any permission. */
export function downloadFile(name: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  // The download starts asynchronously; the address must outlive this call.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
