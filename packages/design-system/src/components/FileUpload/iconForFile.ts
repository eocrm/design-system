import { File as FileIcon, FileImage, FileText, type LucideIcon } from 'lucide-react';

/**
 * Choose a lucide file-type icon component based on a File's MIME type and
 * extension fallback. Returns the icon COMPONENT (not an element instance)
 * so callers can decide on size / aria-label / className at the render site.
 *
 * Mapping:
 * - `image/*` MIME → `FileImage`
 * - `text/*` MIME → `FileText`
 * - `application/pdf` → `FileText`
 * - extension fallback for `.csv`, `.txt`, `.md`, `.json` → `FileText`
 * - extension fallback for `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg` → `FileImage`
 * - everything else → `File` (generic)
 *
 * Private to the FileUpload directory — not re-exported from the package.
 */
export function iconForFile(file: File): LucideIcon {
  const mime = file.type;
  if (mime.startsWith('image/')) return FileImage;
  if (mime.startsWith('text/')) return FileText;
  if (mime === 'application/pdf') return FileText;

  // Extension fallback for files where the browser didn't fill in `type`
  // (rare but happens — empty MIME on .csv from some OSes).
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (ext === '.csv' || ext === '.txt' || ext === '.md' || ext === '.json') return FileText;
  if (
    ext === '.png' ||
    ext === '.jpg' ||
    ext === '.jpeg' ||
    ext === '.gif' ||
    ext === '.webp' ||
    ext === '.svg'
  ) {
    return FileImage;
  }

  return FileIcon;
}
